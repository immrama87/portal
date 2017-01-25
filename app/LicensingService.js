var os = require("os");
var crypto = require("crypto");

var LicensingService = (function(){
	var ls = {};
	
	var serverId;
	var license = {status: "unlicensed"};
	var expireTimeout;
	var expiringTimeout;
	
	function getServerId(){
		if(serverId == null){
			var mac;
			var interfaces = os.networkInterfaces();
			if(interfaces.hasOwnProperty("Local Area Connection")){
				mac = interfaces["Local Area Connection"][0].mac;
			}
			else if(interfaces.hasOwnProperty("eth0")){
				mac = interfaces["eth0"][0].mac;
			}
			else if(interfaces.hasOwnProperty("lo")){
				mac = interfaces["lo"][0].mac;
			}
			else if(interfaces.hasOwnProperty("Wireless Network Connection")){
				mac = interfaces["Wireless Network Connection"][0].mac;
			}
			else {
				mac = interfaces[Object.keys(interfaces)[0]][0].mac;
			}
			mac = mac.replace(/:/g, "-");
			var cipher = crypto.createCipher("aes128", mac);
			serverId = cipher.update(os.hostname(), "utf8", "hex");
			serverId += cipher.final("hex");
			console.log(serverId);
		}
		
		return serverId;
	}
	
	ls.getServerId = getServerId;
	
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
		serverId = getServerId();
		
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