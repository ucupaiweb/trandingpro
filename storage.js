/* ===============================================================
   TRADINGPRO - STORAGE MANAGER
   Versi: 2.0.0 | Manajemen localStorage, backup, restore, auto-save
   =============================================================== */

/**
 * Modul ini bertanggung jawab untuk semua operasi penyimpanan data
 * ke localStorage. Termasuk load, save, backup, import, export, reset.
 * Semua kunci (keys) didefinisikan di sini agar konsisten.
 */

(function() {
    'use strict';

    // ========================== KUNCI STORAGE ==========================
    const STORAGE_KEYS = {
        USERS: 'tradingpro_users',
        TRANSACTIONS: 'tradingpro_transactions',
        CURRENT_SESSION: 'tradingpro_current',
        SETTINGS: 'tradingpro_settings',
        PRICE_HISTORY: 'tradingpro_price_history',
        TRENDING_CACHE: 'tradingpro_trending_cache',
        PROMO_REDEEMED: 'tradingpro_promo_redeemed',
        LAST_BACKUP: 'tradingpro_last_backup'
    };

    // ========================== PENGATURAN STORAGE ==========================
    const STORAGE_CONFIG = {
        autoBackup: true,           // backup otomatis setiap kali ada perubahan
        backupIntervalMs: 3600000,  // 1 jam
        maxBackupCount: 5,          // maksimal backup tersimpan
        compressionEnabled: false,  // kompresi (tidak diimplementasikan di demo)
        version: '2.0.0'
    };

    // ========================== DATA DEFAULT ==========================
    // Data default untuk users (jika localStorage kosong)
    function getDefaultUsers() {
        return [
            {
                username: "admin",
                password: "admin123",
                email: "admin@tradingpro.com",
                balance: 999999.99,
                role: "admin",
                createdAt: new Date().toISOString(),
                lastLogin: null,
                isActive: true,
                preferences: { theme: "dark", notifications: true, language: "id" }
            },
            {
                username: "ucp",
                password: "ucp123",
                email: "ucp@tradingpro.com",
                balance: 100000.00,
                role: "user",
                createdAt: new Date().toISOString(),
                lastLogin: null,
                isActive: true,
                preferences: { theme: "dark", notifications: true, language: "id" }
            },
            {
                username: "trader1",
                password: "pass123",
                email: "trader1@example.com",
                balance: 50000,
                role: "user",
                createdAt: new Date().toISOString(),
                lastLogin: null,
                isActive: true,
                preferences: { theme: "dark", notifications: true, language: "id" }
            },
            {
                username: "trader2",
                password: "pass123",
                email: "trader2@example.com",
                balance: 75000,
                role: "user",
                createdAt: new Date().toISOString(),
                lastLogin: null,
                isActive: true,
                preferences: { theme: "dark", notifications: true, language: "id" }
            },
            {
                username: "cryptoKing",
                password: "king123",
                email: "king@example.com",
                balance: 200000,
                role: "user",
                createdAt: new Date().toISOString(),
                lastLogin: null,
                isActive: true,
                preferences: { theme: "dark", notifications: true, language: "id" }
            },
            {
                username: "daytrader",
                password: "day123",
                email: "day@example.com",
                balance: 35000,
                role: "user",
                createdAt: new Date().toISOString(),
                lastLogin: null,
                isActive: true,
                preferences: { theme: "dark", notifications: true, language: "id" }
            }
        ];
    }

    // Data default transaksi (kosong)
    function getDefaultTransactions() {
        return [];
    }

    // Data default settings
    function getDefaultSettings() {
        return {
            theme: 'dark',
            notifications: true,
            language: 'id',
            autoRefresh: true,
            soundEnabled: false,
            version: STORAGE_CONFIG.version
        };
    }

    // ========================== FUNGSI DASAR STORAGE ==========================
    
    /**
     * Simpan data ke localStorage
     * @param {string} key - Kunci storage
     * @param {any} data - Data yang akan disimpan (akan di-json kan)
     * @returns {boolean} - Berhasil atau tidak
     */
    function save(key, data) {
        try {
            const serialized = JSON.stringify(data);
            localStorage.setItem(key, serialized);
            console.log(`[STORAGE] Saved ${key}, size: ${serialized.length} bytes`);
            return true;
        } catch (e) {
            console.error(`[STORAGE] Failed to save ${key}:`, e);
            // Coba hapus jika quota penuh
            if (e.name === 'QuotaExceededError') {
                alert('Penyimpanan penuh! Hapus beberapa data atau export backup.');
            }
            return false;
        }
    }

    /**
     * Ambil data dari localStorage
     * @param {string} key - Kunci storage
     * @param {any} defaultValue - Nilai default jika tidak ada
     * @returns {any} - Data yang sudah di-parse
     */
    function load(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            if (item === null) {
                return defaultValue;
            }
            return JSON.parse(item);
        } catch (e) {
            console.error(`[STORAGE] Failed to load ${key}:`, e);
            return defaultValue;
        }
    }

    /**
     * Hapus data dari localStorage
     * @param {string} key - Kunci storage
     * @returns {boolean}
     */
    function remove(key) {
        try {
            localStorage.removeItem(key);
            console.log(`[STORAGE] Removed ${key}`);
            return true;
        } catch (e) {
            console.error(`[STORAGE] Failed to remove ${key}:`, e);
            return false;
        }
    }

    /**
     * Cek apakah kunci ada di localStorage
     * @param {string} key 
     * @returns {boolean}
     */
    function has(key) {
        return localStorage.getItem(key) !== null;
    }

    /**
     * Clear semua data aplikasi (hapus semua key tradingpro)
     * @returns {boolean}
     */
    function clearAll() {
        try {
            Object.values(STORAGE_KEYS).forEach(key => {
                localStorage.removeItem(key);
            });
            console.log('[STORAGE] All TradingPro data cleared');
            return true;
        } catch (e) {
            console.error('[STORAGE] Failed to clear all:', e);
            return false;
        }
    }

    // ========================== FUNGSI KHUSUS USER ==========================
    
    /**
     * Ambil semua user
     * @returns {Array}
     */
    function getUsers() {
        const users = load(STORAGE_KEYS.USERS, null);
        if (!users || users.length === 0) {
            const defaultUsers = getDefaultUsers();
            save(STORAGE_KEYS.USERS, defaultUsers);
            return defaultUsers;
        }
        return users;
    }

    /**
     * Simpan daftar user
     * @param {Array} users 
     * @returns {boolean}
     */
    function saveUsers(users) {
        const result = save(STORAGE_KEYS.USERS, users);
        if (result && STORAGE_CONFIG.autoBackup) {
            backupData('users');
        }
        return result;
    }

    /**
     * Update satu user berdasarkan username
     * @param {string} username 
     * @param {Object} updatedData 
     * @returns {boolean}
     */
    function updateUser(username, updatedData) {
        const users = getUsers();
        const index = users.findIndex(u => u.username === username);
        if (index === -1) return false;
        users[index] = { ...users[index], ...updatedData };
        return saveUsers(users);
    }

    /**
     * Tambah user baru
     * @param {Object} user 
     * @returns {boolean}
     */
    function addUser(user) {
        const users = getUsers();
        if (users.find(u => u.username === user.username)) return false;
        users.push(user);
        return saveUsers(users);
    }

    /**
     * Hapus user
     * @param {string} username 
     * @returns {boolean}
     */
    function deleteUser(username) {
        if (username === 'admin') {
            console.warn('[STORAGE] Cannot delete admin user');
            return false;
        }
        let users = getUsers();
        const newUsers = users.filter(u => u.username !== username);
        if (newUsers.length === users.length) return false;
        return saveUsers(newUsers);
    }

    // ========================== FUNGSI TRANSAKSI ==========================
    
    /**
     * Ambil semua transaksi
     * @returns {Array}
     */
    function getTransactions() {
        return load(STORAGE_KEYS.TRANSACTIONS, getDefaultTransactions());
    }

    /**
     * Simpan semua transaksi
     * @param {Array} transactions 
     * @returns {boolean}
     */
    function saveTransactions(transactions) {
        const result = save(STORAGE_KEYS.TRANSACTIONS, transactions);
        if (result && STORAGE_CONFIG.autoBackup) {
            backupData('transactions');
        }
        return result;
    }

    /**
     * Tambah transaksi baru
     * @param {Object} transaction 
     * @returns {boolean}
     */
    function addTransaction(transaction) {
        const transactions = getTransactions();
        transactions.unshift(transaction); // terbaru di awal
        // batasi maksimal 1000 transaksi per user? biarkan saja dulu
        return saveTransactions(transactions);
    }

    /**
     * Hapus semua transaksi user tertentu
     * @param {string} username 
     * @returns {boolean}
     */
    function clearUserTransactions(username) {
        let transactions = getTransactions();
        transactions = transactions.filter(tx => tx.username !== username);
        return saveTransactions(transactions);
    }

    /**
     * Hapus semua transaksi (semua user)
     * @returns {boolean}
     */
    function clearAllTransactions() {
        return saveTransactions([]);
    }

    // ========================== FUNGSI SESSION ==========================
    
    /**
     * Simpan session user saat ini
     * @param {Object} user - User object (tanpa password)
     * @returns {boolean}
     */
    function saveSession(user) {
        if (!user) {
            remove(STORAGE_KEYS.CURRENT_SESSION);
            return true;
        }
        // Jangan simpan password di session
        const safeUser = { ...user };
        delete safeUser.password;
        safeSession = { ...safeUser, loggedAt: new Date().toISOString() };
        return save(STORAGE_KEYS.CURRENT_SESSION, safeUser);
    }

    /**
     * Ambil session user
     * @returns {Object|null}
     */
    function getSession() {
        return load(STORAGE_KEYS.CURRENT_SESSION, null);
    }

    /**
     * Hapus session (logout)
     * @returns {boolean}
     */
    function clearSession() {
        return remove(STORAGE_KEYS.CURRENT_SESSION);
    }

    // ========================== FUNGSI SETTINGS ==========================
    
    /**
     * Ambil pengaturan aplikasi
     * @returns {Object}
     */
    function getSettings() {
        const settings = load(STORAGE_KEYS.SETTINGS, null);
        if (!settings) {
            const defaultSettings = getDefaultSettings();
            save(STORAGE_KEYS.SETTINGS, defaultSettings);
            return defaultSettings;
        }
        return settings;
    }

    /**
     * Simpan pengaturan
     * @param {Object} settings 
     * @returns {boolean}
     */
    function saveSettings(settings) {
        return save(STORAGE_KEYS.SETTINGS, settings);
    }

    /**
     * Update pengaturan tertentu
     * @param {string} key 
     * @param {any} value 
     * @returns {boolean}
     */
    function updateSetting(key, value) {
        const settings = getSettings();
        settings[key] = value;
        return saveSettings(settings);
    }

    // ========================== FUNGSI PRICE HISTORY ==========================
    
    /**
     * Ambil history harga untuk semua pair
     * @returns {Object}
     */
    function getPriceHistory() {
        return load(STORAGE_KEYS.PRICE_HISTORY, {});
    }

    /**
     * Simpan history harga
     * @param {Object} history 
     * @returns {boolean}
     */
    function savePriceHistory(history) {
        return save(STORAGE_KEYS.PRICE_HISTORY, history);
    }

    /**
     * Update history untuk satu pair
     * @param {string} pair 
     * @param {Array} data 
     * @returns {boolean}
     */
    function updatePairHistory(pair, data) {
        const history = getPriceHistory();
        history[pair] = data;
        return savePriceHistory(history);
    }

    // ========================== FUNGSI TRENDING CACHE ==========================
    
    function getTrendingCache() {
        return load(STORAGE_KEYS.TRENDING_CACHE, null);
    }

    function saveTrendingCache(cache) {
        return save(STORAGE_KEYS.TRENDING_CACHE, cache);
    }

    // ========================== FUNGSI PROMO REDEEMED ==========================
    
    function getRedeemedPromos(username) {
        const redeemed = load(STORAGE_KEYS.PROMO_REDEEMED, {});
        return redeemed[username] || [];
    }

    function addRedeemedPromo(username, promoCode) {
        const redeemed = load(STORAGE_KEYS.PROMO_REDEEMED, {});
        if (!redeemed[username]) redeemed[username] = [];
        if (redeemed[username].includes(promoCode)) return false;
        redeemed[username].push(promoCode);
        return save(STORAGE_KEYS.PROMO_REDEEMED, redeemed);
    }

    // ========================== BACKUP & RESTORE ==========================
    
    let backupInterval = null;

    /**
     * Buat backup semua data
     * @param {string} label - Label backup (opsional)
     * @returns {Object} - Data backup
     */
    function backupData(label = 'auto') {
        const backup = {
            timestamp: new Date().toISOString(),
            label: label,
            version: STORAGE_CONFIG.version,
            data: {
                users: getUsers(),
                transactions: getTransactions(),
                settings: getSettings(),
                priceHistory: getPriceHistory()
            }
        };
        
        // Simpan backup ke array (maksimal maxBackupCount)
        const backups = load(STORAGE_KEYS.LAST_BACKUP, []);
        backups.unshift(backup);
        if (backups.length > STORAGE_CONFIG.maxBackupCount) backups.pop();
        save(STORAGE_KEYS.LAST_BACKUP, backups);
        
        console.log(`[STORAGE] Backup created: ${label} at ${backup.timestamp}`);
        return backup;
    }

    /**
     * Restore data dari backup tertentu
     * @param {number} index - Index backup (0 = terbaru)
     * @returns {boolean}
     */
    function restoreBackup(index = 0) {
        const backups = load(STORAGE_KEYS.LAST_BACKUP, []);
        if (!backups.length || index >= backups.length) return false;
        const backup = backups[index];
        if (!backup.data) return false;
        
        saveUsers(backup.data.users);
        saveTransactions(backup.data.transactions);
        saveSettings(backup.data.settings);
        savePriceHistory(backup.data.priceHistory);
        
        console.log(`[STORAGE] Restored backup: ${backup.label}`);
        return true;
    }

    /**
     * Export semua data ke file JSON (download)
     */
    function exportData() {
        const allData = {
            exportDate: new Date().toISOString(),
            version: STORAGE_CONFIG.version,
            users: getUsers(),
            transactions: getTransactions(),
            settings: getSettings(),
            priceHistory: getPriceHistory()
        };
        const dataStr = JSON.stringify(allData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tradingpro_backup_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        console.log('[STORAGE] Data exported');
    }

    /**
     * Import data dari file JSON
     * @param {File} file 
     * @returns {Promise<boolean>}
     */
    function importData(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const imported = JSON.parse(e.target.result);
                    if (imported.users) saveUsers(imported.users);
                    if (imported.transactions) saveTransactions(imported.transactions);
                    if (imported.settings) saveSettings(imported.settings);
                    if (imported.priceHistory) savePriceHistory(imported.priceHistory);
                    console.log('[STORAGE] Data imported successfully');
                    resolve(true);
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    /**
     * Reset semua data ke default
     * @returns {boolean}
     */
    function resetToDefault() {
        saveUsers(getDefaultUsers());
        saveTransactions(getDefaultTransactions());
        saveSettings(getDefaultSettings());
        savePriceHistory({});
        clearSession();
        console.log('[STORAGE] Reset to default');
        return true;
    }

    // ========================== AUTO BACKUP INTERVAL ==========================
    function startAutoBackup() {
        if (backupInterval) clearInterval(backupInterval);
        if (STORAGE_CONFIG.autoBackup) {
            backupInterval = setInterval(() => {
                backupData('auto');
            }, STORAGE_CONFIG.backupIntervalMs);
        }
    }

    function stopAutoBackup() {
        if (backupInterval) {
            clearInterval(backupInterval);
            backupInterval = null;
        }
    }

    // ========================== INISIALISASI ==========================
    function initStorage() {
        // Pastikan data default ada jika belum
        if (!has(STORAGE_KEYS.USERS)) {
            saveUsers(getDefaultUsers());
        }
        if (!has(STORAGE_KEYS.TRANSACTIONS)) {
            saveTransactions(getDefaultTransactions());
        }
        if (!has(STORAGE_KEYS.SETTINGS)) {
            saveSettings(getDefaultSettings());
        }
        startAutoBackup();
        console.log('[STORAGE] Initialized with keys:', Object.keys(STORAGE_KEYS));
    }

    // ========================== EKSPOR PUBLIC API ==========================
    window.StorageManager = {
        // Keys
        KEYS: STORAGE_KEYS,
        
        // Dasar
        save,
        load,
        remove,
        has,
        clearAll,
        
        // User
        getUsers,
        saveUsers,
        updateUser,
        addUser,
        deleteUser,
        
        // Transaction
        getTransactions,
        saveTransactions,
        addTransaction,
        clearUserTransactions,
        clearAllTransactions,
        
        // Session
        saveSession,
        getSession,
        clearSession,
        
        // Settings
        getSettings,
        saveSettings,
        updateSetting,
        
        // Price History
        getPriceHistory,
        savePriceHistory,
        updatePairHistory,
        
        // Trending Cache
        getTrendingCache,
        saveTrendingCache,
        
        // Promo
        getRedeemedPromos,
        addRedeemedPromo,
        
        // Backup & Restore
        backupData,
        restoreBackup,
        exportData,
        importData,
        resetToDefault,
        
        // Auto backup control
        startAutoBackup,
        stopAutoBackup,
        
        // Init
        initStorage
    };
    
    // Auto init jika window sudah siap
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => StorageManager.initStorage());
    } else {
        StorageManager.initStorage();
    }
    
    console.log('[STORAGE] Module loaded');
})();