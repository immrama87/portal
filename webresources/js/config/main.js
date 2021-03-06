var baseRoute = "";

Blueprint.onready(function(){
	Blueprint.modules.loadModules("/config/modules");
	Blueprint.LoggedInUser.setProfileUrl("/config/users");
	
	$("#logged-in-user-info").on("click touch", function(evt){
		evt.stopPropagation();
		$("#user-info-panel").toggleClass("hide");
		
		triggerUserPanelClose();
	});
	
	$("#user-profile").on("click touch", function(evt){
		window.location.href = Blueprint.LoggedInUser.getProfileUrl();
	});
	
	$("#logout").on("click touch", function(evt){
		$.ajax({
			method: "post",
			url:	"/logout"
		})
		.done(function(){
			window.location.reload();
		});
	});
	
	$("#logged-in-user-info").find("span.user-full-name").text(Blueprint.LoggedInUser.getName());
});

function triggerUserPanelClose(){
	$(document.body).off("click touch");
	$(document.body).one("click touch", function(evt){
		if($(evt.target).parents("#user-info-panel").length == 0
			&& !$("#user-info-panel").hasClass("hide")){
			$("#user-info-panel").addClass("hide");
		}
		else {
			triggerUserPanelClose();
		}
	});
}