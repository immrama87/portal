var APIRoutes = (function(app){
	var api = {};
	
	var baseUrl = "/rest/v1";
	
	api.createParameter = function(param, process){
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
	
	api.registerRoute = function(routeUrl){
		return app.route(baseUrl + ((routeUrl.charAt(0) == "/") ? "" : "/") + routeUrl);
	}
	
	return api;
});

module.exports = APIRoutes;