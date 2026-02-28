export type HealthResponse = { ok: boolean };

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

export type NotificationItem = {
    id: number;
    event_type: string;
    title: string;
    message: string;
    channel: string;
    created_at: string;
};

const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000";

function endpoint(baseUrl: string, path: string): string {
    return `${baseUrl.replace(/\/$/, "")}${path}`;
}

export async function getHealth(baseUrl: string = DEFAULT_API_BASE_URL): Promise<HealthResponse> {
    const response = await fetch(endpoint(baseUrl, "/health"));
    if (!response.ok) {
        throw new Error(`Health request failed with status ${response.status}`);
    }
    return response.json();
}

export async function getLicenseStatus(
    userId: string,
    baseUrl: string = DEFAULT_API_BASE_URL,
): Promise<LicenseStatusResponse> {
    const response = await fetch(endpoint(baseUrl, `/license/status?user_id=${encodeURIComponent(userId)}`));
    if (!response.ok) {
        throw new Error(`License status request failed with status ${response.status}`);
    }
    return response.json();
}

export async function getDashboardSummary(
    userId: string,
    baseUrl: string = DEFAULT_API_BASE_URL,
): Promise<DashboardSummaryResponse> {
    const response = await fetch(endpoint(baseUrl, `/dashboard/summary?user_id=${encodeURIComponent(userId)}`));
    if (!response.ok) {
        throw new Error(`Dashboard summary request failed with status ${response.status}`);
    }
    return response.json();
}

export async function getNotifications(
    userId: string,
    baseUrl: string = DEFAULT_API_BASE_URL,
): Promise<NotificationItem[]> {
    const response = await fetch(endpoint(baseUrl, `/notifications?user_id=${encodeURIComponent(userId)}&channel=in_app&limit=20`));
    if (!response.ok) {
        throw new Error(`Notifications request failed with status ${response.status}`);
    }
    return response.json();
}

export const ApiDefaults = {
    baseUrl: DEFAULT_API_BASE_URL,
};
