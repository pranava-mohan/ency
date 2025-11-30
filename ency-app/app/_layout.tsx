import { Stack } from "expo-router";
import {
  LogBox,
  Platform,
  PermissionsAndroid,
  Alert,
  StatusBar,
} from "react-native";
import { useEffect } from "react";

LogBox.ignoreLogs(["new NativeEventEmitter"]);

export default function Layout() {
  useEffect(() => {
    const setupPermissions = async () => {
      if (Platform.OS === "android" && Platform.Version >= 31) {
        const bluetoothGranted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        ]);

        if (
          bluetoothGranted["android.permission.BLUETOOTH_SCAN"] !== "granted" ||
          bluetoothGranted["android.permission.BLUETOOTH_CONNECT"] !== "granted"
        ) {
          Alert.alert(
            "Permission Error",
            "Bluetooth permissions are required to talk to the switch."
          );
        }

        const notifsGranted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );

        if (notifsGranted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert(
            "Permission Blocked",
            "Without Notification permissions, the background service will stop working when you close the app."
          );
        }
      }
    };

    setupPermissions();
  }, []);

  return (
    <Stack
      screenOptions={{
        // headerStyle: { backgroundColor: "#121212" },
        // headerTintColor: "#fff",
        // headerTitleStyle: { fontWeight: "bold" },
        contentStyle: {
          backgroundColor: "#121212",
          paddingTop: StatusBar.currentHeight,
        },
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="scan" options={{ presentation: "modal" }} />
    </Stack>
  );
}
