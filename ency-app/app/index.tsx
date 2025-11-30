import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  StatusBar,
  NativeModules,
  Alert,
  FlatList,
} from "react-native";
import { Link, useFocusEffect, useRouter } from "expo-router"; // Added useRouter
import { BleManager, Device } from "react-native-ble-plx";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { FontAwesome5, Ionicons } from "@expo/vector-icons";

// --- NATIVE MODULE ---
const { SmartSwitchModule } = NativeModules;
const jsBleManager = new BleManager();

export default function HomeScreen() {
  const [pairedConfig, setPairedConfig] = useState<any>(null);
  const [isScanning, setIsScanning] = useState(false);
  const router = useRouter();

  // --- 1. THE HANDOVER (JS -> KOTLIN) ---
  const loadConfig = async () => {
    // 1. JS reads the storage
    const saved = await AsyncStorage.getItem("@smart_switch_config");

    if (saved) {
      const config = JSON.parse(saved);
      setPairedConfig(config);

      // 2. JS passes the baton to Kotlin
      console.log(`[JS] Handing over ${config.id} to Native Service...`);
      SmartSwitchModule.startService(config.id);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadConfig();
      jsBleManager.stopDeviceScan();
    }, [])
  );

  // --- 2. UNPAIR ---
  const unpair = async () => {
    // Stop the Native Service
    SmartSwitchModule.stopService();

    await AsyncStorage.removeItem("@smart_switch_config");
    setPairedConfig(null);
  };

  const handlePairing = async (deviceOrId: any) => {
    jsBleManager.stopDeviceScan();
    setIsScanning(false);

    // Handle both object (scan) and string (QR code) inputs
    const id = deviceOrId.id || deviceOrId;
    const name = deviceOrId.name || "QR Device";

    const newConfig = { name, id };

    // Save to storage
    await AsyncStorage.setItem(
      "@smart_switch_config",
      JSON.stringify(newConfig)
    );
    setPairedConfig(newConfig);

    // Start Native Service immediately
    SmartSwitchModule.startService(id);
    Alert.alert(
      "Paired!",
      "The native service is now running in the background."
    );
  };

  // --- RENDER ---
  const renderDevice = ({ item }: any) => (
    <TouchableOpacity
      style={styles.deviceItem}
      onPress={() => handlePairing(item.deviceObject)}
    >
      <View style={styles.iconBox}>
        <FontAwesome5 name="bluetooth-b" size={20} color="#666" />
      </View>
      <View>
        <Text style={styles.devName}>{item.name}</Text>
        <Text style={styles.devId}>{item.id}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* HEADER */}
      <LinearGradient
        colors={pairedConfig ? ["#11998e", "#38ef7d"] : ["#232526", "#414345"]}
        style={styles.headerCard}
      >
        <View style={styles.statusRow}>
          <View>
            <Text style={styles.statusLabel}>SYSTEM STATUS</Text>
            <Text style={styles.statusText}>
              {pairedConfig ? "Connected" : "Not Paired"}
            </Text>
          </View>
          <View style={styles.lockIconBg}>
            <Ionicons name="shield-checkmark" size={24} color="white" />
          </View>
        </View>
        {pairedConfig && (
          <Text style={styles.subText}>Background Service is Active.</Text>
        )}
      </LinearGradient>

      {/* CONTENT */}
      <View style={styles.content}>
        {!pairedConfig ? (
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Link href="/scan" asChild>
              <TouchableOpacity
                style={[styles.scanBtn, { backgroundColor: "#1e1e1e" }]}
              >
                <Ionicons name="qr-code-outline" size={100} color="white" />
                <Text style={styles.scanBtnText}>Scan QR</Text>
              </TouchableOpacity>
            </Link>
          </View>
        ) : (
          <View style={styles.connectedContainer}>
            <View style={styles.activeCircle}>
              <FontAwesome5 name="broadcast-tower" size={40} color="#4CAF50" />
            </View>

            <Text style={styles.infoTitle}>Service Running</Text>
            <Text style={styles.infoText}>
              Target: {pairedConfig.name} ({pairedConfig.id}){"\n"}
              {"\n"}
              The background service is handling the connection. You can swipe
              this app away safely.
            </Text>

            <TouchableOpacity style={styles.disconnectBtn} onPress={unpair}>
              <Text style={styles.dangerText}>Stop Service & Unpair</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121212" },
  headerCard: {
    padding: 25,
    paddingTop: 60,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  statusText: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 2,
  },
  subText: { color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 10 },
  lockIconBg: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },

  content: { flex: 1, padding: 20 },
  sectionTitle: {
    color: "#666",
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 15,
    letterSpacing: 1,
  },

  buttonRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  scanBtn: {
    // flex: 1,
    backgroundColor: "#2196F3",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "column",
    justifyContent: "center",
    gap: 10,
  },
  scanBtnText: { color: "white", fontWeight: "bold", textAlign: "center" },

  deviceItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e1e1e",
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#333",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 15,
  },
  devName: { color: "#ccc", fontSize: 16, fontWeight: "bold" },
  devId: { color: "#555", fontSize: 10 },
  emptyText: {
    color: "#666",
    textAlign: "center",
    marginTop: 20,
    fontStyle: "italic",
  },

  connectedContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  activeCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "#4CAF50",
  },
  infoTitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
  },
  infoText: {
    color: "#888",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 40,
  },
  disconnectBtn: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "#ef5350",
  },
  dangerText: { color: "#ef5350", fontWeight: "bold" },
});
