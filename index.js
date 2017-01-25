var express = require("express");
var bodyParser = require("body-parser");
var http = require("http");
var https = require("https");
var path = require("path");
global.LogManager = require("./log4n/LogManager")(__dirname);

var Config = require("./config/Config");
var WebServer = require("./webresources/WebServer");
var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.serveError = WebServer.serveError;

LogManager.init(startup);

global.server = {};
server.api = require("./webresources/APIRoutes")(app);
server.utils = {};
server.utils.CollectionResourceResponse = require("./utils/CollectionResourceResponse");
server.authorizationService = require("./app/AuthorizationService")();
server.licensingService = require("./app/LicensingService")();

function startup(){
	server.appLog = LogManager.getLogger("main");
	server.errorLog = LogManager.getLogger("error");
	Config.getConfig(function(err, config){
		app.get("/", function(req, res, next){
			req.url = config.baseUrl;
			next();
		});
		
		if(err){
			if(err.errorCode == 0){
				server.appLog.warn(err);
				server.appLog.info("No configuration file present. Starting server on http port 80. Configuration setup will start at http://localhost/");
				config = {};
				config.server = {};
				config.server.transport = "http";
				config.server.port = "80";
				config.baseUrl = "/config/";
			}
			else {
				server.errorLog.error(err);
			}
		}
		else {
			startupServer(config);
		}
	});
}

function startupServer(config){
	var startTime = new Date().getTime();
	startupDatabase(config, startTime);
}

function startupDatabase(config, startTime){
	if(config.hasOwnProperty("db")){
		try{
			var driver = require(path.join(__dirname, "drivers", "db", config.db.driver));
			server.db = driver();
			server.db.config(config.db);
			startupDirectories(config, startTime);
		}
		catch(err){
			server.appLog.error(err);
			startupConfig(config, startTime);
		}
	}
	else {
		server.appLog.info("No database configuration found. Cannot proceed with default server startup.");
		startupConfig(config, startTime);
	}
}

function startupDirectories(config, startTime){
	if(config.hasOwnProperty("directories")){
		if(!server.hasOwnProperty("dirs")){
			server.dirs = {};
		}
		var error = undefined;
		var collectionResourceResponse = new server.utils.CollectionResourceResponse(config.directories, function(item, next){
			try{
				var driver = require(path.join(__dirname, "drivers", "directories", item.driver));
				server.dirs[item.key] = driver();
				server.dirs[item.key].config(item);
				server.dirs[item.key].getUsers(function(err, users){
					if(err){
						next(err);
					}
					else {
						next(undefined);
					}
				});
			}
			catch(err){
				next(err);
			}
		})
		.oncomplete(function(){
			startupLicensing(config, startTime);
		})
		.onfail(function(err){
			server.errorLog.error(err);
			startupConfig(config, startTime);
		})
		.process();
	}
}

function startupLicensing(config, startTime){
	if(config.hasOwnProperty("licenseKey")){
		server.licensingService.setLicenseDetails(config.licenseKey, function(){
			startupConfig(config, startTime);
		});
	}
	else {
		startupConfig(config, startTime);
	}
}

function startupConfig(config, startTime){
	Config.setupRoutes(app);
	server.authorizationService.setupRoutes(app);
	
	if(!config.hasOwnProperty("server") || !config.server.hasOwnProperty("transport") || !config.server.hasOwnProperty("port")){
		config.server = {};
		config.server.transport = "http";
		config.server.port = "80";
	}
	server.appLog.info("Starting configuration portal at " + config.server.transport + "://localhost:" + config.server.port + "/");
	
	startApplication(config, startTime);
}

function startApplication(config, startTime){
	WebServer.setupRoutes(app);
	
	if(config.server.transport == "http"){
		http.createServer(app).listen(config.server.port, function(){
			var endTime = new Date().getTime();
			var duration = endTime - startTime;
			server.appLog.info("Server started on port " + config.server.port + " in " + duration + "ms.");
		});
	}
}