var AdminException = require("./AdminException");

var Admin = (function(){
	var a = {};
	
	var versionManager = require("./VersionManager")();
	var auditManager = require("./AuditManager")();
	
	var modules = [
		{
			name:		"Portals",
			submodules:	[]
		},
		{
			name:			"Color Schemes",
			submodules:		[]
		}
	];
	
	a.setupRoutes = function(app){
		server.authorizationService.configureRouteAuthorization(app, "/admin", ["300"]);
		app.route("/admin")
			.get(function(req, res, next){
				req.url = "/admin/index.html";
				next();
			});
			
		app.route("/admin/modules")
			.get(function(req, res){
				res.status(200).end(JSON.stringify(modules));
			});
			
		app.route("/admin/*")
			.get(function(req, res, next){
				if(req.url.indexOf(".") > -1){
					next();
				}
				else {
					req.url = "/admin/index.html";
					next();
				}
			});
		server.api.configureRouteAuthorization(app, "/admin", ["300"]);
		versionManager.setupRoutes(app);
		auditManager.setupRoutes(app);
		require("./api/Portals")(app, versionManager, AdminException);
		require("./api/Screens")(app, versionManager, AdminException);
		require("./api/Colors")(app, versionManager, auditManager, AdminException);
		require("./api/Config")(app, AdminException);
	}
	
	return a;
})();

module.exports = Admin;