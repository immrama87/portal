var dataTable;
var directories = {};
var requests = 0;
var form;

$(function(){
	$("div.additive-list").each(function(index, el){
		Blueprint.utils.AdditiveList(el.id);
	});
	form = Blueprint.utils.FormBuilder.build("user-config-form");
	form.readFieldsFromHTML();
	form.trackListField($("#groups-list")[0]);
	form.trackListField($("#roles-list")[0]);
	form.onsubmit(function(data, lists){
		var requests = 0;
		var errors = false;
		if(data != undefined){
			if(data.password){
				if(data.password != data["pass-confirm"]){
					Blueprint.utils.Messaging.alert("The passwords provided do not match.", true);
					return;
				}
				else {
					delete data["pass-confirm"];
				}
			}
		
			$.ajax({
				method:			"post",
				url:			"/rest/v1/config/directories/" + data.directory + "/users/" + data.username,
				data:			JSON.stringify(data),
				contentType:	"application/json"
			})
			.done(updateLists)
			.fail(function(xhr, status, err){
				Blueprint.utils.Messaging.alert("An error occurred updating the user.", true, err);
				errors = true;
			});
		}
		else {
			updateLists();
		}
		
		function updateLists(){
			var username = $("#username").val();
			requests+=lists["groups-list"].added.length + lists["groups-list"].removed.length;
			requests+=lists["roles-list"].added.length + lists["roles-list"].removed.length;
			if(requests > 0){
				for(var i=0;i<lists["groups-list"].added.length;i++){
					modifyGroupMembership("post", lists["groups-list"].added[i], username, function(failed){
						errors = errors || failed;
						requests--;
						checkComplete();
					});
				}
				
				for(var j=0;j<lists["groups-list"].removed.length;j++){
					modifyGroupMembership("delete", lists["groups-list"].removed[j], username, function(failed){
						errors = errors || failed;
						requests--;
						checkComplete();
					});
				}
				
				for(var k=0;k<lists["roles-list"].added.length;k++){
					modifyRoleMembership("post", lists["roles-list"].added[k], username, function(failed){
						errors = errors || failed;
						requests--;
						checkComplete();
					});
				}
				
				for(var l=0;l<lists["roles-list"].removed.length;l++){
					modifyRoleMembership("delete", lists["roles-list"].removed[l], username, function(failed){
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
				Blueprint.utils.Messaging.alert("User created/modified " + (errors ? "with errors." : "successfully"));
				form.clearChangedState();
				form.clear(rebuildTable);
			}
		}
	});
	$("#add-user").on("click touch", function(evt){
		showUserForm();
	});
	
	$.ajax({
		method:		"get",
		url:		"/rest/v1/config/directories",
		dataType:	"json"
	})
	.done(function(response){
		var dirSelect = document.getElementById("directory");
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
		Blueprint.utils.Messaging.alert("Error retrieving user directories list.", true, err);
	});
	
	$("#user-details-submit").off("click touch");
	$("#user-details-submit").on("click touch", function(evt){
		form.submit();
	});
	
	$("#user-details-cancel").off("click touch");
	$("#user-details-cancel").on("click touch", function(evt){
		form.clear(clearUserForm);
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
		Blueprint.utils.Messaging.alert("Error retrieving users list.", true, err);
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
		Blueprint.utils.Messaging.alert("Error retrieving groups list.", true, err);
	});
}

function buildListObjects(){
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
		Blueprint.utils.Messaging.alert("Error retrieving roles list.", true, err);
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
				defaultContent: "<span class='delete fa fa-times'></span>",
				searchable:		false,
				orderable:		false,
				width:			"5%",
				createdCell:	function(cell, cellData, rowData, rowIndex, cellIndex){
					$(cell).find("span.delete").on("click touch", function(evt){
						evt.stopPropagation();
						Blueprint.utils.Messaging.confirm("Deleting a user cannot be undone. Proceed?", function(conf){
							if(conf){
								$.ajax({
									method:			"delete",
									url:			"/rest/v1/config/directories/" + rowData.directory + "/users/" + rowData.username
								})
								.done(function(response){
									Blueprint.utils.Messaging.alert("User successfully removed.");
									rebuildTable();
								})
								.fail(function(xhr, status, err){
									Blueprint.utils.Messaging.alert("Error removing user.", true, err);
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
		pagingType:		"first_last_numbers",
		rowCallback:	function(row, data, index){
			$(row).on("click touch", function(evt){
				form.clear(function(){
					$("#users").find("tr.selected").removeClass("selected");
					$(row).addClass("selected");
					showUserForm(data);
				});
			});
		}
	});
	Blueprint.modules.activeModule().ready();
}

function showUserForm(userDetails){
	$("#groups-list")[0].clear();
	$("#roles-list")[0].clear();
	$("#add-user").addClass("hide");
	var userConfigForm = document.getElementById("user-config");
	userConfigForm.userDetails = userDetails;
	$(userConfigForm).removeClass("hide");
	$("#directory").removeAttr("disabled");
	$("#username").removeAttr("disabled");
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
			$("#directory").val(userDetails.directory).attr("disabled", true);
			$("#username").attr("disabled", true);
			for(var key in response){
				userConfigForm.userDetails[key] = response[key];
				form.setFieldValue(key, response[key]);
			}
			
			$.ajax({
				method:		"get",
				url:		"/rest/v1/config/users/" + userDetails.username + "/groups",
				dataType:	"json"
			}).done(function(groupsResponse){
				$("#groups-list")[0].clearOriginalOptions();
				for(var dir in groupsResponse){
					for(var i=0;i<groupsResponse[dir].length;i++){
						$("#groups-list")[0].addOption(groupsResponse[dir][i].name);
						$("#groups-list")[0].addOriginalOption(groupsResponse[dir][i].name);
					}
				}
			});
			
			$.ajax({
				method:		"get",
				url:		"/rest/v1/config/users/" + userDetails.username + "/roles",
				dataType:	"json"
			}).done(function(rolesResponse){
				for(var i=0;i<rolesResponse.length;i++){
					$("#roles-list")[0].addOption(rolesResponse[i].roleId);
					$("#roles-list")[0].addOriginalOption(rolesResponse[i].roleId);
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
		Blueprint.utils.Messaging.alert("Error " + ((method == "post") ? "adding the user to " : "removing the user from ") + "group '" + group.displayName + "'.", true, err);
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
		Blueprint.utils.Messaging.alert("Error " + ((method == "post") ? "adding the user to " : "removing the user from ") + "role '" + role.name + "'.", true, err);
		error = true;
	})
	.always(function(){
		next(error);
	});
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
		url:		"/rest/v1/config/groups/" + group.name + "/roles",
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
		Blueprint.utils.Messaging.alert("Error retrieving user information.", true, err);
	});
}

Blueprint.modules.activeModule().setData = function(data){
	if(data.length == 1){
		$.ajax({
			method:		"get",
			url:		"/rest/v1/config/users/" + data[0],
			dataType:	"json"
		})
		.done(function(response){
			showUserForm(response);
		});
	}
	else {
		$.ajax({
			method:		"get",
			url:		"/rest/v1/config/directories/" + data[0] + "/users/" + data[1],
			dataType:	"json"
		})
		.done(function(response){
			response.directory = data[0];
			showUserForm(response);
		});
	}
}

Blueprint.modules.activeModule().destroy = function(next){
	form.clear(function(){
		delete dataTable;
		delete directories;
		delete requests;
		delete form;
		delete retrieveUsers;
		delete retrieveGroups;
		delete buildListObjects;
		delete buildTable;
		delete showUserForm;
		delete modifyGroupMembership;
		delete modifyRoleMembership;
		delete clearUserForm;
		delete getGroupRoles;
		delete rebuildTable;
		
		next();
	});
}