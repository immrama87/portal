Blueprint.onready(function(){
	Blueprint.modules.loadModules("/rest/v1/admin/modules");
	$("#logged-in-user-info").find("span.user-full-name").text(Blueprint.LoggedInUser.getName());
});