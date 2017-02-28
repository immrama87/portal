var fs = require("fs");
var path = require("path");
var sass = require("node-sass");

var WebServer = (function(){
	var ws = {};
	var hashTMLProcessor = require("./HashTMLProcessor");
	
	ws.serveError = function(errorCode, err, res){
		if(!res){
			res = errorCode;
		}
		
		switch(errorCode){
			case 401:
				serve401(res);
				break;
			case 404:
				serve404(res);
				break;
			default:
				serve500(res, err);
				break;
		}
	}
	
	ws.setupRoutes = function(exp){
		exp.get("/**.html", function(req, res){
			var filePath = path.join(__dirname, "html", req.url);
			if(req.url.indexOf("/modals") == 0){
				var modalStart = req.url.indexOf("/", 1) + 1;
				var modalEnd = req.url.indexOf("/", modalStart);
				var modal = req.url.substring(modalStart, modalEnd);
				filePath = path.join(__dirname, "modals", modal, "html", req.url.substring(req.url.lastIndexOf("/") + 1));
			}
			
			res.setHeader("Content-Type", "text/html; charset=utf8");
			res.status(200);
			if(!fs.existsSync(filePath)){
				serve404(res);
			}
			else {
				serveFile(filePath, res);
			}
		});
		exp.get("/**.css", function(req, res){
			var filePath = path.join(__dirname, "css", req.url);
			if(req.url.indexOf("/modals") == 0){
				var modalStart = req.url.indexOf("/", 1) + 1;
				var modalEnd = req.url.indexOf("/", modalStart);
				var modal = req.url.substring(modalStart, modalEnd);
				filePath = path.join(__dirname, "modals", modal, "css", req.url.substring(req.url.lastIndexOf("/") + 1));
			}
			
			res.setHeader("Content-Type", "text/css; charset=utf8");
			res.status(200);
			if(!fs.existsSync(filePath)){
				serve404(res);
			}
			else {
				serveFile(filePath, res);
			}
		});
		exp.get("/**.scss", function(req, res){
			var filePath = path.join(__dirname, "css", req.url);
			if(req.url.indexOf("/modals") == 0){
				var modalStart = req.url.indexOf("/", 1) + 1;
				var modalEnd = req.url.indexOf("/", modalStart);
				var modal = req.url.substring(modalStart, modalEnd);
				filePath = path.join(__dirname, "modals", modal, "css", req.url.substring(req.url.lastIndexOf("/") + 1));
			}
			
			res.setHeader("Content-Type", "text/css; charset=utf8");
			res.status(200);
			if(!fs.existsSync(filePath)){
				serve404(res);
			}
			else {
				sass.render({
					file:			filePath,
					includePaths:	[path.join(__dirname, "css", "base")]
				}, function(err, result){
					if(err){
						exp.serveError(500, err, res);
					}
					else {
						var css = result.css.toString();
						res.setHeader("Content-Length", css.length);
						res.end(css, "utf8");
					}
				});
			}
		});
		exp.get("/**.js", function(req, res){
			var filePath = path.join(__dirname, "js", req.url);
			if(req.url.indexOf("/modals") == 0){
				var modalStart = req.url.indexOf("/", 1) + 1;
				var modalEnd = req.url.indexOf("/", modalStart);
				var modal = req.url.substring(modalStart, modalEnd);
				var fileStart = req.url.lastIndexOf("/");
				var fileEnd = req.url.indexOf("?", fileStart);
				if(fileEnd == -1){
					fileEnd = req.url.length;
				}
				var fileName = req.url.substring(fileStart, fileEnd);
				filePath = path.join(__dirname, "modals", modal, "js", fileName);
			}
			else if(req.url.indexOf("?") > -1){
				filePath = path.join(__dirname, "js", req.url.substring(0, req.url.indexOf("?")));
			}
			
			res.setHeader("Content-Type", "application/javascript; charset=utf8");
			res.status(200);
			if(!fs.existsSync(filePath)){
				serve404(res);
			}
			else {
				serveFile(filePath, res);
			}
		});
		exp.get(["/**.png", "/**.jpg", "/**.jpeg", "/**.gif"], function(req, res){
			var filePath = path.join(__dirname, "images", req.url);
			
			if(req.url.substring(req.url.lastIndexOf(".")) == ".png"){
				res.setHeader("Content-Type", "image/png; charset=binary");
			}
			else if(req.url.substring(req.url.lastIndexOf(".")) == ".jpg" || req.url.substring(req.url.lastIndexOf(".")) == "jpeg"){
				res.setHeader("Content-Type", "image/jpeg; charset=binary");
			}
			else if(req.url.substring(req.url.lastIndexOf(".")) == ".gif"){
				res.setHeader("Content-Type", "image/gif; charset=binary");
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
	
	function serve401(res){
		res.status(401);
		res.setHeader("Content-Type", "text/html; charset=utf8");
		
		serveFile(path.join(__dirname, "html", "/errors/401.html"), res, "utf8");
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
		
		if(res.req.url.indexOf(".html") > -1){
			serveFile(path.join(__dirname, "html", "/errors/500.html"), res, "utf8");
		}
		else {
			res.end(err.message);
		}
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