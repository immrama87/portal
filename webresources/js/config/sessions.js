var dataTable;

$(function(){
	dataTable = $("#sessions").DataTable({
		columns: [
			{
				title:	"Username",
				data:	"username"
			},
			{
				title:			"Login Date",
				data:			"created",
				searchable:		false,
				createdCell:	function(cell, cellData, rowData, rowIndex, cellIndex){
					$(cell).text(new Date(cellData).toLocaleString());
				}
			},
			{
				title:			"",
				className:		"delete",
				data:			null,
				defaultContent: "<span class='delete fa fa-times'></span>",
				searchable:		false,
				orderable:		false,
				width:			"5%",
				createdCell:	function(cell, cellData, rowData, rowIndex, cellIndex){
					$(cell).find("span.delete").on("click touch", function(evt){
						evt.stopPropagation();
						Blueprint.utils.Messaging.confirm("Deleting a user session will log that user out of the application. Proceed?", function(conf){
							if(conf){
								$.ajax({
									method:			"delete",
									url:			"/rest/v1/config/sessions/" + rowData.id
								})
								.done(function(response){
									Blueprint.utils.Messaging.alert("User session successfully deleted.");
									buildTable();
								})
								.fail(function(xhr, status, err){
									Blueprint.utils.Messaging.alert("Error deleting user session.", true, err);
								});
							}
						});
					});
				}
			}
		],
		rowId:			"username",
		info:			false,
		lengthChange:	false,
		pagingType:		"first_last_numbers"
	});
	
	buildTable();
});

function buildTable(){
	$.ajax({
		method:		"get",
		url:		"/rest/v1/config/sessions",
		dataType:	"json"
	})
	.done(function(response){
		dataTable.clear();
		dataTable.rows.add(response);
		dataTable.draw();
	})
	.fail(function(xhr, status, err){
		Blueprint.utils.Messaging.alert("Error retrieving session data.", true, err);
	});
}

Blueprint.modules.activeModule().destroy = function(next){
	delete dataTable;
	delete buildTable;
	
	next();
}