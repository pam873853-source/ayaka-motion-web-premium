// Supabase Client Helper
export class SupabaseClient {
    constructor(url, key) {
        // Masukkan URL dan Key Anda langsung di bawah ini:
        const DEFAULT_URL = "https://wfcreovzuyurqhnlxoxp.supabase.co"; // Ganti dengan URL Supabase Anda
        const DEFAULT_KEY = "sb_publishable_J0QIsciVhceCpBZbodJWtA_vaDQqL5X...";     // Ganti dengan API Key Supabase Anda

        const activeUrl = url || localStorage.getItem('supabase_url') || DEFAULT_URL;
        const activeKey = key || localStorage.getItem('supabase_key') || DEFAULT_KEY;

        this.url = activeUrl ? activeUrl.replace(/\/$/, '') : '';
        this.key = activeKey;
    }

    isConfigured() {
        return this.url.includes("supabase.co") && this.key.length > 20;
    }

    async headers() {
        return {
            'apikey': this.key,
            'Authorization': `Bearer ${this.key}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        };
    }

    async addActivation(logData) {
        if (!this.isConfigured()) return;
        try {
            await fetch(`${this.url}/rest/v1/activations`, {
                method: 'POST',
                headers: await this.headers(),
                body: JSON.stringify(logData)
            });
        } catch (e) {
            console.error("Supabase addActivation error:", e);
        }
    }

    async getActivations() {
        if (!this.isConfigured()) return null;
        try {
            const res = await fetch(`${this.url}/rest/v1/activations?select=*&order=timestamp.desc`, {
                headers: await this.headers()
            });
            if (res.ok) {
                return await res.json();
            }
        } catch (e) {
            console.error("Supabase getActivations error:", e);
        }
        return null;
    }

    async addReport(reportData) {
        if (!this.isConfigured()) return;
        try {
            await fetch(`${this.url}/rest/v1/reports`, {
                method: 'POST',
                headers: await this.headers(),
                body: JSON.stringify(reportData)
            });
        } catch (e) {
            console.error("Supabase addReport error:", e);
        }
    }

    async getReports() {
        if (!this.isConfigured()) return null;
        try {
            const res = await fetch(`${this.url}/rest/v1/reports?select=*&order=created_at.desc`, {
                headers: await this.headers()
            });
            if (res.ok) {
                return await res.json();
            }
        } catch (e) {
            console.error("Supabase getReports error:", e);
        }
        return null;
    }

    async updatePresence(visitorId) {
        if (!this.isConfigured()) return;
        try {
            await fetch(`${this.url}/rest/v1/visitors`, {
                method: 'POST',
                headers: {
                    ...(await this.headers()),
                    'Prefer': 'resolution=merge-duplicates'
                },
                body: JSON.stringify({
                    visitor_id: visitorId,
                    last_seen: new Date().toISOString()
                })
            });
        } catch (e) {
            console.error("Supabase presence error:", e);
        }
    }

    async getActiveVisitors() {
        if (!this.isConfigured()) return null;
        try {
            const res = await fetch(`${this.url}/rest/v1/visitors?select=visitor_id,last_seen`, {
                headers: await this.headers()
            });
            if (res.ok) {
                const data = await res.json();
                const now = Date.now();
                const activeCount = data.filter(v => {
                    const lastSeenTime = new Date(v.last_seen).getTime();
                    return (now - lastSeenTime) <= 60000;
                }).length;
                return Math.max(activeCount, 1);
            }
        } catch (e) {
            console.error("Supabase active visitors error:", e);
        }
        return null;
    }
}
