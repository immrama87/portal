Wizard.serverUserConfig = function(){
	initializeServerForm("user");
}

Wizard.serverAdminConfig = function(){
	initializeServerForm("admin");
	
	$("#admin-same-as-user").on("change", function(evt){
		if($("#admin-same-as-user").is(":checked")){
			$("#admin-server-inputs").addClass("hide");
		}
		else {
			$("#admin-server-inputs").removeClass("hide");
		}
	});
}

Wizard.serverLicenseConfig = function(){
	$.ajax({
		method:		"get",
		url:		"/rest/v1/config/wizard/server-id",
		dataType:	"json"
	})
	.done(function(response){
		$("#server-id").text(response.serverId);
	})
	.fail(function(xhr, status, err){
		Blueprint.utils.Messaging.alert("Error retrieving Server ID.", true, err);
	});
	
	$("#server-license-save").off("click touch");
	$("#server-license-save").on("click touch", function(evt){
		if($("#server-license").val() == ""){
			Blueprint.utils.Messaging.alert("A license key is required to proceed.", true);
			return;
		}
		$.ajax({
			method:			"post",
			url:			"/rest/v1/config/wizard/license",
			data:			JSON.stringify({license: $("#server-license").val()}),
			contentType:	"application/json"
		})
		.done(function(){
			Wizard.next();
		})
		.fail(function(xhr, status, err){
			Blueprint.utils.Messaging.alert("Error saving server license key.", true, err);
		});
	});
}

function initializeServerForm(serverName){
	Blueprint.utils.FileUpload(serverName + "-https-cert");
	Blueprint.utils.FileUpload(serverName + "-https-key");
	$("#" + serverName + "-transport").on("change", function(evt){
		if($("#" + serverName + "-transport").val() == "https"){
			$("#" + serverName + "-https-options").removeClass("hide");
			$("#" + serverName + "-port").val(443);
		}
		else {
			$("#" + serverName + "-https-options").addClass("hide");
			$("#" + serverName + "-port").val(80);
		}
	});
	
	$("#" + serverName + "-https-options").find("i.fa-info-circle").off("click touch");
	$("#" + serverName + "-https-options").find("i.fa-info-circle").on("click touch", function(evt){
		var message = Blueprint.utils.Messaging.createInputInfoMessage(serverName + "-https-cert");
		
		if($(message).attr("is-open") == "true"){
			$(message).addClass("hide");
			$(message).attr("is-open", false);
		}
		else {
			$(message).removeClass("hide");
			$(message).html("<p><strong>Need help with SSL Certificates?</strong></p>");
			var span = document.createElement("span");
			$(span).text("First make sure that you have ");
			$(span).append("<a href='https://www.openssl.org/' target='_blank'>OpenSSL</a>");
			$(span).append(" installed. Then try the following steps:<br />");
			
			var ol = document.createElement("ol");
			var step1 = document.createElement("li");
			$(step1).text("Open a shell/Terminal or command prompt.");
			$(ol).append(step1);
			
			var step2 = document.createElement("li");
			$(step2).html("Navigate (<code>cd</code>) to the directory where Blueprint was installed.");
			$(ol).append(step2);
			
			var step3 = document.createElement("li");
			$(step3).html("Enter the command <code>ls</code> (for Linux/Unix/MacOS) or <code>dir</code> (for Windows).");
			$(ol).append(step3);
			
			var step4 = document.createElement("li");
			$(step4).text("If a directory called 'certs' exists, skip to step 6.");
			$(ol).append(step4);
			
			var step5 = document.createElement("li");
			$(step5).html("Enter the command <code>mkdir certs</code>.");
			$(ol).append(step5);
			
			var step6 = document.createElement("li");
			$(step6).html("Enter the command <code>cd certs</code>.");
			$(ol).append(step6);
			
			var step7 = document.createElement("li");
			$(step7).html("Enter the command <code>openssl req -x509 -sha256 -nodes -days 365 -newkey rsa:2048 -keyout private.key -out cert.crt</code>.");
			$(step7).append("<br /><em class='text-muted'>Note: This will create a self-signed certificate and will likely cause users to see certificate errors when accessing the page. This is not meant for use in a production environment.</em>");
			$(ol).append(step7);
			
			var step8 = document.createElement("li");
			$(step8).text("Fill out the questions provided by OpenSSL to generate the private key.");
			$(ol).append(step8);
			
			var step9 = document.createElement("li");
			$(step9).text("That's it! You're all set. Use private.key for the Key File field and cert.crt for the Certificate File field.");
			$(ol).append(step9);
			$(span).append(ol);
			
			$(message).append(span);
			$(message).attr("is-open", true);
		}
	});
	
	$("#" + serverName + "-server-save").off("click touch");
	$("#" + serverName + "-server-save").on("click touch", function(evt){
		var transport = $("#" + serverName + "-transport").val();
		if(transport == "https" && !window.FormData){
			Blueprint.utils.Messaging.alert("Your browser does not support modern file uploads. Please choose HTTP as a transport method and reconfigure using a different browser later.", true);
			return;
		}
		
		var data = new FormData();
		var missing = [];
		
		if(!$("#" + serverName + "-same-as-user").is(":checked")){
			data.append("transport", $("#" + serverName + "-transport").val());
			if(data.get("transport") == "https"){
				if(document.getElementById(serverName + "-https-cert").files.length == 0){
					missing.push("Certificate File");
				}
				else {
					data.append("cert", document.getElementById(serverName + "-https-cert").files[0]);
				}
				
				if(document.getElementById(serverName + "-https-key").files.length == 0){
					missing.push("Key File");
				}
				else {
					data.append("key", document.getElementById(serverName + "-https-key").files[0]);
				}
			}
			
			if($("#" + serverName + "-port").val() == ""){
				missing.push("Port");
			}
			else {
				data.append("port", $("#" + serverName + "-port").val());
			}
		}
		else {
			data.append("sameAsUserServer", "true");
		}
			
		if(missing.length > 0){
			Blueprint.utils.Messaging.alert("The following required fields do not have a value:\n" + missing.join("\n"), true);
		}
		else {
			$.ajax({
				method:			"post",
				url:			"/rest/v1/config/wizard/servers/" + serverName,
				data:			data,
				processData:	false,
				contentType:	false
			})
			.done(function(response){
				Wizard.next();
			})
			.fail(function(xhr, status, err){
				Blueprint.utils.Messaging.alert("Error occurred setting " + serverName + " server configuration.", true, err);
			});
		}
	});
}