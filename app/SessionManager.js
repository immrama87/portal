var cron = require("node-cron");

var SessionManager = (function(){
	var sm = {};
	var sessions = {};
	
	sm.createSession = function(username){
		for(var s in sessions){
			if(sessions[s].username == username){
				delete sessions[s];
			}
		}
		
		var s = new Session();
		s.setUser(username);
		var guid = createGUID();
		sessions[guid] = s;
		
		return guid;
	}
	
	sm.getSession = function(sessionId){
		if(sessions.hasOwnProperty(sessionId)){
			if(sessions[sessionId].isValid()){
				sessions[sessionId].updateExpiry();
				return sessions[sessionId];
			}
		}
		
		return null;
	}
	
	sm.destroySession = function(session){
		for(var s in sessions){
			if(sessions[s] == session){
				delete sessions[s];
				break;
			}
		}
	}
	
	sm.getSessions = function(){
		var response = [];
		for(var s in sessions){
			if(sessions[s].isValid()){
				response.push(sessions[s]);
			}
		}
		
		return response;
	}
	
	cron.schedule("* * * * *", function(){
		var cleanup = [];
		for(var s in sessions){
			if(!sessions[s].isValid()){
				cleanup.push(s);
			}
		}
		
		for(var i=0;i<cleanup.length;i++){
			delete sessions[cleanup[i]];
		}
	});
	
	function createGUID(){
		var index = 0;
		var template = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";
		while((index = template.indexOf("x")) > -1){
			template = template.substring(0, index) + (Math.floor(Math.random() * 16)).toString(16) + template.substring(index+1);
		}
		
		var y = ["8", "9", "a", "b"];
		template = template.replace("y", y[Math.floor(Math.random() * 4)]);
		
		return template;
	}
	
	var Session = (function(){
		var s = {};
		var groups = [];
		var expiry = new Date(Date.now() + (30 * 60000)).getTime();
		var created = Date.now();
		var user;
		var initialized = false;
		
		s.setUser = function(username){
			s.username = username;
			var collectionResourceResponse = new server.utils.CollectionResourceResponse(server.dirs, function(item, next){
				if(user == undefined){
					item.getUser(username, function(err, userResponse){
						if(err){
							next(err);
						}
						else {
							user = userResponse;
							item.getGroupsForUser(username, next);
						}
					});
				}
				else {
					item.getGroupsForUser(username, next);
				}
			})
			.oncomplete(function(results){
				for(var dir in results){
					for(var i=0;i<results[dir].length;i++){
						groups.push(results[dir][i].name);
					}
				}
				initialized = true;
			})
			.onfail(function(err){
				server.errorLog.error(err);
			})
			.process();
		}
		
		s.getCreated = function(){
			return created;
		}
		
		s.getGroups = function(next){
			if(!initialized){
				setTimeout(function(){
					return s.getGroups(next);
				}, 50);
			}
			else {
				next(groups);
			}
		}
		
		s.updateExpiry = function(){
			expiry = new Date(Date.now() + (30 * 60000)).getTime();
		}
		
		s.getUserObject = function(){
			return user;
		}
		
		s.isValid = function(){
			return expiry > Date.now();
		}
		
		return s;
	});
	
	return sm;
});

module.exports = SessionManager;