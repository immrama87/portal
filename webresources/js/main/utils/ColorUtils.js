define("utils/ColorUtils", [], function(){
	var cu = {};
	
	cu.hexToRgb = function(hex){
		if(hex.charAt(0) == "#"){
			hex = hex.substring(1);
		}
		
		var rStr = hex.substring(0, 2);
		var gStr = hex.substring(2, 4);
		var bStr = hex.substring(4, 6);
		
		var r = Blueprint.utils.Math.clamp(parseInt(rStr, 16), 0, 255);
		var g = Blueprint.utils.Math.clamp(parseInt(gStr, 16), 0, 255);
		var b = Blueprint.utils.Math.clamp(parseInt(bStr, 16), 0, 255);
		
		return [r,g,b];
	}
	
	cu.rgbToHex = function(r,g,b){
		r = Blueprint.utils.Math.clamp(r, 0, 255);
		g = Blueprint.utils.Math.clamp(g, 0, 255);
		b = Blueprint.utils.Math.clamp(b, 0, 255);
		
		var hex = "#";
		hex += Blueprint.utils.StringUtils.lPad(r.toString(16), 2, "0");
		hex += Blueprint.utils.StringUtils.lPad(g.toString(16), 2, "0");
		hex += Blueprint.utils.StringUtils.lPad(b.toString(16), 2, "0");
		
		return hex;
	}
	
	cu.rgbToHsl = function(r,g,b){
		r = Blueprint.utils.Math.clamp(r, 0, 255) / 255;
		g = Blueprint.utils.Math.clamp(g, 0, 255) / 255;
		b = Blueprint.utils.Math.clamp(b, 0, 255) / 255;
		
		var min = Math.min(r,g,b);
		var max = Math.max(r,g,b);
		var delta = max - min;
		
		var h,s,l;
		l = (max + min) / 2;
		if(delta == 0){
			h = 0;
			s = 0;
		}
		else {
			if(max == r){
				h = 60 * (((g - b)/delta)%6);
			}
			else if(max == g){
				h = 60 * (((b - r)/delta) + 2);
			}
			else if(max == b){
				h = 60 * (((r - g)/delta) + 4);
			}
			s = delta / (1 - Math.abs(2*l - 1));
		}
		
		if(h < 0){
			h += 360;
		}
		
		h = Blueprint.utils.Math.clamp(h, 0, 360);
		s = Blueprint.utils.Math.clamp(s, 0, 1);
		l = Blueprint.utils.Math.clamp(l, 0, 1);
		
		return [h,s,l];
	}
	
	cu.hslToRgb = function(h,s,l){
		if(h < 0){
			h += 360;
		}
		if(s > 1){
			s = s/100;
		}
		if(l > 1){
			l = l/100;
		}
		
		var c = (1 - Math.abs(2*l - 1)) * s;
		var x = c * (1 - Math.abs((h/60)%2 - 1));
		var m = l - c/2;
		
		var r,g,b;
		
		if(h >= 0 && h < 60){
			r = c, g = x, b = 0;
		}
		else if(h >= 60 && h < 120){
			r = x, g = c, b = 0;
		}
		else if(h >= 120 && h < 180){
			r = 0, g = c, b = x;
		}
		else if(h >= 180 && h < 240){
			r = 0, g = x, b = c;
		}
		else if(h >= 240 && h < 300){
			r = x, g = 0, b = c;
		}
		else if(h >= 300 && h < 360){
			r = c, g = 0, b = x;
		}
		
		r = parseInt(Blueprint.utils.Math.clamp(r+m, 0, 1) * 255);
		g = parseInt(Blueprint.utils.Math.clamp(g+m, 0, 1) * 255);
		b = parseInt(Blueprint.utils.Math.clamp(b+m, 0, 1) * 255);
		
		return [r,g,b];
	}
	
	cu.rgbToCmyk = function(r,g,b){
		r = Blueprint.utils.Math.clamp(r, 0, 255) / 255;
		g = Blueprint.utils.Math.clamp(g, 0, 255) / 255;
		b = Blueprint.utils.Math.clamp(b, 0, 255) / 255;
		
		var c,m,y,k;
		k = 1 - Math.max(r,g,b);
		c = (1-r-k)/(1-k);
		m = (1-g-k)/(1-k);
		y = (1-b-k)/(1-k);
		
		return [c,m,y,k];
	}
	
	cu.cmykToRgb = function(c,m,y,k){
		c = Blueprint.utils.Math.clamp(c, 0, 1);
		m = Blueprint.utils.Math.clamp(m, 0, 1);
		y = Blueprint.utils.Math.clamp(y, 0, 1);
		k = Blueprint.utils.Math.clamp(k, 0, 1);
		
		var r,g,b;
		r = Blueprint.utils.Math.clamp(255 * (1-c) * (1-k), 0, 255);
		g = Blueprint.utils.Math.clamp(255 * (1-m) * (1-k), 0, 255);
		b = Blueprint.utils.Math.clamp(255 * (1-y) * (1-k), 0, 255);
		
		return [r,g,b];
	}
	
	cu.hexToHsl = function(hex){
		var rgb = cu.hexToRgb(hex);
		return cu.rgbToHsl(rgb[0],rgb[1],rgb[2]);
	}
	
	cu.hexToCmyk = function(hex){
		var rgb = cu.hexToRgb(hex);
		return cu.rgbToCmyk(rgb[0],rgb[1],rgb[2]);
	}
	
	cu.hslToHex = function(h,s,l){
		var rgb = cu.hslToRgb(h,s,l);
		return cu.rgbToHex(rgb[0],rgb[1],rgb[2]);
	}
	
	cu.hslToCmyk = function(h,s,l){
		var rgb = cu.hslToRgb(h,s,l);
		return cu.rgbToCmyk(rgb[0],rgb[1],rgb[2]);
	}
	
	cu.cmykToHex = function(c,m,y,k){
		var rgb = cu.cmykToRgb(c,m,y,k);
		return cu.rgbToHex(rgb[0],rgb[1],rgb[2]);
	}
	
	cu.cmykToHsl = function(c,m,y,k){
		var rgb = cu.cmykToRgb(c,m,y,k);
		return cu.rgbToHsl(rgb[0],rgb[1],rgb[2]);
	}
	
	return cu;
});