define("app/ChangeManager", [], function(){
	var cm = {};
	var module;
	var changes = [];
	var undone = [];
	var savedChanges = [];
	
	cm.setModule = function(_module){
		module = _module;
		changes = [];
		undone = [];
	}
	
	cm.pushChange = function(change){
		changes.push(change);
		undone = [];
	}
	
	cm.clearChanges = function(){
		savedChanges = [];
		changes = [];
		undone = [];
	}
	
	cm.setSaved = function(){
		savedChanges = changes;
	}
	
	cm.hasChanges = function(){
		return !Blueprint.utils.ArrayCompare.compare(changes, savedChanges);
	}
	
	window.addEventListener("keyup", function(evt){
		if(evt.ctrlKey && evt.keyCode == 90){
			if(changes.length > 0){
				var change = changes.pop();
				if(module != undefined && module.hasOwnProperty("undoChange")){
					module.undoChange(change);
				}
				undone.push(change);
			}
		}
		else if(evt.ctrlKey && evt.keyCode == 89){
			if(undone.length > 0){
				var change = undone.pop();
				if(module != undefined && module.hasOwnProperty("redoChange")){
					module.redoChange(change);
				}
				changes.push(change);
			}
		}
	});
	
	return cm;
});