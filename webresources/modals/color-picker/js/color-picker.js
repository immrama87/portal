(function(modal, data){
	data = data || {};
	var width = document.getElementById("color-wheel-div").offsetWidth;
	var height = modal.offsetHeight - document.getElementById("color-wheel-div").offsetTop - (16 * 5);
	var canvas = document.getElementById("color-wheel");
	canvas.width = width;
	canvas.height = height;
	var context = canvas.getContext("2d");
	
	$("#color-cancel").on("click touch", function(evt){
		modal.close();
	});
	
	$("#color-submit").on("click touch", function(evt){
		modal.emit("color-code", $("#hex").val());
		modal.close();
	});
	
	var colorWheel = (function(){
		var cw = {};
		
		var selection = {
			h:	1,
			s:	1,
			l:	0.5
		}
		
		cw.getSeparator = function(){
			return $(canvas).offset().left + (height - 16 * 2);
		}
		
		cw.updateHS = function(evt){
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
		
		cw.updateL = function(evt){
			evt.pageY -= $(canvas).offset().top;
			var total = (height - 16 * 3);
			selection.l = 1 - Blueprint.utils.Math.clamp(evt.pageY / total, 0, 1);
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
				grad.addColorStop(1, "hsl(" + a + ", 100%, 50%)");
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
			
			var luminenceGrad = context.createLinearGradient(x + radius + (16 * 2), 0, x + radius + (16 * 4), y + radius);
			luminenceGrad.addColorStop(0, "hsl(" + selection.h + ", " + (selection.s * 100) + "%, 100%)");
			luminenceGrad.addColorStop(0.5, "hsl(" + selection.h + ", " + (selection.s * 100) + "%, 50%)");
			luminenceGrad.addColorStop(1, "hsl(" + selection.h + ", " + (selection.s * 100) + "%, 0%)");
			context.fillStyle = luminenceGrad;
			context.fillRect(x + radius + 16 * 2, 0, 16*2, y + radius);
			
			var lSelectionY = (y + radius) * (1 - selection.l);
			context.beginPath();
			context.rect(x + radius + 16 * 2 - 1, lSelectionY - 2, 16*2 + 2, 4);
			context.stroke();
			
			setValues();
		}
		
		function setValues(){
			$("#hue").val(selection.h.toFixed(2));
			$("#saturation").val((selection.s * 100).toFixed(2));
			$("#luminosity").val((selection.l * 100).toFixed(2));
			
			var c = (1 - Math.abs(2 * selection.l - 1)) * selection.s;
			var x = c * (1 - Math.abs((selection.h / 60)%2 - 1));
			var m = selection.l - c / 2;
			
			var r, g, b;
			if(selection.h >= 0 && selection.h < 60){
				r = c;
				g = x;
				b = 0;
			}
			else if(selection.h >= 60 && selection.h < 120){
				r = x;
				g = c;
				b = 0;
			}
			else if(selection.h >= 120 && selection.h < 180){
				r = 0;
				g = c;
				b = x;
			}
			else if(selection.h >= 180 && selection.h < 240){
				r = 0;
				g = x;
				b = c;
			}
			else if(selection.h >= 240 && selection.h < 300){
				r = x;
				g = 0;
				b = c;
			}
			else if(selection.h >= 300 && selection.h < 360){
				r = c;
				g = 0;
				b = x;
			}
			
			r = r+m;
			g = g+m;
			b = b+m;
			
			var key = 1 - Math.max(r, g, b);
			var cyan = (1 - r - key) / (1 - key) || 0;
			var magenta = (1 - g - key) / (1 - key) || 0;
			var yellow = (1 - b - key) / (1 - key) || 0;
			
			$("#key").val(key.toFixed(2));
			$("#cyan").val(cyan.toFixed(2));
			$("#magenta").val(magenta.toFixed(2));
			$("#yellow").val(yellow.toFixed(2));
			
			r = Blueprint.utils.Math.clamp(parseInt(r * 255), 0, 255);
			g = Blueprint.utils.Math.clamp(parseInt(g * 255), 0, 255);
			b = Blueprint.utils.Math.clamp(parseInt(b * 255), 0, 255);
			$("#red").val(r);
			$("#green").val(g);
			$("#blue").val(b);
			
			var hex = "#";
			hex += Blueprint.utils.StringUtils.lPad(r.toString(16), 2, "0");
			hex += Blueprint.utils.StringUtils.lPad(g.toString(16), 2, "0");
			hex += Blueprint.utils.StringUtils.lPad(b.toString(16), 2, "0");
			$("#hex").val(hex);
			
			$("#color-swatch").css("background", hex);
		}
		
		draw();
		
		return cw;
	})();
	
	$(modal).find("*.input-field").each(function(index, el){
		$(el).on("change", function(evt){
			colorWheel.updateValue(el.id, $(el).val());
		});
	});
	
	if(data.color){
		colorWheel.setValue(data.color);
	}
	
	$(canvas).on("mousedown", function(evt){
		if(evt.pageX < colorWheel.getSeparator()){
			$(canvas).on("mousemove", colorWheel.updateHS);
		}
		else {
			$(canvas).on("mousemove", colorWheel.updateL);
		}
	});
});