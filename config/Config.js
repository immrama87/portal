var fs = require("fs");
var path = require("path");
var util = require("util");
var os = require("os");
var multiparty = require("multiparty");
var ConfigException = require("./ConfigException");

var Config = (function(){
	var c = {};
	
	var config = {};
	var configPath = path.join(__dirname, "config.conf");
	var logConfig;
	var modules = [
		{
			name:		"Database",
			baseRoute:	"config/db",
			hasJs:		true
		},
		{
			name:		"Users, Groups & Directories",
			submodules:	[
				{
					name:		"Directories",
					baseRoute:	"config/directories",
					hasJs:		true,
					hasCss:		true
				},
				{
					name:		"Users",
					baseRoute:	"config/users",
					hasJs:		true
				},
				{
					name:		"Groups",
					baseRoute:	"config/groups",
					hasJs:		true
				}
			]
		},
		{
			name:		"Roles",
			baseRoute:	"config/roles",
			hasJs:		true
		},
		{
			name:		"Licensing",
			baseRoute:	"config/licensing",
			hasJs:		true,
			hasCss:		true
		},
		{
			name:		"Logging",
			baseRoute:	"config/logging",
			hasJs:		true
		},
		{
			name:		"Server Configuration",
			baseRoute:	"config/server",
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
							config = JSON.parse(data);
						}
						catch(parseErr){
							next(parseErr);
							return;
						}
						next(undefined, config);
					}
				});
			}
			else {
				next(new ConfigException({msg:	"No config file found", code: 0}));
			}
		}
	}
	
	c.setupRoutes = function(app){
		app.route("/config")
			.get(function(req, res, next){
				req.url = "/config/index.html";
				next();
			});
		
		server.api.registerRoute("config/modules")
			.get(function(req, res){
				res.end(JSON.stringify(modules), "utf8");
			});
			
		server.api.registerRoute("config/roles")
			.get(function(req, res){
				var session = server.db.getSession();
				var statement = server.db.generatePreparedStatement({
					action:	"read",
					table:	"roles",
					fields:	["name", "roleId"],
					query:	{}
				});
				
				session.execute(statement, function(err, findResponse){
					if(err){
						app.serveError(500, err, res);
					}
					else {
						res.status(200).end(JSON.stringify(findResponse.getItems()));
					}
				});
			})
			.post(function(req, res){
				if(req.body.roleId == 100 || req.body.roleId == 200 || req.body.roleId == 300 || req.body.roleId == 400){
					var exc = new ConfigException({msg: "Request to update role '" + req.body.roleId + "' could not be processed. This role is system-generated and cannot be deleted."});
					app.serveError(500, exc, res);
				}
				else {
					updateRole(req.body.roleId, req.body.name, function(err){
						if(err){
							app.serveError(500, err, res);
						}
						else {
							res.status(200).end();
						}
					});
				}
			})
			.delete(function(req, res){
				if(req.body.roleId == 100 || req.body.roleId == 200 || req.body.roleId == 300 || req.body.roleId == 400){
					var exc = new ConfigException({msg: "Request to remove role '" + req.body.roleId + "' could not be processed. This role is system-generated and cannot be deleted."});
					app.serveError(500, exc, res);
				}
				else {
					var session = server.db.getSession();
					var statement = server.db.generatePreparedStatement({
						action:	"delete",
						table:	"roles",
						query:	{roleId:	"#{roleId}"}
					})
					.withParam("roleId", req.body.roleId);
					
					session.execute(statement, function(err){
						if(err){
							app.serveError(500, err, res);
						}
						else {
							res.status(200).end();
						}
					});
				}
			});
		
		server.api.registerRoute("config/db/drivers")
			.get(function(req, res){
				var configDriver = "";
				if(config.hasOwnProperty("db")){
					configDriver = config.db.driver;
				}
				var pathname = path.join(__dirname, "../", "drivers/db");
				if(fs.existsSync(pathname)){
					fs.readdir(pathname, function(err, files){
						var drivers = [];
						for(var i=0;i<files.length;i++){
							var driver = {};
							driver.name = files[i];
							if(driver.name == configDriver){
								driver.current = true;
							}
							try{
								var driverObj = require(path.join(pathname, files[i]));
								driver.description = driverObj.properties.description;
								driver.author = driverObj.properties.author;
								driver.inputs = driverObj.properties.properties;
							}
							catch(err){
								driver.description = "Load error occurred.<br />" + err;
								driver.author = "";
								driver.inputs = "";
							}
							
							drivers.push(driver);
						}
						
						res.end(JSON.stringify(drivers), "utf8");
					});
				}
			});
			
		server.api.registerRoute("config/db/setup")
			.get(function(req, res){
				var response = {};
				if(config.hasOwnProperty("db")){
					for(var key in config.db){
						if(key != "driver" && key != "password" && key != "pass"){
							response[key] = config.db[key];
						}
					}
				}
				res.status(200).end(JSON.stringify(response));
			})
			.post(function(req, res){
				if(!config.hasOwnProperty("db")){
					config.db = {};
				}
				for(var key in req.body){
					config.db[key] = req.body[key];
				}
				
				writeConfig(function(err){
					if(err){
						app.serveError(500, err, res);
					}
					else {
						res.status(200).end();
					}
				});
			});
			
		server.api.registerRoute("config/directories")
			.get(function(req, res){
				var response = {};
				if(config.hasOwnProperty("directories")){
					response = config.directories;
				}
				
				for(var dir in response){
					for(var key in response[dir]){
						if(key == "password" || key == "pass"){
							delete response[dir][key];
						}
					}
				}
				
				res.status(200).end(JSON.stringify(response));
			});
			
		server.api.registerRoute("config/directories/drivers")
			.get(function(req, res){
				var pathname = path.join(__dirname, "../", "drivers/directories");
				if(fs.existsSync(pathname)){
					fs.readdir(pathname, function(err, files){
						var drivers = [];
						for(var i=0;i<files.length;i++){
							var driver = {};
							driver.name = files[i];
							
							var driverObj = require(path.join(pathname, files[i]));
							driver.displayName = driverObj.properties.name;
							driver.description = driverObj.properties.description;
							driver.author = driverObj.properties.author;
							driver.inputs = driverObj.properties.properties;
							
							drivers.push(driver);
						}
						
						res.status(200).end(JSON.stringify(drivers));
					});
				}
			});
			
		server.api.registerRoute("config/directories/setup")
			.post(function(req, res){
				if(!config.hasOwnProperty("directories")){
					config.directories = {};
				}
				
				config.directories[req.body.name] = {};
				for(var key in req.body){
					if(key != "name"){
						config.directories[req.body.name][key] = req.body[key];
					}
				}
				
				writeConfig(function(err){
					if(err){
						app.serveError(500, err, res);
					}
					else {
						res.status(200).end();
					}
				});
			});
			
		server.api.registerRoute("config/users")
			.get(function(req, res){
				if(!server.hasOwnProperty("dirs")){
					var err = new ConfigException({msg: "Request to get directory user details could not be processed. No user directories have been initialized."});
					app.serveError(500, err, res);
				}
				else {
					var collectionResourceResponse = new server.utils.CollectionResourceResponse(server.dirs, function(item, next){
						item.getUsers(next);
					})
					.oncomplete(function(results){
						res.status(200).end(JSON.stringify(results));
					})
					.onfail(function(err){
						app.serveError(500, err, res);
					})
					.process();
				}
			});
			
		server.api.registerRoute("config/groups")
			.get(function(req, res){
				if(!server.hasOwnProperty("dirs")){
					var err = new ConfigException({msg: "Request to get directory group details could not be processed. No group directories have been initialized."});
					app.serveError(500, err, res);
				}
				else {
					var collectionResourceResponse = new server.utils.CollectionResourceResponse(server.dirs, function(item, next){
						item.getGroups(next);
					})
					.oncomplete(function(results){
						res.status(200).end(JSON.stringify(results));
					})
					.onfail(function(err){
						app.serveError(500, err, res);
					})
					.process();
				}
			});
		
		server.api.createParameter("directory", function(req, res, next){
			if(!server.hasOwnProperty("dirs")){
				var err = new ConfigException({msg: "Request for directory data could not be completed. No directories have been initialized."});
				app.serveError(500, err, res);
			}
			else if(!server.dirs.hasOwnProperty(req.directory)){
				var err = new ConfigException({msg: "Request for directory '" + req.directory + "' data could not be completed. The directory has not been initialized."});
				app.serveError(500, err, res);
			}
			else {
				next();
			}
		});

		server.api.createParameter("username");
		server.api.registerRoute("config/directories/:directory/users/:username")
			.get(function(req, res){
				server.dirs[req.directory].getUser(req.username, function(err, userDetails){
					if(err){
						app.serveError(500, err, res);
					}
					else {
						res.status(200).end(JSON.stringify(userDetails));
					}
				});
			})
			.post(function(req, res){
				updateUser(req.directory, req.username, req.body, function(err){
					if(err){
						app.serveError(500, err, res);
					}
					else {
						res.status(200).end();
					}
				});
			})
			.delete(function(req, res){
				deleteUser(req.directory, req.username, function(err){
					if(err){
						app.serveError(500, err, res);
					}
					else {
						res.status(200).end();
					}
				});
			});
			
		server.api.registerRoute("config/directories/:directory/users/:username/groups")
			.get(function(req, res){
				var collectionResourceResponse = new server.utils.CollectionResourceResponse(server.dirs, function(item, next){
					item.getGroupsForUser(req.username, next);
				})
				.oncomplete(function(results){
					res.status(200).end(JSON.stringify(results));
				})
				.onfail(function(err){
					app.serveError(500, err, res);
				})
				.process();
			});
		
		server.api.createParameter("groupName");
		server.api.registerRoute("config/directories/:directory/groups/:groupName")
			.post(function(req, res){
				updateGroup(req.directory, req.groupName, req.body, function(err){
					if(err){
						app.serveError(500, err, res);
					}
					else {
						res.status(200).end();
					}
				});
			})
			.delete(function(req, res){
				deleteGroup(req.directory, req.groupName, function(err){
					if(err){
						app.serveError(500, err, res);
					}
					else {
						res.status(200).end();
					}
				});
			});
		
		server.api.registerRoute("config/directories/:directory/groups/:groupName/users")
			.get(function(req, res){
				server.dirs[req.directory].getUsersInGroup(req.groupName, function(err, users){
					if(err){
						app.serveError(500, err, res);
					}
					else {
						res.status(200).end(JSON.stringify(users));
					}
				});
			})
			.post(function(req, res){
				server.dirs[req.directory].addUserToGroup(req.groupName, req.body.username, function(err){
					if(err){
						app.serveError(500, err, res);
					}
					else {
						res.status(200).end();
					}
				});
			})
			.delete(function(req, res){
				server.dirs[req.directory].removeUserFromGroup(req.groupName, req.body.username, function(err){
					if(err){
						app.serveError(500, err, res);
					}
					else {
						res.status(200).end();
					}
				});
			});
			
		server.api.createParameter("roleId");
		server.api.registerRoute("config/roles/:roleId/users")
			.get(function(req, res){
				server.authorizationService.getUsersForRole(req.roleId, function(err, users){
					if(err){
						app.serveError(500, err, res);
					}
					else {
						res.status(200).end(JSON.stringify(users));
					}
				});
			})
			.post(function(req, res){
				server.authorizationService.addUserToRole(req.roleId, req.body.username, function(err){
					if(err){
						app.serveError(500, err, res);
					}
					else {
						res.status(200).end();
					}
				});
			})
			.delete(function(req, res){
				server.authorizationService.removeUserFromRole(req.roleId, req.body.username, function(err){
					if(err){
						app.serveError(500, err, res);
					}
					else {
						res.status(200).end();
					}
				});
			});
			
		server.api.registerRoute("config/roles/:roleId/groups")
			.get(function(req, res){
				server.authorizationService.getGroupsForRole(req.roleId, function(err, groups){
					if(err){
						app.serveError(500, err, res);
					}
					else {
						res.status(200).end(JSON.stringify(groups));
					}
				});
			})
			.post(function(req, res){
				server.authorizationService.addGroupToRole(req.roleId, req.body.groupId, function(err){
					if(err){
						app.serveError(500, err, res);
					}
					else {
						res.status(200).end();
					}
				});
			})
			.delete(function(req, res){
				server.authorizationService.removeGroupFromRole(req.roleId, req.body.groupId, function(err){
					if(err){
						app.serveError(500, err, res);
					}
					else {
						res.status(200).end();
					}
				});
			});
			
		server.api.registerRoute("config/license")
			.get(function(req, res){
				res.status(200).end(JSON.stringify(server.licensingService.getLicenseDetails()));
			})
			.post(function(req, res){
				server.licensingService.setLicenseDetails(req.body.license, function(){
					config.licenseKey = req.body.license;
					writeConfig(function(err){
						if(err){
							app.serveError(500, err, res);
						}
						else {
							res.status(200).end();
						}
					});
				});
			});
			
		server.api.registerRoute("config/license/server-id")
			.get(function(req, res){
				res.status(200).end(JSON.stringify({serverId: server.licensingService.getServerId()}));
			});
			
		server.api.registerRoute("config/loggers")
			.get(function(req, res){
				getLogConfig(function(err, logConfigObj){
					if(err){
						app.serveError(500, err, res);
					}
					else {
						res.status(200).end(JSON.stringify({loggers: Object.keys(logConfigObj.logs)}));
					}
				});
			});
			
		server.api.createParameter("loggerId");
		server.api.registerRoute("config/loggers/:loggerId")
			.get(function(req, res){
				getLogConfig(function(err, logConfigObj){
					if(err){
						app.serveError(500, err, res);
					}
					else {
						if(logConfigObj.logs.hasOwnProperty(req.loggerId)){
							res.status(200).end(JSON.stringify(logConfigObj.logs[req.loggerId]));
						}
						else {
							var exc = new ConfigException({msg: "Could not retrieve configuration for logger '" + req.loggerId + "'. Logger does not exist."});
							app.serveError(500, exc, res);
						}
					}
				});
			})
			.put(function(req, res){
				getLogConfig(function(err, logConfigObj){
					if(err){
						app.serveError(500, err, res);
					}
					else {
						if(logConfigObj.logs.hasOwnProperty(req.loggerId)){
							logConfigObj.logs[req.loggerId] = req.body;
							writeLogConfig(logConfigObj, function(writeErr){
								if(writeErr){
									app.serveError(writeErr);
								}
								else {
									res.status(200).end();
								}
							});
						}
						else {
							var exc = new ConfigException({msg: "Could not update configuration for logger '" + req.loggerId + "'. Logger does not exist."});
							app.serveError(500, exc, res);
						}
					}
				});
			});
			
		server.api.createParameter("appenderId");
		server.api.registerRoute("config/loggers/appenders/:appenderId")
			.get(function(req, res){
				getLogConfig(function(err, logConfigObj){
					if(err){
						app.serveError(500, err, res);
					}
					else {
						if(logConfigObj.appenders.hasOwnProperty(req.appenderId)){
							res.status(200).end(JSON.stringify(logConfigObj.appenders[req.appenderId]));
						}
						else {
							var exc = new ConfigException({msg: "Could not retrieve configuration for appender '" + req.appenderId + "'. Appender does not exist."});
							app.serveError(500, exc, res);
						}
					}
				});
			})
			.put(function(req, res){
				getLogConfig(function(err, logConfigObj){
					if(err){
						app.serveError(500, err, res);
					}
					else {
						if(logConfigObj.appenders.hasOwnProperty(req.appenderId)){
							logConfigObj.appenders[req.appenderId] = req.body;
							writeLogConfig(logConfigObj, function(writeErr){
								if(writeErr){
									app.serveError(500, err, res);
								}
								else {
									res.status(200).end();
								}
							});
						}
						else {
							var exc = new ConfigException({msg: "Could not update configuration for appender '" + req.appenderId + "'. Appender does not exist."});
							app.serveError(500, exc, res);
						}
					}
				});
			});
			
		server.api.registerRoute("config/loggers/files/:appenderId")
			.get(function(req, res){
				getLogConfig(function(err, logConfigObj){
					if(err){
						app.serveError(500, err, res);
					}
					else {
						if(logConfigObj.appenders.hasOwnProperty(req.appenderId)){
							if(logConfigObj.appenders[req.appenderId].hasOwnProperty("file")){
								var filePath = path.join(__dirname, "..", logConfigObj.appenders[req.appenderId].file);
								if(!fs.existsSync(filePath)){
									var exc = new ConfigException({msg: "Could not retrieve log file for appender '" + req.appenderId + "'. Configured file path does not exist."});
									app.serveError(500, exc, res);
								}
								else {
									fs.readFile(filePath, "utf8", function(fileErr, fileData){
										if(fileErr){
											app.serveError(fileErr);
										}
											
										else {
											fileData = fileData.trim().replace(/(\r\n|\r|\n)/gm, os.EOL);
											var lines = fileData.split(os.EOL);
											var responseLines = [];
											if(!req.query.hasOwnProperty("limit")){
												req.query.limit = 10;
											}
											if(!req.query.hasOwnProperty("start")){
												req.query.start = 0;
											}
											
											for(var i=0;i<req.query.limit;i++){
												var lineIndex = lines.length - 1 - i - req.query.start;
												if(lineIndex < 0){
													break;
												}
												var line = lines.slice(lineIndex)[0];
												responseLines.push(line);
											}
											
											var data = {};
											data.lines = responseLines.reverse();
											data.hasPrevious = (lines.length - 1 - i - req.query.start) > 0;
											data.hasNext = req.query.start > 0;
											data.start = req.query.start;
											
											res.status(200).end(JSON.stringify(data));
										}
									});
								}
							}
							else {
								var exc = new ConfigException({msg: "Could not retrieve log file for appender '" + req.appenderId + "'. Appender configuration does not include file path."});
								app.serveError(500, exc, res);
							}
						}
						else {
							var exc = new ConfigException({msg: "Could not retrieve configuration for appender '" + req.appenderId + "'. Appender does not exist."});
							app.serveError(500, exc, res);
						}
					}
				});
			});
			
			server.api.registerRoute("config/server-config")
				.get(function(req, res){
					var response = config.server || {};
					
					for(var serverId in response){
						for(var key in response[serverId]){
							if(key == "key" || key == "cert"){
								var newKey = "has" + key;
								delete response[serverId][key];
								response[serverId][newKey] = true;
							}
						}
					}
					
					res.status(200).end(JSON.stringify(response));
				})
				.post(function(req, res){
					for(var serverId in req.body){
						if(!config.server.hasOwnProperty(serverId)){
							config.server[serverId] = {};
						}
						for(var key in req.body[serverId]){
							config.server[serverId][key] = req.body[serverId][key];
						}
					}
					writeConfig(function(err){
						if(err){
							app.serveError(500, err, res);
						}
						else {
							res.status(200).end();
						}
					});
				});
				
			server.api.createParameter("serverId");
			server.api.registerRoute("config/server/:serverId/certs")
				.post(function(req, res){
					var form = new multiparty.Form();
					var body = {};
					body.files = {};
					form.on("part", function(part){
						if(!part.filename){
							part.resume();
						}
						
						if(part.filename){
							var content = "";
							part.on("data", function(chunk){
								content += chunk;
							});
							part.on("end", function(){
								body.files[part.name] = content;
							});
						}
					});
					
					form.on("error", function(err){
						app.serveError(500, err, res);
					});
					
					form.on("close", function(){
						if(!body.files.hasOwnProperty("cert") || !body.files.hasOwnProperty("key")){
							var exc = new ConfigException({msg: "Error updating certificate files for " + req.serverId + " server. Both a certificate and key file are required."});
							app.serveError(500, exc, res);
						}
						else {
							if(!config.server.hasOwnProperty(req.serverId)){
								config.server[req.serverId] = {};
							}
							config.server[req.serverId].key = body.files.key;
							config.server[req.serverId].cert = body.files.cert;
							writeConfig(function(err){
								if(err){
									app.serveError(500, err, res);
								}
								else {
									res.status(200).end();
								}
							});
						}
					});
					
					form.parse(req);
				});
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
		fs.open(configPath, 'w', function(err, fd){
			if(err){
				next(err);
				return;
			}
			fs.write(fd, JSON.stringify(config), function(writeErr, written, buffer){
				if(writeErr){
					next(writeErr);
					return;
				}
				
				fs.close(fd, next);
			});
		});
	}
	
	function updateRole(roleId, roleName, next){
		server.authorizationService.roleExists(roleId, function(err, exists){
			if(err){
				next(err);
			}
			else {
				if(exists){
					server.authorizationService.updateRole(roleId, roleName, next);
				}
				else {
					server.authorizationService.createRole(roleId, roleName, next);
				}
			}
		});
	}
	
	function updateUser(directory, username, updateData, next){
		server.dirs[directory].userExists(username, function(err, exists){
			if(err){
				next(err);
			}
			else {
				if(exists){
					server.dirs[directory].updateUser(username, updateData, next);
				}
				else {
					server.dirs[directory].createUser(username, updateData, next);
				}
			}
		});
	}
	
	function deleteUser(directory, username, next){
		server.dirs[directory].userExists(username, function(err, exists){
			if(err){
				next(err);
			}
			else {
				if(exists){
					server.dirs[directory].deleteUser(username, next);
				}
				else {
					var exc = new ConfigException({msg: "Request to delete user '" + username + "' could not be processed. User could not be found in directory specified."});
					next(exc);
				}
			}
		});
	}
	
	function updateGroup(directory, groupName, updateData, next){
		server.dirs[directory].groupExists(groupName, function(err, exists){
			if(err){
				next(err);
			}
			else {
				if(exists){
					server.dirs[directory].updateGroup(groupName, updateData, next);
				}
				else {
					server.dirs[directory].createGroup(groupName, updateData, next);
				}
			}
		});
	}
	
	function deleteGroup(directory, groupName, next){
		server.dirs[directory].groupExists(groupName, function(err, exists){
			if(err){
				next(err);
			}
			else {
				if(exists){
					server.dirs[directory].deleteGroup(groupName, next);
				}
				else {
					var exc = new ConfigException({msg: "Request to delete group '" + groupName + "' could not be processed. Group could not be found in directory specified."});
					next(exc);
				}
			}
		});
	}
	
	function getLogConfig(next){
		if(logConfig == undefined){
			var loggerConfigPath = path.join(__dirname, "../log4n", "log4n.json");
			if(!fs.existsSync(loggerConfigPath)){
				var exc = new ConfigException({msg: "Could not retrieve logging configuration. log4n.json does not exist."});
				next(exc);
			}
			else {
				fs.readFile(loggerConfigPath, "utf8", function(err, data){
					if(err){
						next(err);
					}
					else {
						logConfig = JSON.parse(data);
						next(undefined, logConfig);
					}
				});
			}
		}
		else {
			next(undefined, logConfig);
		}
	}
	
	function writeLogConfig(newConfig, next){
		var loggerConfigPath = path.join(__dirname, "../log4n", "log4n.json");
		if(!fs.existsSync(loggerConfigPath)){
			var exc = new ConfigException({msg: "Could not update logging configuration. log4n.json does not exist."});
			next(exc);
		}
		else {
			fs.open(loggerConfigPath, "w", function(err, fd){
				if(err){
					next(err);
				}
				else {
					fs.write(fd, JSON.stringify(newConfig), function(writeErr, written, string){
						if(writeErr){
							next(writeErr);
						}
						else {
							fs.close(fd, next);
						}
					});
				}
			});
		}
	}
	
	return c;
})();

var ConfigException = (function(settings, implementationContext){	
	settings = (settings || {});
	this.name = "ConfigException";
	
	this.type = "Configuration";
	this.message = settings.msg || "A configuration error occurred.";
	this.detail = "";
	this.extendedInfo = "";
	this.errorCode = (settings.code != null ? settings.code : 1);
	
	Error.captureStackTrace(this, (implementationContext || ConfigException));
});

util.inherits(ConfigException, Error);

module.exports = Config;