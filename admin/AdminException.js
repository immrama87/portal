var util = require("util");

var AdminException = (function(settings, implementationContext){
	settings = (settings || {});
	this.name = "AdminException";
	
	this.type = "Administration";
	this.message = settings.msg || "An administration error occurred.";
	this.detail = "";
	this.extendedInfo = "";
	this.errorCode = (settings.code != null ? settings.code : 1);
	
	Error.captureStackTrace(this, (implementationContext || AdminException));
});

util.inherits(AdminException, Error);
module.exports = AdminException;