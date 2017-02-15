Blueprint.isWizard = true;

Blueprint.onready(function(){
	var steps = [];
	
	$(document.body).find("div.wizard-dialog").each(function(index, el){
		$(el).addClass("hide");
		steps.push(el);
	});
	
	Wizard.setSteps(steps);
	Wizard.start();
	
	$("#previous-arrow").on("click touch", function(evt){
		Wizard.previous();
	});
	
	$("#next-arrow").on("click touch", function(evt){
		Wizard.next(true);
	});
});

var Wizard = (function(){
	var w = {};
	
	var steps = [];
	var config = {};
	var currentStep;
	var furthestStep;
	
	w.setSteps = function(_steps){
		steps = _steps;
		for(var i=0;i<steps.length;i++){
			$("#wizard-progress").append(generateWizardProgressIndicator(i+1, steps.length));
		}
	}
	
	w.start = function(){
		currentStep = 0;
		$($("#wizard-progress").find("div.progress-indicator")[0]).removeClass("incomplete").addClass("in-progress");
		$(steps[currentStep]).removeClass("hide");
		triggerStep();
	}
	
	w.setupStart = function(){
		$("#setup-start").off("click touch");
		$("#setup-start").on("click touch", function(evt){
			w.next();
		});
	}
	
	w.userStart = function(){
		$("#user-start").off("click touch");
		$("#user-start").on("click touch", function(evt){
			w.next();
		});
	}
	
	w.serverStart = function(){
		$("#server-start").off("click touch");
		$("#server-start").on("click touch", function(evt){
			w.next();
		});
	}
	
	w.saveConfig = function(){
		$.ajax({
			method:		"post",
			url:		"/rest/v1/config/wizard/save"
		})
		.done(function(){
			$("#saving-config").html("<h2>That's it!</h2><p><i class='fa fa-thumbs-o-up massive'></i></p><p><strong>You've finished the configuration wizard!</strong></p><p>Now all that's left is restarting the application and building your new portal!</p>");
		})
		.fail(function(xhr, status, err){
			Blueprint.utils.Messaging.alert("An error occurred saving the configuration file.", true, err);
		});
	}
	
	w.next = function(hasVisited){
		$($("#wizard-progress").find("div.progress-indicator")[currentStep]).removeClass("in-progress").addClass("complete");
		$($("#wizard-progress").find("div.progress-indicator")[currentStep + 1]).removeClass("incomplete").addClass("in-progress");
		$(steps[currentStep+1]).removeClass("hide");
		var offset = $(steps[currentStep]).offset();
		$(steps[currentStep]).css({
			position:	"absolute",
			left:		offset.left
		}).animate({left: offset.left - window.innerWidth}, 400);
		$(steps[currentStep+1]).css({
			position:	"absolute",
			top:		0,
			left:		offset.left + window.innerWidth
		}).animate({left: offset.left}, 400, function(){
			
			$("#previous-arrow").removeClass("hide");
			$(steps[currentStep]).addClass("hide").removeAttr("style");
			$(steps[currentStep+1]).removeAttr("style");
			currentStep++;
			if(currentStep >= furthestStep){
				$("#next-arrow").addClass("hide");
			}
			if(!hasVisited){
				triggerStep();
				furthestStep = currentStep;
			}
		});
	}
	
	w.previous = function(){
		$($("#wizard-progress").find("div.progress-indicator")[currentStep]).removeClass("in-progress").addClass("incomplete");
		$($("#wizard-progress").find("div.progress-indicator")[currentStep - 1]).removeClass("complete").addClass("in-progress");
		$(steps[currentStep-1]).removeClass("hide");
		var offset = $(steps[currentStep]).offset();
		$(steps[currentStep]).css({
			position:	"absolute",
			left:		offset.left
		}).animate({left:offset.left + window.innerWidth}, 400);
		$(steps[currentStep-1]).css({
			position:	"absolute",
			left:		offset.left - window.innerWidth,
			top:		0
		}).animate({left: offset.left}, 400, function(){
			if(currentStep - 1 == 0){
				$("#previous-arrow").addClass("hide");
			}
			$("#next-arrow").removeClass("hide");
			$(steps[currentStep]).addClass("hide").removeAttr("style");
			$(steps[currentStep-1]).removeAttr("style");
			currentStep--;
			triggerStep();
		});
	}
	
	w.setConfig = function(key, value){
		config[key] = value;
	}
	
	w.getConfig = function(key){
		return config[key];
	}
	
	w.generateInput = function(inputDetails, prefix){
		var inputGroup = document.createElement("div");
		inputGroup.className = "input-group";
		
		var inputLabel = document.createElement("div");
		inputLabel.className = "input-label";
		if(!inputDetails.optional){
			$(inputLabel).addClass("required");
		}
		$(inputLabel).text(inputDetails.name);
		$(inputGroup).append(inputLabel);
		
		var input;
		if(!inputDetails.options){
			input = document.createElement("input");
		}
		else {
			input = document.createElement("select");
			$(input).append(document.createElement("option"));
			for(var i=0;i<inputDetails.options.length;i++){
				var option = document.createElement("option");
				option.text = inputDetails.options[i].text;
				option.value = inputDetails.options[i].value;
				$(input).append(option);
			}
		}
		
		if(inputDetails.validate){
			if(inputDetails.validate == "integer"){
				input.type = "number";
				$(input).on("change", function(evt){
					if(!Number.isInteger(parseInt($(input).val()))){
						Blueprint.utils.Messaging.alert("Value for " + inputDetails.name + " must be an integer.", true);
					}
				});
			}
			else {
				try{
					var re = new RegExp(inputDetails.validate);
					$(input).on("change", function(evt){
						if(re.match($(input).val()).length == 0){
							Blueprint.utils.Messaging.alert("Value for " + inputDetails.name + " does not match the provided criteria.\nPattern: " + inputDetails.validate, true);
						}
					});
				}
				catch(err){}
			}
		}
		
		input.className = "input-field";
		input.id = prefix + "-" + inputDetails.key;
		$(inputGroup).append(input);
		
		return inputGroup;
	}
	
	w.generateLoader = function(id, text, steps){
		var loader = document.getElementById(id);
		loader.className = "loader";
		$(loader).html("");
		
		var contentDiv = document.createElement("div");
		contentDiv.className = "content";
		var img = document.createElement("img");
		img.src = "/loading.gif"
		$(contentDiv).append(img);
		
		var textDiv = document.createElement("div");
		textDiv.className = "text";
		$(textDiv).text(text);
		$(contentDiv).append(textDiv);
		$(loader).append(contentDiv);
		
		var currentLoaderStep;
		var currentLoaderSubStep;
		
		loader.start = function(){
			currentLoaderStep = 0;
			currentLoaderSubStep = 0;
			triggerLoaderStep();
		}
		
		loader.next = function(){
			if(steps[currentLoaderStep].hasOwnProperty("sub")){
				$($(substepProgress).find("div.loader-step")[currentLoaderSubStep]).removeClass("incomplete").addClass("complete");
				currentLoaderSubStep++;
				if(currentLoaderSubStep >= steps[currentLoaderStep].sub.length){
					$($(stepProgress).find("div.loader-step")[currentLoaderStep]).removeClass("incomplete").addClass("complete");
					currentLoaderStep++;
					currentLoaderSubStep = 0;
				}
			}
			else {
				$($(stepProgress).find("div.loader-step")[currentLoaderStep]).removeClass("incomplete").addClass("complete");
				currentLoaderStep++;
				currentLoaderSubStep = 0;
			}
			
			if(currentLoaderStep >= steps.length){
				w.next();
			} else {
				triggerLoaderStep();
			}
		}
		
		loader.injectSubSteps = function(substeps){
			for(var i=0;i<substeps.length;i++){
				steps[currentLoaderStep].sub.splice(currentLoaderSubStep+i+1, 0, substeps[i]);
			}
			
			$(substepProgress).html("");
			for(var i=0;i<steps[currentLoaderStep].sub.length;i++){
				var step = document.createElement("div");
				step.className = "loader-step";
				if(i >= currentLoaderSubStep){
					$(step).addClass("incomplete");
				}
				else {
					$(step).addClass("complete");
				}
				$(step).css({width: (100/steps[currentLoaderStep].sub.length) + "%"});
				$(substepProgress).append(step);
			}
		}
		
		function triggerLoaderStep(){
			$(stepText).text(steps[currentLoaderStep].text);
			if(steps[currentLoaderStep].hasOwnProperty("action")){
				if(typeof steps[currentLoaderStep].action == "function"){
					steps[currentLoaderStep].action();
				}
			}
			else {
				$(substepPanel).removeClass("hide");
				$(substepText).text(steps[currentLoaderStep].sub[currentLoaderSubStep].text);
				if(currentLoaderSubStep == 0){
					$(substepProgress).html("");
					for(var i=0;i<steps[currentLoaderStep].sub.length;i++){
						var step = document.createElement("div");
						step.className = "loader-step incomplete";
						$(step).css({width: (100/steps[currentLoaderStep].sub.length) + "%"});
						$(substepProgress).append(step);
					}
				}
				if(steps[currentLoaderStep].sub[currentLoaderSubStep].hasOwnProperty("action")){
					steps[currentLoaderStep].sub[currentLoaderSubStep].action();
				}
			}
		}
		
		var stepPanel = document.createElement("div");
		stepPanel.className = "step-panel";
		
		var stepProgress = document.createElement("div");
		stepProgress.className = "step-progress";
		
		for(var i=0;i<steps.length;i++){
			var step = document.createElement("div");
			step.className = "loader-step incomplete";
			$(step).css({width: (100/steps.length) + "%"});
			$(stepProgress).append(step);
		}
		$(stepPanel).append(stepProgress);
		
		var stepText = document.createElement("div");
		stepText.className = "step-text";
		$(stepPanel).append(stepText);
		
		$(contentDiv).append(stepPanel);
		
		var substepPanel = document.createElement("div");
		substepPanel.className = "step-panel hide";
		
		var substepProgress = document.createElement("div");
		substepProgress.className = "step-progress";
		
		$(substepPanel).append(substepProgress);
		
		var substepText = document.createElement("div");
		substepText.className = "step-text";
		$(substepPanel).append(substepText);
		
		$(contentDiv).append(substepPanel);
			
		return loader;
	}
	
	function triggerStep(){
		if(w.hasOwnProperty($(steps[currentStep]).attr("wizard-trigger")) && typeof w[$(steps[currentStep]).attr("wizard-trigger")] == "function"){
			w[$(steps[currentStep]).attr("wizard-trigger")]();
		}
	}
	
	function buildTable(id, data, columns){
		$("#" + id).DataTable({
			data:		data,
			columns:	columns
		});
	}
	
	function generateWizardProgressIndicator(stepNum, total){
		var div = document.createElement("div");
		div.className = "progress-indicator incomplete";
		$(div).css("width", 100 / total + "%");
		
		var span = document.createElement("span");
		$(span).text(stepNum);
		$(div).append(span);
		return div;
	}
	
	return w;
})();