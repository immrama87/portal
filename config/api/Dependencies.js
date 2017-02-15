var fs = require("fs");
var path = require("path");
var crypto = require("crypto");
var http = require("http");
var https = require("https");

var Dependencies = (function(app, config, writeConfig, ConfigException){
	server.api.registerRoute(app, "/config/dependencies")
		.get(function(req, res){
			var dependencies = config.dependencies || [];
			var collectionResourceResponse = new server.utils.CollectionResourceResponse(dependencies, function(item,next){
				var itemData = {};
				var filepath = path.join(__dirname, "../", "webresources", item.type, "dependencies", item.filename);
				if(!fs.existsSync(filepath)){
					itemData.file = false;
				}
				else {
					itemData.file = true;
				}
				var integrityAlg = item.integrity.substring(0, item.integrity.indexOf("-"));
				var fileHash = item.integrity.substring(item.integrity.indexOf("-")+1);
				
				makeHttpRequest(item.url, "GET", function(reqErr, data){
					if(reqErr){
						itemData.urlFound = false;
						next(undefined, itemData);
					}
					else {
						itemData.urlFound = true;
						var reqHash = crypto.createHash(integrityAlg)
							.update(data, "utf8")
							.digest("base64");
						
						itemData.updated = (fileHash != reqHash);
						next(undefined, itemData);
					}
				});
			})
			.oncomplete(function(data){
				var response = [];
				for(var i in data){
					var dependency = {};
					dependency = config.dependencies[i];
					dependency.data = data[i];
					
					response.push(dependency);
				}
				res.status(200).end(JSON.stringify(response));
			})
			.onfail(function(err){
				app.serveError(500, err, res);
			})
			.process();
		})
		.post(function(req, res){
			if(!config.hasOwnProperty("dependencies")){
				config.dependencies = [];
			}
			
			var dependency = {};
			dependency.name = req.body.name;
			dependency.filename = req.body.name.toLowerCase().replace(/\s/g, "_") + "." + req.body.type;
			dependency.type = req.body.type;
			dependency.url = req.body.url;
			dependency.system = false;
			
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
												writeConfig(function(configErr){
													if(configErr){
														app.serveError(500, configErr, res);
													}
													else {
														res.status(200).end();
													}
												});
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
		
	server.api.createParameter(app, "dependency");
	server.api.registerRoute(app, "/config/dependencies/:dependency")
		.put(function(req, res){
			for(var i=0;i<config.dependencies.length;i++){
				if(config.dependencies[i].name == req.dependency){
					config.dependencies[i].url = req.body.url || config.dependencies[i].url;
					config.dependencies[i].integrity = req.body.integrity || config.dependencies[i].integrity;
					config.dependencies[i].validation = req.body.validation || config.dependencies[i].validation;
					if(config.dependencies[i].order != req.body.order && req.body.order != undefined){
						config.dependencies[req.body.order - 1].order = i+1;
						config.dependencies[i].order = req.body.order;
					}
					break;
				}
			}
			
			config.dependencies.sort(function(a, b){
				if(a.type == "js" && b.type == "css"){
					return 1;
				}
				else if(a.type == "css" && b.type == "js"){
					return -1;
				}
				else {
					if(a.order > b.order){
						return 1;
					}
					else if(a.order < b.order){
						return -1;
					}
				}
			});
			
			for(var i=0;i<config.dependencies.length;i++){
				config.dependencies[i].order = i+1;
				config.dependencies[i].end = false;
				config.dependencies[i].start = false;
				if(i > 0){
					if(config.dependencies[i].system == false && config.dependencies[i-1].system == true){
						config.dependencies[i].start = true;
					}
					if(config.dependencies[i].type == "js" && config.dependencies[i-1].type == "css"){
						config.dependencies[i-1].end = true;
					}
				}
			}
			config.dependencies[config.dependencies.length-1].end = true;
			
			writeConfig(function(err){
				if(err){
					app.serveError(500, err, res);
				}
				else {
					res.status(200).end();
				}
			});
		})
		.delete(function(req, res){
			for(var i=0;i<config.dependencies.length;i++){
				if(config.dependencies[i].name == req.dependency){
					config.dependencies.splice(i, 1);
					break;
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
});

module.exports = Dependencies;