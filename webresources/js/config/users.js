var dataTable;
var directories = {};
var requests = 0;

$(function(){
	$("#add-user").on("click touch", function(evt){
		showUserForm();
	});
	
	$.ajax({
		method:		"get",
		url:		"/rest/v1/config/directories",
		dataType:	"json"
	})
	.done(function(response){
		var dirSelect = document.getElementById("user-directory");
		$(dirSelect).html(document.createElement("option"));
		for(var key in response){
			var option = document.createElement("option");
			option.value = key;
			option.text = key;
			$(dirSelect).append(option);
			
			directories[key] = {};
			directories[key].readonly = response[key].readonly || false;
		}
		
		retrieveUsers();
	})
	.fail(function(xhr, status, err){
		alert("Error retrieving user directories list. Please check the system logs for more information.\nError message: " + err);
	});
});

function retrieveUsers(){
	$.ajax({
		method:		"get",
		url:		"/rest/v1/config/users",
		dataType:	"json"
	})
	.done(function(response){
		for(var key in response){
			directories[key].users = response[key];
		}
		
		retrieveGroups();
	})
	.fail(function(xhr, status, err){
		alert("Error retrieving users list. Please check the system logs for more information.\nError message: " + err);
	});
}

function retrieveGroups(){
	$.ajax({
		method:		"get",
		url:		"/rest/v1/config/groups",
		dataType:	"json"
	})
	.done(function(response){
		for(var key in response){
			directories[key].groups = response[key];
		}
		buildListObjects();
	})
	.fail(function(xhr, status, err){
		alert("Error retrieving groups list. Please check the system logs for more information.\nError message: " + err);
	});
}

function buildListObjects(){
	$("div.additive-list").each(function(index, el){
		APP.utils.AdditiveList(el.id);
	});
	
	var groups = [];
	for(var dir in directories){
		for(var i=0;i<directories[dir].groups.length;i++){
			var group = directories[dir].groups[i];
			group.readonly = directories[dir].readonly;
			group.directory = dir;
			groups.push(group);
		}
	}
	
	$("#groups-list")[0].setListOptions(groups);	
	
	$("#groups-list")[0].onaddoption(function(option){
		getGroupRoles({name: option.value, displayName: option.text});
	});
	$("#groups-list")[0].onremoveoption(function(option){
		getGroupRoles({name: option.value, displayName: option.text}, true);
	});
	
	$.ajax({
		method:		"get",
		url:		"/rest/v1/config/roles",
		dataType:	"json"
	})
	.done(function(response){
		$("#roles-list")[0].setListOptions(response);
		buildTable();
	})
	.fail(function(xhr, status, err){
		alert("Error retrieving roles list. Please check the system logs for more information.\nError message: " + err);
	});
}

function buildTable(){
	var users = [];
	for(var dir in directories){
		for(var i=0;i<directories[dir].users.length;i++){
			var user = directories[dir].users[i];
			user.directory = dir;
			users.push(user);
		}
	}
	
	dataTable = $("#users").DataTable({
		data: 		users,
		columns:	[
			{
				title:	"First Name",
				data:	"fn"
			},
			{
				title:	"Last Name",
				data:	"ln"
			},
			{
				title:	"Username",
				data:	"username"
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
						var conf = confirm("Deleting a user cannot be undone. Proceed?");
						if(conf){
							$.ajax({
								method:			"delete",
								url:			"/rest/v1/config/directories/" + rowData.directory + "/users/" + rowData.username
							})
							.done(function(response){
								alert("User successfully removed.");
								rebuildTable();
							})
							.fail(function(xhr, status, err){
								alert("Error removing user. Please consult the system logs for more information.\nError message: " + err);
							});
						}
					});
				}
			}
		],
		rowId:			"username",
		info:			false,
		lengthChange:	false,
		pagingType:		"first_last_numbers",
		rowCallback:	function(row, data, index){
			$(row).on("click touch", function(evt){
				cancelForm(function(){
					$("#users").find("tr.selected").removeClass("selected");
					$(row).addClass("selected");
					showUserForm(data);
				});
			});
		}
	});
}

function showUserForm(userDetails){
	$("#groups-list")[0].clear();
	$("#roles-list")[0].clear();
	$("#add-user").addClass("hide");
	var userConfigForm = document.getElementById("user-config");
	userConfigForm.userDetails = userDetails;
	$(userConfigForm).removeClass("hide");
	$("#user-directory").removeAttr("disabled");
	$("#user-username").removeAttr("disabled");
	$("#change-password").removeClass("hide");
	$("#pass-form").addClass("hide");
	userConfigForm.groups = [];
	userConfigForm.roles = [];
	
	if(userDetails != undefined){
		$.ajax({
			method:		"get",
			url:		"/rest/v1/config/directories/" + userDetails.directory + "/users/" + userDetails.username,
			dataType:	"json"
		}).done(function(response){
			$("#user-directory").val(userDetails.directory).attr("disabled", true);
			$("#user-username").attr("disabled", true);
			for(var key in response){
				userConfigForm.userDetails[key] = response[key];
				$("#user-" + key).val(response[key]);
			}
			
			$.ajax({
				method:		"get",
				url:		"/rest/v1/config/directories/" + userDetails.directory + "/users/" + userDetails.username + "/groups",
				dataType:	"json"
			}).done(function(groupsResponse){
				for(var dir in groupsResponse){
					for(var i=0;i<groupsResponse[dir].length;i++){
						$("#groups-list")[0].addOption(groupsResponse[dir][i].name);
						userConfigForm.groups.push(groupsResponse[dir][i].name);
					}
				}
			});
			
			$.ajax({
				method:		"get",
				url:		"/rest/v1/auth/users/" + userDetails.username + "/roles",
				dataType:	"json"
			}).done(function(rolesResponse){
				for(var i=0;i<rolesResponse.length;i++){
					$("#roles-list")[0].addOption(rolesResponse[i].roleId);
					userConfigForm.roles.push(rolesResponse[i].roleId);
				}
			});
		});
		
		$("#change-password").off("click touch");
		$("#change-password").on("click touch", function(evt){
			evt.preventDefault();
			$("#change-password").addClass("hide");
			$("#pass-form").removeClass("hide");
		});
	}
	else {
		$("#change-password").addClass("hide");
		$("#pass-form").removeClass("hide");
	}
	
	$("#user-details-submit").off("click touch");
	$("#user-details-submit").on("click touch", function(evt){
		evt.preventDefault();
		submitData();
	});
	
	$("#user-details-cancel").off("click touch");
	$("#user-details-cancel").on("click touch", function(evt){
		evt.preventDefault();
		cancelForm();
	});
}

function submitData(){
	var userConfigForm = document.getElementById("user-config");
	var userDetails = userConfigForm.userDetails;
	var groups = userConfigForm.groups || [];
	var roles = userConfigForm.roles || [];
	var data = {};
	var directory = $("#user-directory").val();
	var username = $("#user-username").val();
	var update = true;
	var errors = false;
	var changed = false;
	
	if(userDetails == undefined){
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
	
	userDetails = userDetails || {};
	userDetails.fn = userDetails.fn || null;
	userDetails.ln = userDetails.ln || null;
	userDetails.email = userDetails.email || null;
	
	if($("#user-fn").val() != userDetails.fn){
		data.fn = $("#user-fn").val();
	}
	if($("#user-ln").val() != userDetails.ln){
		data.ln = $("#user-ln").val();
	}
	if($("#user-email").val() != userDetails.email){
		data.email = $("#user-email").val();
	}
	
	var password = $("#user-password").val();
	var confirmPass = $("#user-pass-confirm").val();
	
	if(password != ""){
		if(password != confirmPass){
			alert("The provided passwords do not match.");
			return;
		}
		else {
			data.password = password;
		}
	}
	
	var requests = 0;
	if(Object.keys(data).length > 0){
		requests++;
		changed = true;
		$.ajax({
			method:			"post",
			url:			"/rest/v1/config/directories/" + directory + "/users/" + username,
			data:			JSON.stringify(data),
			contentType:	"application/json"
		})
		.fail(function(xhr, status, err){
			alert("An error occurred updating the user. Please check the system logs for more information.\nError message: " + err);
			errors = true;
		})
		.always(function(){
			requests--;
			checkComplete();
		});
	}
	
	var groupDifferences = $("#groups-list")[0].getDifferences(groups);
	changed = changed || (groupDifferences.added.length + groupDifferences.removed.length) > 0;
	requests += (groupDifferences.added.length + groupDifferences.removed.length);
	for(var i=0;i<groupDifferences.added.length;i++){
		modifyGroupMembership("post", groupDifferences.added[i], username, function(err){
			errors = errors || err;
			requests--;
			checkComplete();
		});
	}
	
	for(var j=0;j<groupDifferences.removed.length;j++){
		modifyGroupMembership("delete", groupDifferences.removed[j], username, function(err){
			errors = errors || err;
			requests--;
			checkComplete();
		});
	}
	
	var rolesDifferences = $("#roles-list")[0].getDifferences(roles);
	changed = changed || (rolesDifferences.added.length + rolesDifferences.removed.length) > 0;
	requests += (rolesDifferences.added.length + rolesDifferences.removed.length);
	for(var k=0;k<rolesDifferences.added.length;k++){
		modifyRoleMembership("post", rolesDifferences.added[k], username, function(err){
			errors = errors || err;
			requests--;
			checkComplete();
		});
	}
	
	for(var l=0;l<rolesDifferences.removed.length;l++){
		modifyRoleMembership("delete", rolesDifferences.removed[l], username, function(err){
			errors = errors || err;
			requests--;
			checkComplete();
		});
	}
	
	checkComplete();
	
	function checkComplete(){
		if(requests == 0 && changed){
			alert("User " + (update ? "updated" : "created") + " " + (errors ? "with errors." : "successfully"));
			clearUserForm(rebuildTable);
		}
		else if(!changed){
			alert("No changes have been made yet.");
		}
	}
}

function modifyGroupMembership(method, group, username, next){
	var error = false;
	$.ajax({
		method:			method,
		url:			"/rest/v1/config/directories/" + group.directory + "/groups/" + group.name + "/users",
		data:			JSON.stringify({username: username}),
		contentType:	"application/json"
	})
	.fail(function(xhr, status, err){
		alert("Error " + ((method == "post") ? "adding the user to " : "removing the user from ") + "group '" + group.displayName + "'. Please check the system logs for more information.\nError message: " + err);
		error = true;
	})
	.always(function(){
		next(error);
	});
}

function modifyRoleMembership(method, role, username, next){
	var error = false;
	$.ajax({
		method:			method,
		url:			"/rest/v1/config/roles/" + role.roleId + "/users",
		data:			JSON.stringify({username: username}),
		contentType:	"application/json"
	})
	.fail(function(xhr, status, err){
		alert("Error " + ((method == "post") ? "adding the user to " : "removing the user from ") + "role '" + role.name + "'. Please check the system logs for more information.\nError message: " + err);
		error = true;
	})
	.always(function(){
		next(error);
	});
}

function cancelForm(next){
	var userConfigForm = document.getElementById("user-config");
	var userDetails = userConfigForm.userDetails;
	var groups = userConfigForm.groups || [];
	var roles = userConfigForm.roles || [];
	var changed = false;
	var cancel = true;
	
	if(userDetails == undefined){
		if($("#user-directory").val() != "" ||
			$("#user-username").val() != ""){
			changed = true;
		}
	}
	
	userDetails = userDetails || {};
	userDetails.fn = userDetails.fn || "";
	userDetails.ln = userDetails.ln || "";
	userDetails.email = userDetails.email || "";
	
	if($("#user-fn").val() != userDetails.fn ||
		$("#user-ln").val() != userDetails.ln ||
		$("#user-email").val() != userDetails.email){
		changed = true;
	}
	
	if($("#user-password").val() != ""){
		changed = true;
	}
	
	
	var groupsDifferences = $("#groups-list")[0].getDifferences(groups);
	changed = changed || (groupsDifferences.added.length + groupsDifferences.removed.length) > 0;
	
	var rolesDifferences = $("#roles-list")[0].getDifferences(roles);
	changed = changed || (rolesDifferences.added.length + rolesDifferences.removed.length) > 0;
	
	if(changed){
		cancel = confirm("You have made changes that will be lost if you cancel. Proceed?");
	}
	
	if(cancel){
		clearUserForm(next);
	}
}

function clearUserForm(next){
	$("#groups-list")[0].clear();
	$("#roles-list")[0].clear();
	$("#add-user").removeClass("hide");
	$("#user-config").addClass("hide");
	$("#user-directory").removeAttr("disabled");
	$("#user-username").removeAttr("disabled");
	$("#change-password").removeClass("hide");
	$("#pass-form").addClass("hide");
	$("[id^=user-]").val("");
	if(next){
		next();
	}
}

function getGroupRoles(group, remove){
	$.ajax({
		method:		"get",
		url:		"/rest/v1/auth/groups/" + group.name + "/roles",
		dataType:	"json"
	}).done(function(rolesResponse){
		for(var j=0;j<rolesResponse.length;j++){
			if(!remove){
				var option = $("#roles-list")[0].addOption(rolesResponse[j].roleId, true, true);
				var hoverText = option.getHoverText();
				if(option.getHoverText() != undefined){
					var groupsList = hoverText.substring(hoverText.indexOf("group(s): ") + ("groups(s): ").length);
					groupsList = groupsList.split(", ");
					groupsList.push(group.displayName);
					hoverText = "This role is attached because of the user's membership in the group(s): " + groupsList.join(", ");
				}
				else {
					hoverText = "This role is attached because of the user's membership in the group(s): " + group.displayName;
				}
				
				option.setHoverText(hoverText);
			}
			else {
				$("#roles-list")[0].removeOption({value: rolesResponse[j].roleId, text: rolesResponse[j].name}, true);
			}
		}
	});
}

function rebuildTable(){
	$.ajax({
		method:		"get",
		url:		"/rest/v1/config/users",
		dataType:	"json"
	}).done(function(response){
		var users = [];
		for(var dir in response){
			directories[dir].users = [];
			for(var i=0;i<response[dir].length;i++){
				var user = response[dir][i];
				directories[dir].users.push(user);
				user.directory = dir;
				users.push(user);
			}
		}
		
		dataTable.clear();
		dataTable.rows.add(users);
		dataTable.draw();
		
		clearUserForm();
	})
	.fail(function(xhr, status, err){
		alert("Error retrieving user information. Please consult the system logs for more info.\nError message: " + err);
	});
}