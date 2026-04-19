/* ===============================================================
   TRADINGPRO - TRADING ENGINE
   Versi: 2.0.0 | Order management (Market, Limit, Stop Loss, Take Profit), fee calculation, order history
   =============================================================== */

/**
 * Modul ini bertanggung jawab untuk:
 * - Eksekusi order BUY dan SELL (Market order)
 * - Order LIMIT (pending order, akan dieksekusi saat harga mencapai target)
 * - Stop Loss dan Take Profit (untuk posisi yang sudah dibeli)
 * - Perhitungan fee trading (0.1% default)
 * - Validasi saldo dan jumlah order
 * - Menampilkan order history dan open orders
 * - Notifikasi real-time via toast
 * - Integrasi dengan DataManager, MarketManager, HistoryManager
 */

(function() {
    'use strict';

    // ========================== KONFIGURASI ==========================
    const TRADING_CONFIG = {
        feePercent: 0.001,          // 0.1% fee
        minOrderValue: 10,          // minimal order $10
        maxOrderValue: 100000,      // maksimal order $100.000
        pendingOrderCheckInterval: 5000, // cek limit order tiap 5 detik
        maxOpenOrdersPerUser: 20,    // maksimal open order per user
        enableStopLoss: true,
        enableTakeProfit: true
    };

    // ========================== STORAGE KEYS ==========================
    const STORAGE_KEYS = {
        OPEN_ORDERS: 'tradingpro_open_orders',
        POSITIONS: 'tradingpro_positions'   // untuk stop loss / take profit
    };

    // ========================== STATE ==========================
    let openOrders = [];        // pending limit orders
    let positions = [];         // posisi terbuka dengan SL/TP
    let checkInterval = null;

    // ========================== DOM ELEMENTS ==========================
    let elements = {
        tradePairSelect: null,
        orderAmount: null,
        buyBtn: null,
        sellBtn: null,
        orderMessage: null,
        limitPriceInput: null,
        stopLossInput: null,
        takeProfitInput: null,
        orderTypeSelect: null,
        openOrdersContainer: null,
        positionsContainer: null
    };

    function cacheElements() {
        elements.tradePairSelect = document.getElementById('tradePairSelect');
        elements.orderAmount = document.getElementById('orderAmount');
        elements.buyBtn = document.getElementById('buyOrderBtn');
        elements.sellBtn = document.getElementById('sellOrderBtn');
        elements.orderMessage = document.getElementById('orderMessage');
        // Elemen tambahan untuk limit order (akan dibuat jika belum ada)
        createAdvancedOrderUI();
    }

    // ========================== BUAT UI ADVANCED ORDER ==========================
    function createAdvancedOrderUI() {
        const orderPanel = document.querySelector('.order-form');
        if (!orderPanel) return;
        
        // Cek apakah sudah ada
        if (document.getElementById('orderTypeSelect')) return;
        
        const advancedHtml = `
            <div class="order-advanced">
                <label>Jenis Order</label>
                <select id="orderTypeSelect" class="order-type-select">
                    <option value="market">Market (Eksekusi Instan)</option>
                    <option value="limit">Limit (Harga Tertentu)</option>
                    <option value="stop">Stop Loss (Jual saat harga turun)</option>
                </select>
                
                <div id="limitPriceGroup" style="display:none;">
                    <label>Harga Limit (USD)</label>
                    <input type="number" id="limitPriceInput" placeholder="Harga yang diinginkan" step="0.01">
                </div>
                
                <div id="stopPriceGroup" style="display:none;">
                    <label>Harga Stop (USD)</label>
                    <input type="number" id="stopPriceInput" placeholder="Harga trigger stop loss" step="0.01">
                </div>
                
                <div class="advanced-options" id="advancedOptions" style="display:none;">
                    <label>Stop Loss (SL) <span class="optional">opsional</span></label>
                    <input type="number" id="stopLossInput" placeholder="Harga Stop Loss" step="0.01">
                    <label>Take Profit (TP) <span class="optional">opsional</span></label>
                    <input type="number" id="takeProfitInput" placeholder="Harga Take Profit" step="0.01">
                </div>
                
                <div class="order-info" id="orderInfoPanel">
                    <div>💰 Estimasi Total: $<span id="estTotal">0.00</span></div>
                    <div>📊 Fee (0.1%): $<span id="estFee">0.00</span></div>
                    <div>💵 Total Termasuk Fee: $<span id="estGrandTotal">0.00</span></div>
                </div>
            </div>
        `;
        
        // Sisipkan setelah order actions
        const orderActions = orderPanel.querySelector('.order-actions');
        if (orderActions) {
            orderActions.insertAdjacentHTML('afterend', advancedHtml);
        } else {
            orderPanel.insertAdjacentHTML('beforeend', advancedHtml);
        }
        
        // Simpan referensi elemen baru
        elements.orderTypeSelect = document.getElementById('orderTypeSelect');
        elements.limitPriceInput = document.getElementById('limitPriceInput');
        elements.stopPriceInput = document.getElementById('stopPriceInput');
        elements.stopLossInput = document.getElementById('stopLossInput');
        elements.takeProfitInput = document.getElementById('takeProfitInput');
        elements.estTotal = document.getElementById('estTotal');
        elements.estFee = document.getElementById('estFee');
        elements.estGrandTotal = document.getElementById('estGrandTotal');
        
        // Event listener untuk toggle tampilan
        if (elements.orderTypeSelect) {
            elements.orderTypeSelect.addEventListener('change', function() {
                const type = this.value;
                document.getElementById('limitPriceGroup').style.display = type === 'limit' ? 'flex' : 'none';
                document.getElementById('stopPriceGroup').style.display = type === 'stop' ? 'flex' : 'none';
                document.getElementById('advancedOptions').style.display = (type === 'market' || type === 'limit') ? 'flex' : 'none';
                updateOrderInfo();
            });
        }
        
        // Event listener untuk update estimasi
        if (elements.orderAmount) {
            elements.orderAmount.addEventListener('input', () => updateOrderInfo());
        }
        if (elements.limitPriceInput) {
            elements.limitPriceInput.addEventListener('input', () => updateOrderInfo());
        }
        
        // Styling tambahan
        const style = document.createElement('style');
        style.textContent = `
            .order-advanced {
                margin-top: 16px;
                padding-top: 16px;
                border-top: 1px solid #2d3a5e;
            }
            .order-advanced label {
                display: block;
                margin: 12px 0 6px;
                font-size: 13px;
                color: #9ca3af;
            }
            .order-type-select, #limitPriceGroup input, #stopPriceGroup input, #stopLossInput, #takeProfitInput {
                width: 100%;
                padding: 10px 14px;
                background: #0f172a;
                border: 1px solid #334155;
                border-radius: 40px;
                color: white;
            }
            .optional {
                font-size: 10px;
                color: #6b7280;
                font-weight: normal;
            }
            .order-info {
                background: #0f172a;
                border-radius: 20px;
                padding: 12px;
                margin-top: 16px;
                font-size: 13px;
            }
            .order-info div {
                margin: 4px 0;
            }
        `;
        document.head.appendChild(style);
    }

    // Update estimasi biaya
    function updateOrderInfo() {
        if (!elements.orderAmount || !elements.estTotal) return;
        let amount = parseFloat(elements.orderAmount.value);
        if (isNaN(amount) || amount <= 0) {
            elements.estTotal.textContent = '0.00';
            elements.estFee.textContent = '0.00';
            elements.estGrandTotal.textContent = '0.00';
            return;
        }
        
        let price = 0;
        const pair = elements.tradePairSelect?.value || 'BTC';
        const currentPrice = DataManager.getPrice(pair);
        
        if (elements.orderTypeSelect?.value === 'limit' && elements.limitPriceInput?.value) {
            price = parseFloat(elements.limitPriceInput.value);
        } else {
            price = currentPrice;
        }
        
        if (isNaN(price) || price <= 0) price = currentPrice;
        
        const total = amount;
        const fee = total * TRADING_CONFIG.feePercent;
        const grandTotal = total + fee;
        
        elements.estTotal.textContent = total.toFixed(2);
        elements.estFee.textContent = fee.toFixed(2);
        elements.estGrandTotal.textContent = grandTotal.toFixed(2);
    }

    // ========================== VALIDASI ==========================
    function validateOrder(pair, amountUSD, orderType, limitPrice = null) {
        if (isNaN(amountUSD) || amountUSD <= 0) {
            return { valid: false, message: 'Jumlah order harus lebih dari 0' };
        }
        if (amountUSD < TRADING_CONFIG.minOrderValue) {
            return { valid: false, message: `Minimal order $${TRADING_CONFIG.minOrderValue}` };
        }
        if (amountUSD > TRADING_CONFIG.maxOrderValue) {
            return { valid: false, message: `Maksimal order $${TRADING_CONFIG.maxOrderValue}` };
        }
        if (!CONFIG.isPairAvailable(pair)) {
            return { valid: false, message: 'Pasangan tidak tersedia' };
        }
        if (orderType === 'limit') {
            if (!limitPrice || limitPrice <= 0) {
                return { valid: false, message: 'Harga limit tidak valid' };
            }
        }
        return { valid: true, message: '' };
    }

    // ========================== EKSEKUSI ORDER MARKET ==========================
    async function executeMarketOrder(type, pair, amountUSD) {
        const currentUser = DataManager.getCurrentUser();
        if (!currentUser) {
            showMessage('Silakan login terlebih dahulu', true);
            return false;
        }
        
        const currentPrice = DataManager.getPrice(pair);
        if (!currentPrice) {
            showMessage('Harga tidak tersedia', true);
            return false;
        }
        
        let newBalance = currentUser.balance;
        let quantity = 0;
        let fee = amountUSD * TRADING_CONFIG.feePercent;
        let totalCost = amountUSD + fee;
        
        if (type === 'buy') {
            if (currentUser.balance < totalCost) {
                showMessage(`Saldo tidak cukup. Dibutuhkan $${totalCost.toFixed(2)} termasuk fee`, true);
                return false;
            }
            quantity = amountUSD / currentPrice;
            newBalance = currentUser.balance - totalCost;
        } else if (type === 'sell') {
            // Untuk sell, jumlah USD yang dimasukkan adalah nilai yang ingin dijual
            // Kita asumsikan user memiliki aset yang cukup (untuk demo, tidak ada inventory aset, jadi langsung tambah saldo)
            // Di versi lengkap perlu cek kepemilikan aset. Untuk demo, sell langsung menambah saldo.
            quantity = amountUSD / currentPrice;
            newBalance = currentUser.balance + amountUSD - fee;
            if (newBalance < 0) {
                showMessage('Saldo tidak cukup untuk membayar fee', true);
                return false;
            }
        }
        
        // Update saldo user
        DataManager.updateUserBalance(currentUser.username, newBalance);
        
        // Catat transaksi
        const transaction = {
            username: currentUser.username,
            type: type,
            pair: pair,
            amount: quantity.toFixed(6),
            price: currentPrice,
            total: amountUSD,
            fee: fee,
            timestamp: new Date().toISOString(),
            orderType: 'market'
        };
        DataManager.addTransaction(transaction);
        
        // Jika ada stop loss / take profit, simpan posisi
        if (type === 'buy') {
            const stopLoss = elements.stopLossInput ? parseFloat(elements.stopLossInput.value) : null;
            const takeProfit = elements.takeProfitInput ? parseFloat(elements.takeProfitInput.value) : null;
            if (stopLoss || takeProfit) {
                const position = {
                    id: Date.now() + '-' + Math.random().toString(36).substr(2, 6),
                    username: currentUser.username,
                    pair: pair,
                    entryPrice: currentPrice,
                    quantity: quantity,
                    stopLoss: stopLoss,
                    takeProfit: takeProfit,
                    createdAt: new Date().toISOString()
                };
                positions.push(position);
                savePositions();
            }
        }
        
        // Update UI
        if (window.DashboardManager) {
            window.DashboardManager.updateBalance(newBalance);
        }
        
        showMessage(`${type.toUpperCase()} ${quantity.toFixed(6)} ${pair} @ $${currentPrice.toFixed(2)} | Fee $${fee.toFixed(2)}`, false);
        
        // Refresh history
        if (window.HistoryManager) window.HistoryManager.loadHistory();
        if (window.PositionManager) window.PositionManager.renderPositions();
        
        return true;
    }

    // ========================== ORDER LIMIT (PENDING) ==========================
    function createLimitOrder(type, pair, amountUSD, limitPrice) {
        const currentUser = DataManager.getCurrentUser();
        if (!currentUser) return false;
        
        // Validasi saldo untuk buy limit (dana harus tersedia)
        if (type === 'buy') {
            const fee = amountUSD * TRADING_CONFIG.feePercent;
            const totalNeeded = amountUSD + fee;
            if (currentUser.balance < totalNeeded) {
                showMessage(`Saldo tidak cukup untuk limit order. Dibutuhkan $${totalNeeded.toFixed(2)}`, true);
                return false;
            }
            // Blokir dana (kurangi saldo sementara)
            DataManager.updateUserBalance(currentUser.username, currentUser.balance - totalNeeded);
        }
        
        const order = {
            id: Date.now() + '-' + Math.random().toString(36).substr(2, 8),
            username: currentUser.username,
            type: type,
            pair: pair,
            amountUSD: amountUSD,
            limitPrice: limitPrice,
            fee: amountUSD * TRADING_CONFIG.feePercent,
            status: 'pending',
            createdAt: new Date().toISOString()
        };
        openOrders.push(order);
        saveOpenOrders();
        
        showMessage(`Limit order ${type.toUpperCase()} dipasang @ $${limitPrice} untuk $${amountUSD}`, false);
        if (window.OpenOrdersManager) window.OpenOrdersManager.renderOpenOrders();
        return true;
    }

    // ========================== CEK DAN EKSEKUSI LIMIT ORDER ==========================
    function checkPendingOrders() {
        const prices = DataManager.getPrices();
        let ordersToExecute = [];
        
        for (let i = 0; i < openOrders.length; i++) {
            const order = openOrders[i];
            const currentPrice = prices[order.pair];
            if (!currentPrice) continue;
            
            let shouldExecute = false;
            if (order.type === 'buy' && currentPrice <= order.limitPrice) shouldExecute = true;
            if (order.type === 'sell' && currentPrice >= order.limitPrice) shouldExecute = true;
            
            if (shouldExecute) {
                ordersToExecute.push(order);
            }
        }
        
        // Eksekusi order yang terpenuhi
        for (const order of ordersToExecute) {
            executeLimitOrder(order);
            // Hapus dari array
            const index = openOrders.findIndex(o => o.id === order.id);
            if (index !== -1) openOrders.splice(index, 1);
        }
        
        if (ordersToExecute.length > 0) {
            saveOpenOrders();
            if (window.OpenOrdersManager) window.OpenOrdersManager.renderOpenOrders();
        }
    }
    
    async function executeLimitOrder(order) {
        const currentPrice = DataManager.getPrice(order.pair);
        if (!currentPrice) return;
        
        const currentUser = DataManager.getUserByUsername(order.username);
        if (!currentUser) return;
        
        let quantity = order.amountUSD / currentPrice;
        let newBalance = currentUser.balance;
        
        if (order.type === 'buy') {
            // Dana sudah diblokir saat pasang order, jadi tidak perlu kurangi lagi
            // Tapi kita sudah kurangi sebelumnya, jadi sekarang hanya catat transaksi
            newBalance = currentUser.balance; // tidak berubah karena dana sudah diblokir
        } else if (order.type === 'sell') {
            newBalance = currentUser.balance + order.amountUSD - order.fee;
            DataManager.updateUserBalance(order.username, newBalance);
        }
        
        // Catat transaksi
        const transaction = {
            username: order.username,
            type: order.type,
            pair: order.pair,
            amount: quantity.toFixed(6),
            price: currentPrice,
            total: order.amountUSD,
            fee: order.fee,
            timestamp: new Date().toISOString(),
            orderType: 'limit'
        };
        DataManager.addTransaction(transaction);
        
        // Update UI jika user yang login adalah pemilik order
        const currentLoggedUser = DataManager.getCurrentUser();
        if (currentLoggedUser && currentLoggedUser.username === order.username) {
            if (window.DashboardManager) window.DashboardManager.updateBalance(newBalance);
            showMessage(`Limit order ${order.type.toUpperCase()} ${order.pair} tereksekusi @ $${currentPrice.toFixed(2)}`, false);
        }
        
        if (window.HistoryManager) window.HistoryManager.loadHistory();
    }

    // ========================== STOP LOSS & TAKE PROFIT CHECK ==========================
    function checkStopLossTakeProfit() {
        const prices = DataManager.getPrices();
        let positionsToClose = [];
        
        for (let i = 0; i < positions.length; i++) {
            const pos = positions[i];
            const currentPrice = prices[pos.pair];
            if (!currentPrice) continue;
            
            let shouldClose = false;
            let reason = '';
            if (pos.stopLoss && currentPrice <= pos.stopLoss) {
                shouldClose = true;
                reason = 'Stop Loss';
            }
            if (pos.takeProfit && currentPrice >= pos.takeProfit) {
                shouldClose = true;
                reason = 'Take Profit';
            }
            
            if (shouldClose) {
                positionsToClose.push({ position: pos, reason: reason, price: currentPrice });
            }
        }
        
        for (const item of positionsToClose) {
            closePosition(item.position, item.reason, item.price);
            const index = positions.findIndex(p => p.id === item.position.id);
            if (index !== -1) positions.splice(index, 1);
        }
        
        if (positionsToClose.length > 0) {
            savePositions();
            if (window.PositionManager) window.PositionManager.renderPositions();
        }
    }
    
    function closePosition(position, reason, closePrice) {
        const currentUser = DataManager.getUserByUsername(position.username);
        if (!currentUser) return;
        
        // Hitung PnL
        const pnl = (closePrice - position.entryPrice) * position.quantity;
        const newBalance = currentUser.balance + (position.quantity * closePrice);
        DataManager.updateUserBalance(position.username, newBalance);
        
        // Catat transaksi close
        const transaction = {
            username: position.username,
            type: 'close',
            pair: position.pair,
            amount: position.quantity.toFixed(6),
            price: closePrice,
            total: (position.quantity * closePrice).toFixed(2),
            fee: 0,
            timestamp: new Date().toISOString(),
            orderType: reason,
            pnl: pnl.toFixed(2)
        };
        DataManager.addTransaction(transaction);
        
        const currentLoggedUser = DataManager.getCurrentUser();
        if (currentLoggedUser && currentLoggedUser.username === position.username) {
            showMessage(`${reason} tereksekusi untuk ${position.pair} di $${closePrice.toFixed(2)}. PnL: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`, pnl >= 0 ? false : true);
            if (window.DashboardManager) window.DashboardManager.updateBalance(newBalance);
        }
    }

    // ========================== STORAGE ==========================
    function saveOpenOrders() {
        localStorage.setItem(STORAGE_KEYS.OPEN_ORDERS, JSON.stringify(openOrders));
    }
    
    function loadOpenOrders() {
        const saved = localStorage.getItem(STORAGE_KEYS.OPEN_ORDERS);
        if (saved) openOrders = JSON.parse(saved);
    }
    
    function savePositions() {
        localStorage.setItem(STORAGE_KEYS.POSITIONS, JSON.stringify(positions));
    }
    
    function loadPositions() {
        const saved = localStorage.getItem(STORAGE_KEYS.POSITIONS);
        if (saved) positions = JSON.parse(saved);
    }

    // ========================== UI HELPERS ==========================
    function showMessage(msg, isError = false) {
        if (elements.orderMessage) {
            elements.orderMessage.innerHTML = msg;
            elements.orderMessage.style.color = isError ? '#ef4444' : '#10b981';
            setTimeout(() => {
                if (elements.orderMessage) elements.orderMessage.innerHTML = '';
            }, 4000);
        }
        if (window.showToast) {
            window.showToast(msg, isError ? 'error' : 'success');
        }
    }

    // ========================== EVENT HANDLERS ==========================
    async function handleBuy() {
        const pair = elements.tradePairSelect?.value || 'BTC';
        let amountUSD = parseFloat(elements.orderAmount?.value);
        if (isNaN(amountUSD)) amountUSD = 0;
        
        const orderType = elements.orderTypeSelect?.value || 'market';
        
        if (orderType === 'limit') {
            const limitPrice = parseFloat(elements.limitPriceInput?.value);
            const validation = validateOrder(pair, amountUSD, 'limit', limitPrice);
            if (!validation.valid) {
                showMessage(validation.message, true);
                return;
            }
            createLimitOrder('buy', pair, amountUSD, limitPrice);
        } else {
            const validation = validateOrder(pair, amountUSD, 'market');
            if (!validation.valid) {
                showMessage(validation.message, true);
                return;
            }
            await executeMarketOrder('buy', pair, amountUSD);
        }
        
        // Reset input amount
        if (elements.orderAmount) elements.orderAmount.value = '';
        updateOrderInfo();
    }
    
    async function handleSell() {
        const pair = elements.tradePairSelect?.value || 'BTC';
        let amountUSD = parseFloat(elements.orderAmount?.value);
        if (isNaN(amountUSD)) amountUSD = 0;
        
        const orderType = elements.orderTypeSelect?.value || 'market';
        
        if (orderType === 'limit') {
            const limitPrice = parseFloat(elements.limitPriceInput?.value);
            const validation = validateOrder(pair, amountUSD, 'limit', limitPrice);
            if (!validation.valid) {
                showMessage(validation.message, true);
                return;
            }
            createLimitOrder('sell', pair, amountUSD, limitPrice);
        } else if (orderType === 'stop') {
            const stopPrice = parseFloat(elements.stopPriceInput?.value);
            if (isNaN(stopPrice) || stopPrice <= 0) {
                showMessage('Harga stop tidak valid', true);
                return;
            }
            // Stop loss order: jual saat harga turun ke stopPrice
            // Implementasi sederhana: buat limit order dengan limitPrice = stopPrice? 
            // Sebenarnya stop loss akan dieksekusi saat harga <= stopPrice
            // Untuk demo, kita buat limit order dengan limitPrice = stopPrice
            const validation = validateOrder(pair, amountUSD, 'limit', stopPrice);
            if (!validation.valid) {
                showMessage(validation.message, true);
                return;
            }
            createLimitOrder('sell', pair, amountUSD, stopPrice);
        } else {
            const validation = validateOrder(pair, amountUSD, 'market');
            if (!validation.valid) {
                showMessage(validation.message, true);
                return;
            }
            await executeMarketOrder('sell', pair, amountUSD);
        }
        
        if (elements.orderAmount) elements.orderAmount.value = '';
        updateOrderInfo();
    }

    // ========================== RENDER OPEN ORDERS & POSITIONS (UI) ==========================
    function renderOpenOrdersUI() {
        const container = document.getElementById('openOrdersList');
        if (!container) return;
        const currentUser = DataManager.getCurrentUser();
        if (!currentUser) return;
        
        const userOrders = openOrders.filter(o => o.username === currentUser.username);
        if (userOrders.length === 0) {
            container.innerHTML = '<div class="empty">Tidak ada pending order</div>';
            return;
        }
        
        container.innerHTML = userOrders.map(order => `
            <div class="open-order-item">
                <div><strong>${order.type.toUpperCase()}</strong> ${order.pair}</div>
                <div>Jumlah: $${order.amountUSD.toFixed(2)}</div>
                <div>Limit: $${order.limitPrice.toFixed(2)}</div>
                <div>Status: ${order.status}</div>
                <button class="cancel-order-btn" data-id="${order.id}">Batalkan</button>
            </div>
        `).join('');
        
        // Event cancel order
        document.querySelectorAll('.cancel-order-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = btn.dataset.id;
                cancelOrder(id);
            });
        });
    }
    
    function cancelOrder(orderId) {
        const index = openOrders.findIndex(o => o.id === orderId);
        if (index !== -1) {
            const order = openOrders[index];
            // Kembalikan dana yang diblokir jika order buy
            if (order.type === 'buy') {
                const user = DataManager.getUserByUsername(order.username);
                if (user) {
                    const refund = order.amountUSD + order.fee;
                    DataManager.updateUserBalance(order.username, user.balance + refund);
                    const currentUser = DataManager.getCurrentUser();
                    if (currentUser && currentUser.username === order.username) {
                        if (window.DashboardManager) window.DashboardManager.updateBalance(user.balance + refund);
                        showMessage(`Order dibatalkan, dana dikembalikan $${refund.toFixed(2)}`, false);
                    }
                }
            }
            openOrders.splice(index, 1);
            saveOpenOrders();
            renderOpenOrdersUI();
            if (window.OpenOrdersManager) window.OpenOrdersManager.renderOpenOrders();
        }
    }
    
    function renderPositionsUI() {
        const container = document.getElementById('positionsList');
        if (!container) return;
        const currentUser = DataManager.getCurrentUser();
        if (!currentUser) return;
        
        const userPositions = positions.filter(p => p.username === currentUser.username);
        if (userPositions.length === 0) {
            container.innerHTML = '<div class="empty">Tidak ada posisi terbuka</div>';
            return;
        }
        
        const currentPrices = DataManager.getPrices();
        container.innerHTML = userPositions.map(pos => {
            const currentPrice = currentPrices[pos.pair] || pos.entryPrice;
            const pnl = (currentPrice - pos.entryPrice) * pos.quantity;
            const pnlPercent = (pnl / (pos.entryPrice * pos.quantity)) * 100;
            return `
                <div class="position-item">
                    <div><strong>${pos.pair}</strong> (${pos.quantity.toFixed(6)})</div>
                    <div>Entry: $${pos.entryPrice.toFixed(2)}</div>
                    <div>Current: $${currentPrice.toFixed(2)}</div>
                    <div class="${pnl >= 0 ? 'positive' : 'negative'}">PnL: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)} (${pnlPercent.toFixed(2)}%)</div>
                    <div>SL: ${pos.stopLoss ? '$'+pos.stopLoss.toFixed(2) : '-'} | TP: ${pos.takeProfit ? '$'+pos.takeProfit.toFixed(2) : '-'}</div>
                </div>
            `;
        }).join('');
    }

    // ========================== INISIALISASI ==========================
    function initTrading() {
        cacheElements();
        loadOpenOrders();
        loadPositions();
        
        if (elements.buyBtn) elements.buyBtn.addEventListener('click', handleBuy);
        if (elements.sellBtn) elements.sellBtn.addEventListener('click', handleSell);
        
        // Buat container untuk open orders dan positions di dashboard (jika belum ada)
        const orderPanel = document.querySelector('.order-panel');
        if (orderPanel && !document.getElementById('openOrdersList')) {
            const openOrdersHtml = `
                <hr>
                <div class="card-title">⏳ Pending Orders</div>
                <div id="openOrdersList" class="open-orders-list"></div>
                <hr>
                <div class="card-title">📈 Posisi Terbuka (SL/TP)</div>
                <div id="positionsList" class="positions-list"></div>
            `;
            orderPanel.insertAdjacentHTML('beforeend', openOrdersHtml);
            
            // Styling
            const style = document.createElement('style');
            style.textContent = `
                .open-orders-list, .positions-list {
                    max-height: 150px;
                    overflow-y: auto;
                    font-size: 12px;
                }
                .open-order-item, .position-item {
                    background: #0f172a;
                    border-radius: 16px;
                    padding: 8px 12px;
                    margin-bottom: 8px;
                    border-left: 3px solid #facc15;
                }
                .cancel-order-btn {
                    background: #ef4444;
                    border: none;
                    border-radius: 20px;
                    padding: 4px 12px;
                    color: white;
                    cursor: pointer;
                    margin-top: 6px;
                }
                .position-item .positive { color: #10b981; }
                .position-item .negative { color: #ef4444; }
            `;
            document.head.appendChild(style);
        }
        
        // Interval untuk cek limit order dan SL/TP
        if (checkInterval) clearInterval(checkInterval);
        checkInterval = setInterval(() => {
            checkPendingOrders();
            checkStopLossTakeProfit();
            renderOpenOrdersUI();
            renderPositionsUI();
        }, TRADING_CONFIG.pendingOrderCheckInterval);
        
        console.log('[TRADING] Initialized');
    }
    
    // ========================== PUBLIC API ==========================
    window.TradingManager = {
        init: initTrading,
        attachEvents: initTrading, // alias untuk dashboard
        executeMarketOrder,
        createLimitOrder,
        cancelOrder,
        getOpenOrders: () => openOrders,
        getPositions: () => positions
    };
    
    // Auto init jika DOM siap
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTrading);
    } else {
        initTrading();
    }
    
    console.log('[TRADING] Module loaded');
})();