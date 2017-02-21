var dataTable;
var form;

$(function(){
	form = Blueprint.utils.FormBuilder.build("dependency-config");
	form.readFieldsFromHTML();
	
	form.onsubmit(function(data){
		var method, url;
		method = "post";
		url = "/rest/v1/config/dependencies";
		if(form.getOriginalData().hasOwnProperty("name")){
			method = "put";
			url = url + "/" + form.getOriginalData().name;
		}

		$.ajax({
			method:			method,
			url:			url,
			data:			JSON.stringify(data),
			contentType:	"application/json"
		})
		.done(function(){
			form.clearChangedState();
			form.clear(buildTable);
		})
		.fail(function(xhr, status, err){
			Blueprint.utils.Messaging.alert("Error saving dependency.", true, xhr.responseText);
		});
	});
	
	$("#add-dependency").on("click touch", function(evt){
		$("#add-dependency").addClass("hide");
		$("#dependency-config").removeClass("hide");
	});
	
	$("#type").on("change", function(evt){
		if($("#type").val() == "js"){
			$("#validation-group").removeClass("hide");
		}
		else {
			$("#validation-group").addClass("hide");
		}
	});
	
	$("#dependency-submit").on("click touch", function(evt){
		form.submit();
	});
	
	$("#dependency-cancel").on("click touch", function(evt){
		form.clear(buildTable);
	});	
	
	$("#integrity-faq-btn").on("click touch", function(evt){
		$("#integrity-faq").toggleClass("hide");
	});
	
	dataTable = $("#dependencies").addClass("unstyled").DataTable({
		columns: [
			{
				title:	"Name",
				data:	"name"
			},
			{
				title:			"Type",
				data:			"type",
				createdCell:	function(cell, cellData, rowData, rowIndex, cellIndex){
					switch(cellData){
						case "js":
							$(cell).text("Javascript");
							break;
						case "css":
							$(cell).text("Stylesheet");
							break;
					}
				}
			},
			{
				title:			"Load Order",
				data:			"order",
				className:		"text-center",
				createdCell:	function(cell, cellData, rowData, rowIndex, cellIndex){
					if(rowData.system){
						$(cell).html("");
					}
					else {
						var upArrow = document.createElement("i");
						upArrow.className = "fa fa-arrow-up sort-up";
					
						var downArrow = document.createElement("i");
						downArrow.className = "fa fa-arrow-down sort-down";
					
						if(!rowData.start && !rowData.end){
							$(cell).html(upArrow).append(downArrow);
						}
						else if(rowData.start){
							$(cell).html(downArrow);
						}
						else if(rowData.end){
							$(cell).html(upArrow);
						}
					
						$(cell).find("i").on("click touch", function(evt){
							evt.stopPropagation();
							var data = {};
							data.order = ($(evt.target).hasClass("sort-up") ? rowData.order - 1 : rowData.order + 1);
							$.ajax({
								method:		"put",
								url:		"/rest/v1/config/dependencies/" + rowData.name,
								data:		data
							})
							.done(buildTable)
							.fail(function(xhr, status, err){
								Blueprint.utils.Messaging.alert("Error updating dependency order.", true, xhr.responseText);
							});
						});
					}
				}
			},
			{
				title: 			"",
				className: 		"delete",
				defaultContent:	"<span class='delete fa fa-times'></span>",
				createdCell:	function(cell, cellData, rowData, rowIndex, cellIndex){
					if(rowData.system){
						$(cell).html("");
					}
					else {
						$(cell).on("click touch", function(evt){
							evt.stopPropagation();
							Blueprint.utils.Messaging.confirm("Deleting a dependency cannot be undone. Continue?", function(conf){
								$.ajax({
									method:		"delete",
									url:		"/rest/v1/config/dependencies/" + rowData.name
								}).done(function(){
									Blueprint.utils.Messaging.alert("Dependency deleted successfully.");
									buildTable();
								})
								.fail(function(xhr, status, err){
									Blueprint.utils.Messaging.alert("Error deleting dependency.", true, xhr.responseText);
								});
							});
						});
					}
				}
			}
		],
		rowId:			"name",
		info:			false,
		lengthChange:	false,
		searching:		false,
		paging:			false,
		autoWidth:		true,
		order:			[[2, "asc"]],
		rowCallback:	function(row, data, index){
			$(row).on("click touch", function(evt){
				form.clear(function(){
					$("#add-dependency").addClass("hide");
					$("#dependency-config").removeClass("hide");
				
					form.setOriginalData(data);
					$("#type").change();
					form.clearChangedState();
				});
			});
		}
	});
	
	buildTable(Blueprint.modules.activeModule().ready);
});

function buildTable(next){
	$("#add-dependency").removeClass("hide");
	$("#dependency-config").addClass("hide");
	$.ajax({
		method:		"get",
		url:		"/rest/v1/config/dependencies",
		dataType:	"json"
	})
	.done(function(response){
		dataTable.clear();
		dataTable.rows.add(response);
		dataTable.draw();
		if(typeof next == "function"){
			next();
		}
	});
}

Blueprint.modules.activeModule().destroy = function(next){
	delete dataTable;
	delete form;
	delete buildTable;
	
	next();
}