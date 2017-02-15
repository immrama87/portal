$(function(){
	$.ajax({
		method:		"get",
		url:		"/rest/v1/config/license/server-id",
		dataType:	"json"
	})
	.done(function(response){
		$("#server-id").text(response.serverId);
		getLicenseDetails();
	});
	
	$("#license-submit").on("click touch", function(evt){
		evt.preventDefault();
		$.ajax({
			method:			"post",
			url:			"/rest/v1/config/license",
			data:			JSON.stringify({license: $("#license-key").val()}),
			contentType:	"application/json"
		})
		.done(function(){
			$("#license-key").val("");
			getLicenseDetails();
		})
		.fail(function(xhr, status, err){
			Blueprint.utils.Messaging.alert("Error updating license key.", true, err);
		});
	});
});

function getLicenseDetails(){
	$.ajax({
		method:		"get",
		url:		"/rest/v1/config/license",
		dataType:	"json"
	})
	.done(function(response){
		for(var key in response){
			var value = response[key];
			if(isNaN(parseInt(value.charAt(0)))){
				value = value.charAt(0).toUpperCase() + value.substring(1);
			}
			$("#license-" + key).text(value);
		}
		
		$("#license-status")[0].className = "detail-value " + response["status"];
	});
}