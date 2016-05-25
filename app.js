var express = require('express');
var multer = require('multer');
var bodyParser = require('body-parser');
var path = require('path');
var jsonfile = require('jsonfile');
var fs = require('fs');
var sys = require('sys');
var exec = require('child_process').exec;
var execSync = require('child_process').execSync;
var sleep = require('sleep');
var disk = require('diskusage');
var path = require('path');
var dblite = require('dblite');
db = dblite('dainarmusicdb.sqlite');

/* var frequency default first time */
var FMFREQ;
/* var for continuous playing */
var PLAYCONT = false;
/* array that containts all the songs of the current list to play */
var SONGLIST;
/* var to hold the index of the current song playing of the SONGLIST */
var SONGINDEX;
/* var that holds the state of song player */
var PLAYING_SONG_NOW = false;
/* var to hold if stop button got pressed */
var STOP_PRESSED = false;

/* creating the table for storing the playlists and songs */
db.query('CREATE TABLE IF NOT EXISTS playlists (playlist TEXT, song TEXT)');
/* creating the table to store the frequency and other possible settings */
db.query('CREATE TABLE IF NOT EXISTS settings (setting_name TEXT DEFAULT "freq", setting_value TEXT DEFAULT "90.0")');
/* setting default values to setting db */
db.query('SELECT setting_value FROM settings WHERE setting_name = ?', ['freq'],function(err, rows){
	if (rows.length == 0){
		db.query('INSERT INTO settings VALUES(?,?)',['freq','90.0']);
	}
});

var app = new express();
app.use(bodyParser.json());

app.use(express.static(__dirname + '/views'));

//view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

//route for GET request on root
app.get('/', function(req,res){
	res.render('index');
});
// get status of device
app.get('/status', function(req,res){
	var response = {'status':'ok'};
	res.json(response);
	res.status(204).end();
});

//route to get the disk usage
app.get('/diskusage',function(req,res){
	var diskUsage,available,total,diskData;
	disk.check('/',function(err, info){
		if (err){
			console.log(err);
			res.status(500).end();
		}
		/* npm diskusage has 7% divergence from the real disk data so i substract */
		available = (info.available / 1000000000);
		total = (info.total / 1000000000);
		available = (available - (available * 0.07)).toFixed(2);
		total = (total - (total * 0.07)).toFixed(2);
		/* percentages */
		available_percentage = ((available / total) * 100).toFixed(2);
		diskUsage = String(available) + ' GB free out of ' + String(total) + ' GB total.';
		diskData = {availableGB: available, totalGB: total, availablePerc: available_percentage, text: diskUsage};
	});
	res.json(JSON.stringify(diskData));
	res.status(204).end();
});

//route for list the music files 
app.get('/showMusic', function(req,res){
	var jsonFiles;
	fs.readdir('./meta', function(err,list){
		if(err){
			res.status(500).end();
		}
		jsonFiles = JSON.stringify(list);
		res.json(jsonFiles);
		res.status(204).end();
	});
});

//route to get the settings
app.get('/settings',function(req, res, next){
	db.query('SELECT * FROM settings',function(err,rows){
		res.json(JSON.stringify(rows));
		res.status(204).end();
	});
});

//route for update the settings table
app.post('/settings/',function(req, res, next){
	var settings = req.body;
	var keys = Object.keys(settings);
	for (var i=0;i<keys.length;i++){
		db.query('UPDATE settings SET setting_value = ? WHERE setting_name = ?',[settings[keys[i]],keys[i]]);
	}
	res.status(204).end();
});

//route for play song
app.get('/play/:song_name/:play_type', function(req, res, next){
	var song_name = req.params.song_name;
	var json_song_file;
	var json_song_object;
	var play_type = req.params.play_type;
	//getting the frequency setting from the db
	db.query('SELECT setting_value FROM settings WHERE setting_name = ?', ['freq'],function(err,rows){
		FMFREQ = rows[0][0];
		// stopping pifm if it is on
		if (PLAYING_SONG_NOW){
			STOP_PRESSED = true;
			PLAYING_SONG_NOW = false;
		}else{
			STOP_PRESSED = false;	
		}
		try{
			execSync('pkill -9 sox');
		}catch(ex){
			//ignore
		}
		/* fill the list of songs to play, from the one chosen to the end */
		if (play_type == 'play_songlist' || SONGLIST.length == 0){
			SONGLIST = fs.readdirSync('./meta');
		}
		SONGINDEX = SONGLIST.indexOf(song_name);
		STOP_PRESSED = false;
		PLAYING_SONG_NOW = false;
		playsonglist(SONGLIST);
	});
    	
	res.status(204).end();
});

// route for disabling the freq lock
app.get('/freq_release', function(req, res, next){
	if (PLAYING_SONG_NOW){
		STOP_PRESSED = true;
		PLAYING_SONG_NOW = false;
	}else{
		STOP_PRESSED = false;	
	}
	try{
		execSync('pkill -9 sox');
	}catch(ex){
		//ignore
	}
	json_song_file = './meta/'+SONGLIST[SONGINDEX];
	json_song_object = jsonfile.readFileSync(json_song_file);
	exec('/home/pi/Dainar_Music/DainarMusicServer/pifm/pifmplay /home/pi/Dainar_Music/DainarMusicServer/uploads/'+json_song_object.filename+'.mp3 70.0');
	try{
		execSync('pkill -9 sox');
	}catch(ex){
		//ignore
	}
	res.status(204).end();
});

// route for next song
app.get('/play/next', function(req, res, next){
	STOP_PRESSED = false;
	console.log('next song pressed. songlist lenght: ' + SONGLIST.length + ' and song index: ' + SONGINDEX);
	if (PLAYING_SONG_NOW && SONGLIST.length > SONGINDEX){
		STOP_PRESSED = false;
	}
	//stopping pifm if it is on
	try{
		execSync('pkill -9 sox');
	}catch(ex){
		//ignore
	}
	res.status(204).end();
});

// route for previous song
app.get('/play/previous', function(req, res, next){
	STOP_PRESSED = false;
	console.log('previous song pressed. songlist lenght: ' + SONGLIST.length + ' and song index: ' + SONGINDEX);
	if (SONGINDEX > 0 && PLAYING_SONG_NOW){
		SONGINDEX = SONGINDEX - 2;
	}
	//stopping pifm if it is on
	try{
		execSync('pkill -9 sox');
	}catch(ex){
		//ignore
	}
	res.status(204).end();
});

//route for stop song
app.get('/stop', function(req, res, next){
	/* execute the pifmplay command in order to stop broadcast /home/pi/Desktop/DainarMusic/pifm/pifmplay stop*/
	if (PLAYING_SONG_NOW){
		STOP_PRESSED = true;
		PLAYING_SONG_NOW = false;
	}else{
		STOP_PRESSED = false;	
	}
	try{
		execSync('pkill -9 sox');
	}catch(ex){
		//ignore
	}
	res.status(204).end();
});

//route for upload POST request on '/'
app.post('/', multer({ dest: './uploads/', fileFilter: function(req,file,cb){
		var jsonFiles = fs.readdirSync('./meta');
		if (path.extname(file.originalname) !== '.mp3'){
			return cb(new Error('Only mp3 files allowed'));
		}else if (jsonFiles.indexOf(file.originalname+'.json') > -1){
			return cb(null,false);
		}else{
			return cb(null,true);
		}
	}}).array('upl'), function(req,res){
	var originalname;
	var file;
	for (var i = 0, len = req.files.length; i < len; i++){
		/* add the .mp3 extension if it is mp3 */
		if (req.files[i].mimetype == 'audio/mp3'){
			fs.rename('./uploads/'+req.files[i].filename, './uploads/'+req.files[i].filename+'.mp3', function(err){
				console.log(err);
			});
			originalname = req.files[i].originalname;
			file = './meta/' + originalname + '.json';
			/*console.log(req.body);*/
			/*console.log(req.file);*/
			jsonfile.writeFile(file, req.files[i], function(err){
				console.error(err);
			});
		}else{
			console.log('Not an .mp3 file!!');
		}
	}
	res.json(JSON.stringify(req.files));
	res.status(204).end();		
});

app.post('/delete',function(req, res){
	var json_song_file = './meta/'+req.body.song_name;
	var json_song_object = jsonfile.readFileSync(json_song_file);
	/* first delete the mp3 file and then the json data file */
	fs.unlink('./uploads/'+json_song_object.filename+'.mp3', function(err){
		if (err){
			console.log(err);
			res.status(500).end();
		}
		/* if music file deleted successfully then delete the jsonfile too */
		fs.unlink(json_song_file, function(err){
			if (err){
				console.log(err);
				res.status(500).end();
			}
		});
	});
	db.query('DELETE FROM playlists WHERE song = ?', [req.body.song_name]);
	
	res.status(204).end();
});

/* get songs of given playlist */
app.get('/playlist/:playlist',function(req, res){
	var playlist = req.params.playlist;
	var song_list = [];
	db.query('SELECT song FROM playlists WHERE playlist = ?', [playlist], function(err, rows) {
		for (var i = 0; i < rows.length; i++) { 
    		song_list.push(rows[i][0]);
    	}
    	SONGLIST = song_list;
		res.json(song_list);
		res.status(204).end();
  	});
});

/* get all playlists */
app.get('/playlist',function(req, res){
	var all_playlists = [];
	db.query('SELECT DISTINCT playlist FROM playlists', function(err, rows) {
		for (var i = 0; i < rows.length; i++) {
    		all_playlists.push(rows[i]);
    	}
		res.json(all_playlists);
		res.status(204).end();
  	});
});

/* add song to playlist and playlist if doesnt exists */
app.post('/playlist',function(req, res){
	var playlist = req.body.playlist;
	var song = req.body.song;
	if (playlist != '' && song != ''){
		db.query('SELECT song FROM playlists WHERE playlist = ? AND song = ?', [playlist, song], function(err, rows){
			if (rows.length > 0){
				res.json('{"result":"error", "message": "Song already in playlist"}');
			}else{
				res.json('{"result":"success", "message": "Song added to playlist"}');
				db.query('INSERT INTO playlists VALUES(?, ?)', [playlist, song]);
			}
			res.status(204).end();
		});
	}else if (playlist == ''){
		res.json('{"result":"error", "message": "Playlist name missing"}');
		res.status(204).end();
	}
});

/* delete a playlist */
app.post('/playlist/delete',function(req, res){
	var playlist = req.body.playlist;
	db.query('DELETE FROM playlists WHERE playlist = ?', [playlist]);
	res.status(204).end();
});

//start listening
var port = 3000;
app.listen(port, function(){
	console.log('listening on port ' + port);
});

//async function
function playsonglist(songlist){
	PLAYING_SONG_NOW=false;
	if (STOP_PRESSED){
		return null;
	}
	// execute the pifmplay command in order to broadcast 
	if (!PLAYING_SONG_NOW){
		json_song_file = './meta/'+songlist[SONGINDEX];
		json_song_object = jsonfile.readFileSync(json_song_file);
		PLAYING_SONG_NOW = true;
		exec('/home/pi/Dainar_Music/DainarMusicServer/pifm/pifmplay /home/pi/Dainar_Music/DainarMusicServer/uploads/'+json_song_object.filename+'.mp3 '+FMFREQ,function(err,out,code){
			if (err !== null){
				console.log('ERROR: '+err);
	 			return null;
	 		}
			if (STOP_PRESSED){
				return null;
			}
			try{
				execSync('pkill -9 sox');
			}catch(ex){
				//ignore
			}
			PLAYING_SONG_NOW=false;
			console.log('stopping song '+SONGINDEX+' now');
			if (songlist.length > SONGINDEX+1){
				console.log('calling playsonglist recursivly with song index: ' + SONGINDEX);
				SONGINDEX += 1;
				playsonglist(songlist);
			}else if(songlist.length == SONGINDEX+1){
				PLAYING_SONG_NOW=false;
				return;
			}
		});
	}
}