
/* ********** GENERAL SCRIPTING **********************

		This templates shows what you can do in this is module script
		All the code outside functions will be executed each time this script is loaded, meaning at file load, when hitting the "reload" button or when saving this file
*/


// You can add custom parameters to use in your script here, they will be replaced each time this script is saved
var id = script.addIntParameter("ID","Description of my float param",10,0); 		//This will add a float number parameter (slider), default value of 0.1, with a range between 0 and 1
var numParam = script.addIntParameter("Num","Description of my float param",7,1); 		//This will add a float number parameter (slider), default value of 0.1, with a range between 0 and 1
var position = script.addFloatParameter("Position","Description of my float param",0,0,1); 		//This will add a float number parameter (slider), default value of 0.1, with a range between 0 and 1
var smooth = script.addFloatParameter("Smooth","Description of my float param",0,0,1); 		//This will add a float number parameter (slider), default value of 0.1, with a range between 0 and 1
position.setAttribute("readOnly",true);
//Here are all the type of parameters you can create
/*
var myTrigger = script.addTrigger("My Trigger", "Trigger description"); 									//This will add a trigger (button)
var myBoolParam = script.addBoolParameter("My Bool Param","Description of my bool param",false); 			//This will add a boolean parameter (toggle), defaut unchecked
var myFloatParam = script.addFloatParameter("My Float Param","Description of my float param",.1,0,1); 		//This will add a float number parameter (slider), default value of 0.1, with a range between 0 and 1
var myIntParam = script.addIntParameter("My Int Param","Description of my int param",2,0,10); 				//This will add an integer number parameter (stepper), default value of 2, with a range between 0 and 10
var myStringParam = script.addStringParameter("My String Param","Description of my string param", "cool");	//This will add a string parameter (text field), default value is "cool"
var myColorParam = script.addColorParameter("My Color Param","Description of my color param",0xff0000ff); 	//This will add a color parameter (color picker), default value of opaque blue (ARGB)
var myP2DParam = script.addPoint2DParameter("My P2D Param","Description of my p2d param"); 					//This will add a point 2d parameter
var myP3DParam = script.addPoint3DParameter("My P3D Param","Description of my p3d param"); 					//This will add a point 3d parameter
var myTargetParam = script.addTargetParameter("My Target Param","Description of my target param"); 			//This will add a target parameter (to reference another parameter)
var myEnumParam = script.addEnumParameter("My Enum Param","Description of my enum param",					//This will add a enum parameter (dropdown with options)
											"Option 1", 1,													//Each pair of values after the first 2 arguments define an option and its linked data
											"Option 2", 5,												    //First argument of an option is the label (string)
											"Option 3", "banana"											//Second argument is the value, it can be whatever you want
											); 	
*/


var capParams = [];

function init()
{
	for(var i=0;i<numParam.get();i++)
	{
		capParams[i] = local.values.prop.getChild(id.get()).capacitive.getChild("cap"+(i+1)).value;
	}
}

function update()
{
	//setAverage();
	setPos1();
}


function setAverage()
{
	var num = numParam.get();
	var total = 0;
	var weights = [];

	var pos = position.get();
	var targetPos = 0;
	for(var i = 0;i< num;i++)
	{
		var v = capParams[i].get();
		total += v;
		weights[i] = v;
	}

	if(total < .05) return;

	for(var i =0;i<num;i++)
	{
		weights[i] = weights[i] / total;

		targetPos += i*weights[i] / 7;
	}


	//pos += (targetPos - pos) * (1 - smooth.get());
	position.set(targetPos);
}

function setPos1()
{
	var num = numParam.get();

	var indexMax = 0;
	var maxVal = 0;
	var values = [];

	for(var i = 0; i < num; i++)
	{
		var v = capParams[i].get();
		if(v > maxVal)
		{
			indexMax = i;
			maxVal = v;
		}
		values[i] = v;
	}

	//var pos = position.get();
	if(maxVal > .05)
	{
		var targetPos = (indexMax+0.5) / num;

		if(indexMax > 0)  targetPos -= (1/num) * values[indexMax-1];
		if(indexMax < num-1) targetPos += (1/num) * values[indexMax+1];

		//pos += (targetPos - pos) * (1 - smooth.get());
	}

	position.set(targetPos);
}