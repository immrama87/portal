var os = require("os");

var PatternParser = (function(pattern){
	var pp = {};
	
	pp.parse = function(data){
		var response = pattern;
		
		while(response.indexOf("%") > -1){
			var start = response.indexOf("%");
			var command = response.substring(start).search(/[cdmnp]/) + start;
			var end = command + 1;
			var commandChar = response.charAt(command);
			var modifier = response.substring(start+1, command);
			
			var replace = "";
			switch(commandChar){
				case "d":
					var formatStart = response.indexOf("{", start) + 1;
					var formatEnd = response.indexOf("}", formatStart);
					end = formatEnd + 1;
					
					if(data.hasOwnProperty("d")){
						var format = response.substring(formatStart, formatEnd);
						replace = formatDate(data.d, format);
					}
					break;
				case "m":
					if(data.hasOwnProperty("m")){
						if(data.m instanceof Error){
							replace = data.m.message;
							
							if(data.m.stack != undefined){
								replace = data.m.stack.replace(/(\r\n|\n|\r)/gm, os.EOL);
							}
						}
						else {
							replace = data.m;
						}
					}
					break;
				case "n":
					replace = os.EOL;
					break;
				default:
					if(data.hasOwnProperty(commandChar)){
						replace = data[commandChar];
					}
					break;
			}
			
			/*if(modifier != ""){
				var minWidthStr = modifier;
				var maxWidthStr = "";
				if(modifier.indexOf(".") > -1){
					maxWidthStr = modifier.substring(modifier.indexOf(".") + 1);
					minWidthStr = modifier.substring(0, modifier.indexOf("."));
				}
				
				if(minWidthStr != ""){
					var minWidth = parseInt(minWidthStr);
					if(!isNaN(minWidth)){
						if(minWidth > 0){
							leftPad(replace, minWidth, " ");
						}
						else {
							rightPad(replace, 0 - minWidth, " ");
						}
					}
				}
				
				if(maxWidthStr != ""){
					var maxWidth = parseInt(maxWidthStr);
					if(!isNaN(maxWidth)){
						if(replace.length > maxWidth){
							replace = replace.substring(0, maxWidth);
						}
					}
				}
			}*/
			
			
			response = response.substring(0, start) + replace + response.substring(end);
		}
		
		return response;
	}
	
	function formatDate(dateInt, format){
		var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
		var days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
		
		var date = new Date(dateInt);
		var monthDay = date.getDate();
		var weekDay = date.getDay();
		var month = date.getMonth();
		var monthText = months[month];
		var year = date.getFullYear();
		
		var hours = date.getHours();
		var hours_adjusted = hours;
		var ampm = "AM";
		if(hours_adjusted >= 12){
			ampm = "PM";
			hours_adjusted -= 12;
			if(hours_adjusted == 0){
				hours_adjusted += 12;
			}
		}
		var minutes = date.getMinutes();
		var seconds = date.getSeconds();
		
		var response = format;		
		
		response = response.replace(/dd/g, leftPad(monthDay.toString(), 2, "0"));
		response = response.replace(/d/g, monthDay.toString());
		
		response = response.replace(/yyyy/g, year.toString());
		response = response.replace(/yy/g, year.toString().substring(2));
		
		response = response.replace(/HH/g, leftPad(hours.toString(), 2, "0"));
		response = response.replace(/H/g, hours.toString());
		response = response.replace(/hh/g, leftPad(hours_adjusted.toString(), 2, "0"));
		response = response.replace(/h/g, hours_adjusted.toString());
		
		response = response.replace(/mm/g, leftPad(minutes.toString(), 2, "0"));
		response = response.replace(/m/g, minutes.toString());
		
		response = response.replace(/ss/g, leftPad(seconds.toString(), 2, "0"));
		response = response.replace(/s/g, seconds.toString());
		
		response = response.replace(/a/g, ampm);
		
		response = response.replace(/MMMM/g, months[month]);
		response = response.replace(/MMM/g, monthText.substring(0,3));
		response = response.replace(/MM/g, leftPad((month + 1).toString(), 2, "0"));
		response = response.replace(/\bM/g, (month + 1).toString());
		
		response = response.replace(/EEEE/g, days[weekDay]);
		response = response.replace(/EEE/g, days[weekDay].substring(0,3));
		
		return response;
	}
	
	function leftPad(str, len, chr){
		while(str.length < len){
			str = chr + str;
		}
		
		return str;
	}
	
	function rightPad(str, len, chr){
		while(str.length < len){
			str = str + chr;
		}
		
		return str;
	}
	
	return pp;
});

module.exports = PatternParser;