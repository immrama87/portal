var Users = (function(app, ConfigException){
	server.api.registerRoute(app, "config/users")
		.get(function(req, res){
			if(!server.hasOwnProperty("dirs")){
				var err = new ConfigException({msg: "Request to get directory user details could not be processed. No user directories have been initialized."});
				app.serveError(500, err, res);
			}
			else {
				var collectionResourceResponse = new server.utils.CollectionResourceResponse(server.dirs, function(item, next){
					item.getUsers(next);
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
		
	server.api.createParameter(app, "username");
	server.api.registerRoute(app, "config/users/:username")
		.get(function(req, res){
			if(!server.hasOwnProperty("dirs")){
				var err = new ConfigException({msg: "Request to get directory user details could not be processed. No user directories have been initialized."});
				app.serveError(500, err, res);
			}
			else {
				var collectionResourceResponse = new server.utils.CollectionResourceResponse(server.dirs, function(item, next, force){
					item.getUser(req.username, function(err, userDetails){
						if(err && !err.errorCode == 0){
							next(err);
						}
						else {
							if(err && err.errorCode == 0){
								next();
							}
							else {
								userDetails.directory = item.key;
								force(userDetails);
							}
						}
					});
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
		
	server.api.registerRoute(app, "config/directories/:directoryId/users/:username")
		.get(function(req, res){
			server.dirs[req.directoryId].getUser(req.username, function(err, userDetails){
				if(err){
					app.serveError(500, err, res);
				}
				else {
					res.status(200).end(JSON.stringify(userDetails));
				}
			});
		})
		.post(function(req, res){
			updateUser(req.directoryId, req.username, req.body, function(err){
				if(err){
					app.serveError(500, err, res);
				}
				else {
					res.status(200).end();
				}
			});
		})
		.delete(function(req, res){
			deleteUser(req.directoryId, req.username, function(err){
				if(err){
					app.serveError(500, err, res);
				}
				else {
					res.status(200).end();
				}
			});
		});
		
	server.api.registerRoute(app, "config/users/:username/groups")
		.get(function(req, res){
			var collectionResourceResponse = new server.utils.CollectionResourceResponse(server.dirs, function(item, next){
				item.getGroupsForUser(req.username, next);
			})
			.oncomplete(function(results){
				res.status(200).end(JSON.stringify(results));
			})
			.onfail(function(err){
				app.serveError(500, err, res);
			})
			.process();
		});
		
	server.api.registerRoute(app, "config/users/:username/roles")
			.get(function(req, res){
				server.authorizationService.getRolesForUser(req.username, function(err, findResponse){
					if(err){
						app.serveError(500, err, res);
					}
					else {
						res.status(200).end(JSON.stringify(findResponse.getItems()));
					}
				});
			});
		
	function updateUser(directory, username, updateData, next){
		server.dirs[directory].userExists(username, function(err, exists){
			if(err){
				next(err);
			}
			else {
				if(exists){
					server.dirs[directory].updateUser(username, updateData, next);
				}
				else {
					server.dirs[directory].createUser(username, updateData, next);
				}
			}
		});
	}
	
	function deleteUser(directory, username, next){
		server.dirs[directory].userExists(username, function(err, exists){
			if(err){
				next(err);
			}
			else {
				if(exists){
					server.dirs[directory].deleteUser(username, next);
				}
				else {
					var exc = new ConfigException({msg: "Request to delete user '" + username + "' could not be processed. User could not be found in directory specified."});
					next(exc);
				}
			}
		});
	}
});

module.exports = Users;