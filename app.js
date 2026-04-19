/* ===============================================================
   TRADINGPRO - MAIN APPLICATION ENTRY POINT
   Versi: 2.0.0 | Inisialisasi semua modul, keyboard shortcut, menu, tema, integrasi
   =============================================================== */

/**
 * MODUL INI ADALAH INTI APLIKASI:
 * ✅ Menginisialisasi semua modul (DataManager, AuthManager, DashboardManager, dll)
 * ✅ Menyediakan navigasi menu (sidebar atau topbar)
 * ✅ Keyboard shortcuts (Ctrl+D untuk deposit, Ctrl+W untuk withdraw, dll)
 * ✅ Pengaturan tema (dark/light/system)
 * ✅ Menampilkan notifikasi broadcast dari admin
 * ✅ Auto-save & auto-refresh
 * ✅ Menampilkan versi aplikasi
 * ✅ Integrasi antar modul (Chart, Market, Trading, Trending, Admin, Modal)
 */

(function() {
    'use strict';

    // ========================== KONFIGURASI ==========================
    const APP_CONFIG = {
        version: '2.0.0',
        buildDate: '2025-04-19',
        appName: 'TradingPro',
        autoRefreshInterval: 60000,     // 1 menit
        broadcastCheckInterval: 10000,   // cek broadcast tiap 10 detik
        enableKeyboardShortcuts: true,
        defaultTheme: 'dark'
    };

    // ========================== STATE ==========================
    let isInitialized = false;
    let autoRefreshTimer = null;
    let broadcastTimer = null;
    let currentTheme = APP_CONFIG.defaultTheme;

    // ========================== DOM ELEMENTS ==========================
    let elements = {};

    function cacheElements() {
        elements.appContainer = document.getElementById('app');
        elements.authSection = document.getElementById('authSection');
        elements.dashboardSection = document.getElementById('dashboardSection');
        elements.userNameDisplay = document.getElementById('userNameDisplay');
        elements.userBalance = document.getElementById('userBalance');
        elements.logoutButton = document.getElementById('logoutButton');
        elements.versionSpan = document.getElementById('appVersion');
    }

    // ========================== INISIALISASI SEMUA MODUL ==========================
    async function initModules() {
        console.log('[APP] Initializing modules...');
        
        // Pastikan DataManager sudah siap (sudah auto-init)
        if (typeof DataManager === 'undefined') {
            console.error('[APP] DataManager not loaded!');
            return false;
        }
        
        // Inisialisasi StorageManager (sudah auto-init)
        // Inisialisasi Utils (sudah auto-init)
        // Inisialisasi Constants (sudah auto-init)
        // Inisialisasi Config (sudah auto-init)
        
        // Inisialisasi AuthManager (sudah auto-init, tapi kita panggil ulang untuk memastikan)
        if (typeof AuthManager !== 'undefined' && AuthManager.init) {
            AuthManager.init();
        }
        
        // Inisialisasi DashboardManager (akan memuat dashboard jika user login)
        if (typeof DashboardManager !== 'undefined' && DashboardManager.init) {
            DashboardManager.init();
        }
        
        // Inisialisasi MarketManager (ticker)
        if (typeof MarketManager !== 'undefined' && MarketManager.init) {
            MarketManager.init();
        }
        
        // Inisialisasi ChartManager
        if (typeof ChartManager !== 'undefined' && ChartManager.init) {
            ChartManager.init();
        }
        
        // Inisialisasi TradingManager
        if (typeof TradingManager !== 'undefined' && TradingManager.init) {
            TradingManager.init();
        }
        
        // Inisialisasi FundsManager
        if (typeof FundsManager !== 'undefined' && FundsManager.init) {
            FundsManager.init();
        }
        
        // Inisialisasi HistoryManager
        if (typeof HistoryManager !== 'undefined' && HistoryManager.loadHistory) {
            // Akan dipanggil saat dashboard load
        }
        
        // Inisialisasi TrendingManager
        if (typeof TrendingLive !== 'undefined' && TrendingLive.init) {
            TrendingLive.init();
        } else if (typeof TrendingManager !== 'undefined' && TrendingManager.init) {
            TrendingManager.init();
        }
        
        // Inisialisasi StatsManager
        if (typeof StatsManager !== 'undefined' && StatsManager.init) {
            StatsManager.init();
        }
        
        // Inisialisasi AdminManager
        if (typeof AdminManager !== 'undefined' && AdminManager.init) {
            AdminManager.init();
        }
        
        // Inisialisasi ModalManager
        if (typeof ModalManager !== 'undefined' && ModalManager.init) {
            ModalManager.init();
        }
        
        console.log('[APP] All modules initialized');
        return true;
    }

    // ========================== BROADCAST CHECK (PESAN DARI ADMIN) ==========================
    function checkBroadcast() {
        const broadcastData = localStorage.getItem('tradingpro_broadcast');
        if (broadcastData) {
            try {
                const broadcast = JSON.parse(broadcastData);
                const lastShown = localStorage.getItem('tradingpro_broadcast_shown');
                if (!lastShown || new Date(broadcast.timestamp) > new Date(lastShown)) {
                    // Tampilkan notifikasi broadcast
                    if (ModalManager && ModalManager.showToast) {
                        ModalManager.showToast(`📢 ${broadcast.message}`, 'info', 8000);
                    } else if (window.showToast) {
                        window.showToast(`📢 ${broadcast.message}`, 'info', 8000);
                    } else {
                        alert(`Broadcast: ${broadcast.message}`);
                    }
                    localStorage.setItem('tradingpro_broadcast_shown', broadcast.timestamp);
                }
            } catch(e) {}
        }
    }

    // ========================== AUTO REFRESH DASHBOARD ==========================
    function autoRefreshDashboard() {
        if (autoRefreshTimer) clearInterval(autoRefreshTimer);
        autoRefreshTimer = setInterval(() => {
            const currentUser = DataManager.getCurrentUser();
            if (currentUser) {
                // Refresh harga (sudah otomatis), refresh history, refresh balance
                if (typeof HistoryManager !== 'undefined' && HistoryManager.loadHistory) {
                    HistoryManager.loadHistory();
                }
                if (typeof DashboardManager !== 'undefined' && DashboardManager.updateBalance) {
                    DashboardManager.updateBalance(currentUser.balance);
                }
                if (typeof StatsManager !== 'undefined' && StatsManager.refresh) {
                    StatsManager.refresh();
                }
                console.log('[APP] Auto-refresh dashboard');
            }
        }, APP_CONFIG.autoRefreshInterval);
    }

    // ========================== KEYBOARD SHORTCUTS ==========================
    function initKeyboardShortcuts() {
        if (!APP_CONFIG.enableKeyboardShortcuts) return;
        
        document.addEventListener('keydown', (e) => {
            // Ctrl + D -> Buka modal deposit
            if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
                e.preventDefault();
                const depositBtn = document.getElementById('depositBtn');
                if (depositBtn) depositBtn.click();
                ModalManager.showToast('Shortcut: Deposit (Ctrl+D)', 'info', 1000);
            }
            // Ctrl + W -> Buka modal withdraw
            if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
                e.preventDefault();
                const withdrawBtn = document.getElementById('withdrawBtn');
                if (withdrawBtn) withdrawBtn.click();
                ModalManager.showToast('Shortcut: Withdraw (Ctrl+W)', 'info', 1000);
            }
            // Ctrl + P -> Buka profil
            if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
                e.preventDefault();
                if (ModalManager && ModalManager.showProfile) {
                    ModalManager.showProfile();
                }
            }
            // Ctrl + H -> Buka riwayat (scroll ke history)
            if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
                e.preventDefault();
                const historyEl = document.getElementById('historyList');
                if (historyEl) historyEl.scrollIntoView({ behavior: 'smooth' });
                ModalManager.showToast('Shortcut: History (Ctrl+H)', 'info', 1000);
            }
            // Ctrl + R -> Refresh data
            if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
                e.preventDefault();
                if (typeof TrendingLive !== 'undefined' && TrendingLive.refresh) {
                    TrendingLive.refresh();
                }
                if (typeof StatsManager !== 'undefined' && StatsManager.refresh) {
                    StatsManager.refresh();
                }
                ModalManager.showToast('Data direfresh', 'success', 1000);
            }
            // Esc -> Tutup modal
            if (e.key === 'Escape') {
                if (ModalManager && ModalManager.closeAll) {
                    ModalManager.closeAll();
                }
            }
        });
    }

    // ========================== TEMA (DARK/LIGHT) ==========================
    function applyTheme(theme) {
        const body = document.body;
        if (theme === 'dark') {
            body.classList.remove('light-mode');
            body.classList.add('dark-mode');
        } else if (theme === 'light') {
            body.classList.remove('dark-mode');
            body.classList.add('light-mode');
        } else {
            // system default
            const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (isDark) {
                body.classList.add('dark-mode');
                body.classList.remove('light-mode');
            } else {
                body.classList.add('light-mode');
                body.classList.remove('dark-mode');
            }
        }
        currentTheme = theme;
        localStorage.setItem('tradingpro_theme', theme);
    }

    function loadTheme() {
        const saved = localStorage.getItem('tradingpro_theme');
        if (saved && (saved === 'dark' || saved === 'light')) {
            applyTheme(saved);
        } else {
            applyTheme(APP_CONFIG.defaultTheme);
        }
    }

    // ========================== NAVIGASI MENU (SIDEBAR ATAU TOPBAR) ==========================
    function createNavigationMenu() {
        // Cek apakah menu sudah ada
        if (document.getElementById('navMenu')) return;
        
        const topBar = document.querySelector('.top-bar');
        if (!topBar) return;
        
        const navMenu = document.createElement('div');
        navMenu.id = 'navMenu';
        navMenu.className = 'nav-menu';
        navMenu.innerHTML = `
            <button class="nav-btn" data-nav="dashboard"><i class="fas fa-tachometer-alt"></i> Dashboard</button>
            <button class="nav-btn" data-nav="trading"><i class="fas fa-chart-line"></i> Trading</button>
            <button class="nav-btn" data-nav="history"><i class="fas fa-history"></i> Riwayat</button>
            <button class="nav-btn" data-nav="profile"><i class="fas fa-user"></i> Profil</button>
            <button class="nav-btn" data-nav="info"><i class="fas fa-info-circle"></i> Info Akun</button>
            <button class="nav-btn theme-toggle" id="themeToggleBtn"><i class="fas fa-moon"></i> Tema</button>
        `;
        topBar.insertAdjacentElement('afterend', navMenu);
        
        // Styling
        const style = document.createElement('style');
        style.textContent = `
            .nav-menu {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
                margin-bottom: 20px;
                background: #0f172a;
                padding: 10px 16px;
                border-radius: 60px;
            }
            .nav-btn {
                background: transparent;
                border: none;
                padding: 6px 16px;
                border-radius: 40px;
                color: #9ca3af;
                cursor: pointer;
                transition: all 0.2s;
            }
            .nav-btn:hover {
                background: #1f2937;
                color: white;
            }
            .nav-btn.active {
                background: #3b82f6;
                color: white;
            }
            .theme-toggle {
                margin-left: auto;
            }
            body.light-mode .nav-menu {
                background: #e5e7eb;
            }
            body.light-mode .nav-btn {
                color: #374151;
            }
        `;
        document.head.appendChild(style);
        
        // Event listeners
        document.querySelectorAll('.nav-btn[data-nav]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = btn.dataset.nav;
                if (target === 'profile') {
                    if (ModalManager && ModalManager.showProfile) ModalManager.showProfile();
                } else if (target === 'info') {
                    if (ModalManager && ModalManager.showAccountInfo) ModalManager.showAccountInfo();
                } else if (target === 'history') {
                    const historyEl = document.getElementById('historyList');
                    if (historyEl) historyEl.scrollIntoView({ behavior: 'smooth' });
                } else if (target === 'trading') {
                    const orderPanel = document.querySelector('.order-panel');
                    if (orderPanel) orderPanel.scrollIntoView({ behavior: 'smooth' });
                } else if (target === 'dashboard') {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
        });
        
        // Theme toggle
        const themeBtn = document.getElementById('themeToggleBtn');
        if (themeBtn) {
            themeBtn.addEventListener('click', () => {
                const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
                applyTheme(newTheme);
                ModalManager.showToast(`Mode ${newTheme === 'dark' ? 'Gelap' : 'Terang'} aktif`, 'info', 1500);
            });
        }
    }

    // ========================== TAMPILKAN VERSI ==========================
    function displayVersion() {
        if (elements.versionSpan) {
            elements.versionSpan.textContent = `v${APP_CONFIG.version}`;
        } else {
            const footer = document.createElement('div');
            footer.className = 'app-footer';
            footer.innerHTML = `<small>TradingPro v${APP_CONFIG.version} | © 2025</small>`;
            document.body.appendChild(footer);
        }
    }

    // ========================== CEK AUTO LOGIN & LOAD DASHBOARD ==========================
    function checkAutoLoginAndLoad() {
        const session = StorageManager.getSession();
        if (session && session.username) {
            const user = DataManager.getUserByUsername(session.username);
            if (user) {
                DataManager.setCurrentUser(user);
                if (elements.authSection) elements.authSection.style.display = 'none';
                if (elements.dashboardSection) elements.dashboardSection.style.display = 'block';
                if (DashboardManager && DashboardManager.loadDashboard) {
                    DashboardManager.loadDashboard();
                }
                createNavigationMenu();
            }
        }
    }

    // ========================== START BROADCAST CHECKER ==========================
    function startBroadcastChecker() {
        if (broadcastTimer) clearInterval(broadcastTimer);
        broadcastTimer = setInterval(() => {
            checkBroadcast();
        }, APP_CONFIG.broadcastCheckInterval);
    }

    // ========================== MAIN INIT ==========================
    async function main() {
        cacheElements();
        loadTheme();
        await initModules();
        checkAutoLoginAndLoad();
        startBroadcastChecker();
        autoRefreshDashboard();
        initKeyboardShortcuts();
        displayVersion();
        
        // Tampilkan pesan selamat datang di console
        console.log(`%c${APP_CONFIG.appName} v${APP_CONFIG.version} - Siap digunakan!`, 'color: #facc15; font-size: 16px; font-weight: bold;');
        
        isInitialized = true;
    }

    // ========================== EXPOSE GLOBAL ==========================
    window.TradingPro = {
        version: APP_CONFIG.version,
        init: main,
        refresh: () => {
            if (typeof TrendingLive !== 'undefined') TrendingLive.refresh();
            if (typeof StatsManager !== 'undefined') StatsManager.refresh();
        },
        getStatus: () => ({ initialized: isInitialized, version: APP_CONFIG.version })
    };

    // Jalankan saat DOM siap
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', main);
    } else {
        main();
    }
})();