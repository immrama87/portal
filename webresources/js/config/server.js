$(function(){
	initializeForms();
	
	$("#servers-submit").on("click touch", function(evt){
		evt.preventDefault();
		submitData();
	});
});

function initializeForms(){
	initializeAdminForm();
	initializeUserForm();
	
	$.ajax({
		method:		"get",
		url:		"/rest/v1/config/server-config",
		dataType:	"json"
	})
	.done(function(response){
		populateForms(response);
	})
	.fail(function(xhr, status, err){
		alert("Error retrieving current server configuration. Please check the system logs for more information.\nError message: " + err);
	});
}

function initializeAdminForm(){
	APP.utils.FileUpload("admin-https-key");
	APP.utils.FileUpload("admin-https-cert");
	$("#admin-transport").on("change", function(evt){
		var httpPort = 80;
		var httpsPort = 443;
		if(!$("#users-same-as-admin").is(":checked")){
			httpPort = 8080;
			httpsPort = 8443;
		}
		if($("#admin-transport").val() == "https"){
			$("#admin-https-key-group").removeClass("hide");
			$("#admin-https-key-group").find("div.input-label").addClass("required");
			$("#admin-https-cert-group").removeClass("hide");
			$("#admin-https-cert-group").find("div.input-label").addClass("required");
			if($("#admin-port").val() == "" || $("#admin-port").val() == 80 || $("#admin-port").val() == 8080){
				$("#admin-port").val(httpsPort);
			}
		}
		else {
			$("#admin-https-key-group").addClass("hide");
			$("#admin-https-key-group").find("div.input-label").removeClass("required");
			$("#admin-https-cert-group").addClass("hide");
			$("#admin-https-cert-group").find("div.input-label").removeClass("required");
			if($("#admin-port").val() == "" || $("#admin-port") == 443 || $("#admin-port").val() == 8443){
				$("#admin-port").val(httpPort);
			}
		}
	});
}

function initializeUserForm(){
	APP.utils.FileUpload("users-https-key");
	APP.utils.FileUpload("users-https-cert");
	$("#users-transport").on("change", function(evt){
		var httpPort = 80;
		var httpsPort = 443;
		if($("#users-transport").val() == "https"){
			$("#users-https-key-group").removeClass("hide");
			$("#users-https-key-group").find("div.input-label").addClass("required");
			$("#users-https-cert-group").removeClass("hide");
			$("#users-https-cert-group").find("div.input-label").addClass("required");
			if($("#users-port").val() == "" || $("#users-port").val() == 80 ){
				$("#users-port").val(httpsPort);
			}
		}
		else {
			$("#users-https-key-group").addClass("hide");
			$("#users-https-key-group").find("div.input-label").removeClass("required");
			$("#users-https-cert-group").addClass("hide");
			$("#users-https-cert-group").find("div.input-label").removeClass("required");
			if($("#users-transport").val() == "http"){
				if($("#users-port").val() == "" || $("#user-port") == 443){
					$("#users-port").val(httpPort);
				}
			}
		}
	});
	
	$("#users-same-as-admin").on("change", function(evt){
		if($("#users-same-as-admin").is(":checked")){
			$("#users-server").find(".input-field, button").attr("disabled", true);
			$("#users-server").find("div.input-group").each(function(index, el){
				if($(el).find("#users-same-as-admin").length == 0){
					$(el).addClass("hide");
				}
			});
		}
		else {
			$("#users-server").find(".input-field, button").removeAttr("disabled");
			$("#users-server").find("div.input-group").each(function(index, el){
				$(el).removeClass("hide");
			});
			
			$("#users-transport").change();
		}
	});
}

function populateForms(config){
	for(var serverId in config){
		for(var key in config[serverId]){
			$("#" + serverId + "-" + key).val(config[serverId][key]);
		}
	}
	
	$("#admin-transport").change();
	if(config.admin.haskey){
		$("#admin-https-key-group").find("div.input-label").removeClass("required");
	}
	if(config.admin.hascert){
		$("#admin-https-cert-group").find("div.input-label").removeClass("required");
	}
	
	$("#users-transport").change();
	if(config.users.haskey){
		$("#users-https-key-group").find("div.input-label").removeClass("required");
	}
	if(config.users.hascert){
		$("#users-https-cert-group").find("div.input-label").removeClass("required");
	}
	
	if(config.users.sameAsAdmin){
		$("#users-same-as-admin").attr("checked", true).change();
	}
}

function submitData(){
	var data = {};
	data.admin = {};
	data.users = {};
	
	$("#admin-server").find("*.input-field").each(function(index, el){
		var key = el.id.substring(("admin-").length);
		if($(el).val() != "" && el.type != "file"){
			data.admin[key] = $(el).val();
		}
	});
	
	if($("#users-same-as-admin").is(":checked")){
		data.users.sameAsAdmin = true;
	}
	else {
		$("#users-server").find("*.input-field").each(function(index, el){
			var key = el.id.substring(("users-").length);
			if($(el).val() != "" && el.type != "file"){
				data.users[key] = $(el).val();
			}
		});
	}
	
	if(data.admin.transport == "https"){
		submitAdminKeys(function(err){
			if(err){
				alert("Error uploading Admin server certificate and key files. Please check the system logs for more information.\nError message: " + err);
			}
			else {
				if(data.users.transport == "https" || data.users.sameAsAdmin){
					submitUserKeys(data.users.sameAsAdmin, function(userKeyErr){
						if(err){
							alert("Error uploading User server certificate and key files. Please check the system logs for more information.\nError message: " + err);
						}
						else {
							submitConfig(data);
						}
					});
				}
				else {
					submitConfig(data);
				}
			}
		});
	}
	else {
		if(data.users.transport == "https" || data.users.sameAsAdmin){
			submitUserKeys(data.users.sameAsAdmin, function(userKeyErr){
				if(err){
					alert("Error uploading User server certificate and key files. Please check the system logs for more information.\nError message: " + err);
				}
				else {
					submitConfig(data);
				}
			});
		}
		else {
			submitConfig(data);
		}
	}
}

function submitAdminKeys(next){
	if(!window.FormData){
		next("Your browser does not support modern file upload. Please try again using a different browser.");
		return;
	}
	var formData = new FormData();
	formData.append("cert", document.getElementById("admin-https-cert").files[0]);
	formData.append("key", document.getElementById("admin-https-key").files[0]);
	
	$.ajax({
		method:			"post",
		url:			"/rest/v1/config/server/admin/certs",
		data:			formData,
		processData:	false,
		contentType:	false
	})
	.done(function(response){
		next();
	})
	.fail(function(xhr, status, err){
		next(err);
	});
}

function submitUserKeys(sameAsAdmin, next){
	if(!window.FormData){
		next("Your browser does not support modern file upload. Please try again using a different browser.");
		return;
	}
	var formData = new FormData();
	if(!sameAsAdmin){
		formData.append("cert", document.getElementById("users-https-cert").files[0]);
		formData.append("key", document.getElementById("users-https-key").files[0]);
	}
	else {
		formData.append("cert", document.getElementById("admin-https-cert").files[0]);
		formData.append("key", document.getElementById("admin-https-key").files[0]);
	}
	
	$.ajax({
		method:			"post",
		url:			"/rest/v1/config/server/users/certs",
		data:			formData,
		processData:	false,
		contentType:	false
	})
	.done(function(response){
		next();
	})
	.fail(function(xhr, status, err){
		next(err);
	});
}

function submitConfig(data){
	if(data.users.sameAsAdmin){
		data.users = data.admin;
		data.users.sameAsAdmin = true;
	}
	
	$.ajax({
		method:			"post",
		url:			"/rest/v1/config/server-config",
		data:			JSON.stringify(data),
		contentType:	"application/json"
	})
	.done(function(response){
		alert("Server configuration successfully updated.");
	})
	.fail(function(xhr, status, err){
		alert("Error updating server configuration. Please check the system logs for more information.\nError message: " + err);
	});
}

