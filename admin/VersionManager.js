var VersionManager = (function(){
	var vm = {};
	
	vm.getObjectVersions = function(objectId, next){
		var session = server.db.getSession();
		var statement = server.db.generatePreparedStatement({
			action:		"read",
			table:		"versions",
			fields:		["version", "active", "activeDraft"],
			query:		{object_id: "#{objectId}"}
		})
		.withParam("objectId", objectId);
		
		session.execute(statement, function(err, findResponse){
			next(err, findResponse);
			session.close();
		});
	}
	
	return vm;
});

module.exports = VersionManager;