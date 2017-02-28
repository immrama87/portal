(function(modal, data){
	data = data || {};
	var width = document.getElementById("color-wheel-div").offsetWidth;
	var height = modal.offsetHeight - document.getElementById("color-wheel-div").offsetTop - (16 * 5);
	var canvas = document.getElementById("color-wheel");
	canvas.width = width;
	canvas.height = height;
	var context = canvas.getContext("2d");
	
	var colorWheel = (function(){
		var cw = {};
		var desaturated = false;
		var luminenceBounds = [0, 1];
		
		var selection = {
			h:	1,
			s:	1,
			l:	0.5
		}
		
		cw.getSeparator = function(){
			return $(canvas).offset().left + (height - 16 * 2);
		}
		
		cw.setDesaturated = function(){
			desaturated = true;
			draw();
		}
		
		cw.setLuminenceBounds = function(start, end){
			if(start > 1){
				start = start / 100;
			}
			if(end > 1){
				end = end / 100;
			}
			
			luminenceBounds = [start, end];
			draw();
		}
		
		cw.updateHS = function(evt){
			if(!desaturated){
				evt.pageX -= $(canvas).offset().left;
				evt.pageY -= $(canvas).offset().top;
				var radius = (height - 16 * 3) / 2;
				var xDist = evt.pageX - radius;
				var yDist = evt.pageY - radius;
				var totalDist = Math.sqrt((xDist * xDist) + (yDist * yDist));
				selection.s = Blueprint.utils.Math.clamp(totalDist / radius, 0, 1);
				
				var angle = Math.atan2(yDist, xDist) * 180/Math.PI;
				if(angle < 0){
					angle += 360;
				}
				selection.h = angle;
				draw();
				
				$(canvas).on("mouseup", function(evt){
					$(canvas).off("mousemove");
				});
			}
		}
		
		cw.updateL = function(evt){
			evt.pageY -= $(canvas).offset().top;
			var total = (height - 16 * 3);
			selection.l = luminenceBounds[1] - (luminenceBounds[1] - luminenceBounds[0]) * Blueprint.utils.Math.clamp(evt.pageY / total, 0, 1);
			draw();
			
			$(canvas).on("mouseup", function(evt){
				$(canvas).off("mousemove");
			});
		}
		
		cw.updateValue = function(name, value){
			switch(name){
				case "hex":
					if(value.charAt(0) == "#"){
						value = value.substring(1);
					}
					value = Blueprint.utils.Math.clamp(parseInt(value, 16), 0, 16777215);
					value = value.toString(16);
					cw.setValue(value);
					break;
				case "hue":
					value = Blueprint.utils.Math.clamp(value, 0, 359.99);
					selection.h = value;
					draw();
					break;
				case "saturation":
					value = Blueprint.utils.Math.clamp(value, 0, 100);
					selection.s = value/100;
					draw();
					break;
				case "luminosity":
					value = Blueprint.utils.Math.clamp(value, 0, 100);
					selection.l = value/100;
					draw();
					break;
				case "red":
				case "green":
				case "blue":
					var r = Blueprint.utils.Math.clamp($("#red").val(), 0, 255);
					r = parseInt(r);
					var g = Blueprint.utils.Math.clamp($("#green").val(), 0, 255);
					g = parseInt(g);
					var b = Blueprint.utils.Math.clamp($("#blue").val(), 0, 255);
					b = parseInt(b);
					
					var hex = "#";
					hex += Blueprint.utils.StringUtils.lPad(r.toString(16), 2, "0");
					hex += Blueprint.utils.StringUtils.lPad(g.toString(16), 2, "0");
					hex += Blueprint.utils.StringUtils.lPad(b.toString(16), 2, "0");
					
					cw.setValue(hex);
					break;
				case "cyan":
				case "magenta":
				case "yellow":
				case "key":
					var c = Blueprint.utils.Math.clamp($("#cyan").val(), 0, 1);
					var m = Blueprint.utils.Math.clamp($("#magenta").val(), 0, 1);
					var y = Blueprint.utils.Math.clamp($("#yellow").val(), 0, 1);
					var k = Blueprint.utils.Math.clamp($("#key").val(), 0, 1);
					
					var r = Blueprint.utils.Math.clamp(255 * (1-c) * (1-k), 0, 255);
					r = parseInt(r);
					var g = Blueprint.utils.Math.clamp(255 * (1-m) * (1-k), 0, 255);
					g = parseInt(g);
					var b = Blueprint.utils.Math.clamp(255 * (1-y) * (1-k), 0, 255);
					b = parseInt(b);
					
					var hex = "#";
					hex += Blueprint.utils.StringUtils.lPad(r.toString(16), 2, "0");
					hex += Blueprint.utils.StringUtils.lPad(g.toString(16), 2, "0");
					hex += Blueprint.utils.StringUtils.lPad(b.toString(16), 2, "0");
					
					cw.setValue(hex);
					break;
			}
		}
		
		cw.setValue = function(color){
			if(color.charAt(0) == "#"){
				color = color.substring(1);
			}
			
			var r = parseInt(color.substring(0, 2), 16) / 255;
			var g = parseInt(color.substring(2, 4), 16) / 255;
			var b = parseInt(color.substring(4), 16) / 255;
			
			var min = Math.min(r, g, b);
			var max = Math.max(r, g, b);
			var delta = max - min;
			selection.l = (max + min) / 2;
			if(delta == 0){
				selection.h = 0;
				selection.s = 0;
			}
			else {
				if(max == r){
					selection.h = 60 * (((g - b)/delta)%6);
				}
				else if(max == g){
					selection.h = 60 * (((b - r)/delta) + 2);
				}
				else {
					selection.h = 60 * (((r - g)/delta) + 4);
				}
				
				if(selection.h < 0){
					selection.h += 360;
				}
				
				selection.s = delta / (1 - Math.abs(2 * selection.l - 1));
			}
			
			draw();
		}
		
		function draw(){
			context.clearRect(0, 0, canvas.width, canvas.height);
			var radius = (height - 16 * 3) / 2;
			var x = radius;
			var y = radius;
			for(var a=0;a<=360;a++){
				var startAngle = (a-2)*Math.PI/180;
				var endAngle = a*Math.PI/180;
				context.beginPath();
				context.moveTo(x, y);
				context.arc(x, y, radius, startAngle, endAngle);
				context.closePath();
				var grad = context.createLinearGradient(x, y, x + radius * Math.cos(endAngle), y + radius * Math.sin(endAngle));
				grad.addColorStop(0, "hsl(" + a + ", 0%, 50%)");
				if(desaturated){
					grad.addColorStop(1, "hsl(" + a + ", 25%, 50%)");
				}
				else {
					grad.addColorStop(1, "hsl(" + a + ", 100%, 50%)");
				}
				context.fillStyle = grad;
				context.fill();
			}
			
			var selectionAngle = selection.h * Math.PI/180;
			var selectionX = x + (radius * selection.s) * Math.cos(selectionAngle);
			var selectionY = y + (radius * selection.s) * Math.sin(selectionAngle);
			context.beginPath();
			context.arc(selectionX, selectionY, 4, 0, 2 * Math.PI, false);
			context.strokeStyle = "black";
			context.closePath();
			context.stroke();
			
			var luminenceGrad = context.createLinearGradient(x + radius + (16 * 2), 0, x + radius + (16 * 2), y + radius);
			luminenceGrad.addColorStop(0, "hsl(" + selection.h + ", " + selection.s * 100 + "%, " + luminenceBounds[1] * 100 + "%)");
			luminenceGrad.addColorStop(0.5, "hsl(" + selection.h + ", " + selection.s * 100 + "%, " + ((luminenceBounds[1] + luminenceBounds[0]) / 2) * 100 + "%)");
			luminenceGrad.addColorStop(1, "hsl(" + selection.h + ", " + selection.s * 100 + "%, " + luminenceBounds[0] * 100 + "%)");
			
			context.fillStyle = luminenceGrad;
			context.fillRect(x + radius + 16 * 2, 0, 16*2, y + radius);
			
			var lSelectionY = (y + radius) * ((luminenceBounds[1] - selection.l) / (luminenceBounds[1] - luminenceBounds[0]));
			context.beginPath();
			context.rect(x + radius + 16 * 2 - 1, lSelectionY - 2, 16*2 + 2, 4);
			context.stroke();
			
			setValues();
		}
		
		function setValues(){
			$("#hue").val(selection.h.toFixed(2));
			$("#saturation").val((selection.s * 100).toFixed(2));
			$("#luminosity").val((selection.l * 100).toFixed(2));
			
			var r, g, b;
			var rgb = Blueprint.utils.ColorUtils.hslToRgb(selection.h, selection.s, selection.l);
			r = rgb[0];
			g = rgb[1];
			b = rgb[2];
			
			$("#red").val(r);
			$("#green").val(g);
			$("#blue").val(b);
			
			var cyan,magenta,yellow,key;
			var cmyk = Blueprint.utils.ColorUtils.rgbToCmyk(r,g,b);
			
			$("#cyan").val(cmyk[0].toFixed(2));
			$("#magenta").val(cmyk[1].toFixed(2));
			$("#yellow").val(cmyk[2].toFixed(2));
			$("#key").val(cmyk[3].toFixed(2));
			
			var hex = Blueprint.utils.ColorUtils.rgbToHex(r,g,b);
			$("#hex").val(hex);
			
			$("#color-swatch").css("background", hex);
		}
		
		draw();
		
		return cw;
	})();
	
	if(data.color){
		colorWheel.setValue(data.color);
	}
	if(data.modifier){
		var originalLuminence = parseFloat($("#luminosity").val());
		colorWheel.updateValue("luminosity", originalLuminence + parseFloat(data.modifier));
		colorWheel.setDesaturated();
		if(data.swatchName){
			switch(data.swatchName){
				case "swatch-darkest":
					colorWheel.setLuminenceBounds(0, originalLuminence + (data.modifier / 2));
					break;
				case "swatch-dark":
					colorWheel.setLuminenceBounds(originalLuminence + (data.modifier * 2), originalLuminence);
					break;
				case "swatch-light":
					colorWheel.setLuminenceBounds(originalLuminence, originalLuminence + (data.modifier * 2));
					break;
				case "swatch-lightest":
					colorWheel.setLuminenceBounds(originalLuminence + (data.modifier / 2), 1);
					break;
			}
			
			$("#color-submit").on("click touch", function(evt){
				data.modifier = parseFloat($("#luminosity").val()) - originalLuminence;
				modal.emit("color-data", data);
				modal.close();
			});
		}
	}
	else {
		$("#color-submit").on("click touch", function(evt){
			data.color = $("#hex").val();
			modal.emit("color-data", data);
			modal.close();
		});
		
		$(modal).find("*.input-field").each(function(index, el){
			$(el).on("change", function(evt){
				colorWheel.updateValue(el.id, $(el).val());
			});
		});
	}
	
	$("#color-cancel").on("click touch", function(evt){
		modal.close();
	});
	
	$(canvas).on("mousedown", function(evt){
		if(evt.pageX < colorWheel.getSeparator()){
			$(canvas).on("mousemove", colorWheel.updateHS);
		}
		else {
			colorWheel.updateL(evt);
			$(canvas).on("mousemove", colorWheel.updateL);
		}
	});
});