define("app/Modules", [], function(){
	var m = {};
	var modules = [];
	var activeModule = {};
	var baseRoute = "";
	var baseExtendedData = [];
	var titleBase = "Column Blueprint";
	
	m.loadModules = function(url){
		$.ajax({
			method:		"get",
			url:		url,
			dataType:	"json"
		})
		.done(function(response){
			modules = response;
			generateSidebar();
			
			checkForActiveModule();
		})
		.fail(function(xhr, status, err){
			Blueprint.utils.Messaging.alert("Error retrieving application module configuration.", true, xhr.responseText);
		});
	}
	
	m.activeModule = function(){
		return activeModule;
	}
	
	m.setTitleBase = function(_titleBase){
		titleBase = _titleBase;
	}
	
	m.addSubmodules = function(parentName, submodules){
		for(var i=0;i<modules.length;i++){
			if(modules[i].name == parentName){
				if(!modules[i].hasOwnProperty("submodules")){
					modules[i].submodules = [];
				}
				
				modules[i].submodules = modules[i].submodules.concat(submodules);
				break;
			}
		}
		
		generateSidebar();
		if(Object.keys(activeModule).length == 0){
			checkForActiveModule();
		}
	}
	
	m.triggerModule = function(urlPath){
		checkForActiveModule(urlPath);
	}
	
	function checkForActiveModule(urlPath){
		urlPath = urlPath || window.location.pathname;
		var module;
		for(var i=0;i<modules.length;i++){
			if(urlPath.indexOf(modules[i].baseRoute) == 0){
				clickSidebarLink(modules[i], "#sidebar", document.getElementById(modules[i].name.replace(/\s/g, "_")));
				module = modules[i];
			}
			
			if(modules[i].hasOwnProperty("submodules")){
				for(var j=0;j<modules[i].submodules.length;j++){
					if(urlPath.indexOf(modules[i].submodules[j].baseRoute) == 0){
						var extendedData = urlPath.substring(modules[i].submodules[j].baseRoute.length + 1);
						if(extendedData == ""){
							extendedData = undefined;
						} 
						else {
							extendedData = extendedData.split("/");
						}
						
						
						if(!Blueprint.utils.ArrayCompare.compare(extendedData, modules[i].submodules[j].extendedData)){
							continue;
						}
						
						clickSidebarLink(modules[i], "#sidebar", document.getElementById(modules[i].name.replace(/\s/g, "_")));
						clickSidebarLink(modules[i].submodules[j], "#sub-sidebar", document.getElementById(modules[i].submodules[j].name.replace(/\s/g, "_")));
						module = modules[i].submodules[j];
						break;
					}
				}
			}
			
			if(module != undefined){
				var extendedData = urlPath.substring(module.baseRoute.length + 1);
				if(extendedData != ""){
					activeModule.data = extendedData.split("/");
				}
				break;
			}
		}
		
		if(module == undefined){
			$("#frame").html("");
			$("#sidebar").find(".selected").removeClass("selected");
			$("#sub-sidebar").addClass("hide");
			$(document.head).find("#module-script").remove();
			$(document.head).find("#module-style").remove();
		}
	}
	
	function generateSidebar(){
		$("#sidebar").html("");
		for(var i=0;i<modules.length;i++){
			if(!modules[i].hidden){
				$("#sidebar").append(generateSidebarLink(modules[i]));
			}
		}
	}

	function generateSidebarLink(module, parent){
		parent = parent || "#sidebar";
		var link = document.createElement("div");
		link.className = "link";
		link.id = module.name.replace(/\s/g, "_");
		
		var text = document.createElement("span");
		text.className = "text";
		$(text).text(module.name);
		$(link).append(text);
		
		$(link).on("click touch", function(evt){
			clickSidebarLink(module, parent, link);
		});
		
		return link;
	}

	function clickSidebarLink(module, parent, link){
		var route = module.baseRoute;
		var extendedData = module.extendedData || [];
		if(route != baseRoute || !Blueprint.utils.ArrayCompare.compare(extendedData, baseExtendedData)){
			if(activeModule.hasOwnProperty("destroy")){
				activeModule.destroy(function(){
					triggerSidebarLink(module, parent, link);
				});
			}
			else {
				triggerSidebarLink(module, parent, link);
			}
		}
	}
	
	function triggerSidebarLink(module, parent, link){
		$(parent).find("div.link.selected").removeClass("selected");
		$(link).addClass("selected");
		if(module.hasOwnProperty("submodules")){
			generateSubSidebar(module.submodules);
		}
		else {
			if(parent == "#sidebar"){
				$("#sub-sidebar").find("div.slide-button").addClass("hide");
			}
			$("#sub-sidebar").addClass("out");
			loadModule(module);
		}
	}

	function generateSubSidebar(submodules){
		$("#sub-sidebar").html("<div class='slide-button fa fa-bars'></div>");
		for(var i=0;i<submodules.length;i++){
			$("#sub-sidebar").append(generateSidebarLink(submodules[i], "#sub-sidebar"));
		}
		
		$("#sub-sidebar").find("div.slide-button").removeClass("hide");
		$("#sub-sidebar").removeClass("hide");
		$("#sub-sidebar").removeClass("out");
		
		$("#sub-sidebar").find("div.slide-button").off("click touch");
		$("#sub-sidebar").find("div.slide-button").on("click touch", function(evt){
			$("#sub-sidebar").toggleClass("out");
		});
	}

	function loadModule(module){
		var startTime = Date.now();
		activeModule = {};
		
		$(document.head).find("#module-script").remove();
		$(document.head).find("#module-style").remove();
		var route = module.baseRoute;
		var extendedData = module.extendedData || [];

		if(extendedData.length > 0){
			activeModule.data = extendedData;
		}
		var overlay = document.createElement("div");
		overlay.className = "module-overlay";
		$(overlay).css({
			"left": $("#sidebar").css("width"),
			"width": "calc(100% - " + $("#sidebar").css("width") + ")"
		});
		
		var loading = document.createElement("div");
		var img = document.createElement("img");
		img.src = "/loading.gif";
		$(loading).append(img);
		
		var span = document.createElement("span");
		$(span).text("Loading...");
		$(loading).append(span);
		$(overlay).append(loading);
		
		$("#content").append(overlay);
		
		activeModule.ready = function(){
			var endTime = Date.now();
			if(endTime - startTime < 500){
				window.setTimeout(function(){
					activeModule.ready();
				}, 500 - (endTime - startTime));
			}
			else {
				$("div.module-overlay").remove();
				
				var urlPath = module.baseRoute;
				if(activeModule.hasOwnProperty("data")){
					for(var i=0;i<activeModule.data.length;i++){
						urlPath += "/" + activeModule.data[i];
					}
					
					if(activeModule.hasOwnProperty("setData")){
						activeModule.setData(activeModule.data);
					}
				}
				else if(module.requiresData){
					Blueprint.utils.Messaging.alert("Could not complete request. The module requested requires data to be provided.", true);
					window.history.back();
					return;
				}
				addHistoryState(module, urlPath);
			}
		}
		$.ajax({
			method:		"get",
			url:		route + ".html",
			dataType:	"html"
		})
		.done(function(response){
			baseRoute = route;
			baseExtendedData = extendedData;
			$("#frame").html(response);
			
			if(module.hasJs){
				var script = document.createElement("script");
				script.type = "application/javascript";
				script.src = route + ".js";
				script.id = "module-script";
				document.head.appendChild(script);
			}
			else {
				activeModule.ready();
			}
			
			if(module.hasCss){
				var style = document.createElement("style");
				style.id = "module-style";
				style.type = "text/css";
				style.href = route + ".css";
				document.head.appendChild(style);
			}
			
			if(module.hasScss){
				$.ajax({
					method: 	"get",
					url:		route + ".scss",
					dataType:	"text",
					cache:		true
				})
				.done(function(styleResponse){
					var style = document.createElement("style");
					style.id = "module-style";
					$(style).html(styleResponse);
					
					document.head.appendChild(style);
				});
			}
		});
	}
	
	function addHistoryState(module, urlPath){
		if(module.hasOwnProperty("title")){
			document.title = titleBase + " || " + module.title;
		}
		else {
			document.title = titleBase + " || " + module.name;
		}
		
		window.history.pushState({"path": urlPath, "pageTitle": document.title}, "", urlPath);
	}
	
	window.onpopstate = function(evt){
		var urlPath = "";
		if(evt.state){
			urlPath = evt.state.path;
			checkForActiveModule(urlPath);
		}
		else {
			window.location.reload();
		}
	}
	
	return m;
});