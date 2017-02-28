var mongo = require("mongodb");
var util = require("util");
var MongoClient = mongo.MongoClient;

/**
 *	@class
 *	@driver
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
	 *	#config
	 *	Configures the connection URL for the db client
	 *
	 *	@param obj:		An object containing the following fields:
	 *						* server:	(String) The server name for the connection
	 *						* port:		(Integer) The TCP port that Mongo is listening
	 *						* db:		(String) The database to connect to
	 *
	 *	@return {void}
	 */
	d.config = function(obj){
		settings = obj;
	}
	
	/**
	 *	#getSession
	 *	Creates and returns a new MongoDbSession.
	 *
	 *	@return {MongoDbSession}
	 */
	d.getSession = function(){
		return new MongoDbSession();
	}
	
	/**
	 *	#generatePreparedStatement
	 *	Creates and returns a new MongoDbPreparedStatement with the initialization parameters provided.
	 *
	 *	@param queryObj:	(Object) An object containing the initializing parameters for the MongoDbPreparedStatement.
	 *						@see MongoDBPreparedStatement for more details about queryObj requirements.
	 *
	 *	@return {MongoDbPreparedStatement}
	 */
	d.generatePreparedStatement = function(queryObj){
		return new MongoDbPreparedStatement(queryObj);
	}
	
	/**
	 *	#hasDatabase
	 *	Validates that the database specified in the intialization configuration exists. Used during initial configuration setup.
	 *
	 *	@param next:	(function) Function to call handling steps to take after processing the request.
	 *					This function should accept two arguments:
	 *						err: Any errors thrown while trying to perform the check.
	 *						exists: true if the database exists and is not empty, false otherwise.
	 *
	 *	@return {void}
	 */
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
	
	/**
	 *	#createDatabase
	 *	Creates the database specified in the initialization configuration. (This is not required for MongoDB, but is required by the driver interface).
	 *
	 *	@param next:	(function) Function to call handling the next steps after the process completes.
	 *					This function should accept the following arguments:
	 *						err:	Any errors that occur while processing the request.
	 *
	 *	@return {void}
	 */
	d.createDatabase = function(next){
		next(undefined);
	}
	
	/**
	 *	#hasTable
	 *	Validates that a system-required table exists.
	 *
	 *	@param table:	(String) The name of the table to validate.
	 *	@param next: 	(function) Function to call handling the next steps after the process completes.
	 *					This function should accept the following arguments:
	 *						err:	Any errors that occur while processing the request.
	 *						exists:	true if the table exists, false otherwise.
	 *
	 *	@return {void}
	 */
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
	
	/**
	 *	#validateTableField
	 *	Validates that a field exists on the specified table and matches the required configuration for the application. (This is not required for MongoDB, but is required by the driver interface)
	 *
	 *	@param table:	(String) The name of the table the field should exist on.
	 *	@param columnDef: (Object) The required configuration of the field.
	 *	@param next:	(function) Function to call handling the next steps after the process completes.
	 *					This function should accept the following arguments:
	 *						err:	Any error thrown during execution.
	 *						exists:	true if the field exists on the table, false otherwise
	 *						valid:	true if the field matches the required configuration, false otherwise
	 *
	 *	@return {void}
	 */
	d.validateTableField = function(table, columnDef, next){
		next(undefined, true, true);
	}
	
	/**
	 *	#createTable
	 *	Creates a new table in the database's schema.
	 *
	 *	@param table:	(String) The name of the table to create.
	 *	@param columnDefs: (Object[]) An array of field configurations to create on the table.
	 *	@param next:	(function) Function to call handling the next steps after the process completes.
	 *					This function should accept the following arguments:
	 *						err:	Any (non-fatal) error thrown during execution.
	 *
	 *	@return {void}
	 */
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
	
	/**
	 *	@class
	 *	MongoDbSession
	 *	An internal class for the MongoDB driver, responsible for maintaining a connection to the database for as long as the session is kept open and executing any statements provided.
	 */
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
		
		/**
		 *	#execute
		 *	Executes a provided MongoDbPreparedStatement
		 *
		 *	@param statement:	(MongoDbPreparedStatement) The statement to execute.
		 *						@see MongoDbPreparedStatement for more details
		 *	@param next:		(function) Function to call when the statement is executed.
		 *						This function should accept the following arguments:
		 *							err:	Any error thrown during the execution.
		 *							findResponse: (Only applicable to MongoDbPreparedStatements with an action value of 'read') The documents returned from a query.
		 *
		 *	@return {void}
		 */
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
		
		/**
		 *	#close
		 *	Closes the connection to the database. Any #execute calls made after this will result in an error.
		 *	
		 *	@return {void}
		 */
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
	
	/**
	 *	@class
	 *	MongoDbPreparedStatement
	 *	An internal class for preparing and executing statements in the database.
	 *
	 *	@constructor MongoDbPreparedStatement(queryObj)
	 *		Creates a new PreparedStatement using the initializing queryObj parameters.
	 *		The initializing parameters accepted include:
	 *			action:	(required) (String) The CRUD action to take when executing the statement. Values accepted are: 'create', 'read', 'update' and 'delete'.
	 *			table:	(required) (String) The table to execute the statement against.
	 *			fields: (required if action == 'read', otherwise ignored) (String[]) The fields to retrieve when executing a 'read' statement. Use ['all'] to retrieve all fields.
	 *			query:	(ignored if action == 'create', otherwise required) (Object) A key-value map of field values to query for executing 'read', 'update' and 'delete' statements.
	 *					Uses the same query format as MongoDB.
	 *			values: (required if action == 'create' or action == 'update', otherwise ignored) (Object) A key-value map of fields and values to insert/update for executing 'create' and 'update' statements.
	 *					Uses the same format as MongoDB.
	 *			sort:	(optional if action == 'read', otherwise ignored) (String[][]) A 2-dimensional array representing the sort order for a 'read' statement.
	 *					The first dimension of the array specifies the sort priority of a field, while the second dimension specifies the field name at index 0 and the sort order (ascending|descending) at index 1.
	 *					Ex: A value of [['name', 'ascending'], ['date', 'descending']] would sort the result by 'name' (in ascending order) first, followed by 'date' in descending order.
	 */
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
		
		/**
		 *	#withParam
		 *	Sets a given parameter and returns itself for chaining commands.
		 *	
		 *	@param param:	(String) The name of the parameter to set.
		 *	@param value:	(String) The value to set the parameter to.
		 *
		 *	@return {MongoDbPreparedStatement}
		 */
		mdbps.withParam = function(param, value){
			setParam(param, value);
			
			return mdbps;
		}
		
		/**
		 *	#setParam
		 *	Sets a given parameter
		 *	
		 *	@param param:	(String) The name of the parameter to set.
		 *	@param value:	(String) The value to set the parameter to.
		 *
		 *	@return {void}
		 */
		mdbps.setParam = setParam;
		
		/**
		 *	#execute
		 *	Executes the statement given a database connection (should only be called from within a MongoDbSession)
		 *
		 *	@param db:	(MongoDB) The database connection to use to execute the command (provided by the calling MongoDbSession object)
		 *	@param next: 	(function) Function to call handling the next steps after the statement is executed.
		 *					This function should accept the following parameters:
		 *						err:	An error encountered during execution.
		 *						findResponse: (Only if action == 'read') The documents returned from the query.
		 */
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
		
		mdbps.getAction = function(){
			return action;
		}
		
		return mdbps;
	});
	
	/**
	 *	@Exception
	 *	MongoDbPreparedStatementException
	 *	An exception thrown when creating and preparing a MongoDbPreparedStatement.
	 */
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
	
	/**
	 *	@Exception
	 *	MongoDbExecutionException
	 *	An exception thrown during execution of a MongoDbPreparedStatement by a MongoDbSession.
	 */
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
	
	/*
	 *	#find
	 *	Private method used for executing 'read' statements.
	 *	
	 *	@param db:	(MongoDB) The database connection to use to execute the query.
	 *	@param collection: (String) The name of the collection to retrieve documents from.
	 *	@param fields:	(String[]) The names of the fields to return in the FindResponse object.
	 *	@param query: (Object) Key-value mapping of the fields and values to use when querying.
	 *	@param sort: (String[][]) Array used to sort the query results.
	 *	@param next: (function) Function to call after processing completes.
	 *
	 *	@return {void}
	 */
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
		
		/*
		 *	@class
		 *	FindResponse
		 *	The response object that is sent to the 'next' function when a query successfully completes.
		 *	
		 *	@constructor FindResponse(items)
		 *		Creates a new FindResponse containing the specified items.
		 *		@param items (Object[]) The documents returned from the query;
		 */
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
			
			/*
			 *	#getItems
			 *	Returns all documents contained in the FindResponse
			 *
			 *	@return {Object[]}
			 */
			fr.getItems = function(){
				return _items;
			}
			
			/*
			 *	#get
			 *	Returns the document at the specified index
			 *	
			 *	@param index:	(Integer) The index of the document to retrieve
			 *
			 *	@return {Object || undefined}
			 */
			fr.get = function(index){
				return _items[index];
			}
			
			/*
			 *	#iterator
			 *	Returns a new Iterator for looping over the contained documents.
			 *
			 *	@return {Iterator}
			 */
			fr.iterator = function(){
				return new Iterator();
			}
			
			/*
			 *	@class
			 *	Iterator
			 *	An iterator object for looping over contained documents.
			 */
			var Iterator = (function(){
				var it = {};
				
				var index = 0;
				
				/*
				 *	#hasNext
				 *  Determines if the iterator can continue looping or if all documents have been retrieved.
				 *
				 *	@return {boolean}
				 */
				it.hasNext = function(){
					return _items.length > index;
				}
				
				/*
				 *	#next
				 *	Retrieves the next document from the stack.
				 *
				 *	@return {Object}
				 */
				it.next = function(){
					index++;
					return _items[index-1];
				}
				
				return it;
			});
			
			return fr;
		});
	}
	
	/*
	 *	#insert
	 *	Private method used for executing 'create' statements.
	 *
	 *	@param db: (MongoDB) The database connection to use when executing the statement
	 *	@param collection: (String) The name of the collection to insert the document into.
	 *	@param values: (Object) Key-value map of the fields and values to set when creating the document.
	 *	@param query: Not used. Included only for mapping all functions more simply.
	 *	@param next: (function) Function to call when execution is completed.
	 */
	function insert(db, collection, values, query, next){
		var coll = db.collection(collection);
		values.createdAt = new Date().getTime().toString();
		values.modifiedAt = values.createdAt;
		coll.insert(values, function(err, result){
			next(err);
		});
	}
	
	/*
	 *	#update
	 *	Private method used for executing 'update' statements.
	 *
	 *	@param db: (MongoDB) The database connection to use when executing the statement
	 *	@param collection: (String) The name of the collection to update the document(s) in.
	 *	@param values: (Object) Key-value map of the fields and values to set when updating the document.
	 *	@param query: (Object) Key-value map of the fields and values to query when finding documents to update.
	 *	@param next: (function) Function to call when execution is completed.
	 */
	function update(db, collection, values, query, next){
		var coll = db.collection(collection);
		values.modifiedAt = new Date().getTime().toString();
		coll.update(query, {$set: values}, {upsert: false, multi: true}, function(err, result){
			next(err);
		});
	}
	
	/*
	 *	#remove
	 *	Private method used for executing 'delete' statements.
	 *
	 *	@param db: (MongoDB) The database connection to use when executing the statement.
	 *	@param collection: (String) The name of the collection to delete from.
	 *	@param query: (Object) Key-value map of the fields and values to query when finding documents to delete.
	 *	@param next: (function) Function to call when execution is completed.
	 */
	function remove(db, collection, query, next){
		var coll = db.collection(collection);
		coll.remove(query, function(err, result){
			next(err);
		})
	}
	
	/*
	 *	#checkForDB
	 *	Private method used for verifying a database exists.
	 *	
	 *	@param db: (MongoDB) The database connection to use when executing the statement.
	 *	@param database: (String) The name of the database to verify.
	 *	@param next: (function) Function to call when execution is completed.
	 */
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
	
	/*
	 *	#checkForCollection
	 *	Private method used for verifying a collection exists.
	 *
	 *	@param db: (MongoDB) The database connection to use when executing the statement.
	 *	@param collection: (String) The name of the collection to verify.
	 *	@param next: (function) Function to call when execution is completed.
	 */
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
	
	/*
	 *	#createCollection
	 *	Private method used for creating a new collection.
	 *
	 *	@param db: (MongoDB) The database connection to use when executing the statement.
	 *	@param collection: (String) The name of the collection to create.
	 *	@param next: (function) Function to call when execution is completed.
	 */
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