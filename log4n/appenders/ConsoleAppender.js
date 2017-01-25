var ConsoleAppender = (function(config){
	var ca = {};
	
	var parser = require("./PatternParser")(config.pattern);
	
	ca.append = function(data){
		console.log(parser.parse(data));
		return {complete: true};
	}
	
	return ca;
});

module.exports = ConsoleAppender;