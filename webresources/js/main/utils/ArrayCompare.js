define("utils/ArrayCompare", [], function(){
	var ac = {};
	
	ac.compare = function(arr1, arr2){
		if(arr1 == undefined && arr2 == undefined){
			return true;
		}
		
		if(!Array.isArray(arr1) || !Array.isArray(arr2)){
			return false;
		}
		
		if(arr1.length != arr2.length){
			return false;
		}
		
		for(var i=0;i<arr1.length;i++){
			if(arr2.indexOf(arr1[i]) == -1){
				return false;
			}
		}
		
		return true;
	}
	
	ac.containsAll = function(arr1, arr2){
		if(arr1 == undefined && arr2 == undefined){
			return true;
		}
		else if(arr1 == undefined || arr2 == undefined){
			return false;
		}
		if(!Array.isArray(arr2)){
			return false;
		}
		for(var i=0;i<arr1.length;i++){
			if(arr2.indexOf(arr1[i]) == -1){
				return false;
			}
		}
		
		return true;
	}
	
	return ac;
});