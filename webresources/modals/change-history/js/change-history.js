(function(modal, data){
	var dataTable = $("#change-history").DataTable({
		data: 		data.history,
		columns:	[
			{
				title:			"Date",
				data:			"createdAt",
				createdCell:	function(cell, cellData, rowData, rowIndex, cellIndex){
					var date = new Date();
					date.setTime(cellData);
					$(cell).text(date.toLocaleString());
				}
			},
			{
				title: 			"Change Type",
				data:			"audit_type",
				createdCell:	function(cell, cellData, rowData, rowIndex, cellIndex){
					if(cellData != "revert-version"){
						$(cell).text(cellData.charAt(0).toUpperCase() + cellData.substring(1));
					}
					else {
						$(cell).text("Revert to Version");
					}
				},
				orderable:	false
			},
			{
				title:			"Changes",
				data:			"change",
				width:			"50%",
				createdCell:	function(cell, cellData, rowData, rowIndex, cellIndex){
					if(data.formatters.hasOwnProperty(rowData.audit_type)){
						$(cell).html(data.formatters[rowData.audit_type](cellData));
					}
					else {
						var changeData = JSON.parse(cellData);
						if(rowData.audit_type == "reversion"){
							var reversionDate = new Date();
							reversionDate.setTime(changeData.reversionDate);
							$(cell).text("Reverted to state '" + changeData.reversionId + "' saved on " + reversionDate.toLocaleString() + ".");
						}
						else if(rowData.audit_type == "revert-version"){
							$(cell).text("Reverted to version " + changeData.version + ".");
						}
					}
				},
				orderable: false
			},
			{
				title:			"",
				defaultContent: "<button class='btn btn-link'>Revert</button>",
				orderable: 		false,
				createdCell:	function(cell, cellData, rowData, rowIndex, cellIndex){
					if(rowIndex > 0){
						$(cell).find("button").on("click touch", function(evt){
							modal.emit("revert", rowData.audit_id);
						});
					}
					else {
						$(cell).html("");
					}
				}
			}
		],
		rowId:			"audit_id",
		info:			false,
		lengthChange:	false,
		paging:			false,
		order:			[[0, "desc"]]
	});
});