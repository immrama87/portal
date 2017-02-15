var Licensing = (function(app, config, writeConfig){
	server.api.registerRoute(app, "config/license")
		.get(function(req, res){
			res.status(200).end(JSON.stringify(server.licensingService.getLicenseDetails()));
		})
		.post(function(req, res){
			server.licensingService.setLicenseDetails(req.body.license, function(){
				config.licenseKey = req.body.license;
				writeConfig(function(err){
					if(err){
						app.serveError(500, err, res);
					}
					else {
						res.status(200).end();
					}
				});
			});
		});
		
	server.api.registerRoute(app, "config/license/server-id")
		.get(function(req, res){
			res.status(200).end(JSON.stringify({serverId: server.serverId}));
		});
});

module.exports = Licensing;