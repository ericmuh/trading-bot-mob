export type HealthResponse = { ok: boolean };

export type AuthSession = {
    user_id: string;
    email: string;
    access_token: string;
};

export type LicenseStatusResponse = {
    user_id: string;
    has_license: boolean;
    valid: boolean;
    status?: string;
    message: string;
    license_key?: string;
    expires_at?: string;
};

export type DashboardSummaryResponse = {
    user_id: string;
    balance: number;
    equity: number;
    margin: number;
    daily_realized_pnl: number;
    daily_unrealized_pnl: number;
    bot_running: boolean;
};

export type BotStatusResponse = {
    user_id: string;
    running: boolean;
    started_at?: string;
    trades_opened_this_session: number;
    stop_reason?: string;
};

export type DailyPnlResponse = {
    user_id: string;
    realized_pnl: number;
    unrealized_pnl: number;
    total_pnl: number;
};

export type OpenTradeItem = {
    id: number;
    symbol: string;
    side: string;
    quantity: number;
    entry_price: number;
    opened_at: string;
};

export type ClosedTradeItem = {
    id: number;
    symbol: string;
    side: string;
    quantity: number;
    entry_price: number;
    close_price: number;
    pnl: number;
    close_reason: string;
    opened_at: string;
    closed_at: string;
};

export type NotificationItem = {
    id: number;
    event_type: string;
    title: string;
    message: string;
    channel: string;
    created_at: string;
};

export type LatencyMetricStats = {
    count: number;
    p50: number;
    p95: number;
    p99: number;
};

export type LatencyMetricsResponse = Record<string, LatencyMetricStats>;

export type MT5ConnectTestRequest = {
    login: string;
    password: string;
    server: string;
    timeout_ms?: number;
};

export type MT5ConnectTestResponse = {
    status: "validated" | "failed" | "provider_unavailable";
    provider: string;
    latency_ms: number;
    message: string;
};

export type MT5AccountSaveRequest = {
    user_id: string;
    login: string;
    password: string;
    server: string;
    broker?: string;
    timeout_ms?: number;
};

export type TradingConfigRequest = {
    user_id: string;
    assets: string[];
    timeframe: "M1" | "M5";
    max_trades_per_session: number;
    quantity: number;
    profit_threshold: number;
    loss_threshold: number;
};

export type RiskConfigRequest = {
    user_id: string;
    daily_profit_target: number;
    daily_loss_limit: number;
    allocated_capital: number;
};

export type SessionConfigRequest = {
    user_id: string;
    duration_minutes: number;
};

const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000";

function endpoint(baseUrl: string, path: string): string {
    return `${baseUrl.replace(/\/$/, "")}${path}`;
}

async function parseError(response: Response, fallback: string): Promise<never> {
    try {
        const payload = await response.json();
        if (payload?.detail) {
            throw new Error(String(payload.detail));
        }
    } catch {
        throw new Error(fallback);
    }
    throw new Error(fallback);
}

export async function loginUser(email: string, password: string): Promise<AuthSession> {
    if (!email.trim() || !password.trim()) {
        throw new Error("Email and password are required");
    }
    return {
        user_id: email.trim().toLowerCase().replace(/[^a-z0-9]/g, "-") || "user",
        email: email.trim(),
        access_token: "demo-session-token",
    };
}

export async function getHealth(baseUrl: string = DEFAULT_API_BASE_URL): Promise<HealthResponse> {
    const response = await fetch(endpoint(baseUrl, "/health"));
    if (!response.ok) {
        await parseError(response, `Health request failed with status ${response.status}`);
    }
    return response.json();
}

export async function getLicenseStatus(
    userId: string,
    baseUrl: string = DEFAULT_API_BASE_URL,
): Promise<LicenseStatusResponse> {
    const response = await fetch(endpoint(baseUrl, `/license/status?user_id=${encodeURIComponent(userId)}`));
    if (!response.ok) {
        await parseError(response, `License status request failed with status ${response.status}`);
    }
    return response.json();
}

export async function getDashboardSummary(
    userId: string,
    baseUrl: string = DEFAULT_API_BASE_URL,
): Promise<DashboardSummaryResponse> {
    const response = await fetch(endpoint(baseUrl, `/summary?user_id=${encodeURIComponent(userId)}`));
    if (!response.ok) {
        await parseError(response, `Dashboard summary request failed with status ${response.status}`);
    }
    return response.json();
}

export async function getNotifications(
    userId: string,
    baseUrl: string = DEFAULT_API_BASE_URL,
): Promise<NotificationItem[]> {
    const response = await fetch(endpoint(baseUrl, `/notifications?user_id=${encodeURIComponent(userId)}&channel=in_app&limit=20`));
    if (!response.ok) {
        await parseError(response, `Notifications request failed with status ${response.status}`);
    }
    return response.json();
}

export async function getBotStatus(
    userId: string,
    baseUrl: string = DEFAULT_API_BASE_URL,
): Promise<BotStatusResponse> {
    const response = await fetch(endpoint(baseUrl, `/bot/status?user_id=${encodeURIComponent(userId)}`));
    if (!response.ok) {
        await parseError(response, `Bot status request failed with status ${response.status}`);
    }
    return response.json();
}

export async function getDailyPnl(
    userId: string,
    baseUrl: string = DEFAULT_API_BASE_URL,
): Promise<DailyPnlResponse> {
    const response = await fetch(endpoint(baseUrl, `/pnl/daily?user_id=${encodeURIComponent(userId)}`));
    if (!response.ok) {
        await parseError(response, `Daily PnL request failed with status ${response.status}`);
    }
    return response.json();
}

export async function getOpenTrades(
    userId: string,
    baseUrl: string = DEFAULT_API_BASE_URL,
): Promise<OpenTradeItem[]> {
    const response = await fetch(endpoint(baseUrl, `/trades/open?user_id=${encodeURIComponent(userId)}`));
    if (!response.ok) {
        await parseError(response, `Open trades request failed with status ${response.status}`);
    }
    return response.json();
}

export async function getClosedTrades(
    userId: string,
    baseUrl: string = DEFAULT_API_BASE_URL,
    limit: number = 20,
): Promise<ClosedTradeItem[]> {
    const response = await fetch(
        endpoint(baseUrl, `/trades/closed?user_id=${encodeURIComponent(userId)}&limit=${limit}`),
    );
    if (!response.ok) {
        await parseError(response, `Closed trades request failed with status ${response.status}`);
    }
    return response.json();
}

export async function getLatencyMetrics(baseUrl: string = DEFAULT_API_BASE_URL): Promise<LatencyMetricsResponse> {
    const response = await fetch(endpoint(baseUrl, "/metrics/latency"));
    if (!response.ok) {
        await parseError(response, `Latency metrics request failed with status ${response.status}`);
    }
    return response.json();
}

export async function connectMT5(
    payload: MT5ConnectTestRequest,
    baseUrl: string = DEFAULT_API_BASE_URL,
): Promise<MT5ConnectTestResponse> {
    const response = await fetch(endpoint(baseUrl, "/mt5/connect-test"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        await parseError(response, `MT5 connect test failed with status ${response.status}`);
    }
    return response.json();
}

export async function saveMT5Account(
    payload: MT5AccountSaveRequest,
    baseUrl: string = DEFAULT_API_BASE_URL,
): Promise<void> {
    const response = await fetch(endpoint(baseUrl, "/mt5/account"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        await parseError(response, `Saving MT5 account failed with status ${response.status}`);
    }
}

export async function saveTradingConfig(
    payload: TradingConfigRequest,
    baseUrl: string = DEFAULT_API_BASE_URL,
): Promise<void> {
    const response = await fetch(endpoint(baseUrl, "/trading/config"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        await parseError(response, `Saving trading settings failed with status ${response.status}`);
    }
}

export async function saveRiskConfig(
    payload: RiskConfigRequest,
    baseUrl: string = DEFAULT_API_BASE_URL,
): Promise<void> {
    const response = await fetch(endpoint(baseUrl, "/risk/config"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        await parseError(response, `Saving risk settings failed with status ${response.status}`);
    }
}

export async function saveSessionConfig(
    payload: SessionConfigRequest,
    baseUrl: string = DEFAULT_API_BASE_URL,
): Promise<void> {
    const response = await fetch(endpoint(baseUrl, "/session/config"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        await parseError(response, `Saving session settings failed with status ${response.status}`);
    }
}

export async function activateLicense(
    userId: string,
    licenseKey: string,
    baseUrl: string = DEFAULT_API_BASE_URL,
): Promise<void> {
    if (!licenseKey.trim()) {
        return;
    }
    const response = await fetch(endpoint(baseUrl, "/license/activate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, license_key: licenseKey.trim() }),
    });
    if (!response.ok) {
        await parseError(response, `License activation failed with status ${response.status}`);
    }
}

export async function startBot(userId: string, baseUrl: string = DEFAULT_API_BASE_URL): Promise<BotStatusResponse> {
    const response = await fetch(endpoint(baseUrl, `/bot/start?user_id=${encodeURIComponent(userId)}`), {
        method: "POST",
    });
    if (!response.ok) {
        await parseError(response, `Start bot failed with status ${response.status}`);
    }
    return response.json();
}

export async function stopBot(userId: string, baseUrl: string = DEFAULT_API_BASE_URL): Promise<BotStatusResponse> {
    const response = await fetch(endpoint(baseUrl, `/bot/stop?user_id=${encodeURIComponent(userId)}`), {
        method: "POST",
    });
    if (!response.ok) {
        await parseError(response, `Stop bot failed with status ${response.status}`);
    }
    return response.json();
}

export const ApiDefaults = {
    baseUrl: DEFAULT_API_BASE_URL,
};
