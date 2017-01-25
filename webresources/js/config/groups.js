var dataTable;

$(function(){
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
		alert("Error retrieving groups data. Please consult the system logs for more information.\nError message: " + err);
	});
	
	$.ajax({
		method:		"get",
		url:		"/rest/v1/config/directories",
		dataType:	"json"
	}).done(function(response){
		$("#grp-directory").html(document.createElement("option"));
		for(var key in response){
			var option = document.createElement("option");
			option.value = key;
			option.text = key;
			$("#grp-directory").append(option);
		}
	})
	.fail(function(xhr, status, err){
		alert("Error retrieving directory data. Please consult the system logs for more information.\nError message: " + err);
	});
});



function buildRolesList(groupData){
	APP.utils.AdditiveList("roles-list");
	$.ajax({
		method:		"get",
		url:		"/rest/v1/config/roles",
		dataType:	"json"
	}).done(function(response){
		$("#roles-list")[0].setListOptions(response);
		buildGroupsTable(groupData);
	})
	.fail(function(xhr, status, err){
		alert("Error retrieving roles data. Please consult the system logs for more information.\nError message: " + err);
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
				defaultContent: "<span class='delete fa fa-times'/>",
				searchable:		false,
				orderable:		false,
				width:			"5%",
				createdCell:	function(cell, cellData, rowData, rowIndex, cellIndex){
					$(cell).find("span.delete").on("click touch", function(evt){
						evt.stopPropagation();
						var conf = confirm("Deleting a group cannot be undone. Proceed?");
						
						$.ajax({
							method:		"delete",
							url:		"/rest/v1/config/directories/" + rowData.directory + "/groups/" + rowData.name
						})
						.done(function(response){
							alert("Group removed successfully.");
							clearForm();
						})
						.fail(function(xhr, status, err){
							alert("Error removing group. Please check the system logs for more information.\nError message: " + err);
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
				cancelForm(function(){
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
	APP.utils.AdditiveList("group-members");
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
}

function showGroupForm(groupDetails){
	var groupConfigForm = document.getElementById("group-config");
	groupConfigForm.groupDetails = groupDetails;
	$(groupConfigForm).removeClass("hide");
	$("#add-group").addClass("hide");
	$("#grp-directory").removeAttr("disabled");
	$("#grp-displayName").off("keyup");
	$("#group-members-section").removeClass("hide");
	$("#roles-list")[0].clear();
	$("#group-members")[0].clear();
	groupConfigForm.roles = [];
	groupConfigForm.members = [];
	
	if(groupDetails != undefined){
		$("#grp-directory").val(groupDetails.directory).attr("disabled", true);
		$("#grp-displayName").val(groupDetails.displayName);
		$("#grp-name").val(groupDetails.name);
		
		$.ajax({
			method:		"get",
			url:		"/rest/v1/auth/groups/" + groupDetails.name + "/roles",
			dataType:	"json"
		})
		.done(function(response){
			for(var i=0;i<response.length;i++){
				groupConfigForm.roles.push(response[i].roleId);
				$("#roles-list")[0].addOption(response[i].roleId);
			}
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
			
			groupConfigForm.members = response;
		});
	}
	else {
		$("#grp-displayName").on("keyup", function(evt){
			var value = $("#grp-displayName").val().replace(" ", "-").toLowerCase();
			$("#grp-name").val(value);
		});
	}
	
	$("#group-details-submit").off("click touch");
	$("#group-details-submit").on("click touch", function(evt){
		evt.preventDefault();
		submitData();
	});
	
	$("#group-details-cancel").off("click touch");
	$("#group-details-cancel").on("click touch", function(evt){
		evt.preventDefault();
		cancelForm();
	});
}

function submitData(){
	var groupConfigForm = document.getElementById("group-config");
	var groupDetails = groupConfigForm.groupDetails;
	var roles = groupConfigForm.roles || [];
	var members = groupConfigForm.members || [];
	var data = {};
	var directory = $("#grp-directory").val();
	var groupId = $("#grp-name").val();
	var update = true;
	var errors = false;
	var changed = false;
	
	if(groupDetails == undefined){
		update = false;
		var missing = [];
		$("div.input-label.required").each(function(index, el){
			if($(el).parent().find(".input-field").val() == ""){
				missing.push($(el).text());
			}
		});
		
		if(missing.length > 0){
			alert("Could not complete the request. The following required fields do not have a value:\n\t" + missing.join("\n\t"));
			return;
		}
	}
	
	groupDetails = groupDetails || {};
	groupDetails.displayName = groupDetails.displayName || "";
	
	if($("#grp-displayName").val() != groupDetails.displayName){
		data.displayName = $("#grp-displayName").val();
	}
	var requests = 0;
	if(Object.keys(data).length > 0){
		requests++;
		changed = true;
		$.ajax({
			method:			"post",
			url:			"/rest/v1/config/directories/" + directory + "/groups/" + groupId,
			data:			JSON.stringify(data),
			contentType:	"application/json"
		})
		.fail(function(xhr, status, err){
			alert("An error occurred updating the group. Please check the system logs for more information.\nError message: " + err);
			errors = true;
		})
		.always(function(){
			requests--;
			checkComplete();
		});
	}
	
	var rolesDifferences = $("#roles-list")[0].getDifferences(roles);
	changed = changed || (rolesDifferences.added.length + rolesDifferences.removed.length) > 0;
	requests += (rolesDifferences.added.length + rolesDifferences.removed.length);
	for(var i=0;i<rolesDifferences.added.length;i++){
		modifyRoleMembership("post", rolesDifferences.added[i], groupId, function(err){
			errors = errors || err;
			requests--;
			checkComplete();
		});
	}
	
	for(var j=0;j<rolesDifferences.removed.length;j++){
		modifyRoleMembership("delete", rolesDifferences.removed[j], groupId, function(err){
			errors = errors || err;
			requests--;
			checkComplete();
		});
	}
	
	var memberDifferences = $("#group-members")[0].getDifferences(members);
	changed = changed || (memberDifferences.added.length + memberDifferences.removed.length) > 0;
	requests += (memberDifferences.added.length + memberDifferences.removed.length);
	for(var k=0;k<memberDifferences.added.length;k++){
		modifyMember("post", memberDifferences.added[k], directory, groupId, function(err){
			errors = errors || err;
			requests--;
			checkComplete();
		});
	}
	
	for(var l=0;l<memberDifferences.removed.length;l++){
		modifyMember("delete", memberDifferences.removed[l], directory, groupId, function(err){
			errors = errors || err;
			requests--;
			checkComplete();
		});
	}
	
	checkComplete();
	
	function checkComplete(){
		if(requests == 0 && changed){
			alert("Group " + (update ? "updated": "created") + " " + (errors ? "with errors." : "successfully"));
			clearForm(rebuildTable);
		}
		else if(!changed){
			alert("No changes have been made yet.");
		}
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
		alert("Error " + ((method == "post") ? "attaching role '" + role.name + "' to " : "removing role '" + role.name + "' from ") + "group. Please check the system logs for more information.\nError message: " + err);
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
		alert("Error " + ((method == "post") ? "adding user '" + user.fn + " " + user.ln + "' to " : "removing user '" + user.fn + " " + user.ln + "' from ") + "group. Please check the system logs for more information.\nError message: " + err);
		error = true;
	})
	.always(function(){
		next(error);
	});
}

function cancelForm(next){
	var groupConfigForm = document.getElementById("group-config");
	var groupDetails = groupConfigForm.groupDetails;
	var roles = groupConfigForm.roles || [];
	var members = groupConfigForm.members || [];
	var changed = false;
	var cancel = true;
	
	if(groupDetails == undefined){
		if($("#grp-directory").val() != "" || $("#grp-name").val() != ""){
			changed = true;
		}
	}
	
	groupDetails = groupDetails || {};
	groupDetails.displayName = groupDetails.displayName || "";
	
	if($("#grp-displayName").val() != groupDetails.displayName){
		changed = true;
	}
	
	var rolesDifferences = $("#roles-list")[0].getDifferences(roles);
	changed = changed || (rolesDifferences.added.length + rolesDifferences.removed.length) > 0;
	
	var membersDifferences = $("#group-members")[0].getDifferences(members);
	changed = changed || (membersDifferences.added.length + membersDifferences.removed.length) > 0;
	
	if(changed){
		cancel = confirm("You have made changes that will be lost if you cancel. Proceed?");
	}
	
	if(cancel){
		clearForm(next);
	}
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
		alert("Error retrieving groups data. Please consult the system logs for more information.\nError message: " + err);
	});
}