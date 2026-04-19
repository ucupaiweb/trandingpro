/* ===============================================================
   TRADINGPRO - DATA MANAGEMENT (RUNTIME)
   Versi: 2.0.0 | State global, harga real-time, history chart
   =============================================================== */

/**
 * Modul ini mengelola data runtime aplikasi:
 * - users (array of objects)
 * - currentUser (object atau null)
 * - prices (harga terkini setiap pair)
 * - priceHistory (array harga untuk chart)
 * - transactions (semua transaksi)
 * - intervalId (untuk update harga)
 * 
 * Semua data disinkronkan dengan StorageManager.
 * Modul ini juga menyediakan event listeners untuk perubahan data.
 */

(function() {
    'use strict';

    // ========================== STATE GLOBAL ==========================
    let users = [];                // Daftar semua user
    let currentUser = null;       // User yang sedang login
    let prices = {};              // Harga terkini per pair, misal: { BTC: 65420.50, ETH: 3250.75 }
    let priceHistory = {};        // History harga per pair, misal: { BTC: [65420, 65380, ...], ETH: [...] }
    let transactions = [];         // Semua transaksi (flat array)
    let intervalId = null;        // Interval update harga
    let trendingIntervalId = null; // Interval update trending
    
    // ========================== EVENT CALLBACKS ==========================
    let dataChangeCallbacks = {
        users: [],
        currentUser: [],
        prices: [],
        transactions: []
    };
    
    // ========================== FUNGSI EVENT ==========================
    function onDataChange(type, callback) {
        if (dataChangeCallbacks[type]) {
            dataChangeCallbacks[type].push(callback);
        }
    }
    
    function emitDataChange(type, data) {
        if (dataChangeCallbacks[type]) {
            dataChangeCallbacks[type].forEach(cb => cb(data));
        }
    }
    
    // ========================== INISIALISASI DATA ==========================
    function initData() {
        // Load users dari storage
        users = StorageManager.getUsers();
        // Load transactions
        transactions = StorageManager.getTransactions();
        // Load price history
        const storedHistory = StorageManager.getPriceHistory();
        // Inisialisasi harga dan history dari CONFIG
        const pairs = CONFIG.AVAILABLE_PAIRS || [];
        pairs.forEach(pair => {
            const symbol = pair.symbol;
            if (!prices[symbol]) {
                prices[symbol] = pair.initialPrice;
            }
            if (!priceHistory[symbol] && storedHistory[symbol]) {
                priceHistory[symbol] = storedHistory[symbol];
            } else if (!priceHistory[symbol]) {
                // Buat history dummy
                priceHistory[symbol] = [];
                let price = pair.initialPrice;
                for (let i = 0; i < CONFIG.CHART_POINTS; i++) {
                    price = price + (Math.random() - 0.5) * (pair.volatility?.max || 10);
                    price = Math.max(pair.minPrice, Math.min(pair.maxPrice, price));
                    priceHistory[symbol].push(parseFloat(price.toFixed(2)));
                }
            }
        });
        // Cek session
        const session = StorageManager.getSession();
        if (session && session.username) {
            const found = users.find(u => u.username === session.username);
            if (found) {
                currentUser = { ...found };
                // Hapus password dari memori
                delete currentUser.password;
            }
        }
        console.log('[DATA] Initialized. Users:', users.length, 'Current user:', currentUser?.username || 'none');
        emitDataChange('users', users);
        emitDataChange('currentUser', currentUser);
        emitDataChange('prices', prices);
    }
    
    // ========================== USER MANAGEMENT ==========================
    function getUsers() {
        return [...users];
    }
    
    function getUserByUsername(username) {
        return users.find(u => u.username === username) || null;
    }
    
    function addUser(userData) {
        // Cek duplikat
        if (users.find(u => u.username === userData.username)) return false;
        const newUser = {
            username: userData.username,
            password: userData.password,
            email: userData.email || '',
            balance: CONFIG.DEFAULT_BALANCE || 10000,
            role: 'user',
            createdAt: new Date().toISOString(),
            lastLogin: null,
            isActive: true,
            preferences: { theme: 'dark', notifications: true, language: 'id' }
        };
        users.push(newUser);
        StorageManager.saveUsers(users);
        emitDataChange('users', users);
        return true;
    }
    
    function updateUser(username, updates) {
        const index = users.findIndex(u => u.username === username);
        if (index === -1) return false;
        users[index] = { ...users[index], ...updates };
        StorageManager.saveUsers(users);
        if (currentUser && currentUser.username === username) {
            currentUser = { ...users[index] };
            delete currentUser.password;
            emitDataChange('currentUser', currentUser);
        }
        emitDataChange('users', users);
        return true;
    }
    
    function deleteUserByUsername(username) {
        if (username === 'admin') return false;
        const newUsers = users.filter(u => u.username !== username);
        if (newUsers.length === users.length) return false;
        users = newUsers;
        StorageManager.saveUsers(users);
        // Hapus juga transaksi user tersebut
        StorageManager.clearUserTransactions(username);
        transactions = StorageManager.getTransactions();
        if (currentUser && currentUser.username === username) {
            currentUser = null;
            StorageManager.clearSession();
            emitDataChange('currentUser', null);
        }
        emitDataChange('users', users);
        return true;
    }
    
    function updateUserBalance(username, newBalance) {
        return updateUser(username, { balance: parseFloat(newBalance.toFixed(2)) });
    }
    
    // ========================== CURRENT USER ==========================
    function setCurrentUser(user) {
        if (user) {
            currentUser = { ...user };
            delete currentUser.password;
            StorageManager.saveSession(currentUser);
        } else {
            currentUser = null;
            StorageManager.clearSession();
        }
        emitDataChange('currentUser', currentUser);
    }
    
    function getCurrentUser() {
        return currentUser ? { ...currentUser } : null;
    }
    
    function logout() {
        setCurrentUser(null);
    }
    
    // ========================== PRICES & MARKET ==========================
    function getPrices() {
        return { ...prices };
    }
    
    function getPrice(symbol) {
        return prices[symbol] || 0;
    }
    
    function updatePrice(symbol, newPrice) {
        if (!prices[symbol]) return false;
        const oldPrice = prices[symbol];
        prices[symbol] = parseFloat(newPrice.toFixed(2));
        // Update price history
        if (!priceHistory[symbol]) priceHistory[symbol] = [];
        priceHistory[symbol].push(prices[symbol]);
        if (priceHistory[symbol].length > CONFIG.CHART_POINTS) {
            priceHistory[symbol].shift();
        }
        // Simpan ke storage (opsional, bisa di-throttle)
        StorageManager.updatePairHistory(symbol, priceHistory[symbol]);
        emitDataChange('prices', { symbol, price: prices[symbol], oldPrice });
        return true;
    }
    
    function getPriceHistory(symbol) {
        return priceHistory[symbol] ? [...priceHistory[symbol]] : [];
    }
    
    // ========================== TRANSACTIONS ==========================
    function getTransactions() {
        return [...transactions];
    }
    
    function getUserTransactions(username) {
        return transactions.filter(tx => tx.username === username);
    }
    
    function addTransaction(transaction) {
        const newTx = {
            id: Date.now() + '-' + Math.random().toString(36).substr(2, 6),
            date: new Date().toISOString(),
            ...transaction
        };
        transactions.unshift(newTx);
        StorageManager.saveTransactions(transactions);
        emitDataChange('transactions', transactions);
        return newTx;
    }
    
    function clearUserTransactions(username) {
        transactions = transactions.filter(tx => tx.username !== username);
        StorageManager.saveTransactions(transactions);
        emitDataChange('transactions', transactions);
    }
    
    // ========================== PRICE SIMULATION ==========================
    function startPriceSimulation() {
        if (intervalId) clearInterval(intervalId);
        intervalId = setInterval(() => {
            const pairs = CONFIG.AVAILABLE_PAIRS || [];
            pairs.forEach(pair => {
                const symbol = pair.symbol;
                const volatility = CONFIG.getVolatility(symbol);
                const change = volatility.min + Math.random() * (volatility.max - volatility.min);
                let newPrice = prices[symbol] + change;
                // Batasan harga min/max
                if (pair.minPrice) newPrice = Math.max(pair.minPrice, newPrice);
                if (pair.maxPrice) newPrice = Math.min(pair.maxPrice, newPrice);
                updatePrice(symbol, newPrice);
            });
        }, CONFIG.PRICE_UPDATE_INTERVAL);
    }
    
    function stopPriceSimulation() {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }
    }
    
    // ========================== TRENDING UPDATE ==========================
    function updateTrendingFromPrices() {
        // Di sini nanti trending.js akan mengambil data terbaru
        if (window.TrendingManager && window.TrendingManager.refreshTrending) {
            window.TrendingManager.refreshTrending();
        }
    }
    
    // ========================== RESET DATA ==========================
    function resetAllData() {
        stopPriceSimulation();
        if (trendingIntervalId) clearInterval(trendingIntervalId);
        StorageManager.resetToDefault();
        // Reload data
        users = StorageManager.getUsers();
        transactions = StorageManager.getTransactions();
        const session = StorageManager.getSession();
        currentUser = session ? users.find(u => u.username === session.username) || null : null;
        if (currentUser) {
            currentUser = { ...currentUser };
            delete currentUser.password;
        }
        // Reset prices dan history
        const pairs = CONFIG.AVAILABLE_PAIRS || [];
        pairs.forEach(pair => {
            prices[pair.symbol] = pair.initialPrice;
            priceHistory[pair.symbol] = [];
            let price = pair.initialPrice;
            for (let i = 0; i < CONFIG.CHART_POINTS; i++) {
                price = price + (Math.random() - 0.5) * (pair.volatility?.max || 10);
                price = Math.max(pair.minPrice, Math.min(pair.maxPrice, price));
                priceHistory[pair.symbol].push(parseFloat(price.toFixed(2)));
            }
        });
        startPriceSimulation();
        emitDataChange('users', users);
        emitDataChange('currentUser', currentUser);
        emitDataChange('prices', prices);
        emitDataChange('transactions', transactions);
        console.log('[DATA] All data reset to default');
    }
    
    // ========================== AUTO-SAVE PERIODIC ==========================
    let autoSaveInterval = null;
    function startAutoSave(intervalMs = 60000) {
        if (autoSaveInterval) clearInterval(autoSaveInterval);
        autoSaveInterval = setInterval(() => {
            // Simpan price history ke storage
            Object.keys(priceHistory).forEach(symbol => {
                StorageManager.updatePairHistory(symbol, priceHistory[symbol]);
            });
            console.log('[DATA] Auto-save price history');
        }, intervalMs);
    }
    
    function stopAutoSave() {
        if (autoSaveInterval) {
            clearInterval(autoSaveInterval);
            autoSaveInterval = null;
        }
    }
    
    // ========================== PUBLIC API ==========================
    window.DataManager = {
        // Init
        initData,
        resetAllData,
        
        // Users
        getUsers,
        getUserByUsername,
        addUser,
        updateUser,
        deleteUserByUsername,
        updateUserBalance,
        
        // Current user
        setCurrentUser,
        getCurrentUser,
        logout,
        
        // Prices & History
        getPrices,
        getPrice,
        updatePrice,
        getPriceHistory,
        
        // Transactions
        getTransactions,
        getUserTransactions,
        addTransaction,
        clearUserTransactions,
        
        // Simulation control
        startPriceSimulation,
        stopPriceSimulation,
        
        // Auto save
        startAutoSave,
        stopAutoSave,
        
        // Events
        onDataChange
    };
    
    // Auto init setelah storage siap
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            DataManager.initData();
            DataManager.startPriceSimulation();
            DataManager.startAutoSave();
        });
    } else {
        DataManager.initData();
        DataManager.startPriceSimulation();
        DataManager.startAutoSave();
    }
    
    console.log('[DATA] Module loaded');
})();