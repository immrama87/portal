var Screens = (function(app){
	server.api.registerRoute(app, "admin/portals/:portalId/screens")
		.get(function(req, res){
			var session = server.db.getSession();
			var statement = server.db.generatePreparedStatement({
				action:		"read",
				table:		"screens",
				fields:		["name", "type", "screen_id"],
				query:		{portal_id: "#{portalId}"}
			})
			.withParam("portalId", req.portalId);
			
			session.execute(statement, function(err, findResponse){
				if(err){
					app.serveError(500, err, res);
				}
				else {
					res.status(200).end(JSON.stringify(findResponse.getItems()));
				}
			});
		});
});

module.exports = Screens;