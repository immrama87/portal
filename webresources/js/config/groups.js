var dataTable;
var form;

$(function(){
	form = Blueprint.utils.FormBuilder.build("group-form");
	form.readFieldsFromHTML();
	form.trackListField($("#roles-list")[0]);
	form.trackListField($("#group-members")[0]);
	form.onsubmit(function(data, lists){
		var requests = 0;
		var errors = false;
		if(data != undefined){
			$.ajax({
				method:			"post",
				url:			"/rest/v1/config/directories/" + data.directory + "/groups/" + data.name,
				data:			JSON.stringify(data),
				contentType:	"application/json"
			})
			.done(updateLists)
			.fail(function(xhr, status, err){
				Blueprint.utils.Messaging.alert("An error occurred updating the group.", true, err);
				errors = true;
			});
		}
		else {
			updateLists();
		}
		
		function updateLists(){
			var groupId = $("#name").val();
			var directory = $("#directory").val();
			requests += lists["roles-list"].added.length + lists["roles-list"].removed.length;
			requests += lists["group-members"].added.length + lists["group-members"].removed.length;
			
			if(requests > 0){
				for(var i=0;i<lists["roles-list"].added.length;i++){
					modifyRoleMembership("post", lists["roles-list"].added[i], groupId, function(failed){
						errors = errors || failed;
						requests--;
						checkComplete();
					});
				}
				
				for(var j=0;j<lists["roles-list"].removed.length;j++){
					modifyRoleMembership("delete", lists["roles-list"].removed[j], groupId, function(failed){
						errors = errors || failed;
						requests--;
						checkComplete();
					});
				}
				
				for(var k=0;k<lists["group-members"].added.length;k++){
					modifyMember("post", lists["group-members"].added[k], directory, groupId, function(failed){
						errors = errors || failed;
						requests--;
						checkComplete();
					});
				}
				
				for(var l=0;l<lists["group-members"].removed.length;l++){
					modifyMember("delete", lists["group-members"].removed[l], directory, groupId, function(failed){
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
			if(requests == 0){
				Blueprint.utils.Messaging.alert("Group created/modified " + (errors ? "with errors." : "successfully."));
				form.clearChangedState();
				form.clear(function(){
					clearForm(rebuildTable);
				});
			}
		}
	});
	$("#group-config").addClass("hide");
	$("#group-members-section").addClass("hide");
	$("#add-group").on("click touch", function(evt){
		showGroupForm();
	});
	
	$.ajax({
		method:		"get",
		url:		"/rest/v1/config/groups",
		dataType:	"json"
	}).done(function(response){
		buildRolesList(response);
	})
	.fail(function(xhr, status, err){
		Blueprint.utils.Messaging.alert("Error retrieving groups data.", true, err);
	});
	
	$.ajax({
		method:		"get",
		url:		"/rest/v1/config/directories",
		dataType:	"json"
	}).done(function(response){
		$("#directory").html(document.createElement("option"));
		for(var key in response){
			var option = document.createElement("option");
			option.value = key;
			option.text = key;
			$("#directory").append(option);
		}
	})
	.fail(function(xhr, status, err){
		Blueprint.utils.Messaging.alert("Error retrieving directory data.", true, err);
	});
	
	$("#group-details-submit").off("click touch");
	$("#group-details-submit").on("click touch", function(evt){
		form.submit();
	});
	
	$("#group-details-cancel").off("click touch");
	$("#group-details-cancel").on("click touch", function(evt){
		form.clear(clearForm);
	});
});

function buildRolesList(groupData){
	Blueprint.utils.AdditiveList("roles-list");
	$.ajax({
		method:		"get",
		url:		"/rest/v1/config/roles",
		dataType:	"json"
	}).done(function(response){
		$("#roles-list")[0].setListOptions(response);
		buildGroupsTable(groupData);
	})
	.fail(function(xhr, status, err){
		Blueprint.utils.Messaging.alert("Error retrieving roles data.", true, err);
	});
}

function buildGroupsTable(groupsResponse){
	var groups = [];
	for(var dir in groupsResponse){
		for(var i=0;i<groupsResponse[dir].length;i++){
			var group = groupsResponse[dir][i];
			group.directory = dir;
			groups.push(group);
		}
	}
	
	dataTable = $("#groups").DataTable({
		data:		groups,
		columns:	[
			{
				title:	"Group Name",
				data:	"displayName"
			},
			{
				title:	"Directory",
				data:	"directory"
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
						Blueprint.utils.Messaging.confirm("Deleting a group cannot be undone. Proceed?", function(conf){
							if(conf){
								$.ajax({
									method:		"delete",
									url:		"/rest/v1/config/directories/" + rowData.directory + "/groups/" + rowData.name
								})
								.done(function(response){
									Blueprint.utils.Messaging.alert("Group removed successfully.");
									clearForm();
								})
								.fail(function(xhr, status, err){
									Blueprint.utils.Messaging.alert("Error removing group.", true, err);
								});
							}
						});
					});
				}
			}
		],
		rowId:			"name",
		info:			false,
		lengthChange:	false,
		pagingType:		"first_last_numbers",
		rowCallback:	function(row, data, index){
			$(row).on("click touch", function(evt){
				form.clear(function(){
					$("#groups").find("tr.selected").removeClass("selected");
					$(row).addClass("selected");
				
					showGroupForm(data);
				});
			});
		}
	});
	
	generateUsersList();
}

function generateUsersList(){
	Blueprint.utils.AdditiveList("group-members");
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
		
		$("#group-members")[0].setListOptions(users);
	});
	
	Blueprint.modules.activeModule().ready();
}

function showGroupForm(groupDetails){
	var groupConfigForm = document.getElementById("group-config");
	$(groupConfigForm).removeClass("hide");
	$("#add-group").addClass("hide");
	$("#directory").removeAttr("disabled");
	$("#displayName").off("keyup");
	$("#group-members-section").removeClass("hide");
	$("#roles-list")[0].clear();
	$("#group-members")[0].clear();
	
	if(groupDetails != undefined){
		$("#directory").val(groupDetails.directory).attr("disabled", true);
		$("#displayName").val(groupDetails.displayName);
		$("#name").val(groupDetails.name);
		
		$.ajax({
			method:		"get",
			url:		"/rest/v1/config/groups/" + groupDetails.name + "/roles",
			dataType:	"json"
		})
		.done(function(response){
			for(var i=0;i<response.length;i++){
				$("#roles-list")[0].addOption(response[i].roleId);
			}
			$("#roles-list")[0].setOriginalState();
		});
		
		$.ajax({
			method:		"get",
			url:		"/rest/v1/config/directories/" + groupDetails.directory + "/groups/" + groupDetails.name + "/users",
			dataType:	"json"
		})
		.done(function(response){
			for(var i=0;i<response.length;i++){
				$("#group-members")[0].addOption(response[i]);
			}
			$("#group-members")[0].setOriginalState();
		});
	}
	else {
		$("#displayName").on("keyup", function(evt){
			var value = $("#displayName").val().replace(" ", "-").toLowerCase();
			$("#name").val(value);
		});
	}
	
	
}

function modifyRoleMembership(method, role, groupId, next){
	var error = false;
	$.ajax({
		method:			method,
		url:			"/rest/v1/config/roles/" + role.roleId + "/groups",
		data:			JSON.stringify({groupId: groupId}),
		contentType:	"application/json"
	})
	.fail(function(xhr, status, err){
		Blueprint.utils.Messaging.alert("Error " + ((method == "post") ? "attaching role '" + role.name + "' to " : "removing role '" + role.name + "' from ") + "group.", true, err);
		error = true;
	})
	.always(function(){
		next(error);
	});
}

function modifyMember(method, user, directory, groupId, next){
	var error = false;
	$.ajax({
		method:			method,
		url:			"/rest/v1/config/directories/" + directory + "/groups/" + groupId + "/users",
		data:			JSON.stringify({username: user.username}),
		contentType:	"application/json"
	})
	.fail(function(xhr, status, err){
		Blueprint.utils.Messaging.alert("Error " + ((method == "post") ? "adding user '" + user.fn + " " + user.ln + "' to " : "removing user '" + user.fn + " " + user.ln + "' from ") + "group.", true, err);
		error = true;
	})
	.always(function(){
		next(error);
	});
}

function clearForm(next){
	$("#group-config").addClass("hide");
	$("#add-group").removeClass("hide");
	$("[id^=grp-]").val("");
	$("#group-members-section").addClass("hide");
	
	if(next){
		next();
	}
}

function rebuildTable(){
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
		
		dataTable.clear();
		dataTable.rows.add(groups);
		dataTable.draw();
	})
	.fail(function(xhr, status, err){
		Blueprint.utils.Messaging.alert("Error retrieving groups data.", true, err);
	});
}

Blueprint.modules.activeModule().setData = function(data){
	if(data.length == 1){
		$.ajax({
			method:		"get",
			url:		"/rest/v1/config/groups/" + data[0],
			dataType:	"json"
		})
		.done(function(results){
			showGroupForm(results);
		});
	}
	else if(data.length > 1){
		$.ajax({
			method:		"get",
			url:		"/rest/v1/config/directories/" + data[0] + "/groups/" + data[1],
			dataType:	"json"
		})
		.done(function(results){
			results.directory = data[0];
			showGroupForm(results);
		})
	}
}

Blueprint.modules.activeModule().destroy = function(next){
	form.clear(function(){
		delete dataTable;
		delete form;
		delete buildRolesList;
		delete buildGroupsTable;
		delete generateUsersList;
		delete showGroupForm;
		delete modifyRoleMembership;
		delete modifyMember;
		delete clearForm;
		delete rebuildTable;
		
		next();
	});
}