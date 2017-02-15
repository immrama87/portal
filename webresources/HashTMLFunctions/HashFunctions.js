var HashFunctions = (function(parent){
	var hf = {};
	
	hf.require = require("./HashRequire")();
	hf.includeDependencies = require("./HashIncludeDependencies")();
	
	return hf;
});

module.exports = HashFunctions;