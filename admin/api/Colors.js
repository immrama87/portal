var Colors = (function(app, versionManager, AdminException){
	server.api.registerRoute(app, "admin/color-schemes")
		.get(function(req, res){
			var session = server.db.getSession();
			var statement = server.db.generatePreparedStatement({
				action:		"read",
				table:		"colorSchemes",
				fields:		["name", "scheme_id"],
				query:		{}
			});
			
			session.execute(statement, function(err, findResponse){
				if(err){
					app.serveError(500, err, res);
				}
				else {
					res.status(200).end(JSON.stringify(findResponse.getItems()));
				}
			});
		});
		
	server.api.createParameter(app, "schemeId");
	server.api.registerRoute(app, "admin/color-schemes/:schemeId")
		.get(function(req, res){
			var session = server.db.getSession();
			var statement = server.db.generatePreparedStatement({
				action:		"read",
				table:		"colorSchemes",
				fields:		["name"],
				query:		{scheme_id: "#{schemeId}"}
			})
			.withParam("schemeId", req.schemeId);
			
			session.execute(statement, function(err, findResponse){
				if(err){
					app.serveError(500, err, res);
				}
				else {
					if(findResponse.getItems().length == 0){
						var exc = new AdminException({msg: "Request for color scheme '" + req.schemeId + "' could not be completed. No scheme with that ID was found."});
						app.serveError(500, exc, res);
					}
					else if(findResponse.getItems().length > 1){
						var exc = new AdminException({msg: "Request for color scheme '" + req.schemeId + "' could not be completed. Multiple color schemes with the given ID were found."});
						app.serveError(500, exc, res);
					}
					else {
						versionManager.getObjectVersions(req.schemeId, function(versionErr, versions){
							if(versionErr){
								app.serveError(500, versionErr, res);
							}
							else {
								response = {
									name: 	findResponse.iterator().next().name,
									versions: versions.getItems()
								};
								
								res.status(200).end(JSON.stringify(response));
							}
						});
					}
				}
				
				session.close();
			});
		});
		
	server.api.registerRoute(app, "admin/color-schemes/:schemeId/colors")
		.get(function(req, res){
			var session = server.db.getSession();
			var statement = server.db.generatePreparedStatement({
				action:		"read",
				table:		"colors",
				fields:		["name", "color"],
				query:		{scheme_id: "#{schemeId}"}
			})
			.withParam("schemeId", req.schemeId);
			
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
			var collectionResourceResponse = new server.utils.CollectionResourceResponse(req.body.colors, function(item, next){
				
			});
		});
});

module.exports = Colors;