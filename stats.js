/* ===============================================================
   TRADINGPRO - STATISTICS & ANALYTICS DASHBOARD
   Versi: 2.0.0 | Statistik real-time, chart aktivitas, peringkat user, profit/loss, integrasi admin
   =============================================================== */

/**
 * Modul ini menampilkan berbagai statistik:
 * - Total pengguna terdaftar & aktif hari ini
 * - Total volume transaksi (hari ini, minggu ini, bulan ini)
 * - Profit/Loss keseluruhan (admin view)
 * - Peringkat user berdasarkan profit/volume (top traders)
 * - Chart aktivitas trading per jam (line/bar)
 * - Statistik deposit/withdraw
 * - Live update setiap 30 detik
 * - Data tersimpan di localStorage dan sinkron dengan DataManager
 */

(function() {
    'use strict';

    // ========================== KONFIGURASI ==========================
    const STATS_CONFIG = {
        updateIntervalMs: 30000,          // update tiap 30 detik
        maxTopUsers: 10,                  // jumlah user di peringkat
        chartPoints: 24,                  // jumlah titik untuk chart (24 jam)
        enableRealtimeChart: true,
        currencySymbol: 'Rp',
        useRupiah: true
    };

    // ========================== STATE ==========================
    let statsState = {
        totalUsers: 0,
        activeToday: 0,
        totalVolumeToday: 0,
        totalVolumeWeek: 0,
        totalVolumeMonth: 0,
        totalDeposit: 0,
        totalWithdraw: 0,
        totalProfitAdmin: 0,      // profit dari fee + manipulasi (untuk admin)
        topGainers: [],            // user dengan profit tertinggi
        topLosers: [],             // user dengan loss terbesar
        topVolumeTraders: [],      // user dengan volume trading tertinggi
        hourlyActivity: [],        // array 24 jam
        lastUpdate: null
    };

    let updateInterval = null;
    let chartInstance = null;

    // ========================== DOM ELEMENTS ==========================
    let elements = {};

    function cacheElements() {
        elements.statsContainer = document.getElementById('statsPanel');
        // Buat container jika belum ada (dipanggil dari dashboard)
        createStatsUI();
    }

    // ========================== BUAT UI STATISTIK ==========================
    function createStatsUI() {
        // Cek apakah sudah ada panel statistik di dashboard
        let statsPanel = document.getElementById('statsPanel');
        if (statsPanel) return;

        const dashboard = document.getElementById('dashboardSection');
        if (!dashboard) return;

        statsPanel = document.createElement('div');
        statsPanel.id = 'statsPanel';
        statsPanel.className = 'stats-panel';
        statsPanel.innerHTML = `
            <div class="stats-header">
                <h3><i class="fas fa-chart-pie"></i> Statistik Platform</h3>
                <button id="refreshStatsBtn" class="btn-refresh-stats"><i class="fas fa-sync-alt"></i></button>
            </div>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon"><i class="fas fa-users"></i></div>
                    <div class="stat-info">
                        <span class="stat-value" id="statTotalUsers">0</span>
                        <span class="stat-label">Total Pengguna</span>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon"><i class="fas fa-user-check"></i></div>
                    <div class="stat-info">
                        <span class="stat-value" id="statActiveToday">0</span>
                        <span class="stat-label">Aktif Hari Ini</span>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon"><i class="fas fa-chart-line"></i></div>
                    <div class="stat-info">
                        <span class="stat-value" id="statVolumeToday">Rp0</span>
                        <span class="stat-label">Volume Hari Ini</span>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon"><i class="fas fa-calendar-week"></i></div>
                    <div class="stat-info">
                        <span class="stat-value" id="statVolumeWeek">Rp0</span>
                        <span class="stat-label">Volume Minggu Ini</span>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon"><i class="fas fa-money-bill-wave"></i></div>
                    <div class="stat-info">
                        <span class="stat-value" id="statTotalDeposit">Rp0</span>
                        <span class="stat-label">Total Deposit</span>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon"><i class="fas fa-hand-holding-usd"></i></div>
                    <div class="stat-info">
                        <span class="stat-value" id="statTotalWithdraw">Rp0</span>
                        <span class="stat-label">Total Withdraw</span>
                    </div>
                </div>
                <div class="stat-card admin-only" id="adminProfitCard" style="display:none;">
                    <div class="stat-icon"><i class="fas fa-coins"></i></div>
                    <div class="stat-info">
                        <span class="stat-value" id="statAdminProfit">Rp0</span>
                        <span class="stat-label">Profit Admin (Fee)</span>
                    </div>
                </div>
            </div>
            <div class="stats-chart-container">
                <canvas id="activityChart" width="400" height="150"></canvas>
                <div class="chart-label">Aktivitas Trading (24 Jam Terakhir)</div>
            </div>
            <div class="stats-ranking">
                <div class="ranking-section">
                    <h4>🏆 Top Gainers (Profit)</h4>
                    <div id="topGainersList" class="ranking-list"></div>
                </div>
                <div class="ranking-section">
                    <h4>📉 Top Losers (Loss)</h4>
                    <div id="topLosersList" class="ranking-list"></div>
                </div>
                <div class="ranking-section">
                    <h4>💎 Top Volume Trader</h4>
                    <div id="topVolumeList" class="ranking-list"></div>
                </div>
            </div>
            <div class="stats-footer">
                <span>Last update: <span id="statsLastUpdate">-</span></span>
            </div>
        `;

        // Sisipkan setelah trending widget atau di bawahnya
        const trendingWidget = document.querySelector('.trending-widget');
        if (trendingWidget) {
            trendingWidget.insertAdjacentElement('afterend', statsPanel);
        } else {
            dashboard.appendChild(statsPanel);
        }

        // Styling
        const style = document.createElement('style');
        style.textContent = `
            .stats-panel {
                background: #111827cc;
                border-radius: 28px;
                padding: 20px;
                margin: 20px 0;
                border: 1px solid #2d3a5e;
            }
            .stats-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 16px;
            }
            .stats-header h3 {
                margin: 0;
                color: #facc15;
            }
            .btn-refresh-stats {
                background: none;
                border: none;
                color: #9ca3af;
                cursor: pointer;
                font-size: 16px;
            }
            .stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                gap: 16px;
                margin-bottom: 24px;
            }
            .stat-card {
                background: #0f172a;
                border-radius: 20px;
                padding: 12px;
                display: flex;
                align-items: center;
                gap: 12px;
            }
            .stat-icon {
                font-size: 28px;
                color: #3b82f6;
            }
            .stat-info {
                display: flex;
                flex-direction: column;
            }
            .stat-value {
                font-size: 20px;
                font-weight: bold;
                color: white;
            }
            .stat-label {
                font-size: 11px;
                color: #9ca3af;
            }
            .stats-chart-container {
                background: #0f172a;
                border-radius: 20px;
                padding: 12px;
                margin-bottom: 24px;
            }
            #activityChart {
                width: 100%;
                max-height: 150px;
            }
            .chart-label {
                text-align: center;
                font-size: 11px;
                color: #6b7280;
                margin-top: 8px;
            }
            .stats-ranking {
                display: flex;
                flex-wrap: wrap;
                gap: 24px;
                margin-bottom: 16px;
            }
            .ranking-section {
                flex: 1;
                min-width: 180px;
                background: #0f172a;
                border-radius: 20px;
                padding: 12px;
            }
            .ranking-section h4 {
                margin: 0 0 10px 0;
                font-size: 14px;
                color: #facc15;
            }
            .ranking-list {
                font-size: 12px;
            }
            .ranking-item {
                display: flex;
                justify-content: space-between;
                padding: 6px 0;
                border-bottom: 1px solid #2d3a5e;
            }
            .ranking-name {
                font-weight: 500;
            }
            .ranking-value {
                color: #10b981;
            }
            .ranking-value.negative {
                color: #ef4444;
            }
            .stats-footer {
                font-size: 10px;
                color: #6b7280;
                text-align: right;
            }
            @media (max-width: 768px) {
                .stats-grid {
                    grid-template-columns: repeat(2, 1fr);
                }
                .stats-ranking {
                    flex-direction: column;
                }
            }
        `;
        document.head.appendChild(style);

        // Simpan referensi elemen
        elements.statsPanel = statsPanel;
        elements.statTotalUsers = document.getElementById('statTotalUsers');
        elements.statActiveToday = document.getElementById('statActiveToday');
        elements.statVolumeToday = document.getElementById('statVolumeToday');
        elements.statVolumeWeek = document.getElementById('statVolumeWeek');
        elements.statTotalDeposit = document.getElementById('statTotalDeposit');
        elements.statTotalWithdraw = document.getElementById('statTotalWithdraw');
        elements.statAdminProfit = document.getElementById('statAdminProfit');
        elements.adminProfitCard = document.getElementById('adminProfitCard');
        elements.topGainersList = document.getElementById('topGainersList');
        elements.topLosersList = document.getElementById('topLosersList');
        elements.topVolumeList = document.getElementById('topVolumeList');
        elements.statsLastUpdate = document.getElementById('statsLastUpdate');
        elements.refreshBtn = document.getElementById('refreshStatsBtn');
        elements.chartCanvas = document.getElementById('activityChart');
    }

    // ========================== HITUNG STATISTIK DARI DATA ==========================
    function computeStatistics() {
        const users = DataManager.getUsers();
        const transactions = DataManager.getTransactions();
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - 7);
        const monthStart = new Date(now);
        monthStart.setDate(now.getDate() - 30);

        // Total users
        const totalUsers = users.length;
        
        // Active today (user yang memiliki transaksi hari ini atau login hari ini)
        const activeToday = users.filter(u => {
            const lastLogin = u.lastLogin ? new Date(u.lastLogin) : null;
            return lastLogin && lastLogin >= todayStart;
        }).length;
        
        // Volume hari ini, minggu, bulan
        let volumeToday = 0, volumeWeek = 0, volumeMonth = 0;
        let totalDeposit = 0, totalWithdraw = 0, totalFee = 0;
        
        transactions.forEach(tx => {
            const txDate = new Date(tx.timestamp || tx.date);
            const amount = tx.total || tx.amount || 0;
            if (tx.type === 'deposit') totalDeposit += amount;
            if (tx.type === 'withdraw') totalWithdraw += amount;
            if (tx.fee) totalFee += tx.fee;
            
            if (tx.type === 'buy' || tx.type === 'sell') {
                if (txDate >= todayStart) volumeToday += amount;
                if (txDate >= weekStart) volumeWeek += amount;
                if (txDate >= monthStart) volumeMonth += amount;
            }
        });
        
        // Profit admin = total fee + (bisa ditambah dari manipulasi market, tapi di sini dari fee)
        const adminProfit = totalFee;
        
        // Hitung profit/loss per user (berdasarkan transaksi buy/sell dan close)
        const userPnL = new Map();
        const userVolume = new Map();
        
        transactions.forEach(tx => {
            const username = tx.username;
            if (tx.type === 'close' && tx.pnl) {
                const pnl = parseFloat(tx.pnl);
                userPnL.set(username, (userPnL.get(username) || 0) + pnl);
            }
            if (tx.type === 'buy' || tx.type === 'sell') {
                const volume = tx.total || 0;
                userVolume.set(username, (userVolume.get(username) || 0) + volume);
            }
        });
        
        // Top gainers (profit tertinggi)
        const gainers = Array.from(userPnL.entries())
            .map(([name, profit]) => ({ name, profit }))
            .sort((a,b) => b.profit - a.profit)
            .slice(0, STATS_CONFIG.maxTopUsers);
        
        // Top losers (loss terbesar)
        const losers = Array.from(userPnL.entries())
            .map(([name, profit]) => ({ name, loss: Math.abs(profit) }))
            .filter(l => l.loss > 0)
            .sort((a,b) => b.loss - a.loss)
            .slice(0, STATS_CONFIG.maxTopUsers);
        
        // Top volume traders
        const volumeTraders = Array.from(userVolume.entries())
            .map(([name, volume]) => ({ name, volume }))
            .sort((a,b) => b.volume - a.volume)
            .slice(0, STATS_CONFIG.maxTopUsers);
        
        // Hitung aktivitas per jam (24 jam terakhir)
        const hourly = Array(24).fill(0);
        const last24h = new Date(now.getTime() - 24 * 3600000);
        transactions.forEach(tx => {
            const txDate = new Date(tx.timestamp || tx.date);
            if (txDate >= last24h && (tx.type === 'buy' || tx.type === 'sell')) {
                const hour = txDate.getHours();
                hourly[hour] += 1;
            }
        });
        
        statsState = {
            totalUsers,
            activeToday,
            totalVolumeToday: volumeToday,
            totalVolumeWeek: volumeWeek,
            totalVolumeMonth: volumeMonth,
            totalDeposit,
            totalWithdraw,
            totalProfitAdmin: adminProfit,
            topGainers: gainers,
            topLosers: losers,
            topVolumeTraders: volumeTraders,
            hourlyActivity: hourly,
            lastUpdate: new Date()
        };
    }

    // ========================== RENDER STATISTIK KE UI ==========================
    function renderStatistics() {
        if (!elements.statTotalUsers) return;
        
        const formatCurrency = (val) => {
            if (STATS_CONFIG.useRupiah) {
                return 'Rp' + Math.floor(val).toLocaleString('id-ID');
            }
            return '$' + val.toLocaleString('en-US', { minimumFractionDigits: 2 });
        };
        
        elements.statTotalUsers.innerText = statsState.totalUsers;
        elements.statActiveToday.innerText = statsState.activeToday;
        elements.statVolumeToday.innerText = formatCurrency(statsState.totalVolumeToday);
        elements.statVolumeWeek.innerText = formatCurrency(statsState.totalVolumeWeek);
        elements.statTotalDeposit.innerText = formatCurrency(statsState.totalDeposit);
        elements.statTotalWithdraw.innerText = formatCurrency(statsState.totalWithdraw);
        
        // Tampilkan profit admin hanya untuk role admin
        const currentUser = DataManager.getCurrentUser();
        if (currentUser && currentUser.role === 'admin') {
            if (elements.adminProfitCard) elements.adminProfitCard.style.display = 'flex';
            if (elements.statAdminProfit) elements.statAdminProfit.innerText = formatCurrency(statsState.totalProfitAdmin);
        } else {
            if (elements.adminProfitCard) elements.adminProfitCard.style.display = 'none';
        }
        
        // Render ranking
        if (elements.topGainersList) {
            elements.topGainersList.innerHTML = statsState.topGainers.map(g => `
                <div class="ranking-item">
                    <span class="ranking-name">${escapeHtml(g.name)}</span>
                    <span class="ranking-value">${formatCurrency(g.profit)}</span>
                </div>
            `).join('');
            if (statsState.topGainers.length === 0) elements.topGainersList.innerHTML = '<div class="ranking-item">Belum ada data</div>';
        }
        
        if (elements.topLosersList) {
            elements.topLosersList.innerHTML = statsState.topLosers.map(l => `
                <div class="ranking-item">
                    <span class="ranking-name">${escapeHtml(l.name)}</span>
                    <span class="ranking-value negative">-${formatCurrency(l.loss)}</span>
                </div>
            `).join('');
            if (statsState.topLosers.length === 0) elements.topLosersList.innerHTML = '<div class="ranking-item">Belum ada data</div>';
        }
        
        if (elements.topVolumeList) {
            elements.topVolumeList.innerHTML = statsState.topVolumeTraders.map(v => `
                <div class="ranking-item">
                    <span class="ranking-name">${escapeHtml(v.name)}</span>
                    <span class="ranking-value">${formatCurrency(v.volume)}</span>
                </div>
            `).join('');
            if (statsState.topVolumeTraders.length === 0) elements.topVolumeList.innerHTML = '<div class="ranking-item">Belum ada data</div>';
        }
        
        if (elements.statsLastUpdate) {
            elements.statsLastUpdate.innerText = Utils.formatDate(statsState.lastUpdate, true);
        }
        
        // Update chart
        if (STATS_CONFIG.enableRealtimeChart && elements.chartCanvas) {
            updateChart();
        }
    }
    
    function updateChart() {
        const ctx = elements.chartCanvas.getContext('2d');
        if (chartInstance) chartInstance.destroy();
        chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array.from({length: 24}, (_,i) => i + ':00'),
                datasets: [{
                    label: 'Jumlah Transaksi',
                    data: statsState.hourlyActivity,
                    borderColor: '#facc15',
                    backgroundColor: 'rgba(250,204,21,0.1)',
                    fill: true,
                    tension: 0.3,
                    pointRadius: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { labels: { color: '#9ca3af' } },
                    tooltip: { callbacks: { label: (ctx) => `${ctx.raw} transaksi` } }
                },
                scales: {
                    x: { ticks: { color: '#9ca3af', maxRotation: 45, autoSkip: true, maxTicksLimit: 8 } },
                    y: { ticks: { color: '#9ca3af', stepSize: 1 } }
                }
            }
        });
    }
    
    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }

    // ========================== UPDATE COMPLETE ==========================
    function refreshStats() {
        computeStatistics();
        renderStatistics();
    }

    // ========================== START AUTO UPDATE ==========================
    function startStatsUpdates() {
        refreshStats();
        if (updateInterval) clearInterval(updateInterval);
        updateInterval = setInterval(() => {
            refreshStats();
        }, STATS_CONFIG.updateIntervalMs);
    }

    // ========================== INISIALISASI ==========================
    function initStats() {
        cacheElements();
        startStatsUpdates();
        if (elements.refreshBtn) {
            elements.refreshBtn.addEventListener('click', () => {
                refreshStats();
                Utils.showToast('Statistik diperbarui', 'info', 1000);
            });
        }
        console.log('[STATS] Initialized');
    }

    // ========================== PUBLIC API ==========================
    window.StatsManager = {
        init: initStats,
        refresh: refreshStats,
        getStats: () => ({ ...statsState })
    };

    // Auto init jika DOM siap (dipanggil dari dashboard juga)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initStats);
    } else {
        initStats();
    }
})();