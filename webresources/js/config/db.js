var dataTable;

$(function(){
	$.ajax({
		method: 	"get",
		url:		"/rest/v1/config/db/drivers",
		dataType:	"json",
	})
	.done(function(response){
		buildTable(response);
	})
	.fail(function(jqxhr, status, err){
	
	});
	
	$("#db-config").find("button#submit").on("click touch", function(evt){
		var driverName = $("#db-driver-selected").val();
		if(driverName == ""){
			alert("Please select a driver to continue");
			return;
		}
		
		var props = dataTable.row("#" + driverName).data().inputs;
		var data = {};
		var missing = [];
		for(var i=0;i<props.length;i++){
			var input = $("#db-" + props[i].key)[0];
			if(!props[i].optional && (input.value == "" || input.value == null)){
				missing.push(props[i].name);
			}
			
			data[props[i].key] = input.value;
		}
		
		data["driver"] = driverName;
		if(missing.length > 0){
			alert("Please enter the following required values:\n\t*" + missing.join("\n\t*"));
		}
		else {
			$.ajax({
				method:			"post",
				url:			"/rest/v1/config/db/setup",
				data: 			JSON.stringify(data),
				contentType:	"application/json"
			})
			.done(function(response){
				alert("Database configuration update successful.");
			})
			.fail(function(jqhxr, status, err){
				alert("An error occurred submitting database driver details.\n" + err + "\nPlease try again or consult the system logs for more.");
			});
		}
	});
});

function buildTable(drivers){
	dataTable = $("#db-drivers-table").DataTable({
		data: 	drivers,
		columns:	[
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
		rowId:			"name",
		info:			false,
		searching:		false,
		lengthChange:	false,
		pagingType:		"first_last_numbers",
		rowCallback:	function(row, data, index){
			$(row).on("click touch", function(evt){
				$("#db-drivers-table").find("tr.selected").removeClass("selected");
				$(row).addClass("selected");
				
				generateForm(data.name, data.inputs);
				if(data.current){
					$.ajax({
						method:		"get",
						url:		"/rest/v1/config/db/setup",
						dataType:	"json"
					}).done(function(response){
						for(var key in response){
							$("#db-" + key).val(response[key]);
						}
					});
				}
			});
			
			if(data.current){
				$(row).click();
			}
		}
	});
}

function generateForm(name, properties){
	$("#db-driver-config").html("");
	$("#db-driver-selected").val(name);
	
	for(var i=0;i<properties.length;i++){
		$("#db-driver-config").append(generateInput(properties[i]));
	}
}

function generateInput(property){
	var container = document.createElement("div");
	container.className = "input-group";
	
	var label = document.createElement("div");
	label.className = "input-label";
	if(!property.optional){
		$(label).addClass("required");
	}
	$(label).text(property.name);
	$(container).append(label);
	
	var input = document.createElement("input");
	input.className = "input-field";
	input.id = "db-" + property.key;
	if(!property.type && !property.validate){
		input.type = "text";
	}
	else {
		if(property.type){
			input.type = property.type;
		}
		else {
			switch(property.validate){
				case "integer":
					input.type = "number";
					break;
				default:
					input.type = "text";
					break;
			}
		}
	}
	$(container).append(input);
	
	return container;
}