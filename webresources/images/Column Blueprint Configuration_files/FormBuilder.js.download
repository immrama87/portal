define("utils/FormBuilder", [], function(){
	var fb = {};
	
	fb.build = function(id, options){
		return new Form(id, options);
	}
	
	var Form = (function(id, options){
		var f = {};
		var fields = {};
		var lists = [];
		var originalData = {};
		var changed = false;
		options = options || {};
		
		f.setOptions = function(opts){
			options = opts || options;
		}
		
		f.setOption = function(opt, value){
			options[opt] = value;
		}
		
		f.onsubmit = function(submitFnc){
			options.submit = submitFnc;
		}
		
		f.generateFields = function(fieldConfigs){
			$("#" + id).html("");
			fields = {};
			for(var i=0;i<fieldConfigs.length;i++){
				$("#" + id).append(generateField(fieldConfigs[i]));
			}
		}
		
		f.readFieldsFromHTML = function(){
			fields = {};
			$("#" + id).find("div.input-group").each(function(index, el){
				if(!$(el).hasClass("ignore")){
					var input = $(el).find("*.input-field").first();
					var key;
					if(input[0].id){
						key = input[0].id;
					}
					
					$(input).on("change", function(evt){
						changed = true;
					});
					
					var label = $(el).find("div.input-label").first();
					if(key == undefined){
						key = $(label).text();
					}
					
					fields[key] = {};
					fields[key].input = input;
					fields[key].label = label;
					fields[key].config = {};
					fields[key].config.name = $(label).text();
					
					if($(label).hasClass("required")){
						fields[key].config.optional = false;
					}
					else {
						fields[key].config.optional = true;
					}
				}
			});
		}
		
		f.trackField = function(fieldId){
			var input = document.getElementById(fieldId);
			$(input).on("change", function(evt){
				changed = true;
			});
			
			fields[fieldId] = {};
			fields[fieldId].input = input;
		}
		
		f.trackListField = function(list){
			lists.push(list);
		}
		
		f.destroy = function(){
			$("#" + id).html("");
			fields = {};
			changed = false;
		}
		
		f.prepend = function(content){
			$(content).insertBefore($("#" + id).find("div.input-group").first());
		}
		
		f.append = function(content){
			$("#" + id).append(content);
		}
		
		f.setFieldValue = function(field, value, triggerChange){
			if(fields.hasOwnProperty(field)){
				if(fields[field].hasOwnProperty("input")){
					$(fields[field].input).val(value);
					if(triggerChange){
						$(fields[field].input).change();
					}
				}
			}
		}
		
		f.setOriginalData = function(data){
			for(var key in data){
				if(fields.hasOwnProperty(key)){
					if(fields[key].hasOwnProperty("input")){
						$(fields[key].input).val(data[key]);
					}
				}
			}
			
			originalData = data;
		}
		
		f.getOriginalData = function(){
			return originalData;
		}
		
		f.getFieldValue = function(field){
			var response = null;
			if(fields.hasOwnProperty(field)){
				if(fields[field].hasOwnProperty("input")){
					response = $(fields[field].input).val();
				}
			}
			
			return response;
		}
		
		f.setFieldRequired = function(field){
			if(fields.hasOwnProperty(field)){
				if(!fields[field].hasOwnProperty("config")){
					fields[field].config = {};
				}
				fields[field].config.optional = false;
				
				if(fields[field].hasOwnProperty("label")){
					$(fields[field].label).addClass("required");
				}
			}
		}
		
		f.setFieldOptional = function(field){
			if(fields.hasOwnProperty(field)){
				if(!fields[field].hasOwnProperty("config")){
					fields[field].config = {};
				}
				fields[field].config.optional = true;
				
				if(fields[field].hasOwnProperty("label")){
					$(fields[field].label).removeClass("required");
				}
			}
		}
		
		f.setFieldReadonly = function(field){
			if(fields.hasOwnProperty(field)){
				if(fields[field].hasOwnProperty("input")){
					$(fields[field].input).attr("disabled", true);
				}
			}
		}
		
		f.setFieldReadWrite = function(field){
			if(fields.hasOwnProperty(field)){
				if(fields[field].hasOwnProperty("input")){
					$(fields[field].input).removeAttr("disabled");
				}
			}
		}
		
		f.submit = function(){
			var fieldData = {};
			var listData = {};
			var missing = [];
			var warnings = [];
			
			if(changed){
				for(var field in fields){
					var value = $(fields[field].input).val() || "";
					if(fields[field].hasOwnProperty("config")){
						if(!fields[field].config.optional){
							if(value.trim() == ""){
								missing.push(fields[field].config.name);
								continue;
							}
						}
						if(fields[field].config.validate){
							var warning;
							switch(fields[field].config.validate){
								case "integer":
									if(!Number.isInteger(parseInt(value))){
										warning = "Value for field '" + fields[field].config.name + "' must be an integer value.";
									}
									break;
								default:
									if(typeof fields[field].config.validate == "string"){
										try{
											var re = new RegExp(fields[field].config.validate, "g");
											if(!re.test(value)){
												warning = "Value for field '" + fields[field].config.name + "' does not match the required format.\nFormat notes: " + fields[field].config.validate;
											}
										}
										catch(err){
											
										}
									}
									break;
							}
							
							if(warning){
								warnings.push(warning);
								continue;
							}
						}
						
					}
					if(value != ""){
						fieldData[field] = value;
					}
				}
			}
			else {
				fieldData = undefined;
			}
			
			for(var i=0;i<lists.length;i++){
				listData[lists[i].id] = lists[i].getDifferences();
				changed = changed || ((listData[lists[i].id].added.length + listData[lists[i].id].removed.length) > 0);
			}
			
			if(!changed){
				Blueprint.utils.Messaging.alert("No changes have been made yet.");
				return;
			}
			
			if(missing.length > 0){
				Blueprint.utils.Messaging.alert("The following required fields are not set:\n" + missing.join("\n"), true);
				return;
			}
			if(warnings.length > 0){
				Blueprint.utils.Messaging.alert("The following warnings were encountered when submitting:\n" + warnings.join("\n"), true);
				return;
			}
			
			if(typeof options.submit == "function"){
				options.submit(fieldData, listData);
			}
			else {
				changed = false;
			}
		}
		
		f.clearChangedState = function(){
			changed = false;
			for(var i=0;i<lists.length;i++){
				lists[i].setOriginalState();
			}
		}
		
		f.clear = function(next){
			for(var i=0;i<lists.length;i++){
				listData = lists[i].getDifferences();
				changed = changed || ((listData.added.length + listData.removed.length) > 0);
			}
			if(changed){
				Blueprint.utils.Messaging.confirm("Changes have been made that will be lost if you proceed. Continue?", function(conf){
					if(conf){
						clearForm(next);
					}
				});
			}
			else {
				clearForm(next);
			}
		}
		
		function clearForm(next){
			for(var field in fields){
				$(fields[field].input).val("");
			}
			for(var i=0;i<lists.length;i++){
				lists[i].clear();
			}
			originalData = {};
			
			changed = false;
			
			if(typeof next == "function"){
				next();
			}
		}
		
		function generateField(fieldConfig){
			var inputGroup = document.createElement("div");
			inputGroup.className = "input-group";
			
			var inputLabel = document.createElement("div");
			inputLabel.className = "input-label";
			if(!fieldConfig.optional){
				$(inputLabel).addClass("required");
			}
			$(inputLabel).text(fieldConfig.name);
			$(inputGroup).append(inputLabel);
			
			var input;
			if(fieldConfig.hasOwnProperty("options")){
				input = document.createElement("select");
				input.className = "input-field";
				$(input).append(document.createElement("option"));
				for(var i=0;i<fieldConfig.options.length;i++){
					var option = document.createElement("option");
					option.value = fieldConfig.options[i].value || fieldConfig.options[i];
					option.text = fieldConfig.options[i].text || fieldConfig.options[i];
					$(input).append(option);
				}
			}
			else if(fieldConfig.hasOwnProperty("rows")){
				input = document.createElement("textarea");
				input.className = "input-field " + fieldConfig.rows;
			}
			else {
				input = document.createElement("input");
				input.className = "input-field";
				if(!fieldConfig.type && !fieldConfig.validate){
					input.type = "text";
				}
				else if(fieldConfig.type){
					input.type = fieldConfig.type;
				}
				else if(fieldConfig.validate){
					switch(fieldConfig.validate){
						case "integer":
							input.type = "number";
							break;
						default:
							input.type = "text";
							break;
					}
				}
				
				if(fieldConfig.maximum){
					$(input).attr("max", fieldConfig.maximum);
				}
				if(fieldConfig.minimum){
					$(input).attr("min", fieldConfig.minimum);
				}
				if(fieldConfig.defaultValue){
					$(input).val(fieldConfig.defaultValue);
				}
				if(fieldConfig.locked){
					$(input).attr("disabled", true);
				}
			}
			$(input).on("change", function(evt){
				changed = true;
			});
			
			$(inputGroup).append(input);
			
			fields[fieldConfig.key] = {
				input: input,
				label: inputLabel,
				config: fieldConfig
			};
			
			return inputGroup;
		}
		
		return f;
	});
	
	return fb;
});