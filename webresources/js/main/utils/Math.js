define("utils/Math", [], function(){
	var m = {};
	
	m.clamp = function(num, min, max){
		return Math.min(Math.max(num, min), max);
	}
	
	return m;
});