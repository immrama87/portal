$(function(){
	initializeForms();
	
	$("#servers-submit").on("click touch", function(evt){
		evt.preventDefault();
		submitData();
	});
});

function initializeForms(){
	initializeUserForm();
	initializeAdminForm();
	
	$.ajax({
		method:		"get",
		url:		"/rest/v1/config/server-config",
		dataType:	"json"
	})
	.done(function(response){
		populateForms(response);
		Blueprint.modules.activeModule().ready();
	})
	.fail(function(xhr, status, err){
		Blueprint.utils.Messaging.alert("Error retrieving current server configuration.", true, err);
	});
}

function initializeUserForm(){
	Blueprint.utils.FileUpload("user-https-key");
	Blueprint.utils.FileUpload("user-https-cert");
	$("#user-transport").on("change", function(evt){
		var httpPort = 80;
		var httpsPort = 443;
		if($("#user-transport").val() == "https"){
			$("#user-https-key-group").removeClass("hide");
			$("#user-https-key-group").find("div.input-label").addClass("required");
			$("#user-https-cert-group").removeClass("hide");
			$("#user-https-cert-group").find("div.input-label").addClass("required");
			if($("#user-port").val() == "" || $("#users-port").val() == 80 ){
				$("#user-port").val(httpsPort);
			}
		}
		else {
			$("#user-https-key-group").addClass("hide");
			$("#user-https-key-group").find("div.input-label").removeClass("required");
			$("#user-https-cert-group").addClass("hide");
			$("#user-https-cert-group").find("div.input-label").removeClass("required");
			if($("#user-transport").val() == "http"){
				if($("#user-port").val() == "" || $("#user-port") == 443){
					$("#user-port").val(httpPort);
				}
			}
		}
	});
}

function initializeAdminForm(){
	Blueprint.utils.FileUpload("admin-https-key");
	Blueprint.utils.FileUpload("admin-https-cert");
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
	
	$("#admin-same-as-user").on("change", function(evt){
		if($("#admin-same-as-user").is(":checked")){
			$("#admin-server").find(".input-field, button").attr("disabled", true);
			$("#admin-server").find("div.input-group").each(function(index, el){
				if($(el).find("#admin-same-as-user").length == 0){
					$(el).addClass("hide");
				}
			});
		}
		else {
			$("#admin-server").find(".input-field, button").removeAttr("disabled");
			$("#admin-server").find("div.input-group").each(function(index, el){
				$(el).removeClass("hide");
			});
			
			$("#admin-transport").change();
		}
	});
}

function populateForms(config){
	var sameAsUser = true;
	for(var prop in config.user){
		if(!(config.user[prop] == config.admin[prop])){
			sameAsUser = false;
			break;
		}
	}
	
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
	
	$("#user-transport").change();
	if(config.user.haskey){
		$("#user-https-key-group").find("div.input-label").removeClass("required");
	}
	if(config.user.hascert){
		$("#user-https-cert-group").find("div.input-label").removeClass("required");
	}
	
	if(sameAsUser){
		$("#admin-same-as-user").attr("checked", true).change();
	}
}

function submitData(){
	var data = {};
	data.admin = {};
	data.user = {};
	var sameAsUser = false;
	
	$("#user-server").find("*.input-field").each(function(index, el){
		var key = el.id.substring(("user-").length);
		if($(el).val() != "" && el.type != "file"){
			data.user[key] = $(el).val();
		}
	});
	
	if($("#admin-same-as-user").is(":checked")){
		sameAsUser = true;
		data.admin = data.user;
	}
	else {
		$("#admin-server").find("*.input-field").each(function(index, el){
			var key = el.id.substring(("admin-").length);
			if($(el).val() != "" && el.type != "file"){
				data.admin[key] = $(el).val();
			}
		});
	}
	
	if(data.user.transport == "https"){
		submitUserKeys(function(err){
			if(err){
				Blueprint.utils.Messaging.alert("Error uploading User server certificate and key files.", true, err);
			}
			else {
				if(data.admin.transport == "https" || sameAsUser){
					submitAdminKeys(sameAsUser, function(userKeyErr){
						if(err){
							Blueprint.utils.Messaging.alert("Error uploading Admin server certificate and key files.", true, err);
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
		if(data.admin.transport == "https"){
			submitAdminKeys(sameAsUser, function(userKeyErr){
				if(err){
					Blueprint.utils.Messaging.alert("Error uploading Admin server certificate and key files.", true, err);
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

function submitUserKeys(next){
	if(!window.FormData){
		next("Your browser does not support modern file upload. Please try again using a different browser.");
		return;
	}
	var formData = new FormData();
	var changed = false;
	if($("#user-https-cert-group").find("div.input-label").hasClass("required") || document.getElementById("user-https-cert").files.length > 0){
		formData.append("cert", document.getElementById("user-https-cert").files[0]);
		changed = true;
	}
	if($("#user-https-key-group").find("div.input-label").hasClass("required") || document.getElementById("user-https-key").files.length > 0){
		formData.append("key", document.getElementById("user-https-key").files[0]);
		changed = true;
	}
	
	if(changed){
		$.ajax({
			method:			"post",
			url:			"/rest/v1/config/server/user/certs",
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
	else {
		next();
	}
}

function submitAdminKeys(sameAsUser, next){
	if(!window.FormData){
		next("Your browser does not support modern file upload. Please try again using a different browser.");
		return;
	}
	var formData = new FormData();
	var changed = false;
	if(!sameAsUser){
		if($("#admin-https-cert-group").find("div.label").hasClass("required") || document.getElementById("admin-https-cert").files.length > 0){
			formData.append("cert", document.getElementById("admin-https-cert").files[0]);
			changed = true;
		}
		if($("#admin-https-key-group").find("div.label").hasClass("required") || document.getElementById("admin-https-key").files.length > 0){
			formData.append("key", document.getElementById("admin-https-key").files[0]);
			changed = true;
		}
	}
	else {
		if($("#user-https-cert-group").find("div.label").hasClass("required") || document.getElementById("user-https-cert").files.length > 0){
			formData.append("cert", document.getElementById("user-https-cert").files[0]);
			changed = true;
		}
		if($("#user-https-key-group").find("div.label").hasClass("required") || document.getElementById("user-https-key").files.length > 0){
			formData.append("key", document.getElementById("user-https-key").files[0]);
			changed = true;
		}
	}
	
	if(changed){
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
	else {
		next();
	}
}

function submitConfig(data){
	$.ajax({
		method:			"post",
		url:			"/rest/v1/config/server-config",
		data:			JSON.stringify(data),
		contentType:	"application/json"
	})
	.done(function(response){
		Blueprint.utils.Messaging.alert("Server configuration successfully updated.");
	})
	.fail(function(xhr, status, err){
		Blueprint.utils.Messaging.alert("Error updating server configuration.", true, err);
	});
}

