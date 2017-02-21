define("utils/StringUtils", [], function(){
	var su = {};
	
	su.lPad = function(str, len, chr){
		while(str.length < len){
			str = chr + str;
		}
		
		return str;
	}
	
	return su;
});