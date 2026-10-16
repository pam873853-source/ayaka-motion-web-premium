import { CONFIG } from './config.js';
import { SupabaseClient } from './supabase.js';
import { AlightMotionAuthBrowser } from './auth.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const appId = typeof __app_id !== 'undefined' ? __app_id : CONFIG.DEFAULT_APP_ID;
const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');

let SUPABASE_URL = localStorage.getItem('supabase_url') || "";
let SUPABASE_KEY = localStorage.getItem('supabase_key') || "";

let app, db, auth, userId = null;
let historyLogs = [];
let totalVisitors = 0;
let reportsLogs = [];
let realTimeChart = null;

let supabase = new SupabaseClient(SUPABASE_URL, SUPABASE_KEY);
const ampAuth = new AlightMotionAuthBrowser();
let activeTabName = 'dashboard';
let verifiedEmailTemp = '';

// --- CHART MANAGEMENT ---
function initActivationChart() {
    const ctx = document.getElementById('activation-chart');
    if (!ctx) return;

    if (realTimeChart) {
        realTimeChart.destroy();
    }

    realTimeChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
            datasets: [{
                label: 'Total Aktivasi',
                data: new Array(12).fill(0),
                borderColor: '#000000',
                backgroundColor: 'rgba(250, 204, 21, 0.45)',
                borderWidth: 3,
                fill: true,
                tension: 0.35,
                pointBackgroundColor: '#facc15',
                pointBorderColor: '#000000',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false }, ticks: { font: { family: 'Inter', size: 10, weight: 'bold' }, color: '#000000' } },
                y: { beginAtZero: true, ticks: { precision: 0, font: { family: 'Inter', size: 10, weight: 'bold' }, color: '#000000' } }
            }
        }
    });

    updateChartData();
}

function updateChartData() {
    if (!realTimeChart) return;
    const monthlyCounts = new Array(12).fill(0);

    historyLogs.forEach(item => {
        if (item.timestamp) {
            const date = new Date(item.timestamp);
            const monthIdx = date.getMonth();
            if (monthIdx >= 0 && monthIdx < 12) {
                monthlyCounts[monthIdx]++;
            }
        }
    });

    realTimeChart.data.datasets[0].data = monthlyCounts;
    realTimeChart.update();
}

// --- RENDER HISTORY & COUNTS ---
function renderHistory() {
    const container = document.getElementById('history-feed-container');
    if (!container) return;

    if (!historyLogs || historyLogs.length === 0) {
        container.innerHTML = `
            <div class="neo-card p-8 text-center space-y-2 bg-white">
                <i class="fa-solid fa-box-open text-3xl text-gray-400"></i>
                <p class="text-xs font-black">Belum Ada Riwayat Aktivasi</p>
            </div>
        `;
        return;
    }

    container.innerHTML = historyLogs.map(item => `
        <div class="neo-card p-3.5 flex items-center justify-between bg-white">
            <div>
                <p class="text-xs font-black">${item.user || 'User'}</p>
                <p class="text-[10px] font-bold text-gray-500">${item.type || 'Premium'}</p>
            </div>
            <span class="px-2.5 py-1 bg-emerald-400 border-2 border-black rounded-lg text-[10px] font-black">
                AKTIF
            </span>
        </div>
    `).join('');
}

function updateCounts() {
    const countActivations = historyLogs.length;
    const actEl = document.getElementById('activations-count');
    const actTotalEl = document.getElementById('act-total-count');
    const actTodayEl = document.getElementById('act-today-count');

    if (actEl) actEl.textContent = countActivations;
    if (actTotalEl) actTotalEl.textContent = countActivations;

    const todayStr = new Date().toDateString();
    const todayCount = historyLogs.filter(h => {
        if (!h.timestamp) return false;
        return new Date(h.timestamp).toDateString() === todayStr;
    }).length;

    if (actTodayEl) actTodayEl.textContent = todayCount;

    const visitorsEl = document.getElementById('visitors-count');
    if (visitorsEl) visitorsEl.textContent = totalVisitors;

    updateChartData();
}

// --- EXPORT FUNCTION TO GLOBAL SCOPE (WINDOW) ---
window.setActiveTab = function(tab) {
    activeTabName = tab;
    ['dashboard', 'aktivasi', 'riwayat', 'laporan'].forEach(t => {
        const view = document.getElementById(`view-${t}`);
        const btn = document.getElementById(`nav-${t}`);
        if (view) view.classList.toggle('hidden', t !== tab);
        if (btn) {
            btn.className = (t === tab) 
                ? "neo-btn-yellow py-2 text-[10px] flex flex-col items-center justify-center gap-0.5" 
                : "neo-btn py-2 text-[10px] flex flex-col items-center justify-center gap-0.5";
        }
    });

    if (tab === 'riwayat') {
        renderHistory();
        setTimeout(() => {
            if (!realTimeChart) {
                initActivationChart();
            } else {
                updateChartData();
            }
        }, 100);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.switchActivationStep = function(step) {
    const s1 = document.getElementById('neo-step-1');
    const s2 = document.getElementById('neo-step-2');
    const b1 = document.getElementById('tab-btn-kirim');
    const b2 = document.getElementById('tab-btn-verifikasi');
    if (step === 1) {
        if (s1) s1.classList.remove('hidden');
        if (s2) s2.classList.add('hidden');
        if (b1) b1.className = "neo-btn-dark py-2.5 text-xs flex items-center justify-center gap-2";
        if (b2) b2.className = "neo-btn py-2.5 text-xs flex items-center justify-center gap-2";
    } else {
        if (s1) s1.classList.add('hidden');
        if (s2) s2.classList.remove('hidden');
        if (b1) b1.className = "neo-btn py-2.5 text-xs flex items-center justify-center gap-2";
        if (b2) b2.className = "neo-btn-dark py-2.5 text-xs flex items-center justify-center gap-2";
    }
};

window.handleSendMagicLink = async function() {
    const emailEl = document.getElementById('amp-email');
    const email = emailEl ? emailEl.value.trim() : '';
    if (!email) {
        showToast("Masukkan email terlebih dahulu!");
        return;
    }
    const btn = document.getElementById('btn-send-link');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i> Mengirim...`;
    }

    const res = await ampAuth.sendMagicLink(email);
    if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> Kirim Magic Link ke Email`;
    }

    if (res.success) {
        verifiedEmailTemp = email;
        showToast("Magic Link berhasil dikirim ke email!");
        window.switchActivationStep(2);
    } else {
        showToast("Gagal: " + res.error);
    }
};

window.handleVerifyAndApply = async function() {
    const emailEl = document.getElementById('amp-email');
    const linkEl = document.getElementById('amp-magic-link');
    const pkgEl = document.getElementById('amp-package');

    const email = verifiedEmailTemp || (emailEl ? emailEl.value.trim() : '');
    const link = linkEl ? linkEl.value.trim() : '';
    const pkg = pkgEl ? pkgEl.value : 'am.full.sub.annual.19q4';

    if (!email || !link) {
        showToast("Email dan Magic Link wajib diisi!");
        return;
    }

    const btn = document.getElementById('btn-verify-apply');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i> Memproses...`;
    }

    const res = await ampAuth.verifyAndApply(email, link, pkg);
    if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-bolt"></i> Verifikasi & Aktifkan Sekarang`;
    }

    if (res.success) {
        showToast("Akun Berhasil Diaktifkan ke Premium!");
        
        const logData = {
            user: email,
            type: pkg.includes('annual') ? '1 Tahun Premium' : '1 Bulan Premium',
            timestamp: Date.now(),
            dateString: new Date().toDateString(),
            sender_id: userId || 'Anonymous'
        };

        // Simpan langsung ke memori lokal agar riwayat muncul seketika
        historyLogs.unshift(logData);
        renderHistory();
        updateCounts();

        // Sync ke Supabase & Firebase
        if (supabase.isConfigured()) {
            await supabase.addActivation(logData);
        }

        if (db && userId) {
            try {
                await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'activations'), logData);
            } catch (e) {
                console.error("Firestore sync error:", e);
            }
        }

        if (emailEl) emailEl.value = '';
        if (linkEl) linkEl.value = '';
        window.switchActivationStep(1);
    } else {
        showToast("Gagal: " + res.error);
    }
};

window.clearHistoryFeed = function() {
    if (confirm("Hapus seluruh riwayat lokal?")) {
        historyLogs = [];
        renderHistory();
        updateCounts();
        showToast("Riwayat dibersihkan.");
    }
};

window.saveSupabaseConfig = function() {
    const urlInput = document.getElementById('supabase-url').value.trim();
    const keyInput = document.getElementById('supabase-key').value.trim();

    if (!urlInput || !keyInput) {
        showToast("URL & Key Supabase wajib diisi!");
        return;
    }

    localStorage.setItem('supabase_url', urlInput);
    localStorage.setItem('supabase_key', keyInput);
    SUPABASE_URL = urlInput;
    SUPABASE_KEY = keyInput;
    supabase = new SupabaseClient(SUPABASE_URL, SUPABASE_KEY);

    checkSupabaseStatus();
    syncSupabaseActivations();
    showToast("Konfigurasi Supabase Tersimpan!");
};

function checkSupabaseStatus() {
    const badge = document.getElementById('supabase-status-badge');
    if (!badge) return;
    if (supabase.isConfigured()) {
        badge.textContent = "TERHUBUNG";
        badge.className = "text-[10px] font-black px-2 py-0.5 rounded bg-emerald-300 text-emerald-900 border border-black";
    } else {
        badge.textContent = "STANDBY";
        badge.className = "text-[10px] font-black px-2 py-0.5 rounded bg-gray-200 text-gray-700";
    }
}

async function syncSupabaseActivations() {
    if (supabase.isConfigured()) {
        const sbData = await supabase.getActivations();
        if (sbData && sbData.length > 0) {
            historyLogs = sbData;
            historyLogs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            updateCounts();
            if (activeTabName === 'riwayat') {
                renderHistory();
            }
        }
    }
}

function showToast(msg) {
    const toast = document.getElementById('toast-notif');
    const msgEl = document.getElementById('toast-message');
    if (!toast || !msgEl) return;
    msgEl.textContent = msg;
    toast.classList.remove('opacity-0', 'pointer-events-none');
    setTimeout(() => toast.classList.add('opacity-0', 'pointer-events-none'), 3000);
}

// --- WIDGET & RUNTIME INIT ---
let startTime = localStorage.getItem('ayaka_uptime_start');
if (!startTime) {
    startTime = Date.now();
    localStorage.setItem('ayaka_uptime_start', startTime);
} else {
    startTime = parseInt(startTime, 10);
}

function updateLiveWidgets() {
    const now = new Date();
    const clockEl = document.getElementById('live-clock');
    if (clockEl) clockEl.textContent = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const elapsedSec = Math.floor((Date.now() - startTime) / 1000);
    const mins = Math.floor(elapsedSec / 60).toString().padStart(2, '0');
    const secs = (elapsedSec % 60).toString().padStart(2, '0');
    const uptimeEl = document.getElementById('live-uptime');
    if (uptimeEl) uptimeEl.textContent = `${mins}:${secs}`;
}

setInterval(updateLiveWidgets, 1000);
updateLiveWidgets();
syncSupabaseActivations();
