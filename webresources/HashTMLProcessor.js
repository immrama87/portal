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
				var args = command.substring(command.indexOf("(") + 1, command.indexOf(")", command.indexOf(")"))).split(",");
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