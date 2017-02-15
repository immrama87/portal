var Admin = (function(){
	var a = {};
	
	var modules = [
		{
			name:		"Portals",
			submodules:	[]
		}
	];
	
	a.setupRoutes = function(app){
		server.authorizationService.configureRouteAuthorization(app, "/admin", ["300"]);
		app.route("/admin")
			.get(function(req, res, next){
				req.url = "/admin/index.html";
				next();
			});
			
		server.api.configureRouteAuthorization(app, "/admin", ["300"]);
		server.api.registerRoute(app, "/admin/modules")
			.get(function(req, res){
				res.status(200).end(JSON.stringify(modules));
			});
	}
	
	return a;
})();

module.exports = Admin;