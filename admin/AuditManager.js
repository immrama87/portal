var AuditManager = (function(){
	var am = {};
	
	var AdminException = require("./AdminException");
	
	am.setupRoutes = function(app){
		server.api.createParameter(app, "reversionId");
	}
	
	am.createPublishAuditRecord = function(objectId, versionId, type, next){
		var session = server.db.getSession();
		var statement = server.db.generatePreparedStatement({
			action:	"create",
			table:	"changeLogs",
			values:	{
				object_id:	"#{objectId}",
				version_id:	"#{versionId}",
				object_type:"#{type}",
				audit_id:	createChangeId(),
				audit_type:	"publish"
			}
		})
		.withParam("objectId", objectId)
		.withParam("versionId", versionId)
		.withParam("type", type);
		
		session.execute(statement, function(err){
			next(err);
			session.close();
		});
	}
	
	am.createChangeAuditRecord = function(objectId, versionId, type, change, next){
		var session = server.db.getSession();
		var statement = server.db.generatePreparedStatement({
			action:	"create",
			table:	"changeLogs",
			values:	{
				object_id: 		"#{objectId}",
				version_id:		"#{versionId}",
				object_type:	"#{type}",
				audit_id:		"#{changeId}",
				audit_type:		"change",
				change:			"#{change}"
			}
		})
		.withParam("objectId", objectId)
		.withParam("versionId", versionId)
		.withParam("type", type)
		.withParam("changeId", createChangeId())
		.withParam("change", JSON.stringify(change));
		
		session.execute(statement, function(err){
			next(err);
			session.close();
		});
	}
	
	am.createReversionAuditRecord = function(objectId, versionId, type, changes, next){
		var session = server.db.getSession();
		var idLookup = server.db.generatePreparedStatement({
			action:	"read",
			table:	"changeLogs",
			fields:	["createdAt"],
			query:	{audit_id: "#{auditId}"}
		})
		.withParam("auditId", changes.reversionId);
		
		session.execute(idLookup, function(err, lookupResponse){
			if(err){
				next(err);
				session.close();
			}
			else {
				if(lookupResponse.getItems().length == 0){
					var exc = new AdminException({msg: "Could not create reversion change log entry for reversion to '" + changes.reversionId + "'. No change log with this ID exists."});
					next(exc);
					session.close();
				}
				else if(lookupResponse.getItems().length > 1){
					var exc = new AdminException({msg: "Could not create reversion change log entry for reversion to '" + changes.reversionId + "'. Multiple entries with this ID exist."});
					next(exc);
					session.close();
				}
				else {
					changes.reversionDate = lookupResponse.iterator().next().createdAt;
					var statement = server.db.generatePreparedStatement({
						action:	"create",
						table:	"changeLogs",
						values:	{
							object_id:		"#{objectId}",
							version_id:		"#{versionId}",
							object_type:	"#{type}",
							audit_id:		"#{changeId}",
							audit_type:		"reversion",
							change:			"#{change}"
						}
					})
					.withParam("objectId", objectId)
					.withParam("versionId", versionId)
					.withParam("type", type)
					.withParam("changeId", createChangeId())
					.withParam("change", JSON.stringify(changes));

					session.execute(statement, function(createErr){
						next(createErr);
						session.close();
					});
				}
			}
		});
	}
	
	am.createVersionRevertAuditRecord = function(objectId, versionId, type, revertVersionId, next){
		var session = server.db.getSession();
		var statement = server.db.generatePreparedStatement({
			action:	"create",
			table:	"changeLogs",
			values:	{
				object_id:		"#{objectId}",
				version_id:		"#{versionId}",
				object_type:	type,
				audit_id:		createChangeId(),
				audit_type:		"revert-version",
				change:			JSON.stringify({version: revertVersionId})
			}
		})
		.withParam("objectId", objectId)
		.withParam("versionId", versionId);
		
		session.execute(statement, function(err){
			next(err);
			session.close();
		});
	}
	
	am.getChanges = function(objectId, versionId, type, next){
		var session = server.db.getSession();
		var statement = server.db.generatePreparedStatement({
			action:		"read",
			table:		"changeLogs",
			fields:		["audit_type", "change", "createdAt", "audit_id"],
			query:		{
				object_id:		"#{objectId}",
				version_id:		"#{versionId}",
				object_type:	"#{type}"
			},
			sort:		{"createdAt":	"descending"}
		})
		.withParam("objectId", objectId)
		.withParam("versionId", versionId)
		.withParam("type", type);
		
		session.execute(statement, function(err, findResponse){
			next(err, findResponse);
			session.close();
		});
	}
	
	am.createReversionManifest = function(auditId, next){
		var session = server.db.getSession();
		var idLookup = server.db.generatePreparedStatement({
			action:	"read",
			table:	"changeLogs",
			fields:	["object_id", "version_id", "object_type", "createdAt", "audit_type"],
			query:	{audit_id: "#{auditId}"}
		})
		.withParam("auditId", auditId);
		
		session.execute(idLookup, function(err, lookupResponse){
			if(err){
				next(err);
				session.close();
			}
			else {
				if(lookupResponse.getItems().length == 0){
					var exc = new AdminException({msg: "Could not create reversion manifest for change log entry '" + auditId + "'. No change log with this ID exists."});
					next(exc);
					session.close();
				}
				else if(lookupResponse.getItems().length > 1){
					var exc = new AdminException({msg: "Could not create reversion manifest for change log entry '" + auditId + "'. Multiple entries with this ID exist."});
					next(exc);
					session.close();
				}
				else {
					var changeEntry = lookupResponse.iterator().next();
					var manifestLookup = server.db.generatePreparedStatement({
						action:	"read",
						table:	"changeLogs",
						fields:	["audit_type", "change", "audit_id"],
						query:	{
							object_id: 		"#{objectId}",
							version_id:		"#{versionId}",
							object_type:	"#{type}",
							createdAt:		{$gt: "#{reversionTime}"}
						},
						sort:	{"createdAt":	"descending"}
					})
					.withParam("objectId", changeEntry.object_id)
					.withParam("versionId", changeEntry.version_id)
					.withParam("type",	changeEntry.object_type)
					.withParam("reversionTime", changeEntry.createdAt);
					
					session.execute(manifestLookup, function(manifestErr, manifest){
						if(manifestErr){
							next(manifestErr);
						}
						else {
							var changes = [];
							for(var i=0;i<manifest.getItems().length;i++){
								changes.push(manifest.get(i));
							}
							next(undefined, changes);
						}
						session.close();
					});
				}
			}
		});
	}
	
	function createChangeId(){
		var index = 0;
		var template = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";
		while((index = template.indexOf("x")) > -1){
			template = template.substring(0, index) + (Math.floor(Math.random() * 16)).toString(16) + template.substring(index+1);
		}
		
		var y = ["8", "9", "a", "b"];
		template = template.replace("y", y[Math.floor(Math.random() * 4)]);
		
		return template;
	}
	
	return am;
});

module.exports = AuditManager;