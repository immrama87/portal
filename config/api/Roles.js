var Roles = (function(app, ConfigException){
	server.api.registerRoute(app, "config/roles")
		.get(function(req, res){
			var session = server.db.getSession();
			var statement = server.db.generatePreparedStatement({
				action:	"read",
				table:	"roles",
				fields:	["name", "roleId"],
				query:	{}
			});
			
			session.execute(statement, function(err, findResponse){
				if(err){
					app.serveError(500, err, res);
				}
				else {
					res.status(200).end(JSON.stringify(findResponse.getItems()));
				}
			});
		})
		.post(function(req, res){
			if(req.body.roleId == 100 || req.body.roleId == 200 || req.body.roleId == 300 || req.body.roleId == 400){
				var exc = new ConfigException({msg: "Request to update role '" + req.body.roleId + "' could not be processed. This role is system-generated and cannot be modified."});
				app.serveError(500, exc, res);
			}
			else {
				updateRole(req.body.roleId, req.body.name, function(err){
					if(err){
						app.serveError(500, err, res);
					}
					else {
						res.status(200).end();
					}
				});
			}
		})
		.delete(function(req, res){
			if(req.body.roleId == 100 || req.body.roleId == 200 || req.body.roleId == 300 || req.body.roleId == 400){
				var exc = new ConfigException({msg: "Request to remove role '" + req.body.roleId + "' could not be processed. This role is system-generated and cannot be deleted."});
				app.serveError(500, exc, res);
			}
			else {
				var session = server.db.getSession();
				var statement = server.db.generatePreparedStatement({
					action:	"delete",
					table:	"roles",
					query:	{roleId:	"#{roleId}"}
				})
				.withParam("roleId", req.body.roleId);
				
				session.execute(statement, function(err){
					if(err){
						app.serveError(500, err, res);
					}
					else {
						res.status(200).end();
					}
				});
			}
		});
		
	server.api.createParameter(app, "roleId");
	server.api.registerRoute(app, "config/roles/:roleId/users")
		.get(function(req, res){
			server.authorizationService.getUsersForRole(req.roleId, function(err, users){
				if(err){
					app.serveError(500, err, res);
				}
				else {
					res.status(200).end(JSON.stringify(users));
				}
			});
		})
		.post(function(req, res){
			server.authorizationService.addUserToRole(req.roleId, req.body.username, function(err){
				if(err){
					app.serveError(500, err, res);
				}
				else {
					res.status(200).end();
				}
			});
		})
		.delete(function(req, res){
			server.authorizationService.removeUserFromRole(req.roleId, req.body.username, function(err){
				if(err){
					app.serveError(500, err, res);
				}
				else {
					res.status(200).end();
				}
			});
		});
		
	server.api.registerRoute(app, "config/roles/:roleId/groups")
		.get(function(req, res){
			server.authorizationService.getGroupsForRole(req.roleId, function(err, groups){
				if(err){
					app.serveError(500, err, res);
				}
				else {
					res.status(200).end(JSON.stringify(groups));
				}
			});
		})
		.post(function(req, res){
			server.authorizationService.addGroupToRole(req.roleId, req.body.groupId, function(err){
				if(err){
					app.serveError(500, err, res);
				}
				else {
					res.status(200).end();
				}
			});
		})
		.delete(function(req, res){
			server.authorizationService.removeGroupFromRole(req.roleId, req.body.groupId, function(err){
				if(err){
					app.serveError(500, err, res);
				}
				else {
					res.status(200).end();
				}
			});
		});
	
	
	
	function updateRole(roleId, roleName, next){
		server.authorizationService.roleExists(roleId, function(err, exists){
			if(err){
				next(err);
			}
			else {
				if(exists){
					server.authorizationService.updateRole(roleId, roleName, next);
				}
				else {
					server.authorizationService.createRole(roleId, roleName, next);
				}
			}
		});
	}
});

module.exports = Roles;