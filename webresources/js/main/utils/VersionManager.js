define("utils/VersionManager", [], function(){
	var vm = {};
	
	vm.createVersionWidget = function(versions){
		var inactive = [];
		var activeVersion;
		var draftVersion;
		var currentVersion;
		var changeFnc;
		var handlers = {};
		
		var widget = document.createElement("div");
		widget.className = "version-info";
		var versionText = document.createElement("span");
		$(widget).append(versionText);

		var publishedControls = document.createElement("span");
		var draftBtn = document.createElement("button");
		draftBtn.className = "btn btn-link";
		$(draftBtn).text("Create Draft Version");
		$(draftBtn).on("click touch", function(evt){
			emitEvent("create-draft");
		});
		$(publishedControls).append(draftBtn);
		$(widget).append(publishedControls);
		
		var draftControls = document.createElement("span");
		draftControls.className = "hide";
		$(widget).append(draftControls);
		
		var publishedBtn = document.createElement("button");
		publishedBtn.className = "btn btn-link";
		$(publishedBtn).text("Switch to Published Version");
		$(publishedBtn).on("click touch", function(evt){
			widget.setVersion(activeVersion.version);
		});
		$(draftControls).append(publishedBtn);
		
		var publishBtn = document.createElement("button");
		publishBtn.className = "btn btn-link";
		$(publishBtn).text("Publish Draft");
		$(publishBtn).on("click touch", function(evt){
			emitEvent("publish");
		});
		$(draftControls).append(publishBtn);
		
		var deleteBtn = document.createElement("button");
		deleteBtn.className = "btn btn-link";
		$(deleteBtn).text("Delete Draft");
		$(deleteBtn).on("click touch", function(evt){
			emitEvent("delete");
		});
		$(draftControls).append(deleteBtn);
		
		var changeBtn = document.createElement("button");
		changeBtn.className = "btn btn-link";
		$(changeBtn).text("Change History");
		$(draftControls).append(changeBtn);
		
		var otherBtn = document.createElement("button");
		$(otherBtn).text("Other Versions");
		otherBtn.className = "btn btn-link hide";
		$(otherBtn).on("click touch", function(evt){
			var modal = Blueprint.utils.Modals.createModal("version-history", {
				height:"80%", 
				closeButton: true,
				data:	inactive
			});
			
			modal.on("version-details", function(data){
				data.closeModal = modal.close;
				emitEvent("version-details", data);
			});
		});
		$(draftControls).append(otherBtn);
			
		$(widget).append(draftControls);
		
		var historyBtn;
		
		widget.setVersion = function(version){
			for(var i=0;i<versions.length;i++){
				if(versions[i].version == version){
					if(Blueprint.modules.changeManager.hasChanges()){
						Blueprint.utils.Messaging.confirm("You have made changes that will be lost. Continue?", function(conf){
							if(conf){
								versionChange(versions[i]);
							}
						});
					}
					else {
						versionChange(versions[i]);
					}
					
					break;
				}
			}
		}
		
		for(var i=0;i<versions.length;i++){
			if(versions[i].active === "true"){
				$(versionText).text("Viewing version: " + versions[i].version);
				activeVersion = versions[i];
				currentVersion = activeVersion;
			}
			else if(versions[i].activeDraft === "true"){
				draftVersion = versions[i];
				$(draftBtn).text("Switch to Draft Version");
				$(draftBtn).attr("trigger", "draft");
				$(draftBtn).off("click touch");
				$(draftBtn).on("click touch", function(evt){
					widget.setVersion(draftVersion.version);
				});
			}
			else {
				$(otherBtn).removeClass("hide");
				inactive.push(versions[i]);
			}
		}
		
		if(historyBtn != undefined){
			$(draftControls).append(otherBtn);
		}
		
		if(activeVersion == undefined && draftVersion != undefined){
			widget.setVersion(draftVersion.version);
			$(publishedBtn).addClass("hide");
		}
		
		widget.setChangeHistoryUrl = function(url, formatHandlers, revertHandler){
			$(changeBtn).off("click touch");
			$(changeBtn).on("click touch", function(evt){
				$.ajax({
					method:		"get",
					url:		url,
					dataType:	"json"
				})
				.done(function(response){
					var modal = Blueprint.utils.Modals.createModal("change-history", {
						width:			"50%",
						height:			"80%",
						closeButton: 	true,
						data:	{
							history:	response,
							formatters: formatHandlers
						}
					});
					
					if(typeof revertHandler == "function"){
						modal.on("revert", function(data, modal){
							revertHandler(data, modal);
						});
					}
				})
				.fail(function(xhr, status, err){
					Blueprint.utils.Messaging.alert("An error occurred retrieving the change history for this version.", true, xhr.responseText);
				});
			});
		}
		
		widget.getVersion = function(){
			return currentVersion.version;
		}
		
		widget.onchange = function(handler){
			widget.on("change", handler);
		}
		
		widget.on = function(event, handler){
			if(typeof handler == "function"){
				handlers[event] = handler;
			}
		}
		
		widget.isDraftVersion = function(){
			return currentVersion.version == "draft";
		}
		
		function versionChange(versionObj){
			currentVersion = versionObj;
			$(versionText).text("Viewing version: " + currentVersion.version.charAt(0).toUpperCase() + currentVersion.version.substring(1));
			if(!currentVersion.active || currentVersion.active === "false"){
				$(draftControls).removeClass("hide");
				$(publishedControls).addClass("hide");
			}
			else {
				$(draftControls).addClass("hide");
				$(publishedControls).removeClass("hide");
			}
			
			Blueprint.modules.changeManager.clearChanges();
			
			emitEvent("change", currentVersion.version);
		}
		
		function emitEvent(event, data){
			if(typeof handlers[event] == "function"){
				handlers[event](data);
			}
		}
		
		return widget;
	}
	
	return vm;
});