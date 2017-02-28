var mongo = require("mongodb");
var util = require("util");
var MongoClient = mongo.MongoClient;

/**
 *	@module
 *	MongoDbDriver
 *	The default driver for MongoDB databases, including methods for setup, verification and all CRUD functions
 */
module.exports = (function(){
	var d = {};
	var settings;
	var actions = {
		"read":		find,
		"create":	insert,
		"update":	update,
		"delete":	remove
	};
	var errorLog = LogManager.getLogger("error");
	var dbLog = LogManager.getLogger("db");
	
	/**
	 *	config
	 *	Configures the connection URL for the db client
	 *
	 *	@param obj:		An object containing the following fields:
	 *						* server:	The server name for the connection
	 *						* port:		The TCP port that Mongo is listening
	 *						* db:		The database to connect to
	 *
	 *	@return {void}
	 */
	d.config = function(obj){
		settings = obj;
	}
	
	d.getSession = function(){
		return new MongoDbSession();
	}
	
	d.generatePreparedStatement = function(queryObj){
		return new MongoDbPreparedStatement(queryObj);
	}
	
	d.hasDatabase = function(next){
		if(settings == undefined){
			var err = new MongoDbExecutionException({msg: "MongoDB driver could not generate a new session. The driver has not yet been initialized."});
			errorLog.fatal(err, function(){
				throw err;
			});
		}
		else if(settings.hasOwnProperty("server") && settings.hasOwnProperty("port") && settings.hasOwnProperty("db")){
			var url = "mongodb://" + settings.server + ":" + settings.port + "/" + settings.db;
			MongoClient.connect(url, function(err, db){
				if(err){
					errorLog.fatal(err, function(){
						throw err;
					});
				}
				
				if(settings.hasOwnProperty("user") && settings.hasOwnProperty("pass")){
					db.authenticate(settings.user, settings.pass, function(authErr, result){
						if(authErr){
							errorLog.fatal(authErr, function(){
								throw authErr;
							});
						}
						
						checkForDB(db, settings.db, next);
					});
				}
				else {
					checkForDB(db, settings.db, next);
				}
			});
		}
		else {
			var err = new MongoDbExecutionException({msg: "MongoDB driver could not generate a new session. The driver has not yet been initialized."});
			errorLog.fatal(err, function(){
				throw err;
			});
		}
	}
	
	d.createDatabase = function(next){
		next(undefined);
	}
	
	d.hasTable = function(table, next){
		if(settings == undefined){
			var err = new MongoDbExecutionException({msg: "MongoDB driver could not generate a new session. The driver has not yet been initialized."});
			errorLog.fatal(err, function(){
				throw err;
			});
		}
		else if(settings.hasOwnProperty("server") && settings.hasOwnProperty("port") && settings.hasOwnProperty("db")){
			var url = "mongodb://" + settings.server + ":" + settings.port + "/" + settings.db;
			MongoClient.connect(url, function(err, db){
				if(err){
					errorLog.fatal(err, function(){
						throw err;
					});
				}
				
				if(settings.hasOwnProperty("user") && settings.hasOwnProperty("pass")){
					db.authenticate(settings.user, settings.pass, function(authErr, result){
						if(authErr){
							errorLog.fatal(authErr, function(){
								throw authErr;
							});
						}
						
						checkForCollection(db, table, next);
					});
				}
				else {
					checkForCollection(db, table, next);
				}
			});
		}
		else {
			var err = new MongoDbExecutionException({msg: "MongoDB driver could not generate a new session. The driver has not yet been initialized."});
			errorLog.fatal(err, function(){
				throw err;
			});
		}
	}
	
	d.validateTableField = function(table, columnDef, next){
		next(undefined, true, true);
	}
	
	d.createTable = function(table, columnDefs, next){
		if(settings == undefined){
			var err = new MongoDbExecutionException({msg: "MongoDB driver could not generate a new session. The driver has not yet been initialized."});
			errorLog.fatal(err, function(){
				throw err;
			});
		}
		else if(settings.hasOwnProperty("server") && settings.hasOwnProperty("port") && settings.hasOwnProperty("db")){
			var url = "mongodb://" + settings.server + ":" + settings.port + "/" + settings.db;
			MongoClient.connect(url, function(err, db){
				if(err){
					errorLog.fatal(err, function(){
						throw err;
					});
				}
				
				if(settings.hasOwnProperty("user") && settings.hasOwnProperty("pass")){
					db.authenticate(settings.user, settings.pass, function(authErr, result){
						if(authErr){
							errorLog.fatal(authErr, function(){
								throw authErr;
							});
						}
						createCollection(db, table, next);
					});
				}
				else {
					createCollection(db, table, next);
				}
			});
		}
		else {
			var err = new MongoDbExecutionException({msg: "MongoDB driver could not generate a new session. The driver has not yet been initialized."});
			errorLog.fatal(err, function(){
				throw err;
			});
		}
	}
	
	var MongoDbSession = (function(){
		var mdbs = {};
		var session;
		
		if(settings == undefined){
			var err = new MongoDbExecutionException({msg: "MongoDB driver could not generate a new session. The driver has not yet been initialized."});
			errorLog.fatal(err, function(){
				throw err;
			});
		}
		else if(settings.hasOwnProperty("server") && settings.hasOwnProperty("port") && settings.hasOwnProperty("db")){
			var url = "mongodb://" + settings.server + ":" + settings.port + "/" + settings.db;
			MongoClient.connect(url, function(err, db){
				if(err){
					errorLog.fatal(err, function(){
						throw err;
					});
				}
				
				if(settings.hasOwnProperty("user") && settings.hasOwnProperty("pass")){
					db.authenticate(settings.user, settings.pass, function(authErr, result){
						if(authErr){
							errorLog.fatal(authErr, function(){
								throw authErr;
							});
						}
						
						session = db;
					});
				}
				else {
					session = db;
				}
			});
		}
		else {
			var err = new MongoDbExecutionException({msg: "MongoDB driver could not generate a new session. The driver has not yet been initialized."});
			errorLog.fatal(err, function(){
				throw err;
			});
		}
		
		mdbs.execute = function(statement, next){
			if(session != undefined){
				if(statement.hasOwnProperty("execute")){
					statement.execute(session, next);
				}
			}
			else {
				setTimeout(function(){
					mdbs.execute(statement, next);
				}, 50);
			}
		}
		
		mdbs.close = function(){
			if(session != undefined){
				session.close();
			}
			else {
				setTimeout(mdbs.close, 50);
			}
		}
		
		return mdbs;
	});
	
	var MongoDbPreparedStatement = (function(queryObj){
		var mdbps = {};
		var params = {};
		var action, collection, fields, query, values, sort;
		var required = ["action", "table"];
		
		var missing = [];
		for(var i=0;i<required.length;i++){
			if(!queryObj.hasOwnProperty(required[i])){
				missing.push(required[i]);
			}
		}
		
		if(missing.length > 0){
			var err = new MongoDbPreparedStatementException({msg:	"An attempt to create a MongoDbPreparedStatement was made, but the following required fields were missing from the query object passed: " + missing.join(", ")});
			errorLog.fatal(err, function(){
				throw err;
			});
		}
		
		action = queryObj.action;
		collection = queryObj.table;
		fields = queryObj.fields || [];
		query = queryObj.query || {};
		values = queryObj.values || {};
		sort = queryObj.sort || {};
		
		for(var key in query){
			searchForParams(query[key]);
		}
		
		for(var key in values){
			searchForParams(values[key]);
		}
		
		var sortArray = [];
		for(var key in sort){
			sortArray.push([key, sort[key]]);
		}
		
		mdbps.withParam = function(param, value){
			setParam(param, value);
			
			return mdbps;
		}
		
		mdbps.setParam = setParam;
		
		function setParam(param, value){
			if(params.hasOwnProperty(param)){
				params[param] = value;
			}
		}
		
		function searchForParams(item){
			var index=0;
			if(typeof item != "object"){
				while(item.indexOf("#{", index) > -1){
					var start = item.indexOf("#{", index);
					var end = item.indexOf("}", start);
					
					var param = item.substring(start+2, end);
					params[param] = undefined;
					index = end+1;
				}
			}
			else {
				for(var key in item){
					searchForParams(item[key]);
				}
			}
		}
		
		function replaceParams(item){
			if(typeof item != "object"){
				while(item.indexOf("#{") > -1){
					var start = item.indexOf("#{");
					var end = item.indexOf("}", start);
					
					var param = item.substring(start+2, end);
					if(params[param] != undefined){
						item = item.substring(0, start) + params[param] + item.substring(end+1);
					}
					else {
						var err = new MongoDbExecutionException({msg: "Could not execute a prepared statement. The parameter '" + param + "' was not initialized."});
						return err;
					}
				}
				
				if(item.indexOf("#[") > -1){
					var start = item.indexOf("#[");
					var end = item.indexOf("]", start);
					var data = item.substring(start + 2, end);
					var items = data.split(",");
					for(var i=items.length-1;i>=0;i--){
						items[i] = items[i].trim();
						if(items[i] == ""){
							items.splice(i, 1);
						}
					}
					
					item = items;
				}
			}
			else {
				for(var key in item){
					item[key] = replaceParams(item[key]);
				}
			}
			
			return item;
		}
		
		mdbps.execute = function(db, next){
			for(var key in query){
				var queryVal = replaceParams(query[key]);
				if(queryVal instanceof Error){
					next(queryVal);
					return;
				}
				else if(Array.isArray(queryVal)){
					query[key] = queryVal.join(",");
				}
				else if(typeof query[key] != "object"){
					query[key] = queryVal.toString();
				}
			}
			
			for(var key in values){
				var value = replaceParams(values[key]);
				if(value instanceof Error){
					next(value);
					return;
				}
				else if(Array.isArray(value)){
					values[key] = value;
				}
				else {
					values[key] = value.toString();
				}
			}
			
			if(actions.hasOwnProperty(action)){
				if(action == "read"){
					actions[action](db, collection, fields, query, sortArray, function(err, result){
						if(err){
							errorLog.error(err);
							next(err);
						}
						else {
							next(undefined, result);
						}
					});
				}
				else if(action == "create" || action == "update"){
					actions[action](db, collection, values, query, next);
				}
				else if(action == "delete"){
					actions[action](db, collection, query, next);
				}
			}
			else {
				var err = new MongoDbExecutionException({msg:	"Could not execute a prepared statement. The action '" + action + "' is not valid."});
				errorLog.error(err);
				next(err);
			}
		}
		
		return mdbps;
	});
	
	var MongoDbPreparedStatementException = (function(settings, implementationContext){
		settings = (settings || {});
		this.name = "MongoDbPreparedStatementException";
		
		this.type = "PreparedStatement";
		this.message = settings.msg || "A prepared statement error occurred.";
		this.detail = "";
		this.extendedInfo = "";
		this.errorCode = (settings.code != null ? settings.code : 1);
		
		Error.captureStackTrace(this, (implementationContext || MongoDbPreparedStatementException));
	});
	util.inherits(MongoDbPreparedStatementException, Error);
	
	var MongoDbExecutionException = (function(settings, implementationContext){
		settings = (settings || {});
		this.name = "MongoDbExecutionException";
		
		this.type = "DatabaseExecution";
		this.message = settings.msg || "An error occurred executing a query in the database.";
		this.detail = "";
		this.extendedInfo = "";
		this.errorCode == (settings.code != null ? settings.code : 2);
		
		Error.captureStackTrace(this, (implementationContext || MongoDbExecutionException));;
	});
	util.inherits(MongoDbExecutionException, Error);
	
	
	function find(db, collection, fields, query, sort, next){		
		var coll = db.collection(collection);
		coll.find(query, {sort: sort}).toArray(function(err, items){
			if(err){
				errorLog.error("An error occurred retrieving data from MongoDB.\nError Message: " + err);
				next(err);
			}
			else {
				next(undefined, new FindResponse(items));
			}
		});
		
		var FindResponse = (function(items){
			var fr = {};
			
			var _items = [];
			for(var i=0;i<items.length;i++){
				var item = {};
				if(fields[0] == "all"){
					item = items[i];
				}
				else {
					for(var j=0;j<fields.length;j++){
						if(fields[j].indexOf("#[") > -1){
							var start = fields[j].indexOf("#[");
							var end = fields[j].indexOf("]", start);
							var key = fields[j].substring(start+2, end);
							item[key] = items[i][key] || [];
						}
						else {
							item[fields[j]] = items[i][fields[j]];
						}
					}
				}
				_items.push(item);
			}
			
			fr.getItems = function(){
				return _items;
			}
			
			fr.get = function(index){
				return _items[index];
			}
			
			fr.iterator = function(){
				return new Iterator();
			}
			
			var Iterator = (function(){
				var it = {};
				
				var index = 0;
				
				it.hasNext = function(){
					return _items.length > index;
				}
				
				it.next = function(){
					index++;
					return _items[index-1];
				}
				
				return it;
			});
			
			return fr;
		});
	}
	
	function insert(db, collection, values, query, next){
		var coll = db.collection(collection);
		values.createdAt = new Date().getTime().toString();
		values.modifiedAt = values.createdAt;
		coll.insert(values, function(err, result){
			next(err);
		});
	}
	
	function update(db, collection, values, query, next){
		var coll = db.collection(collection);
		values.modifiedAt = new Date().getTime().toString();
		coll.update(query, {$set: values}, {upsert: false, multi: true}, function(err, result){
			next(err);
		});
	}
	
	function remove(db, collection, query, next){
		var coll = db.collection(collection);
		coll.remove(query, function(err, result){
			next(err);
		})
	}
	
	function checkForDB(db, database, next){
		db.admin().listDatabases(function(err, dbs){
			if(err){
				console.log(err);
				next(err);
			}
			else {
				var found = false;
				for(var i=0;i<dbs.databases.length;i++){
					if(dbs.databases[i].name == settings.db && !dbs.databases[i].empty){
						found = true;
						break;
					}
				}
				next(undefined, found);
			}
		});
	}
	
	function checkForCollection(db, collection, next){
		db.collection("system.namespaces").find({name: settings.db + "." + collection}).toArray(function(err, items){
			if(err){
				next(err);
			}
			else {
				next(undefined, (items.length == 1));
			}
			db.close();
		});
	}
	
	function createCollection(db, collection, next){
		db.createCollection(collection);
		next();
	}
	
	return d;
});

module.exports.properties = {
	description:	"The default driver for MongoDB databases, including methods for setup, verification and all CRUD functions",
	author:			"Column Technologies",
	properties:	[
		{
			name:		"Server",
			key:		"server"
		},
		{
			name:		"Port",
			key:		"port",
			validate:	"integer"
		},
		{
			name:		"Database",
			key:		"db"
		},
		{
			name:		"Username",
			key:		"user",
			optional:	true
		},
		{
			name:		"Password",
			key:		"pass",
			optional:	true,
			type:		"password"
		}
	]
};