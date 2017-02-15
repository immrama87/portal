Wizard.createSystemDependencies = function(){
	var loader = Wizard.generateLoader("dependency-loader", "Generating System Library Dependencies", [
		{
			text:	"Generating Stylesheet Dependencies",
			sub:	[
				{
					text:	"Generating Bootstrap Dependency",
					action:	generateBootstrapDep
				},
				{
					text:	"Generating FontAwesome Dependency",
					action: generateFADep
				},
				{
					text:	"Generating DataTables CSS Dependency",
					action: generateDTCSSDep
				}
			]
		},
		{
			text:	"Generating Javascript Dependencies",
			sub:	[
				{
					text:	"Generating jQuery Dependency",
					action:	generateJQDep
				},
				{
					text:	"Generating DataTables JS Dependency",
					action:	generateDTJSDep
				},
				{
					text:	"Generating Angular JS Dependency",
					action:	generateAngularDep
				},
				{
					text:	"Generating RequireJS Dependency",
					action:	generateRequireDep
				}
			]
		}
	]);
	
	loader.start();
	
	function generateBootstrapDep(){
		generateDependency("css", "Bootstrap", "https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css");
	}
	function generateFADep(){
		generateDependency("css", "FontAwesome", "https://maxcdn.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css");
	}
	function generateDTCSSDep(){
		generateDependency("css", "DataTables CSS", "https://cdn.datatables.net/1.10.13/css/jquery.dataTables.min.css");
	}
	function generateJQDep(){
		generateDependency("js", "jQuery", "https://code.jquery.com/jquery-3.1.1.min.js", "window.jQuery");
	}
	function generateDTJSDep(){
		generateDependency("js", "DataTables JS", "https://cdn.datatables.net/1.10.13/js/jquery.dataTables.min.js", "window.jQuery.prototype.DataTable");
	}
	function generateAngularDep(){
		generateDependency("js", "Angular JS", "https://cdnjs.cloudflare.com/ajax/libs/angular.js/1.6.1/angular.min.js", "window.angular");
	}
	function generateRequireDep(){
		generateDependency("js", "RequireJS", "https://cdnjs.cloudflare.com/ajax/libs/require.js/2.3.2/require.min.js", "window.requirejs");
	}
	
	function generateDependency(type, name, url, validation){
		var data = {
			type:		type,
			name:		name,
			url:		url,
			validation: validation
		};
		$.ajax({
			method:			"post",
			url:			"/rest/v1/config/wizard/dependencies",
			data:			JSON.stringify(data),
			contentType: 	"application/json"
		})
		.done(loader.next)
		.fail(handleFail);
	}
	
	function handleFail(xhr, status, err){
		Blueprint.utils.Messaging.alert("Error updating database configuration.", true, err);
		Wizard.previous();
	}
}