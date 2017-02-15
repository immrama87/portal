var AuthenticationService = (function(){
	var as = {};
	var directories = [];
	
	as.setDirectories = function(_dirs){
		for(var key in _dirs){
			directories.push(_dirs[key]);
		}
		sortDirectories();
	}
	
	as.addDirectory = function(dir){
		directories.push(dir);
		sortDirectories();
	}
	
	as.authenticateUser = function(user, pass, next){
		checkDirectory(0, user, pass, next);
	}
	
	function checkDirectory(index, user, pass, next, userExists){
		userExists = userExists || false;
		if(directories.length > index){
			directories[index].userExists(user, function(err, exists){
				if(err){
					server.errorLog.error(err);
					next(err);
				}
				else {
					if(exists){
						directories[index].authenticateUser(user, pass, function(err, valid){
							if(err){
								server.errorLog.error(err);
								checkDirectory(index+1, user, pass, next, exists);
							}
							else if(valid){
								if(directories[index].hasOwnProperty("setLastLogin")){
									directories[index].setLastLogin(user, next);
								}
								else {
									next();
								}
							}
							else {
								checkDirectory(index+1, user, pass, next, exists);
							}
						});
					}
					else {
						checkDirectory(index+1, user, pass, next, userExists);
					}
				}
			});
		}
		else {
			var msg;
			if(userExists){
				msg = "The password provided is not correct.";
			}
			else {
				msg = "No user with the provided username exists.";
			}
			
			next(undefined, msg);
		}
	}
	
	function sortDirectories(){
		directories.sort(function(a, b){
			if(a.hasOwnProperty("order") && b.hasOwnProperty("order")){
				var ao = parseInt(a.order);
				var bo = parseInt(b.order);
				
				if(ao < bo){
					return -1;
				}
				else if(ao > bo){
					return 1;
				}
				else {
					return 0;
				}
			}
			else if(a.hasOwnProperty("order")){
				return -1;
			}
			else if(b.hasOwnProperty("order")){
				return 1;
			}
			else {
				return 0;
			}
		});
	}
	
	return as;
});

module.exports = AuthenticationService;