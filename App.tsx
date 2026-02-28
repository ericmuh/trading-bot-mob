import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  ApiDefaults,
  DashboardSummaryResponse,
  LicenseStatusResponse,
  NotificationItem,
  getDashboardSummary,
  getHealth,
  getLicenseStatus,
  getNotifications,
} from "./src/api";

export default function App() {
  const [apiBaseUrl, setApiBaseUrl] = useState(ApiDefaults.baseUrl);
  const [userId, setUserId] = useState("demo-user");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<string>("Not checked");
  const [license, setLicense] = useState<LicenseStatusResponse | null>(null);
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const canLoadUserData = useMemo(() => userId.trim().length > 0, [userId]);

  async function onCheckHealth(): Promise<void> {
    try {
      setLoading(true);
      setError(null);
      const result = await getHealth(apiBaseUrl);
      setHealth(result.ok ? "API is healthy" : "API responded but not healthy");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function onLoadUserData(): Promise<void> {
    if (!canLoadUserData) {
      setError("User ID is required");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const [licenseResult, summaryResult, notificationsResult] = await Promise.all([
        getLicenseStatus(userId, apiBaseUrl),
        getDashboardSummary(userId, apiBaseUrl),
        getNotifications(userId, apiBaseUrl),
      ]);

      setLicense(licenseResult);
      setSummary(summaryResult);
      setNotifications(notificationsResult);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Trading Bot Mobile</Text>
        <Text style={styles.subtitle}>Expo + FastAPI starter</Text>

        <Text style={styles.label}>API Base URL</Text>
        <TextInput
          style={styles.input}
          value={apiBaseUrl}
          onChangeText={setApiBaseUrl}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="http://127.0.0.1:8000"
        />

        <Text style={styles.label}>User ID</Text>
        <TextInput
          style={styles.input}
          value={userId}
          onChangeText={setUserId}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="demo-user"
        />

        <View style={styles.buttonRow}>
          <Pressable style={styles.button} onPress={onCheckHealth}>
            <Text style={styles.buttonText}>Check API Health</Text>
          </Pressable>
          <Pressable style={styles.button} onPress={onLoadUserData}>
            <Text style={styles.buttonText}>Load User Data</Text>
          </Pressable>
        </View>

        {loading ? <ActivityIndicator size="small" color="#111827" /> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Health</Text>
          <Text style={styles.cardBody}>{health}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>License Status</Text>
          <Text style={styles.cardBody}>
            {license
              ? `${license.status ?? "unknown"} • valid=${license.valid} • ${license.message}`
              : "No data loaded"}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Dashboard Summary</Text>
          <Text style={styles.cardBody}>
            {summary
              ? `Balance: ${summary.balance}\nEquity: ${summary.equity}\nMargin: ${summary.margin}\nRealized PnL: ${summary.daily_realized_pnl}\nUnrealized PnL: ${summary.daily_unrealized_pnl}\nBot Running: ${summary.bot_running}`
              : "No data loaded"}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>In-App Notifications</Text>
          <Text style={styles.cardBody}>
            {notifications.length > 0
              ? notifications.map((item) => `• ${item.title}: ${item.message}`).join("\n")
              : "No notifications"}
          </Text>
        </View>
      </ScrollView>
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  container: {
    padding: 20,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },
  subtitle: {
    fontSize: 14,
    color: "#4B5563",
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
    marginBottom: 4,
  },
  button: {
    flex: 1,
    backgroundColor: "#111827",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    gap: 6,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  cardBody: {
    fontSize: 13,
    lineHeight: 18,
    color: "#374151",
  },
  errorText: {
    color: "#B91C1C",
    fontSize: 13,
  },
});
