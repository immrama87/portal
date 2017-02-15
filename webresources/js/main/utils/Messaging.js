define("utils/Messaging", [], function(){
	var m = {};
	
	m.setInputErrorMessage = function(msg, id){
		var parent = $("#" + id).parent();
		if($(parent).find("div.error-message").length == 0){
			var error = document.createElement("div");
			error.className = "error-message";
			$(error).text(msg);
			$(parent).append(error);
		}
		else {
			$($(parent).find("div.error-message")).text(msg);
		}
	}
	
	m.clearInputErrorMessage = function(id){
		$("#" + id).parent().find("div.error-message").remove();
	}
	
	m.createInputInfoMessage = function(id){
		var parent = $("#" + id).parent();
		var info;
		if($(parent).find("div.info-message").length == 0){
			info = document.createElement("div");
			info.className = "info-message";
			$(parent).append(info);
		}
		else {
			info = $(parent).find("div.info-message")[0];
			$(info).html("");
		}
		
		return info;
	}
	
	m.clearInputInfoMessage = function(id){
		$("#" + id).parent().find("div.info-message").remove();
	}
	
	m.alert = function(msg, isErr, err){
		var modal = createMessageModal("OK");
		var content = document.createElement("div");
		content.className = "row";
		
		var infoCardSection = document.createElement("section");
		infoCardSection.className = "info-card col-xs-3";
		var icon = document.createElement("i");
		icon.className = "fa";
		if(isErr){
			$(icon).addClass("fa-exclamation-circle").addClass("error");
		}
		else {
			$(icon).addClass("fa-info-circle").addClass("info");
		}
		$(infoCardSection).append(icon);
		$(content).append(infoCardSection);
		
		var textSection = document.createElement("section");
		textSection.className = "text col-xs-9";
		
		if(err){
			msg += " Please check the system logs for more information.\nError message: " + err;
		}
		
		var span = document.createElement("span");
		$(span).html(msg.replace(/\n/g, "<br />").replace(/\t/g, "&nbsp;&nbsp;&nbsp;&nbsp;"));
		$(textSection).append(span);
		$(content).append(textSection);
		
		modal.setContent(content);
		
		modal.on("OK", modal.close);
		
		return modal;
	}
	
	m.confirm = function(msg, next){
		var modal = createMessageModal("OK|Cancel");
		var content = document.createElement("div");
		content.className = "row";
		
		var infoCardSection = document.createElement("section");
		infoCardSection.className = "info-card col-xs-3";
		var icon = document.createElement("i");
		icon.className = "fa fa-exclamation-triangle warning";
		$(infoCardSection).append(icon);
		$(content).append(infoCardSection);
		
		var textSection = document.createElement("section");
		textSection.className = "text col-xs-9";
		
		var span = document.createElement("span");
		$(span).html(msg.replace(/\n/g, "<br />"));
		$(textSection).append(span);
		$(content).append(textSection);
		
		modal.setContent(content);
		
		modal.on("OK", function(){
			modal.close();
			next(true);
		});
		
		modal.on("Cancel", function(){
			modal.close();
			next(false);
		});
	}
	
	function createMessageModal(btnType){
		var handlers = {};
		
		var background = document.createElement("div");
		background.className = "modal-background";
		
		var modal = document.createElement("div");
		modal.className = "modal-panel";
		$(background).append(modal);
		
		var modalContent = document.createElement("div");
		modalContent.className = "modal-details";
		$(modal).append(modalContent);
		
		var modalButtons = document.createElement("section");
		modalButtons.className = "modal-buttons-container";
		$(modal).append(modalButtons);
		
		var btns = btnType.split("|");
		for(var i=0;i<btns.length;i++){
			$(modalButtons).append(generateModalButton(btns[i]));
		}
		
		$(document.body).append(background);
		
		modal.setContent = function(html){
			$(modalContent).html(html);
		}
		
		modal.sendResponse = function(text){
			if(handlers.hasOwnProperty(text)){
				handlers[text]();
			}
		}
		
		modal.on = function(text, handler){
			if(typeof handler == "function"){
				handlers[text] = handler;
			}
			
			return modal;
		}
		
		modal.close = function(){
			$(background).remove();
		}
		
		return modal;
	}
	
	function generateModalButton(text){
		var button = document.createElement("button");
		button.className = "btn btn-secondary";
		$(button).text(text);
		
		$(button).on("click touch", function(evt){
			$(button).parents("div.modal-panel")[0].sendResponse(text);
		});
		
		return button;
	}
	
	return m;
});