var APIRoutes = (function(){
	var api = {};
	
	var baseUrl = "/rest/v1";
	
	api.configureRouteAuthorization = function(app, routeUrl, roles, handleFail){
		server.authorizationService.configureRouteAuthorization(app, baseUrl + ((routeUrl.charAt(0) == "/") ? "" : "/") + routeUrl, roles, handleFail);
	}
	
	api.createParameter = function(app, param, process){
		app.param(param, function(req, res, next, id){
			req[param] = id;
			if(typeof process == "function"){
				process(req, res, next);
			}
			else {
				next();
			}
		});
	}
	
	api.registerRoute = function(app, routeUrl){
		return app.route(baseUrl + ((routeUrl.charAt(0) == "/") ? "" : "/") + routeUrl);
	}
	
	return api;
});

module.exports = APIRoutes;