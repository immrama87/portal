var express = require("express");
var bodyParser = require("body-parser");
var http = require("http");
var https = require("https");
var path = require("path");
var os = require("os");
var getmac = require("getmac");
global.LogManager = require("./log4n/LogManager")(__dirname);

var sockets = [];

var Config = require("./config/Config");
var Admin = require("./admin/Admin");
var WebServer = require("./webresources/WebServer");
var CookieManager = require("./app/CookieManager")();
		
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
server.authenticationService = require("./app/AuthenticationService")();
server.sessionManager = require("./app/SessionManager")();

function startup(){
	var startTime = new Date().getTime();
	server.appLog = LogManager.getLogger("main");
	server.errorLog = LogManager.getLogger("error");
	server.accessLog = LogManager.getLogger("access");
	getmac.getMac(function(err, mac){
		if(err){
			server.errorLog.fatal(err, function(){
				throw err;
			});
		}
		
		var index = 0;
		var matches = 0;
		while(mac.indexOf("-", index) > -1){
			matches++;
			index = mac.indexOf("-", index) + 1;
			if(matches%2>0){
				mac = mac.substring(0, index-1) + mac.substring(index);
			}
		}
		
		server.serverId = mac;
		
		Config.getConfig(function(err, config){
			if(err){
				if(err.errorCode == 0){					
					app.get("/", function(req, res, next){
						req.url = config.baseUrl;
						next();
					});
					server.appLog.warn(err);
					server.appLog.info("No configuration file present. Starting server on http port 80. Configuration wizard will start at http://localhost/");
					config = {};
					config.server = {};
					config.server.transport = "http";
					config.server.port = "80";
					config.baseUrl = "/config/wizard";
					require("./config/ConfigWizard")().setupRoutes(app);
					startupConfig(config, startTime);
				}
				else {
					server.errorLog.error(err);
				}
			}
			else {
				config.baseUrl = "/config";
				startupDatabase(config, startTime);
			}
		});
	});
}

function startupDatabase(config, startTime){
	if(config.hasOwnProperty("db")){
		try{
			var driver = require(path.join(__dirname, "drivers", "db", config.db.driver));
			server.db = driver();
			server.db.config(config.db);
			server.appLog.info("Database driver started with config:\n\t" + mapConfig(config.db, "\n\t", ["pass"]));
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
						server.appLog.info("Directory driver for directory '" + item.key + "' could not start.");
						next(err);
					}
					else {
						server.appLog.info("Directory driver for directory '" + item.key + "' started successfully with config:\n\t" + mapConfig(item, "\n\t", ["password"]));
						next();
					}
				});
			}
			catch(err){
				next(err);
			}
		})
		.oncomplete(function(){
			server.authenticationService.setDirectories(server.dirs);
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
			server.appLog.info("Licensing initialized. License status is " + server.licensingService.getLicenseDetails().status);
			startApplication(config, startTime);
		});
	}
	else {
		startupConfig(config, startTime);
	}
}

function startupConfig(config, startTime){
	config.startupError = true;
	
	startApplication(config, startTime);
}

function startApplication(config, startTime){
	if(!config.hasOwnProperty("servers") || config.startupError){
		if(config.baseUrl == "/config"){
			Config.setupRoutes(app);
		}
		
		app.get("/", function(req, res, next){
			CookieManager.createCookie(res);
			req.url = config.baseUrl;
			next();
		});
		WebServer.setupRoutes(app);
		http.createServer(app).listen(80, function(){
			var endTime = new Date().getTime();
			var duration = endTime - startTime;
			server.appLog.info("Configuration server started at http://" + os.hostname() + "/ in " + duration + "ms.");
		});
	}
	else {
		if(process.argv.indexOf("-admin-port") > -1){
			config.servers.admin.port = process.argv[process.argv.indexOf("-admin-port") + 1];
		}
		if(process.argv.indexOf("-admin-transport") > -1){
			config.servers.admin.transport = process.argv[process.argv.indexOf("-admin-transport") + 1];
		}
		var admin = new express();
		admin.use(bodyParser.json());
		admin.use(bodyParser.urlencoded({extended:true}));
		admin.serveError = WebServer.serveError;
		
		admin.all("/*", function(req, res, next){
			var ip = req.headers["x-forwarded-for"] ||
				req.connection.remoteAddress ||
				req.socket.remoteAddress ||
				req.connection.socket.remoteAddress;
			server.accessLog.trace({method: req.method.toUpperCase(), resource: req.url, ipAddress: ip});
			var cookie = CookieManager.parseCookie(req.headers.cookie);
			var sessionId = cookie.getValue("NSESSIONID");
			var session = null;
			if(sessionId != null){
				session = server.sessionManager.getSession(sessionId);
			}
			
			if(session == null){
				if(req.headers.accept.indexOf("text/html") > -1){
					req.url = "/login";
				}
				else if(!req.url.indexOf("/errors/") == -1){
					WebServer.serveError(401, undefined, res);
				}
			}
			else {
				req.session = session;
				var resCookie = CookieManager.createCookie();
				resCookie.setValue("NSESSIONID", sessionId, 1);
				res.setHeader("Set-Cookie", resCookie.toString());
				if(req.url == "/"){
					req.url = "/admin";
				}
			}
			next();
		}, server.authorizationService.isAuthorized);
		
		admin.route("/login")
			.get(function(req, res, next){
				req.url = "/login.html";
				next();
			})
			.post(function(req, res){
				server.authenticationService.authenticateUser(req.body.username, req.body.password, function(err, authErr){
					if(err){
						WebServer.serveError(500, err, res);
					}
					else if(authErr){
						res.status(401).end(authErr);
					}
					else {
						var sessionId = server.sessionManager.createSession(req.body.username);
						var resCookie = CookieManager.createCookie()
						resCookie.setValue("NSESSIONID", sessionId, 1);
						res.setHeader("Set-Cookie", resCookie.toString());
						res.status(200).end();
						var ip = req.headers["x-forwarded-for"] ||
							req.connection.remoteAddress ||
							req.socket.remoteAddress ||
							req.connection.socket.remoteAddress;
						server.accessLog.info({method: "LOGIN", resource: req.body.username, ipAddress: ip});
					}
				});
			});
			
		admin.route("/loggedInUser")
			.get(function(req, res){
				if(req.session != undefined && req.session.username != undefined){
					res.status(200).end(JSON.stringify(req.session.getUserObject() || {}));
				}
				else {
					res.status(200).end(JSON.stringify({}));
				}
			});
			
		admin.route("/logout")
			.post(function(req, res){
				if(req.session != undefined){
					server.sessionManager.destroySession(req.session);
				}
				
				res.status(200).end();
			});
			
		Admin.setupRoutes(admin);
		Config.setupRoutes(admin);
		WebServer.setupRoutes(admin);
		
		var adminServer;
		if(config.servers.admin.transport == "http"){
			adminServer = http.createServer(admin);
			adminServer.listen(config.servers.admin.port, function(){
				var endTime = new Date().getTime();
				var duration = endTime - startTime;
				server.appLog.info("Administration portal started at " + config.servers.admin.transport + "://" + os.hostname() + ":" + config.servers.admin.port + " in " + duration + "ms.");
			});
		}
		else if(config.servers.admin.transport == "https"){
			var credentials = {key: config.servers.admin.key, cert: config.servers.admin.cert};
			adminServer = https.createServer(credentials, admin);
			adminServer.listen(config.servers.admin.port, function(){
				var endTime = new Date().getTime();
				var duration = endTime - startTime;
				server.appLog.info("Administration portal started at " + config.servers.admin.transport + "://" + os.hostname() + ":" + config.servers.admin.port + " in " + duration + "ms.");
			});
		}
		
		adminServer.on("connection", function(socket){
			var date = Date.now() - (1000 * 60);
			var session = server.db.getSession();
			var statement = server.db.generatePreparedStatement({
				action:	"read",
				table:	"accessLogs",
				fields:	["level"],
				query:	{createdAt: {$gte: "#{beforeDate}"}, ipAddress: "#{ip}", method: "#{method}"}
			})
			.withParam("beforeDate", date)
			.withParam("ip", socket.remoteAddress)
			.withParam("method", "CONNECT");
			
			session.execute(statement, function(err, findResponse){
				if(err){
					server.errorLog.error(err);
				}
				else {
					if(findResponse.getItems().length == 0){
						server.accessLog.info({method: "CONNECT", resource: config.servers.admin.transport + "://" + os.hostname() + ":" + config.servers.admin.port, ipAddress: socket.remoteAddress});
					}
				}
			});
		});
	}
}

function mapConfig(config, sep, exclude){
	exclude = exclude || [];
	var response = [];
	for(var key in config){
		if(exclude.indexOf(key) == -1){
			response.push(key + ": " + config[key]);
		}
	}
	
	return response.join(sep);
}