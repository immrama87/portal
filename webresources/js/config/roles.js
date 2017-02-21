var dataTable;
var form;

$(function(){
	form = Blueprint.utils.FormBuilder.build("role-form");
	form.readFieldsFromHTML();
	form.trackListField($("#group-members")[0]);
	form.trackListField($("#user-members")[0]);
	
	form.onsubmit(function(data, lists){
		var requests = 0;
		var errors = false;
		if(data != undefined){
			$.ajax({
				method:			"post",
				url:			"/rest/v1/config/roles",
				data:			JSON.stringify(data),
				contentType:	"application/json"
			})
			.done(updateLists)
			.fail(function(xhr, status, err){
				Blueprint.utils.Messaging.alert("Error creating/updating role '" + data.name + "'.", true, err);
				errors = true;
			})
		}
		else {
			updateLists();
		}
		
		function updateLists(){
			requests += lists["group-members"].added.length + lists["group-members"].removed.length;
			requests += lists["user-members"].added.length + lists["user-members"].removed.length;
			
			if(requests > 0){
				for(var i=0;i<lists["group-members"].added.length;i++){
					modifyGroupMembership("post", lists["group-members"].added[i].name, function(failed){
						errors = errors || failed;
						requests--;
						checkComplete();
					});
				}
				
				for(var j=0;j<lists["group-members"].removed.length;j++){
					modifyGroupMembership("delete", lists["group-members"].removed[j].name, function(failed){
						errors = errors || failed;
						requests--;
						checkComplete();
					});
				}
				
				for(var k=0;k<lists["user-members"].added.length;k++){
					modifyUserMembership("post", lists["user-members"].added[k].username, function(failed){
						errors = errors || failed;
						requests--;
						checkComplete();
					});
				}
				
				for(var l=0;l<lists["user-members"].removed.length;l++){
					modifyUserMembership("delete", lists["user-members"].removed[l].username, function(failed){
						errors = errors || failed;
						requests--;
						checkComplete();
					});
				}
			}
			else {
				checkComplete();
			}
		}
		
		function checkComplete(){
			Blueprint.utils.Messaging.alert("Role created/modified " + ((errors) ? "with errors.": "successfully."));
			form.clearChangedState();
			form.clear(rebuildTable);
		}
	});
	
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
		Blueprint.utils.Messaging.alert("Error retrieving roles data.", true, err);
	});
	
	$("#add-role").on("click touch", function(evt){
		showRoleForm();
	});
	
	$("#role-details-submit").off("click touch");
	$("#role-details-submit").on("click touch", function(evt){
		form.submit();
	});
	
	$("#role-details-cancel").off("click touch");
	$("#role-details-cancel").on("click touch", function(evt){
		form.clear(clearForm);
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
				defaultContent: "<span class='delete fa fa-times'></span>",
				searchable:		false,
				orderable:		false,
				width:			"5%",
				createdCell:	function(cell, cellData, rowData, rowIndex, cellIndex){
					$(cell).find("span.delete").on("click touch", function(evt){
						evt.stopPropagation();
						Blueprint.utils.Messaging.confirm("Deleting a role cannot be undone. Proceed?", function(conf){
							if(conf){
								$.ajax({
									method:			"delete",
									url:			"/rest/v1/config/roles",
									data:			JSON.stringify({roleId:	rowData.roleId}),
									contentType:	"application/json"
								})
								.done(function(response){
									Blueprint.utils.Messaging.alert("Role successfully removed.");
									rebuildTable();
								})
								.fail(function(xhr, status, err){
									Blueprint.utils.Messaging.alert("Error removing role.", true, err);
								});
							}
						});
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
				form.clear(function(){
					$("#roles").find("tr.selected").removeClass("selected");
					$(row).addClass("selected");
				
					showRoleForm(data);
				});
			});
		}
	});
	
	getGroupsList();
	getUsersList();
	Blueprint.modules.activeModule().ready();
}

function getGroupsList(){
	Blueprint.utils.AdditiveList("group-members");
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
	Blueprint.utils.AdditiveList("user-members");
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
	$(roleConfigForm).removeClass("hide");
	$("#roleId").removeAttr("disabled");
	$("#group-members")[0].clear();
	$("#user-members")[0].clear();
	
	if(roleData != undefined){
		$("#name").val(roleData.name);
		$("#roleId").val(roleData.roleId).attr("disabled", true);
		
		$.ajax({
			method:		"get",
			url:		"/rest/v1/config/roles/" + roleData.roleId + "/groups",
			dataType:	"json"
		})
		.done(function(response){
			for(var i=0;i<response.length;i++){
				$("#group-members")[0].addOption(response[i]);
			}
			$("#group-members")[0].setOriginalState();
		})
		.fail(function(xhr, status, err){
			Blueprint.utils.Messaging.alert("Error retrieving attached groups for role '" + roleData.name + "'.", true, err);
		});
		
		$.ajax({
			method:		"get",
			url:		"/rest/v1/config/roles/" + roleData.roleId + "/users",
			dataType:	"json"
		})
		.done(function(response){
			for(var i=0;i<response.length;i++){
				$("#user-members")[0].addOption(response[i]);
			}
			$("#user-members")[0].setOriginalState();
		})
		.fail(function(xhr, status, err){
			Blueprint.utils.Messaging.alert("Error retrieving attached users for role '" + roleData.name + "'.", true, err);
		});
	}
}

function modifyGroupMembership(method, groupId, next){
	var error = false;
	$.ajax({
		method:			method,
		url:			"/rest/v1/config/roles/" + $("#roleId").val() + "/groups",
		data:			JSON.stringify({groupId: groupId}),
		contentType:	"application/json"
	})
	.fail(function(xhr, status, err){
		Blueprint.utils.Messaging.alert("Error " + ((method == "post") ? "adding" : "removing") + " group '" + groupId + "' to role.", true, err);
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
		url:			"/rest/v1/config/roles/" + $("#roleId").val() + "/users",
		data:			JSON.stringify({username: username}),
		contentType:	"application/json"
	})
	.fail(function(xhr, status, err){
		Blueprint.utils.Messaging.alert("Error " + ((method == "post") ? "adding" : "removing") + " user '" + username + "' to role.", true, err);
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
		Blueprint.utils.Messaging.alert("Error retrieving updated role data.", true, err);
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

Blueprint.modules.activeModule().setData = function(data){
	$.ajax({
		method:		"get",
		url:		"/rest/v1/config/roles/" + data[0],
		dataType:	"json"
	})
	.done(function(response){
		showRoleForm(response);
	});
}

Blueprint.modules.activeModule().destroy = function(next){
	form.clear(function(){
		delete dataTable;
		delete form;
		delete buildTable;
		delete getGroupsList;
		delete getUsersList;
		delete showRoleForm;
		delete modifyGroupMembership;
		delete modifyUserMembership;
		delete rebuildTable;
		delete clearForm;
		
		next();
	});
}