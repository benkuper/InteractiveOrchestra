// Helpers
function addNodeTargetParam(name)
{
	var p = script.addTargetParameter(name,"");
	p.setAttribute("targetType", "container");
	p.setAttribute("root", root.nodes);
	p.setAttribute("searchLevel",0);
	return p;
}


var LOOPERSTATE_IDLE = 0;
var LOOPERSTATE_WILLREC = 1;
var LOOPERSTATE_RECORDING = 2;
var LOOPERSTATE_FINISHREC = 3;

var IDLE = 0;
var WILL_RECORD = 1;
var RECORDING = 2;
var FINISH_REC = 3;
var PLAYING = 4;
var WILL_STOP = 5;
var STOPPED = 6;
var WILL_PLAY = 7;


var REVEAL_SIZE = 3.3;

var guitarLooper = addNodeTargetParam("Guitar Looper");
var clarinetLooper = addNodeTargetParam("Clarinet Looper");

var rmsThreshold = script.addFloatParameter("RMS Threshold","",0,0,1);


var looperIdMap = [guitarLooper, clarinetLooper];
var instruNames = ["guitar","clarinet"];

var looperPrevStates = [];
var looperPrevTrackStates = [];
var revealTimes = [2,1.5];


var instruParams = [];

function init()
{

	for(var i = 0;i<looperIdMap.length;i++)
	{
		looperPrevStates[i] =  looperIdMap[i].getTarget().recording.recordingState.get();
		looperPrevStates[i] =  looperIdMap[i].getTarget().tracks["1"].state.get();

		instruParams[i] = {
			"pulseColor" : { "value":[0,0,0], "target":[0,0,0], "valueAtAnimate":0, "timeAtAnimate":-1, "animationTime":2 },
			"pulseBrightness" : { "value":0, "target":0, "valueAtAnimate":0, "timeAtAnimate":-1, "animationTime":.5 },
			"noiseBalance" : { "value":-1, "target":-1, "valueAtAnimate":0, "timeAtAnimate":-1, "animationTime":0, "smoothing":.05 },
			"revealSize":  { "value": 0, "target": 0, "valueAtAnimate":0, "timeAtAnimate":-1, "animationTime":revealTimes }
		};
	}
}

function scriptParameterChanged(param)
{
}

function update(deltaTime)
{
	for(var i=0;i<looperIdMap.length;i++)
	{
		var looper = looperIdMap[i].getTarget();
		var looperState = looper.recording.recordingState.get();
		if(looperPrevStates[i] != looperState)
		{
			looperStateChanged(i, looperState);
			looperPrevStates[i] = looperState;
		}

		var tState = looper.tracks["1"].state.get();
		if(tState != looperPrevTrackStates[i])
		{
			looperTrackStatesChanged(i, tState);
			looperPrevTrackStates[i] = tState;
		}

		if((tState == IDLE || tState == STOPPED) && looperState == IDLE) //solo
		{
			var rms = looper.out.rms.get();
			if(rms > rmsThreshold.get()) setInstruParam(i, "noiseBalance", -.5+(rms-rmsThreshold.get())*2.5);
			//setInstruParamDirect(i, "revealSize", rms > rmsThreshold.get()?REVEAL_SIZE:0); 
			setInstruParam(i, "revealSize", rms > rmsThreshold.get()?REVEAL_SIZE:0); 
		}

	}

	

	var time = util.getTime();
	
	for(var i=0;i<instruParams.length;i++)
	{
		var props = util.getObjectProperties(instruParams[i]);
		for(var j = 0;j<props.length;j++)
		{
			var pName = props[j];
			var p = instruParams[i][pName];
			if(p.timeAtAnimate != -1 && p.value != p.target)
			{
				if((p.animationTime.length > 0 && p.animationTime[i] > 0) || p.animationTime > 0)
				{
					var aTime = p.animationTime.length > 0?p.animationTime[i]:p.animationTime;
					var progression = (time - p.timeAtAnimate) / aTime; 
				
					if(progression >= 1)
					{
						progression = 1;
						p.timeAtAnimate = -1;
					}

					if(p.value.length == 0) p.value = p.valueAtAnimate + (p.target-p.valueAtAnimate) * progression;
					{
						for(var v = 0;v < p.value.length; v++)
						{
							p.value[v] = p.valueAtAnimate[v] + (p.target[v]-p.valueAtAnimate[v]) * progression;
						}
					}
				}else if(p.smoothing > 0)
				{
					if(p.value.length == 0)
					{
						 p.value = p.value + (p.target - p.value) * p.smoothing;
						 if(Math.abs(p.target-p.value) < 0.0001) 
					 	{
					 		p.value = p.target;
					 	}
					}
					else
					{
						for(var v = 0;v < p.value.length; v++)
						{
							p.value[v] = p.value[v] = p.value[v] + (p.target[v] - p.value[v]) * deltaTime / smoothing;
						}
					}
				}

				sendParam(instruNames[i], pName, p.value);
			}
		}
	}


}


//Looper event
function looperStateChanged(index, state)
{
	//script.log("Looper state changed "+state);
	if(state == RECORDING)
	{
		setInstruParam(index, "pulseColor", [1,0,0]);
		setInstruParam(index, "pulseBrightness", 1);
		setInstruParam(index, "revealSize", REVEAL_SIZE);
		setInstruParam(index, "noiseBalance", -1);
	}else if(state == IDLE)
	{
		setInstruParam(index, "pulseColor", [1,1,1]);
		setInstruParam(index, "noiseBalance", .2);
	}
}

function looperTrackStatesChanged(index, state)
{
	//script.log("Looper track state changed "+state);

	var isLooping = state == PLAYING || PLAYING == WILL_STOP;
	var isStopped = state == STOPPED;
	var isCleared = state == IDLE;

	if(isLooping) 
	{
		setInstruParam(index, "revealSize", REVEAL_SIZE);
		setInstruParam(index, "pulseBrightness", .6);
		setInstruParam(index, "noiseBalance", .2);
	}
	else if(isStopped)
	{
		setInstruParam(index, "revealSize", 0);
	} else if(isCleared)
	{
		setInstruParam(index, "pulseColor",[0,0,0]);
		setInstruParam(index, "noiseBalance", -1);
	}
}

function setInstruParam(index, pName, value)
{
	var p = instruParams[index][pName];
	if(p.value  == value || p.target == value) return;
	p.valueAtAnimate = p.value;
	p.timeAtAnimate = util.getTime();
	p.target = value;
}

function setInstruParamDirect(index, pName, value)
{
	var p = instruParams[index][pName];
	if(p.value == value) return;

	p.timeAtAnimate = -1;
	p.target = value;
	p.value = value;
	sendParam(instruNames[index], pName, p.value);
}


// Instru event

function buttonPressed(id, btID, pressed)
{
	var looper = looperIdMap[id];
	if(pressed)
	{
		if(btID == 1) looper.getTarget().controls.rec.trigger();
	}
}

function buttonShortPress(id, btID)
{
	var looper = looperIdMap[id];
	if(btID == 2) looper.getTarget().controls.clear.trigger();
}



function buttonLongPress(id, btID)
{
	var looper = looperIdMap[id];
	if(btID == 2) root.nodes.tempMuteAllLoopers.trigger();
}


//
function oscEvent(address, args)
{
	var addSplit = address.split("/");
	if(addSplit[1] == "prop")
	{
		var id = parseInt(addSplit[2]);
		if(addSplit[3] == "buttons")
		{
			var btID = parseInt(addSplit[4].substring(6, addSplit[4].length));

			if(addSplit[5] == "pressed") buttonPressed(id, btID, args[0]);
			else if(addSplit[5] == "longPress") buttonLongPress(id, btID);
			else if(addSplit[5] == "shortPress") buttonShortPress(id, btID);
		}
	}
}

function sendParam(instruName, paramName, value) {
	local.send("/props/"+instruName+"/instru/parameters/"+paramName, value);
}