var fs = require("fs");
var http = require("http");
var https = require("https");
var path = require("path");
var util = require("util");
var os = require("os");
var crypto = require("crypto");
var multiparty = require("multiparty");
var ConfigException = require("./ConfigException");

var Config = (function(){
	var c = {};
	
	var config = {};
	var configPath = path.join(__dirname, "config.conf");
	var logConfig;
	var serverKey;
	try{
		serverKey = crypto.pbkdf2Sync(os.hostname(), __dirname, 100000, 512, "sha512").toString("hex");
	}
	catch(err){
		server.errorLog.fatal(err, function(){
			throw err;
		});
	}
	var modules = [
		{
			name:		"Database",
			baseRoute:	"/config/db",
			hasJs:		true
		},
		{
			name:		"Users, Groups & Directories",
			submodules:	[
				{
					name:		"Directories",
					baseRoute:	"/config/directories",
					hasJs:		true,
					hasScss:	true
				},
				{
					name:		"Users",
					baseRoute:	"/config/users",
					hasJs:		true
				},
				{
					name:		"Groups",
					baseRoute:	"/config/groups",
					hasJs:		true
				}
			]
		},
		{
			name:		"Roles",
			baseRoute:	"/config/roles",
			hasJs:		true
		},
		{
			name:		"Licensing",
			baseRoute:	"/config/licensing",
			hasJs:		true,
			hasCss:		true
		},
		{
			name:		"Logging",
			baseRoute:	"/config/logging",
			hasJs:		true
		},
		{
			name:		"Server Configuration",
			baseRoute:	"/config/server",
			hasJs:		true
		},
		{
			name:		"Library Dependencies",
			baseRoute:	"/config/dependencies",
			hasJs:		true
		},
		{
			name:		"Session Management",
			baseRoute: 	"/config/sessions",
			hasJs:		true
		}
	]
	
	c.getConfig = function(next){
		if(!config.hasOwnProperty("server") || !config.hasOwnProperty("db")){
			if(fs.existsSync(configPath)){
				fs.readFile(configPath, "utf8", function(err, data){
					if(err){
						next(new ConfigException({msg: err, code: 1}));
					}
					else {
						try{
							var decipher = crypto.createDecipher("aes128", serverKey);
							var decrypted = "";
							decipher.on("readable", function(){
								var encrypted = decipher.read();
								if(encrypted){
									decrypted += encrypted.toString("utf8");
								}
							});
							
							decipher.on("end", function(){
								config = JSON.parse(decrypted);
								next(undefined, config);
							});
							
							decipher.write(data, "hex");
							decipher.end();
						}
						catch(parseErr){
							next(parseErr);
						}
					}
				});
			}
			else {
				next(new ConfigException({msg: "No config file found", code: 0}));
			}
		}
	}
	
	c.setupRoutes = function(app){
		server.authorizationService.configureRouteAuthorization(app, "/config", ["400"]);
		app.route("/config")
			.get(function(req, res, next){
				req.url = "/config/index.html";
				next();
			});
		
		app.route("/config/modules")
			.get(function(req, res){
				res.end(JSON.stringify(modules), "utf8");
			});
			
		app.route("/config/*")
			.get(function(req, res, next){
				if(req.url.indexOf(".") == -1){
					req.url = "/config/index.html";
				}
				next();
			});
			
		server.api.configureRouteAuthorization(app, "/config", ["400"]);
			
		require("./api/Roles")(app, ConfigException);
		require("./api/DB")(app, config, writeConfig, ConfigException);
		require("./api/Directories")(app, config, writeConfig, ConfigException);
		require("./api/Users")(app, ConfigException);
		require("./api/Groups")(app, ConfigException);
		require("./api/Licensing")(app, config, writeConfig);
		require("./api/Logging")(app, ConfigException);
		require("./api/Servers")(app, config, writeConfig, ConfigException);		
		require("./api/Dependencies")(app, config, writeConfig, ConfigException);
		require("./api/Sessions")(app, ConfigException);
	}
	
	c.getNextStep = function(){
		if(!config.hasOwnProperty("db")){
			return "config/db";
		}
		else if(!config.hasOwnProperty("userDirectories")){
			return "config/user-directories";
		}
	}
	
	function writeConfig(next){
		var configStr = JSON.stringify(config);
		var cipher = crypto.createCipher("aes128", serverKey);
		var encrypted = cipher.update(configStr, "utf8", "hex");
		encrypted += cipher.final("hex");
		
		var configPath = path.join(__dirname, "config.conf");
		
		fs.open(configPath, 'w', function(err, fd){
			if(err){
				next(err);
				return;
			}
			fs.write(fd, encrypted, function(writeErr, written, buffer){
				if(writeErr){
					fs.close(fd, function(){
						next(writeErr);
					});
					return;
				}
				
				fs.close(fd, next);
			});
		});
	}
	
	return c;
})();

module.exports = Config;