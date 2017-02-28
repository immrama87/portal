(function(modal, data){
	$("#version-table").DataTable({
		data: data,
		columns: [
			{
				title: "Version Number",
				data: "version",
				orderable:false
			},
			{
				title:	"",
				defaultContent: "<button class='btn btn-link'>Show Details</button>",
				className: "text-right",
				orderable:false,
				width:"70%",
				createdCell: function(cell, cellData, rowData, rowIndex, cellIndex){
					$(cell).find("button").on("click touch", function(evt){
						modal.emit("version-details", {
							version: 	rowData.version,
							cell: 		cell
						});
					});
				}
			}
		],
		paging:false,
		info:false,
		searching:false
	});
});