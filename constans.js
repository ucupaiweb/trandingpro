/* ===============================================================
   TRADINGPRO - CONSTANTS & ENUMS
   Versi: 2.0.0 | Data statis, mapping, label, dan konstanta global
   =============================================================== */

/**
 * File ini berisi semua data statis, enumerasi, label teks, dan mapping
 * yang digunakan di seluruh aplikasi. Tidak ada logika bisnis di sini.
 * Semua nilai bersifat immutable (tidak berubah selama runtime).
 */

(function() {
    'use strict';
    
    // ========================== ENUM ROLE PENGGUNA ==========================
    const USER_ROLES = {
        USER: 'user',
        VIP: 'vip',
        ADMIN: 'admin'
    };
    
    // ========================== ENUM JENIS TRANSAKSI ==========================
    const TRANSACTION_TYPES = {
        BUY: 'buy',
        SELL: 'sell',
        DEPOSIT: 'deposit',
        WITHDRAW: 'withdraw',
        BONUS: 'bonus',
        FEE: 'fee'
    };
    
    // ========================== ENUM STATUS ORDER ==========================
    const ORDER_STATUS = {
        PENDING: 'pending',
        COMPLETED: 'completed',
        CANCELLED: 'cancelled',
        FAILED: 'failed'
    };
    
    // ========================== ENUM TIMEFRAME CHART ==========================
    const TIMEFRAMES = {
        ONE_MINUTE: { id: '1m', label: '1 Menit', minutes: 1, points: 30, sortOrder: 1 },
        FIVE_MINUTES: { id: '5m', label: '5 Menit', minutes: 5, points: 30, sortOrder: 2 },
        FIFTEEN_MINUTES: { id: '15m', label: '15 Menit', minutes: 15, points: 30, sortOrder: 3 },
        ONE_HOUR: { id: '1h', label: '1 Jam', minutes: 60, points: 24, sortOrder: 4 },
        FOUR_HOURS: { id: '4h', label: '4 Jam', minutes: 240, points: 24, sortOrder: 5 },
        ONE_DAY: { id: '1d', label: '1 Hari', minutes: 1440, points: 30, sortOrder: 6 }
    };
    
    // ========================== DAFTAR PASANGAN TRADING (DETAIL) ==========================
    /**
     * Data lengkap setiap pasangan:
     * - symbol: kode unik
     * - name: nama tampilan
     * - baseAsset: aset dasar (yang dibeli/dijual)
     * - quoteAsset: aset kounter (USD)
     * - icon: kode icon fontawesome
     * - color: warna tema untuk pair ini
     * - initialPrice: harga awal simulasi
     * - minPrice: batas harga minimal
     * - maxPrice: batas harga maksimal
     * - volatility: rentang perubahan harga per update
     * - volumeMultiplier: faktor volume dummy
     * - isActive: apakah masih aktif trading
     * - description: deskripsi singkat
     */
    const TRADING_PAIRS = [
        {
            symbol: "BTC",
            name: "BTC/USD",
            baseAsset: "Bitcoin",
            quoteAsset: "USD",
            icon: "fab fa-bitcoin",
            color: "#F7931A",
            initialPrice: 65420.50,
            minPrice: 20000,
            maxPrice: 150000,
            volatility: { min: -180, max: 180 },
            volumeMultiplier: 1.0,
            isActive: true,
            description: "Bitcoin - Cryptocurrency pertama dan paling likuid"
        },
        {
            symbol: "ETH",
            name: "ETH/USD",
            baseAsset: "Ethereum",
            quoteAsset: "USD",
            icon: "fab fa-ethereum",
            color: "#627EEA",
            initialPrice: 3250.75,
            minPrice: 800,
            maxPrice: 10000,
            volatility: { min: -28, max: 28 },
            volumeMultiplier: 1.0,
            isActive: true,
            description: "Ethereum - Platform smart contract terbesar"
        },
        {
            symbol: "SOL",
            name: "SOL/USD",
            baseAsset: "Solana",
            quoteAsset: "USD",
            icon: "fas fa-bolt",
            color: "#00FFA3",
            initialPrice: 142.30,
            minPrice: 20,
            maxPrice: 500,
            volatility: { min: -4.5, max: 4.5 },
            volumeMultiplier: 0.9,
            isActive: true,
            description: "Solana - Blockchain berkecepatan tinggi"
        },
        {
            symbol: "DOGE",
            name: "DOGE/USD",
            baseAsset: "Dogecoin",
            quoteAsset: "USD",
            icon: "fas fa-dog",
            color: "#C3A634",
            initialPrice: 0.1245,
            minPrice: 0.05,
            maxPrice: 1,
            volatility: { min: -0.008, max: 0.008 },
            volumeMultiplier: 0.8,
            isActive: true,
            description: "Dogecoin - Meme coin populer"
        },
        {
            symbol: "XRP",
            name: "XRP/USD",
            baseAsset: "Ripple",
            quoteAsset: "USD",
            icon: "fas fa-ripple",
            color: "#23292F",
            initialPrice: 0.5678,
            minPrice: 0.2,
            maxPrice: 3,
            volatility: { min: -0.025, max: 0.025 },
            volumeMultiplier: 0.85,
            isActive: true,
            description: "Ripple - Solusi pembayaran lintas batas"
        },
        {
            symbol: "ADA",
            name: "ADA/USD",
            baseAsset: "Cardano",
            quoteAsset: "USD",
            icon: "fas fa-chart-line",
            color: "#0033AD",
            initialPrice: 0.4321,
            minPrice: 0.1,
            maxPrice: 3,
            volatility: { min: -0.018, max: 0.018 },
            volumeMultiplier: 0.85,
            isActive: true,
            description: "Cardano - Blockchain berbasis penelitian"
        },
        {
            symbol: "DOT",
            name: "DOT/USD",
            baseAsset: "Polkadot",
            quoteAsset: "USD",
            icon: "fas fa-link",
            color: "#E6007A",
            initialPrice: 7.25,
            minPrice: 2,
            maxPrice: 50,
            volatility: { min: -0.35, max: 0.35 },
            volumeMultiplier: 0.9,
            isActive: true,
            description: "Polkadot - Interoperabilitas blockchain"
        },
        {
            symbol: "MATIC",
            name: "MATIC/USD",
            baseAsset: "Polygon",
            quoteAsset: "USD",
            icon: "fas fa-polygon",
            color: "#8247E5",
            initialPrice: 0.89,
            minPrice: 0.3,
            maxPrice: 3,
            volatility: { min: -0.045, max: 0.045 },
            volumeMultiplier: 0.85,
            isActive: true,
            description: "Polygon - Scaling solution Ethereum"
        }
    ];
    
    // ========================== DAFTAR TRENDING DUMMY (AWAL) ==========================
    /**
     * Data awal untuk widget trending.
     * Setiap item memiliki:
     * - pair: nama pair
     * - change: persentase perubahan
     * - volume: volume dalam USD
     * - news: berita singkat
     * - positive: apakah positif/negatif
     */
    const INITIAL_TRENDING_ASSETS = [
        { pair: "BTC/USD", change: 2.4, volume: "2.8B", news: "ETF inflow $500M", positive: true },
        { pair: "ETH/USD", change: 5.1, volume: "1.5B", news: "Upgrade Dencun sukses", positive: true },
        { pair: "SOL/USD", change: 12.8, volume: "890M", news: "Ecosystem growth", positive: true },
        { pair: "DOGE/USD", change: -1.2, volume: "320M", news: "Elon tweet delay", positive: false },
        { pair: "XRP/USD", change: 3.2, volume: "620M", news: "Legal victory Ripple", positive: true },
        { pair: "ADA/USD", change: -0.8, volume: "210M", news: "Consolidation", positive: false },
        { pair: "DOT/USD", change: 1.5, volume: "180M", news: "Parachain auction", positive: true },
        { pair: "MATIC/USD", change: -2.1, volume: "195M", news: "zkEVM launch", positive: false }
    ];
    
    // ========================== BERITA UNTUK TRENDING ==========================
    const NEWS_FEED = [
        "🚀 Pasar bullish diprediksi berlanjut hingga akhir bulan",
        "📉 Koreksi jangka pendek terjadi, peluang buy the dip",
        "🔥 Volume trading meningkat 40% dalam 24 jam terakhir",
        "📊 Altcoin season dimulai, perhatikan proyek layer 1",
        "💼 Institusi mulai masuk ke pasar kripto",
        "⚖️ Regulasi baru menguntungkan aset digital",
        "🔒 Keamanan aset digital meningkat dengan teknologi baru",
        "💡 Adopsi blockchain meluas ke sektor keuangan",
        "🏦 Bank sentral bahas CBDC, dampak ke kripto",
        "📈 Grafik menunjukkan golden cross untuk Bitcoin",
        "🎯 Target harga BTC: $70k berikutnya?",
        "🔗 Interoperability antar chain semakin matang",
        "🌱 Green crypto mining jadi tren",
        "🎮 GameFi dan metaverse kembali naik daun",
        "💎 NFT volume meningkat 30% minggu ini",
        "🏆 Rekor hash rate Bitcoin tertinggi sepanjang masa",
        "📅 Halving Bitcoin semakin dekat",
        "💸 Whales accumulating altcoin pilihan",
        "📊 Fear and Greed Index: Extreme Greed",
        "🔔 Fed rate decision mempengaruhi pasar"
    ];
    
    // ========================== PESAN VALIDASI & ERROR ==========================
    const VALIDATION_MESSAGES = {
        // Login/Register
        USERNAME_REQUIRED: "Username harus diisi",
        PASSWORD_REQUIRED: "Password harus diisi",
        USERNAME_MIN_LENGTH: "Username minimal 3 karakter",
        USERNAME_MAX_LENGTH: "Username maksimal 20 karakter",
        PASSWORD_MIN_LENGTH: "Password minimal 4 karakter",
        USERNAME_EXISTS: "Username sudah terdaftar",
        USERNAME_NOT_FOUND: "Username tidak ditemukan",
        WRONG_PASSWORD: "Password salah",
        LOGIN_SUCCESS: "Login berhasil, selamat datang!",
        REGISTER_SUCCESS: "Registrasi berhasil, silakan login",
        EMAIL_INVALID: "Format email tidak valid",
        
        // Trading
        INVALID_AMOUNT: "Jumlah tidak valid",
        MIN_TRADE_AMOUNT: "Minimal order ${{min}}",
        MAX_TRADE_AMOUNT: "Maksimal order ${{max}}",
        INSUFFICIENT_BALANCE: "Saldo tidak mencukupi",
        INSUFFICIENT_ASSET: "Aset tidak mencukupi untuk menjual",
        TRADE_SUCCESS_BUY: "✅ Berhasil beli {{quantity}} {{pair}} seharga ${{total}}",
        TRADE_SUCCESS_SELL: "💰 Berhasil jual {{quantity}} {{pair}} seharga ${{total}}",
        TRADE_FAILED: "Transaksi gagal, silakan coba lagi",
        
        // Deposit/Withdraw
        DEPOSIT_AMOUNT_POSITIVE: "Nominal deposit harus lebih dari 0",
        WITHDRAW_AMOUNT_POSITIVE: "Nominal withdraw harus lebih dari 0",
        WITHDRAW_EXCEED_BALANCE: "Saldo tidak cukup untuk withdraw",
        WITHDRAW_EXCEED_LIMIT: "Melebihi batas withdraw harian",
        DEPOSIT_SUCCESS: "Deposit ${{amount}} berhasil",
        WITHDRAW_SUCCESS: "Withdraw ${{amount}} berhasil",
        
        // Promo
        PROMO_CODE_INVALID: "Kode promo tidak valid",
        PROMO_CODE_EXPIRED: "Kode promo sudah kadaluarsa",
        PROMO_MIN_DEPOSIT: "Minimal deposit ${{min}} untuk menggunakan kode ini",
        PROMO_ALREADY_USED: "Kode promo sudah pernah digunakan",
        PROMO_SUCCESS: "Bonus {{percent}}% berhasil ditambahkan! +${{bonus}}",
        
        // Admin
        ADMIN_ONLY: "Akses hanya untuk admin",
        USER_NOT_FOUND: "User tidak ditemukan",
        BALANCE_UPDATED: "Saldo {{username}} berhasil diubah menjadi ${{balance}}",
        RESET_CONFIRM: "Yakin ingin mereset semua data? Tindakan tidak bisa dibatalkan!",
        RESET_SUCCESS: "Semua data berhasil direset",
        DELETE_USER_SUCCESS: "User berhasil dihapus",
        
        // Umum
        UNKNOWN_ERROR: "Terjadi kesalahan, coba lagi nanti",
        SESSION_EXPIRED: "Sesi berakhir, silakan login ulang",
        NETWORK_ERROR: "Koneksi bermasalah, periksa jaringan"
    };
    
    // ========================== LABEL UI (UNTUK TAMPILAN) ==========================
    const UI_LABELS = {
        // Navigasi
        NAV_HOME: "Beranda",
        NAV_TRADE: "Trading",
        NAV_DEPOSIT: "Deposit",
        NAV_WITHDRAW: "Withdraw",
        NAV_HISTORY: "Riwayat",
        NAV_ADMIN: "Admin",
        NAV_PROFILE: "Profil",
        NAV_SETTINGS: "Pengaturan",
        NAV_LOGOUT: "Keluar",
        NAV_LOGIN: "Masuk",
        NAV_REGISTER: "Daftar",
        
        // Trading
        LABEL_BUY: "Beli",
        LABEL_SELL: "Jual",
        LABEL_AMOUNT: "Jumlah",
        LABEL_PRICE: "Harga",
        LABEL_TOTAL: "Total",
        LABEL_BALANCE: "Saldo",
        LABEL_AVAILABLE: "Tersedia",
        LABEL_ORDER_TYPE: "Tipe Order",
        LABEL_MARKET: "Market",
        LABEL_LIMIT: "Limit",
        
        // Chart
        CHART_TITLE: "Chart Harga Real-Time",
        CHART_PAIR: "Pasangan",
        CHART_TIMEFRAME: "Timeframe",
        CHART_VOLUME: "Volume",
        
        // Deposit/Withdraw
        DEPOSIT_TITLE: "Deposit Dana",
        DEPOSIT_METHOD: "Metode Deposit",
        DEPOSIT_BANK: "Transfer Bank",
        DEPOSIT_CRYPTO: "Transfer Kripto",
        WITHDRAW_TITLE: "Withdraw Dana",
        WITHDRAW_ADDRESS: "Alamat Tujuan",
        
        // Admin
        ADMIN_TITLE: "Panel Administrator",
        ADMIN_USER_LIST: "Daftar Pengguna",
        ADMIN_USERNAME: "Username",
        ADMIN_EMAIL: "Email",
        ADMIN_BALANCE: "Saldo",
        ADMIN_ROLE: "Role",
        ADMIN_ACTION: "Aksi",
        ADMIN_EDIT_BALANCE: "Edit Saldo",
        ADMIN_RESET: "Reset Data",
        
        // History
        HISTORY_DATE: "Tanggal",
        HISTORY_TYPE: "Jenis",
        HISTORY_PAIR: "Pasangan",
        HISTORY_AMOUNT: "Jumlah",
        HISTORY_PRICE: "Harga",
        HISTORY_TOTAL: "Total",
        HISTORY_FILTER: "Filter",
        HISTORY_CLEAR: "Hapus Semua",
        
        // Trending
        TRENDING_TITLE: "🔥 Hot Trending (24h)",
        TRENDING_GAINERS: "Top Gainers",
        TRENDING_LOSERS: "Top Losers",
        TRENDING_VOLUME: "Volume Tertinggi",
        
        // Modal
        MODAL_CLOSE: "Tutup",
        MODAL_CONFIRM: "Konfirmasi",
        MODAL_CANCEL: "Batal",
        MODAL_OK: "OK"
    };
    
    // ========================== WARNA TEMA (UNTUK CHART & UI) ==========================
    const THEME_COLORS = {
        // Warna utama
        PRIMARY: "#3B82F6",
        PRIMARY_DARK: "#2563EB",
        SECONDARY: "#8B5CF6",
        SUCCESS: "#10B981",
        DANGER: "#EF4444",
        WARNING: "#F97316",
        INFO: "#06B6D4",
        GOLD: "#FACC15",
        SILVER: "#9CA3AF",
        BRONZE: "#CD7F32",
        
        // Warna untuk pair
        BTC: "#F7931A",
        ETH: "#627EEA",
        SOL: "#00FFA3",
        DOGE: "#C3A634",
        XRP: "#23292F",
        ADA: "#0033AD",
        DOT: "#E6007A",
        MATIC: "#8247E5",
        
        // Latar belakang
        BG_DARK: "#0B1120",
        BG_CARD: "#111827",
        BG_ELEVATED: "#1F2937",
        
        // Teks
        TEXT_PRIMARY: "#F3F4F6",
        TEXT_SECONDARY: "#9CA3AF",
        TEXT_MUTED: "#6B7280",
        
        // Border
        BORDER_DEFAULT: "#2D3A5E",
        BORDER_LIGHT: "#334155"
    };
    
    // ========================== FORMAT ANGKA & MATA UANG ==========================
    const NUMBER_FORMATS = {
        currency: {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        },
        crypto: {
            minimumFractionDigits: 6,
            maximumFractionDigits: 6
        },
        percentage: {
            style: 'percent',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        },
        volume: {
            notation: 'compact',
            compactDisplay: 'short',
            minimumFractionDigits: 1,
            maximumFractionDigits: 1
        }
    };
    
    // ========================== KODE PROMO STATIS ==========================
    const STATIC_PROMO_CODES = [
        { code: "TRENDING10", bonusPercent: 10, minDeposit: 50, maxBonus: 500, description: "Bonus deposit 10%", active: true },
        { code: "WELCOME20", bonusPercent: 20, minDeposit: 100, maxBonus: 1000, description: "Bonus selamat datang 20%", active: true },
        { code: "TRADINGPRO", bonusPercent: 5, minDeposit: 25, maxBonus: 250, description: "Bonus loyalitas 5%", active: true },
        { code: "BONUS50", bonusPercent: 50, minDeposit: 200, maxBonus: 2000, description: "Bonus spesial 50% (terbatas)", active: false },
        { code: "FLASH100", bonusPercent: 100, minDeposit: 500, maxBonus: 5000, description: "Flash sale 100%", active: false }
    ];
    
    // ========================== MAPPING JENIS TRANSAKSI KE LABEL ==========================
    const TRANSACTION_TYPE_LABELS = {
        buy: { label: "PEMBELIAN", icon: "fas fa-arrow-up", color: "#10B981", class: "transaction-buy" },
        sell: { label: "PENJUALAN", icon: "fas fa-arrow-down", color: "#EF4444", class: "transaction-sell" },
        deposit: { label: "DEPOSIT", icon: "fas fa-plus-circle", color: "#3B82F6", class: "transaction-deposit" },
        withdraw: { label: "WITHDRAW", icon: "fas fa-minus-circle", color: "#F97316", class: "transaction-withdraw" },
        bonus: { label: "BONUS", icon: "fas fa-gift", color: "#FACC15", class: "transaction-bonus" },
        fee: { label: "BIAYA", icon: "fas fa-receipt", color: "#6B7280", class: "transaction-fee" }
    };
    
    // ========================== REGEX UNTUK VALIDASI ==========================
    const VALIDATION_REGEX = {
        username: /^[a-zA-Z0-9_]{3,20}$/,
        password: /^.{4,}$/,
        email: /^[^\s@]+@([^\s@.,]+\.)+[^\s@.,]{2,}$/,
        amount: /^\d+(\.\d{1,2})?$/,
        promoCode: /^[A-Z0-9]{5,15}$/
    };
    
    // ========================== FUNGSI BANTU UNTUK AKSES KONSTANTA ==========================
    function getPairBySymbol(symbol) {
        return TRADING_PAIRS.find(p => p.symbol === symbol) || null;
    }
    
    function getTransactionTypeLabel(type) {
        return TRANSACTION_TYPE_LABELS[type] || { label: "UNKNOWN", icon: "fas fa-question", color: "#9CA3AF" };
    }
    
    function getValidationMessage(key, params = {}) {
        let msg = VALIDATION_MESSAGES[key] || VALIDATION_MESSAGES.UNKNOWN_ERROR;
        Object.keys(params).forEach(k => {
            msg = msg.replace(`{{${k}}}`, params[k]);
        });
        return msg;
    }
    
    function getUILabel(key) {
        return UI_LABELS[key] || key;
    }
    
    // ========================== EKSPOR KE GLOBAL ==========================
    window.CONSTANTS = {
        // Enums
        USER_ROLES,
        TRANSACTION_TYPES,
        ORDER_STATUS,
        TIMEFRAMES,
        
        // Data
        TRADING_PAIRS,
        INITIAL_TRENDING_ASSETS,
        NEWS_FEED,
        STATIC_PROMO_CODES,
        
        // Messages & Labels
        VALIDATION_MESSAGES,
        UI_LABELS,
        TRANSACTION_TYPE_LABELS,
        
        // Format & Colors
        NUMBER_FORMATS,
        THEME_COLORS,
        
        // Validation
        VALIDATION_REGEX,
        
        // Helper functions
        getPairBySymbol,
        getTransactionTypeLabel,
        getValidationMessage,
        getUILabel,
        
        // Version
        VERSION: "2.0.0",
        BUILD_DATE: "2025-04-18"
    };
    
    console.log("[CONSTANTS] Loaded:", Object.keys(window.CONSTANTS).length, "constants");
})();