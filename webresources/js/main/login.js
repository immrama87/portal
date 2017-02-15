Blueprint.onready(function(){
	$("#login-btn").on("click touch", function(evt){
		var data = {};
		$("*.input-field").each(function(index, el){
			if(el.id != undefined){
				data[el.id] = $(el).val();
			}
		});
		
		if(data.username == ""){
			Blueprint.utils.Messaging.alert("Please provide a username to continue.", true);
			return;
		}
		if(data.password == ""){
			Blueprint.utils.Messaging.alert("Please provide a password to continue.", true);
			return;
		}
		
		$.ajax({
			method:			"post",
			url:			"/login",
			data:			JSON.stringify(data),
			contentType:	"application/json"
		})
		.done(function(){
			window.location.reload();
		})
		.fail(function(xhr, status, err){
			$("#errors").removeClass("hide");
			$("#errorText").text(xhr.responseText);
		});
	});
	
	$("*.input-field").on("keyup", function(evt){
		if(evt.keyCode == 13){
			$("#login-btn").click();
		}
	});
	
	$("#username").focus();
});