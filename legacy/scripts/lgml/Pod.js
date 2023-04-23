// Helpers
function addNodeTargetParam(name)
{
	var p = script.addTargetParameter(name,"");
	p.setAttribute("targetType", "container");
	p.setAttribute("root", root.nodes);
	p.setAttribute("searchLevel",0);
	return p;
}


var btColor = script.addColorParameter("Button Color","Description of my color param",0xff0000ff); 	//This will add a color parameter (color picker), default value of opaque blue (ARGB)
var stripColor = script.addColorParameter("Strip Color","Description of my color param",0xff0000ff); 	//This will add a color parameter (color picker), default value of opaque blue (ARGB)
var pulseColor = script.addColorParameter("Pulse Color","Description of my color param",0xffff00ff); 	//This will add a color parameter (color picker), default value of opaque blue (ARGB)
var pulseBrightness = script.addFloatParameter("Pulse Brightness", "The track to use", .5,0,1);
var borderBrightness = script.addFloatParameter("Border Brightness", "The track to use", .5,0,1);
var border = script.addFloatParameter("Border", "", .1, 0, 1);
var maxPrealpha = script.addFloatParameter("Max preAlpha","", .5, 0, 1);
var preAlpha = script.addFloatParameter("PreAlpha", "", .1, 0, 1);
var postAlpha = script.addFloatParameter("PostAlpha", "", .1, 0, 1);
var brightness = script.addFloatParameter("Brightness", "The track to use", .5,0,1);
var trackIndex = script.addIntParameter("Track", "The track to use", 1,1,8);

var useFirstLoop = script.addBoolParameter("Use First Loop","", true);

var testTrigger = script.addTrigger("Fake button","");

var IDLE = 0;
var WILL_RECORD = 1;
var RECORDING = 2;
var FINISH_REC = 3;
var PLAYING = 4;
var WILL_STOP = 5;
var STOPPED = 6;
var WILL_PLAY = 7;

var looper = addNodeTargetParam("Looper");
var status = 0; //

var track;

var progressionAtStart = 0;
var alphaAtAnimate = 0;
var timeAtAnimate = 0 ;
var targetAlpha = 0;
var fadeTime = .3;
var animatePostAlpha = false;

var prevTrackState;

function init()
{
	track = looper.getTarget().tracks.getChild(trackIndex.get());
}


function update(deltaTime)
{

	var state = track.state.get();

	if(prevTrackState != state)
	{
		trackStateChanged();
	}


	var alphaMult = 1;
	if(state == RECORDING || /*state == WILL_RECORD || */ state == FINISH_REC)
	{
		var diffT = (util.getTime() - timeAtAnimate);
		var recPulse01 = Math.cos(diffT*5 + Math.PI) *.5+.5;
		alphaMult = .2 + recPulse01  * .8;
		preAlpha.set(alphaMult * maxPrealpha.get());

	}else if(timeAtAnimate > 0)
	{

		var animVal = (util.getTime() - timeAtAnimate) / fadeTime;
		if(animVal <= 1)
		{
			var tAlpha = alphaAtAnimate + (targetAlpha - alphaAtAnimate) * animVal;
			preAlpha.set(tAlpha);
		}
		else
		{
			preAlpha.set(targetAlpha);
			timeAtAnimate = 0;
		}

		if(animatePostAlpha) postAlpha.set(preAlpha.get());
	}

	if(state == PLAYING || state == STOPPED || state == WILL_PLAY || state == WILL_STOP)
	{
		var p = root.transport.barProgression.get();// (root.transport.barProgression.get() - progressionAtStart) / (1 - progressionAtStart);		

		if(useFirstLoop.get())
		{
			var firstLoopBar = root.transport.firstLoopBeat.get() * 1.0 / root.transport.beatsPerBar.get();
			p = (p + (root.transport.currentBar.get() % firstLoopBar)) / firstLoopBar;
		}
		setStripRange(p, p);
	}

	/*
	if(animateFromButton)
	{
		if(state == PLAYING || state == STOPPED)
		{
			preAlpha.set(1);
			postAlpha.set(1);
			
			animateFromButton = false;
			if(state == PLAYING) setStripRange(0,1);
			else setStripRange(0, 0);

		}else if(state == WILL_PLAY || state == WILL_STOP)
		{
			var start = 0;
			var end = 1;
			var p = (root.transport.barProgression.get() - progressionAtStart) / (1 - progressionAtStart);
			
			script.log(progressionAtStart +" / "+ p);
			if(state == WILL_PLAY) start = p;
			else start = p;
			setStripRange(start, end);
		}
	}
	*/

	prevTrackState = state;
}

function trackStateChanged()
{
	var state = track.state.get();

	if(state != FINISH_REC) 
	{
		script.log("Set time at animate");
		timeAtAnimate = util.getTime();
	}

	animatePostAlpha = false;

	if(state == PLAYING)
	{
		animatePostAlpha = prevTrackState == WILL_PLAY || prevTrackState == RECORDING || prevTrackState == FINISH_REC;
		goToAlpha(1);
	}else if(state == STOPPED)
	{
		animatePostAlpha = prevTrackState == WILL_STOP;
		goToAlpha(0);
	}else if(state == WILL_PLAY)
	{
		goToAlpha(1);
	}else if(state == WILL_STOP)
	{
		goToAlpha(0);
	}else if(state == IDLE)
	{
		setStripRange(1,1);
		goToAlpha(0);
	}else if(/*state == WILL_RECORD || */state == RECORDING || state == FINISH_REC)
	{
		//goToAlpha(1);
		//setStripRange(1,1);
		postAlpha.set(maxPrealpha.get());
	}

}

function goToAlpha(val)
{
	targetAlpha = val * maxPrealpha.get();
	alphaAtAnimate = preAlpha.get();
	timeAtAnimate = util.getTime();
}

//Event

function scriptParameterChanged(param)
{
	if(param.is(btColor))
	{
		var c = btColor.get();
		local.send("/buttonColor", c);
	}else if(param.is(stripColor))
	{
		var c = stripColor.get();
		local.send("/stripColor", c);
	}else if(param.is(pulseColor))
	{
		var c = pulseColor.get();
		local.send("/pulseColor", c);
	}else if(param.is(pulseBrightness))
	{
		local.send("/pulseBrightness", pulseBrightness.get());
	}else if(param.is(borderBrightness))
	{
		local.send("/borderBrightness", borderBrightness.get());
	}else if(param.is(border))
	{
		local.send("/border", border.get());
	}else if(param.is(preAlpha))
	{
		local.send("/preAlpha", preAlpha.get());
	}else if(param.is(postAlpha))
	{
		local.send("/postAlpha",postAlpha.get());
	}else if(param.is(brightness))
	{
		local.send("/brightness", brightness.get());
	}else if(param.is(testTrigger))
	{
		togglePlayStop();
	}
}



function oscEvent(address, args)
{
	script.log("received osc !");
	if(address == "/button/pressed")
	{
		if(args[0])
		{
			togglePlayStop();
		}
	}
}

//CONTROLS

function togglePlayStop()
{
	var state = track.state.get();

	if(state == PLAYING || state == STOPPED || state == WILL_PLAY || state == WILL_STOP)
	{
		//progressionAtStart = root.transport.barProgression.get();
		if(state == PLAYING || state == WILL_PLAY)
		{
			looper.getTarget().controls.stopAll.trigger();
		}else
		{
			script.log("Play All");
			//setStripRange(0,0);
			looper.getTarget().controls.playAll.trigger();
		}
	}
}

//Helpers

function setStripRange(start, end)
{
	//script.log("Strip range : "+start+" > "+end);
	local.send("/stripRange", start*1.1-.05, end *1.1-.05);
}
