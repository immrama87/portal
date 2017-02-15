var DatabaseAppender = (function(config){
	var da = {};
	
	var parser = require("./PatternParser")(config.pattern);
	
	da.append = function(data){
		var status = {
			complete: false
		};
		var session = server.db.getSession();
		var values = {};
		for(var key in data.m){
			values[key] = "#{" + key + "}";
		}
		
		values.level = "#{level}";
		var statement = server.db.generatePreparedStatement({
			action:		"create",
			table:		config.table,
			values:		values
		});
		
		for(var key in data.m){
			statement.setParam(key, data.m[key]);
		}
		statement.setParam("level", data.p);
		
		session.execute(statement, function(err){
			if(err){
				console.log("Error appending log to database.");
				throw err;
			}
			else {
				status.complete = true;
				if(status.hasOwnProperty("oncomplete") && typeof status.oncomplete == "function"){
					status.oncomplete();
				}
			}
		});
		
		return status;
	}
	
	return da;
});

module.exports = DatabaseAppender;