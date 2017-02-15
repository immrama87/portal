var os = require("os");
var crypto = require("crypto");

var LicensingService = (function(){
	var ls = {};
	
	var serverId;
	var license = {status: "unlicensed"};
	var expireTimeout;
	var expiringTimeout;
	
	ls.getLicenseDetails = function(){
		var expireDate = new Date(license.expires);
		var now = new Date();
		var tomorrow = new Date();
		tomorrow.setTime(now.getTime() + (24*60*60*1000));
		
		if(expireDate.getTime() < now.getTime()){
			license.status = "expired";
		}
		else if(expireDate.getTime() < tomorrow.getTime()){
			license.status = "expiring";
		}
		
		return license;
	}
	
	ls.setLicenseDetails = function(licenseKey, next){
		serverId = server.serverId;
		
		var licenseASCII = new Buffer(licenseKey, "base64").toString("ascii");
		
		var decipher = crypto.createDecipher("aes128", serverId);
		var decrypted = "";
		decipher.on("readable", function(){
			var data = decipher.read();
			if(data)
				decrypted+=data.toString("utf8");
		});
		decipher.on("end", function(){
			var licenseObj = JSON.parse(decrypted);
			var now = new Date();
			var tomorrow = new Date();
			tomorrow.setTime(now.getTime() + (24*60*60*1000));
			if(!licenseObj.expires){
				license.status = "invalid";
			}
			else {
				var expireDate = new Date();
				expireDate.setTime(licenseObj.expires);
				
				license.expires = expireDate.toLocaleString("en-US");
				if(expireDate.getTime() < now.getTime()){
					license.status = "expired";
				}
				else {
					if(expireDate.getTime() < tomorrow.getTime()){
						license.status = "expiring";
					}
					else {
						license.status = "valid";
					}
				}
				
				license.admins = licenseObj.admins;
				license.users = licenseObj.users;
			}
			
			next();
		});
		
		decipher.write(licenseASCII, "hex");
		decipher.end();
	}
	
	function pad(number){
		if(number < 10){
			return "0" + number;
		}
		return number;
	}
	
	return ls;
});

module.exports = LicensingService;