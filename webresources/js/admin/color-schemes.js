var ramps = [];
var deleted = [];
var schemeId;
var versionWidget;

$(function(){
	Blueprint.modules.activeModule().ready();
	
	var names = ["primary", "secondary", "tertiary"];
	
	$("#add-ramp").on("click touch", function(evt){
		if(ramps.length < names.length){
			var modal = Blueprint.utils.Modals.createModal("color-picker", {width: "50%", height: "50%"});
			modal.on("color-code", function(color){
				var details = {
					name: names[ramps.length],
					color: color
				};
				
				var ramp = generateColorRamp(details);
				Blueprint.modules.changeManager.pushChange({color: ramp.getColor().name, property: "create", value: ramp.getColor(), original: ramps.length - 1});
			});
		}
		else {
			Blueprint.utils.Messaging.prompt("Please enter a name for the new color:", function(name){
				name = name.toLowerCase().replace(/\s/g, "-");
				var modal = Blueprint.utils.Modals.createModal("color-picker", {width: "50%", height: "50%"});
				modal.on("color-code", function(color){
					var details = {
						name: name,
						color: color
					};
					
					var ramp = generateColorRamp(details);
					Blueprint.modules.changeManager.pushChange({color: ramp.getColor().name, property: "create", value: ramp.getColor(), original: ramps.length - 1});
				});
			});
		}
	});
	
	$("#scheme-save").on("click touch", function(evt){
		var colors = [];
		for(var i=0;i<ramps.length;i++){
			colors.push(ramps[i].getColor());
		}

		var deletes = [];
		for(var i=0;i<deleted.length;i++){
			deletes.push(deleted[i].getColor());
		}
		
		$.ajax({
			method:			"post",
			url:			"/rest/v1/admin/color-schemes/" + schemeId + "/colors/" + versionWidget.getVersion(),
			data:			JSON.stringify({colors: colors, deletes: deletes}),
			contentType:	"application/json"
		})
		.done(function(){
			Blueprint.utils.Messaging.alert("Color scheme successfully saved.");
			Blueprint.modules.changeManager.setSaved();
		});
	});
});

function generateColorRamp(colorDetails, index){
	colorDetails.darkest = colorDetails.darkest || -20;
	colorDetails.dark = colorDetails.dark || -10;
	colorDetails.light = colorDetails.light || 10;
	colorDetails.lightest = colorDetails.lightest || 20;
	var ramp = document.createElement("section");
	ramp.className = "ramp-section";
	var main = document.createElement("div");
	main.className = "ramp row";
	var nameDiv = document.createElement("div");
	nameDiv.className = "col-xs-2 name-div";
	$(nameDiv).text(colorDetails.name);
	
	$(main).append(nameDiv);
	
	var darkestDiv = createColorDiv(colorDetails.color, colorDetails.darkest, ramp);
	$(darkestDiv).find("div.color-box").addClass("swatch-darkest");
	$(main).append(darkestDiv);
	
	var darkDiv = createColorDiv(colorDetails.color, colorDetails.dark, ramp);
	$(darkDiv).find("div.color-box").addClass("swatch-dark");
	$(main).append(darkDiv);
	
	var mediumDiv = createColorDiv(colorDetails.color, 0, ramp);
	$(mediumDiv).find("div.color-box").addClass("swatch-medium");
	$(main).append(mediumDiv);
	
	var lightDiv = createColorDiv(colorDetails.color, colorDetails.light, ramp);
	$(lightDiv).find("div.color-box").addClass("swatch-light");
	$(main).append(lightDiv);
	
	var lightestDiv = createColorDiv(colorDetails.color, colorDetails.lightest, ramp);
	$(lightestDiv).find("div.color-box").addClass("swatch-lightest");
	$(main).append(lightestDiv);
	$(ramp).append(main);
	
	var accent = getAccentColor(colorDetails.color);
	var accentRamp = document.createElement("div");
	accentRamp.className = "ramp accent row";
	
	var accentName = document.createElement("div");
	accentName.className = "col-xs-2 name-div";
	$(accentName).text("-accent");
	$(accentRamp).append(accentName);
	
	var darkestAccent = createColorDiv(accent, -20, ramp);
	$(accentRamp).append(darkestAccent);
	
	var darkAccent = createColorDiv(accent, -10, ramp);
	$(accentRamp).append(darkAccent);
	
	var mediumAccent = createColorDiv(accent, 0, ramp);
	$(accentRamp).append(mediumAccent);
	
	var lightAccent = createColorDiv(accent, 10, ramp);
	$(accentRamp).append(lightAccent);
	
	var lightestAccent = createColorDiv(accent, 20, ramp);
	$(accentRamp).append(lightestAccent);
	$(ramp).append(accentRamp);
	
	var deleteRow = document.createElement("section");
	deleteRow.className = "text-center";
	var deleteBtn = document.createElement("button");
	deleteBtn.className = "btn btn-link";
	$(deleteBtn).on("click touch", function(evt){
		Blueprint.modules.changeManager.pushChange({"color": colorDetails.name, "property": "delete", "value": ramp.getColor(), "original": ramps.indexOf(ramp)});
		ramps.splice(ramps.indexOf(ramp), 1);
		deleted.push(ramp);
		$(ramp).remove();
	});
	$(deleteBtn).text("Delete Ramp");
	$(deleteRow).append(deleteBtn);
	$(ramp).append(deleteRow);
	
	ramp.update = function(swatchName, newModifier, skipChange){
		var original, property;
		switch(swatchName){
			case "swatch-darkest":
				original = darkestDiv.getModifier();
				property = "darkest";
				darkestDiv.update(newModifier);
				darkestAccent.update(newModifier);
				darkDiv.update(newModifier/2);
				darkAccent.update(newModifier/2);
				break;
			case "swatch-dark":
				original = darkDiv.getModifier();
				property = "dark";
				darkDiv.update(newModifier);
				darkAccent.update(newModifier);
				darkestDiv.update(newModifier*2);
				darkestAccent.update(newModifier*2);
				break;
			case "swatch-light":
				original = lightDiv.getModifier();
				property = "light";
				lightDiv.update(newModifier);
				lightAccent.update(newModifier);
				lightestDiv.update(newModifier*2);
				lightestAccent.update(newModifier*2);
				break;
			case "swatch-lightest":
				original = lightestDiv.getModifier();
				property = "lightest";
				lightestDiv.update(newModifier);
				lightestAccent.update(newModifier);
				lightDiv.update(newModifier/2);
				lightAccent.update(newModifier/2);
				break;
		}
		
		if(!skipChange){
			Blueprint.modules.changeManager.pushChange({"color": colorDetails.name, "property": property, "value": newModifier, "original": original});
		}
	}
	
	ramp.setColor = function(newColor, skipChange){
		if(!skipChange){
			Blueprint.modules.changeManager.pushChange({"color": colorDetails.name, "property": "color", "value": newColor, "original": colorDetails.color});
		}
		colorDetails.color = newColor;
		darkestDiv.changeColor(newColor);
		darkDiv.changeColor(newColor);
		mediumDiv.changeColor(newColor);
		lightDiv.changeColor(newColor);
		lightestDiv.changeColor(newColor);
		
		accent = getAccentColor(newColor);
		darkestAccent.changeColor(accent);
		darkAccent.changeColor(accent);
		mediumAccent.changeColor(accent);
		lightAccent.changeColor(accent);
		lightestAccent.changeColor(accent);
	}
	
	ramp.getColor = function(){
		colorDetails.darkest = darkestDiv.getModifier();
		colorDetails.dark = darkDiv.getModifier();
		colorDetails.light = lightDiv.getModifier();
		colorDetails.lightest = lightestDiv.getModifier();
		
		return colorDetails;
	}
	
	if(!index){
		ramps.push(ramp);
		$("#color-ramps").append(ramp);
	}
	else {
		if(ramps.length > index){
			$(ramp).insertBefore(ramps[index]);
		}
		else {
			$("#color-ramps").append(ramp);
		}
		ramps.splice(index, 0, ramp);
	}
	
	return ramp;
}

function getRamp(name){
	for(var i=0;i<ramps.length;i++){
		if(ramps[i].getColor().name == name){
			return ramps[i];
		}
	}
}

function createColorDiv(color, modifier, ramp){
	var div = document.createElement("div");
	div.className = "col-xs-2";
	var box = document.createElement("div");
	box.className = "color-box";
	var colorDetails = modifyColor(color, modifier);
	var shadowColor = parseInt(255 - (255 * colorDetails.luminosity));
	$(box).css({
		"background-color": colorDetails.color,
		"box-shadow": "0 0 1em rgba(" + shadowColor + "," + shadowColor + "," + shadowColor + ",0.1)"
	});
	
	$(box).on("click touch", function(evt){
		var swatchName = box.className.substring(box.className.indexOf("swatch-"));
		var modal;
		switch(swatchName){
			case "swatch-medium":
				modal = Blueprint.utils.Modals.createModal("color-picker", {width: "50%", height: "55%", data: {color: color}});
				break;
			default:
				modal = Blueprint.utils.Modals.createModal("color-picker", {width: "50%", height: "55%", data: {color: color, modifier: modifier, swatchName: swatchName}});
				break;
		}
		
		modal.on("color-data", function(data){
			if(data.swatchName){
				ramp.update(data.swatchName, data.modifier);
			}
			else {
				ramp.setColor(data.color);
			}
		});
	});
	$(div).append(box);
	
	div.update = function(newModifier){
		modifier = newModifier;
		colorDetails = modifyColor(color, newModifier);
		shadowColor = parseInt(255 - (255 * colorDetails.luminosity));
		$(box).css({
			"background-color": colorDetails.color,
			"box-shadow": "0 0 1em rgba(" + shadowColor + "," + shadowColor + "," + shadowColor + ",0.1)"
		});
	}
	
	div.changeColor = function(newColor){
		color = newColor;
		colorDetails = modifyColor(color, modifier);
		shadowColor = parseInt(255 - (255 * colorDetails.luminosity));
		$(box).css({
			"background-color": colorDetails.color,
			"box-shadow": "0 0 1em rgba(" + shadowColor + "," + shadowColor + "," + shadowColor + ",0.1)"
		});
	}
	
	div.getModifier = function(){
		return modifier;
	}
	
	return div;
}

function createSlider(parent, color, start, end){
	var slider = document.createElement("div");
	slider.className = "slider";
	$(parent).append(slider);
	
	var startColor = modifyColor(color, start).color;
	var endColor = modifyColor(color, end).color; 
	
	$(slider).css("background", "linear-gradient(to right, " + startColor + " 0%," + color + " 50%, " + endColor + " 100%)");
}

function modifyColor(color, amt){
	var hsl = Blueprint.utils.ColorUtils.hexToHsl(color);
	var h = hsl[0];
	var s = hsl[1];
	var l = Blueprint.utils.Math.clamp(hsl[2] + (amt/100), 0, 1);
	
	var response = Blueprint.utils.ColorUtils.hslToHex(h,s,l);
	
	return {
		color: response,
		luminosity: l
	};
}

function getAccentColor(color){
	if(color.charAt(0) == "#"){
		color = color.substring(1);
	}
	
	var r = parseInt(color.substring(0, 2), 16) / 255;
	var g = parseInt(color.substring(2, 4), 16) / 255;
	var b = parseInt(color.substring(4), 16) / 255;
	
	var min = Math.min(r,g,b);
	var max = Math.min(r,g,b);
	
	var l = (max+min)/2;
	
	var m = 0.5;
	if(l > 0.5){
		m*=-1;
	}
	
	r = Blueprint.utils.Math.clamp(parseInt((r+m)*255), 0, 255);
	g = Blueprint.utils.Math.clamp(parseInt((g+m)*255), 0, 255);
	b = Blueprint.utils.Math.clamp(parseInt((b+m)*255), 0, 255);
	
	var response = "#" 
	response += Blueprint.utils.StringUtils.lPad(r.toString(16), 2, "0"); 
	response += Blueprint.utils.StringUtils.lPad(g.toString(16), 2, "0");
	response += Blueprint.utils.StringUtils.lPad(b.toString(16), 2, "0");
	
	return response;
}

function getVersion(version){
	versionWidget.setChangeHistoryUrl("/rest/v1/admin/color-schemes/" + schemeId + "/colors/" + version + "/change-history", {
		change:	function(data){
			var changeDetails = JSON.parse(data);
			var output = document.createElement("div");
			for(var i=0;i<changeDetails.length;i++){
				var change = document.createElement("div");
				if(changeDetails[i].type == "created"){
					$(change).text("Created color '" + changeDetails[i].object_id + "'.");
				}
				else if(changeDetails[i].type == "deleted"){
					$(change).text("Deleted color '" + changeDetails[i].object_id + "'.");
				}
				else if(changeDetails[i].type == "modified"){
					$(change).text("Modified color '" + changeDetails[i].object_id + "'.");
					$(change).append("<br />");
					$(change).append("&nbsp;&nbsp;Changes:");
					for(var j=0;j<changeDetails[i].changes.length;j++){
						var field = changeDetails[i].changes[j].field;
						var original = changeDetails[i].changes[j].original;
						var value = changeDetails[i].changes[j].value;
						$(change).append("<br />&nbsp;&nbsp;&nbsp;&nbsp;");
						if(field == "color"){
							if(original.charAt(0) != "#"){
								original = "#" + original;
							}
							if(value.charAt(0) != "#"){
								value = "#" + value;
							}
							$(change).append("Changed color from <span style='font-weight:bold;color:" + original + "'>" + original + "</span> to <span style='font-weight:bold;color:" + value + "'>" + value + "</span>.");
						}
						else {
							$(change).append("Changed " + field + " from " + original + " to " + value + ".");
						}
					}
				}
				
				output.appendChild(change);
			}
			
			return output;
		}
	}, function(reversionId, modal){
		$.ajax({
			method:		"post",
			url:		"/rest/v1/admin/color-schemes/" + schemeId + "/colors/" + version + "/revert/" + reversionId
		})
		.done(function(){
			Blueprint.utils.Messaging.alert("Successfully reverted Color Scheme state.");
			modal.close();
			Blueprint.modules.changeManager.clearChanges();
			Blueprint.modules.activeModule().setData([schemeId, version]);
		})
		.fail(function(xhr, status, err){
			Blueprint.utils.Messaging.alert("Error reverting Color Scheme state.", true, xhr.responseText);
		});
	});
	
	versionWidget.on("publish", function(){
		var colors = [];
		for(var i=0;i<ramps.length;i++){
			colors.push(ramps[i].getColor());
		}

		var deletes = [];
		for(var i=0;i<deleted.length;i++){
			deletes.push(deleted[i].getColor());
		}
		
		$.ajax({
			method:			"post",
			url:			"/rest/v1/admin/color-schemes/" + schemeId + "/colors/" + versionWidget.getVersion(),
			data:			JSON.stringify({colors: colors, deletes: deletes}),
			contentType:	"application/json"
		})
		.done(function(){
			Blueprint.modules.changeManager.setSaved();
			$.ajax({
				method:		"post",
				url:		"/rest/v1/admin/color-schemes/" + schemeId + "/colors/" + version + "/publish",
				dataType:	"json"
			})
			.done(function(response){
				Blueprint.utils.Messaging.alert("Successfully published color scheme.");
				Blueprint.modules.activeModule().setData([schemeId, response.newVersion]);
			})
			.fail(function(xhr, status, err){
				Blueprint.utils.Messaging.alert("Error publishing color scheme.", true, xhr.responseText);
			});
		});
	});
	
	versionWidget.on("delete", function(){
		$.ajax({
			method:		"delete",
			url:		"/rest/v1/admin/color-schemes/" + schemeId
		})
		.done(function(response){
			Blueprint.utils.Messaging.alert("Successfully deleted color scheme draft.");
			Blueprint.modules.activeModule().setData([schemeId]);
		})
		.fail(function(xhr, status, err){
			Blueprint.utils.Messaging.alert("Error deleting color scheme version.", true, xhr.responseText);
		});
	});
	
	versionWidget.on("create-draft", function(){
		$.ajax({
			method:		"post",
			url:		"/rest/v1/admin/color-schemes/" + schemeId + "/colors/" + version + "/create-draft"
		})
		.done(function(){
			Blueprint.modules.activeModule().setData([schemeId, "draft"]);
		})
		.fail(function(xhr, status, err){
			Blueprint.utils.Messaging.alert("Error creating draft version.", true, xhr.responseText);
		});
	});
	
	versionWidget.on("version-details", function(data){
		$.ajax({
			method:		"get",
			url:		"/rest/v1/admin/color-schemes/" + schemeId + "/colors/" + data.version,
			dataType:	"json"
		})
		.done(function(response){
			var details = document.createElement("div");
			for(var i=0;i<response.length;i++){
				var color = document.createElement("div");
				$(color).html("<strong>Color Name:</strong>&nbsp;" + response[i].name + "<br />");
				var colorCode = response[i].color;
				if(colorCode.charAt(0) != "#"){
					colorCode = "#" + colorCode;
				}
				$(color).append("<strong>Color Value:</strong>&nbsp;<span style='color:" + colorCode + ";'>" + response[i].color + "</span><br />");
				$(color).append("<br />");
				$(details).append(color);
			}
			
			var revertButton = document.createElement("button");
			revertButton.className = "btn btn-link";
			$(revertButton).text("Revert to Version");
			$(revertButton).on("click touch", function(evt){
				$.ajax({
					method:		"post",
					url:		"/rest/v1/admin/color-schemes/" + schemeId + "/colors/" + version + "/revert-version/" + data.version
				})
				.done(function(){
					data.closeModal();
					Blueprint.modules.activeModule().setData([schemeId, version]);
				})
				.fail(function(xhr, status, err){
					Blueprint.utils.Messaging.alert("Error reverting to version.", true, xhr.responseText);
				});	
			});
			$(details).append(revertButton);
			
			$(data.cell).removeClass("text-right").html(details);
		});
	});
	
	$.ajax({
		method:		"get",
		url:		"/rest/v1/admin/color-schemes/" + schemeId + "/colors/" + version,
		dataType:	"json"
	})
	.done(function(response){
		ramps = [];
		$("#color-ramps").html("");
		response.sort(function(a,b){
			if(a.name == "primary"){
				return -1;
			}
			else if(a.name == "secondary"){
				if(b.name == "primary"){
					return 1;
				}
				else {
					return -1;
				}
			}
			else if(a.name == "tertiary"){
				if(b.name == "primary" || b.name == "secondary"){
					return 1;
				}
				else {
					return -1;
				}
			}
			else {
				return 0;
			}
		});
		for(var i=0;i<response.length;i++){
			generateColorRamp(response[i]);
			
			if(versionWidget.isDraftVersion()){
				$("#add-ramp").removeClass("hide");
				$("#scheme-save").removeAttr("disabled");
			}
			else {
				$("#add-ramp").addClass("hide");
				$("#scheme-save").attr("disabled", true);
			}
		}
	});
}

function checkChanges(next){
	if(Blueprint.modules.changeManager.hasChanges()){
		Blueprint.utils.Messaging.confirm("Changes have been made that will be lost. Continue?", function(conf){
			if(conf){
				next();
			}
		});
	}
	else {
		next();
	}
}

Blueprint.modules.activeModule().undoChange = function(change){
	var ramp = getRamp(change.color);
	if(ramp != undefined){
		if(change.property == "color"){
			ramp.setColor(change.original, true);
		}
		else if(change.property == "create"){
			ramps.splice(ramps.indexOf(ramp), 1);
			$(ramp).remove();
		}
		else {
			ramp.update("swatch-" + change.property, change.original, true);
		}
	}
	else if(change.property == "delete"){
		for(var i=0;i<deleted.length;i++){
			if(deleted[i].getColor().name == change.color){
				ramp = deleted[i];
				break;
			}
		}
		
		if(ramp != undefined){
			generateColorRamp(change.value, change.original);
			deleted.splice(deleted.indexOf(ramp), 1);
		}
	}
}

Blueprint.modules.activeModule().redoChange = function(change){
	var ramp = getRamp(change.color);
	if(ramp != undefined){
		if(change.property == "color"){
			ramp.setColor(change.value, true);
		}
		else if(change.property == "delete"){
			ramps.splice(ramps.indexOf(ramp), 1);
			deleted.push(ramp);
			$(ramp).remove();
		}
		else {
			ramp.update("swatch-" + change.property, change.value, true);
		}
	}
	else if(change.property == "create"){
		generateColorRamp(change.value, change.original);
	}
}

Blueprint.modules.activeModule().setData = function(data){
	Blueprint.modules.activeModule().updateHistoryState(data);
	if(data.length > 0){
		schemeId = data[0];
		$.ajax({
			method:		"get",
			url:		"/rest/v1/admin/color-schemes/" + data[0],
			dataType:	"json"
		})
		.done(function(response){
			$("#scheme-info").text(response.name);
			versionWidget = Blueprint.utils.VersionManager.createVersionWidget(response.versions);
			$("#scheme-info").append(versionWidget);
			if(data.length > 1){
				versionWidget.setVersion(data[1]);
			}
			
			versionWidget.onchange(getVersion);
			
			getVersion(versionWidget.getVersion());
		});
	}
	else {
		Blueprint.utils.Messaging.forcePrompt("Please enter a name for the new Color Scheme:", function(schemeName){
			var newSchemeId = schemeName.toLowerCase().replace(/\s/g, "-");
			$.ajax({
				method:	"post",
				url:	"/rest/v1/admin/color-schemes",
				data:	JSON.stringify({
					name: 		schemeName,
					schemeId:	newSchemeId
				}),
				contentType:	"application/json"
			})
			.done(function(){
				Blueprint.modules.activeModule().updateHistoryState([newSchemeId], schemeName + " Scheme Configuration");
				Blueprint.modules.activeModule().setData([newSchemeId]);
			});
		});
	}
}

Blueprint.modules.activeModule().destroy = function(next){
	checkChanges(function(){
		delete ramps;
		delete schemeId;
		delete versionWidget;
		delete generateColorRamp;
		delete createColorDiv;
		delete createSlider;
		delete modifyColor;
		delete getAccentColor;
		delete getVersion;
	
		next();
	});
}