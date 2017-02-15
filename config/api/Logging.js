var Logging = (function(app, ConfigException){	
	server.api.registerRoute(app, "config/loggers")
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
		
	server.api.createParameter(app, "loggerId");
	server.api.registerRoute(app, "config/loggers/:loggerId")
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
						var logger = LogManager.getLogger(req.loggerId);
						logger.setLevel(req.body.level);
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
		
	server.api.createParameter(app, "appenderId");
	server.api.registerRoute(app, "config/loggers/appenders/:appenderId")
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
		
	server.api.registerRoute(app, "config/loggers/files/:appenderId")
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
});

module.exports = Logging;