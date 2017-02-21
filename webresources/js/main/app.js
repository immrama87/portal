window.Blueprint = (function(){
	var bp = {};
		
	var resources = [];
	var ready = [];
	function verifyResource(type, resource, fallback){
		switch(type){
			case "js":
				try{
					if(!resource){
						var script = document.createElement("script");
						script.type = "application/javascript";
						script.src = fallback;
						document.head.appendChild(script);
					}
				}
				catch(err){
					var script = document.createElement("script");
					script.type = "application/javascript";
					script.src = fallback;
					document.head.appendChild(script);
				}
				break;
			case "css":
				var found = false;
				for(var i=0;i<document.styleSheets.length;i++){
					if(document.styleSheets[i].href == resource){
						found = true;
						if(document.styleSheets[i].cssRules.length == 0){
							found = false;
						}
						break;
					}
				}
				
				if(!found){
					var link = document.createElement("link");
					link.type="stylesheet";
					link.href=fallback;
					document.head.appendChild(link);
				}
				
				break;
			default:
				break;
		}
	}
	
	function startup(){
		if(!window.requirejs){
			var script = document.createElement("script");
			script.type = "application/javascript";
			script.src = "/dependencies/requirejs.js";
			document.head.appendChild(script);
			script.onload = function(){
				startup();
			}
		}
		else {
			requirejs.config({
				baseUrl:	"/main"
			});
			requirejs(["utils/AdditiveList", "utils/FileUpload", "utils/Messaging", "utils/FormBuilder", "utils/Modals", "utils/ArrayCompare", "utils/Math", "utils/StringUtils", "utils/VersionManager"], 
				function(AdditiveList, FileUpload, Messaging, FormBuilder, Modals, ArrayCompare, MathUtils, StringUtils, VersionManager){
				bp.utils = {};
				bp.utils.AdditiveList = AdditiveList;
				bp.utils.FileUpload = FileUpload;
				bp.utils.Messaging = Messaging;
				bp.utils.FormBuilder = FormBuilder;
				bp.utils.Modals = Modals;
				bp.utils.ArrayCompare = ArrayCompare;
				bp.utils.Math = MathUtils;
				bp.utils.StringUtils = StringUtils;
				bp.utils.VersionManager = VersionManager;
			});
			
			if(!bp.isWizard){
				requirejs(["app/LoggedInUser", "app/Modules"],
					function(LoggedInUser, Modules){
					bp.LoggedInUser = LoggedInUser;
					bp.modules = Modules;
					triggerReady();
				});
			}
			else {
				triggerReady();
			}
		}
	}
	
	function triggerReady(){
		for(var i=0;i<ready.length;i++){
			ready[i]();
		}
	}
	
	bp.verifyResource = function(type, resource, fallback){
		resources.push({type: type, resource: resource, fallback: fallback});
	}
	
	bp.start = function(){
		for(var i=0;i<resources.length;i++){
			verifyResource(resources[i].type, resources[i].resource, resources[i].fallback);
		}
		
		startup();
	}
	
	bp.onready = function(fnc){
		if(typeof fnc == "function"){
			ready.push(fnc);
		}
	}
	
	return bp;
})();

window.onload = function(){
	window.Blueprint.start();
}

