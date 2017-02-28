define("utils/Modals", [], function(){
	var ms = {};
	
	ms.createModal = function(base, opts){
		return new Modal(base, opts);
	}
	
	var Modal = (function(base, opts){
		var m = {};
		opts = opts || {};
		
		var baseUrl = "/modals" + ((base.charAt(0) == "/") ? "" : "/") + base + "/";
		var html, js, css;
		var params = {};
		var handlers = {};
		
		var background = document.createElement("div");
		background.className = "modal-background";
		
		var panel = document.createElement("div");
		panel.className = "modal-panel";
		
		if(opts.width){
			$(panel).css({width: opts.width, left: "calc((100% - " + opts.width + ") / 2)"});
		}
		if(opts.height){
			$(panel).css({height: opts.height, top: "calc((100% - " + opts.height + ") / 2)"});
		}
		
		$(background).append(panel);
		
		loadHTML();
		
		function loadHTML(){
			$.ajax({
				method:		"get",
				url:		baseUrl + base + ".html",
				dataType:	"text"
			})
			.done(function(response){
				html = document.createElement("section");
				$(html).html(response);
				$(html).find("param").each(function(index, el){
					params[el.id] = $(el).attr("value");
				}).remove();
				
				loadCSS();
				loadJS();
			})
			.fail(function(xhr, status, err){
				Blueprint.utils.Messaging.alert("Error loading modal '" + base + "'.", true, xhr.responseText);
			});
		}
		
		function loadCSS(){
			loadSubResource("css", function(data){
				css = data;
			}, loadSCSS);
		}
		
		function loadSCSS(){
			loadSubResource("scss", function(data){
				css = data;
			}, function(){
				css = "";
				checkComplete();
			});
		}
		
		function loadJS(){
			loadSubResource("js", function(data){
				js = data;
			}, function(){
				js = "(function(){})";
				checkComplete();
			});
		}
		
		function checkComplete(){
			if(css != undefined && js != undefined){
				$(html).append("<style type='text/css'>" + css + "</style>");
				$(html).append("<script type='application/javascript'>var modalController = " + js + ";</script>");
				$(panel).append(html);
				$(document.body).append(background);
				if(opts.closeButton){
					var closeButton = document.createElement("div");
					closeButton.className = "close";
					$(closeButton).text("X");
					$(closeButton).css({
						top:	$(panel).offset().top - 16,
						right:	$(panel).offset().left - 16
					});
					$(closeButton).on("click touch", function(){
						$(background).remove();
					});
					$(background).append(closeButton);
				}
				
				panel.emit = function(event, data){
					if(handlers.hasOwnProperty(event) && typeof handlers[event] == "function"){
						handlers[event](data, panel);
					}
				}
				
				panel.close = function(){
					$(background).remove();
				}
				
				modalController(panel, opts.data);
			}
		}
		
		function loadSubResource(ext, next, noParam){
			noParam = noParam || function(){}
			var param = "has" + ext.charAt(0).toUpperCase() + ext.substring(1);
			
			if(params[param] === "true"){
				$.ajax({
					method:		"get",
					url:		baseUrl + base + "." + ext,
					dataType:	((ext == "js") ? "script" : "text")
				})
				.done(function(response){
					next(response);
					checkComplete();
				})
				.fail(function(xhr, status, err){
					Blueprint.utils.Messaging.alert("Error loading " + ext + " resource for modal '" + base + "'.", true, xhr.responseText);
				});
			}
			else {
				noParam();
			}
		}
		
		m.on = function(event, handler){
			if(typeof handler == "function"){
				handlers[event] = handler;
			}
		}
		
		return m;
	});
	
	return ms;
});