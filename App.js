import { useEffect, useRef, useState } from "react";
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

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  console.log("EXPO_PUSH_TOKEN:", token);
  return token;
}

export default function App() {
  const [token, setToken] = useState("");
  const [notifications, setNotifications] = useState([]);
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    registerForPushNotificationsAsync().then((t) => {
      if (t) setToken(t);
    });

    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        setNotifications((prev) => [
          {
            id: Date.now().toString(),
            title: notification.request.content.title,
            body: notification.request.content.body,
            time: new Date().toLocaleTimeString("id-ID"),
          },
          ...prev,
        ]);
      });

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log("Notif tapped:", response);
      });

    return () => {
      Notifications.removeNotificationSubscription(
        notificationListener.current
      );
      Notifications.removeNotificationSubscription(responseListener.current);
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
  tokenLabel: { fontSize: 11, color: "#464BD8", fontWeight: "bold", marginBottom: 6 },
  tokenText: { fontSize: 11, color: "#1e1e2e", fontFamily: Platform.OS === "ios" ? "Courier" : "monospace" },
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