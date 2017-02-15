define("utils/FileUpload", function(){
	var FileUpload = (function(id){
		var el = document.getElementById(id);
		var btn = document.createElement("button");
		btn.className = "btn btn-primary file-button";
		var icon = document.createElement("i");
		icon.className = "fa fa-upload";
		
		$(btn).html(icon);
		$(btn).append("<span> Upload File</span>");
		$(btn).insertBefore(el);
		$(el).hide();
		
		$(btn).on("click", function(evt){
			evt.preventDefault();
			$(el).click();
		});
		
		$(el).on("change", function(evt){
			var file = el.files[0].name;
			var span = document.createElement("span");
			span.className = "file-name";
			$(span).text(file).insertBefore(btn);
			
			var clear = document.createElement("button");
			clear.className = "btn btn-default file-button";
			var clearIcon = document.createElement("i");
			clearIcon.className = "fa fa-trash";
			$(clear).html(clearIcon);
			$(clear).append("<span> Remove File</span>");
			$(clear).insertAfter(btn);
			
			$(clear).on("click", function(evt){
				$(el).val("");
				$(span).remove();
				$(clear).remove();
			});
		});
	});
	
	return FileUpload;
});