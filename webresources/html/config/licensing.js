$(function(){
	$.ajax({
		method:		"get",
		url:		"/rest/v1/config/license/server-id",
		dataType:	"json"
	});
});