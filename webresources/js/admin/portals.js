var form;

$(function(){
	Blueprint.utils.AdditiveList("authorized-groups");
	form = Blueprint.utils.FormBuilder.build("portal-details");
	form.readFieldsFromHTML();
	form.trackListField($("#authorized-groups")[0]);
	form.onsubmit(function(data, lists){
		if(data.portal_id == undefined){
			data.portal_id = data.name.replace(/\s/g, "_").toLowerCase();
		}
		
		$.ajax({
			method:			"post",
			url:			"/rest/v1/admin/portals",
			data:			JSON.stringify(data),
			contentType:	"application/json"
		})
		.done(function(){
			var addedGroups = [];
			for(var i=0;i<lists["authorized-groups"].added.length;i++){
				addedGroups.push(lists["authorized-groups"].added[i].value);
			}
			$.ajax({
				method:			"post",
				url:			"/rest/v1/admin/portals/" + data.portal_id + "/groups",
				data:			JSON.stringify({groups: addedGroups.join(",")}),
				contentType:	"application/json"
			})
			.done(function(){
				var removedGroups = [];
				for(var i=0;i<lists["authorized-groups"].removed.length;i++){
					removedGroups.push(lists["authorized-groups"].removed[i].value);
				}
				
				$.ajax({
					method:			"delete",
					url:			"/rest/v1/admin/portals/" + data.portal_id + "/groups",
					data:			JSON.stringify({groups: removedGroups.join(",")}),
					contentType:	"application/json"
				})
				.always(function(){
					Blueprint.utils.Messaging.alert("Portal details saved successfully.");
					form.setOriginalData(data);
					$("#authorized-groups")[0].setOriginalState();
				})
			});
		})
		.fail(function(xhr, status, err){
			Blueprint.utils.Messaging.alert("Error saving portal configuration.", true, xhr.responseText);
		});
	});
	
	$("#portal-submit").on("click touch", function(evt){
		form.submit();
	});
	
	$("#color_scheme_id").on("change", function(evt){
		if($("#color_scheme_id").val() != ""){
			swapColorSchemeGroup();
		}
	});
	
	loadGroupsList();
});

function loadGroupsList(){
	$.ajax({
		method:		"get",
		url:		"/rest/v1/admin/config/groups",
		dataType:	"json"
	})
	.done(function(response){
		var groups = [];
		for(var dir in response){
			for(var i=0;i<response[dir].length;i++){
				groups.push(response[dir][i]);
			}
		}
		
		$("#authorized-groups")[0].setListOptions(groups);
		loadColorSchemesList();
	})
	.fail(function(xhr, status, err){
		Blueprint.utils.Messaging.alert("An error occurred retrieving the configured groups.", true, xhr.responseText);
	});
}

function loadColorSchemesList(){
	$.ajax({
		method:		"get",
		url:		"/rest/v1/admin/color-schemes",
		dataType:	"json"
	})
	.done(function(response){
		$("#color_scheme_id").html(document.createElement("option"));
		for(var i=0;i<response.length;i++){
			var option = document.createElement("option");
			option.value = response[i].scheme_id;
			option.text = response[i].name;
			$("#color_scheme_id").append(option);
		}
		
		Blueprint.modules.activeModule().ready();
	});
}

function generateScreensList(screens){
	for(var i=0;i<screens.length;i++){
		$("#portal-screens").append(generateScreenItem(screens[i]));
	}
}

function generateScreenItem(screen){
	var item = document.createElement("div");
	item.className="portal-screen";
	
	var screenInfo = document.createElement("span");
	screenInfo.className = "info";
	
	var icon = document.createElement("i");
	icon.className = "fa";
	
	switch(screen.type){
		case "navigation":
			$(icon).addClass("fa-columns");
			break;
		case "data-input":
			$(icon).addClass("fa-tasks");
			break;
		case "data-view":
			$(icon).addClass("fa-eye");
			break;
	}
	$(screenInfo).append(icon);
	var name = document.createElement("span");
	$(name).text(screen.name);
	$(screenInfo).append(name);
	$(item).append(screenInfo);
	
	return item;
}

function swapColorSchemeGroup(){
	$("#color-scheme-group").toggleClass("input-group").toggleClass("detail-group");
	$("#color-scheme-group").find("[class*='-label']").toggleClass("input-label").toggleClass("detail-label");
	$("#color-scheme-group").find("*.input-field").toggleClass("hide");
	$("#color-scheme-group").find("*.detail-value").toggleClass("hide");
	
	if(!($("#color-scheme-group").find("*.detail-value").hasClass("hide"))){
		var optionText = document.getElementById("color_scheme_id").options[document.getElementById("color_scheme_id").selectedIndex].text;
		var button = document.createElement("button");
		button.className = "btn btn-link";
		$(button).text(optionText);
		$(button).on("click touch", function(evt){
			Blueprint.modules.triggerModule("/admin/color-schemes/" + $("#color_scheme_id").val());
		});
		$("#color-scheme-group").find("*.detail-value").html(button);
		
		var changeBtn = document.createElement("button");
		changeBtn.className = "btn btn-link edit";
		$(changeBtn).text("Change...");
		$(changeBtn).on("click touch", function(evt){
			swapColorSchemeGroup();
		});
		$("#color-scheme-group").find("*.detail-value").append(changeBtn);
	}
}

Blueprint.modules.activeModule().setData = function(data){
	$("#portal-delete").removeClass("hide");
	$.ajax({
		method:		"get",
		url:		"/rest/v1/admin/portals/" + data[0],
		dataType:	"json"
	})
	.done(function(response){		
		form.setOriginalData(response);
		swapColorSchemeGroup();
	});
	
	$.ajax({
		method:		"get",
		url:		"/rest/v1/admin/portals/" + data[0] + "/groups",
		dataType:	"json"
	})
	.done(function(response){
		for(var i=0;i<response.groups.length;i++){
			$("#authorized-groups")[0].addOption(response.groups[i]);
		}
		$("#authorized-groups")[0].setOriginalState();
	});
	
	$.ajax({
		method:		"get",
		url:		"/rest/v1/admin/portals/" + data[0] + "/screens",
		dataType:	"json"
	})
	.done(function(response){
		generateScreensList(response);
	});
}

Blueprint.modules.activeModule().destroy = function(next){
	form.clear(function(){
		delete form;
		delete loadGroupsList;
	
		next();
	});
}