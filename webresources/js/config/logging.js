$(function(){
	$.ajax({
		method:		"get",
		url:		"/rest/v1/config/loggers",
		dataType:	"json"
	})
	.done(function(response){
		$("#loggers").html("");
		for(var i=0;i<response.loggers.length;i++){
			$("#loggers").append(generateLoggerItem(response.loggers[i]));
		}
		Blueprint.modules.activeModule().ready();
	})
	.fail(function(xhr, status, err){
		Blueprint.utils.Messaging.alert("Error retrieving logger configuration.", true, err);
	});
});

function generateLoggerItem(loggerName){
	var item = document.createElement("div");
	var loggerLink = document.createElement("a");
	loggerLink.className = "logger btn-link";
	loggerLink.href = "#";
	loggerLink.id = loggerName;
	$(loggerLink).text(loggerName);
	$(item).append(loggerLink);
	
	$(loggerLink).on("click touch", function(evt){
		$("#logger-details").addClass("hide");
		$("#appender-details").addClass("hide");
		$("#log-contents").addClass("hide");
		$.ajax({
			method:		"get",
			url:		"/rest/v1/config/loggers/" + loggerName,
			dataType:	"json",
			async:		false
		})
		.done(function(response){
			showLoggerDetails(response, loggerName);
		})
		.fail(function(xhr, status, err){
			Blueprint.utils.Messaging.alert("Error retrieving configuration for logger '" + loggerName + "'.", true, err);
		});
	});
	
	return item;
}

function showLoggerDetails(loggerConfig, loggerName){
	$("#logger-details").removeClass("hide");
	$("#log-appenders").html("");
	var appenders = loggerConfig.appenders.split(",");
	for(var i=0;i<appenders.length;i++){
		$("#log-appenders").append(generateAppenderItem(appenders[i].trim()));
	}
	
	var level = loggerConfig.level;
	level = level.charAt(0).toUpperCase() + level.substring(1).toLowerCase();
	$("#log-level").text(level);
	
	var options = [
		{
			value:	"OFF",
			text:	"Off"
		},
		{
			value:	"FATAL",
			text:	"Fatal"
		},
		{
			value:	"ERROR",
			text:	"Error"
		},
		{
			value:	"WARN",
			text:	"Warn"
		},
		{
			value:	"INFO",
			text:	"Info"
		},
		{
			value:	"DEBUG",
			text:	"Debug"
		},
		{
			value:	"TRACE",
			text:	"Trace"
		}
	];
	
	initializeEditButton($("#log-level").parent().find("div.edit"), options, function(newValue){
		loggerConfig.level = newValue;
		$.ajax({
			method:			"put",
			url:			"/rest/v1/config/loggers/" + loggerName,
			data:			JSON.stringify(loggerConfig),
			contentType:	"application/json"
		})
		.fail(function(xhr, status, err){
			Blueprint.utils.Messaging.alert("Error updating logger '" + loggerName + "'.", true, err);
		});
	});
}

function generateAppenderItem(appenderName){
	var item = document.createElement("div");
	var appenderLink = document.createElement("a");
	appenderLink.className = "appender btn-link";
	appenderLink.href = "#";
	appenderLink.id = "appender-" + appenderName;
	$(appenderLink).text(appenderName);
	$(item).append(appenderLink);
	
	$(appenderLink).on("click touch", function(evt){
		$("#appender-details").addClass("hide");
		$("#log-contents").addClass("hide");
		$("#num-lines").val(10);
		$.ajax({
			method:		"get",
			url:		"/rest/v1/config/loggers/appenders/" + appenderName,
			dataType:	"json",
			async:		false
		})
		.done(function(response){
			showAppenderDetails(response, appenderName);
		})
		.fail(function(xhr, status, err){
			Blueprint.utils.Messaging.alert("Error retrieving configuration for appender '" + appenderName + "'.", true, err);
		});
	});
	
	return item;
}

function showAppenderDetails(appenderConfig, appenderName){
	$("#appender-details").removeClass("hide");
	$("#appender-details-form").html("");
	for(var key in appenderConfig){
		$("#appender-details-form").append(generateAppenderDetail(key, appenderConfig[key], appenderConfig, appenderName));
	}
	
	if(appenderConfig.appender == "FileAppender"){
		var showBtn = document.createElement("button");
		showBtn.className = "btn btn-primary";
		showBtn.id = "log-contents-btn";
		$(showBtn).text("Show Log Contents");
		
		$(showBtn).on("click touch", function(evt){
			$.ajax({
				method:			"get",
				url:			"/rest/v1/config/loggers/files/" + appenderName,
				dataType:		"json",
				async:			false
			})
			.done(function(response){
				console.log(response);
				showLogData(response, appenderName);
			})
			.fail(function(xhr, status, err){
				Blueprint.utils.Messaging.alert("Error retrieving log file data for appender '" + appenderName + "'.", true, err);
			});
		});
		
		$("#appender-details-form").append(showBtn);
	}
}

function generateAppenderDetail(key, value, appenderConfig, appenderName){
	var items = {
		"appender":	{
			text: "Appender Class",
			editable: false
		},
		"pattern":	{
			text: "Message Format",
			editable: true
		},
		"backups":	{
			text: "# of Backups",
			format: "number",
			editable: true
		},
		"file":		{
			text: "File Location",
			editable: false
		},
		"maxSize":	{
			text: "Max File Size",
			editable: true
		}
	}
	
	var item = items[key] || {text: key, editable: false};
	
	var group = document.createElement("div");
	group.className = "detail-group";
	
	var label = document.createElement("div");
	label.className = "detail-label";
	$(label).text(item.text);
	$(group).append(label);
	
	var val = document.createElement("div");
	val.className = "detail-value";
	$(val).text(value);
	$(group).append(val);
	
	if(item.editable){
		$(group).addClass("editable");
		var editDiv = document.createElement("div");
		editDiv.className = "edit";
		var editBtn = document.createElement("i");
		editBtn.className = "fa fa-pencil-square-o";
		$(editDiv).append(editBtn);
		$(group).append(editDiv);
		
		initializeEditButton(editDiv, function(newValue){
			appenderConfig[key] = newValue;
			$.ajax({
				method:			"put",
				url:			"/rest/v1/config/loggers/appenders/" + appenderName,
				data:			JSON.stringify(appenderConfig),
				contentType:	"application/json"
			})
			.fail(function(xhr, status, err){
				Blueprint.utils.Messaging.alert("Error updating appender '" + appenderName + "'.", true, err);
			});
		});
	}
	
	return group;
}

function initializeEditButton(btn, options, changeCallback){
	if(typeof options == "function"){
		changeCallback = options;
		options = undefined;
	}
	$(btn).off("click touch");
	$(btn).on("click touch", function(evt){
		var input;
		var value = $(btn).parent().find("div.detail-value").text();
		if(options != undefined){
			input = document.createElement("select");
			$(input).append(document.createElement("option"));
			
			for(var i=0;i<options.length;i++){
				var option = document.createElement("option");
				option.value = options[i].value || options[i];
				option.text = options[i].text || options[i];
				$(input).append(option);
				
				if(option.text == value){
					value = option.value;
				}
			}
		}
		else {
			input = document.createElement("input");
		}
		
		input.className = "input-field";
		$(input).insertBefore(btn);
		$(input).val(value);
		$(btn).parent().removeClass("detail-group").removeClass("editable").addClass("input-group");
		$(btn).parent().find("div.detail-label").removeClass("detail-label").addClass("input-label");
		$(btn).parent().find("div.detail-value").addClass("hide");
		$(btn).addClass("hide");
		
		$(input).on("change", function(evt){
			var newValue = $(input).val();
			var displayValue = newValue;
			if(options != undefined){
				for(var i=0;i<options.length;i++){
					if(options[i].hasOwnProperty("value") && options[i].hasOwnProperty("text") && options[i].value == newValue){
						displayValue = options[i].text;
					}
				}
			}
			
			$(btn).parent().removeClass("input-group").addClass("detail-group").addClass("editable");
			$(btn).parent().find("div.input-label").removeClass("input-label").addClass("detail-label");
			$(btn).parent().find("div.detail-value").removeClass("hide").text(displayValue);
			$(btn).removeClass("hide");
			$(input).remove();
			
			changeCallback(newValue);
		});
	});
}

function showLogData(logData, appenderName){
	$("#log-contents").removeClass("hide");
	$("#log-lines").html("");
	for(var i=0;i<logData.lines.length;i++){
		var lineDiv = document.createElement("div");
		$(lineDiv).html(logData.lines[i].replace(/\s/g, "&nbsp;"));
		$("#log-lines").append(lineDiv);
	}
	
	$("#num-lines").off("change");
	$("#num-lines").on("change", function(evt){
		var numLines = $("#num-lines").val();
		$.ajax({
			method:			"get",
			url:			"/rest/v1/config/loggers/files/" + appenderName,
			dataType:		"json",
			data:			{limit: numLines, start: logData.start}
		})
		.done(function(response){
			showLogData(response, appenderName);
		})
		.fail(function(xhr, status, err){
			Blueprint.utils.Messaging.alert("Error retrieving log file data for appender '" + appenderName + "'.", true, err);
		});
	});
	
	if(!logData.hasNext){
		$("#log-lines-next").addClass("hide");
	}
	else {
		$("#log-lines-next").removeClass("hide");
	}
	if(!logData.hasPrevious){
		$("#log-lines-previous").addClass("hide");
	}
	else {
		$("#log-lines-previous").removeClass("hide");
	}
	
	$("#log-lines-next").off("click touch");
	$("#log-lines-next").on("click touch", function(evt){
		$.ajax({
			method:			"get",
			url:			"/rest/v1/config/loggers/files/" + appenderName,
			dataType:		"json",
			data:			{limit: $("#num-lines").val(), start: logData.start - $("#num-lines").val()}
		})
		.done(function(response){
			showLogData(response, appenderName);
		})
		.fail(function(xhr, status, err){
			Blueprint.utils.Messaging.alert("Error retrieving log file data for appender '" + appenderName + "'.", true, err);
		});
	});
	
	$("#log-lines-previous").off("click touch");
	$("#log-lines-previous").on("click touch", function(evt){
		$.ajax({
			method:			"get",
			url:			"/rest/v1/config/loggers/files/" + appenderName,
			dataType:		"json",
			data:			{limit: $("#num-lines").val(), start: parseInt(logData.start) + parseInt($("#num-lines").val())}
		})
		.done(function(response){
			showLogData(response, appenderName);
		})
		.fail(function(xhr, status, err){
			Blueprint.utils.Messaging.alert("Error retrieving log file data for appender '" + appenderName + "'.", true, err);
		});
	});
}

Blueprint.modules.activeModule().setData = function(data){
	if(data.length > 0){
		$("#" + data[0]).click();
		
		if(data.length > 1){
			$("#appender-" + data[1]).click();
			
			if(data.length > 2 && data[2] == "contents"){
				$("#log-contents-btn").click();
				
				if(data.length > 3 && (data[3] == "10" || data[3] == "25" || data[3] == "50")){
					$("#num-lines").val(data[3]);
					$("#num-lines").change();
				}
			}
		}
	}
}