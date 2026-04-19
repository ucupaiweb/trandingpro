/* ===============================================================
   TRADINGPRO - HISTORY & TRANSACTION MANAGER
   Versi: 2.0.0 | Riwayat transaksi lengkap, filter, search, pagination, export
   =============================================================== */

/**
 * Modul ini bertanggung jawab untuk:
 * - Menampilkan riwayat transaksi user (buy, sell, deposit, withdraw, bonus, close)
 * - Filter berdasarkan jenis transaksi (semua, buy, sell, deposit, withdraw, bonus)
 * - Filter berdasarkan rentang tanggal
 * - Pencarian berdasarkan pair atau deskripsi
 * - Pagination (halaman sebelumnya/berikutnya)
 * - Export ke CSV/JSON
 * - Detail transaksi (modal popup)
 * - Statistik ringkasan (total deposit, total withdraw, total trading volume)
 * - Hapus riwayat (admin only)
 */

(function() {
    'use strict';

    // ========================== KONFIGURASI ==========================
    const HISTORY_CONFIG = {
        itemsPerPage: 10,
        maxDisplayItems: 100,
        dateRangePresets: {
            today: { label: 'Hari Ini', days: 0 },
            yesterday: { label: 'Kemarin', days: 1 },
            week: { label: '7 Hari Terakhir', days: 7 },
            month: { label: '30 Hari Terakhir', days: 30 },
            all: { label: 'Semua Waktu', days: null }
        }
    };

    // ========================== STATE ==========================
    let currentPage = 1;
    let currentFilter = 'all';      // 'all', 'buy', 'sell', 'deposit', 'withdraw', 'bonus', 'close'
    let currentSearch = '';
    let currentDateRange = 'all';    // 'all', 'today', 'yesterday', 'week', 'month'
    let customStartDate = null;
    let customEndDate = null;
    let filteredTransactions = [];
    let paginatedTransactions = [];

    // ========================== DOM ELEMENTS ==========================
    let elements = {};

    function cacheElements() {
        elements.historyList = document.getElementById('historyList');
        elements.filterSelect = document.getElementById('historyFilterSelect');
        elements.searchInput = document.getElementById('historySearchInput');
        elements.dateRangeSelect = document.getElementById('historyDateRange');
        elements.startDateInput = document.getElementById('historyStartDate');
        elements.endDateInput = document.getElementById('historyEndDate');
        elements.applyDateBtn = document.getElementById('applyDateFilter');
        elements.resetFilterBtn = document.getElementById('resetHistoryFilter');
        elements.paginationContainer = document.getElementById('historyPagination');
        elements.exportCsvBtn = document.getElementById('exportHistoryCsv');
        elements.exportJsonBtn = document.getElementById('exportHistoryJson');
        elements.statsSummary = document.getElementById('historyStatsSummary');
        elements.clearHistoryBtn = document.getElementById('clearHistoryBtn');
        
        // Buat elemen jika belum ada (untuk integrasi dengan dashboard yang sudah ada)
        createHistoryUIElements();
    }

    // ========================== BUAT UI ELEMEN YANG BELUM ADA ==========================
    function createHistoryUIElements() {
        const historyContainer = document.getElementById('historyList');
        if (!historyContainer) return;
        
        // Cek apakah filter panel sudah ada
        if (!document.getElementById('historyFilterPanel')) {
            const filterPanel = document.createElement('div');
            filterPanel.id = 'historyFilterPanel';
            filterPanel.className = 'history-filter-panel';
            filterPanel.innerHTML = `
                <div class="filter-row">
                    <div class="filter-group">
                        <label>Filter Jenis</label>
                        <select id="historyFilterSelect">
                            <option value="all">Semua Transaksi</option>
                            <option value="buy">Buy (Beli)</option>
                            <option value="sell">Sell (Jual)</option>
                            <option value="deposit">Deposit</option>
                            <option value="withdraw">Withdraw</option>
                            <option value="bonus">Bonus</option>
                            <option value="close">Close (SL/TP)</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>Cari</label>
                        <input type="text" id="historySearchInput" placeholder="Cari pair atau deskripsi...">
                    </div>
                    <div class="filter-group">
                        <label>Rentang Tanggal</label>
                        <select id="historyDateRange">
                            <option value="all">Semua Waktu</option>
                            <option value="today">Hari Ini</option>
                            <option value="yesterday">Kemarin</option>
                            <option value="week">7 Hari Terakhir</option>
                            <option value="month">30 Hari Terakhir</option>
                            <option value="custom">Kustom</option>
                        </select>
                    </div>
                </div>
                <div id="customDateRange" style="display:none;" class="custom-date-row">
                    <input type="date" id="historyStartDate" placeholder="Tanggal Mulai">
                    <span>s/d</span>
                    <input type="date" id="historyEndDate" placeholder="Tanggal Akhir">
                    <button id="applyDateFilter" class="btn-sm">Terapkan</button>
                    <button id="resetHistoryFilter" class="btn-sm btn-outline">Reset</button>
                </div>
            `;
            historyContainer.parentElement.insertBefore(filterPanel, historyContainer);
        }
        
        // Cek apakah stats summary sudah ada
        if (!document.getElementById('historyStatsSummary')) {
            const statsDiv = document.createElement('div');
            statsDiv.id = 'historyStatsSummary';
            statsDiv.className = 'history-stats-summary';
            historyContainer.parentElement.insertBefore(statsDiv, historyContainer);
        }
        
        // Cek apakah pagination container sudah ada
        if (!document.getElementById('historyPagination')) {
            const paginationDiv = document.createElement('div');
            paginationDiv.id = 'historyPagination';
            paginationDiv.className = 'history-pagination';
            historyContainer.parentElement.appendChild(paginationDiv);
        }
        
        // Tambahkan tombol export jika belum ada
        if (!document.querySelector('.history-export-buttons')) {
            const exportDiv = document.createElement('div');
            exportDiv.className = 'history-export-buttons';
            exportDiv.innerHTML = `
                <button id="exportHistoryCsv" class="btn-export"><i class="fas fa-file-csv"></i> Export CSV</button>
                <button id="exportHistoryJson" class="btn-export"><i class="fas fa-file-code"></i> Export JSON</button>
            `;
            document.getElementById('historyStatsSummary')?.insertAdjacentElement('afterend', exportDiv);
        }
        
        // Simpan referensi elemen baru
        elements.filterSelect = document.getElementById('historyFilterSelect');
        elements.searchInput = document.getElementById('historySearchInput');
        elements.dateRangeSelect = document.getElementById('historyDateRange');
        elements.startDateInput = document.getElementById('historyStartDate');
        elements.endDateInput = document.getElementById('historyEndDate');
        elements.applyDateBtn = document.getElementById('applyDateFilter');
        elements.resetFilterBtn = document.getElementById('resetHistoryFilter');
        elements.paginationContainer = document.getElementById('historyPagination');
        elements.exportCsvBtn = document.getElementById('exportHistoryCsv');
        elements.exportJsonBtn = document.getElementById('exportHistoryJson');
        elements.statsSummary = document.getElementById('historyStatsSummary');
        
        // Styling
        const style = document.createElement('style');
        style.textContent = `
            .history-filter-panel {
                background: #111827cc;
                border-radius: 20px;
                padding: 16px;
                margin-bottom: 20px;
            }
            .filter-row {
                display: flex;
                gap: 16px;
                flex-wrap: wrap;
                align-items: flex-end;
            }
            .filter-group {
                flex: 1;
                min-width: 150px;
            }
            .filter-group label {
                display: block;
                font-size: 11px;
                color: #9ca3af;
                margin-bottom: 4px;
            }
            .filter-group select, .filter-group input {
                width: 100%;
                padding: 8px 12px;
                background: #0f172a;
                border: 1px solid #334155;
                border-radius: 40px;
                color: white;
                font-size: 13px;
            }
            .custom-date-row {
                display: flex;
                gap: 12px;
                align-items: center;
                margin-top: 12px;
                flex-wrap: wrap;
            }
            .custom-date-row input {
                padding: 8px 12px;
                background: #0f172a;
                border: 1px solid #334155;
                border-radius: 40px;
                color: white;
            }
            .btn-sm {
                padding: 6px 16px;
                border-radius: 40px;
                background: #3b82f6;
                border: none;
                color: white;
                cursor: pointer;
            }
            .btn-outline {
                background: transparent;
                border: 1px solid #ef4444;
                color: #ef4444;
            }
            .history-stats-summary {
                display: flex;
                gap: 16px;
                flex-wrap: wrap;
                background: #0f172a;
                border-radius: 20px;
                padding: 12px 16px;
                margin-bottom: 16px;
                font-size: 12px;
            }
            .stat-item {
                flex: 1;
                text-align: center;
            }
            .stat-label {
                color: #9ca3af;
            }
            .stat-value {
                font-weight: bold;
                color: #facc15;
            }
            .history-pagination {
                display: flex;
                justify-content: center;
                gap: 8px;
                margin-top: 20px;
            }
            .page-btn {
                padding: 6px 12px;
                background: #1f2937;
                border: 1px solid #334155;
                border-radius: 40px;
                cursor: pointer;
                color: white;
            }
            .page-btn.active {
                background: #3b82f6;
                border-color: #3b82f6;
            }
            .page-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            .history-export-buttons {
                display: flex;
                gap: 12px;
                justify-content: flex-end;
                margin-bottom: 16px;
            }
            .btn-export {
                background: #1f2937;
                border: 1px solid #334155;
                border-radius: 40px;
                padding: 6px 16px;
                color: #9ca3af;
                cursor: pointer;
            }
            .btn-export:hover {
                background: #3b82f6;
                color: white;
            }
            .history-item-detail {
                cursor: pointer;
                transition: background 0.2s;
            }
            .history-item-detail:hover {
                background: rgba(59,130,246,0.1);
            }
        `;
        document.head.appendChild(style);
    }

    // ========================== AMBIL DATA TRANSAKSI ==========================
    function getCurrentUserTransactions() {
        const currentUser = DataManager.getCurrentUser();
        if (!currentUser) return [];
        return DataManager.getUserTransactions(currentUser.username);
    }

    // ========================== FILTER & PENCARIAN ==========================
    function applyFilters() {
        let transactions = getCurrentUserTransactions();
        
        // Filter jenis transaksi
        if (currentFilter !== 'all') {
            transactions = transactions.filter(tx => tx.type === currentFilter);
        }
        
        // Filter pencarian (pair atau deskripsi)
        if (currentSearch) {
            const searchLower = currentSearch.toLowerCase();
            transactions = transactions.filter(tx => {
                const pair = (tx.pair || '').toLowerCase();
                const type = (tx.type || '').toLowerCase();
                const orderType = (tx.orderType || '').toLowerCase();
                return pair.includes(searchLower) || type.includes(searchLower) || orderType.includes(searchLower);
            });
        }
        
        // Filter rentang tanggal
        const now = new Date();
        let startDate = null;
        let endDate = null;
        
        if (currentDateRange === 'today') {
            startDate = new Date(now.setHours(0,0,0,0));
            endDate = new Date();
        } else if (currentDateRange === 'yesterday') {
            startDate = new Date(now.setDate(now.getDate() - 1));
            startDate.setHours(0,0,0,0);
            endDate = new Date(startDate);
            endDate.setHours(23,59,59,999);
        } else if (currentDateRange === 'week') {
            startDate = new Date();
            startDate.setDate(startDate.getDate() - 7);
            startDate.setHours(0,0,0,0);
            endDate = new Date();
        } else if (currentDateRange === 'month') {
            startDate = new Date();
            startDate.setDate(startDate.getDate() - 30);
            startDate.setHours(0,0,0,0);
            endDate = new Date();
        } else if (currentDateRange === 'custom' && customStartDate && customEndDate) {
            startDate = new Date(customStartDate);
            startDate.setHours(0,0,0,0);
            endDate = new Date(customEndDate);
            endDate.setHours(23,59,59,999);
        }
        
        if (startDate && endDate) {
            transactions = transactions.filter(tx => {
                const txDate = new Date(tx.timestamp || tx.date);
                return txDate >= startDate && txDate <= endDate;
            });
        }
        
        // Urutkan dari terbaru ke terlama
        transactions.sort((a, b) => new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date));
        
        filteredTransactions = transactions;
        currentPage = 1;
        updatePagination();
        renderHistory();
        updateStatsSummary();
    }

    // ========================== PAGINATION ==========================
    function updatePagination() {
        const totalPages = Math.ceil(filteredTransactions.length / HISTORY_CONFIG.itemsPerPage);
        const start = (currentPage - 1) * HISTORY_CONFIG.itemsPerPage;
        const end = start + HISTORY_CONFIG.itemsPerPage;
        paginatedTransactions = filteredTransactions.slice(start, end);
        
        // Render pagination buttons
        if (elements.paginationContainer) {
            let html = '';
            html += `<button class="page-btn" data-page="prev" ${currentPage === 1 ? 'disabled' : ''}><i class="fas fa-chevron-left"></i></button>`;
            
            for (let i = 1; i <= Math.min(totalPages, 5); i++) {
                html += `<button class="page-btn ${currentPage === i ? 'active' : ''}" data-page="${i}">${i}</button>`;
            }
            if (totalPages > 5) {
                html += `<span>...</span>`;
                html += `<button class="page-btn" data-page="${totalPages}">${totalPages}</button>`;
            }
            
            html += `<button class="page-btn" data-page="next" ${currentPage === totalPages || totalPages === 0 ? 'disabled' : ''}><i class="fas fa-chevron-right"></i></button>`;
            elements.paginationContainer.innerHTML = html;
            
            // Attach event listeners
            document.querySelectorAll('.page-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const page = btn.dataset.page;
                    if (page === 'prev' && currentPage > 1) currentPage--;
                    else if (page === 'next' && currentPage < totalPages) currentPage++;
                    else if (!isNaN(parseInt(page))) currentPage = parseInt(page);
                    updatePagination();
                    renderHistory();
                });
            });
        }
    }

    // ========================== RENDER RIWAYAT ==========================
    function renderHistory() {
        if (!elements.historyList) return;
        
        if (paginatedTransactions.length === 0) {
            elements.historyList.innerHTML = '<div class="empty-history">Tidak ada transaksi</div>';
            return;
        }
        
        elements.historyList.innerHTML = paginatedTransactions.map(tx => {
            const typeConfig = getTransactionTypeConfig(tx.type);
            const date = new Date(tx.timestamp || tx.date);
            const formattedDate = Utils.formatDate(date, true);
            const amountDisplay = formatTransactionAmount(tx);
            const pairDisplay = tx.pair || '-';
            const priceDisplay = tx.price ? `@ $${tx.price.toLocaleString()}` : '';
            const totalDisplay = tx.total ? `$${tx.total.toLocaleString()}` : '';
            const feeDisplay = tx.fee ? `Fee: $${tx.fee.toLocaleString()}` : '';
            const pnlDisplay = tx.pnl ? `<span class="${parseFloat(tx.pnl) >= 0 ? 'positive' : 'negative'}">PnL: ${parseFloat(tx.pnl) >= 0 ? '+' : ''}$${tx.pnl}</span>` : '';
            
            return `
                <div class="history-item history-item-detail" data-id="${tx.id}">
                    <div class="history-icon ${tx.type}">${typeConfig.icon}</div>
                    <div class="history-info">
                        <div class="history-type">${typeConfig.label}</div>
                        <div class="history-detail">${pairDisplay} ${amountDisplay} ${priceDisplay}</div>
                        <div class="history-meta">${formattedDate} ${feeDisplay} ${pnlDisplay}</div>
                    </div>
                    <div class="history-total">${totalDisplay || amountDisplay}</div>
                </div>
            `;
        }).join('');
        
        // Event klik untuk detail transaksi
        document.querySelectorAll('.history-item-detail').forEach(el => {
            el.addEventListener('click', (e) => {
                const id = el.dataset.id;
                const tx = paginatedTransactions.find(t => t.id === id);
                if (tx) showTransactionDetail(tx);
            });
        });
    }

    function getTransactionTypeConfig(type) {
        const configs = {
            buy: { label: 'BUY', icon: '📈', color: '#10b981' },
            sell: { label: 'SELL', icon: '📉', color: '#ef4444' },
            deposit: { label: 'DEPOSIT', icon: '💰', color: '#3b82f6' },
            withdraw: { label: 'WITHDRAW', icon: '💸', color: '#f97316' },
            bonus: { label: 'BONUS', icon: '🎁', color: '#facc15' },
            close: { label: 'CLOSE (SL/TP)', icon: '🔒', color: '#8b5cf6' },
            fee: { label: 'FEE', icon: '📋', color: '#6b7280' }
        };
        return configs[type] || { label: type.toUpperCase(), icon: '📝', color: '#9ca3af' };
    }

    function formatTransactionAmount(tx) {
        if (tx.type === 'deposit' || tx.type === 'withdraw') {
            return `${Utils.formatCurrency(tx.amount)}`;
        }
        if (tx.type === 'buy' || tx.type === 'sell') {
            return `${tx.amount} ${tx.pair}`;
        }
        if (tx.type === 'bonus') {
            return `+${Utils.formatCurrency(tx.amount)}`;
        }
        if (tx.type === 'close') {
            return `${tx.amount} ${tx.pair}`;
        }
        return '';
    }

    // ========================== STATISTIK RINGKASAN ==========================
    function updateStatsSummary() {
        if (!elements.statsSummary) return;
        const transactions = filteredTransactions;
        
        let totalDeposit = 0;
        let totalWithdraw = 0;
        let totalBuy = 0;
        let totalSell = 0;
        let totalFee = 0;
        
        transactions.forEach(tx => {
            if (tx.type === 'deposit') totalDeposit += tx.amount || tx.total || 0;
            if (tx.type === 'withdraw') totalWithdraw += tx.amount || tx.total || 0;
            if (tx.type === 'buy') totalBuy += tx.total || 0;
            if (tx.type === 'sell') totalSell += tx.total || 0;
            if (tx.fee) totalFee += tx.fee;
        });
        
        elements.statsSummary.innerHTML = `
            <div class="stat-item"><div class="stat-label">Total Deposit</div><div class="stat-value">${Utils.formatCurrency(totalDeposit)}</div></div>
            <div class="stat-item"><div class="stat-label">Total Withdraw</div><div class="stat-value">${Utils.formatCurrency(totalWithdraw)}</div></div>
            <div class="stat-item"><div class="stat-label">Total Buy</div><div class="stat-value">${Utils.formatCurrency(totalBuy)}</div></div>
            <div class="stat-item"><div class="stat-label">Total Sell</div><div class="stat-value">${Utils.formatCurrency(totalSell)}</div></div>
            <div class="stat-item"><div class="stat-label">Total Fee</div><div class="stat-value">${Utils.formatCurrency(totalFee)}</div></div>
            <div class="stat-item"><div class="stat-label">Total Transaksi</div><div class="stat-value">${transactions.length}</div></div>
        `;
    }

    // ========================== DETAIL TRANSAKSI (MODAL) ==========================
    function showTransactionDetail(tx) {
        let modal = document.getElementById('txDetailModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'txDetailModal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content modal-sm">
                    <span class="close-modal">&times;</span>
                    <h3>Detail Transaksi</h3>
                    <div id="txDetailContent"></div>
                </div>
            `;
            document.body.appendChild(modal);
            
            const closeSpan = modal.querySelector('.close-modal');
            closeSpan.onclick = () => modal.style.display = 'none';
            window.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
        }
        
        const content = document.getElementById('txDetailContent');
        const typeConfig = getTransactionTypeConfig(tx.type);
        const date = new Date(tx.timestamp || tx.date);
        
        content.innerHTML = `
            <table class="detail-table">
                <tr><td>Jenis</td><td><strong style="color:${typeConfig.color}">${typeConfig.label}</strong></td></tr>
                <tr><td>Tanggal</td><td>${Utils.formatDate(date, true)}</td></tr>
                ${tx.pair ? `<tr><td>Pair</td><td>${tx.pair}</td></tr>` : ''}
                ${tx.amount ? `<tr><td>Jumlah</td><td>${tx.type === 'deposit' || tx.type === 'withdraw' || tx.type === 'bonus' ? Utils.formatCurrency(tx.amount) : tx.amount}</td></tr>` : ''}
                ${tx.price ? `<tr><td>Harga</td><td>$${tx.price.toLocaleString()}</td></tr>` : ''}
                ${tx.total ? `<tr><td>Total</td><td>$${tx.total.toLocaleString()}</td></tr>` : ''}
                ${tx.fee ? `<tr><td>Fee</td><td>$${tx.fee.toLocaleString()}</td></tr>` : ''}
                ${tx.pnl ? `<tr><td>PnL</td><td class="${parseFloat(tx.pnl) >= 0 ? 'positive' : 'negative'}">${parseFloat(tx.pnl) >= 0 ? '+' : ''}$${tx.pnl}</td></tr>` : ''}
                <tr><td>ID Transaksi</td><td><small>${tx.id}</small></td></tr>
            </table>
        `;
        
        modal.style.display = 'flex';
    }

    // ========================== EXPORT CSV/JSON ==========================
    function exportToCSV() {
        const transactions = filteredTransactions;
        if (transactions.length === 0) {
            Utils.showToast('Tidak ada data untuk diexport', 'warning');
            return;
        }
        
        const headers = ['ID', 'Jenis', 'Pair', 'Jumlah', 'Harga', 'Total', 'Fee', 'PnL', 'Tanggal'];
        const rows = transactions.map(tx => [
            tx.id,
            getTransactionTypeConfig(tx.type).label,
            tx.pair || '',
            tx.amount || '',
            tx.price || '',
            tx.total || '',
            tx.fee || '',
            tx.pnl || '',
            new Date(tx.timestamp || tx.date).toLocaleString()
        ]);
        
        const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.setAttribute('download', `tradingpro_history_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        Utils.showToast('Export CSV berhasil', 'success');
    }
    
    function exportToJSON() {
        const transactions = filteredTransactions;
        if (transactions.length === 0) {
            Utils.showToast('Tidak ada data untuk diexport', 'warning');
            return;
        }
        const data = {
            exportDate: new Date().toISOString(),
            totalTransactions: transactions.length,
            transactions: transactions
        };
        Utils.downloadJson(data, `tradingpro_history_${Date.now()}.json`);
        Utils.showToast('Export JSON berhasil', 'success');
    }

    // ========================== HAPUS RIWAYAT (ADMIN ONLY) ==========================
    function clearHistory() {
        const currentUser = DataManager.getCurrentUser();
        if (currentUser?.role !== 'admin') {
            Utils.showToast('Hanya admin yang dapat menghapus riwayat', 'error');
            return;
        }
        
        if (confirm('Yakin ingin menghapus semua riwayat transaksi? Tindakan ini tidak dapat dibatalkan.')) {
            DataManager.clearUserTransactions(currentUser.username);
            applyFilters();
            Utils.showToast('Riwayat berhasil dihapus', 'success');
        }
    }

    // ========================== EVENT LISTENERS ==========================
    function attachEvents() {
        if (elements.filterSelect) {
            elements.filterSelect.addEventListener('change', (e) => {
                currentFilter = e.target.value;
                applyFilters();
            });
        }
        if (elements.searchInput) {
            elements.searchInput.addEventListener('input', Utils.debounce((e) => {
                currentSearch = e.target.value;
                applyFilters();
            }, 300));
        }
        if (elements.dateRangeSelect) {
            elements.dateRangeSelect.addEventListener('change', (e) => {
                currentDateRange = e.target.value;
                const customDiv = document.getElementById('customDateRange');
                if (customDiv) customDiv.style.display = currentDateRange === 'custom' ? 'flex' : 'none';
                if (currentDateRange !== 'custom') {
                    applyFilters();
                }
            });
        }
        if (elements.applyDateBtn) {
            elements.applyDateBtn.addEventListener('click', () => {
                customStartDate = elements.startDateInput?.value;
                customEndDate = elements.endDateInput?.value;
                if (customStartDate && customEndDate) {
                    applyFilters();
                } else {
                    Utils.showToast('Pilih tanggal mulai dan akhir', 'warning');
                }
            });
        }
        if (elements.resetFilterBtn) {
            elements.resetFilterBtn.addEventListener('click', () => {
                currentFilter = 'all';
                currentSearch = '';
                currentDateRange = 'all';
                customStartDate = null;
                customEndDate = null;
                if (elements.filterSelect) elements.filterSelect.value = 'all';
                if (elements.searchInput) elements.searchInput.value = '';
                if (elements.dateRangeSelect) elements.dateRangeSelect.value = 'all';
                if (elements.startDateInput) elements.startDateInput.value = '';
                if (elements.endDateInput) elements.endDateInput.value = '';
                document.getElementById('customDateRange').style.display = 'none';
                applyFilters();
            });
        }
        if (elements.exportCsvBtn) {
            elements.exportCsvBtn.addEventListener('click', exportToCSV);
        }
        if (elements.exportJsonBtn) {
            elements.exportJsonBtn.addEventListener('click', exportToJSON);
        }
        if (elements.clearHistoryBtn) {
            elements.clearHistoryBtn.addEventListener('click', clearHistory);
        }
    }

    // ========================== LOAD HISTORY (DIPANGGIL DARI DASHBOARD) ==========================
    function loadHistory() {
        cacheElements();
        attachEvents();
        applyFilters();
    }

    // ========================== PUBLIC API ==========================
    window.HistoryManager = {
        loadHistory,
        refresh: loadHistory,
        getFilteredTransactions: () => filteredTransactions,
        exportToCSV,
        exportToJSON
    };
    
    console.log('[HISTORY] Module loaded');
})();