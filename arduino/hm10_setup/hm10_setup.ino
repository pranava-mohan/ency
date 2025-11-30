#include <SoftwareSerial.h>

const int HM10_TX_PIN = 10; // Connect to HM-10 TX
const int HM10_RX_PIN = 11; // Connect to HM-10 RX

SoftwareSerial BTSerial(HM10_TX_PIN, HM10_RX_PIN);

void setup()
{
  Serial.begin(9600);
  BTSerial.begin(9600);

  Serial.println("--- STARTING AUTOMATED CONFIGURATION ---");
  delay(1000);

  sendCommand("AT+RENEW"); // Factory Reset
  sendCommand("AT+RESET"); // Reboot
  delay(1000);

  sendCommand("AT+MARJ0x8484"); // Major: 33924
  sendCommand("AT+MINO0xFA01"); // Minor: 64001
  sendCommand("AT+ADVI0");      // Advertising Interval: 100ms
  sendCommand("AT+NAMEENCY");   // Name: ENCY (Matches your JSON)
  sendCommand("AT+IBEA0");      // Disable iBeacon
  sendCommand("AT+RESET");      // Reboot to save

  Serial.println("--- CONFIGURATION COMPLETE ---");
  Serial.println("Your HM-10 is now broadcasting as 'ENCY' with ID 8484/FA01");
}

void loop()
{
  // Debug pass-through
  if (Serial.available())
    BTSerial.write(Serial.read());
  if (BTSerial.available())
    Serial.write(BTSerial.read());
}

void sendCommand(String command)
{
  Serial.print("Sending: " + command + " ... ");
  BTSerial.print(command);
  delay(500);

  while (BTSerial.available())
  {
    Serial.write(BTSerial.read());
  }
  Serial.println();
}