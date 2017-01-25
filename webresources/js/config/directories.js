var drivers = undefined;
var directories;

$(function(){
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
	});

	$("#directories-list").find("#add-directory").on("click touch", function(evt){
		$("#directory-config").html(generateDirectoryConfig());
	});
});

function generateDirectoryItem(name){
	var directoryItem = document.createElement("div");
	directoryItem.className = "directory";
	
	var nameSpan = document.createElement("span");
	nameSpan.className = "text";
	$(nameSpan).text(name);
	$(directoryItem).append(nameSpan);
	
	$(directoryItem).on("click touch", function(evt){
		$("#directory-config").html(generateDirectoryConfig(name));
	});
	
	return directoryItem;
}

function generateDirectoryConfig(name){
	var panel = document.createElement("div");
	panel.className = "panel";
	
	var label = document.createElement("strong");
	$(label).text("Directory Configuration");
	$(panel).append(label);
	
	var form = document.createElement("form");
	form.className = "config";
	$(panel).append(form);
	
	var driverGroup = document.createElement("div");
	driverGroup.className = "input-group";
	
	var driverLabel = document.createElement("div");
	driverLabel.className = "input-label required";
	$(driverLabel).text("Directory Type");
	$(driverGroup).append(driverLabel);
	
	var driverSelect = document.createElement("select");
	driverSelect.className = "input-field";
	$(driverGroup).append(driverSelect);
	if(drivers == undefined){
		var option = document.createElement("option");
		option.text = "Loading available directory types...";
		driverSelect.add(option);
		
		$.ajax({
			method:		"get",
			url:		"/rest/v1/config/directories/drivers",
			dataType:	"json"
		})
		.done(function(response){
			drivers = response;
			generateDriverOptions(driverSelect, form, name);
		});
	}
	else {
		generateDriverOptions(driverSelect, form, name);
	}
	
	$(form).append(driverGroup);
	
	var driverDetails = document.createElement("div");
	driverDetails.className = "driver-details";
	$(form).append(driverDetails);
	
	var directoryDetails = document.createElement("div");
	directoryDetails.className = "directory-details";
	$(form).append(directoryDetails);
	
	var buttons = document.createElement("section");
	buttons.className = "buttons-container";
	$(form).append(buttons);
	
	var submitBtn = document.createElement("button");
	submitBtn.className = "btn btn-primary";
	$(submitBtn).text("Submit");
	$(buttons).append(submitBtn);
	
	$(submitBtn).on("click touch", function(evt){
		evt.preventDefault();
		var driver;
		for(var i=0;i<drivers.length;i++){
			if(drivers[i].name == driverSelect.options[driverSelect.selectedIndex].value){
				driver = drivers[i];
				break;
			}
		}
		
		if(driver == null){
			alert("Please select a valid directory type.");
		}
		else {
			var data = {};
			var missing = [];
			for(var i=0;i<driver.inputs.length;i++){
				var input = $(form).find("input#dir-" + driver.inputs[i].key)[0];
				data[driver.inputs[i].key] = input.value;
				if(driver.inputs[i].required && (input.value == "" || input.value == undefined)){
					missing.push(driver.inputs[i].name);
				}
				
				if(driver.inputs[i].hasOwnProperty("defaultValue") && driver.inputs[i].locked){
					if(driver.inputs[i].defaultValue != input.value){
						alert("The value for the " + driver.inputs[i].name + " field must be '" + driver.inputs[i].defaultValue + "'.");
						return;
					}
				}
			}
			
			if(missing.length > 0){
				alert("Please enter the following required values:\n\t*" + missing.join("\n\t*"));
			}
			else {
				data.driver = driver.name;
				$.ajax({
					method:			"post",
					url:			"/rest/v1/config/directories/setup",
					contentType:	"application/json",
					data:			JSON.stringify(data)
				});
			}
		}
	});
	
	var cancelBtn = document.createElement("button");
	cancelBtn.className = "btn btn-secondary";
	$(cancelBtn).text("Cancel");
	$(buttons).append(cancelBtn);
	
	return panel;
}

function populateDirectoryForm(name, select){
	if(drivers == undefined){
		setTimeout(function(){
			populateDirectoryForm(name);
		}, 50);
	}
	else {
		if(directories.hasOwnProperty(name)){
			var directory = directories[name];
			
			$(select).val(directory.driver);
			$(select).change();
			
			$("#dir-name").val(name);
			
			for(var key in directory){
				if(key != "driver"){
					$("#dir-" + key).val(directory[key]);
				}
			}
		}
	}
}

function generateDriverOptions(select, form, name){
	$(select).find("option").remove();
	select.add(document.createElement("option"));
	for(var i=0;i<drivers.length;i++){
		select.add(generateOption(drivers[i]));
	}
	
	$(select).off("change");
	$(select).on("change", function(evt){
		var option = select.options[select.selectedIndex];
		var driverName = option.value;
		
		var driver;
		for(var i=0;i<drivers.length;i++){
			if(drivers[i].name == driverName){
				driver = drivers[i];
				break;
			}
		}
		
		if(!driver){
			alert("Error");
			return;
		}
		
		$(form).find("div.driver-details").html("<strong>Driver Details:</strong>");
		$(form).find("div.driver-details").append("<div class='detail-group'><div class='detail-label'>Driver Name:</div><div class='detail-value'>" + driver.name + "</div></div>");
		$(form).find("div.driver-details").append("<div class='detail-group'><div class='detail-label'>Description:</div><div class='detail-value'>" + driver.description + "</div></div>");
		$(form).find("div.driver-details").append("<div class='detail-group'><div class='detail-label'>Author:</div><div class='detail-value'>" + driver.author + "</div></div>");
		
		$(form).find("div.directory-details").html("<strong>Directory Details:</strong>");
				
		for(var i=0;i<driver.inputs.length;i++){
			$(form).find("div.directory-details").append(generateFormInput(driver.inputs[i]));
		}
	});
	
	if(name){
		populateDirectoryForm(name, select);
	}
}

function generateOption(driver){
	var option = document.createElement("option");
	option.value = driver.name;
	option.text = driver.displayName;
	
	return option;
}

function generateFormInput(input){
	var inputGroup = document.createElement("div");
	inputGroup.className = "input-group";
	
	var inputLabel = document.createElement("div");
	inputLabel.className = "input-label";
	$(inputLabel).text(input.name);
	$(inputGroup).append(inputLabel);
	
	var inputValue = document.createElement("input");
	inputValue.className = "input-field";
	inputValue.id = "dir-" + input.key;
	
	if(input.defaultValue){
		$(inputValue).val(input.defaultValue);
	}
	if(input.locked){
		$(inputValue).attr("disabled", true);
	}
	$(inputGroup).append(inputValue);
	return inputGroup;
}