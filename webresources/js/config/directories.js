var directories;
var drivers = {};
var form;

$(function(){
	form = Blueprint.utils.FormBuilder.build("directory-config-form");
	form.trackField("driver");
	form.onsubmit(function(data){
		$.ajax({
			method:			"post",
			url:			"/rest/v1/config/directories/setup",
			contentType:	"application/json",
			data:			JSON.stringify(data)
		})
		.done(function(){
			Blueprint.utils.Messaging.alert("Directory configuration saved successfully.");
		})
		.fail(function(xhr, status, err){
			Blueprint.utils.Messaging.alert("An error occurred saving the directory configuration.", true, err);
		});
	});
	
	$.ajax({
		method:		"get",
		url:		"/rest/v1/config/directories/drivers",
		dataType:	"json"
	})
	.done(function(response){
		$("#driver").html(document.createElement("option"));
		for(var i=0;i<response.length;i++){
			var option = document.createElement("option");
			option.text = response[i].displayName;
			option.value = response[i].name;
			$("#driver").append(option);
			
			drivers[response[i].name] = response[i];
		}
		getDirectoriesList();
	});

	$("#directories-list").find("#add-directory").on("click touch", function(evt){
		form.clear(function(){
			form.destroy();
			$("#driver").val("").removeAttr("disabled");
		});
	});
	
	$("#driver").on("change", function(evt){
		var driver = drivers[$("#driver").val()];
		generateFormConfig(driver);
	});
	
	$("#directory-submit").off("click touch");
	$("#directory-submit").on("click touch", function(evt){
		form.submit();
	});
	
	$("#directory-cancel").off("click touch");
	$("#directory-cancel").on("click touch", function(evt){
		form.clear(function(){
			$("#directory-config-form").html("");
		});
	});
});

function getDirectoriesList(){
	$.ajax({
		method: 	"get",
		url:		"/rest/v1/config/directories",
		dataType:	"json"
	})
	.done(function(response){
		directories = response;
		for(var key in response){
			$(generateDirectoryItem(key)).insertBefore("#add-directory");
		}
		
		Blueprint.modules.activeModule().ready();
	});
}

function generateDirectoryItem(name){
	var directoryItem = document.createElement("div");
	directoryItem.className = "directory";
	directoryItem.id = name;
	
	var nameSpan = document.createElement("span");
	nameSpan.className = "text";
	$(nameSpan).text(name);
	$(directoryItem).append(nameSpan);
	
	if(name != "Internal"){
		var del = document.createElement("span");
		del.className = "delete fa fa-times";
		$(directoryItem).append(del);
		
		$(del).on("click touch", function(evt){
			evt.stopPropagation();
			$.ajax({
				method:		"delete",
				url:		"/rest/v1/config/directories/" + name
			})
			.done(function(){
				Blueprint.utils.Messaging.alert("Directory deleted successfully.");
			})
			.fail(function(xhr, status, err){
				Blueprint.utils.Messaging.alert("An error occurred deleting directory '" + name + "'.", true, err);
			});
		});
	}
	
	$(directoryItem).on("click touch", function(evt){
		var driver = drivers[directories[name].driver];
		$("#driver").val(driver.name);
		$("#driver").attr("disabled", true);
		generateFormConfig(driver);
		
		for(var key in directories[name]){
			form.setFieldValue(key, directories[name][key]);
		}
	});
	
	return directoryItem;
}

function generateFormConfig(driver){
	form.generateFields(driver.inputs);
	form.trackField("driver");
	form.prepend("<strong>Driver Details:</strong>");
	form.prepend("<div class='detail-group'><div class='detail-label'>Driver Name:</div><div class='detail-value'>" + driver.name + "</div></div>");
	form.prepend("<div class='detail-group'><div class='detail-label'>Description:</div><div class='detail-value'>" + driver.description + "</div></div>");
	form.prepend("<div class='detail-group'><div class='detail-label'>Author:</div><div class='detail-value'>" + driver.author + "</div></div>");
}

Blueprint.modules.activeModule().setData = function(data){
	console.log($("#" + data[0]));
	$("#" + data[0]).click();
}

Blueprint.modules.activeModule().destroy = function(next){
	form.clear(function(){
		delete directories;
		delete drivers;
		delete form;
		delete generateDirectoryItem;
		delete generateFormConfig;
		
		next();
	});
}