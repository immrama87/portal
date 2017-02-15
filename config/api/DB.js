var fs = require("fs");
var path = require("path");

var DB = (function(app, config, writeConfig, ConfigException){
	server.api.registerRoute(app, "config/db/drivers")
		.get(function(req, res){
			var configDriver = "";
			if(config.hasOwnProperty("db")){
				configDriver = config.db.driver;
			}
			var pathname = path.join(__dirname, "../../", "drivers/db");
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
		
	server.api.registerRoute(app, "config/db/setup")
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
});

module.exports = DB;