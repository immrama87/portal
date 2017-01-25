var util = require("util");

var AuthorizationService = (function(){
	var as = {};
	
	as.setupRoutes = function(app){
		server.api.createParameter("groupId");
		server.api.registerRoute("auth/groups/:groupId/roles")
			.get(function(req, res){
				var session = server.db.getSession();
				var statement = server.db.generatePreparedStatement({
					action:	"read",
					table:	"roles",
					fields:	["name", "roleId"],
					query:	{groupMembers: "#[#{groupId}]"}
				})
				.withParam("groupId", req.groupId);
				
				session.execute(statement, function(err, findResponse){
					if(err){
						app.serveError(500, err, res);
					}
					else {
						res.status(200).end(JSON.stringify(findResponse.getItems()));
					}
				});
			});
			
		server.api.createParameter("username");
		server.api.registerRoute("auth/users/:username/roles")
			.get(function(req, res){
				var session = server.db.getSession();
				var statement = server.db.generatePreparedStatement({
					action:	"read",
					table:	"roles",
					fields:	["name", "roleId"],
					query:	{members:	"#[#{username}]"}
				})
				.withParam("username", req.username);
				
				session.execute(statement, function(err, findResponse){
					if(err){
						app.serveError(500, err, res);
					}
					else {
						res.status(200).end(JSON.stringify(findResponse.getItems()));
					}
					session.close();
				});
			});
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
			next(err, (findResponse.getItems().length > 0));
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