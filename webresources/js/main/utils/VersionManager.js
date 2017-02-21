define("utils/VersionManager", [], function(){
	var vm = {};
	
	vm.createVersionWidget = function(versions){
		var inactive = [];
		var widget = document.createElement("div");
		widget.className = "version-info";
		
		var draftBtn = document.createElement("button");
		draftBtn.className = "btn btn-link";
		$(draftBtn).text("Create Draft Version");
		
		var otherBtn;
		
		for(var i=0;i<versions.length;i++){
			console.log(versions[i]);
			if(versions[i].active){
				$(widget).text("Viewing version: " + versions[i].version);
			}
			else if(versions[i].activeDraft){
				$(draftBtn).text("Switch to Draft Version");
			}
			else {
				if(otherBtn == undefined){
					var otherBtn = document.createElement("button");
					otherBtn.className = "btn btn-link";
					$(draftBtn).text("Other versions...");
				}
				inactive.push(versions[i]);
			}
		}
		
		$(widget).append(draftBtn);
		if(otherBtn != undefined){
			$(widget).append(otherBtn);
		}
		
		return widget;
	}
	
	return vm;
});