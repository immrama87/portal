var dataTable;

$(function(){
	$("#role-config").addClass("hide");
	$.ajax({
		method:		"get",
		url:		"/rest/v1/config/roles",
		dataType:	"json"
	})
	.done(function(response){
		buildTable(response);
	})
	.fail(function(xhr, status, err){
		alert("Error retrieving roles data. Please consult the system logs for more information.\nError message: " + err);
	});
	
	$("#add-role").on("click touch", function(evt){
		showRoleForm();
	});
});

function buildTable(roles){
	dataTable = $("#roles").DataTable({
		data:		roles,
		columns:	[
			{
				title:	"Role Name",
				data:	"name"
			},
			{
				title:	"Role ID",
				data:	"roleId"
			},
			{
				title:			"",
				className:		"delete",
				data:			null,
				defaultContent: "<span class='delete fa fa-times'/>",
				searchable:		false,
				orderable:		false,
				width:			"5%",
				createdCell:	function(cell, cellData, rowData, rowIndex, cellIndex){
					$(cell).find("span.delete").on("click touch", function(evt){
						evt.stopPropagation();
						var conf = confirm("Deleting a role cannot be undone. Proceed?");
						if(conf){
							$.ajax({
								method:			"delete",
								url:			"/rest/v1/config/roles",
								data:			JSON.stringify({roleId:	rowData.roleId}),
								contentType:	"application/json"
							})
							.done(function(response){
								alert("Role successfully removed.");
								rebuildTable();
							})
							.fail(function(xhr, status, err){
								alert("Error removing role. Please consult the system logs for more information.\nError message: " + err);
							});
						}
					});
				}
			}
		],
		rowId:			"roleId",
		info:			false,
		lengthChange:	false,
		pagingType:		"first_last_numbers",
		rowCallback:	function(row, data, index){
			$(row).on("click touch", function(evt){
				cancelFormData(function(){
					$("#roles").find("tr.selected").removeClass("selected");
					$(row).addClass("selected");
				
					showRoleForm(data);
				});
			});
		}
	});
	
	getGroupsList();
	getUsersList();
}

function getGroupsList(){
	APP.utils.AdditiveList("group-members");
	$.ajax({
		method:		"get",
		url:		"/rest/v1/config/groups",
		dataType:	"json"
	})
	.done(function(response){
		var groups = [];
		for(var dir in response){
			for(var i=0;i<response[dir].length;i++){
				var group = response[dir][i];
				group.directory = dir;
				groups.push(group);
			}
		}
		
		$("#group-members")[0].setListOptions(groups);
	});
}

function getUsersList(){
	APP.utils.AdditiveList("user-members");
	$.ajax({
		method:		"get",
		url:		"/rest/v1/config/users",
		dataType:	"json"
	}).done(function(response){
		var users = [];
		for(var dir in response){
			for(var i=0;i<response[dir].length;i++){
				var user = response[dir][i];
				user.directory = dir;
				users.push(user);
			}
		}
		
		$("#user-members")[0].setListOptions(users);
	});
}

function showRoleForm(roleData){
	$("#add-role").addClass("hide");
	var roleConfigForm = document.getElementById("role-config");
	roleConfigForm.roleData = roleData;
	$(roleConfigForm).removeClass("hide");
	$("#role-roleId").removeAttr("disabled");
	$("#group-members")[0].clear();
	$("#user-members")[0].clear();
	roleConfigForm.groups = [];
	roleConfigForm.users = [];
	
	if(roleData != undefined){
		$("#role-name").val(roleData.name);
		$("#role-roleId").val(roleData.roleId).attr("disabled", true);
		
		$.ajax({
			method:		"get",
			url:		"/rest/v1/config/roles/" + roleData.roleId + "/groups",
			dataType:	"json"
		})
		.done(function(response){
			roleConfigForm.groups = response;
			for(var i=0;i<response.length;i++){
				$("#group-members")[0].addOption(response[i]);
			}
		})
		.fail(function(xhr, status, err){
			alert("Error retrieving attached groups for role '" + roleData.name + "'. Please consult the system logs for more information.\nError message: " + err);
		});
		
		$.ajax({
			method:		"get",
			url:		"/rest/v1/config/roles/" + roleData.roleId + "/users",
			dataType:	"json"
		})
		.done(function(response){
			roleConfigForm.users = response;
			for(var i=0;i<response.length;i++){
				$("#user-members")[0].addOption(response[i]);
			}
		})
		.fail(function(xhr, status, err){
			alert("Error retrieving attached users for role '" + roleData.name + "'. Please consult the system logs for more information.\nError message: " + err);
		});
	}
	
	$("#role-details-submit").off("click touch");
	$("#role-details-submit").on("click touch", function(evt){
		evt.preventDefault();
		submitFormData();
	});
	
	$("#role-details-cancel").off("click touch");
	$("#role-details-cancel").on("click touch", function(evt){
		evt.preventDefault();
		cancelFormData();
	});
}

function submitFormData(){
	var roleConfigForm = document.getElementById("role-config");
	var roleData = roleConfigForm.roleData;
	var groups = roleConfigForm.groups || [];
	var users = roleConfigForm.users || [];
	var changed = false;
	var errors = false;
	
	if(roleData == undefined){
		var missing = [];
		$("div.input-label.required").each(function(index, el){
			if($(el).parent().find("input.input-field").val() == ""){
				missing.push($(el).text());
			}
		});
		
		if(missing.length > 0){
			alert("The following required fields were not set.\n\t" + missing.join("\n\t"));
			return;
		}
		
		changed = true;
	}
	else {
		if($("#role-name").val() != roleData.name || $("#role-roleId").val() != roleData.roleId){
			changed = true;
		}
	}
	
	var requests = 0;
	if(changed){
		requests++;
		$.ajax({
			method:			"post",
			url:			"/rest/v1/config/roles",
			data:			JSON.stringify({roleId: $("#role-roleId").val(), name: $("#role-name").val()}),
			contentType:	"application/json"
		})
		.fail(function(xhr, status, err){
			alert("Error " + ((roleData != undefined) ? "updating" : "creating") + " role '" + $("#role-name").val() + "'. Please check the system logs for more information.\nError message: " + err);
			errors = true;
		})
		.always(function(){
			requests--;
			checkComplete();
		});
	}
	
	var groupDifferences = $("#group-members")[0].getDifferences(groups);
	changed = changed || (groupDifferences.added.length + groupDifferences.removed.length) > 0;
	requests += (groupDifferences.added.length + groupDifferences.removed.length);
	for(var i=0;i<groupDifferences.added.length;i++){
		modifyGroupMembership("post", groupDifferences.added[i].value, function(err){
			errors = errors || err;
			requests--;
			checkComplete();
		});
	}
	
	for(var j=0;j<groupDifferences.removed.length;j++){
		modifyGroupMembership("delete", groupDifferences.removed[j].value, function(err){
			errors = errors || err;
			requests--;
			checkComplete();
		});
	}
	
	var userDifferences = $("#user-members")[0].getDifferences(users);
	changed = changed || (userDifferences.added.length + userDifferences.removed.length) > 0;
	requests += (userDifferences.added.length + userDifferences.removed.length);
	for(var k=0;k<userDifferences.added.length;k++){
		modifyUserMembership("post", userDifferences.added[k].value, function(err){
			errors = errors || err;
			requests--;
			checkComplete();
		});
	}
	
	for(var l=0;l<userDifferences.removed.length;l++){
		modifyUserMembership("delete", userDifferences.removed[l].value, function(err){
			errors = errors || err;
			requests--;
			checkComplete();
		});
	}
	
	function checkComplete(){
		if(!changed){
			alert("No changes have been made yet.");
		}
		else if(requests == 0){
			alert("Role " + ((roleData != undefined) ? "updated": "created") + " " + ((errors) ? "with errors.": "successfully."));
			clearForm(rebuildTable);
		}
	}
}

function cancelFormData(next){
	var roleConfigForm = document.getElementById("role-config");
	var roleData = roleConfigForm.roleData;
	var groups = roleConfigForm.groups || [];
	var users = roleConfigForm.users || [];
	var changed = false;
	var cancel = true;
	
	if(roleData == undefined){
		if($("#role-roleId").val() != "" || $("#role-name").val() != ""){
			changed = true;
		}
	}
	else {
		if($("#role-roleId").val() != roleData.roleId || $("#role-name").val() != roleData.name){
			changed = true;
		}
	}
	
	var groupDifferences = $("#group-members")[0].getDifferences(groups);
	changed = changed || (groupDifferences.added.length > 0 || groupDifferences.removed.length > 0);
	
	var userDifferences = $("#user-members")[0].getDifferences(users);
	changed = changed || (userDifferences.added.length > 0 || userDifferences.removed.length > 0);
	
	if(changed){
		cancel = confirm("You have made changes that will be lost if you cancel. Proceed?");
	}
	
	if(cancel){
		clearForm(next);
	}
}

function modifyGroupMembership(method, groupId, next){
	var error = false;
	$.ajax({
		method:			method,
		url:			"/rest/v1/config/roles/" + $("#role-roleId").val() + "/groups",
		data:			JSON.stringify({groupId: groupId}),
		contentType:	"application/json"
	})
	.fail(function(xhr, status, err){
		alert("Error " + ((method == "post") ? "adding" : "removing") + " group '" + groupId + "' to role. Please check the system logs for more information.\nError message: " + err);
		error = true;
	})
	.always(function(){
		next(error);
	});
}

function modifyUserMembership(method, username, next){
	var error = false;
	$.ajax({
		method:			method,
		url:			"/rest/v1/config/roles/" + $("#role-roleId").val() + "/users",
		data:			JSON.stringify({username: username}),
		contentType:	"application/json"
	})
	.fail(function(xhr, status, err){
		alert("Error " + ((method == "post") ? "adding" : "removing") + " user '" + username + "' to role. Please check the system logs for more information.\nError message: " + err);
		error = true;
	})
	.always(function(){
		next(error);
	});
}

function rebuildTable(){
	$.ajax({
		method:		"get",
		url:		"/rest/v1/config/roles",
		dataType:	"json"
	})
	.done(function(response){
		dataTable.clear();
		dataTable.rows.add(response);
		dataTable.draw();
		
		clearForm();
	})
	.fail(function(xhr, status, err){
		alert("Error retrieving updated role data. Please check the system logs for more information.\nError message: " + err);
	});
}

function clearForm(next){
	$("#add-role").removeClass("hide");
	$("#role-config").addClass("hide");
	
	$("input[id^=role-]").val("");
	$("#roles").find("tr.selected").removeClass("selected");
	
	if(next){
		next();
	}
}