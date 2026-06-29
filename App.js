import { useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Platform,
  Alert,
} from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";

// Setup notification channel (Android)
if (Platform.OS === "android") {
  Notifications.setNotificationChannelAsync("tugasly-admin", {
    name: "Tugasly Admin",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    sound: "nada.wav",
    lightColor: "#464BD8",
  });
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) {
    Alert.alert("Harus pakai device fisik untuk push notification");
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    Alert.alert("Permission notifikasi ditolak!");
    return null;
  }

  const token = (await Notifications.getDevicePushTokenAsync()).data;
  console.log("FCM_TOKEN:", token);
  return token;
}

async function registerTokenToServer(token) {
  console.log("REGISTER_TOKEN: mulai kirim token", token?.slice(0, 20));
  try {
    const res = await fetch("https://tugasly.my.id/api/register-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    console.log("REGISTER_TOKEN: status", res.status);
    const data = await res.json();
    console.log("REGISTER_TOKEN_RESULT:", JSON.stringify(data));
  } catch (err) {
    console.log("REGISTER_TOKEN_ERROR:", String(err));
  }
}

async function loadNotifications() {
  try {
    const stored = await AsyncStorage.getItem("notif_history");
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

async function saveNotifications(notifications) {
  try {
    await AsyncStorage.setItem("notif_history", JSON.stringify(notifications));
  } catch {}
}

export default function App() {
  const [token, setToken] = useState("");
  const [notifications, setNotifications] = useState([]);
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    // Load riwayat notif dari storage
    loadNotifications().then((saved) => {
      if (saved.length > 0) setNotifications(saved);
    });

    registerForPushNotificationsAsync().then((t) => {
      if (t) {
        setToken(t);
        registerTokenToServer(t);
      }
    });

    // Listen token berubah (reinstall, refresh Google)
    const tokenListener = Notifications.addPushTokenListener((newToken) => {
      const t = newToken.data;
      if (t) {
        setToken(t);
        registerTokenToServer(t);
      }
    });

    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        const newNotif = {
          id: Date.now().toString(),
          title: notification.request.content.title,
          body: notification.request.content.body,
          time: new Date().toLocaleTimeString("id-ID"),
        };
        setNotifications((prev) => {
          const updated = [newNotif, ...prev].slice(0, 50); // max 50 notif
          saveNotifications(updated);
          return updated;
        });
      });

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log("Notif tapped:", response);
      });

    return () => {
      Notifications.removeNotificationSubscription(
        notificationListener.current,
      );
      Notifications.removeNotificationSubscription(responseListener.current);
      Notifications.removeNotificationSubscription(tokenListener);
    };
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Tugasly Admin</Text>
        <Text style={styles.subHeader}>Notifikasi Order</Text>
      </View>

      {token ? (
        <View style={styles.tokenBox}>
          <Text style={styles.tokenLabel}>Device Token (copy ini):</Text>
          <Text style={styles.tokenText} selectable>
            {token}
          </Text>
        </View>
      ) : (
        <Text style={styles.waiting}>Menunggu token...</Text>
      )}

      <Text style={styles.sectionTitle}>Riwayat Notifikasi</Text>

      {notifications.length === 0 ? (
        <Text style={styles.empty}>Belum ada notifikasi masuk.</Text>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.notifCard}>
              <Text style={styles.notifTitle}>{item.title}</Text>
              <Text style={styles.notifBody}>{item.body}</Text>
              <Text style={styles.notifTime}>{item.time}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa", paddingTop: 50 },
  header: {
    backgroundColor: "#464BD8",
    padding: 20,
    alignItems: "center",
  },
  headerText: { color: "#fff", fontSize: 22, fontWeight: "bold" },
  subHeader: { color: "#c7c9f5", fontSize: 13, marginTop: 4 },
  tokenBox: {
    margin: 16,
    padding: 12,
    backgroundColor: "#e8eaff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#464BD8",
  },
  tokenLabel: {
    fontSize: 11,
    color: "#464BD8",
    fontWeight: "bold",
    marginBottom: 6,
  },
  tokenText: {
    fontSize: 11,
    color: "#1e1e2e",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  waiting: { textAlign: "center", color: "#888", margin: 20 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1e1e2e",
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  empty: { textAlign: "center", color: "#aaa", marginTop: 40 },
  notifCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 14,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  notifTitle: { fontWeight: "bold", fontSize: 14, color: "#1e1e2e" },
  notifBody: { fontSize: 13, color: "#555", marginTop: 4 },
  notifTime: { fontSize: 11, color: "#aaa", marginTop: 6 },
});
