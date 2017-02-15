var table;

Wizard.dbDrivers = function(){
	if(table == undefined){
		$.ajax({
			method:		"get",
			url:		"/rest/v1/config/wizard/db/drivers",
			dataType:	"json"
		})
		.done(function(response){
			table = $("#database-drivers").DataTable({
				data:	response,
				columns:[
					{
						title:	"Name",
						data:	"name"
					},
					{
						title:	"Description",
						data:	"description"
					},
					{
						title:	"Author",
						data:	"author"
					}
				],
				rowId:	"name",
				info:			false,
				searching:		false,
				lengthChange:	false,
				pagingType:		"first_last_numbers",
				rowCallback:	function(row, data, index){
					$(row).off("click touch");
					$(row).on("click touch", function(evt){
						Wizard.setConfig("db-driver", data);
						Wizard.next();
					});
				}
			});
		});
	}
}

Wizard.dbDriverSetup = function(){
	var driver = Wizard.getConfig("db-driver");
	
	$("#db-driver-config").html("");
	for(var i=0;i<driver.inputs.length;i++){
		$("#db-driver-config").append(Wizard.generateInput(driver.inputs[i], "db"));
	}
	
	$("#db-driver-save").off("click touch");
	$("#db-driver-save").on("click touch", function(evt){
		var missing = [];
		$("#db-driver-config").find("div.input-label.required").each(function(index, el){
			if($(el).parent().find("*.input-field").val() == ""){
				missing.push($(el).text());
			}
		});
		
		if(missing.length > 0){
			Blueprint.utils.Messaging.alert("The following required fields are not set:\n\t" + missing.join("\n\t"), true);
		}
		else {
			var config = {};
			config.driver = driver.name;
			$("#db-driver-config").find("*.input-field").each(function(index, el){
				var key = el.id.substring(("db-").length);
				if($(el).val() != ""){
					config[key] = $(el).val();
				}
			});
			
			Wizard.setConfig("db-config", config);
			Wizard.next();
		}
	});
}

Wizard.dbSave = function(){
	var config = Wizard.getConfig("db-config");
	var loader = Wizard.generateLoader("db-save-loader", "Saving Database Configuration", [
		{
			text:	"Saving Configuration",
			action:	saveDBConfig
		},
		{
			text:	"Testing Configuration",
			sub:	[
				{
					text:	"Validating Driver",
					action:	validateDBDriver
				},
				{
					text:	"Validating DB Schema",
					action:	validateDBSchema
				}
			]
		},
		{
			text:	"Configuring Internal Directory",
			sub:	[
				{
					text:	"Configuring Internal Directory Driver",
					action:	configInternalDirectory
				},
				{
					text:	"Creating Default Groups",
					action:	createInternalDirGroups
				},
				{
					text:	"Creating Default Roles",
					action:	createInternalDirRoles
				}
			]
		}
	]);
	
	loader.start();
	
	function saveDBConfig(){
		$.ajax({
			method:			"post",
			url:			"/rest/v1/config/wizard/db/drivers",
			data:			JSON.stringify(config),
			contentType:	"application/json"
		})
		.done(function(response){
			loader.next();
		})
		.fail(handleFail);
	}
	
	function validateDBDriver(){
		$.ajax({
			method:			"get",
			url:			"/rest/v1/config/wizard/db/drivers/validate",
			dataType:		"json"
		})
		.done(function(response){
			if(response.valid){
				if(response.warning){
					Blueprint.utils.Messaging.confirm(response.warning + " Create the database?", function(conf){
						if(conf){
							loader.injectSubSteps([{text: "Creating Database", action: createDatabase},{text: "Creating Database Schema", action: createDatabaseSchema}]);
							loader.next();
						}
						else {
							loader.previous();
						}
					});
				}
				else {
					loader.next();
				}
			}
			else {
				handleFail(undefined, undefined, response.error);
			}
		})
		.fail(handleFail);
	}
	
	function createDatabase(){
		$.ajax({
			method:		"post",
			url:		"/rest/v1/config/wizard/db/drivers/create"
		})
		.done(function(response){
			loader.next();
		})
		.fail(handleFail);
	}
	function createDatabaseSchema(){
		$.ajax({
			method:		"post",
			url:		"/rest/v1/config/wizard/db/drivers/create/schema"
		})
		.done(function(response){
			loader.next();
		})
		.fail(handleFail);
	}
	
	function validateDBSchema(){
		$.ajax({
			method:			"get",
			url:			"/rest/v1/config/wizard/db/drivers/validate/schema",
			dataType:		"json"
		})
		.done(function(response){
			if(response){
				if(response.errors){
					handleFail(xhr, status, response.errors.join("\n"));
				}
				else {
					loader.next();
				}
			}
			else {
				loader.next();
			}
		})
		.fail(handleFail);
	}
	
	function configInternalDirectory(){
		$.ajax({
			method:		"post",
			url:		"/rest/v1/config/wizard/directories/configure"
		})
		.done(function(){
			loader.next();
		})
		.fail(handleFail);
	}
	function createInternalDirGroups(){
		$.ajax({
			method:		"post",
			url:		"/rest/v1/config/wizard/configure-groups"
		})
		.done(function(){
			loader.next();
		})
		.fail(handleFail);
	}
	function createInternalDirRoles(){
		$.ajax({
			method:		"post",
			url:		"/rest/v1/config/wizard/configure-roles",
			dataType:	"json"
		})
		.done(function(errors){
			if(errors.length > 0){
				handleFail(undefined, undefined, errors.join("\n"));
			}
			else {
				loader.next();
			}
		})
		.fail(handleFail);
	}
	
	function handleFail(xhr, status, err){
		Blueprint.utils.Messaging.alert("Error updating database configuration.", true, err);
		Wizard.previous();
	}
}

