var noteTrigger = script.addTrigger("Note Trigger","");
var lastPitch = script.addIntParameter("Last pitch","",0,0,127);

function noteOnEvent(channel, pitch, velocity)
{
	lastPitch.set(pitch);
	noteTrigger.trigger();
}


function noteOffEvent(channel, pitch, velocity)
{
	script.log("Note off received "+channel+", "+pitch+", "+velocity);
}