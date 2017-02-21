var util = require("util");
var crypto = require("crypto");
var csprng = require("csprng");

var InternalDirectory = (function(){
	var id = {};
	var settings;
	
	id.config = function(config){
		settings = config;
	}
	
	id.getUsers = function(next){
		var session = server.db.getSession();
		var statement = server.db.generatePreparedStatement({
			action:	"read",
			table:	"users",
			fields:	["username", "fn", "ln"],
			query:	{}
		});
		
		session.execute(statement, function(err, findResponse){
			if(err){
				next(err);
			}
			else {
				next(undefined, findResponse.getItems());
			}
		});
	}
	
	id.getUser = function(username, next){
		var session = server.db.getSession();
		var statement = server.db.generatePreparedStatement({
			action:	"read",
			table:	"users",
			fields:	["username", "fn", "ln", "email"],
			query:	{username: "#{username}"}
		})
		.withParam("username", username);
		
		session.execute(statement, function(err, findResponse){
			if(err){
				next(err);
			}
			else {
				if(findResponse.getItems().length == 1){
					next(undefined, findResponse.getItems()[0]);
				}
				else if(findResponse.getItems().length > 1){
					var exc = new InternalDirectoryException({msg: "Multiple users found with username '" + username + "'. Could not retrieve details."});
					next(exc);
				}
				else {
					var exc = new InternalDirectoryException({code: 0, msg: "No user with username '" + username + "' could be found."});
					next(exc);
				}
			}
		});
	}
	
	id.userExists = function(username, next){
		var session = server.db.getSession();
		var statement = server.db.generatePreparedStatement({
			action:	"read",
			table:	"users",
			fields:	["username"],
			query:	{username:	"#{username}"}
		})
		.withParam("username", username);
		
		session.execute(statement, function(err, findResponse){
			if(err){
				next(err);
			}
			else {
				next(undefined, (findResponse.getItems().length > 0));
			}
		});
	}
	
	id.createUser = function(username, data, next){
		var session = server.db.getSession();
		var statement = server.db.generatePreparedStatement({
			action:	"create",
			table:	"users",
			values:	{
				username:		"#{username}",
				fn:				"#{fn}",
				ln:				"#{ln}",
				email:			"#{email}",
				password:		"#{password}",
				createDate:		"#{createDate}",
				modifiedDate:	"#{createDate}",
				secret:			"#{secret}"
			}
		});
		
		var required = ["fn", "ln", "password"];
		var createDate = new Date().getTime();
		var secret = csprng(256, 36);
		
		var missing = [];
		for(var i=0;i<required.length;i++){
			if(!data.hasOwnProperty(required[i]) || data[required[i]] == ""){
				missing.push(required[i]);
			}
		}
		
		if(missing.length > 0){
			var err = new InternalDirectoryException({msg: "Could not create user '" + username + "'. The following required values were not provided: " + missing.join(", ")});
			next(err);
		}
		else {
			statement.setParam("username", username);
			statement.setParam("fn", data.fn);
			statement.setParam("ln", data.ln);
			statement.setParam("email", (data.email || ""));
			statement.setParam("password", encryptPassword(username, data.password, createDate, secret));
			statement.setParam("createDate", createDate);
			statement.setParam("secret", secret);
			
			session.execute(statement, next);
		}
	}
	
	id.updateUser = function(username, data, next){
		var session = server.db.getSession();
		var values = {};
		values.modifiedDate = "#{modifiedDate}";
		if(data.hasOwnProperty("fn")){
			values.fn = "#{fn}";
		}
		if(data.hasOwnProperty("ln")){
			values.ln = "#{ln}";
		}
		if(data.hasOwnProperty("email")){
			values.email = "#{email}";
		}
		
		var statement = server.db.generatePreparedStatement({
			action:	"update",
			table:	"users",
			values: values,
			query:	{username: "#{username}"}
		})
		.withParam("fn", data.fn || "")
		.withParam("ln", data.ln || "")
		.withParam("email", data.email || "")
		.withParam("modifiedDate", new Date().getTime().toString())
		.withParam("username", username);
		
		session.execute(statement, function(err){
			if(err){
				next(err);
			}
			else if(data.hasOwnProperty("password")){
				updateUserPassword(username, data.password, next);
			}
			else {
				next();
			}
		});
	}
	
	id.deleteUser = function(username, next){
		var session = server.db.getSession();
		var statement = server.db.generatePreparedStatement({
			action:	"delete",
			table:	"users",
			query:	{username: "#{username}"}
		})
		.withParam("username", username);
		
		session.execute(statement, next);
	}
	
	id.getGroups = function(next){
		var session = server.db.getSession();
		var statement = server.db.generatePreparedStatement({
			action:	"read",
			table:	"groups",
			fields:	["name", "displayName"],
			query:	{}
		});
		
		session.execute(statement, function(err, findResponse){
			if(err){
				next(err);
			}
			else {
				next(undefined, findResponse.getItems());
			}
		});
	}
	
	id.getGroup = function(groupName, next){
		var session = server.db.getSession();
		var statement = server.db.generatePreparedStatement({
			action:	"read",
			table:	"groups",
			fields:	["name", "displayName"],
			query:	{name: "#{groupName}"}
		})
		.withParam("groupName", groupName);
		
		session.execute(statement, function(err, findResponse){
			if(err){
				next(err);
			}
			else {
				if(findResponse.getItems().length > 1){
					var exc = new InternalDirectoryException({msg: "Multiple groups with group name '" + groupName + "' were found. Could not retrieve group details."});
					next(exc);
				}
				else if(findResponse.getItems().length == 0){
					var exc = new InternalDirectoryException({code: 0, msg: "No group with group name '" + groupName + "' could be found."});
					next(exc);
				}
				else {
					next(undefined, findResponse.iterator().next());
				}
			}
		});
	}
	
	id.getGroupsForUser = function(username, next){
		var session = server.db.getSession();
		var statement = server.db.generatePreparedStatement({
			action:	"read",
			table:	"groups",
			fields:	["name", "displayName"],
			query:	{members:	"#[#{username}]"}
		})
		.withParam("username", username);
		
		session.execute(statement, function(err, findResponse){
			if(err){
				next(err);
			}
			else {
				next(undefined, findResponse.getItems());
			}
		});
	};
	
	id.getUsersInGroup = function(groupName, next){
		var session = server.db.getSession();
		var statement = server.db.generatePreparedStatement({
			action:	"read",
			table:	"groups",
			fields:	["members"],
			query:	{name: "#{groupName}"}
		})
		.withParam("groupName", groupName);
		
		session.execute(statement, function(err, findResponse){
			if(err){
				next(err);
			}
			else {
				if(findResponse.getItems().length == 0){
					var exc = new InternalDirectoryException({msg: "Request to retrieve membership for group '" + groupName + "' could not be completed. No such group exists."});
					next(exc);
				}
				else {
					next(undefined, findResponse.iterator().next().members);
				}
			}
		});
	}
	
	id.addUserToGroup = function(groupName, username, next){
		var session = server.db.getSession();
		var findStatement = server.db.generatePreparedStatement({
			action:	"read",
			table:	"groups",
			fields:	["members"],
			query:	{name:	"#{groupName}"}
		})
		.withParam("groupName", groupName);
		
		session.execute(findStatement, function(err, findResponse){
			if(err){
				next(err);
			}
			else {
				if(findResponse.getItems().length == 0){
					var exc = new InternalDirectoryException({msg: "Request to add user '" + username + "' to group '" + groupName + "' could not be completed. No such group exists."});
					next(exc);
				}
				else {
					var groupMembers = findResponse.iterator().next().members;
					if(!Array.isArray(groupMembers)){
						if(groupMembers != undefined){
							groupMembers = groupMembers.split(",");
							for(var i=0;i<groupMembers.length;i++){
								groupMembers[i] = groupMembers[i].trim();
							}
						}
						else {
							groupMembers = [];
						}
					}
					
					groupMembers.push(username);
					var updateStatement = server.db.generatePreparedStatement({
						action:	"update",
						table:	"groups",
						values:	{members:	"#[#{groupMembers}]"},
						query:	{name:	"#{groupName}"}
					})
					.withParam("groupMembers", groupMembers.join(","))
					.withParam("groupName", groupName);
					
					session.execute(updateStatement, next);
				}
			}
		});
	}
	
	id.removeUserFromGroup = function(groupName, username, next){
		var session = server.db.getSession();
		var findStatement = server.db.generatePreparedStatement({
			action:	"read",
			table:	"groups",
			fields:	["members"],
			query:	{name: "#{groupName}"}
		})
		.withParam("groupName", groupName);
		
		session.execute(findStatement, function(err, findResponse){
			if(err){
				next(err);
			}
			else {
				if(findResponse.getItems().length == 0){
					var exc = new InternalDirectoryException({msg: "Request to remove user '" + username + "' from group '" + groupName + "' could not be completed. No such group exists."});
					next(exc);
				}
				else {
					var groupMembers = findResponse.iterator().next().members;
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
					
					if(groupMembers.indexOf(username) == -1){
						var exc = new InternalDirectoryException({msg: "Request to remove user '" + username + "' from group '" + groupName + "' could not be completed. User is not a member of the group."});
						next(exc);
					}
					else {
						groupMembers.splice(groupMembers.indexOf(username), 1);
						var updateStatement = server.db.generatePreparedStatement({
							action:	"update",
							table:	"groups",
							values:	{members:	"#[#{groupMembers}]"},
							query:	{name:	"#{groupName}"}
						})
						.withParam("groupMembers", groupMembers.join(","))
						.withParam("groupName", groupName);
						
						session.execute(updateStatement, function(err){
							next(err);
						});
					}
				}
			}
		});
	}
	
	id.groupExists = function(groupName, next){
		var session = server.db.getSession();
		var statement = server.db.generatePreparedStatement({
			action:	"read",
			table:	"groups",
			fields:	["name"],
			query:	{name: "#{groupName}"}
		})
		.withParam("groupName", groupName);
		
		session.execute(statement, function(err, findResponse){
			next(err, (findResponse.getItems().length > 0));
			session.close();
		});
	}
	
	id.createGroup = function(groupName, data, next){
		var session = server.db.getSession();
		var statement = server.db.generatePreparedStatement({
			action: "create",
			table:	"groups",
			values:	{
				name:			"#{groupName}",
				displayName:	"#{displayName}"
			}
		});
		
		if(!data.hasOwnProperty("displayName") || data.displayName == ""){
			var exc = new InternalDirectoryException({msg: "Could not create group '" + groupName + "'. A displayName value must also be provided."});
			next(exc);
		}
		else {
			statement.setParam("groupName", groupName);
			statement.setParam("displayName", data.displayName);
			
			session.execute(statement, function(err){
				next(err);
				session.close();
			});
		}
	}
	
	id.updateGroup = function(groupName, data, next){
		var session = server.db.getSession();
		var values = {};
		if(data.hasOwnProperty("displayName") && data.displayName != ""){
			values.displayName = "#{displayName}";
		}
		var statement = server.db.generatePreparedStatement({
			action:		"update",
			table:		"groups",
			values:		values,
			query:		{name:	"#{groupName}"}
		})
		.withParam("displayName", data.displayName)
		.withParam("groupName", groupName);
		
		session.execute(statement, function(err){
			next(err);
			session.close();
		});
	}
	
	id.deleteGroup = function(groupName, next){
		if(groupName == "portal-admins" || groupName == "portal-users"){
			var exc = new InternalDirectoryException({msg: "Request to delete group could not be processed. Group '" + groupName + "' is a system-generated group and cannot be deleted."});
			next(exc);
		}
		else {
			var session = server.db.getSession();
			var statement = server.db.generatePreparedStatement({
				action:		"delete",
				table:		"groups",
				query:		{name:	"#{groupName}"}
			})
			.withParam("groupName", groupName);
			
			session.execute(statement, function(err){
				next(err);
				session.close();
			});
		}
	}
	
	id.authenticateUser = function(username, password, next){
		var session = server.db.getSession();
		var findStatement = server.db.generatePreparedStatement({
			action:	"read",
			table:	"users",
			fields:	["createDate", "secret", "password"],
			query:	{username: "#{username}"}
		})
		.withParam("username", username);
		
		session.execute(findStatement, function(err, findResponse){
			if(err){
				next(err);
			}
			else {
				if(findResponse.getItems().length == 0){
					var exc = new InternalDirectoryException({msg: "No user with username '" + username + "' could be found."});
					next(exc);
					session.close();
				}
				else {
					var user = findResponse.iterator().next();
					var passToMatch = encryptPassword(username, password, user.createDate, user.secret);
					next(undefined, (passToMatch == user.password));
					session.close();
				}
			}
		});
	}
	
	id.setLastLogin = function(username, next){
		var session = server.db.getSession();
		var statement = server.db.generatePreparedStatement({
			action:		"update",
			table:		"users",
			values:		{lastLogin: "#{lastLogin}"},
			query:		{username: "#{username}"}
		})
		.withParam("lastLogin", Date.now())
		.withParam("username", username);
		
		session.execute(statement, function(err){
			next(err);
			session.close();
		});
	}
	
	function updateUserPassword(username, password, next){
		var session = server.db.getSession();
		var findStatement = server.db.generatePreparedStatement({
			action:	"read",
			table:	"users",
			fields:	["createDate", "secret"],
			query:	{username:	"#{username}"}
		})
		.withParam("username", username);
		
		session.execute(findStatement, function(err, findResponse){
			if(err){
				next(err);
				session.close();
			}
			else {
				if(findResponse.getItems().length == 0){
					var exc = new InternalDirectoryException({msg: "No user with username '" + username + "' could be found."});
					next(exc);
					session.close();
				}
				else {
					var user = findResponse.iterator().next();
					var updateStatement = server.db.generatePreparedStatement({
						action:	"update",
						table:	"users",
						values:	{password:	"#{password}"},
						query:	{username:	"#{username}"}
					})
					.withParam("password", encryptPassword(username, password, user.createDate, user.secret))
					.withParam("username", username);
					
					session.execute(updateStatement, function(updateErr){
						next(updateErr);
						session.close();
					});
				}
			}
		});
	}
	
	function encryptPassword(username, password, createDate, salt){
		var hash = crypto.createHash("md5");
		var m = username + password + salt.toString();
		var iters = parseInt(createDate.toString().substring(createDate.toString().length - 6));
		
		for(var i=0;i<iters;i++){
			hash.update(m);
		}
		
		return hash.digest("hex");
	}
	
	var InternalDirectoryException = (function(settings, implementationContext){	
		settings = (settings || {});
		this.name = "InternalDirectoryException";
		
		this.type = "DirectoryService";
		this.message = settings.msg || "An internal directory service error occurred.";
		this.detail = "";
		this.extendedInfo = "";
		this.errorCode = (settings.code != null ? settings.code : 1);
		
		Error.captureStackTrace(this, (implementationContext || InternalDirectoryException));
	});
	util.inherits(InternalDirectoryException, Error);
	
	return id;
});

module.exports = InternalDirectory;

module.exports.properties = {
	name:			"Internal",
	description:	"A driver for interacting with the internal database for managing application users/groups",
	author:			"Column Technologies",
	readonly:		false,
	properties:		[
		{
			name:			"Name",
			key:			"key",
			defaultValue:	"Internal",
			locked:			true
		}
	]
}