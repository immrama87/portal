var Sessions = (function(app, ConfigException){
	server.api.registerRoute(app, "/config/sessions")
		.get(function(req, res){
			var sessions = server.sessionManager.getSessions();
			var response = [];
			for(var key in sessions){
				var session = {};
				session.username = sessions[key].username;
				session.created = sessions[key].getCreated();
				session.id = key;
				response.push(session);
			}
			
			res.status(200).end(JSON.stringify(response));
		});
		
	server.api.createParameter(app, "sessionId", function(req, res, next){
		var session = server.sessionManager.getSession(req.sessionId);
		if(session == null){
			var exc = new ConfigException({msg: "Request to update session data could not be processed. The session ID provided does not match a valid session"});
			app.serveError(500, exc, res);
		}
		else {
			next();
		}
	});
	server.api.registerRoute(app, "/config/sessions/:sessionId")
		.delete(function(req, res){
			server.sessionManager.destroySession(req.sessionId);
			res.status(200).end();
		});
});

module.exports = Sessions;