var util = require("util");

var CollectionResourceResponse = (function(collection, process, complete, fail){
	var crr = {};
	
	if(typeof collection != "object" && !Array.isArray(collection)){
		var err = new CollectionResourceResponseException({msg: "Error initializing CollectionResourceResponse. The collection provided was neither an object nor an array."});
		if(typeof fail == "function"){
			fail(err);
		}
		else {
			throw err;
		}
	}
	if(typeof process != "function"){
		var err = new CollectionResourceResponseException({msg: "Error initializing CollectionResourceResponse. No process function was detected."});
		if(typeof fail == "function"){
			fail(err);
		}
		else {
			throw err;
		}
	}
	
	crr.oncomplete = function(_complete){
		if(typeof _complete == "function"){
			complete = _complete;
		}
		
		return crr;
	}
	
	crr.onfail = function(_fail){
		if(typeof _fail == "function"){
			fail = _fail;
		}
		
		return crr;
	}
	
	crr.end = function(responseData){
		if(typeof complete == "function"){
			complete(responseData);
		}
	}
	
	crr.process = function(){
		var responses = [];
		var errors = [];
		var failed = false;
		
		if(typeof complete != "function"){
			var err = new CollectionResourceResponseException({msg: "Error executing CollectionResourceResponse#process. No valid complete function was detected."});
			if(typeof fail == "function"){
				fail(err);
			}
			else {
				throw err;
			}
		}
		else if(typeof fail != "function"){
			var err = new CollectionResourceResponseException({msg: "Error executing CollectionResourceResponse#process. No valid fail function was detected."});
			throw err;
		}
		else if(Array.isArray(collection)){
			for(var i=0;i<collection.length;i++){
				responses.push(new CollectionResourceResponseItem(collection[i], process, i, itemComplete, itemFail, itemForce));
			}
		}
		else {
			for(var key in collection){
				responses.push(new CollectionResourceResponseItem(collection[key], process, key, itemComplete, itemFail, itemForce));
			}
		}
		
		if(responses.length == 0){
			complete();
		}
		
		function itemComplete(){
			var completed = true;
			var resultSet = {};
		
			for(var i=0;i<responses.length;i++){
				if(!responses[i].isComplete()){
					completed = false;
					break;
				}
				else {
					resultSet[responses[i].getKey()] = responses[i].getResult();
				}
			}
				
			if(completed && !failed){
				complete(resultSet);
			}
			else if(complete && failed){
				fail(errors.join("\n"));
			}
		}
		
		function itemFail(err){
			errors.push(err);
			failed = true;
		}
		
		function itemForce(data){
			complete(data);
		}
	}
	
	return crr;
});

var CollectionResourceResponseItem = (function(item, process, key, complete, fail, forceEnd){
	var crri = {};
	var completed = false;
	var result;
	item.key = item.key || key;
	
	process(item, function(err, response){
		if(err){
			fail(err);	
		}
		else {
			result = response;
			completed = true;
			complete();
		}
	}, function(forceData){
		forceEnd(forceData);
	});
	
	crri.isComplete = function(){
		return completed;
	}
	
	crri.getKey = function(){
		return key;
	}
	
	crri.getResult = function(){
		return result;
	}
	
	return crri;
});

var CollectionResourceResponseException = (function(settings, implementationContext){
	settings = settings || {};
	
	this.name = "CollectionResourceResponseException";
	
	this.type = "CollectionResourceResponse";
	this.message = settings.msg || "A CollectionResourceResponse error occurred.";
	this.detail = "";
	this.extendedInfo = "";
	this.errorCode = (settings.code != null ? settings.code : 1);
	
	Error.captureStackTrace(this, (implementationContext || CollectionResourceResponseException));
});
util.inherits(CollectionResourceResponseException, Error);


module.exports = CollectionResourceResponse;