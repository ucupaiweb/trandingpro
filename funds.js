/* ===============================================================
   TRADINGPRO - FUNDS MANAGEMENT (Deposit & Withdraw)
   Versi: 2.0.0 | Deposit, Withdraw, Promo Code, Transaction History, Virtual Account, Payment Methods
   =============================================================== */

/**
 * Modul ini bertanggung jawab untuk:
 * - Deposit dana ke akun user (tambah saldo)
 * - Withdraw dana dari akun user (kurangi saldo)
 * - Validasi nominal deposit/withdraw
 * - Penerapan kode promo (bonus deposit)
 * - Riwayat transaksi keuangan
 * - Metode pembayaran virtual (Bank Transfer, E-Wallet, Crypto)
 * - Auto-generate nomor virtual account untuk deposit
 * - Batas withdraw harian
 * - Notifikasi real-time via toast
 */

(function() {
    'use strict';

    // ========================== KONFIGURASI ==========================
    const FUNDS_CONFIG = {
        minDeposit: 10000,          // minimal deposit Rp10.000 (atau $10, sesuaikan)
        maxDeposit: 100000000,      // maksimal deposit Rp100 juta
        minWithdraw: 50000,         // minimal withdraw Rp50.000
        maxWithdraw: 50000000,      // maksimal withdraw Rp50 juta per hari
        dailyWithdrawLimit: 50000000, // batas withdraw harian
        withdrawFee: 5000,          // biaya withdraw Rp5.000 (flat)
        promoBonusPercent: 10,      // bonus deposit 10% untuk kode promo
        promoMinDeposit: 100000,    // minimal deposit untuk promo
        promoMaxBonus: 500000       // maksimal bonus Rp500.000
    };

    // Konversi ke USD jika diperlukan (untuk tampilan konsisten dengan trading)
    // Di sini kita gunakan Rupiah agar lebih realistis untuk demo, tapi tetap support USD
    const CURRENCY = {
        symbol: 'Rp',
        code: 'IDR',
        rate: 15000, // 1 USD = 15000 IDR (opsional)
        useRupiah: true  // set false jika ingin USD
    };

    // ========================== STORAGE KEYS ==========================
    const STORAGE_KEYS = {
        WITHDRAW_HISTORY: 'tradingpro_withdraw_history',
        DEPOSIT_HISTORY: 'tradingpro_deposit_history',
        PROMO_USAGE: 'tradingpro_promo_usage'
    };

    // ========================== STATE ==========================
    let withdrawHistory = [];
    let depositHistory = [];
    let promoUsage = {};  // { username: [promoCodes] }

    // ========================== DOM ELEMENTS ==========================
    let elements = {
        depositAmount: null,
        withdrawAmount: null,
        depositBtn: null,
        withdrawBtn: null,
        promoCodeInput: null,
        applyPromoBtn: null,
        fundMessage: null,
        selectedPaymentMethod: null,
        virtualAccountDisplay: null
    };

    function cacheElements() {
        elements.depositAmount = document.getElementById('depositAmount');
        elements.withdrawAmount = document.getElementById('withdrawAmount');
        elements.depositBtn = document.getElementById('depositBtn');
        elements.withdrawBtn = document.getElementById('withdrawBtn');
        elements.promoCodeInput = document.getElementById('promoCode');
        elements.applyPromoBtn = document.getElementById('applyPromoBtn');
        elements.fundMessage = document.getElementById('fundMessage');
    }

    // ========================== TAMBAH UI METODE PEMBAYARAN ==========================
    function createPaymentMethodUI() {
        const fundsForm = document.querySelector('.funds-form');
        if (!fundsForm) return;
        if (document.getElementById('paymentMethodGroup')) return;

        const paymentHtml = `
            <div class="payment-method-group" id="paymentMethodGroup">
                <label>Metode Deposit</label>
                <div class="payment-methods">
                    <label class="payment-method">
                        <input type="radio" name="paymentMethod" value="bank_transfer" checked>
                        <i class="fas fa-university"></i> Transfer Bank
                    </label>
                    <label class="payment-method">
                        <input type="radio" name="paymentMethod" value="ewallet">
                        <i class="fas fa-wallet"></i> E-Wallet
                    </label>
                    <label class="payment-method">
                        <input type="radio" name="paymentMethod" value="crypto">
                        <i class="fab fa-bitcoin"></i> Crypto
                    </label>
                    <label class="payment-method">
                        <input type="radio" name="paymentMethod" value="qris">
                        <i class="fas fa-qrcode"></i> QRIS
                    </label>
                </div>
                <div id="virtualAccountInfo" class="virtual-account-info" style="display:none;">
                    <div class="va-card">
                        <span>Nomor Virtual Account:</span>
                        <strong id="virtualAccountNumber">-</strong>
                        <button id="copyVaBtn" class="btn-copy">Salin</button>
                    </div>
                    <div class="va-instruction">
                        <small>Transfer sesuai nominal ke VA di atas. Dana akan otomatis masuk setelah transfer.</small>
                    </div>
                </div>
            </div>
        `;
        
        // Sisipkan setelah promo row atau sebelum fundMessage
        const promoRow = fundsForm.querySelector('.promo-row');
        if (promoRow) {
            promoRow.insertAdjacentHTML('afterend', paymentHtml);
        } else {
            fundsForm.insertAdjacentHTML('beforeend', paymentHtml);
        }

        // Styling
        const style = document.createElement('style');
        style.textContent = `
            .payment-method-group {
                margin: 16px 0;
            }
            .payment-methods {
                display: flex;
                gap: 12px;
                flex-wrap: wrap;
                margin-top: 8px;
            }
            .payment-method {
                display: flex;
                align-items: center;
                gap: 6px;
                background: #0f172a;
                padding: 8px 16px;
                border-radius: 40px;
                cursor: pointer;
                border: 1px solid #334155;
                transition: all 0.2s;
            }
            .payment-method input {
                margin: 0;
            }
            .payment-method:has(input:checked) {
                background: #3b82f6;
                border-color: #3b82f6;
                color: white;
            }
            .virtual-account-info {
                background: #1f2937;
                border-radius: 20px;
                padding: 16px;
                margin-top: 12px;
            }
            .va-card {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                flex-wrap: wrap;
            }
            .va-card strong {
                font-size: 20px;
                font-family: monospace;
                color: #facc15;
                letter-spacing: 2px;
            }
            .btn-copy {
                background: #3b82f6;
                border: none;
                border-radius: 20px;
                padding: 6px 12px;
                color: white;
                cursor: pointer;
            }
            .va-instruction {
                font-size: 11px;
                color: #9ca3af;
                margin-top: 12px;
            }
        `;
        document.head.appendChild(style);

        // Event listener untuk radio button
        const radioButtons = document.querySelectorAll('input[name="paymentMethod"]');
        radioButtons.forEach(radio => {
            radio.addEventListener('change', (e) => {
                generateVirtualAccount(e.target.value);
            });
        });
        
        elements.selectedPaymentMethod = document.querySelector('input[name="paymentMethod"]:checked');
        elements.virtualAccountDisplay = document.getElementById('virtualAccountInfo');
        
        // Generate VA pertama kali
        generateVirtualAccount('bank_transfer');
    }

    // Generate nomor virtual account berdasarkan metode
    function generateVirtualAccount(method) {
        const vaInfo = document.getElementById('virtualAccountInfo');
        if (!vaInfo) return;
        
        let prefix = '';
        if (method === 'bank_transfer') prefix = '8808';
        else if (method === 'ewallet') prefix = '8810';
        else if (method === 'crypto') prefix = '8812';
        else if (method === 'qris') prefix = '8815';
        
        const randomNum = Math.floor(Math.random() * 10000000000).toString().padStart(10, '0');
        const vaNumber = prefix + randomNum.slice(0, 10);
        
        document.getElementById('virtualAccountNumber').innerText = vaNumber;
        vaInfo.style.display = 'block';
        
        // Simpan ke state untuk validasi (opsional)
        window.currentVirtualAccount = vaNumber;
    }

    // ========================== PROMO CODE ==========================
    const VALID_PROMO_CODES = [
        { code: 'TRENDING10', bonusPercent: 10, minDeposit: 100000, maxBonus: 500000, active: true },
        { code: 'WELCOME20', bonusPercent: 20, minDeposit: 200000, maxBonus: 1000000, active: true },
        { code: 'BONUS50', bonusPercent: 50, minDeposit: 500000, maxBonus: 2500000, active: false },
        { code: 'TRADINGPRO', bonusPercent: 5, minDeposit: 50000, maxBonus: 250000, active: true },
        { code: 'FLASH100', bonusPercent: 100, minDeposit: 1000000, maxBonus: 5000000, active: false }
    ];

    function validatePromoCode(code, depositAmount) {
        const promo = VALID_PROMO_CODES.find(p => p.code === code.toUpperCase() && p.active);
        if (!promo) {
            return { valid: false, message: 'Kode promo tidak valid atau sudah kadaluarsa' };
        }
        if (depositAmount < promo.minDeposit) {
            return { valid: false, message: `Minimal deposit Rp${promo.minDeposit.toLocaleString()} untuk kode ini` };
        }
        const currentUser = DataManager.getCurrentUser();
        if (currentUser) {
            const userPromos = promoUsage[currentUser.username] || [];
            if (userPromos.includes(code.toUpperCase())) {
                return { valid: false, message: 'Kode promo sudah pernah digunakan' };
            }
        }
        let bonus = depositAmount * (promo.bonusPercent / 100);
        if (bonus > promo.maxBonus) bonus = promo.maxBonus;
        return { valid: true, bonus: bonus, message: `Berhasil! Bonus ${promo.bonusPercent}% +Rp${bonus.toLocaleString()}` };
    }

    function applyPromoCode(depositAmount) {
        const code = elements.promoCodeInput?.value.trim();
        if (!code) {
            showFundMessage('Masukkan kode promo', true);
            return null;
        }
        const result = validatePromoCode(code, depositAmount);
        if (!result.valid) {
            showFundMessage(result.message, true);
            return null;
        }
        // Simpan penggunaan promo
        const currentUser = DataManager.getCurrentUser();
        if (currentUser) {
            if (!promoUsage[currentUser.username]) promoUsage[currentUser.username] = [];
            promoUsage[currentUser.username].push(code.toUpperCase());
            localStorage.setItem(STORAGE_KEYS.PROMO_USAGE, JSON.stringify(promoUsage));
        }
        showFundMessage(result.message, false);
        return result.bonus;
    }

    // ========================== PROSES DEPOSIT ==========================
    async function processDeposit() {
        const currentUser = DataManager.getCurrentUser();
        if (!currentUser) {
            showFundMessage('Silakan login terlebih dahulu', true);
            return false;
        }
        
        let amount = parseFloat(elements.depositAmount?.value);
        if (isNaN(amount) || amount <= 0) {
            showFundMessage('Masukkan nominal deposit yang valid', true);
            return false;
        }
        
        // Konversi jika pakai Rupiah (tampilan sudah Rupiah)
        if (CURRENCY.useRupiah) {
            if (amount < FUNDS_CONFIG.minDeposit) {
                showFundMessage(`Minimal deposit Rp${FUNDS_CONFIG.minDeposit.toLocaleString()}`, true);
                return false;
            }
            if (amount > FUNDS_CONFIG.maxDeposit) {
                showFundMessage(`Maksimal deposit Rp${FUNDS_CONFIG.maxDeposit.toLocaleString()}`, true);
                return false;
            }
        } else {
            // USD version
            if (amount < 10) {
                showFundMessage('Minimal deposit $10', true);
                return false;
            }
            if (amount > 10000) {
                showFundMessage('Maksimal deposit $10.000', true);
                return false;
            }
        }
        
        // Apply promo jika ada
        let bonus = 0;
        if (elements.promoCodeInput?.value) {
            bonus = applyPromoCode(amount);
            if (bonus === null) return false;
        }
        
        const totalAdded = amount + (bonus || 0);
        
        // Update saldo user
        const newBalance = currentUser.balance + totalAdded;
        DataManager.updateUserBalance(currentUser.username, newBalance);
        
        // Catat riwayat deposit
        const depositRecord = {
            id: Date.now() + '-' + Math.random().toString(36).substr(2, 6),
            username: currentUser.username,
            amount: amount,
            bonus: bonus || 0,
            total: totalAdded,
            method: document.querySelector('input[name="paymentMethod"]:checked')?.value || 'bank_transfer',
            virtualAccount: window.currentVirtualAccount,
            status: 'completed',
            timestamp: new Date().toISOString()
        };
        depositHistory.push(depositRecord);
        localStorage.setItem(STORAGE_KEYS.DEPOSIT_HISTORY, JSON.stringify(depositHistory));
        
        // Update UI balance
        if (window.DashboardManager) {
            window.DashboardManager.updateBalance(newBalance);
        }
        
        // Tampilkan pesan sukses
        let msg = `Deposit ${CURRENCY.symbol}${amount.toLocaleString()} berhasil`;
        if (bonus) msg += ` + bonus ${CURRENCY.symbol}${bonus.toLocaleString()}`;
        showFundMessage(msg, false);
        
        // Reset form
        if (elements.depositAmount) elements.depositAmount.value = '';
        if (elements.promoCodeInput) elements.promoCodeInput.value = '';
        
        // Refresh history
        if (window.HistoryManager) window.HistoryManager.loadHistory();
        
        return true;
    }

    // ========================== PROSES WITHDRAW ==========================
    async function processWithdraw() {
        const currentUser = DataManager.getCurrentUser();
        if (!currentUser) {
            showFundMessage('Silakan login terlebih dahulu', true);
            return false;
        }
        
        let amount = parseFloat(elements.withdrawAmount?.value);
        if (isNaN(amount) || amount <= 0) {
            showFundMessage('Masukkan nominal withdraw yang valid', true);
            return false;
        }
        
        if (CURRENCY.useRupiah) {
            if (amount < FUNDS_CONFIG.minWithdraw) {
                showFundMessage(`Minimal withdraw Rp${FUNDS_CONFIG.minWithdraw.toLocaleString()}`, true);
                return false;
            }
            if (amount > FUNDS_CONFIG.maxWithdraw) {
                showFundMessage(`Maksimal withdraw per hari Rp${FUNDS_CONFIG.maxWithdraw.toLocaleString()}`, true);
                return false;
            }
        } else {
            if (amount < 10) {
                showFundMessage('Minimal withdraw $10', true);
                return false;
            }
            if (amount > 5000) {
                showFundMessage('Maksimal withdraw $5000 per hari', true);
                return false;
            }
        }
        
        // Cek saldo
        const totalWithdraw = amount + FUNDS_CONFIG.withdrawFee;
        if (currentUser.balance < totalWithdraw) {
            showFundMessage(`Saldo tidak cukup. Dibutuhkan ${CURRENCY.symbol}${totalWithdraw.toLocaleString()} (termasuk fee withdraw ${CURRENCY.symbol}${FUNDS_CONFIG.withdrawFee.toLocaleString()})`, true);
            return false;
        }
        
        // Cek batas withdraw harian
        const today = new Date().toISOString().slice(0,10);
        const todayWithdrawals = withdrawHistory.filter(w => w.username === currentUser.username && w.timestamp.startsWith(today));
        const todayTotal = todayWithdrawals.reduce((sum, w) => sum + w.amount, 0);
        if (todayTotal + amount > FUNDS_CONFIG.dailyWithdrawLimit) {
            showFundMessage(`Batas withdraw harian ${CURRENCY.symbol}${FUNDS_CONFIG.dailyWithdrawLimit.toLocaleString()} tercapai`, true);
            return false;
        }
        
        // Kurangi saldo
        const newBalance = currentUser.balance - totalWithdraw;
        DataManager.updateUserBalance(currentUser.username, newBalance);
        
        // Catat riwayat withdraw
        const withdrawRecord = {
            id: Date.now() + '-' + Math.random().toString(36).substr(2, 6),
            username: currentUser.username,
            amount: amount,
            fee: FUNDS_CONFIG.withdrawFee,
            total: totalWithdraw,
            status: 'processed',
            timestamp: new Date().toISOString()
        };
        withdrawHistory.push(withdrawRecord);
        localStorage.setItem(STORAGE_KEYS.WITHDRAW_HISTORY, JSON.stringify(withdrawHistory));
        
        // Update UI
        if (window.DashboardManager) {
            window.DashboardManager.updateBalance(newBalance);
        }
        
        showFundMessage(`Withdraw ${CURRENCY.symbol}${amount.toLocaleString()} berhasil (fee ${CURRENCY.symbol}${FUNDS_CONFIG.withdrawFee.toLocaleString()})`, false);
        
        // Reset form
        if (elements.withdrawAmount) elements.withdrawAmount.value = '';
        
        if (window.HistoryManager) window.HistoryManager.loadHistory();
        return true;
    }

    // ========================== RIWAYAT DANA (opsional) ==========================
    function renderFundHistory() {
        const container = document.getElementById('fundHistoryList');
        if (!container) return;
        const currentUser = DataManager.getCurrentUser();
        if (!currentUser) return;
        
        const allDeposits = depositHistory.filter(d => d.username === currentUser.username);
        const allWithdraws = withdrawHistory.filter(w => w.username === currentUser.username);
        
        const allFunds = [
            ...allDeposits.map(d => ({ ...d, type: 'deposit', displayAmount: d.total })),
            ...allWithdraws.map(w => ({ ...w, type: 'withdraw', displayAmount: -w.total }))
        ].sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        if (allFunds.length === 0) {
            container.innerHTML = '<div class="empty">Belum ada riwayat deposit/withdraw</div>';
            return;
        }
        
        container.innerHTML = allFunds.slice(0, 10).map(f => `
            <div class="fund-history-item">
                <span class="type ${f.type}">${f.type === 'deposit' ? 'DEPOSIT' : 'WITHDRAW'}</span>
                <span class="amount ${f.type === 'deposit' ? 'positive' : 'negative'}">${CURRENCY.symbol}${Math.abs(f.displayAmount).toLocaleString()}</span>
                <span class="date">${new Date(f.timestamp).toLocaleString()}</span>
            </div>
        `).join('');
    }

    // ========================== LOAD HISTORY FROM STORAGE ==========================
    function loadFundsHistory() {
        const savedDeposits = localStorage.getItem(STORAGE_KEYS.DEPOSIT_HISTORY);
        if (savedDeposits) depositHistory = JSON.parse(savedDeposits);
        const savedWithdraws = localStorage.getItem(STORAGE_KEYS.WITHDRAW_HISTORY);
        if (savedWithdraws) withdrawHistory = JSON.parse(savedWithdraws);
        const savedPromo = localStorage.getItem(STORAGE_KEYS.PROMO_USAGE);
        if (savedPromo) promoUsage = JSON.parse(savedPromo);
    }

    // ========================== UI HELPERS ==========================
    function showFundMessage(msg, isError = false) {
        if (elements.fundMessage) {
            elements.fundMessage.innerHTML = msg;
            elements.fundMessage.style.color = isError ? '#ef4444' : '#10b981';
            setTimeout(() => {
                if (elements.fundMessage) elements.fundMessage.innerHTML = '';
            }, 4000);
        }
        if (window.showToast) {
            window.showToast(msg, isError ? 'error' : 'success');
        }
    }

    // ========================== EVENT LISTENERS ==========================
    function attachFundsEvents() {
        if (elements.depositBtn) {
            elements.depositBtn.removeEventListener('click', processDeposit);
            elements.depositBtn.addEventListener('click', processDeposit);
        }
        if (elements.withdrawBtn) {
            elements.withdrawBtn.removeEventListener('click', processWithdraw);
            elements.withdrawBtn.addEventListener('click', processWithdraw);
        }
        if (elements.applyPromoBtn) {
            elements.applyPromoBtn.removeEventListener('click', () => {});
            elements.applyPromoBtn.addEventListener('click', () => {
                const amount = parseFloat(elements.depositAmount?.value);
                if (isNaN(amount) || amount <= 0) {
                    showFundMessage('Masukkan nominal deposit terlebih dahulu', true);
                    return;
                }
                applyPromoCode(amount);
            });
        }
        // Copy VA button
        const copyBtn = document.getElementById('copyVaBtn');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                const vaNumber = document.getElementById('virtualAccountNumber')?.innerText;
                if (vaNumber) {
                    navigator.clipboard.writeText(vaNumber);
                    showFundMessage('Nomor VA disalin', false);
                }
            });
        }
    }

    // ========================== INISIALISASI ==========================
    function initFunds() {
        cacheElements();
        loadFundsHistory();
        createPaymentMethodUI();
        attachFundsEvents();
        
        // Tambahkan container untuk riwayat dana jika belum ada
        const orderPanel = document.querySelector('.order-panel');
        if (orderPanel && !document.getElementById('fundHistoryList')) {
            const fundHistoryHtml = `
                <hr>
                <div class="card-title">📋 Riwayat Deposit/Withdraw</div>
                <div id="fundHistoryList" class="fund-history-list"></div>
            `;
            orderPanel.insertAdjacentHTML('beforeend', fundHistoryHtml);
            
            const style = document.createElement('style');
            style.textContent = `
                .fund-history-list {
                    max-height: 150px;
                    overflow-y: auto;
                    font-size: 12px;
                }
                .fund-history-item {
                    display: flex;
                    justify-content: space-between;
                    padding: 8px 0;
                    border-bottom: 1px solid #2d3a5e;
                }
                .fund-history-item .type {
                    font-weight: bold;
                }
                .fund-history-item .type.deposit { color: #10b981; }
                .fund-history-item .type.withdraw { color: #ef4444; }
                .fund-history-item .amount.positive { color: #10b981; }
                .fund-history-item .amount.negative { color: #ef4444; }
                .fund-history-item .date {
                    color: #6b7280;
                    font-size: 10px;
                }
            `;
            document.head.appendChild(style);
        }
        
        // Refresh riwayat secara berkala
        setInterval(() => {
            if (DataManager.getCurrentUser()) {
                renderFundHistory();
            }
        }, 5000);
        
        console.log('[FUNDS] Initialized');
    }

    // ========================== PUBLIC API ==========================
    window.FundsManager = {
        init: initFunds,
        attachEvents: initFunds,
        processDeposit,
        processWithdraw,
        applyPromoCode,
        getBalance: () => DataManager.getCurrentUser()?.balance || 0
    };
    
    // Auto init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initFunds);
    } else {
        initFunds();
    }
    
    console.log('[FUNDS] Module loaded');
})();