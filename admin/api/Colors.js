var Colors = (function(app, versionManager, auditManager, AdminException){
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
		})
		.post(function(req, res){
			var session = server.db.getSession();
			var lookup = server.db.generatePreparedStatement({
				action:		"read",
				table:		"colorSchemes",
				fields:		["name"],
				query:		{scheme_id: "#{schemeId}"}
			})
			.withParam("schemeId", req.body.schemeId);
			
			session.execute(lookup, function(lookupErr, findResponse){
				if(lookupErr){
					app.serveError(500, lookupErr, res);
					session.close();
				}
				else {
					if(findResponse.getItems().length > 0){
						var exc = new AdminException({msg: "Could not create color scheme with ID '" + req.body.schemeId + "'. A color scheme with this ID already exists."});
						app.serveError(500, exc, res);
						session.close();
					}
					else {
						var statement = server.db.generatePreparedStatement({
							action:		"create",
							table:		"colorSchemes",
							values:		{
								name:		"#{name}",
								scheme_id:	"#{schemeId}"
							}
						})
						.withParam("name", req.body.name)
						.withParam("schemeId", req.body.schemeId);
						
						session.execute(statement, function(err){
							if(err){
								app.serveError(500, err, res);
								session.close();
							}
							else {
								versionManager.createDraft(req.body.schemeId, "color-scheme", function(draftErr){
									if(draftErr){
										app.serveError(500, draftErr, res);
									}
									else {
										res.status(200).end();
									}
									session.close();
								}, session);
							}
						});	
					}						
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
						versionManager.getObjectVersions(req.schemeId, "color-scheme", function(versionErr, versions){
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
		
	server.api.registerRoute(app, "admin/color-schemes/:schemeId/colors/:versionId")
		.get(function(req, res){
			var session = server.db.getSession();
			var statement = server.db.generatePreparedStatement({
				action:		"read",
				table:		"colors",
				fields:		["name", "color", "darkest", "dark", "light", "lightest"],
				query:		{scheme_id: "#{schemeId}", version: "#{versionId}"}
			})
			.withParam("schemeId", req.schemeId)
			.withParam("versionId", req.versionId);
			
			session.execute(statement, function(err, findResponse){
				if(err){
					app.serveError(500, err, res);
				}
				else {
					var colors = findResponse.getItems();
					res.status(200).end(JSON.stringify(colors));
				}
				session.close();
			});
		})
		.post(function(req, res){
			var collectionResourceResponse = new server.utils.CollectionResourceResponse(req.body.colors, function(item, next){
				saveColor(item, req.schemeId, req.versionId, next);
			})
			.oncomplete(function(changes){
				var change = [];
				for(var key in changes){
					if(changes[key]){
						change.push(JSON.parse(changes[key]));
					}
				}
				
				var deleteResourceResponse = new server.utils.CollectionResourceResponse(req.body.deletes, function(del, delNext){
					deleteColor(del, req.schemeId, req.versionId, delNext);
				})
				.oncomplete(function(deletes){
					for(var key in deletes){
						change.push(JSON.parse(deletes[key]));
					}
					if(change.length > 0){
						auditManager.createChangeAuditRecord(req.schemeId, req.versionId, "color-scheme", change, function(err){
							if(err){
								app.serveError(500, err, res);
							}
							else {
								res.status(200).end();
							}
						});
					}
					else {
						res.status(200).end();
					}
				})
				.onfail(function(delErr){
					app.serveError(500, delErr, res);
				})
				.process();
			})
			.onfail(function(err){
				app.serveError(500, err, res);
			})
			.process();
		});
		
	server.api.registerRoute(app, "admin/color-schemes/:schemeId/colors/:versionId/create-draft")
		.post(function(req, res){
			versionManager.createDraft(req.schemeId, "color-scheme", function(err){
				if(err){
					app.serveError(500, err, res);
				}
				else {
					var session = server.db.getSession();
					var lookup = server.db.generatePreparedStatement({
						action:		"read",
						table:		"colors",
						fields:		["name", "color", "darkest", "dark", "light", "lightest"],
						query:		{
							scheme_id:	"#{schemeId}",
							version:	"#{versionId}"
						}
					})
					.withParam("schemeId", req.schemeId)
					.withParam("versionId", req.versionId);
					
					session.execute(lookup, function(lookupErr, findResponse){
						if(lookupErr){
							app.serveError(500, lookupErr, res);
							session.close();
						}
						else {
							var collectionResourceResponse = new server.utils.CollectionResourceResponse(findResponse.getItems(), function(item, next){
								var createColor = server.db.generatePreparedStatement({
									action:	"create",
									table:	"colors",
									values:	{
										name:		"#{name}",
										scheme_id:	"#{schemeId}",
										color:		"#{color}",
										darkest:	"#{darkest}",
										dark:		"#{dark}",
										light:		"#{light}",
										lightest:	"#{lightest}",
										version:	"draft"
									}
								})
								.withParam("schemeId", req.schemeId);
								
								for(var key in item){
									createColor.setParam(key, item[key]);
								}
								
								session.execute(createColor, next);
							})
							.oncomplete(function(){
								session.close();
								res.status(200).end();
							})
							.onfail(function(errs){
								app.serveError(500, errs, res);
							})
							.process();
						}
					});
				}
			});
		});
		
	server.api.registerRoute(app, "admin/color-schemes/:schemeId/colors/:versionId/change-history")
		.get(function(req, res){
			auditManager.getChanges(req.schemeId, req.versionId, "color-scheme", function(err, response){
				if(err){
					app.serveError(500, err, res);
				}
				else {
					res.status(200).end(JSON.stringify(response.getItems()));
				}
			});
		});
		
	server.api.registerRoute(app, "admin/color-schemes/:schemeId/colors/draft/publish")
		.post(function(req, res){
			versionManager.publishVersion(req.schemeId, "color-scheme", function(err, newVersion){
				if(err){
					app.serveError(500, err, res);
				}
				else {
					var session = server.db.getSession();
					var statement = server.db.generatePreparedStatement({
						action:	"update",
						table:	"colors",
						values:	{version: "#{version}"},
						query:	{
							scheme_id:	"#{schemeId}",
							version:	"draft"
						}
					})
					.withParam("version", newVersion)
					.withParam("schemeId", req.schemeId);
					
					session.execute(statement, function(updateErr){
						if(updateErr){
							app.serveError(500, updateErr, res);
						}
						else {
							auditManager.createPublishAuditRecord(req.schemeId, newVersion, "color-scheme", function(auditErr){
								if(auditErr){
									app.serveError(500, updateErr, res);
								}
								else {
									res.status(200).end(JSON.stringify({newVersion: newVersion}));
								}
							});
						}
						session.close();
					});
				}
			});
		});
		
	server.api.registerRoute(app, "admin/color-schemes/:schemeId/colors/draft/revert/:reversionId")
		.post(function(req, res){
			auditManager.createReversionManifest(req.reversionId, function(err, reversionManifest){
				if(err){
					app.serveError(500, err, res);
				}
				else {
					var colors = {};
					for(var i=0;i<reversionManifest.length;i++){
						var changes;
						if(reversionManifest[i].audit_type == "reversion"){
							changes = JSON.parse(reversionManifest[i].change).change;
						}
						else {
							changes = JSON.parse(reversionManifest[i].change);
						}
						for(var j=0;j<changes.length;j++){
							if(!colors.hasOwnProperty(changes[j].object_id)){
								colors[changes[j].object_id] = {};
							}
							
							if(changes[j].type == "deleted"){
								if(reversionManifest[i].audit_type != "reversion"){
									colors[changes[j].object_id].create = true;
									colors[changes[j].object_id].properties = changes[j].values;
								}
								else {
									if(colors[changes[j].object_id].create){
										delete colors[changes[j].object_id];
									}
									else {
										colors[changes[j].object_id].destroy = true;
									}
								}
							}
							else if(changes[j].type == "created"){
								if(reversionManifest[i].audit_type != "reversion"){
									if(colors[changes[j].object_id].create){
										delete colors[changes[j].object_id];
									}
									else {
										colors[changes[j].object_id].destroy = true;
									}
								}
								else {
									colors[changes[j].object_id].create = true;
									colors[changes[j].object_id].properties = changes[j].values;
								}
							}
							else if(changes[j].type == "modified"){
								if(!colors[changes[j].object_id].hasOwnProperty("properties")){
									colors[changes[j].object_id].properties = {};
								}
								var properties = changes[j].changes;
								for(var k=0;k<properties.length;k++){
									colors[changes[j].object_id].properties[properties[k].field] = ((reversionManifest[i].audit_type != "reversion") ? properties[k].original : properties[k].value);
								}
							}
						}
					}
					
					var collectionResourceResponse = new server.utils.CollectionResourceResponse(colors, function(item, next){
						var color = {
							name: item.key
						};
						if(item.hasOwnProperty("properties")){
							for(var key in item.properties){
								color[key] = item.properties[key];
							}
						}
						
						if(item.destroy){
							deleteColor(color, req.schemeId, "draft", next);
						}
						else {
							saveColor(color, req.schemeId, "draft", next);
						}
					})
					.oncomplete(function(){
						auditManager.createReversionAuditRecord(req.schemeId, "draft", "color-scheme", {reversionId: req.reversionId, change: changes}, function(auditErr){
							if(auditErr){
								app.serveError(500, auditErr, res);
							}
							else {
								res.status(200).end();
							}
						});
					})
					.onfail(function(errs){
						app.serveError(500, errs, res);
					})
					.process();
				}
			});	
		});
		
	server.api.registerRoute(app, "admin/color-schemes/:schemeId/colors/draft/revert-version/:versionId")
		.post(function(req, res){
			var session = server.db.getSession();
			var versionColor = server.db.generatePreparedStatement({
				action:	"read",
				table:	"colors",
				fields:	["name", "color", "darkest", "dark", "light", "lightest"],
				query:	{
					scheme_id:	"#{schemeId}",
					version:	"#{versionId}"
				}
			})
			.withParam("schemeId", req.schemeId)
			.withParam("versionId", req.versionId);
			
			session.execute(versionColor, function(err, versionColors){
				if(err){
					app.serveError(500, err, res);
					session.close();
				}
				else {
					if(versionColors.getItems().length == 0){
						var exc = new AdminException({msg: "Error reverting to version '" + req.versionId + "'. Could not find any colors associated to this version ID."});
						app.serveError(500, exc, res);
						session.close();
					}
					else {
						var deleteStatement = server.db.generatePreparedStatement({
							action:	"delete",
							table:	"colors",
							query:	{
								scheme_id: 	"#{schemeId}",
								version:	"draft"
							}
						})
						.withParam("schemeId", req.schemeId);
						
						session.execute(deleteStatement, function(deleteErr){
							if(deleteErr){
								app.serveError(500, deleteErr, res);
							}
							else {
								var collectionResourceResponse = new server.utils.CollectionResourceResponse(versionColors.getItems(), function(item, next){
									item.darkest = item.darkest || -20;
									item.dark = item.dark || -10;
									item.light = item.light || 10;
									item.lightest = item.lightest || 20;
									var createStatement = server.db.generatePreparedStatement({
										action:	"create",
										table:	"colors",
										values:	{
											name:		item.name,
											color:		item.color,
											darkest:	item.darkest.toString(),
											dark:		item.dark.toString(),
											light:		item.light.toString(),
											lightest:	item.lightest.toString(),
											scheme_id:	"#{schemeId}",
											version:	"draft"
										}
									})
									.withParam("schemeId", req.schemeId);
									
									session.execute(createStatement, next);
								})
								.oncomplete(function(){
									auditManager.createVersionRevertAuditRecord(req.schemeId, "draft", "color-scheme", req.versionId, function(auditErr){
										if(auditErr){
											app.serveError(500, auditErr, res);
										}
										else {
											res.status(200).end();
										}
										session.close();
									});
								})
								.onfail(function(errs){
									app.serveError(500, errs, res);
									session.close();
								})
								.process();
							}
						});
					}
				}
			});
		});
		
	function saveColor(color, schemeId, versionId, next){
		var session = server.db.getSession();
		var findStatement = server.db.generatePreparedStatement({
			action:	"read",
			table:	"colors",
			fields:	["name", "color", "darkest", "dark", "light", "lightest"],
			query:	{
				name: 		"#{name}",
				scheme_id:	"#{schemeId}",
				version:	"#{versionId}"
			}
		})
		.withParam("name", color.name)
		.withParam("schemeId", schemeId)
		.withParam("versionId", versionId);
		
		session.execute(findStatement, function(err, findResponse){
			if(err){
				next(err);
				session.close();
			}
			else {
				if(findResponse.getItems().length > 1){
					var exc = new AdminException({msg: "Could not process request to save color data. Multiple copies of the color exist for the given color scheme and version IDs."});
					next(exc);
					session.close();
				}
				else {
					var colorStatement;
					var change;
					if(findResponse.getItems() == 0){
						color.darkest = color.darkest || -20;
						color.dark = color.dark || -10;
						color.light = color.light || 10;
						color.lightest = color.lightest || 20;
						
						change = {
							object_id:	color.name,
							type:		"created",
							values:		{
								color:		color.color,
								darkest:	color.darkest,
								dark:		color.dark,
								light:		color.light,
								lightest:	color.lightest
							}
						};
						
						colorStatement = server.db.generatePreparedStatement({
							action:	"create",
							table:	"colors",
							values:	{
								name:		"#{name}",
								color:		"#{color}",
								darkest:	"#{darkest}",
								dark:		"#{dark}",
								light:		"#{light}",
								lightest:	"#{lightest}",
								scheme_id:	"#{schemeId}",
								version:	"#{versionId}"
							}
						})
						.withParam("schemeId", schemeId)
						.withParam("versionId", versionId);
					}
					else {
						var originalColor = findResponse.iterator().next();
						color.color = color.color || originalColor.color;
						color.darkest = color.darkest || originalColor.darkest;
						color.dark = color.dark || originalColor.dark;
						color.light = color.light || originalColor.light;
						color.lightest = color.lightest || originalColor.lightest;
						
						var changes = versionManager.analyzeChanges(originalColor, color);
						if(changes.length > 0){
							change = {
								object_id: 	originalColor.name,
								type:		"modified",
								changes: 	changes
							};
						}
						
						colorStatement = server.db.generatePreparedStatement({
							action:	"update",
							table:	"colors",
							values:	{
								color:		"#{color}",
								darkest:	"#{darkest}",
								dark:		"#{dark}",
								light:		"#{light}",
								lightest:	"#{lightest}"
							},
							query:	{
								name:		"#{name}",
								scheme_id:	"#{schemeId}",
								version:	"#{versionId}"
							}
						})
						.withParam("schemeId", schemeId)
						.withParam("versionId", versionId);
					}
					
					for(var key in color){
						colorStatement.setParam(key, color[key]);
					}
					
					session.execute(colorStatement, function(err){
						next(err, JSON.stringify(change));
						session.close();
					});
				}
			}
		});
	}
	
	function deleteColor(color, schemeId, versionId, next){
		var session = server.db.getSession();
		var statement = server.db.generatePreparedStatement({
			action:		"delete",
			table:		"colors",
			query:		{
				name:		"#{name}",
				scheme_id:	"#{schemeId}",
				version:	"#{versionId}"
			}
		})
		.withParam("name", color.name)
		.withParam("schemeId", schemeId)
		.withParam("versionId", versionId);
		
		var change = {
			object_id:	color.name,
			type:		"deleted",
			values:		{
				color: 		color.color,
				darkest:	color.darkest,
				dark:		color.dark,
				light:		color.light,
				lightest:	color.lightest
			}
		};
		
		session.execute(statement, function(err){
			console.log(err, JSON.stringify(change));
			next(err, JSON.stringify(change));
			session.close();
		});
	}
});

module.exports = Colors;