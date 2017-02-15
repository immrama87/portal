var fs = require("fs");
var path = require("path");

var Directories = (function(app, config, writeConfig, ConfigException){
	server.api.registerRoute(app, "config/directories")
		.get(function(req, res){
			var response = {};
			if(config.hasOwnProperty("directories")){
				for(var dir in config.directories){
					response[dir] = {};
					for(var key in config.directories[dir]){
						if(key != "password" && key != "pass"){
							response[dir][key] = config.directories[dir][key];
						}
					}
				}
			}
			
			res.status(200).end(JSON.stringify(response));
		});
	
	server.api.registerRoute(app, "config/directories/drivers")
		.get(function(req, res){
			var pathname = path.join(__dirname, "../../", "drivers/directories");
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
		
	server.api.registerRoute(app, "config/directories/setup")
		.post(function(req, res){
			if(!config.hasOwnProperty("directories")){
				config.directories = {};
			}
			
			if(req.body.key != "Internal"){
				config.directories[req.body.key] = {};
				for(var key in req.body){
					if(key != "key"){
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
			}
			else {
				var exc = new ConfigException({msg: "Request to update directory could not be processed. The default Internal directory cannot be updated."});
				app.serveError(500, exc, res);
			}
		});
	
	server.api.createParameter(app, "directoryId", function(req, res, next){
		if(!config.hasOwnProperty("directories")){
			var exc = new ConfigException({msg: "Could not process request for directory '" + directoryId + "'. No directories have been initialized yet."});
			app.serveError(500, exc, res);
			return;
		}
		
		if(!config.directories.hasOwnProperty(req.directoryId)){
			var exc = new ConfigException({msg: "Could not process request for directory '" + directoryId + "'. No directory with this name exists."});
			app.serveError(500, exc, res);
			return;
		}
		
		next();
	});
	
	server.api.registerRoute(app, "config/directories/:directoryId")
		.delete(function(req, res){
			delete config.directories[req.directoryId];
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

module.exports = Directories;