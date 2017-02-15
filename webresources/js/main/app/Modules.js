define("app/Modules", [], function(){
	var m = {};
	var activeModule = {};
	
	m.loadModules = function(url){
		$.ajax({
			method:		"get",
			url:		url,
			dataType:	"json"
		})
		.done(function(response){
			generateSidebar(response);
			
			checkForActiveModule(response);
		})
		.fail(function(xhr, status, err){
			Blueprint.utils.Messaging.alert("Error retrieving application module configuration.", true, xhr.responseText);
		});
	}
	
	m.activeModule = function(){
		return activeModule;
	}
	
	function checkForActiveModule(modules){
		var module;
		for(var i=0;i<modules.length;i++){
			if(window.location.pathname.indexOf(modules[i].baseRoute) == 0){
				clickSidebarLink(modules[i], "#sidebar", document.getElementById(modules[i].name.replace(/\s/g, "_")));
				module = modules[i];
			}
			
			if(modules[i].hasOwnProperty("submodules")){
				for(var j=0;j<modules[i].submodules.length;j++){
					if(window.location.pathname.indexOf(modules[i].submodules[j].baseRoute) == 0){
						clickSidebarLink(modules[i], "#sidebar", document.getElementById(modules[i].name.replace(/\s/g, "_")));
						clickSidebarLink(modules[i].submodules[j], "#sub-sidebar", document.getElementById(modules[i].submodules[j].name.replace(/\s/g, "_")));
						module = modules[i].submodules[j];
						break;
					}
				}
			}
			
			if(module != undefined){
				var extendedData = window.location.pathname.substring(module.baseRoute.length + 1);
				if(extendedData != ""){
					activeModule.data = extendedData.split("/");
				}
				break;
			}
		}
	}
	
	function generateSidebar(modules){
		for(var i=0;i<modules.length;i++){
			$("#sidebar").append(generateSidebarLink(modules[i]));
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
			if(activeModule.hasOwnProperty("destroy")){
				activeModule.destroy(function(){
					loadModule(module);
				});
			}
			else {
				loadModule(module);
			}
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
		activeModule = {};
		
		$(document.head).find("#module-script").remove();
		$(document.head).find("#module-style").remove();
		var route = module.baseRoute;
		if(route != baseRoute){
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
				$(overlay).remove();
				if(activeModule.hasOwnProperty("setData") && activeModule.hasOwnProperty("data")){
					activeModule.setData(activeModule.data);
				}
			}
			$.ajax({
				method:		"get",
				url:		route + ".html",
				dataType:	"html"
			})
			.done(function(response){
				baseRoute = route;
				$("#frame").html(response);
				
				if(module.hasJs){
					var script = document.createElement("script");
					script.type = "application/javascript";
					script.src = route + ".js";
					script.id = "module-script";
					document.head.appendChild(script);
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
	}
	
	return m;
});