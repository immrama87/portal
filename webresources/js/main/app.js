requirejs(["utils/AdditiveList", "utils/FileUpload"], function(AdditiveList, FileUpload){
	window.APP = {};
	window.APP.utils = {};
	window.APP.utils.AdditiveList = AdditiveList;
	window.APP.utils.FileUpload = FileUpload;
});