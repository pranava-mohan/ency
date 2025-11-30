#include <Servo.h>
#include <SoftwareSerial.h>

const int SERVO_PIN = 9;
const int HM10_RX_PIN = 11;
const int HM10_TX_PIN = 10;
const int PIR_PIN = 2;
const int RADAR_PIN = 3;

const int SWITCH_ON_ANGLE = 90;
const int SWITCH_CLOSED_ANGLE = 0;

const unsigned long TIMEOUT_DURATION = 70000;

Servo switchServo;
SoftwareSerial BTSerial(HM10_TX_PIN, HM10_RX_PIN);

bool currentDormState = false;
unsigned long lastHeartbeatTime = 0;

void setup()
{
  Serial.begin(9600);
  BTSerial.begin(9600);

  pinMode(PIR_PIN, INPUT);
  pinMode(RADAR_PIN, INPUT);

  switchServo.attach(SERVO_PIN);
  switchServo.write(SWITCH_CLOSED_ANGLE);
  delay(500);
  switchServo.detach();

  currentDormState = false;

  Serial.println("System Ready.");
}

void loop()
{

  bool pirStatus = digitalRead(PIR_PIN);
  bool radarStatus = digitalRead(RADAR_PIN);
  bool phoneStatus = false;

  if (BTSerial.available())
  {
    char incoming = BTSerial.read();
    if (incoming == '1')
    {
      Serial.println("Ping Received");
      phoneStatus = true;
    }
  }

  if (phoneStatus || (pirStatus == HIGH) || (radarStatus == HIGH))
  {
    Serial.print("PIR: ");
    Serial.print(pirStatus);
    Serial.print(" | RADAR: ");
    Serial.print(radarStatus);
    Serial.print(" | PHONE: ");
    Serial.println(phoneStatus);
    lastHeartbeatTime = millis();

    if (!currentDormState)
    {
      onSwitch();
    }
  }

  if (currentDormState)
  {
    if ((millis() - lastHeartbeatTime > TIMEOUT_DURATION) && (pirStatus == LOW) && (radarStatus == LOW))
    {
      Serial.println("Turning OFF");
      closeSwitch();
    }
  }
}

void onSwitch()
{
  if (currentDormState)
    return;

  switchServo.attach(SERVO_PIN);

  for (int pos = SWITCH_CLOSED_ANGLE; pos <= SWITCH_ON_ANGLE; pos += 2)
  {
    switchServo.write(pos);
    delay(69);
  }

  delay(100);
  switchServo.detach();

  currentDormState = true;
}

void closeSwitch()
{
  if (!currentDormState)
    return;

  switchServo.attach(SERVO_PIN);

  for (int pos = SWITCH_ON_ANGLE; pos >= SWITCH_CLOSED_ANGLE; pos -= 2)
  {
    switchServo.write(pos);
    delay(69);
  }

  delay(100);
  switchServo.detach();

  currentDormState = false;
}