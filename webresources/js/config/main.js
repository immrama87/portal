var baseRoute = "";

$(function(){
	$.ajax({
		method:		"get",
		url:		"/rest/v1/config/modules",
		dataType:	"json"
	})
	.done(function(response){
		generateSidebar(response);
	})
	.fail(function(xhr, status, err){
	
	});
});

function generateSidebar(modules){
	for(var i=0;i<modules.length;i++){
		$("#sidebar").append(generateSidebarLink(modules[i]));
	}
}

function generateSidebarLink(module, parent){
	parent = parent || "#sidebar";
	var link = document.createElement("div");
	link.className = "link";
	
	var text = document.createElement("span");
	text.className = "text";
	$(text).text(module.name);
	$(link).append(text);
	
	$(link).on("click touch", function(evt){
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
	});
	
	return link;
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
	$(document.head).find("#module-script").remove();
	var route = module.baseRoute;
	if(route != baseRoute){
		$.ajax({
			method:		"get",
			url:		route + ".html",
			dataType:	"html"
		})
		.done(function(response){
			baseRoute = route;
			$("#frame").html(response);
			
			if(module.hasJs){
				$.ajax({
					method:		"get",
					url:		route + ".js",
					dataType:	"text",
					cache: 		true
				})
				.done(function(scriptResponse){
					var script = document.createElement("script");
					script.id = "module-script";
					$(script).html(scriptResponse);
					
					document.head.appendChild(script);
				});
			}
			
			if(module.hasCss){
				$.ajax({
					method:		"get",
					url:		route + ".css",
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