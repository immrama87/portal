var Portals = (function(app){
	server.api.registerRoute(app, "admin/portals")
		.get(function(req, res){
			var session = server.db.getSession();
			var statement = server.db.generatePreparedStatement({
				action:		"read",
				table:		"portals",
				fields:		["name", "portal_id"],
				query:		{}
			});
			
			session.execute(statement, function(err, findResponse){
				if(err){
					app.serveError(500, err, res);
				}
				else {
					res.status(200).end(JSON.stringify(findResponse.getItems()));
				}
				session.close();
			});
		})
		.post(function(req, res){
			portalExists(req.body.portal_id, function(err, exists){
				if(err){
					app.serveError(500, err, res);
				}
				else {
					var session = server.db.getSession();
					var statement;
					if(exists){
						statement = server.db.generatePreparedStatement({
							action:	"update",
							table:	"portals",
							values:	{
								name:		"#{name}",
								context:	"#{context}"
							},
							query:	{portal_id: "#{portal_id}"}
						});
					}
					else {
						statement = server.db.generatePreparedStatement({
							action:	"create",
							table:	"portals",
							values:	{
								portal_id:	"#{portal_id}",
								name:		"#{name}",
								context:	"#{context}"
							}
						});
					}
					
					for(var key in req.body){
						statement.setParam(key, req.body[key]);
					}
					
					session.execute(statement, function(statementErr){
						if(err){
							app.serveError(500, statementErr, res);
						}
						else {
							res.status(200).end();
						}
						session.close();
					});
				}
			});
		});
		
	server.api.createParameter(app, "portalId");
	server.api.registerRoute(app, "admin/portals/:portalId")
		.get(function(req, res){
			var session = server.db.getSession();
			var statement = server.db.generatePreparedStatement({
				action:		"read",
				table:		"portals",
				fields:		["name", "context", "portal_id", "color_scheme_id"],
				query:		{portal_id: "#{portal_id}"}
			})
			.withParam("portal_id", req.portalId);
			
			session.execute(statement, function(err, findResponse){
				if(err){
					app.serveError(500, err, res);
				}
				else {
					if(findResponse.getItems().length == 0){
						var exc = new AdminException({msg: "Portal details request for portal '" + req.portalId + "' could not be processed. No portal with that ID exists."});
						app.serveError(500, exc, res);
					}
					else if(findResponse.getItems().length > 1){
						var exc = new AdminException({msg: "Portal details request for portal '" + req.portalId + "' could not be processed. Multiple matches were found where only one should exist."});
						app.serveError(500, exc, res);
					}
					else {
						res.status(200).end(JSON.stringify(findResponse.iterator().next()));
					}
				}
			});
		});
		
	server.api.registerRoute(app, "admin/portals/:portalId/groups")
		.get(function(req, res){
			var session = server.db.getSession();
			var statement = server.db.generatePreparedStatement({
				action:		"read",
				table:		"portals",
				fields:		["#[groups]"],
				query:		{portal_id: "#{portalId}"}
			})
			.withParam("portalId", req.portalId);
			
			session.execute(statement, function(err, findResponse){
				if(err){
					app.serveError(500, exc, res);
				}
				else {
					res.status(200).end(JSON.stringify(findResponse.iterator().next()));
				}
				session.close();
			});
		})
		.post(function(req, res){
			var session = server.db.getSession();
			var findStatement = server.db.generatePreparedStatement({
				action:		"read",
				table:		"portals",
				fields:		["#[groups]"],
				query:		{portal_id:	"#{portalId}"}
			})
			.withParam("portalId", req.portalId);
			
			session.execute(findStatement, function(findErr, findResponse){
				if(findErr){
					app.serveError(500, findErr, res);
				}
				else {
					var groups = findResponse.iterator().next().groups || [];
					var additions = req.body.groups.split(",");
					for(var i=0;i<additions.length;i++){
						additions[i] = additions[i].trim();
					}
					
					groups = groups.concat(additions);
					var updateStatement = server.db.generatePreparedStatement({
						action:		"update",
						table:		"portals",
						values:		{groups:	"#[#{groups}]"},
						query:		{portal_id: "#{portalId}"}
					})
					.withParam("groups", groups)
					.withParam("portalId", req.portalId);
					
					session.execute(updateStatement, function(err){
						if(err){
							app.serveError(500, err, res);
						}
						else {
							res.status(200).end();
						}
						session.close();
					});
				}
			});
		})
		.delete(function(req, res){
			var session = server.db.getSession();
			var findStatement = server.db.generatePreparedStatement({
				action:		"read",
				table:		"portals",
				fields:		["#[groups]"],
				query:		{portal_id:	"#{portalId}"}
			})
			.withParam("portalId", req.portalId);
			
			session.execute(findStatement, function(findErr, findResponse){
				if(findErr){
					app.serveError(500, findErr, res);
				}
				else {
					var groups = findResponse.iterator().next().groups || [];
					var removals = req.body.groups.split(",");
					for(var i=0;i<removals.length;i++){
						removals[i] = removals[i].trim();
						if(groups.indexOf(removals[i]) > -1){
							groups.splice(groups.indexOf(removals[i]), 1);
						}
					}
					var updateStatement = server.db.generatePreparedStatement({
						action:		"update",
						table:		"portals",
						values:		{groups:	"#[#{groups}]"},
						query:		{portal_id: "#{portalId}"}
					})
					.withParam("groups", groups)
					.withParam("portalId", req.portalId);
					
					session.execute(updateStatement, function(err){
						if(err){
							app.serveError(500, err, res);
						}
						else {
							res.status(200).end();
						}
						session.close();
					});
				}
			});
		});
	
	function portalExists(portalId, next){
		var session = server.db.getSession();
		var statement = server.db.generatePreparedStatement({
			action:		"read",
			table:		"portals",
			fields:		["portal_id"],
			query:		{portal_id: "#{portalId}"}
		})
		.withParam("portalId", portalId);
		
		session.execute(statement, function(err, findResponse){
			if(err){
				next(err);
			}
			else {
				next(undefined, (findResponse.getItems().length > 0));
			}
			session.close();
		});
	}
});

module.exports = Portals;