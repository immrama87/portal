Wizard.userConfig = function(){
	$("#user-save").off("click touch");
	$("#user-save").on("click touch", function(evt){
		var user = {};
		user.fn = "Blueprint";
		user.ln = "Admin";
		user.username = "blueprint-admin";
		
		var pass = $("#password").val();
		var confirm = $("#password-confirm").val();
		
		if(pass == confirm){
			user.password = pass;
		}
		else {
			Blueprint.utils.Messaging.alert("The password values provided do not match.", true);
			return;
		}
		
		var email = $("#email").val();
		if(email != ""){
			user.email = email;
		}
		
		$.ajax({
			method:			"post",
			url:			"/rest/v1/config/wizard/create-user",
			data:			JSON.stringify(user),
			contentType:	"application/json"
		})
		.done(function(){
			Wizard.next();
		})
		.fail(function(xhr, status, err){
			Blueprint.utils.Messaging.alert("An error occurred creating the admin user.", true, err);
		});
	});
	
	$("#password-confirm").off("blur");
	$("#password-confirm").on("blur", function(evt){
		if($("#password-confirm").val() != $("#password").val()){
			Blueprint.utils.Messaging.setInputErrorMessage("Password values do not match.", "password-confirm");
		}
		else {
			Blueprint.utils.Messaging.clearInputErrorMessage("password-confirm");
		}
	});
}