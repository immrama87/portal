Blueprint.onready(function(){
	Blueprint.modules.loadModules("/admin/modules");
	
	$.ajax({
		method:		"get",
		url:		"/rest/v1/admin/portals",
		dataType:	"json"
	})
	.done(function(response){
		for(var i=0;i<response.length;i++){
			response[i].baseRoute = "/admin/portals",
			response[i].hasJs = true;
			response[i].hasScss = true;
			response[i].extendedData = [response[i].portal_id];
			response[i].title = response[i].name + " Administration";
		}
		response.push({
			name: 		"Add New Portal",
			id: 		"new-portal",
			baseRoute:	"/admin/portals",
			hasJs:		true,
			hasScss:	true
		});
		
		Blueprint.modules.addSubmodules("Portals", response);
	});
	
	$.ajax({
		method:		"get",
		url:		"/rest/v1/admin/color-schemes",
		dataType:	"json"
	})
	.done(function(response){
		for(var i=0;i<response.length;i++){
			response[i].baseRoute = "/admin/color-schemes";
			response[i].hasJs = true;
			response[i].hasScss = true;
			response[i].extendedData = [response[i].scheme_id];
			response[i].title = response[i].name + " Scheme Configuration";
		}
		response.push({
			name:		"Add New Color Scheme",
			baseRoute:	"/admin/color-schemes",
			hasJs:		true,
			hasScss:	true
		});
		
		Blueprint.modules.addSubmodules("Color Schemes", response);
	});
	
	$("#logged-in-user-info").find("span.user-full-name").text(Blueprint.LoggedInUser.getName());
});