script.addColorParameter("Color","",0x000000ff);
script.addColorParameter("Color2","",0xff0000ff);
script.addFloatParameter("Size","",.1,0,1);
script.addFloatParameter("Smooth","",.1,0,1);

var lastIndex = [0];
var positions = [0];

function updateColors(colors, id, resolution, time, params, prop)//, num, speed, size, color, color2, pingPong, double)
{
	if(positions[id] == undefined) positions[id] = 0;
	var num = 7;

	if(prop.capacitive) 
	{
		var indexMax = 0;
		var maxVal = 0;
		var values = [];
		for(var i = 0; i < num; i++)
		{
			var v = prop.capacitive.getChild("cap"+(i+1)).value.get();
			if(v > maxVal)
			{
				indexMax = i;
				maxVal = v;
			}
			values[i] = v;
		}

		//var c = colors.lerpColor(params.color, params.color2, val);
		



		var pos = positions[id];
		if(maxVal > .05)
		{
			var targetPos = (indexMax+0.5) / num;


			if(indexMax > 0)  targetPos -= (1/num) * values[indexMax-1];
			if(indexMax < num-1) targetPos += (1/num) * values[indexMax+1];

 			pos += (targetPos - positions[id]) * (1 - params.smooth);
		}


		colors.point(params.color, pos ,  params.size / (num*2), 1);

		positions[id] = pos;
	}
}