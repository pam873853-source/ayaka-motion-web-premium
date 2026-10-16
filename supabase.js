// Supabase Client Helper (Mendukung Service Key / SBP)
export class SupabaseClient {
    constructor(url, key) {
        this.url = url ? url.replace(/\/$/, '') : '';
        this.key = key;
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
            const cutoff = new Date(Date.now() - 30000).toISOString();
            const res = await fetch(`${this.url}/rest/v1/visitors?select=visitor_id&last_seen=gt.${cutoff}`, {
                headers: await this.headers()
            });
            if (res.ok) {
                const data = await res.json();
                return data.length;
            }
        } catch (e) {
            console.error("Supabase active visitors error:", e);
        }
        return null;
    }
}
