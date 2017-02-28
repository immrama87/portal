var CookieManager = (function(){
	var cm = {};
	
	cm.parseCookie = function(cookie){
		return new Cookie(cookie);
	}
	
	cm.createCookie = function(){
		return new Cookie();
	}
	
	var Cookie = (function(cookie){
		var c = {};
		var values = {};
		
		if(cookie != undefined){
			var cookies = cookie.split(";");
			for(var i=0;i<cookies.length;i++){
				var key = cookies[i].substring(0, cookies[i].indexOf("=")).trim();
				var val = cookies[i].substring(cookies[i].indexOf("=")+1).trim();
				
				values[key.toString()] = {
					value: val
				};
			}
		}
		
		c.getValue = function(key){
			if(values.hasOwnProperty(key)){
				return values[key].value;
			}
			
			return null;
		}
		
		c.setValue = function(key, val, hrs, httpOnly){
			if(httpOnly == undefined){
				httpOnly = true;
			}
			var expires;
			if(hrs == undefined || isNaN(parseInt(hrs))){
				expires = new Date(Date.now() + 1000 * 60 * 60 * 24);
			}
			else {
				expires = new Date(Date.now() + 1000 * 60 * 60 * hrs);
			}
			values[key] = {
				value: val,
				expires: expires,
				httpOnly: httpOnly
			};
		}
		
		c.setPath = function(key, path){
			if(path != undefined){
				values[key].path = path;
			}
		}
		
		c.setExpiry = function(key, hrs){
			hrs = hrs || 24;
			if(isNaN(parseInt(hrs)))
				hrs = 24;
				
			values[key].expires = new Date(Date.now() + 1000 * 60 * 60 * hrs);
		}
		
		c.toString = function(){
			var cookies = [];
			for(var key in values){
				var kv = key + "=" + values[key].value;
				var expires = "Expires=" + new Date(values[key].expires).toGMTString();
				
				var cookie = kv + ";" + expires;
				if(values[key].hasOwnProperty("path")){
					cookie += ";Path=" + values[key].path;
				}
				if(values[key].httpOnly){
					cookie += ";HttpOnly";
				}
				
				cookies.push(cookie);
			}
			
			return cookies;
		}
		
		return c;
	});
	
	return cm;
});

module.exports = CookieManager;