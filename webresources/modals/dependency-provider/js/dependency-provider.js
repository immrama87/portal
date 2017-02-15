(function(modal, data){
	$("#dependency-site").css({"width": "100%", "height": "90%"});
	
	$.ajax({
		method:	"get",
		url:	data.url
	})
	.done(function(response){
		console.log(response);
	})
});