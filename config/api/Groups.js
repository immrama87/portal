var Groups = (function(app, ConfigException){
	server.api.registerRoute(app, "config/groups")
		.get(function(req, res){
			if(!server.hasOwnProperty("dirs")){
				var err = new ConfigException({msg: "Request to get directory group details could not be processed. No group directories have been initialized."});
				app.serveError(500, err, res);
			}
			else {
				var collectionResourceResponse = new server.utils.CollectionResourceResponse(server.dirs, function(item, next){
					item.getGroups(next);
				})
				.oncomplete(function(results){
					res.status(200).end(JSON.stringify(results));
				})
				.onfail(function(err){
					app.serveError(500, err, res);
				})
				.process();
			}
		});
		
	server.api.createParameter(app, "groupName");
	server.api.registerRoute(app, "config/directories/:directoryId/groups/:groupName")
		.post(function(req, res){
			updateGroup(req.directoryId, req.groupName, req.body, function(err){
				if(err){
					app.serveError(500, err, res);
				}
				else {
					res.status(200).end();
				}
			});
		})
		.delete(function(req, res){
			deleteGroup(req.directoryId, req.groupName, function(err){
				if(err){
					app.serveError(500, err, res);
				}
				else {
					res.status(200).end();
				}
			});
		});
	
	server.api.registerRoute(app, "config/directories/:directoryId/groups/:groupName/users")
		.get(function(req, res){
			server.dirs[req.directoryId].getUsersInGroup(req.groupName, function(err, users){
				if(err){
					app.serveError(500, err, res);
				}
				else {
					res.status(200).end(JSON.stringify(users));
				}
			});
		})
		.post(function(req, res){
			server.dirs[req.directoryId].addUserToGroup(req.groupName, req.body.username, function(err){
				if(err){
					app.serveError(500, err, res);
				}
				else {
					res.status(200).end();
				}
			});
		})
		.delete(function(req, res){
			server.dirs[req.directoryId].removeUserFromGroup(req.groupName, req.body.username, function(err){
				if(err){
					app.serveError(500, err, res);
				}
				else {
					res.status(200).end();
				}
			});
		});
		
	server.api.registerRoute(app, "config/groups/:groupName/roles")
			.get(function(req, res){
				server.authorizationService.getRolesForGroup(req.groupName, function(err, findResponse){
					if(err){
						app.serveError(500, err, res);
					}
					else {
						res.status(200).end(JSON.stringify(findResponse.getItems()));
					}
				});
			});
	
	function updateGroup(directory, groupName, updateData, next){
		server.dirs[directory].groupExists(groupName, function(err, exists){
			if(err){
				next(err);
			}
			else {
				if(exists){
					server.dirs[directory].updateGroup(groupName, updateData, next);
				}
				else {
					server.dirs[directory].createGroup(groupName, updateData, next);
				}
			}
		});
	}
	
	function deleteGroup(directory, groupName, next){
		server.dirs[directory].groupExists(groupName, function(err, exists){
			if(err){
				next(err);
			}
			else {
				if(exists){
					server.dirs[directory].deleteGroup(groupName, next);
				}
				else {
					var exc = new ConfigException({msg: "Request to delete group '" + groupName + "' could not be processed. Group could not be found in directory specified."});
					next(exc);
				}
			}
		});
	}
});

module.exports = Groups;