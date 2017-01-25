var util = require("util");

var ConfigException = (function(settings, implementationContext){	
	settings = (settings || {});
	this.name = "ConfigException";
	
	this.type = "Configuration";
	this.message = settings.msg || "A configuration error occurred.";
	this.detail = "";
	this.extendedInfo = "";
	this.errorCode = (settings.code != null ? settings.code : 1);
	
	Error.captureStackTrace(this, (implementationContext || ConfigException));
});

util.inherits(ConfigException, Error);
module.exports = ConfigException;