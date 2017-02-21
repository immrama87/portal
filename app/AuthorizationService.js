var util = require("util");

var AuthorizationService = (function(){
	var as = {};
	var authRules = {};
	
	as.configureRouteAuthorization = function(app, route, roles, handleFail){
		if(!app || !route || !roles){
			var exc = new AuthorizationServiceException({msg: "Could not configure route authorization rule. A server, route and role(s) specification are required"});
			server.errorLog.fatal(exc, function(){
				throw exc;
			});
		}
		
		var rule = {};
		if(!Array.isArray(roles)){
			roles = [roles];
		}
		rule.server = app;
		rule.roles = roles;
		
		if(handleFail && typeof handleFail == "function"){
			rule.handleFail = handleFail;
		}
		
		authRules[route] = rule;
	}
	
	as.isAuthorized = function(req, res, next){
		var session = req.session;
		var routeRules = [];
		var index = req.url.length;
		while(index > 0){
			var urlSlice = req.url.substring(0, index);
			if(authRules.hasOwnProperty(urlSlice)){
				routeRules.push(authRules[urlSlice]);
			}
			
			index = req.url.lastIndexOf("/", index-1);
		}
		
		if(routeRules.length > 0){
			as.getRolesForUser(session.username, function(err, userRoles){
				if(err){
					routeRules[0].server.serveError(500, err, res);
				}
				else {
					var roles = [];
					var iter = userRoles.iterator();
					while(iter.hasNext()){
						roles.push(iter.next().roleId);
					}
					
					session.getGroups(function(groupsList){
						var groupRolesCollectionResponse = new server.utils.CollectionResourceResponse(groupsList, function(group, groupNext){
							as.getRolesForGroup(group, function(groupErr, groupRoles){
								if(groupErr){
									groupNext(groupErr);
								}
								else {
									var groupIter = groupRoles.iterator();
									while(groupIter.hasNext()){
										roles.push(groupIter.next().roleId);
									}
									
									groupNext();
								}
							});
						})
						.oncomplete(function(data){
							var valid = true;
							var failureRoutines = [];
							for(var i=0;i<routeRules.length;i++){
								var ruleValid = false;
								for(var j=0;j<routeRules[i].roles.length;j++){
									if(roles.indexOf(routeRules[i].roles[j]) > -1){
										ruleValid = true;
										break;
									}
								}
								
								if(!ruleValid){
									valid = false;
									if(routeRules[i].hasOwnProperty("handleFail")){
										failureRoutines.push(routeRules[i].handleFail);
									}
									
									break;
								}
							}
							
							if(valid){
								next();
							}
							else {
								for(var i=0;i<failureRoutines.length;i++){
									failureRoutines[i](req);
								}
								
								routeRules[0].server.serveError(401, undefined, res);
							}
						})
						.onfail(function(err){
							routeRules[0].server.serveError(500, err, res);
						})
						.process();
					});
				}
			});	
		}
		else {
			next();
		}
	}
	
	as.roleExists = function(roleId, next){
		var session = server.db.getSession();
		var statement = server.db.generatePreparedStatement({
			action:	"read",
			table:	"roles",
			fields:	["roleId"],
			query:	{roleId: "#{roleId}"}
		})
		.withParam("roleId", roleId);
		
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
	
	as.createRole = function(roleId, roleName, next){
		var session = server.db.getSession();
		var statement = server.db.generatePreparedStatement({
			action:	"create",
			table:	"roles",
			values:	{
				roleId:			"#{roleId}",
				name:			"#{roleName}",
				members:		[],
				groupMembers:	[]
			}
		})
		.withParam("roleId", roleId)
		.withParam("roleName", roleName);
		
		session.execute(statement, function(err){
			next(err);
			session.close();
		})
	}
	
	as.updateRole = function(roleId, roleName, next){
		var session = server.db.getSession();
		var statement = server.db.generatePreparedStatement({
			action:	"update",
			table:	"roles",
			values:	{name: "#{roleName}"},
			query:	{roleId: "#{roleId}"}
		})
		.withParam("roleName", roleName)
		.withParam("roleId", roleId);
		
		session.execute(statement, function(err){
			next(err);
			session.close();
		});
	}
	
	as.getRolesForUser = function(username, next){
		var session = server.db.getSession();
		var statement = server.db.generatePreparedStatement({
			action:	"read",
			table:	"roles",
			fields:	["name", "roleId"],
			query:	{members:	"#[#{username}]"}
		})
		.withParam("username", username);
		
		session.execute(statement, function(err, findResponse){
			next(err, findResponse);
			session.close();
		});
	}
	
	as.getRolesForGroup = function(groupId, next){
		var session = server.db.getSession();
		var statement = server.db.generatePreparedStatement({
			action: "read",
			table:	"roles",
			fields:	["name", "roleId"],
			query:	{groupMembers:	"#[#{groupId}]"}
		})
		.withParam("groupId", groupId);
		
		session.execute(statement, function(err, findResponse){
			next(err, findResponse);
			session.close();
		});
	}
	
	as.getUsersForRole = function(roleId, next){
		var session = server.db.getSession();
		var statement = server.db.generatePreparedStatement({
			action:	"read",
			table:	"roles",
			fields:	["members"],
			query:	{roleId: "#{roleId}"}
		})
		.withParam("roleId", roleId);
		
		session.execute(statement, function(err, findResponse){
			if(err){
				next(err);
			}
			else {
				if(findResponse.getItems().length == 0){
					var exc = new AuthorizationServiceException({msg: "Request to find attached users for role '" + roleId + "' could not be completed. This role does not exist."});
					next(exc);
				}
				else {
					next(undefined, findResponse.iterator().next().members);
				}
			}
		});
	}
	
	as.addUserToRole = function(roleId, username, next){
		var session = server.db.getSession();
		var findStatement = server.db.generatePreparedStatement({
			action:	"read",
			table:	"roles",
			fields:	["members"],
			query:	{roleId: "#{roleId}"}
		})
		.withParam("roleId", roleId);
		
		session.execute(findStatement, function(err, findResponse){
			if(err){
				next(err);
			}
			else {
				if(findResponse.getItems().length == 0){
					var exc = new AuthorizationServiceException({msg: "Request to add user '" + username + "' to role '" + roleId + "' could not be completed. This role does not exist."});
					next(exc);
				}
				else {
					var members = findResponse.iterator().next().members;
					if(!Array.isArray(members)){
						if(members == undefined){
							members = [];
						}
						else {
							members = members.split(",");
							for(var i=0;i<members.length;i++){
								members[i] = members[i].trim();
							}
						}
					}
					
					if(members.indexOf(username) == -1){
						members.push(username);
					}
					
					var updateStatement = server.db.generatePreparedStatement({
						action:	"update",
						table:	"roles",
						values:	{members:	"#[#{members}]"},
						query:	{roleId:	"#{roleId}"}
					})
					.withParam("members", members.join(","))
					.withParam("roleId", roleId);
					
					session.execute(updateStatement, function(err){
						next(err);
						session.close();
					});
				}
			}
		});
	}
	
	as.removeUserFromRole = function(roleId, username, next){
		var session = server.db.getSession();
		var findStatement = server.db.generatePreparedStatement({
			action:	"read",
			table:	"roles",
			fields:	["members"],
			query:	{roleId: "#{roleId}"}
		})
		.withParam("roleId", roleId);
		
		session.execute(findStatement, function(err, findResponse){
			if(err){
				next(err);
			}
			else {
				if(findResponse.getItems().length == 0){
					var exc = new AuthorizationServiceException({msg: "Request to remove user '" + username + "' from role '" + roleId + "' could not be completed. This role does not exist."});
					next(exc);
				}
				else {
					var members = findResponse.iterator().next().members;
					if(!Array.isArray(members)){
						if(members == undefined){
							members = [];
						}
						else {
							members = members.split(",");
							for(var i=0;i<members.length;i++){
								members[i] = members[i].trim();
							}
						}
					}
					
					if(members.indexOf(username) == -1){
						var exc = new AuthorizationServiceException({msg: "Request to remove user '" + username + "' from role '" + roleId + "' could not be completed. User is not a member of role."});
						next(exc);
					}
					else {
						members.splice(members.indexOf(username), 1);
						var updateStatement = server.db.generatePreparedStatement({
							action:	"update",
							table:	"roles",
							values:	{members: "#[#{members}]"},
							query:	{roleId: "#{roleId}"}
						})
						.withParam("members", members.join(","))
						.withParam("roleId", roleId);
						
						session.execute(updateStatement, function(err){
							next(err);
							session.close();
						});
					}
				}
			}
		});
	}
	
	as.getGroupsForRole = function(roleId, next){
		var session = server.db.getSession();
		var statement = server.db.generatePreparedStatement({
			action:		"read",
			table:		"roles",
			fields:		["groupMembers"],
			query:		{roleId: "#{roleId}"}
		})
		.withParam("roleId", roleId);
		
		session.execute(statement, function(err, findResponse){
			if(err){
				next(err);
			}
			else {
				if(findResponse.getItems().length == 0){
					var exc = new AuthorizationServiceException({msg: "Request for groups in role '" + roleId + "' could not be completed. The role does not exist."});
					next(exc);
				}
				else {
					next(undefined, findResponse.iterator().next().groupMembers);
				}
			}
		});
	}
	
	as.addGroupToRole = function(roleId, groupId, next){
		var session = server.db.getSession();
		var findStatement = server.db.generatePreparedStatement({
			action:		"read",
			table:		"roles",
			fields:		["groupMembers"],
			query:		{roleId: "#{roleId}"}
		})
		.withParam("roleId", roleId);
		
		session.execute(findStatement, function(err, findResponse){
			if(err){
				next(err);
			}
			else {
				if(findResponse.getItems().length == 0){
					var exc = new AuthorizationServiceException({msg: "Request to remove group '" + groupId + "' from role '" + roleId + "' could not be completed. The role does not exist."});
					next(exc);
				}
				else {
					var groupMembers = findResponse.iterator().next().groupMembers;
					if(!Array.isArray(groupMembers)){
						if(groupMembers == undefined){
							groupMembers = [];
						}
						else {
							groupMembers = groupMembers.split(",");
							for(var i=0;i<groupMembers.length;i++){
								groupMembers[i] = groupMembers[i].trim();
							}
						}
					}
					
					if(groupMembers.indexOf(groupId) == -1){
						groupMembers.push(groupId);
					}
					
					var updateStatement = server.db.generatePreparedStatement({
						action:		"update",
						table:		"roles",
						values:		{groupMembers: "#[#{groupMembers}]"},
						query:		{roleId: "#{roleId}"}
					})
					.withParam("groupMembers", groupMembers)
					.withParam("roleId", roleId);
					
					session.execute(updateStatement, function(err){
						next(err);
						session.close();
					});
				}
			}
		});
	}
	
	as.removeGroupFromRole = function(roleId, groupId, next){
		var session = server.db.getSession();
		var findStatement = server.db.generatePreparedStatement({
			action:	"read",
			table:	"roles",
			fields:	["groupMembers"],
			query:	{roleId:	"#{roleId}"}
		})
		.withParam("roleId", roleId);
		
		session.execute(findStatement, function(err, findResponse){
			if(err){
				next(err);
			}
			else {
				if(findResponse.getItems().length == 0){
					var exc = new AuthorizationServiceException({msg: "Request to remove group '" + groupId + "' from role '" + roleId + "' could not be completed. The role does not exist."});
					next(exc);
				}
				else {
					var groupMembers = findResponse.iterator().next().groupMembers;
					if(!Array.isArray(groupMembers)){
						if(groupMembers == undefined){
							groupMembers = [];
						}
						else {
							groupMembers = groupMembers.split(",");
							for(var i=0;i<groupMembers.length;i++){
								groupMembers[i] = groupMembers[i].trim();
							}
						}
					}
					
					if(groupMembers.indexOf(groupId) == -1){
						var exc = new AuthorizationServiceException({msg: "Request to remove group '" + groupId + "' from role '" + roleId + "' could not be completed. The group is not attached to this role."});
						next(exc);	
					}
					else {
						groupMembers.splice(groupMembers.indexOf(groupId), 1);
						
						var updateStatement = server.db.generatePreparedStatement({
							action:		"update",
							table:		"roles",
							values:		{groupMembers: "#[#{groupMembers}]"},
							query:		{roleId: "#{roleId}"}
						})
						.withParam("groupMembers", groupMembers)
						.withParam("roleId", roleId);
						
						session.execute(updateStatement, next);
					}
				}
			}
		});
	}
	
	var AuthorizationServiceException = (function(settings, implementationContext){
		settings = (settings || {});
		this.name = "AuthorizationServiceException";
		
		this.type = "AuthorizationService";
		this.message = settings.msg || "An authorization service error occurred.";
		this.detail = "";
		this.extendedInfo = "";
		this.errorCode = (settings.code != null ? settings.code : 1);
		
		Error.captureStackTrace(this, (implementationContext || AuthorizationServiceException));
	});
	util.inherits(AuthorizationServiceException, Error);
	
	return as;
});

module.exports = AuthorizationService;