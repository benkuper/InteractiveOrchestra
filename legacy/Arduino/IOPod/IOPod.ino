#include <FastLED.h>
#include <WiFi.h>
#include <WiFiUdp.h>
#include <OSCMessage.h>

const char* ssid     = "InteractiveOrchestra";
const char* password = "konamicode";

const IPAddress outIp(192,168,3,2);        // remote IP of your computer
const unsigned int outPort = 12004; 

#define NUM_LEDS 150
#define DATA_PIN 26

#define BUTTON_PIN 0

CRGB leds[NUM_LEDS];

float stripStart = .25f;
float stripEnd = .75f;
float border = .02f;

CRGB mainColor = CRGB(120,20,20);
CRGB pulseColor = CRGB(255,255,255);

float pulsePos = 0;
float pulseSpeed = 8.f;
float pulseScale = 40;
float pulseBrightness = .2f;

/*
CRGB trailColor = CRGB(255,255,255);
float trailHeadWeight = .5f;
float postTrailBrightness = 1;
float trailLength = .1f;
float trailPos = .5f;
*/

float stripBrightness = .5f;
float borderBrightness = .5f;
float preAlpha = 0;
float postAlpha = 0;

long lastUpdateTime;

bool buttonPressed = false;

WiFiUDP udp;

void setButtonColor(const CRGB &color)
{
  leds[0] = color;
}

void updateStrip()
{
  long t = millis();
  float delta = (t-lastUpdateTime)/1000.0f;
  pulsePos += pulseSpeed * delta;
  //stripStart = cos(pulsePos*.2f)*.2f+.3f;
  //stripEnd = cos(pulsePos*.27f)*.2f+.7f;

  int startIndex = 1 + stripStart * (NUM_LEDS -1);
  int endIndex = 1 + stripEnd * (NUM_LEDS -1);

  int marginPix = border * (NUM_LEDS -1);
  
  
  for(int i=1;i<NUM_LEDS;i++)
  {
    
    float relPos = ((i-1)*1.0f / (NUM_LEDS-1));

    float borderFactor = 0;
    
    //border
    if(i >= startIndex - marginPix && i <= startIndex + marginPix)
    {
      borderFactor = (1 - fabsf(i - startIndex) / marginPix) * borderBrightness;
    }else if(i >= endIndex - marginPix && i <= endIndex + marginPix)
    {
      borderFactor = (1 - fabsf(i - endIndex) / marginPix)  * borderBrightness;
    }
      
      
    CRGB baseCol = CRGB::Black;

    float pulse = (cos(relPos*pulseScale-pulsePos) *.5f+.5f) * pulseBrightness;
    baseCol = blend(mainColor, pulseColor, pulse * 255);

    float alpha = i < startIndex ? preAlpha : i > endIndex ? postAlpha : stripBrightness;
    baseCol.nscale8_video((uint8_t)(alpha*255));

    CRGB col = blend(baseCol, CRGB::White, borderFactor * 255);
    
    leds[i] = col;
  }

  
  lastUpdateTime = t;
}


void setButtonPressed(bool val)
{
   if(val == buttonPressed) return;
   
   buttonPressed = val;
   setButtonColor(buttonPressed?CRGB::White:CRGB::Orange);

    OSCMessage msg("/button/pressed");
    msg.add((int)buttonPressed);
    udp.beginPacket(outIp, outPort);
    msg.send(udp);
    udp.endPacket();
    msg.empty();
}



//Wifi

void setupWifi()
{
     
   WiFi.begin(ssid, password);

    bool stat = false;
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        setButtonColor(stat?CRGB::Blue:CRGB::Cyan);
        stat = !stat;
        FastLED.show();
        Serial.print(".");
    }

    Serial.println("");
    Serial.println("WiFi connected");
    Serial.println("IP address: ");
    Serial.println(WiFi.localIP());
    setButtonColor(CRGB::Green);
    udp.begin(9000);
}

void parseOSC()
{
   OSCMessage msg;
    int size = udp.parsePacket();
  
    if (size > 0) {
      while (size--) {
        msg.fill(udp.read());
      }
      if (!msg.hasError()) {
        msg.dispatch("/stripStart", [](OSCMessage& msg) { stripStart = msg.getFloat(0); });
        msg.dispatch("/stripEnd", [](OSCMessage& msg) { stripEnd = msg.getFloat(0); });
        msg.dispatch("/stripRange", [](OSCMessage& msg) { stripStart = msg.getFloat(0); stripEnd = msg.getFloat(1); });
        msg.dispatch("/border", [](OSCMessage& msg) { border = msg.getFloat(0); });
        msg.dispatch("/pulseSpeed", [](OSCMessage& msg) { pulseSpeed = msg.getFloat(0); });
        msg.dispatch("/pulseScale", [](OSCMessage& msg) { pulseScale = msg.getFloat(0); });
        msg.dispatch("/pulseBrightness", [](OSCMessage& msg) { pulseBrightness = msg.getFloat(0); });
        msg.dispatch("/borderBrightness", [](OSCMessage& msg) { borderBrightness = msg.getFloat(0); });
        msg.dispatch("/brightness", [](OSCMessage& msg) {stripBrightness = msg.getFloat(0); });
        msg.dispatch("/buttonColor", [](OSCMessage& msg) { setButtonColor(CRGB(msg.getFloat(0)*255,msg.getFloat(1)*255,msg.getFloat(2)*255));});
        msg.dispatch("/stripColor", [](OSCMessage& msg) { mainColor = CRGB(msg.getFloat(0)*255,msg.getFloat(1)*255,msg.getFloat(2)*255);});
        msg.dispatch("/pulseColor", [](OSCMessage& msg) { pulseColor = CRGB(msg.getFloat(0)*255,msg.getFloat(1)*255,msg.getFloat(2)*255);});
        msg.dispatch("/preAlpha", [](OSCMessage& msg) { preAlpha = msg.getFloat(0);});
        msg.dispatch("/postAlpha", [](OSCMessage& msg) { postAlpha = msg.getFloat(0);});

      } else {
        OSCErrorCode error = msg.getError();
        Serial.print("error: ");
        Serial.println(error);
      }
    }
}

// SETUP & LOOP

void setup() 
{
  Serial.begin(115200);

  setupWifi();

  LEDS.addLeds<WS2812B,DATA_PIN,GRB>(leds,NUM_LEDS);
  
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  setButtonColor(CRGB::Yellow);
}

void loop() 
{
    setButtonPressed(!digitalRead(BUTTON_PIN));
    parseOSC();
    
    updateStrip();

    FastLED.show();
    delay(2);
}

