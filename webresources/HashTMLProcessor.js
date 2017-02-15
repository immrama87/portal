var HashTMLProcessor = (function(){
	var hp = {};
	
	var hashFunctions = require("./HashTMLFunctions/HashFunctions.js")();
	
	hp.process = function(text, next){
		while(text.indexOf("#{") > -1){
			var start = text.indexOf("#{");
			var end = text.indexOf("}", start) + 1;
			
			var command = text.substring(start + ("#{").length, end - 1);
			if(command.indexOf("(") > -1){
				var fnc = command.substring(0, command.indexOf("("));
				var re = /\,(?![^\[]*\])/g;
				var argString = command.substring(command.indexOf("(") + 1, command.indexOf(")", command.indexOf(")")));
				var argArray = argString.split(re);
				var args = {};
				for(var i=0;i<argArray.length;i++){
					if(argArray[i].indexOf("=") > -1){
						var key = argArray[i].substring(0, argArray[i].indexOf("=")).trim();
						var val = argArray[i].substring(argArray[i].indexOf("=") + 1).trim();
						if(val.indexOf("[") > -1){
							var arr = val.substring(val.indexOf("[") + 1, val.indexOf("]", val.indexOf("[") + 1)).split(",");
							for(var j=0;j<arr.length;j++){
								arr[j] = arr[j].trim();
							}
							
							val = arr;
						}
						args[key] = val;
					}
					else {
						args[argArray[i]] = true;
					}
				}
				var replace = "";
				if(hashFunctions.hasOwnProperty(fnc)){
					try{
						replace = hashFunctions[fnc].execute(args);
					}
					catch(err){
						next(err);
						return;
					}
				}
			}
			
			text = text.substring(0, start) + replace + text.substring(end);
		}
		
		next(undefined, text);
	}
	
	return hp;
});

module.exports = HashTMLProcessor();