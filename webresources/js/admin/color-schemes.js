var ramps = [];

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
				
				generateColorRamp(details);
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
					
					generateColorRamp(details);
				});
			});
		}
	});
	
	$("#scheme-save").on("click touch", function(evt){
		var colors = [];
		for(var i=0;i<ramps.length;i++){
			colors.push(ramps[i].getColor());
		}
	});
});

function generateColorRamp(colorDetails){
	colorDetails.darkest = colorDetails.darkest || -20;
	colorDetails.dark = colorDetails.dark || -10;
	colorDetails.light = colorDetails.light || 10;
	colorDetails.lightest = colorDetails.lightest || 20;
	var ramp = document.createElement("section");
	ramp.className = "ramp";
	var nameDiv = document.createElement("div");
	nameDiv.className = "col-xs-2 name-div";
	$(nameDiv).text(colorDetails.name);
	
	$(ramp).append(nameDiv);
	
	var darkestDiv = createColorDiv(colorDetails.color, colorDetails.darkest, ramp);
	$(darkestDiv).find("div.color-box").addClass("swatch-darkest");
	$(ramp).append(darkestDiv);
	
	var darkDiv = createColorDiv(colorDetails.color, colorDetails.dark, ramp);
	$(darkDiv).find("div.color-box").addClass("swatch-dark");
	$(ramp).append(darkDiv);
	
	var mediumDiv = createColorDiv(colorDetails.color, 0, ramp);
	$(mediumDiv).find("div.color-box").addClass("swatch-medium");
	$(ramp).append(mediumDiv);
	
	var lightDiv = createColorDiv(colorDetails.color, colorDetails.light, ramp);
	$(lightDiv).find("div.color-box").addClass("swatch-light");
	$(ramp).append(lightDiv);
	
	var lightestDiv = createColorDiv(colorDetails.color, colorDetails.lightest, ramp);
	$(lightestDiv).find("div.color-box").addClass("swatch-lightest");
	$(ramp).append(lightestDiv);
	
	var accent = getAccentColor(colorDetails.color);
	var accentRamp = document.createElement("section");
	accentRamp.className = "ramp accent";
	
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
	
	ramp.update = function(swatchName, newModifier){
		switch(swatchName){
			case "swatch-darkest":
				darkestDiv.update(newModifier);
				darkestAccent.update(newModifier);
				darkDiv.update(newModifier/2);
				darkAccent.update(newModifier/2);
				break;
			case "swatch-dark":
				darkDiv.update(newModifier);
				darkAccent.update(newModifier);
				darkestDiv.update(newModifier*2);
				darkestAccent.update(newModifier*2);
				break;
			case "swatch-light":
				lightDiv.update(newModifier);
				lightAccent.update(newModifier);
				lightestDiv.update(newModifier*2);
				lightestAccent.update(newModifier*2);
				break;
			case "swatch-lightest":
				lightestDiv.update(newModifier);
				lightestAccent.update(newModifier);
				lightDiv.update(newModifier/2);
				lightAccent.update(newModifier/2);
				break;
		}
	}
	
	ramp.setColor = function(newColor){
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
	
	ramps.push(ramp);
	
	$("#color-ramps").append(ramp);
	$("#color-ramps").append(accentRamp);
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
	
	$(box).on("mousedown", function(evt){
		var swatchName = box.className.substring(box.className.indexOf("swatch-"));
		var triggerMouseUp = true;
		switch(swatchName){
			case "swatch-darkest":
				createSlider(box, colorDetails.color, colorDetails.luminosity * -100, (modifier/2)*-1); 
				break;
			case "swatch-dark":
				createSlider(box, colorDetails.color, modifier * 2, -5 - modifier);
				break;
			case "swatch-light":
				createSlider(box, colorDetails.color, 5 - modifier, modifier * 2);
				break;
			case "swatch-lightest":
				createSlider(box, colorDetails.color, (modifier/2)*-1, colorDetails.luminosity * 100);
				break;
			case "swatch-medium":
				var modal = Blueprint.utils.Modals.createModal("color-picker", {width: "50%", height: "50%", data: {color: color}});
				modal.on("color-code", ramp.setColor);
				triggerMouseUp = false;
				break;
		}
		
		if(triggerMouseUp){
			$(window).one("mouseup", function(evt){
				$(box).find("div.slider").remove();
				var xDiff = evt.pageX - ($(box).offset().left + box.offsetWidth/2);
				var range = [modifier];
				switch(swatchName){
					case "swatch-darkest":
						if(xDiff < 0){
							range.push(colorDetails.luminosity * -100);
						}
						else {
							range.push((modifier/2) * -1);
						}
						break;
					case "swatch-dark":
						if(xDiff < 0){
							range.push(modifier * 2);
						}
						else {
							range.push(-5 - modifier);
						}
						break;
					case "swatch-light":
						if(xDiff < 0){
							range.push(5 - modifier);
						}
						else {
							range.push(modifier * 2);
						}
						break;
					case "swatch-lightest":
						if(xDiff < 0){
							range.push((modifier/2)*-1);
						}
						else {
							range.push(colorDetails.luminosity * 100);
						}
						break;
				}
				
				var perc = Blueprint.utils.Math.clamp((Math.abs(xDiff) / (box.offsetWidth/2)), 0, 1);
				var total = range[1] - range[0];
				ramp.update(swatchName, modifier + total*perc);
			});
		}
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
	if(color.charAt(0) == "#"){
		color = color.substring(1);
	}
	
	var r = parseInt(color.substring(0, 2), 16) / 255;
	var g = parseInt(color.substring(2, 4), 16) / 255;
	var b = parseInt(color.substring(4), 16) / 255;
	
	var m = amt/100;
	
	r = Blueprint.utils.Math.clamp(parseInt((r+m)*255), 0, 255);
	g = Blueprint.utils.Math.clamp(parseInt((g+m)*255), 0, 255);
	b = Blueprint.utils.Math.clamp(parseInt((b+m)*255), 0, 255);
	var l = (Math.max(r,g,b)/255 + Math.min(r,g,b)/255)/2;
	
	var response = "#" 
	response += Blueprint.utils.StringUtils.lPad(r.toString(16), 2, "0"); 
	response += Blueprint.utils.StringUtils.lPad(g.toString(16), 2, "0");
	response += Blueprint.utils.StringUtils.lPad(b.toString(16), 2, "0");
	
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

Blueprint.modules.activeModule().setData = function(data){
	$.ajax({
		method:		"get",
		url:		"/rest/v1/admin/color-schemes/" + data[0] + "/colors",
		dataType:	"json"
	})
	.done(function(response){
		for(var i=0;i<response.length;i++){
			generateColorRamp(response[i]);
		}
	});
	
	$.ajax({
		method:		"get",
		url:		"/rest/v1/admin/color-schemes/" + data[0],
		dataType:	"json"
	})
	.done(function(response){
		$("#scheme-info").text(response.name);
		$("#scheme-info").append(Blueprint.utils.VersionManager.createVersionWidget(response.versions));
	});
}