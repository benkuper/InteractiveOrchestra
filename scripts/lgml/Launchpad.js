
/* ********** GENERAL SCRIPTING **********************

		This templates shows what you can do in this is module script
		All the code outside functions will be executed each time this script is loaded, meaning at file load, when hitting the "reload" button or when saving this file
*/

var ROWS = 9;
var COLUMNS = 9;

var NUM_LOOPERS = 5;
var LOOPER_TRACKS = 8;

var NUM_MICS = 3;

var PIANO_VSTS = 5;

var CMD_HEADER = [0, 32, 41, 2, 12];
var CMD_PRG_LIVE_MODE = 14;
var CMD_LED_COLOR = 3;

var LIGHT_TYPE_RGB = 3;

var IDLE = 0;
var WILL_RECORD = 1;
var RECORDING = 2;
var RETRO_REC = 3;
var FINISH_REC = 4;
var PLAYING = 5;
var WILL_STOP = 6;
var STOPPED = 7;
var WILL_PLAY = 8;

var pressTimes = [];
var longPressed = [];

var padColors = [];
for (var i = 0; i < ROWS; i++) {
	pressTimes[i] = [];
	longPressed[i] = [];
	padColors[i] = [];

	for (var j = 0; j < COLUMNS; j++) {
		pressTimes[i][j] = -1;
		longPressed[i][j] = false;
		padColors[i][j] = [0, 0, 0];
	}
}

var looperColors = [
	[0, 0, 1],
	[1, 1, 0],
	[1, 0, 0],
	[0, 1, 0],
	[1, 0, 1],
];

var white = [1, 1, 1];

function addNodeTargetParam(name) {

	var p = script.addTargetParameter(name, "");
	p.setAttribute("targetType", "container");
	p.setAttribute("root", root.nodes);
	p.setAttribute("searchLevel", 0);
	return p;
}


var lowBrightness = script.addFloatParameter("Low Brightness", "", .1, 0, 1);
var highBrightness = script.addFloatParameter("High Brightness", "", 1, 0, 1);
var longPressTime = script.addFloatParameter("Long Press Time", "", .2, 0, 1);

var loopers = [];
for (var i = 0; i < NUM_LOOPERS; i++) loopers[i] = addNodeTargetParam("Looper " + i);
var quantizLoopers = [true, true, true, true, true];

var quantizMode = true;

var pianoVST = [];
for (var i = 0; i < PIANO_VSTS; i++) pianoVST[i] = addNodeTargetParam("Piano VST " + i);

var guitarVST = addNodeTargetParam("Guitar VST");
var clarinetVST = addNodeTargetParam("Clarinet VST");
var clarinetVST2 = addNodeTargetParam("Clarinet VST2");
var drumVST = addNodeTargetParam("Drum VST");
var drum2VST = addNodeTargetParam("Drum2 VST");
var seaboardVST = addNodeTargetParam("Seaboard VST");
var voiceVST = addNodeTargetParam("Voice VST");
var recorderNode = addNodeTargetParam("Recorder");

var singleVSTS = [guitarVST, clarinetVST, clarinetVST2, drumVST, drum2VST, seaboardVST, voiceVST];
var singleVSTColorsIndices = [0, 1, 1, 2, 2, 3, 4];


var audioIn = addNodeTargetParam("Audio In");


function init() {
	script.setUpdateRate((5));
	initLaunchpad();

}



/*
 This function, if you declare it, will launch a timer at 50hz, calling this method on each tick
*/

function update(deltaTime) {
	var time = util.getTime();

	for (var i = 0; i < ROWS; i++) {
		for (var j = 0; j < COLUMNS; j++) {
			var pt = pressTimes[i][j];
			if (pt != -1 && !longPressed[i][j]) {
				if (time - pt > longPressTime.get()) {
					onLongPress(i, j);
					longPressed[i][j] = true;
				}

			}
		}
	}

	updateColors();
}


// Interaction events

function onPress(row, column) {
	pressTimes[row][column] = util.getTime();

	if (isTrack(row, column)) {
		var trackIndex = row - 1;
		var t = getTrack(trackIndex, column);
		if (t != null) {
			var s = t.state.get();

			if (s == IDLE || s == WILL_RECORD || s == RECORDING || s == FINISH_REC) {
				t.record.trigger();
			}
			else if (s == PLAYING) {
				t.stop.trigger();
			} else if (s == STOPPED || s == WILL_STOP) {
				t.play.trigger();
			}
		}
	} else {
		if (row == 0 && column == 3) {
			root.transport.togglePlay.trigger();
		} else if (row >= 1 && row <= NUM_LOOPERS && column == 8) {
			var looper = getLooperOnPad(row);
			if (isOneTrackPlaying(row - 1)) looper.controls.tempMuteAll.trigger();
			else looper.controls.playAll.trigger();
		} else if (row == 8 && column < PIANO_VSTS) {
			for (var i = 0; i < PIANO_VSTS; i++) {
				var vst = pianoVST[i].getTarget();
				if (vst != null) vst.enabled.set(i == column);
			}
		} else if (row == 7 && column < singleVSTS.length) {
			var vst = singleVSTS[column].getTarget();
			vst.enabled.set(!vst.enabled.get());
		} else if (row == 6 && column == 7) {
			setQuantizMode(!quantizMode);
		} else if (row == 0 && column == 7) {
			var r = recorderNode.getTarget();
			if(r != null) r.rec.trigger();
		} else if (row == 0 && column < NUM_MICS) {
			var a = audioIn.getTarget();
			if(a != null)
			{
				var micActive = a.channels.getChild(column + 1).active;
				micActive.set(!micActive.get());
			}
		}
	}


	updatePadColor(row, column);
}

function onRelease(row, column) {

	pressTimes[row][column] = -1;
	longPressed[row][column] = false;

	updatePadColor(row, column);
}

function onLongPress(row, column) {
	if (isTrack(row, column)) {
		var trackIndex = row - 1;
		var t = getTrack(row - 1, column);
		t.clear.trigger();
	} else {
		if (row == 8 && column == 8) {
			//root.nodes.clearAllLoopers.trigger();
			for (var i = 0; i < NUM_LOOPERS; i++) {
				var looper = getLooper(i);
				if (looper != null) looper.controls.clearAll.trigger();
			}
		}
	}
}

function isPadPressed(row, column) {
	return pressTimes[row][column] != -1;
}

//MIDI Events

function noteOnEvent(channel, pitch, velocity) {
	//script.log("Note on received "+channel+", "+pitch+", "+velocity);
	var row = ROWS - parseInt(Math.floor(pitch / 10));
	var column = pitch % 10 - 1;
	onPress(row, column);
}


function noteOffEvent(channel, pitch, velocity) {
	//script.log("Note off received "+channel+", "+pitch+", "+velocity);
	var row = ROWS - Math.floor(pitch / 10);
	var column = pitch % 10 - 1;
	onRelease(row, column);
}

function ccEvent(channel, pitch, velocity) {
	//script.log("Note off received "+channel+", "+pitch+", "+velocity);

	var row = ROWS - parseInt(Math.floor(pitch / 10));
	var column = pitch % 10 - 1;
	if (velocity > 0) onPress(row, column);
	else onRelease(row, column);

}



function afterTouchEvent(channel, note, value) {
	//script.log("After Touch received "+channel+", "+note+", "+value);
}



// Color Functions
function clearColors() {
	for (var i = 0; i < ROWS; i++) {
		for (var j = 0; j < COLUMNS; j++) {
			sendColor(i, j, 0, 0, 0);
		}
	}
}

function updateColors() {
	for (var i = 0; i < ROWS; i++) {
		for (var j = 0; j < COLUMNS; j++) {
			updatePadColor(i, j);
		}
	}
}

function setPadColor(row, column, color) {
	padColors[row][column] = color;
}


function updatePadColor(row, column) {
    
	if (isTrack(row, column)) {
		var looperIndex = row - 1;
		var pad = getTrackOnPad(row, column);
		if (pad != null) setPadColor(row, column, getColorForTrackState(looperIndex, pad.state.get()));
	} else {
		if (row == 0 && column == 3) {
			setPadColor(row, column, root.transport.isPlaying.get() ? [1, .5, 0] : [.3, .3, .3]);
		} else if (row >= 1 && row <= NUM_LOOPERS && column == 8) {
			var pc = isOneTrackPlaying(row - 1) ? [1, .5, 0] : [.1, .1, .1];
			setPadColor(row, column, pc);
		} else if (row == 8 && column < PIANO_VSTS) {
			var vst = pianoVST[column].getTarget();
			if (vst != null) {
				setPadColor(row, column, vst.enabled.get() ? [0, .5, 0] : getLowBrightness(white));

			}
		} else if (row == 7 && column < singleVSTS.length) {
			var vst = singleVSTS[column].getTarget();
			if (vst != null) {
				var color = looperColors[singleVSTColorsIndices[column]];
				setPadColor(row, column, vst.enabled.get() ? getHighBrightness(color) : getLowBrightness(color));
			}

		} else if (row == 6 && column == 7) {
			setPadColor(row, column, quantizMode ? [0, 0, 0] : [1, .5, 0]);
		} else if (row == 0 && column == 7) {
			setPadColor(row, column, [.1, .1, .1]);
		} else if (row == 0 && column == 8) {
			if (recorderNode.getTarget() != null) setPadColor(row, column, recorderNode.getTarget().isRecording.get() ? [1, 0, 0] : [0, 0, 0]);
		} else if (row == 0 && column < NUM_MICS) {
            var micActive = audioIn.getTarget().channels.getChild(column + 1).active.get();
			setPadColor(row, column, micActive ? [1, .5, 0] : [.1,.1,.1]);
		}
	}

	var c = padColors[row][column];
	if (isPadPressed(row, column)) c = [c[0] + .5, c[1] + .5, c[2] + .5];

	sendColor(row, column, c[0], c[1], c[2]);
}


function getLowBrightness(c) {
	var b = lowBrightness.get();
	return [c[0] * b, c[1] * b, c[2] * b];
}

function getHighBrightness(c) {
	var b = highBrightness.get();
	return [c[0] * b, c[1] * b, c[2] * b];
}

// Looper / Track HELPERS


function getLooper(index) {
	return loopers[index].getTarget();
}

function getLooperOnPad(row) {
	return getLooper(row - 1);
}

function isTrack(row, column) {
	return row >= 1 && row <= NUM_LOOPERS && column < LOOPER_TRACKS;
}

function getTrack(looperIndex, trackIndex) {
	if (getLooper(looperIndex) == null) return null;
	return getLooper(looperIndex).tracks.getChild(trackIndex + 1);
}

function getTrackOnPad(row, column) {
	return getTrack(row - 1, column);
}

function getColorForTrackState(looperIndex, state) {
	if (state == IDLE) {
		return getLowBrightness(looperColors[looperIndex]);
	} else if (state == WILL_RECORD) {
		return [.6, 0, .5];
	} else if (state == RECORDING) {
		return [1, 0, 0]
	} else if (state == FINISH_REC) {
		return [1, .5, 0];
	} else if (state == PLAYING) {
		return [0, 1, 0];
	} else if (state == WILL_STOP) {
		return [0, 1, 1];
	} else if (state == STOPPED) {
		return [.5, .5, .5];
	} else if (state == WILL_PLAY) {
		return [.3, .6, 0];
	}
}

function setQuantizMode(mode) {
	if (mode == quantizMode) return;
	quantizMode = mode;

	for (var i = 0; i < NUM_LOOPERS; i++) {
		if (!quantizLoopers[i]) continue;
		loopers[i].getTarget().recording.quantization.set(quantizMode ? "Default" : "Free");
		loopers[i].getTarget().recording.fadeTime.set(quantizMode ? 20 : 500);
	}

}

// LAUNCHPAD X commands
function sendColor(row, column, r, g, b) {
	var index = (ROWS - row) * 10 + column + 1;
	sendCommand(CMD_LED_COLOR, [LIGHT_TYPE_RGB, index, Math.min(r, 1) * 127, Math.min(g, 1) * 127, Math.min(b, 1) * 127]);
}


function initLaunchpad() {
	sendCommand(CMD_PRG_LIVE_MODE, 1); //switch to programmer mode
    local.enabled.set(false);
    local.enabled.set(true);
	clearColors();
	updateColors();

	setPadColor(8, 8, [1, .2, 0]);

}

function sendCommand(command, data) {
	local.sendSysex(CMD_HEADER, command, data);
}

function isOneTrackPlaying(looperIndex) {
	for (var i = 0; i < LOOPER_TRACKS; i++) {
		var track = getTrack(looperIndex, i);
		if (track == null) continue;
		var s = track.state.get();
		if (s != IDLE && s != STOPPED) return true;
	}
}
