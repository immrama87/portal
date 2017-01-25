var Logger = (function(filePath){
	var lg = {};
	
	var appenders = [];
	var level = 0;
	var category = "";
	
	var levels = [
		"OFF",
		"FATAL",
		"ERROR",
		"WARN",
		"INFO",
		"DEBUG",
		"TRACE"
	];
	
	lg.addAppender = function(appender){
		appenders.push(appender);
	}
	
	lg.setLevel = function(level_str){
		if(levels.indexOf(level_str.toUpperCase()) > -1){
			level = levels.indexOf(level_str.toUpperCase());
		}
	}
	
	lg.setCategory = function(cat){
		category = cat;
	}
	
	lg.fatal = function(msg, next){
		if(level >= levels.indexOf("FATAL"), next){
			writeMessage(msg, levels.indexOf("FATAL"), next);
		}
	}
	
	lg.error = function(msg, next){
		if(level >= levels.indexOf("ERROR")){
			writeMessage(msg, levels.indexOf("ERROR"));
		}
	}
	
	lg.warn = function(msg, next){
		if(level >= levels.indexOf("WARN")){
			writeMessage(msg, levels.indexOf("WARN"));
		}
	}
	
	lg.info = function(msg, next){
		if(level >= levels.indexOf("INFO")){
			writeMessage(msg, levels.indexOf("INFO"));
		}
	}
	
	lg.debug = function(msg, next){
		if(level >= levels.indexOf("DEBUG")){
			writeMessage(msg, levels.indexOF("DEBUG"));
		}
	}
	
	lg.trace = function(msg, next){
		if(level >= levels.indexOf("TRACE")){
			writeMessage(msg, levels.indexOf("TRACE"));
		}
	}
	
	function writeMessage(msg, l, next){
		var data = {
			c:	category,
			d:	new Date().getTime(),
			m:	msg,
			p:	levels[l]
		}
		
		var status = [];
		for(var i=0;i<appenders.length;i++){
			status[i] = appenders[i].append(data);
			status[i].oncomplete = function(){
				for(var j=0;j<status.length;j++){
					if(!status[j].complete){
						console.log(j);
						return;
					}
					if(next && typeof next == "function"){
						next();
					}
				}
			}
		}
	}
	
	return lg;
});

module.exports = Logger;