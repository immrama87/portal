var fs = require("fs");
var path = require("path");

var HashRequire = (function(){
	var hr = {};
	
	var exposed_modules = {
		"config":	path.join(__dirname, "../../config/Config")
	};
	
	hr.execute = function(args){
		var directive = args[0].trim();
		var format = args[1].trim().toLowerCase();
		
		if(directive == null){
			throw new HashRequireException("Invalid call to HashRequire function called. A required directive (argument 1) must always be supplied.");
		}
		else if(format == null){
			throw new HashRequireException("Invalid call to HashRequire function called. A desired format (argument 2) must always be supplied.");
		}
		else {
			if(directive.indexOf(".") == -1){
				var pathname = path.join(__dirname, "../", format, "snippets", directive + "." + format);
				if(!fs.existsSync(pathname)){
					throw new HashRequireException("Could not find the file " + directive + " in the " + format + "/snippets directory. No such file exists.");
				}
				else {
					return fs.readFileSync(pathname, "utf8");
				}
			}
			else {
				var module = directive.split(".")[0];
				var fnc = directive.split(".")[1];
				
				if(!exposed_modules.hasOwnProperty(module.toLowerCase())){
					throw new HashRequireException("No module named " + module + " exists or has been made available for the HashRequire library.");
				}
				else {
					var module_real = require(exposed_modules[module.toLowerCase()]);
					if(!module_real.hasOwnProperty(fnc) || typeof module_real[fnc] != "function"){
						throw new HashRequireException("The module " + module + " does not contain a public method " + fnc + ".");
					}
					else {
						var file_name = module_real[fnc]();
						
						if(format == "css"){
							return "<link rel='stylesheet' type='text/css' href='/" + file_name + ".css'/>";
						}
						else if(format == "js"){
							return "<script type='application/javascript' src='/" + file_name + ".js'></script>";
						} 
						else {
							var pathname = path.join(__dirname, "../", format, file_name + "." + format);
							if(!fs.existsSync(pathname)){
								throw new HashRequireException("Could not find the file " + format + "/" + file_name + "." + format + ". No such file exists");
							}
							return fs.readFileSync(pathname, "utf8");
						}
					}	
				}
			}
		}
	}
	
	var HashRequireException = (function(msg){
		var hre = new Error(msg);
		
		return hre;
	});
	
	return hr;
});

module.exports = HashRequire;