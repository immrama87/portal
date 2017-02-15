var fs = require("fs");
var path = require("path");
var cf = require(path.join(__dirname, "../../config", "Config"));

var HashIncludeDependencies = (function(){
	var hid = {};
	
	var config;
	
	function getConfig(){
		if(fs.existsSync(path.join(__dirname, "../../config", "config.conf"))){
			fs.watch(path.join(__dirname, "../../config", "config.conf"), function(curr, prev){
				getConfig();
			});
			
			cf.getConfig(function(err, c){
				if(err){
					if(server.errorLog){
						server.errorLog.fatal(err, function(){
							throw err;
						});
					}
					else {
						throw err;
					}
				}
				else {
					config = c;
				}
			});
		}
	}
	
	hid.execute = function(args){
		var dependencies = {};
		dependencies.css = [];
		dependencies.js = [];
		
		var validations = {};
		validations.css = [];
		validations.js = [];
		
		for(var i=0;i<config.dependencies.length;i++){
			if((args.exclude == undefined || args.exclude.indexOf(config.dependencies[i].name) == -1) &&
				(args.include == undefined || args.include.indexOf(config.dependencies[i].name) > -1)){
				var dependency = "";
				var validation = "";
				if(config.dependencies[i].type == "css"){
					dependency = "<link rel=\"stylesheet\" type=\"text/css\" href=\"" + config.dependencies[i].url + "\" integrity=\"" + config.dependencies[i].integrity + "\" crossorigin=\"anonymous\"/>";
					validation = "Blueprint.verifyResource(\"css\", \"" + config.dependencies[i].url + "\", \"/dependencies/" + config.dependencies[i].filename + "\");";
				}
				else if(config.dependencies[i].type == "js"){
					dependency = "<script src=\"" + config.dependencies[i].url + "\" integrity=\"" + config.dependencies[i].integrity + "\" crossorigin=\"anonymous\"></script>";
					validation = "Blueprint.verifyResource(\"js\", " + config.dependencies[i].validation + ", \"/dependencies/" + config.dependencies[i].filename + "\");";
				}
				
				if(dependencies.hasOwnProperty(config.dependencies[i].type)){
					dependencies[config.dependencies[i].type].push(dependency);
					validations[config.dependencies[i].type].push(validation);
				}
			}
		}
		
		var response = "<!--Begin Stylesheet Dependencies-->\n\t" + 
			dependencies.css.join("\n\t") + 
			"\n\t<!--End Stylesheet Dependencies-->\n" +
			"\n\t<!--Begin Javascript Dependencies-->\n" + 
			dependencies.js.join("\n") + 
			"\n\t<!--End Javascript Dependencies-->\n\t";
			
		response += "<script type=\"application/javascript\" src=\"/main/app.js\"></script>\n\t";
		response += "<script type=\"application/javascript\">" +
			validations.css.join("") +
			validations.js.join("") +
			"</script>";
			
		return response;
	}
	
	getConfig();
	
	return hid;
});

module.exports = HashIncludeDependencies;