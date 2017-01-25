var fs = require("fs");
var path = require("path");

var FileAppender = (function(config){
	var fa = {};
	
	var parser = require("./PatternParser")(config.pattern);
	var filePath = path.join(config.appRoot, config.file);
	
	if(!fs.existsSync(filePath)){
		var fileDir = filePath.substring(0, filePath.lastIndexOf("\\"));
		if(!fs.existsSync(fileDir)){
			fs.mkdirSync(fileDir);
		}
	}
	
	fa.append = function(data){
		var status = {
			complete: false
		};
		fs.open(filePath, 'a+', function(err, fd){
			if(err){
				console.log("Error appending to " + filePath + ".");
				throw err;
			}
			
			fs.write(fd, parser.parse(data), function(err, written, string){
				if(err){
					console.log("Error appending to " + filePath + ".");
					throw err;
				}
				fs.close(fd, function(err){
					if(err){
						console.log("Error appending to " + filePath + ".");
						throw err;
					}
					
					status.complete = true;
					if(status.hasOwnProperty("oncomplete") && typeof status.oncomplete == "function"){
						status.oncomplete();
					}
				});
			});
		});
		
		return status;
	}
	
	return fa;
});

module.exports = FileAppender;