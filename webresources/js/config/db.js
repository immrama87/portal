var dataTable;
var form;

$(function(){
	form = Blueprint.utils.FormBuilder.build("db-driver-config");
	form.trackField("driver");
	form.onsubmit(function(data){
		if(data.driver == ""){
			Blueprint.utils.Messaging.alert("Please select a driver to continue", true);
			return;
		}
		
		$.ajax({
			method:			"post",
			url:			"/rest/v1/config/db/setup",
			data:			JSON.stringify(data),
			contentType:	"application/json"
		})
		.done(function(response){
			Blueprint.utils.Messaging.alert("Database configuration update successful.");
		})
		.fail(function(jqhxr, status, err){
			Blueprint.utils.Messaging.alert("An error occurred submitting database driver details.", true, err);
		});
	});
	
	$.ajax({
		method: 	"get",
		url:		"/rest/v1/config/db/drivers",
		dataType:	"json",
	})
	.done(function(response){
		buildTable(response);
	})
	.fail(function(jqxhr, status, err){
		Blueprint.utils.Messaging.alert("An error occurred retrieving database drivers.", true, err);
	});
	
	$("#db-submit").off("click touch");
	$("#db-submit").on("click touch", function(evt){
		form.submit();
	});
	
	$("#db-cancel").off("click touch");
	$("#db-cancel").on("click touch", function(evt){
		form.clear();
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
				form.clear(function(){
					$("#db-drivers-table").find("tr.selected").removeClass("selected");
					$(row).addClass("selected");
					
					$("#driver").val(data.name);
					form.generateFields(data.inputs);
					if(data.current){
						$.ajax({
							method:		"get",
							url:		"/rest/v1/config/db/setup",
							dataType:	"json"
						}).done(function(response){
							for(var key in response){
								form.setFieldValue(key, response[key]);
							}
						});
					}
				});
			});
			
			if(data.current){
				$(row).click();
			}
		}
	});
	
	Blueprint.modules.activeModule().ready();
}

Blueprint.modules.activeModule().destroy = function(next){
	form.clear(function(){
		delete dataTable;
		delete form;
		delete buildTable;
		
		next();
	});
}