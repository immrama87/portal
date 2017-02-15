var fs = require("fs");
var path = require("path");
var multiparty = require("multiparty");
var crypto = require("crypto");
var os = require("os");
var http = require("http");
var https = require("https");
var ConfigException = require("./ConfigException");

var ConfigWizard = (function(){
	var cw = {};
	var config = {};
	
	var dbSchema = {
		"groups":	[
			{
				name: "name",
				type: "nvarchar",
				size: 255
			},
			{
				name: "displayName",
				type: "nvarchar",
				size: 255
			},
			{
				name: "members",
				type: "nvarchar",
				size: Infinity
			},
			{
				name: 	"createDate",
				type: 	"bigint",
				signed:	false
			},
			{	name: 	"modifiedDate",
				type: 	"bigint",
				signed:	false
			}
		],
		"roles":	[
			{
				name: "name",
				type: "nvarchar",
				size: 255
			},
			{
				name: "roleId",
				type: "nvarchar",
				size: 255
			},
			{
				name: "groupMembers",
				type: "nvarchar",
				size: Infinity
			},
			{
				name: "members",
				type: "nvarchar",
				size: Infinity
			},
			{
				name: 	"createDate",
				type: 	"bigint",
				signed:	false
			},
			{
				name: 	"modifiedDate",
				type:	"bigint",
				signed: false
			}
		],
		"users":	[
			{
				name: "username",
				type: "nvarchar",
				size: 255
			},
			{
				name: "fn",
				type: "nvarchar",
				size: 255
			},
			{
				name: "ln",
				type: "nvarchar",
				size: 255
			},
			{
				name: "email",
				type: "nvarchar",
				size: 255
			},
			{
				name: "password",
				type: "nvarchar",
				size: 255
			},
			{
				name: 	"createDate",
				type:	"bigint",
				signed:	false
			},
			{
				name: 	"modifiedDate",
				type:	"bigint",
				signed: false
			},
			{
				name: "secret",
				type: "nvarchar",
				size: 255
			}
		]
	}
	
	cw.setupRoutes = function(app){
		app.route("/config/wizard")
			.get(function(req, res, next){
				req.url = "/config/wizard.html";
				next();
			});
			
		server.api.registerRoute(app, "config/wizard/db/drivers")
			.get(function(req, res){
				var pathname = path.join(__dirname, "../", "drivers/db");
				if(fs.existsSync(pathname)){
					fs.readdir(pathname, function(err, files){
						var drivers = [];
						for(var i=0;i<files.length;i++){
							var driver = {};
							driver.name = files[i];
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
			})
			.post(function(req, res){
				config.db = req.body;
				res.status(200).end();
			});
			
		server.api.registerRoute(app, "config/wizard/db/drivers/validate")
			.get(function(req, res){
				var pathname = path.join(__dirname, "../", "drivers/db", config.db.driver);
				var valid = fs.existsSync(pathname);
				var error;
				var warning;
				if(valid){
					try{
						var missing = [];
						var driver = require(pathname)();
						if(!driver.hasOwnProperty("getSession")){
							missing.push("getSession");
						}
						if(!driver.hasOwnProperty("generatePreparedStatement")){
							missing.push("generatePreparedStatement");
						}
						if(!driver.hasOwnProperty("config")){
							missing.push("config");
						}
						if(!driver.hasOwnProperty("hasDatabase")){
							missing.push("hasDatabase");
						}
						
						if(missing.length > 0){
							throw "Driver validation failed because the following driver interface methods were not present: " + missing.join(", ");
						}
						driver.config(config.db);
						driver.hasDatabase(function(err, hasDb){
							if(err){
								throw err;
							}
							else {
								if(!hasDb){
									warning = "The database specified in the driver settings does not exist.";
								}
							}
							var session = driver.getSession();
							if(!session.hasOwnProperty("execute")){
								missing.push("execute");
							}
							if(!session.hasOwnProperty("close")){
								missing.push("close");
							}
							if(missing.length > 0){
								throw "Driver validation failed because the following database session interface methods were not present: " + missing.join(", ");
							}
							
							var statement = driver.generatePreparedStatement({
								action:	"read",
								table:	"users"
							});
							if(!statement.hasOwnProperty("withParam")){
								missing.push("withParam");
							}
							if(!statement.hasOwnProperty("setParam")){
								missing.push("setParam");
							}
							
							if(missing.length > 0){
								throw "Driver validation failed because the following database PreparedStatement interface methods were not present: " + missing.join(", ");
							}
							
							sendResponse();
						});
					}
					catch(err){
						server.errorLog.error(err);
						error = err.message || err;
						valid = false;
						sendResponse();
					}
				}
				else {
					error = "Driver file specified does not exist.";
					sendResponse();
				}
				
				function sendResponse(){				
					res.status(200).end(JSON.stringify({valid: valid, error: error, warning: warning}));
				}
			});
			
		server.api.registerRoute(app, "/config/wizard/db/drivers/validate/schema")
			.get(function(req, res){
				var pathname = path.join(__dirname, "../", "drivers/db", config.db.driver);
				var driver = require(pathname)();
				driver.config(config.db);
				var missingTables = [];
				var missingFields = {};
				var requests = 0;
				var errors = [];
				if(!driver.hasOwnProperty("hasTable")){
					errors.push("Database driver does not have a hasTable method. Could not validate database schema.");
				}
				if(!driver.hasOwnProperty("validateTableField")){
					errors.push("Database driver does not have a validateTableField method. Could not validate database schema.");
				}
				if(errors.length == 0){
					for(var table in dbSchema){
						requests++;
						findTable(driver, table, function(err, missingError, missingFields, fieldErrors){
							if(err){
								server.errorLog.error(err);
								errors.push(err.message || err);
							}
							else {
								if(missingError){
									errors.push(missingError);
								}
								if(missingFields){
									errors.push(missingFields);
								}
								if(fieldErrors){
									errors.push(fieldErrors);
								}
							}
							
							requests--;
							checkComplete();
						});
					}
				}
				else {
					checkComplete();
				}
				
				function checkComplete(){
					if(requests==0){
						if(missingTables.length>0){
							errors.push("The following tables could not be found: " + missingTables.join(", "));
						}
						
						if(errors.length > 0){
							res.status(200).end(JSON.stringify({errors: errors}));
						}
						else {
							res.status(200).end(JSON.stringify({}));
						}
					}
				}
			});
			
		server.api.registerRoute(app, "/config/wizard/db/drivers/create")
			.post(function(req, res){
				var pathname = path.join(__dirname, "../", "drivers/db", config.db.driver);
				var driver = require(pathname)();
				driver.config(config.db);
				if(!driver.hasOwnProperty("createDatabase")){
					var exc = new ConfigException({msg: "Database driver does not have a createDatabase method. Could not create the database."});
					app.serveError(500, err, res);
				}
				else {
					driver.createDatabase(function(err){
						if(err){
							app.serveError(500, err, res);
						}
						else {
							res.status(200).end();
						}
					});
				}
			});
			
		server.api.registerRoute(app, "/config/wizard/db/drivers/create/schema")
			.post(function(req, res){
				var pathname = path.join(__dirname, "../", "drivers/db", config.db.driver);
				var driver = require(pathname)();
				driver.config(config.db);
				if(!driver.hasOwnProperty("createTable")){
					var exc = new ConfigException({msg: "Database driver does not have a createTable method. Could not create the database schema."});
					app.serveError(500, err, res);
				}
				else {
					var collectionResourceResponse = new server.utils.CollectionResourceResponse(Object.keys(dbSchema), function(table, next){
						driver.createTable(table, dbSchema[table], next);
					})
					.onfail(function(schemaErr){
						app.serveError(500, schemaErr, res);
					})
					.oncomplete(function(){
						res.status(200).end();
					})
					.process();
				} 
			});
			
		server.api.registerRoute(app, "/config/wizard/directories/configure")
			.post(function(req, res){
				config.directories = {};
				config.directories.Internal = {};
				config.directories.Internal.driver = "InternalDirectory.js";
				
				try{
					var pathname = path.join(__dirname, "../", "drivers", "directories", config.directories.Internal.driver);
					var driver = require(pathname);
					var directory = driver();
					
					res.status(200).end();
				}
				catch(err){
					app.serveError(500, err, res);
				}
			});
		
		server.api.registerRoute(app, "/config/wizard/configure-groups")
			.post(function(req, res){
				var driverPath = path.join(__dirname, "../", "drivers", "db", config.db.driver);
				server.db = require(driverPath)();
				server.db.config(config.db);
				
				var pathname = path.join(__dirname, "../", "drivers", "directories", config.directories.Internal.driver);
				var driver = require(pathname);
				var directory = driver();
				
				var requests = 2;
				var errors = [];
				directory.groupExists("portal-users", function(lookupErr, exists){
					if(lookupErr){
						errors.push(lookupErr);
						requests--;
						checkComplete();
					}
					else if(exists){
						requests--;
						checkComplete();
					}
					else {
						directory.createGroup("portal-users", {displayName: "Portal Users"}, function(err){
							if(err){
								errors.push(err);
							}
							
							requests--;
							checkComplete();
						});
					}
				});
				
				directory.groupExists("portal-administrators", function(lookupErr, exists){
					if(lookupErr){
						errors.push(lookupErr);
						requests--;
						checkComplete();
					}
					else if(exists){
						requests--;
						checkComplete();
					}
					else {
						directory.createGroup("portal-administrators", {displayName: "Portal Administrators"}, function(err){
							if(err){
								errors.push(err);
							}
							
							requests--;
							checkComplete();
						});
					}
				});
				
				function checkComplete(){
					if(requests == 0){
						if(errors.length > 0){
							app.serveError(500, errors.join("\n"), res);
						}
						else {
							res.status(200).end();
						}
					}
				}
			});
			
		server.api.registerRoute(app, "/config/wizard/configure-roles")
			.post(function(req, res){
				var driverPath = path.join(__dirname, "../", "drivers", "db", config.db.driver);
				server.db = require(driverPath)();
				server.db.config(config.db);

				var requests = 5;
				var errors = [];
				server.authorizationService.roleExists("100", function(lookupErr, exists){
					if(lookupErr){
						errors.push(lookupErr);
						requests-=2;
						checkComplete();
					}
					else if(exists){
						server.authorizationService.getGroupsForRole("100", function(membersErr, members){
							if(membersErr){
								errors.push(membersErr);
								requests-=2;
								checkComplete();
							}
							else {
								if(members.indexOf("portal-users") == -1){
									server.authorizationService.addGroupToRole("100", "portal-users", function(addErr){
										if(addErr){
											errors.push(addErr);
										}
										
										requests--;
										if(members.indexOf("portal-administrators") == -1){
											server.authorizationService.addGroupToRole("100", "portal-administrators", function(adminErr){
												if(addErr){
													errors.push(adminErr);
												}
												
												requests--;
												checkComplete();
											});
										}
										else {
											requests--;
											checkComplete();
										}
									});
								}
								else {
									requests--;
									if(members.indexOf("portal-administrators") == -1){
										server.authorizationService.addGroupToRole("100", "portal-administrators", function(adminErr){
											if(addErr){
												errors.push(adminErr);
											}
											
											requests--;
											checkComplete();
										});
									}
									else {
										requests--;
										checkComplete();
									}
								}
							}
						});
					}
					else {
						server.authorizationService.createRole("100", "Portal Access", function(err){
							if(err){
								errors.push(err);
								requests -= 2;
								checkComplete();
							}
							else {
								server.authorizationService.addGroupToRole("100", "portal-users", function(addErr){
									if(addErr){
										errors.push(addErr);
									}
									
									requests--;
									server.authorizationService.addGroupToRole("100", "portal-administrators", function(adminErr){
										if(addErr){
											errors.push(adminErr);
										}
										
										requests--;
										checkComplete();
									});
								});
								
								
							}
						});
					}
				});
				
				server.authorizationService.roleExists("200", function(lookupErr, exists){
					if(lookupErr){
						errors.push(lookupErr);
						requests--;
						checkComplete();
					}
					else if(exists){
						server.authorizationService.getGroupsForRole("200", function(membersErr, members){
							if(membersErr){
								errors.push(membersErr);
								requests--;
								checkComplete();
							}
							else if(members.indexOf("portal-administrators") > -1){
								requests--;
								checkComplete();
							}
							else {
								server.authorizationService.addGroupToRole("200", "portal-administrators", function(addErr){
									if(addErr){
										errors.push(addErr);
									}
									
									requests--;
									checkComplete();
								});
							}
						});
					}
					else {
						server.authorizationService.createRole("200", "API Access", function(err){
							if(err){
								errors.push(err);
								requests--;
								checkComplete();
							}
							else {
								server.authorizationService.addGroupToRole("200", "portal-administrators", function(addErr){
									if(addErr){
										errors.push(addErr);
									}
									
									requests--;
									checkComplete();
								});
							}
						});
					}
				});
				
				server.authorizationService.roleExists("300", function(lookupErr, exists){
					if(lookupErr){
						errors.push(lookupErr);
						requests--;
						checkComplete();
					}
					else if(exists){
						server.authorizationService.getGroupsForRole("300", function(membersErr, members){
							if(membersErr){
								errors.push(membersErr);
								requests--;
								checkComplete();
							}
							else if(members.indexOf("portal-administrators") > -1){
								requests--;
								checkComplete();
							}
							else {
								server.authorizationService.addGroupToRole("300", "portal-administrators", function(addErr){
									if(addErr){
										errors.push(addErr);
									}
									
									requests--;
									checkComplete();
								});
							}
						});
					}
					else {
						server.authorizationService.createRole("300", "Admin Access", function(err){
							if(err){
								errors.push(err);
								requests--;
								checkComplete();
							}
							else {
								server.authorizationService.addGroupToRole("300", "portal-administrators", function(addErr){
									if(addErr){
										errors.push(addErr);
									}
									
									requests--;
									checkComplete();
								});
							}
						});
					}
				});
				
				server.authorizationService.roleExists("400", function(lookupErr, exists){
					if(lookupErr){
						errors.push(lookupErr);
						requests--;
						checkComplete();
					}
					else if(exists){
						server.authorizationService.getGroupsForRole("400", function(membersErr, members){
							if(membersErr){
								errors.push(membersErr);
								requests--;
								checkComplete();
							}
							else if(members.indexOf("portal-administrators") > -1){
								requests--;
								checkComplete();
							}
							else {
								server.authorizationService.addGroupToRole("400", "portal-administrators", function(addErr){
									if(addErr){
										errors.push(addErr);
									}
									
									requests--;
									checkComplete();
								});
							}
						});
					}
					else {
						server.authorizationService.createRole("400", "Config Access", function(err){
							if(err){
								errors.push(err);
								requests--;
								checkComplete();
							}
							else {
								server.authorizationService.addGroupToRole("400", "portal-administrators", function(addErr){
									if(addErr){
										errors.push(addErr);
									}
									
									requests--;
									checkComplete();
								});
							}
						});
					}
				});
				
				
				function checkComplete(){
					if(requests==0){
						res.status(200).end(JSON.stringify(errors));
					}
				}
			});
			
		server.api.registerRoute(app, "/config/wizard/create-user")
			.post(function(req, res){
				var driverPath = path.join(__dirname, "../", "drivers", "db", config.db.driver);
				server.db = require(driverPath)();
				server.db.config(config.db);
				
				var pathname = path.join(__dirname, "../", "drivers", "directories", config.directories.Internal.driver);
				var driver = require(pathname);
				var directory = driver();
				
				directory.userExists(req.body.username, function(findErr, exists){
					if(findErr){
						app.serveError(500, findErr, res);
					}
					else if(exists){
						var exc = new ConfigException({msg: "The user '" + req.body.username + "' already exists."});
						app.serveError(500, exc, res);
					}
					else {
						directory.createUser(req.body.username, req.body, function(err){
							if(err){
								app.serveError(500, err, res);
							}
							else {
								directory.addUserToGroup("portal-administrators", req.body.username, function(groupErr){
									if(groupErr){
										app.serveError(500, groupErr, res);
									}
									else {
										res.status(200).end();
									}
								});
							}
						});
					}
				});
			});
			
		server.api.createParameter(app, "serverName");
		server.api.registerRoute(app, "/config/wizard/servers/:serverName")
			.post(function(req, res){
				var form = new multiparty.Form();
				var body = {};
				
				form.on("part", function(part){
					var content = "";
					part.on("data", function(chunk){
						content += chunk;
					});
					part.on("end", function(){
						body[part.name] = content;
					});
				});
				
				form.on("error", function(err){
					app.serveError(500, err, res);
				});
				
				form.on("close", function(){
					if(!config.hasOwnProperty("servers")){
						config.servers = {};
					}
					
					if(!body.sameAsUserServer){
						config.servers[req.serverName] = body;
					}
					else {
						config.servers[req.serverName] = config.servers.user;
					}
					
					res.status(200).end();
				});
				
				form.parse(req);
			});
			
		server.api.registerRoute(app, "/config/wizard/server-id")
			.get(function(req, res){
				res.status(200).end(JSON.stringify({serverId: server.serverId}));
			});
			
		server.api.registerRoute(app, "/config/wizard/license")
			.post(function(req, res){
				server.licensingService.setLicenseDetails(req.body.license, function(){
					var license = server.licensingService.getLicenseDetails();
					if(license.status != "unlicensed" && license.status != "invalid" && license.status != "appired"){
						config.licenseKey = req.body.license;
						res.status(200).end();
					}
					else {
						var exc = new ConfigException({msg: "The license key provided cannot be used as it is " + license.status + "."});
						app.serveError(500, exc, res);
					}
				});
			});
			
		server.api.registerRoute(app, "/config/wizard/dependencies")
			.post(function(req, res){
				if(!config.hasOwnProperty("dependencies")){
					config.dependencies = [];
				}
				
				console.log(req.body);
				
				var dependency = {};
				dependency.name = req.body.name;
				dependency.filename = req.body.name.toLowerCase().replace(/\s/g, "_") + "." + req.body.type;
				dependency.type = req.body.type;
				dependency.url = req.body.url;
				if(req.body.validation != undefined){
					dependency.validation = req.body.validation;
				}
				else {
					dependency.validation = true;
				}
				dependency.system = true;
				
				makeHttpRequest(dependency.url, "GET", function(err, data){
					if(err){
						app.serveError(500, err, res);
					}
					else {
						if(req.body.integrity){
							var integrity = req.body.integrity;
							if(integrity.indexOf("\"") > -1){
								var start = integrity.indexOf("\"") + 1;
								var end = integrity.indexOf("\"", start);
								
								integrity = integrity.substring(start, end);
							}
							
							dependency.integrity = integrity;
						}
						else {
							var reqHash = crypto.createHash("sha384")
								.update(data, "utf8")
								.digest("base64");
								
							dependency.integrity = "sha384-" + reqHash;
						}
						validateIntegrity(dependency, data, function(integrityErr){
							if(integrityErr){
								app.serveError(500, integrityErr, res);
							}
							else {
								var filepath = path.join(__dirname, "..", "webresources", dependency.type, "dependencies", dependency.filename);
								fs.open(filepath, "w", function(openErr, fd){
									if(openErr){
										app.serveError(500, openErr, res);
									}
									else {
										fs.write(fd, data, "utf8", function(writeErr, written, string){
											if(writeErr){
												app.serveError(500, writeErr, res);
											}
											else {
												fs.close(fd, function(){
													config.dependencies.push(dependency);
													res.status(200).end();
												});
											}
										});
									}
								});
							}
						});
					}
				});
			});
			
		server.api.registerRoute(app, "/config/wizard/save")
			.post(function(req, res){
				writeConfig(function(err){
					if(err){
						app.serveError(500, err, res);
					}
					else {
						res.status(200).end();
					}
				});
			});
	}
	
	function findTable(driver, table, next){
		var missingError;
		var missingFields = [];
		var	fieldErrors = [];
		var requests = 0;
		driver.hasTable(table, function(err, hasTable){
			if(err){
				next(err);
			}
			else if(hasTable){
				for(var i=0;i<dbSchema[table].length;i++){
					requests++;
					validateColumnDef(driver, table, dbSchema[table][i], function(fieldErr, missingError, validationError){
						if(fieldErr){
							next(fieldErr);
						}
						else {
							if(missingError){
								missingFields.push(missingError);
							}
							else if(validationError){
								fieldErrors.push(validationError);
							}
						}
						requests--;
						checkComplete();
					});
				}
				requests--;
				checkComplete();
			}
			else {
				missingError = table;
				requests--;
				checkComplete();
			}
		});
		
		function checkComplete(){
			if(requests == 0){
				var missingFieldsError;
				if(missingFields.length > 0){
					missingFieldsError = "The following fields from table '" + table + "' could not be found: " + missingFields.join(", ");
				}
				next(undefined, missingError, missingFieldsError, ((fieldErrors.length > 0) ? fieldErrors : undefined));
			}
		}
	}
	
	function validateColumnDef(driver, table, columnDef, next){
		driver.validateTableField(table, columnDef, function(err, exists, valid){
			if(err){
				next(err);
			}
			else if(exists){
				if(valid){
					next(undefined, undefined, undefined);
				}
				else {
					next(undefined, undefined, "Configuration for field '" + columnDef.name + "' on table '" + table + "' does not match the system requirements.");
				}
			}
			else {
				next(undefined, columnDef.name, undefined);
			}
		});
	}
	
	function parseUrl(url){
		var obj = {};
		
		var transportIndex = url.indexOf("://");
		obj.transport = url.substring(0, transportIndex);
		
		var hostIndex = url.indexOf("/", transportIndex + 3);
		obj.host = url.substring(transportIndex+3, hostIndex);
		
		if(obj.host.indexOf(":") > -1){
			obj.port = obj.host.substring(obj.host.indexOf(":") + 1);
			obj.host = obj.host.substring(0, obj.host.indexOf(":"));
		}
		else {
			if(obj.transport == "http"){
				obj.port = "80";
			}
			else if(obj.transport == "https"){
				obj.port = "443";
			}
		}
		
		obj.path = url.substring(hostIndex);
		
		return obj;
	}
	
	function makeHttpRequest(requestUrl, method, next){
		var url = parseUrl(requestUrl);
		url.method = method;
		
		var transport;
		if(url.transport == "http"){
			transport = http;
		}
		else if(url.transport == "https"){
			transport = https;
		}
		else {
			var exc = new ConfigException({msg: "Error triggering request. The URL provided ('" + requestUrl + "') could not be successfully parsed."});
			next(exc);
			return;
		}
		
		var req = transport.request(url, function(res){
			var data = "";
			res.on("data", function(d){
				data += d.toString("utf8");
			});
			
			res.on("end", function(){
				next(undefined, data);
			});
		});
		req.end();
		
		req.on("error", function(reqErr){
			next(reqErr);
		});
	}
	
	function validateIntegrity(dependency, data, next){
		if(dependency.integrity.indexOf("-") == -1){
			next(new ConfigException({msg: "Could not verify the integrity of the dependency '" + dependency.name + "'. The integrity value provided was malformed, the expected format is '<hash-algorithm>-<base-64-encoded-hash>'. Please update and try again."}));
		}
		else {
			var algorithm, hash;
			algorithm = dependency.integrity.substring(0, dependency.integrity.indexOf("-"));
			hash = dependency.integrity.substring(dependency.integrity.indexOf("-")+1);
			
			try{
				var dataHash = crypto.createHash(algorithm)
				.update(data, "utf8")
				.digest("base64");
				
				if(dataHash != hash){
					next(new ConfigException({msg: "Could not verify the integrity of the dependency '" + dependency.name + "'. The checksum of the file did not match the checksum provided."}));
				}
				else {
					next(undefined);
				}
			}
			catch(err){
				next(err);
			}
		}
	}
	
	function writeConfig(next){
		var serverKey;
		try{
			serverKey = crypto.pbkdf2Sync(os.hostname(), __dirname, 100000, 512, "sha512").toString("hex");
		}
		catch(err){
			server.errorLog.fatal(err, function(){
				throw err;
			});
		}
		
		for(var i=0;i<config.dependencies.length;i++){
			config.dependencies[i].order = i;
		}
		
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
					next(writeErr);
					return;
				}
				
				fs.close(fd, next);
			});
		});
	}
	
	return cw;
});

module.exports = ConfigWizard;