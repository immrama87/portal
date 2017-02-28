var AdminException = require("./AdminException");

var VersionManager = (function(){
	var vm = {};
	
	vm.setupRoutes = function(app){
		server.api.createParameter(app, "versionId");
	}
	
	vm.getObjectVersions = function(objectId, type, next, session){
		session = session || server.db.getSession();
		var statement = server.db.generatePreparedStatement({
			action:		"read",
			table:		"versions",
			fields:		["version", "active", "activeDraft"],
			query:		{
				object_id: 		"#{objectId}",
				object_type:	"#{type}"
			}
		})
		.withParam("objectId", objectId)
		.withParam("type", type);
		
		session.execute(statement, function(err, findResponse){
			next(err, findResponse);
			session.close();
		});
	}
	
	vm.getActiveObjectVersion = function(objectId, type, next){
		var session = server.db.getSession();
		var statement = server.db.generatePreparedStatement({
			action:		"read",
			table:		"versions",
			fields:		["version"],
			query:		{
				object_id: 		"#{objectId}", 
				object_type:	"#{type}",
				active: 		"true"
			}
		})
		.withParam("objectId", objectId)
		.withParam("type", type);
		
		session.execute(statement, function(err, findResponse){
			if(err){
				next(err);
			}
			else {
				if(findResponse.getItems().length == 0){
					var exc = new AdminException({code: 0, msg: "Error retrieving active version for object ID '" + objectId + "'. No active version found."});
					next(exc);
				}
				else if(findResponse.getItems().length > 1){
					var exc = new AdminException({msg: "Error retrieving active version for object ID '" + objectId + "'. Multiple active versions found."});
					next(exc);
				}
				else {
					next(undefined, findResponse.iterator().next());
				}
			}
			
			session.close();
		});
	}
	
	vm.createDraft = function(objectId, type, next, session){
		session = session || server.db.getSession();
		var draftLookup = server.db.generatePreparedStatement({
			action:	"read",
			table:	"versions",
			fields:	["version"],
			query:	{
				object_id:		"#{objectId}",
				object_type:	"#{type}",
				version:		"draft"
			}
		})
		.withParam("objectId", objectId)
		.withParam("type", type);
		
		session.execute(draftLookup, function(lookupErr, draftVersion){
			if(lookupErr){
				next(lookupErr);
				session.close();
			}
			else if(draftVersion.getItems().length > 0){
				var exc = new AdminException({msg: "Could not create draft version for object ID '" + objectId + ". A draft for this object already exists."});
				next(exc);
				session.close();
			}
			else {
				var createStatement = server.db.generatePreparedStatement({
					action:		"create",
					table:		"versions",
					values:		{
						object_id:		"#{objectId}",
						object_type:	"#{type}",
						version:		"draft",
						activeDraft:	"true"
					}
				})
				.withParam("objectId", objectId)
				.withParam("type", type);
				
				session.execute(createStatement, function(createErr){
					next(createErr);
					session.close();
				});
			}
		});
	}
	
	vm.publishVersion = function(objectId, type, next){
		deactivateActiveObjectVersion(objectId, type, function(activeErr, versionNum){
			versionNum = versionNum || 0;
			var newVersion = parseInt(versionNum) + 1;
			var session = server.db.getSession();
			var draftLookup = server.db.generatePreparedStatement({
				action:		"read",
				table:		"versions",
				fields:		["version"],
				query:		{
					object_id:		"#{objectId}",
					object_type:	"#{type}",
					version:		"draft"
				}
			})
			.withParam("objectId", objectId)
			.withParam("type", type);
			
			session.execute(draftLookup, function(err, draftVersion){
				if(err){
					next(err);
					session.close();
				}
				else {
					if(draftVersion.getItems().length == 0){
						var exc = new AdminException({msg: "Error publishing draft version for object ID '" + objectId + "'. No draft version found."});
						next(exc);
						session.close();
					}
					else if(draftVersion.getItems().length > 1){
						var exc = new AdminException({msg: "Error publishing draft version for object ID '" + objectId + "'. Multiple draft versions found."});
						next(exc);
						session.close();
					}
					else {
						var updateDraft = server.db.generatePreparedStatement({
							action:	"update",
							table:	"versions",
							values:	{
								version: 		"#{version}",
								active:			"true",
								activeDraft:	"false"
							},
							query:	{
								object_id:		"#{objectId}",
								object_type:	"#{type}",
								version:		"draft"
							}
						})
						.withParam("version", newVersion.toString())
						.withParam("objectId", objectId)
						.withParam("type", type);
						
						session.execute(updateDraft, function(updateErr){
							next(updateErr, newVersion.toString());
							session.close();
						});
					}
				}
			});
		});
	}
	
	vm.analyzeChanges = function(original, replacement){
		var changes = [];
		
		for(var key in replacement){
			if(key != "key"){
				if(original[key] != replacement[key]){
					changes.push({field: key, value: replacement[key], original: original[key]});
				}
			}
		}
		
		return changes;
	}
	
	vm.compareVersionObjects = function(original, replacement, objectKey){
		var changes = {};
		var added = [];
		var removed = [];
		for(var i=0;i<original.length;i++){
			var found = false;
			for(var j=0;j<replacement.length;j++){
				if(replacement[j][objectKey] == original[i][objectKey]){
					found = true;
					for(var key in original[i]){
						if(original[i][key] != replacement[j][key]){
							if(!changes.hasOwnProperty(original[i][objectKey])){
								changes[original[i][objectKey]] = [];
							}
							
							var change = {
								field:		key,
								value: 		replacement[j][key],
								original:	original[i][key]
							};
							changes[original[i][objectKey]].push(change);
						}
					}
					break;
				}
			}
			if(!found){
				removed.push(original[i]);
			}
		}
		
		for(var j=0;j<replacement.length;j++){
			var found = false;
			for(var k=0;k<original.length;k++){
				if(original[k][objectKey] == replacement[j][objectKey]){
					found = true;
					break;
				}
			}
			
			if(!found){
				added.push(replacement[j]);
			}
		}
		
		return {
			changes:	changes,
			added:		added,
			removed:	removed
		};
	}
	
	function deactivateActiveObjectVersion(objectId, type, next){
		vm.getActiveObjectVersion(objectId, type, function(activeErr, activeVersion){
			if(activeErr && activeErr.errorCode != 0){
				next(activeErr);
			}
			else if(activeErr && activeErr.errorCode == 0){
				next();
			}
			else {
				var session = server.db.getSession();
				var deactivateStatement = server.db.generatePreparedStatement({
					action:	"update",
					table:	"versions",
					values:	{active: "false"},
					query:	{
						object_id:		"#{objectId}",
						object_type:	"{type}",
						active:			"true"
					}
				})
				.withParam("objectId", objectId)
				.withParam("type", type);
				
				session.execute(deactivateStatement, function(deactivateErr){
					if(deactivateErr){
						next(deactivateErr);
					}
					else {
						next(undefined, activeVersion.version);
					}
					session.close();
				});
			}		
		});
	}
	
	return vm;
});

module.exports = VersionManager;