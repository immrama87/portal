var multiparty = require("multiparty");

var Servers = (function(app, config, writeConfig, ConfigException){
	server.api.registerRoute(app, "config/server-config")
		.get(function(req, res){
			var response = {};
			
			for(var serverId in config.servers){
				response[serverId] = {};
				for(var key in config.servers[serverId]){
					if(key == "key" || key == "cert"){
						var newKey = "has" + key;
						response[serverId][newKey] = true;
					}
					else {
						response[serverId][key] = config.servers[serverId][key];
					}
				}
			}
			
			res.status(200).end(JSON.stringify(response));
		})
		.post(function(req, res){
			if(!config.hasOwnProperty("servers")){
				config.servers = {};
			}
			for(var serverId in req.body){
				if(!config.servers.hasOwnProperty(serverId)){
					config.servers[serverId] = {};
				}
				for(var key in req.body[serverId]){
					config.servers[serverId][key] = req.body[serverId][key];
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
		
	server.api.createParameter(app, "serverId");
	server.api.registerRoute(app, "config/server/:serverId/certs")
		.post(function(req, res){
			if(!config.hasOwnProperty("servers")){
				config.servers = {};
			}
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
					if(!config.servers.hasOwnProperty(req.serverId)){
						config.servers[req.serverId] = {};
					}
					config.servers[req.serverId].key = body.files.key;
					config.servers[req.serverId].cert = body.files.cert;
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
});

module.exports = Servers;