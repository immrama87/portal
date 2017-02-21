var Config = (function(app, AdminException){
	server.api.registerRoute(app, "admin/config/groups")
		.get(function(req, res){
			if(!server.hasOwnProperty("dirs")){
				var exc = new AdminException({msg: "Request for groups could not be processed. No directories have been initialized."});
				app.serveError(500, exc, res);
			}
			else {
				var collectionResourceResponse = new server.utils.CollectionResourceResponse(server.dirs, function(item, next){
					item.getGroups(next);	
				})
				.oncomplete(function(response){
					res.status(200).end(JSON.stringify(response));
				})
				.onfail(function(err){
					app.serveError(500, err, res);
				})
				.process();
			}
		});
});

module.exports = Config;