var fs = require("fs");
var path = require("path");
var Logger = require("./Logger");

var LogManager = (function(appRoot){
	var lm = {};
	
	var loggers = {};
	
	lm.init = function(next){
		var pathname = path.join(__dirname, "log4n.json");
		if(fs.existsSync(pathname)){
			fs.readFile(pathname, "utf8", function(err, file){
				if(err){
					console.log("Error enountered initializing log4n.\n" + err);
				}
				else {
					try{
						logConfig = JSON.parse(file);
						
						var appenders = {};
						
						for(var log in logConfig.logs){
							loggers[log] = new Logger();
							var logAppenders = logConfig.logs[log].appenders.split(", ");
							for(var i=0;i<logAppenders.length;i++){
								if(!appenders.hasOwnProperty(logAppenders[i])){
									if(logConfig.appenders.hasOwnProperty(logAppenders[i])){
										var appenderPath = path.join(__dirname, "appenders", logConfig.appenders[logAppenders[i]].appender);
										if(fs.existsSync(appenderPath + ".js")){
											logConfig.appenders[logAppenders[i]].appRoot = appRoot;
											appenders[logAppenders[i]] = require(appenderPath)(logConfig.appenders[logAppenders[i]]);
											loggers[log].addAppender(appenders[logAppenders[i]]);
										}
									}
								}
								else {
									loggers[log].addAppender(appenders[logAppenders[i]]);
								}
							}
							loggers[log].setLevel(logConfig.logs[log].level);
							loggers[log].setCategory(log);
						}
					}
					catch(err){
						console.log("Error encountered initializing log4n while parsing log4n.json.\n" + err.stack);
					}
				}
				
				next();
			});
		}
		else {
			console.log("Could not initialize log4n. No log4n.json file was found.");
			loggers.main = new Logger();
			loggers.main.addAppender(require("./appenders/ConsoleAppender")({pattern: "%m%n"}));
			
			next();
		}
	}
	
	lm.getLogger = function(name){
		if(loggers.hasOwnProperty(name)){
			return loggers[name];
		}
		else {
			return loggers.main;
		}
	}
	
	return lm;
});

module.exports = LogManager;