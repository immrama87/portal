define("app/LoggedInUser", [], function(){
	var lu = {};
	
	var userObj;
	var profileUrl;
	$.ajax({
		method:		"get",
		url:		"/loggedInUser",
		dataType:	"json",
		async:		false
	})
	.done(function(response){
		userObj = response;
	})
	.fail(function(xhr, status, err){
		Blueprint.utils.Messaging.alert("Error retrieving logged in user info.", true, xhr.responseText);
	});
	
	lu.getName = function(){
		return userObj.fn + " " + userObj.ln;
	}
	
	lu.getUsername = function(){
		
	}
	
	lu.isMemberOf = function(groupName){
	
	}
	
	lu.setProfileUrl = function(url){
		profileUrl = url + ((url.charAt(url.length - 1) == "/") ? "" : "/") + userObj.username;
	}
	
	lu.getProfileUrl = function(){
		return profileUrl;
	}
	
	return lu;
});