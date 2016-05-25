$(function(){
	/* get disk usage data function and display it */
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
	/* run it once on document ready */
	getDiskUsage();
	/* hide some elements */
	$('#music_player h2').addClass('hidden');
	$('#upl_results h2').addClass('hidden');
	$('#refresh_btn').addClass('hidden');
	/* scan for music button */
	$(document).on('click','#scan_for_music',function(){
		$('#music_player h2').removeClass('hidden');
		$('#refresh_btn').removeClass('hidden');
		updateMusicFilesPreview();
	});
	/* play button click */
	$(document).on('click','div.play_img',function(){
		var song_name = $(this).siblings('h3').text();
		var frequency = $('#freq').val();
		$('div.pause_img').addClass('play_img');
		$('div.play_img').removeClass('pause_img');
		$(this).toggleClass('play_img');
		$(this).toggleClass('pause_img');
		$.get('/play/'+song_name+'/'+frequency,function(data){
			
		});
	});
	/* stop button click */
	$(document).on('click','div.stop_img',function(){
		$('div.pause_img').addClass('play_img');
		$('div.play_img').removeClass('pause_img');
		$.get('/stop',function(data){
			
		});
	});
	/* mouse down and up change image code on play, stop and pause buttons */
	$(document).on('mousedown','div.play_img',function(){
		$(this).addClass('play_img_pressed');
	});
	$(document).on('mouseup','div.play_img',function(){
		$(this).removeClass('play_img_pressed');
	});
	$(document).on('mousedown','div.pause_img',function(){
		$(this).addClass('pause_img_pressed');
	});
	$(document).on('mouseup','div.pause_img',function(){
		$(this).removeClass('pause_img_pressed');
	});
	$(document).on('mousedown','div.stop_img',function(){
		$(this).addClass('stop_img_pressed');
	});
	$(document).on('mouseup','div.stop_img',function(){
		$(this).removeClass('stop_img_pressed');
	});
	/* delete button */
	$(document).on('click','button.delete_button',function(){
		var json_file_name = $(this).parent('.delete_file').siblings('h3').text();
		var clicked_element = $(this).parent('.delete_file').parent('div');
		$.ajax({
			url:'/delete',
			type:'POST',
			data: JSON.stringify({song_name: json_file_name}),
			contentType: 'application/json; charset=utf-8',
			dataType: 'json',
			async: true,
			success: function(msg){
				//alert(msg);
				/* update disk usage progress bar */
				getDiskUsage();
				clicked_element.remove();
			}
		});
	});
	/* refresh button */
	$(document).on('click','#refresh_btn',function(){
		$(this).rotate({duration:2000, angle:0, animateTo: -360});
		getDiskUsage();
		updateMusicFilesPreview();
	});
});