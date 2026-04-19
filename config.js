/* ===============================================================
   TRADINGPRO - MASTER CONFIGURATION FILE
   Versi: 2.0.0 | Berisi semua parameter global, konstanta, dan pengaturan sistem
   =============================================================== */

/**
 * CONFIG GLOBAL UTAMA
 * Objek ini berisi seluruh parameter yang mengatur perilaku aplikasi trading.
 * Ubah nilai di sini untuk menyesuaikan sistem tanpa mengubah kode lain.
 */
const CONFIG = (function() {
    'use strict';
    
    // ========================== IDENTITAS APLIKASI ==========================
    const APP_IDENTITY = {
        name: "TradingPro",
        fullName: "TradingPro Digital Asset Exchange",
        version: "2.0.0",
        build: "2025-04-18",
        environment: "production", // development, staging, production
        currency: "USD",
        currencySymbol: "$",
        decimalPlaces: 2,
        cryptoDecimalPlaces: 6,
        timezone: "Asia/Jakarta",
        locale: "id-ID"
    };
    
    // ========================== PENGATURAN TRADING ==========================
    const TRADING_CONFIG = {
        // Minimal order dalam mata uang fiat (USD)
        minTradeAmount: 10,
        maxTradeAmount: 100000,
        
        // Maksimal order per transaksi (untuk keamanan)
        maxOrderPerTransaction: 50000,
        
        // Biaya transaksi (dalam persen)
        tradingFeePercent: 0.1, // 0.1% fee
        
        // Biaya deposit/withdraw (flat atau persen)
        depositFee: 0,
        withdrawFee: 0.5, // $0.5 per withdraw
        
        // Batas withdraw maksimal per hari (jika diperlukan)
        maxDailyWithdraw: 10000,
        
        // Apakah perlu verifikasi 2FA (untuk masa depan)
        requireTwoFactorAuth: false,
        
        // Daftar pasangan trading yang tersedia
        availablePairs: [
            { symbol: "BTC", name: "BTC/USD", baseAsset: "BTC", quoteAsset: "USD", initialPrice: 65420.50, minPrice: 20000, maxPrice: 150000, volumeMultiplier: 1.0 },
            { symbol: "ETH", name: "ETH/USD", baseAsset: "ETH", quoteAsset: "USD", initialPrice: 3250.75, minPrice: 800, maxPrice: 10000, volumeMultiplier: 1.0 },
            { symbol: "SOL", name: "SOL/USD", baseAsset: "SOL", quoteAsset: "USD", initialPrice: 142.30, minPrice: 20, maxPrice: 500, volumeMultiplier: 1.0 },
            { symbol: "DOGE", name: "DOGE/USD", baseAsset: "DOGE", quoteAsset: "USD", initialPrice: 0.1245, minPrice: 0.05, maxPrice: 1, volumeMultiplier: 0.8 },
            { symbol: "XRP", name: "XRP/USD", baseAsset: "XRP", quoteAsset: "USD", initialPrice: 0.5678, minPrice: 0.2, maxPrice: 3, volumeMultiplier: 0.9 },
            { symbol: "ADA", name: "ADA/USD", baseAsset: "ADA", quoteAsset: "USD", initialPrice: 0.4321, minPrice: 0.1, maxPrice: 3, volumeMultiplier: 0.85 },
            { symbol: "DOT", name: "DOT/USD", baseAsset: "DOT", quoteAsset: "USD", initialPrice: 7.25, minPrice: 2, maxPrice: 50, volumeMultiplier: 0.9 },
            { symbol: "MATIC", name: "MATIC/USD", baseAsset: "MATIC", quoteAsset: "USD", initialPrice: 0.89, minPrice: 0.3, maxPrice: 3, volumeMultiplier: 0.85 }
        ],
        
        // Data harga historis untuk chart
        chartPointsCount: 50, // jumlah titik data di chart
        priceUpdateIntervalMs: 3000, // update harga setiap 3 detik
        
        // Parameter volatilitas harga (simulasi)
        priceVolatility: {
            BTC: { maxChange: 180, minChange: -180 },      // BTC fluktuasi ±$180
            ETH: { maxChange: 28, minChange: -28 },        // ETH ±$28
            SOL: { maxChange: 4.5, minChange: -4.5 },      // SOL ±$4.5
            DOGE: { maxChange: 0.008, minChange: -0.008 }, // DOGE ±$0.008
            XRP: { maxChange: 0.025, minChange: -0.025 },  // XRP ±$0.025
            ADA: { maxChange: 0.018, minChange: -0.018 },  // ADA ±$0.018
            DOT: { maxChange: 0.35, minChange: -0.35 },    // DOT ±$0.35
            MATIC: { maxChange: 0.045, minChange: -0.045 } // MATIC ±$0.045
        }
    };
    
    // ========================== PENGATURAN PENGGUNA DEFAULT ==========================
    const USER_CONFIG = {
        // Akun admin default (superuser)
        defaultAdmin: {
            username: "admin",
            password: "admin123",
            email: "admin@tradingpro.com",
            balance: 999999.99,
            role: "admin",
            createdAt: new Date().toISOString(),
            lastLogin: null,
            isActive: true,
            preferences: {
                theme: "dark",
                notifications: true,
                language: "id"
            }
        },
        
        // Akun demo untuk ucp
        defaultUcp: {
            username: "ucp",
            password: "ucp123",
            email: "ucp@tradingpro.com",
            balance: 100000.00,
            role: "user",
            createdAt: new Date().toISOString(),
            lastLogin: null,
            isActive: true,
            preferences: {
                theme: "dark",
                notifications: true,
                language: "id"
            }
        },
        
        // Akun demo tambahan
        defaultDemoUsers: [
            { username: "trader1", password: "pass123", email: "trader1@example.com", balance: 50000, role: "user" },
            { username: "trader2", password: "pass123", email: "trader2@example.com", balance: 75000, role: "user" },
            { username: "cryptoKing", password: "king123", email: "king@example.com", balance: 200000, role: "user" },
            { username: "daytrader", password: "day123", email: "day@example.com", balance: 35000, role: "user" }
        ],
        
        // Saldo awal untuk user baru yang mendaftar
        defaultNewUserBalance: 10000,
        
        // Role yang tersedia
        roles: {
            user: { level: 1, permissions: ["trade", "deposit", "withdraw", "viewHistory"] },
            vip: { level: 2, permissions: ["trade", "deposit", "withdraw", "viewHistory", "lowerFee"] },
            admin: { level: 99, permissions: ["*"] } // semua akses
        }
    };
    
    // ========================== PENGATURAN TRENDING & MARKET ==========================
    const TRENDING_CONFIG = {
        // Interval update data trending (milidetik)
        updateIntervalMs: 30000, // 30 detik
        
        // Jumlah aset yang ditampilkan di trending widget
        maxTrendingItems: 6,
        
        // Data trending awal (dummy)
        initialTrendingAssets: [
            { pair: "BTC/USD", change: 2.4, volume: "2.8B", news: "ETF inflow $500M", positive: true },
            { pair: "ETH/USD", change: 5.1, volume: "1.5B", news: "Upgrade Dencun sukses", positive: true },
            { pair: "SOL/USD", change: 12.8, volume: "890M", news: "Ecosystem growth", positive: true },
            { pair: "DOGE/USD", change: -1.2, volume: "320M", news: "Elon tweet delay", positive: false },
            { pair: "XRP/USD", change: 3.2, volume: "620M", news: "Legal victory Ripple", positive: true },
            { pair: "ADA/USD", change: -0.8, volume: "210M", news: "Consolidation", positive: false }
        ],
        
        // Berita acak untuk trending
        newsFeed: [
            "🚀 Pasar bullish diprediksi berlanjut",
            "📉 Koreksi jangka pendek terjadi",
            "🔥 Volume trading meningkat 40%",
            "📊 Altcoin season dimulai",
            "💼 Institusi mulai masuk",
            "⚖️ Regulasi baru menguntungkan",
            "🔒 Keamanan aset digital meningkat",
            "💡 Adopsi blockchain meluas",
            "🏦 Bank sentral bahas CBDC",
            "📈 Grafik menunjukkan golden cross"
        ]
    };
    
    // ========================== PENGATURAN STATISTIK ==========================
    const STATS_CONFIG = {
        // Data statistik pengguna (dummy, untuk tampilan)
        totalRegisteredUsers: 12543,
        activeTodayUsers: 3421,
        totalVolumeUSD: "156.8M",
        totalTransactions: 89432,
        
        // Interval update statistik (ms)
        statsUpdateIntervalMs: 300000, // 5 menit
        
        // Apakah statistik bersifat real (dari data sesungguhnya) atau dummy
        useRealStats: false // set true jika ingin hitung dari database
    };
    
    // ========================== PENGATURAN CHART & TIMEFRAME ==========================
    const CHART_CONFIG = {
        // Timeframe yang tersedia (dalam menit)
        timeframes: [
            { id: "1m", label: "1m", minutes: 1, points: 30 },
            { id: "5m", label: "5m", minutes: 5, points: 30 },
            { id: "15m", label: "15m", minutes: 15, points: 30 },
            { id: "1h", label: "1h", minutes: 60, points: 24 },
            { id: "4h", label: "4h", minutes: 240, points: 24 },
            { id: "1d", label: "1d", minutes: 1440, points: 30 }
        ],
        defaultTimeframe: "1m",
        
        // Warna chart
        chartColors: {
            lineColor: "#FACC15",
            backgroundColor: "rgba(250, 204, 21, 0.05)",
            gridColor: "#1E293B",
            textColor: "#94A3B8",
            upColor: "#10B981",
            downColor: "#EF4444"
        },
        
        // Apakah chart menggunakan area fill
        fillArea: true,
        
        // Ketebalan garis chart
        lineWidth: 2,
        
        // Radius titik (0 = tanpa titik)
        pointRadius: 0
    };
    
    // ========================== PENGATURAN NOTIFIKASI ==========================
    const NOTIFICATION_CONFIG = {
        // Durasi notifikasi toast (ms)
        toastDuration: 3000,
        
        // Posisi toast: top-right, top-left, bottom-right, bottom-left
        toastPosition: "bottom-right",
        
        // Apakah suara notifikasi aktif (tidak diimplementasikan di demo)
        soundEnabled: false,
        
        // Maksimal notifikasi dalam antrian
        maxQueueSize: 5,
        
        // Jenis notifikasi yang diaktifkan
        enabledTypes: {
            trade: true,
            deposit: true,
            withdraw: true,
            login: false,
            adminAction: true
        }
    };
    
    // ========================== PENGATURAN STORAGE (LOCALSTORAGE KEYS) ==========================
    const STORAGE_KEYS = {
        users: "tradingpro_users",
        transactions: "tradingpro_transactions",
        currentSession: "tradingpro_current",
        settings: "tradingpro_settings",
        priceHistory: "tradingpro_price_history",
        trendingCache: "tradingpro_trending_cache",
        promoRedeemed: "tradingpro_promo_redeemed"
    };
    
    // ========================== PENGATURAN PROMO & BONUS ==========================
    const PROMO_CONFIG = {
        // Daftar kode promo yang valid
        validPromoCodes: [
            { code: "TRENDING10", bonusPercent: 10, minDeposit: 50, maxBonus: 500, description: "Bonus deposit 10% (maks $500)" },
            { code: "WELCOME20", bonusPercent: 20, minDeposit: 100, maxBonus: 1000, description: "Bonus selamat datang 20%" },
            { code: "TRADINGPRO", bonusPercent: 5, minDeposit: 25, maxBonus: 250, description: "Bonus loyalitas 5%" }
        ],
        
        // Apakah promo bisa dipakai berulang kali oleh user yang sama
        allowMultipleRedeem: false,
        
        // Maksimal bonus per user
        maxBonusPerUser: 1000
    };
    
    // ========================== PENGATURAN KEAMANAN (DUMMY) ==========================
    const SECURITY_CONFIG = {
        // Maksimal percobaan login gagal
        maxLoginAttempts: 5,
        
        // Waktu lockout setelah gagal login (menit)
        lockoutMinutes: 15,
        
        // Apakah password harus di-hash (demo tetap plain untuk kemudahan)
        hashPasswords: false, // set true untuk production (perlu bcrypt)
        
        // Rate limiting request per menit
        rateLimitPerMinute: 60
    };
    
    // ========================== PENGATURAN UI & TEMA ==========================
    const UI_CONFIG = {
        // Tema default: dark, light, system
        defaultTheme: "dark",
        
        // Apakah sidebar bisa di-collapse (future)
        sidebarCollapsible: false,
        
        // Animasi enabled
        animationsEnabled: true,
        
        // Debounce delay untuk input (ms)
        debounceDelay: 300,
        
        // Refresh otomatis dashboard (ms)
        autoRefreshIntervalMs: 60000 // 1 menit
    };
    
    // ========================== API DUMMY (UNTUK FUTURE INTEGRATION) ==========================
    const API_CONFIG = {
        // Endpoint dummy (tidak digunakan di demo murni frontend)
        mockApiBaseUrl: "https://api.tradingpro.local/v1",
        useMockData: true,
        
        // API keys (hanya untuk ilustrasi)
        apiKeys: {
            marketData: "demo_market_key",
            weatherData: null
        },
        
        // Timeout request (ms)
        requestTimeout: 10000
    };
    
    // ========================== FUNGSI BANTU UNTUK AKSES KONFIGURASI ==========================
    /**
     * Mendapatkan daftar lengkap pasangan trading
     * @returns {Array} Daftar pair
     */
    function getAvailablePairs() {
        return TRADING_CONFIG.availablePairs;
    }
    
    /**
     * Mendapatkan harga awal untuk suatu pair
     * @param {string} symbol - Simbol pair (BTC, ETH, dll)
     * @returns {number} Harga awal
     */
    function getInitialPrice(symbol) {
        const pair = TRADING_CONFIG.availablePairs.find(p => p.symbol === symbol);
        return pair ? pair.initialPrice : 0;
    }
    
    /**
     * Mendapatkan batas volatilitas harga untuk suatu pair
     * @param {string} symbol 
     * @returns {Object} { maxChange, minChange }
     */
    function getVolatility(symbol) {
        return TRADING_CONFIG.priceVolatility[symbol] || { maxChange: 10, minChange: -10 };
    }
    
    /**
     * Cek apakah pasangan tersedia
     * @param {string} symbol 
     * @returns {boolean}
     */
    function isPairAvailable(symbol) {
        return TRADING_CONFIG.availablePairs.some(p => p.symbol === symbol);
    }
    
    /**
     * Mendapatkan konfigurasi lengkap (untuk debug)
     * @returns {Object} Semua konfigurasi
     */
    function getAllConfig() {
        return {
            app: APP_IDENTITY,
            trading: TRADING_CONFIG,
            users: USER_CONFIG,
            trending: TRENDING_CONFIG,
            stats: STATS_CONFIG,
            chart: CHART_CONFIG,
            notification: NOTIFICATION_CONFIG,
            storage: STORAGE_KEYS,
            promo: PROMO_CONFIG,
            security: SECURITY_CONFIG,
            ui: UI_CONFIG,
            api: API_CONFIG
        };
    }
    
    // ========================== EXPOSE PUBLIC API ==========================
    return {
        // Identitas
        APP_NAME: APP_IDENTITY.name,
        APP_VERSION: APP_IDENTITY.version,
        CURRENCY: APP_IDENTITY.currency,
        CURRENCY_SYMBOL: APP_IDENTITY.currencySymbol,
        DECIMAL_PLACES: APP_IDENTITY.decimalPlaces,
        
        // Trading
        MIN_TRADE: TRADING_CONFIG.minTradeAmount,
        MAX_TRADE: TRADING_CONFIG.maxTradeAmount,
        TRADING_FEE: TRADING_CONFIG.tradingFeePercent,
        WITHDRAW_FEE: TRADING_CONFIG.withdrawFee,
        AVAILABLE_PAIRS: TRADING_CONFIG.availablePairs,
        PRICE_UPDATE_INTERVAL: TRADING_CONFIG.priceUpdateIntervalMs,
        CHART_POINTS: TRADING_CONFIG.chartPointsCount,
        getInitialPrice,
        getVolatility,
        isPairAvailable,
        
        // User
        DEFAULT_BALANCE: USER_CONFIG.defaultNewUserBalance,
        DEFAULT_ADMIN: USER_CONFIG.defaultAdmin,
        DEFAULT_UCP: USER_CONFIG.defaultUcp,
        DEFAULT_DEMO_USERS: USER_CONFIG.defaultDemoUsers,
        
        // Trending
        TRENDING_UPDATE_INTERVAL: TRENDING_CONFIG.updateIntervalMs,
        MAX_TRENDING_ITEMS: TRENDING_CONFIG.maxTrendingItems,
        INITIAL_TRENDING: TRENDING_CONFIG.initialTrendingAssets,
        NEWS_FEED: TRENDING_CONFIG.newsFeed,
        
        // Statistik
        TOTAL_USERS_STAT: STATS_CONFIG.totalRegisteredUsers,
        ACTIVE_TODAY_STAT: STATS_CONFIG.activeTodayUsers,
        TOTAL_VOLUME_STAT: STATS_CONFIG.totalVolumeUSD,
        
        // Chart
        TIMEFRAMES: CHART_CONFIG.timeframes,
        DEFAULT_TIMEFRAME: CHART_CONFIG.defaultTimeframe,
        CHART_COLORS: CHART_CONFIG.chartColors,
        
        // Storage keys
        STORAGE_KEYS,
        
        // Promo
        VALID_PROMO_CODES: PROMO_CONFIG.validPromoCodes,
        
        // UI
        DEFAULT_THEME: UI_CONFIG.defaultTheme,
        ANIMATIONS_ENABLED: UI_CONFIG.animationsEnabled,
        
        // Utility
        getAllConfig
    };
})();

// Ekspor ke global (agar dapat diakses dari file JS lain)
if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
}

// Optional: freeze agar tidak dapat diubah (hanya untuk pengembangan)
if (Object.freeze) {
    Object.freeze(CONFIG);
}

console.log("[CONFIG] TradingPro v" + CONFIG.APP_VERSION + " loaded. Environment: production");