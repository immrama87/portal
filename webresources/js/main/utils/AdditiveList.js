define("utils/AdditiveList", [], function(){
	var AdditiveList = (function(id){
		var el = document.getElementById(id);
		var listOptions = [];
		var selectedOptions = [];
		var unselectedOptions = [];
		var excludeSearchKeys = [];
		var includeSearchKeys = [];
		var addCallback, removeCallback;
		
		if(el != undefined){
			if($(el).is("[search-exclude]")){
				excludeSearchKeys = $(el).attr("search-exclude").split(",");
			}
			if($(el).is("[search-include]")){
				includeSearchKeys = $(el).attr("search-include").split(",");
			}
			var addButton = document.createElement("button");
			addButton.className = "btn btn-block btn-dashed";
			$(addButton).text("Add " + ($(el).attr("attr-name") || ""));
			$(addButton).on("click touch", function(evt){
				$(addButton).addClass("hide");
				
				var input = document.createElement("input");
				input.className = "new-item";
				$(input).insertBefore(addButton);
				$(input).focus();
				
				var matchesDiv = document.createElement("div");
				matchesDiv.className = "matches hide";
				$(matchesDiv).insertBefore(addButton);
				
				$(input).on("keyup", function(evt){
					if(evt.keyCode == 13){
						var value = $(input).val();
						var option;
						for(var i=0;i<listOptions.length;i++){
							if(listOptions[i].text == value && !listOptions[i].readonly){
								option = listOptions[i];
								break;
							}
						}
						
						if(option != undefined){
							el.addOption(option.value);
							$(input).remove();
							$(matchesDiv).remove();
							$(addButton).removeClass("hide");
						}
					}
					else if(evt.keyCode == 38){
						evt.preventDefault();
						if(matchesDiv.selectedIndex > 0){
							matchesDiv.selectedIndex--;
							var current = $(matchesDiv).find("div.match.selected");
							$(current).removeClass("selected");
							$(current).prev().addClass("selected");
							$(input).val($(current).prev().html());
						}
						else {
							$(input).val($(matchesDiv).find("div.match.selected").html());
						}
					}
					else if(evt.keyCode == 40){
						evt.preventDefault();
						if(matchesDiv.selectedIndex < listOptions.length - selectedOptions.length - 1){
							matchesDiv.selectedIndex++;
							var current = $(matchesDiv).find("div.match.selected");
							$(current).removeClass("selected");
							$(current).next().addClass("selected");
							$(input).val($(current).next().html());
						}
						else {
							$(input).val($(matchesDiv).find("div.match.selected").html());
						}
					}
					else {
						if($(input).val().length >= 3){
							var matches = [];
							for(var i=0;i<listOptions.length;i++){
								if(includeSearchKeys.length == 0){
									for(var key in listOptions[i]){
										if(excludeSearchKeys.indexOf(key) == -1 && listOptions[i][key].toLowerCase().indexOf($(input).val().toLowerCase()) > -1 && selectedOptions.indexOf(listOptions[i]) == -1 && !listOptions[i].readonly){
											matches.push(listOptions[i].text);
											break;
										}
									}
								}
								else {
									for(var j=0;j<includeSearchKeys.length;j++){
										if(listOptions[i].hasOwnProperty(includeSearchKeys[j])){
											if(listOptions[i][includeSearchKeys[j]].toLowerCase().indexOf($(input).val().toLowerCase()) > -1 && selectedOptions.indexOf(listOptions[i]) == -1 && !listOptions[i].readonly){
												matches.push(listOptions[i].text);
												break;
											}
										}
									}
								}
							}
							
							$(matchesDiv).html("");
							for(var j=0;j<matches.length;j++){
								var match = document.createElement("div");
								match.className = "match";
								$(match).text(matches[j]);
								
								$(match).on("mouseenter", function(evt){
									$(matchesDiv).find("div.match").each(function(index, el){
										$(el).removeClass("selected");
										if(el == evt.target){
											matchesDiv.selectedIndex = index;
										}
									});
									$(evt.target).addClass("selected");
								});
								
								$(match).on("click touch", function(evt){
									$(input).val(evt.target.innerHTML);
									var event = $.Event("keyup");
									event.keyCode = 13;
									$(input).trigger(event);
								});
								
								$(matchesDiv).append(match);
							}
							
							$(matchesDiv).find("div.match").first().addClass("selected");
							matchesDiv.selectedIndex = 0;
							
							$(matchesDiv).removeClass("hide");
						}
						else {
							$(matchesDiv).addClass("hide");
						}
					}
				});
				
				$(input).on("blur", function(evt){
					var value = $(input).val();
					var option;
					for(var i=0;i<listOptions.length;i++){
						if(listOptions[i].text == value && !listOptions[i].readonly){
							option = listOptions[i];
							break;
						}
					}
					
					if(option != undefined){
						el.addOption(option.value);
					}
					
					
					$(input).remove();
					$(matchesDiv).remove();
					$(addButton).removeClass("hide");
				});
			});
			$(el).append(addButton);
			
			el.setListOptions = function(options){
				listOptions = [];
				for(var i=0;i<options.length;i++){
					var option = {};
					for(var key in options[i]){
						if(key == $(el).attr("data-key")){
							option.value = options[i][key];
							if(excludeSearchKeys.indexOf(key) > -1){
								excludeSearchKeys.push("value");
							}
						}
						else if(key == $(el).attr("data-text")){
							option.text = options[i][key];
							if(excludeSearchKeys.indexOf(key) > -1){
								excludeSearchKeys.push("text");
							}
						}
						
						option[key] = options[i][key];
					}
					
					var text = option.text;
					if(text == undefined){
						text = $(el).attr("data-text");
						while(text.indexOf("${") > -1){
							var start = text.indexOf("${");
							var end = text.indexOf("}", start);
							
							var dataKey = text.substring(start+2, end);
							
							var replace = options[i][dataKey] || "";
							text = text.substring(0, start) + replace + text.substring(end+1);
						}
						
						option.text = text;
					}
					
					listOptions.push(option);
				}
			}
			
			el.addOption = function(optionValue, locked, unselected){
				var option;
				var hoverText;
				var hoverTimer;
				
				for(var i=0;i<listOptions.length;i++){
					if(listOptions[i].value == optionValue){
						option = listOptions[i];
						break;
					}
				}
				
				var optionDiv;
				if(option != undefined){
					if(selectedOptions.indexOf(option) == -1 && unselectedOptions.indexOf(option) == -1){					
						optionDiv = document.createElement("div");
						optionDiv.className = "option";
						$(optionDiv).html(option.text);
						$(optionDiv).attr("option-id", optionValue);
						
						if(!locked){
							var removeBtn = document.createElement("span");
							removeBtn.className = "remove fa fa-times";
							$(optionDiv).append(removeBtn);
						
							$(removeBtn).on("click touch", function(evt){
								el.removeOption(option);
							});
						}
						else {
							$(optionDiv).addClass("locked");
						}
						
						$(optionDiv).insertBefore(addButton);
					}
					else {
						optionDiv = $(el).find("div.option[option-id='" + optionValue + "']");
						if(optionDiv.length > 0){
							optionDiv = optionDiv[0];
						}
						
						if(!unselected && unselectedOptions.indexOf(option) > -1){
							optionDiv.setUnlocked();
						}
					}
					
					if(unselected && unselectedOptions.indexOf(option) == -1){
						unselectedOptions.push(option);
					}
					if(!unselected && selectedOptions.indexOf(option) == -1){
						selectedOptions.push(option);
					}
					
					if(!unselected && typeof addCallback == "function"){
						addCallback(option);
					}
					
					$(optionDiv).on("mouseenter", function(evt){
						if(hoverText != undefined){
							hoverTimer = setTimeout(function(){
								generateHover(hoverText, optionDiv);
							}, 1000);
						}
					});
					
					$(optionDiv).on("mouseleave", function(evt){
						clearTimeout(hoverTimer);
						clearHover(optionDiv);
					});
					
					optionDiv.getOption = function(){
						return option;
					}
					
					optionDiv.setHoverText = function(text){
						hoverText = text;
					}
					
					optionDiv.getHoverText = function(){
						return hoverText;
					}
					
					optionDiv.setUnlocked = function(){
						$(optionDiv).removeClass("locked");
						var removeBtn = document.createElement("span");
						removeBtn.className = "remove fa fa-times";
						$(optionDiv).append(removeBtn);
					
						$(removeBtn).on("click touch", function(evt){
							el.removeOption(option);
							if(unselectedOptions.indexOf(option) == -1){
								$(optionDiv).remove();
							}
							else {
								optionDiv.setLocked();
							}
						});
					}
					
					optionDiv.setLocked = function(){
						$(optionDiv).addClass("locked");
						$(optionDiv).find("span.remove").remove();
					}
				}
				
				return optionDiv;
			}
			
			el.removeOption = function(option, unselected){
				var optionDiv;
				if(typeof option != "string"){
					if(option.hasOwnProperty("value")){
						optionDiv = $(el).find("div.option[option-id='" + option.value + "']")[0];
					}
				}
				else {
					optionDiv = $(el).find("div.option[option-id='" + option + "']")[0];
				}
				
				if(optionDiv != undefined){
					option = optionDiv.getOption();
					if(!unselected && selectedOptions.indexOf(option) > -1){
						selectedOptions.splice(selectedOptions.indexOf(option), 1);
						if(unselectedOptions.indexOf(option) == -1){
							$(el).find("div.option[option-id='" + option.value + "']").remove();
							if(typeof removeCallback == "function"){
								removeCallback(option);
							}
						}
						else {
							optionDiv.setLocked();
						}
					}
					else if(unselected && unselectedOptions.indexOf(option) > -1){
						unselectedOptions.splice(unselectedOptions.indexOf(option), 1);
						if(selectedOptions.indexOf(option) == -1){
							$(el).find("div.option[option-id='" + option.value + "']").remove();
							if(typeof removeCallback == "function"){
								removeCallback(option);
							}
						}
					}
				}
			}
			
			el.getSelected = function(){
				var response = [];
				for(var i=0;i<selectedOptions.length;i++){
					response.push(selectedOptions[i]);
				}
				
				return response;
			}
			
			el.getDifferences = function(original){
				var response = {};
				response.added = [];
				response.removed = [];
				
				for(var i=0;i<selectedOptions.length;i++){
					if(original.indexOf(selectedOptions[i].value) == -1){
						response.added.push(selectedOptions[i]);
					}
				}
				
				for(var j=0;j<original.length;j++){
					var exists = false;
					for(var k=0;k<selectedOptions.length;k++){
						if(selectedOptions[k].value == original[j]){
							exists = true;
							break;
						}
					}
					
					if(!exists){
						for(var l=0;l<listOptions.length;l++){
							if(listOptions[l].value == original[j]){
								response.removed.push(listOptions[l]);
								break;
							}
						}
					}
				}
				
				return response;
			}
			
			el.setHoverText = function(text){
				hoverText = text;
			}
			
			el.getHoverText = function(){
				return hoverText;
			}
			
			el.onaddoption = function(fnc){
				if(typeof fnc == "function"){
					addCallback = fnc;
				}
			}
			
			el.onremoveoption = function(fnc){
				if(typeof fnc == "function"){
					removeCallback = fnc;
				}
			}
			
			el.clear = function(){
				selectedOptions = [];
				unselectedOptions = [];
				
				$(el).find("div.option").remove();
			}
		}
		
		function generateHover(text, parent){
			var hover = document.createElement("div");
			hover.className = "hover-text";
			
			$(hover).text(text);
			
			var caret = document.createElement("div");
			caret.className = "caret";
			$(hover).append(caret);
			
			$(parent).append(hover);
		}
		
		function clearHover(parent){
			$(parent).find("div.hover-text").remove();
		}
	});
	
	return AdditiveList;
});