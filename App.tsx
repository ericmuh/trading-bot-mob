import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  ApiDefaults,
  BotStatusResponse,
  ClosedTradeItem,
  DashboardSummaryResponse,
  LicenseStatusResponse,
  NotificationItem,
  connectMT5,
  getBotStatus,
  getClosedTrades,
  getDashboardSummary,
  getHealth,
  getLicenseStatus,
  getNotifications,
  loginUser,
  saveMT5Account,
  saveRiskConfig,
  saveSessionConfig,
  saveTradingConfig,
  startBot,
  stopBot,
  activateLicense,
} from "./src/api";

type JourneyStep = "login" | "onboarding" | "connect" | "configure" | "home";

export default function App() {
  const [step, setStep] = useState<JourneyStep>("login");
  const [apiBaseUrl, setApiBaseUrl] = useState(ApiDefaults.baseUrl);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [email, setEmail] = useState("demo@apex.app");
  const [password, setPassword] = useState("password123");
  const [userId, setUserId] = useState("demo-user");

  const [onboardingPage, setOnboardingPage] = useState(0);

  const [broker, setBroker] = useState("Demo Broker");
  const [mt5Login, setMt5Login] = useState("123456");
  const [mt5Password, setMt5Password] = useState("password");
  const [mt5Server, setMt5Server] = useState("MetaQuotes-Demo");

  const [symbols, setSymbols] = useState("XAUUSD,EURUSD");
  const [timeframe, setTimeframe] = useState<"M1" | "M5">("M1");
  const [quantity, setQuantity] = useState("1");
  const [maxTrades, setMaxTrades] = useState("10");
  const [profitTarget, setProfitTarget] = useState("0.30");
  const [lossLimit, setLossLimit] = useState("0.25");
  const [allocatedCapital, setAllocatedCapital] = useState("50");
  const [sessionMinutes, setSessionMinutes] = useState("120");
  const [licenseKey, setLicenseKey] = useState("");

  const [health, setHealth] = useState<"healthy" | "unhealthy" | "unknown">("unknown");
  const [license, setLicense] = useState<LicenseStatusResponse | null>(null);
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [botStatus, setBotStatus] = useState<BotStatusResponse | null>(null);
  const [closedTrades, setClosedTrades] = useState<ClosedTradeItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const onboardingSlides = useMemo(
    () => [
      {
        title: "Safe by default",
        body: "Built-in daily limits and capital guards stop risky behavior automatically.",
      },
      {
        title: "Connect MT5 in minutes",
        body: "Add broker, login, password, and server to securely link your account.",
      },
      {
        title: "AI-filtered scalping",
        body: "Trades are only executed when confidence and market conditions are acceptable.",
      },
    ],
    [],
  );

  const healthColor = health === "healthy" ? "#22C55E" : health === "unhealthy" ? "#EF4444" : "#A1A1AA";

  function resetFeedback(): void {
    setError(null);
    setSuccessMessage(null);
  }

  async function run<T>(task: () => Promise<T>): Promise<T | null> {
    try {
      setLoading(true);
      resetFeedback();
      return await task();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Something went wrong");
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(): Promise<void> {
    const session = await run(() => loginUser(email, password));
    if (!session) {
      return;
    }
    setUserId(session.user_id);
    setSuccessMessage("Logged in successfully");
    setStep("onboarding");
  }

  function handleSkipOnboarding(): void {
    resetFeedback();
    setStep("connect");
  }

  function handleNextOnboarding(): void {
    if (onboardingPage >= onboardingSlides.length - 1) {
      setStep("connect");
      return;
    }
    setOnboardingPage((page) => page + 1);
  }

  async function handleConnectMT5(): Promise<void> {
    const validation = await run(() =>
      connectMT5(
        {
          login: mt5Login.trim(),
          password: mt5Password,
          server: mt5Server.trim(),
        },
        apiBaseUrl,
      ),
    );
    if (!validation) {
      return;
    }

    if (validation.status === "failed") {
      setError(validation.message);
      return;
    }

    const saveOk = await run(() =>
      saveMT5Account(
        {
          user_id: userId,
          broker: broker.trim(),
          login: mt5Login.trim(),
          password: mt5Password,
          server: mt5Server.trim(),
        },
        apiBaseUrl,
      ),
    );

    if (saveOk === null) {
      return;
    }

    setSuccessMessage("MT5 account connected");
    setStep("configure");
  }

  async function handleSaveConfiguration(): Promise<void> {
    const assetList = symbols
      .split(",")
      .map((item) => item.trim().toUpperCase())
      .filter(Boolean);

    if (!assetList.length) {
      setError("Add at least one symbol (e.g. XAUUSD)");
      return;
    }

    const tradeSaved = await run(() =>
      saveTradingConfig(
        {
          user_id: userId,
          assets: assetList,
          timeframe,
          max_trades_per_session: Number(maxTrades),
          quantity: Number(quantity),
          profit_threshold: Number(profitTarget),
          loss_threshold: -Math.abs(Number(lossLimit)),
        },
        apiBaseUrl,
      ),
    );
    if (tradeSaved === null) {
      return;
    }

    const riskSaved = await run(() =>
      saveRiskConfig(
        {
          user_id: userId,
          daily_profit_target: Number(profitTarget),
          daily_loss_limit: Math.abs(Number(lossLimit)),
          allocated_capital: Number(allocatedCapital),
        },
        apiBaseUrl,
      ),
    );
    if (riskSaved === null) {
      return;
    }

    const sessionSaved = await run(() =>
      saveSessionConfig(
        {
          user_id: userId,
          duration_minutes: Number(sessionMinutes),
        },
        apiBaseUrl,
      ),
    );
    if (sessionSaved === null) {
      return;
    }

    if (licenseKey.trim()) {
      const activated = await run(() => activateLicense(userId, licenseKey, apiBaseUrl));
      if (activated === null) {
        return;
      }
    }

    setSuccessMessage("Configuration saved");
    setStep("home");
    await refreshHome();
  }

  async function refreshHome(): Promise<void> {
    const result = await run(async () => {
      const [healthResult, licenseResult, summaryResult, botResult, closedResult, notificationsResult] =
        await Promise.all([
          getHealth(apiBaseUrl),
          getLicenseStatus(userId, apiBaseUrl),
          getDashboardSummary(userId, apiBaseUrl),
          getBotStatus(userId, apiBaseUrl),
          getClosedTrades(userId, apiBaseUrl, 10),
          getNotifications(userId, apiBaseUrl),
        ]);

      return {
        healthResult,
        licenseResult,
        summaryResult,
        botResult,
        closedResult,
        notificationsResult,
      };
    });

    if (!result) {
      setHealth("unhealthy");
      return;
    }

    setHealth(result.healthResult.ok ? "healthy" : "unhealthy");
    setLicense(result.licenseResult);
    setSummary(result.summaryResult);
    setBotStatus(result.botResult);
    setClosedTrades(result.closedResult);
    setNotifications(result.notificationsResult);
  }

  async function handleStartBot(): Promise<void> {
    const result = await run(() => startBot(userId, apiBaseUrl));
    if (!result) {
      return;
    }
    setSuccessMessage("Bot started");
    setBotStatus(result);
    await refreshHome();
  }

  async function handleStopBot(): Promise<void> {
    const result = await run(() => stopBot(userId, apiBaseUrl));
    if (!result) {
      return;
    }
    setSuccessMessage("Bot stopped");
    setBotStatus(result);
    await refreshHome();
  }

  function renderFeedback() {
    return (
      <>
        {loading ? <ActivityIndicator size="small" color="#A78BFA" style={styles.feedbackSpinner} /> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}
      </>
    );
  }

  if (step === "login") {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />
        <View style={styles.centerContainer}>
          <View style={styles.authCard}>
            <Text style={styles.brandTitle}>Apex Scalper</Text>
            <Text style={styles.brandSubtitle}>Login to secure your trading journey</Text>

            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="you@example.com"
              placeholderTextColor="#6B7280"
            />

            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor="#6B7280"
            />

            <Text style={styles.inputLabel}>API URL</Text>
            <TextInput
              style={styles.input}
              value={apiBaseUrl}
              onChangeText={setApiBaseUrl}
              autoCapitalize="none"
              placeholder="http://127.0.0.1:8000"
              placeholderTextColor="#6B7280"
            />

            <Pressable style={styles.primaryButton} onPress={handleLogin}>
              <Text style={styles.primaryButtonText}>Login & Continue</Text>
            </Pressable>
            {renderFeedback()}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (step === "onboarding") {
    const current = onboardingSlides[onboardingPage];
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />
        <View style={styles.centerContainer}>
          <View style={styles.authCard}>
            <Text style={styles.progressText}>Step {onboardingPage + 1} of {onboardingSlides.length}</Text>
            <Text style={styles.onboardingTitle}>{current.title}</Text>
            <Text style={styles.onboardingBody}>{current.body}</Text>

            <View style={styles.rowButtons}>
              <Pressable style={styles.ghostButton} onPress={handleSkipOnboarding}>
                <Text style={styles.ghostButtonText}>Skip</Text>
              </Pressable>
              <Pressable style={styles.primaryButton} onPress={handleNextOnboarding}>
                <Text style={styles.primaryButtonText}>
                  {onboardingPage === onboardingSlides.length - 1 ? "Finish" : "Next"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (step === "connect") {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />
        <FlatList
          data={[]}
          contentContainerStyle={styles.container}
          renderItem={undefined as never}
          ListHeaderComponent={
            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Connect MT5 Account</Text>
              <Text style={styles.panelLine}>Add your broker account to continue setup.</Text>

              <Text style={styles.inputLabel}>Broker</Text>
              <TextInput style={styles.input} value={broker} onChangeText={setBroker} placeholderTextColor="#6B7280" />

              <Text style={styles.inputLabel}>MT5 Login</Text>
              <TextInput
                style={styles.input}
                value={mt5Login}
                onChangeText={setMt5Login}
                keyboardType="numeric"
                placeholderTextColor="#6B7280"
              />

              <Text style={styles.inputLabel}>MT5 Password</Text>
              <TextInput
                style={styles.input}
                value={mt5Password}
                onChangeText={setMt5Password}
                secureTextEntry
                placeholderTextColor="#6B7280"
              />

              <Text style={styles.inputLabel}>Server</Text>
              <TextInput style={styles.input} value={mt5Server} onChangeText={setMt5Server} placeholderTextColor="#6B7280" />

              <Pressable style={styles.primaryButton} onPress={handleConnectMT5}>
                <Text style={styles.primaryButtonText}>Validate & Connect</Text>
              </Pressable>
              {renderFeedback()}
            </View>
          }
        />
      </SafeAreaView>
    );
  }

  if (step === "configure") {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />
        <FlatList
          data={[]}
          contentContainerStyle={styles.container}
          renderItem={undefined as never}
          ListHeaderComponent={
            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Configure Bot</Text>
              <Text style={styles.panelLine}>Set trading, risk, and session rules before going live.</Text>

              <Text style={styles.inputLabel}>Symbols (comma separated)</Text>
              <TextInput style={styles.input} value={symbols} onChangeText={setSymbols} placeholderTextColor="#6B7280" />

              <Text style={styles.inputLabel}>Timeframe</Text>
              <View style={styles.rowButtons}>
                <Pressable
                  style={[styles.optionButton, timeframe === "M1" && styles.optionButtonActive]}
                  onPress={() => setTimeframe("M1")}
                >
                  <Text style={[styles.optionText, timeframe === "M1" && styles.optionTextActive]}>M1</Text>
                </Pressable>
                <Pressable
                  style={[styles.optionButton, timeframe === "M5" && styles.optionButtonActive]}
                  onPress={() => setTimeframe("M5")}
                >
                  <Text style={[styles.optionText, timeframe === "M5" && styles.optionTextActive]}>M5</Text>
                </Pressable>
              </View>

              <Text style={styles.inputLabel}>Quantity</Text>
              <TextInput style={styles.input} value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" placeholderTextColor="#6B7280" />

              <Text style={styles.inputLabel}>Max trades/session</Text>
              <TextInput style={styles.input} value={maxTrades} onChangeText={setMaxTrades} keyboardType="numeric" placeholderTextColor="#6B7280" />

              <Text style={styles.inputLabel}>Daily profit target</Text>
              <TextInput style={styles.input} value={profitTarget} onChangeText={setProfitTarget} keyboardType="decimal-pad" placeholderTextColor="#6B7280" />

              <Text style={styles.inputLabel}>Daily loss limit</Text>
              <TextInput style={styles.input} value={lossLimit} onChangeText={setLossLimit} keyboardType="decimal-pad" placeholderTextColor="#6B7280" />

              <Text style={styles.inputLabel}>Allocated capital</Text>
              <TextInput
                style={styles.input}
                value={allocatedCapital}
                onChangeText={setAllocatedCapital}
                keyboardType="decimal-pad"
                placeholderTextColor="#6B7280"
              />

              <Text style={styles.inputLabel}>Session duration (minutes)</Text>
              <TextInput
                style={styles.input}
                value={sessionMinutes}
                onChangeText={setSessionMinutes}
                keyboardType="numeric"
                placeholderTextColor="#6B7280"
              />

              <Text style={styles.inputLabel}>License key (optional)</Text>
              <TextInput style={styles.input} value={licenseKey} onChangeText={setLicenseKey} placeholderTextColor="#6B7280" />

              <Pressable style={styles.primaryButton} onPress={handleSaveConfiguration}>
                <Text style={styles.primaryButtonText}>Save & Open Home</Text>
              </Pressable>
              {renderFeedback()}
            </View>
          }
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.container}
        data={notifications.slice(0, 10)}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={
          <>
            <View style={styles.heroCard}>
              <View style={styles.heroTopRow}>
                <View>
                  <Text style={styles.heroTitle}>Welcome back</Text>
                  <Text style={styles.heroSubtitle}>{userId}</Text>
                </View>
                <View style={styles.healthBadge}>
                  <View style={[styles.healthDot, { backgroundColor: healthColor }]} />
                  <Text style={styles.healthLabel}>{health.toUpperCase()}</Text>
                </View>
              </View>

              <View style={styles.rowButtons}>
                <Pressable style={styles.ghostButton} onPress={refreshHome}>
                  <Text style={styles.ghostButtonText}>Refresh</Text>
                </Pressable>
                <Pressable style={styles.primaryButton} onPress={botStatus?.running ? handleStopBot : handleStartBot}>
                  <Text style={styles.primaryButtonText}>{botStatus?.running ? "Stop Bot" : "Start Bot"}</Text>
                </Pressable>
              </View>
              {renderFeedback()}
            </View>

            <View style={styles.metricsRow}>
              <MetricCard label="Balance" value={summary ? `$${summary.balance.toFixed(2)}` : "—"} />
              <MetricCard label="Equity" value={summary ? `$${summary.equity.toFixed(2)}` : "—"} />
            </View>
            <View style={styles.metricsRow}>
              <MetricCard label="Margin" value={summary ? `$${summary.margin.toFixed(2)}` : "—"} />
              <MetricCard label="Bot" value={botStatus?.running ? "Active" : "Stopped"} />
            </View>

            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Account & License</Text>
              <Text style={styles.panelLine}>License: {license?.status ?? "unknown"}</Text>
              <Text style={styles.panelLine}>Valid: {license?.valid ? "Yes" : "No"}</Text>
            </View>

            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Recent Closed Trades</Text>
              {closedTrades.length ? (
                closedTrades.slice(0, 4).map((trade) => (
                  <Text key={trade.id} style={styles.panelLine}>
                    {trade.symbol} {trade.side} • PnL {trade.pnl.toFixed(4)}
                  </Text>
                ))
              ) : (
                <Text style={styles.panelLine}>No closed trades yet.</Text>
              )}
            </View>

            <Text style={styles.sectionTitle}>Notifications</Text>
          </>
        }
        renderItem={({ item }) => (
          <View style={styles.notificationCard}>
            <Text style={styles.notificationTitle}>{item.title}</Text>
            <Text style={styles.notificationBody}>{item.message}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.panelLine}>No notifications available.</Text>}
      />
    </SafeAreaView>
  );
}

type MetricCardProps = {
  label: string;
  value: string;
};

function MetricCard({ label, value }: MetricCardProps) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#05070B",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    padding: 18,
  },
  list: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 28,
    gap: 12,
  },
  authCard: {
    backgroundColor: "#0B1020",
    borderColor: "#1F2937",
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    gap: 10,
  },
  brandTitle: {
    color: "#F8FAFC",
    fontSize: 26,
    fontWeight: "700",
  },
  brandSubtitle: {
    color: "#9CA3AF",
    fontSize: 13,
    marginBottom: 8,
  },
  progressText: {
    color: "#A78BFA",
    fontSize: 12,
    fontWeight: "700",
  },
  onboardingTitle: {
    color: "#F8FAFC",
    fontSize: 22,
    fontWeight: "700",
  },
  onboardingBody: {
    color: "#CBD5E1",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 10,
  },
  inputLabel: {
    color: "#CBD5E1",
    fontSize: 13,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: "#374151",
    borderRadius: 12,
    backgroundColor: "#111827",
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    color: "#F8FAFC",
  },
  rowButtons: {
    flexDirection: "row",
    gap: 8,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: "#8B5CF6",
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "700",
  },
  ghostButton: {
    flex: 1,
    borderColor: "#374151",
    borderWidth: 1,
    backgroundColor: "#111827",
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  ghostButtonText: {
    color: "#E5E7EB",
    fontSize: 14,
    fontWeight: "600",
  },
  optionButton: {
    flex: 1,
    borderColor: "#374151",
    borderWidth: 1,
    backgroundColor: "#111827",
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  optionButtonActive: {
    borderColor: "#8B5CF6",
    backgroundColor: "#2E1065",
  },
  optionText: {
    color: "#E5E7EB",
    fontSize: 14,
    fontWeight: "600",
  },
  optionTextActive: {
    color: "#DDD6FE",
  },
  heroCard: {
    backgroundColor: "#0B1020",
    borderColor: "#1F2937",
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 10,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroTitle: {
    color: "#F8FAFC",
    fontSize: 22,
    fontWeight: "700",
  },
  heroSubtitle: {
    color: "#9CA3AF",
    fontSize: 12,
  },
  healthBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#111827",
    borderColor: "#1F2937",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  healthDot: {
    width: 8,
    height: 8,
    borderRadius: 99,
  },
  healthLabel: {
    color: "#E5E7EB",
    fontSize: 11,
    fontWeight: "700",
  },
  metricsRow: {
    flexDirection: "row",
    gap: 10,
  },
  metricCard: {
    flex: 1,
    backgroundColor: "#0B1020",
    borderColor: "#1F2937",
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  metricLabel: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
  },
  metricValue: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "700",
    marginTop: 4,
  },
  panel: {
    backgroundColor: "#0B1020",
    borderColor: "#1F2937",
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 6,
  },
  panelTitle: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "700",
  },
  panelLine: {
    color: "#CBD5E1",
    fontSize: 13,
  },
  sectionTitle: {
    color: "#E2E8F0",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 4,
  },
  notificationCard: {
    backgroundColor: "#0A0F1D",
    borderColor: "#1F2937",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 4,
  },
  notificationTitle: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "700",
  },
  notificationBody: {
    color: "#CBD5E1",
    fontSize: 13,
    lineHeight: 18,
  },
  feedbackSpinner: {
    marginTop: 6,
  },
  errorText: {
    color: "#FCA5A5",
    fontSize: 13,
    marginTop: 6,
  },
  successText: {
    color: "#86EFAC",
    fontSize: 13,
    marginTop: 6,
  },
});
