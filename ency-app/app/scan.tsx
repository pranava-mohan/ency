import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  Dimensions,
  StatusBar,
} from "react-native";
import {
  CameraView,
  useCameraPermissions,
  BarcodeScanningResult,
} from "expo-camera";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");
const SCAN_BOX_SIZE = width * 0.7;

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const router = useRouter();

  if (!permission) return <View style={styles.container} />;
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Ionicons name="camera" size={50} color="#555" />
        <Text style={styles.permText}>Camera Access Required</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.btn}>
          <Text style={styles.btnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarCodeScanned = async ({ data }: BarcodeScanningResult) => {
    if (scanned) return;
    setScanned(true);

    try {
      const lockData = JSON.parse(data);

      if (!lockData.name) {
        throw new Error("Missing name");
      }

      await AsyncStorage.setItem(
        "@smart_switch_config",
        JSON.stringify(lockData)
      );

      Alert.alert("Success", `Paired with ${lockData.name}`, [
        { text: "Continue", onPress: () => router.replace("/") },
      ]);
    } catch (e: any) {
      Alert.alert("Invalid QR", 'QR must match: { "name": "ENCY" }');
      setScanned(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <CameraView
        style={StyleSheet.absoluteFill}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
      />

      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <View style={styles.middleContainer}>
          <View style={styles.focusedContainer}>
            <View
              style={[
                styles.corner,
                { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4 },
              ]}
            />
            <View
              style={[
                styles.corner,
                { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4 },
              ]}
            />
            <View
              style={[
                styles.corner,
                {
                  bottom: 0,
                  left: 0,
                  borderBottomWidth: 4,
                  borderLeftWidth: 4,
                },
              ]}
            />
            <View
              style={[
                styles.corner,
                {
                  bottom: 0,
                  right: 0,
                  borderBottomWidth: 4,
                  borderRightWidth: 4,
                },
              ]}
            />
          </View>
        </View>
        {/* <View style={styles.unfocusedContainer}> */}
        {/* </View> */}
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => router.back()}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  permText: { color: "#888", marginVertical: 20 },
  btn: { backgroundColor: "#2196F3", padding: 15, borderRadius: 10 },
  btnText: { color: "white", fontWeight: "bold" },

  unfocusedContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  middleContainer: {
    // flexDirection: "row",
    height: SCAN_BOX_SIZE,
    width: SCAN_BOX_SIZE,
    alignSelf: "center",
  },
  focusedContainer: { flex: 1, backgroundColor: "transparent" },

  corner: {
    position: "absolute",
    width: 20,
    height: 20,
    borderColor: "#38ef7d",
  },

  cancelBtn: {
    padding: 15,
    backgroundColor: "#333",
    borderRadius: 25,
    marginTop: 20,
    width: "30%",
    alignSelf: "center",
  },
  cancelText: { color: "white", fontSize: 16, textAlign: "center" },
});
