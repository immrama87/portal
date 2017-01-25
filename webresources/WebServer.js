var fs = require("fs");
var path = require("path");

var WebServer = (function(){
	var ws = {};
	var hashTMLProcessor = require("./HashTMLProcessor");
	
	ws.serveError = function(errorCode, err, res){
		switch(errorCode){
			case 404:
				serve404(res);
				break;
			default:
				serve500(res, err);
				break;
		}
	}
	
	ws.setupRoutes = function(app){
		app.get("/**.html", function(req, res){
			var filePath = path.join(__dirname, "html", req.url);
			
			res.setHeader("Content-Type", "text/html; charset=utf8");
			res.status(200);
			if(!fs.existsSync(filePath)){
				serve404(res);
			}
			else {
				serveFile(filePath, res);
			}
		});
		app.get("/**.hashtml", function(req, res){
			var filePath = path.join(__dirname, "html", req.url);
			
			res.setHeader("Content-Type", "text/html; charset=utf8");
			res.status(200);
			if(!fs.existsSync(filePath)){
				res.status(404);
				filePath = path.join(__dirname, "html", "/errors/404.html");
			}
		});
		app.get("/**.css", function(req, res){
			var filePath = path.join(__dirname, "css", req.url);
			
			res.setHeader("Content-Type", "text/css; charset=utf8");
			res.status(200);
			if(!fs.existsSync(filePath)){
				serve404(res);
			}
			else {
				serveFile(filePath, res);
			}
		});
		app.get("/**.js", function(req, res){
			var filePath = path.join(__dirname, "js", req.url);
			
			res.setHeader("Content-Type", "application/javascript; charset=utf8");
			res.status(200);
			if(!fs.existsSync(filePath)){
				serve404(res);
			}
			else {
				serveFile(filePath, res);
			}
		});
		app.get(["/**.png", "/**.jpg"], function(req, res){
			var filePath = path.join(__dirname, "images", req.url);
			
			if(req.url.substring(req.url.lastIndexOf(".")) == ".png"){
				res.setHeader("Content-Type", "image/png; charset=binary");
			}
			else if(req.url.substring(req.url.lastIndexOf(".")) == ".jpg"){
				res.setHeader("Content-Type", "image/jpeg; charset=binary");
			}
			res.status(200);
			if(!fs.existsSync(filePath)){
				serve404(res);
			}
			else {
				serveFile(filePath, res, "binary");
			}
		});
	}
	
	function serve404(res){
		res.status(404);
		res.setHeader("Content-Type", "text/html; charset=utf8");
		
		serveFile(path.join(__dirname, "html", "/errors/404.html"), res, "utf8");
	}
	
	function serve500(res, err){
		res.status(500);
		res.setHeader("Content-Type", "text/html; charset=utf8");
		server.errorLog.error(err);
		
		serveFile(path.join(__dirname, "html", "/errors/500.html"), res, "utf8");
	}
	
	function serveFile(path, res, encoding){
		if(!encoding){
			encoding = "utf8";
		}
		fs.readFile(path, encoding, function(err, data){
			if(err){}
			
			if(path.substring(path.lastIndexOf(".")) == ".html"){
				data = hashTMLProcessor.process(data, function(err, html){
					if(err){
						console.log(err);
					}
					else {
						res.setHeader("Content-Length", html.length);
						res.end(html, encoding);
					}
				});
			}
			else {
				res.setHeader("Content-Length", data.length);
				res.end(data, encoding);
			}
		});
	}
	
	return ws;
})();

module.exports = WebServer;