$('#file_upload').fileupload({
	dataType: 'json',
	done: function(e, data){
		var fileArray = $.parseJSON(data.result);
		$('#upl_results h2').removeClass('hidden');
		for (var i=0; i<fileArray.length; i++){
			$('<li>'+fileArray[i].originalname+'</li>').appendTo('#upl_results ol');
		}
		$('#progress .bar').removeClass('active');
		getDiskUsage();
		updateMusicFilesPreview();
	},
	progressall: function(e,data){
		var progress = parseInt(data.loaded / data.total * 100, 10);
		$('#progress .bar').css('width',progress + '%');
		$('#progress .bar').html(progress+'%');
		$('#progress .bar').addClass('active');
		$('#progress .bar').attr('aria-valuenow',progress);
	}
});
/* get disk usage data function */
var getDiskUsage = function(){
	$.get('/diskusage',function(data){
		var diskData = JSON.parse(data);
		$('#disk_usage .bar').css('width',diskData.availablePerc + '%');
		$('#disk_usage .bar').html(diskData.availableGB+' GB free');
		$('#disk_usage .bar').attr('aria-valuenow',diskData.availablePerc);
	});
};
/* get the songs on the server and display them */
var updateMusicFilesPreview = function(){
	$.get('/showMusic',function(data){
		var fileArray = $.parseJSON(data);
		$('#music_files').children('div').remove();
		for (var i=0; i<fileArray.length; i++){
			$("<div><h3>"+fileArray[i]+"</h3><div class='play_img'></div><div class='stop_img'></div><div class='delete_file'><button class='delete_button'>Delete</button></div></div>").appendTo('#music_files');
		}
	});
};