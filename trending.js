/* ===============================================================
   TRADINGPRO - TRENDING ENGINE (LIVE PREMIUM EDITION)
   Versi: 5.0.0 | Live auto-update setiap detik, manipulasi pasar berdasarkan status user, efek pump & dump
   =============================================================== */

/**
 * FITUR LIVE:
 * - Data trending berjalan terus tanpa henti (interval 3 detik)
 * - User demo (belum deposit) => melihat grafik PUMP terus (harga naik tinggi)
 * - User premium (sudah deposit) => harga naik (pump) lalu ANJLOK (dump) berulang
 * - Sparkline mini chart berubah setiap update, menunjukkan pola manipulasi
 * - Semua perubahan tersimpan di localStorage dan langsung tampil di UI
 * - Admin bisa reset status user kapan saja
 */

(function() {
    'use strict';

    // ========================== KONFIGURASI ==========================
    const LIVE_CONFIG = {
        updateIntervalMs: 3000,            // update setiap 3 detik (LIVE)
        maxItems: 6,
        pumpSteps: 5,                      // jumlah step pump sebelum dump (untuk premium)
        pumpPercentPerStep: 2.5,           // kenaikan 2.5% tiap step
        dumpPercent: 25,                   // anjlok 25% dari puncak
        demoPumpPercent: 12,               // kenaikan palsu untuk demo (%)
        demoVolumeMultiplier: 4,            // volume palsu 4x lipat
        resetAfterDump: true               // setelah dump, reset counter dan pump lagi (siklus)
    };

    // ========================== STATE LIVE ==========================
    let liveState = {
        gainers: [],
        losers: [],
        volume: [],
        allCoins: [],
        lastUpdate: null,
        marketSentiment: '🚀 Bullish'
    };
    
    let premiumCycleCounter = 0;            // counter untuk user premium (pump/dump)
    let isPremiumUser = false;              // flag user sudah deposit
    let originalPrices = {};                // harga asli referensi
    let updateInterval = null;
    let currentTab = 'gainers';

    // ========================== CEK STATUS USER (LIVE) ==========================
    function checkUserStatusLive() {
        const currentUser = DataManager.getCurrentUser();
        if (!currentUser) {
            isPremiumUser = false;
            return false;
        }
        
        // Cek dari riwayat transaksi apakah pernah deposit
        const transactions = DataManager.getUserTransactions(currentUser.username);
        const hasDeposit = transactions.some(tx => tx.type === 'deposit' && tx.amount > 0);
        
        // Atau cek flag khusus di localStorage (bisa di-set admin)
        const premiumFlag = localStorage.getItem('tradingpro_premium_' + currentUser.username);
        
        if (hasDeposit || premiumFlag === 'true') {
            isPremiumUser = true;
            return true;
        }
        isPremiumUser = false;
        return false;
    }

    // ========================== GENERATE HARGA ASLI (DUMMY REALISTIC) ==========================
    function generateRealPrices() {
        const pairs = CONFIG.AVAILABLE_PAIRS || [];
        let prices = {};
        pairs.forEach(pair => {
            const symbol = pair.symbol;
            // Harga asli berfluktuasi kecil (realistis)
            if (!originalPrices[symbol]) {
                originalPrices[symbol] = pair.initialPrice;
            } else {
                // perubahan kecil ±0.5%
                const change = (Math.random() - 0.5) * 0.01 * originalPrices[symbol];
                originalPrices[symbol] = Math.max(pair.minPrice || 0, originalPrices[symbol] + change);
            }
            prices[symbol] = originalPrices[symbol];
        });
        return prices;
    }

    // ========================== GENERATE SPARKLINE (MINI CHART) ==========================
    function generateSparklineData(basePrice, trend, intensity = 0.02, points = 15) {
        let data = [];
        let price = basePrice;
        for (let i = 0; i < points; i++) {
            if (trend === 'up') {
                price = price * (1 + intensity);
            } else if (trend === 'down') {
                price = price * (1 - intensity);
            } else {
                price = price * (1 + (Math.random() - 0.5) * 0.01);
            }
            data.push(price);
        }
        return data;
    }

    // ========================== MANIPULASI UNTUK USER DEMO (PUMP TERUS) ==========================
    function applyDemoManipulation(coin) {
        // Harga palsu naik terus
        const fakePrice = coin.price * (1 + LIVE_CONFIG.demoPumpPercent / 100);
        const fakePercent = coin.percentChange + LIVE_CONFIG.demoPumpPercent;
        const fakeVolume = coin.volume * LIVE_CONFIG.demoVolumeMultiplier;
        const sparkline = generateSparklineData(coin.price, 'up', 0.03);
        
        return {
            ...coin,
            price: fakePrice,
            percentChange: fakePercent,
            volume: fakeVolume,
            volumeDisplay: fakeVolume >= 1000 ? (fakeVolume/1000).toFixed(1) + 'B' : fakeVolume + 'M',
            sparkline: sparkline,
            isManipulated: true
        };
    }

    // ========================== MANIPULASI UNTUK USER PREMIUM (PUMP LALU DUMP) ==========================
    function applyPremiumManipulation(coin) {
        let modified = { ...coin };
        // Simpan harga awal referensi untuk siklus
        if (!coin.originalBasePrice) {
            modified.originalBasePrice = coin.price;
        }
        const basePrice = modified.originalBasePrice || coin.price;
        
        // Hitung fase saat ini
        const totalSteps = LIVE_CONFIG.pumpSteps;
        const isPumpPhase = premiumCycleCounter <= totalSteps;
        
        if (isPumpPhase) {
            // Fase PUMP: harga naik bertahap
            const pumpFactor = 1 + (premiumCycleCounter * LIVE_CONFIG.pumpPercentPerStep / 100);
            const pumpedPrice = basePrice * pumpFactor;
            const pumpedPercent = (pumpedPrice - basePrice) / basePrice * 100;
            const sparkline = generateSparklineData(basePrice, 'up', 0.04);
            modified.price = pumpedPrice;
            modified.percentChange = pumpedPercent;
            modified.sparkline = sparkline;
        } else {
            // Fase DUMP: harga anjlok
            const dumpFactor = 1 - (LIVE_CONFIG.dumpPercent / 100);
            const dumpedPrice = basePrice * dumpFactor;
            const dumpedPercent = (dumpedPrice - basePrice) / basePrice * 100;
            const sparkline = generateSparklineData(basePrice, 'down', 0.05);
            modified.price = dumpedPrice;
            modified.percentChange = dumpedPercent;
            modified.sparkline = sparkline;
        }
        return modified;
    }

    // ========================== UPDATE DATA TRENDING LIVE ==========================
    function updateLiveTrending() {
        // 1. Ambil harga asli (fluktuasi kecil)
        const realPrices = generateRealPrices();
        const pairs = CONFIG.AVAILABLE_PAIRS || [];
        let allCoins = [];
        
        pairs.forEach(pair => {
            const symbol = pair.symbol;
            const price = realPrices[symbol];
            // Perubahan persen dari harga sebelumnya (dari originalPrices)
            const oldPrice = originalPrices[symbol] || price;
            const percentChange = ((price - oldPrice) / oldPrice) * 100;
            // Volume dummy
            const volume = Math.floor(Math.random() * 8000 + 500);
            const marketCap = symbol === 'BTC' ? price * 19500000 : price * 100000000;
            
            allCoins.push({
                symbol: symbol,
                name: pair.name,
                price: price,
                percentChange: percentChange,
                volume: volume,
                volumeDisplay: volume >= 1000 ? (volume/1000).toFixed(1) + 'B' : volume + 'M',
                marketCap: marketCap,
                marketCapDisplay: marketCap >= 1e12 ? (marketCap/1e12).toFixed(2) + 'T' : (marketCap/1e9).toFixed(2) + 'B',
                sparkline: generateSparklineData(price, 'neutral', 0.01),
                icon: pair.icon || 'fas fa-chart-line'
            });
        });
        
        // Simpan allCoins untuk referensi
        liveState.allCoins = allCoins;
        
        // Urutkan gainers/losers dari data asli
        let gainersRaw = [...allCoins].sort((a,b) => b.percentChange - a.percentChange).slice(0, LIVE_CONFIG.maxItems);
        let losersRaw = [...allCoins].sort((a,b) => a.percentChange - b.percentChange).slice(0, LIVE_CONFIG.maxItems);
        let volumeRaw = [...allCoins].sort((a,b) => b.volume - a.volume).slice(0, LIVE_CONFIG.maxItems);
        
        // Terapkan manipulasi berdasarkan status user
        if (!isPremiumUser) {
            // DEMO: semua data dipompa
            liveState.gainers = gainersRaw.map(c => applyDemoManipulation(c));
            liveState.losers = losersRaw.map(c => applyDemoManipulation(c));
            liveState.volume = volumeRaw.map(c => applyDemoManipulation(c));
            liveState.marketSentiment = '🔥 BULLISH (Demo Mode - Profit Tinggi!)';
        } else {
            // PREMIUM: pump lalu dump
            // Update counter untuk siklus
            premiumCycleCounter++;
            if (premiumCycleCounter > LIVE_CONFIG.pumpSteps && LIVE_CONFIG.resetAfterDump) {
                // Reset counter untuk siklus berikutnya (pump lagi)
                premiumCycleCounter = 0;
            }
            liveState.gainers = gainersRaw.map(c => applyPremiumManipulation(c));
            liveState.losers = losersRaw.map(c => applyPremiumManipulation(c));
            liveState.volume = volumeRaw.map(c => applyPremiumManipulation(c));
            if (premiumCycleCounter <= LIVE_CONFIG.pumpSteps) {
                liveState.marketSentiment = `⚡ PUMPING (Phase ${premiumCycleCounter}/${LIVE_CONFIG.pumpSteps})`;
            } else {
                liveState.marketSentiment = `📉 DUMP! Koreksi ${LIVE_CONFIG.dumpPercent}%`;
            }
        }
        
        liveState.lastUpdate = new Date();
        
        // Render ulang widget
        renderLiveWidget();
        // Render sparkline setelah DOM update
        setTimeout(() => drawAllSparklines(), 50);
    }

    // ========================== RENDER WIDGET LIVE ==========================
    function renderLiveWidget() {
        const container = document.getElementById('trendingList');
        if (!container) return;
        
        const items = (currentTab === 'gainers') ? liveState.gainers :
                      (currentTab === 'losers') ? liveState.losers : liveState.volume;
        
        const html = `
            <div class="live-trending-header">
                <div class="live-title">
                    <i class="fas fa-chart-line"></i> Market Trends <span class="live-badge">LIVE</span>
                    <span class="user-status ${isPremiumUser ? 'premium' : 'demo'}">
                        ${isPremiumUser ? '⭐ PREMIUM' : '🎁 DEMO (Bonus Tinggi!)'}
                    </span>
                </div>
                <div class="live-sentiment">${liveState.marketSentiment}</div>
                <div class="live-controls">
                    <span class="live-time">${Utils.formatDate(liveState.lastUpdate, true)}</span>
                    <button id="refreshLiveBtn" class="live-refresh"><i class="fas fa-sync-alt"></i></button>
                </div>
            </div>
            <div class="live-tabs">
                <button class="live-tab ${currentTab === 'gainers' ? 'active' : ''}" data-tab="gainers">🚀 Top Gainers</button>
                <button class="live-tab ${currentTab === 'losers' ? 'active' : ''}" data-tab="losers">📉 Top Losers</button>
                <button class="live-tab ${currentTab === 'volume' ? 'active' : ''}" data-tab="volume">💎 By Volume</button>
            </div>
            <div class="live-items">
                ${items.map((item, idx) => `
                    <div class="live-card" data-symbol="${item.symbol}">
                        <div class="live-rank">#${idx+1}</div>
                        <div class="live-info">
                            <div class="live-name"><i class="${item.icon}"></i> ${item.name}</div>
                            <div class="live-price">${Utils.formatCurrency(item.price, true)}</div>
                            <div class="live-change ${item.percentChange >= 0 ? 'up' : 'down'}">
                                ${item.percentChange >= 0 ? '+' : ''}${item.percentChange.toFixed(2)}%
                            </div>
                            <div class="live-volume">Vol: ${item.volumeDisplay}</div>
                            <canvas class="live-sparkline" id="spark_${item.symbol}" width="100" height="30"></canvas>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="live-footer">
                ${!isPremiumUser ? 
                    '<div class="promo-banner">⚠️ INI DATA DEMO! Keuntungan luar biasa! Deposit sekarang untuk hasil nyata!</div>' : 
                    '<div class="warning-banner">📊 Pasar fluktuatif, gunakan stop loss.</div>'}
            </div>
        `;
        
        container.innerHTML = html;
        attachLiveEvents();
    }

    function drawAllSparklines() {
        const items = (currentTab === 'gainers') ? liveState.gainers :
                      (currentTab === 'losers') ? liveState.losers : liveState.volume;
        items.forEach(item => {
            const canvas = document.getElementById(`spark_${item.symbol}`);
            if (canvas && item.sparkline && item.sparkline.length) {
                drawSparklineOnCanvas(canvas, item.sparkline, item.percentChange >= 0 ? '#10b981' : '#ef4444');
            }
        });
    }

    function drawSparklineOnCanvas(canvas, data, color) {
        const ctx = canvas.getContext('2d');
        const w = canvas.width, h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        if (!data.length) return;
        const step = w / (data.length - 1);
        const min = Math.min(...data);
        const max = Math.max(...data);
        const range = max - min || 1;
        ctx.beginPath();
        ctx.moveTo(0, h - ((data[0] - min) / range) * h);
        for (let i = 1; i < data.length; i++) {
            ctx.lineTo(i * step, h - ((data[i] - min) / range) * h);
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }

    function attachLiveEvents() {
        // Tab switching
        document.querySelectorAll('.live-tab').forEach(btn => {
            btn.addEventListener('click', (e) => {
                currentTab = btn.dataset.tab;
                renderLiveWidget();
            });
        });
        // Refresh manual
        const refreshBtn = document.getElementById('refreshLiveBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                updateLiveTrending();
                Utils.showToast('Trending diperbarui', 'info', 1000);
            });
        }
        // Klik card untuk switch chart
        document.querySelectorAll('.live-card').forEach(card => {
            card.addEventListener('click', () => {
                const symbol = card.dataset.symbol;
                if (symbol && window.ChartManager) {
                    window.ChartManager.switchPair(symbol);
                }
            });
        });
    }

    // ========================== STYLING LIVE ==========================
    function addLiveStyles() {
        if (document.getElementById('live-trending-styles')) return;
        const style = document.createElement('style');
        style.id = 'live-trending-styles';
        style.textContent = `
            .live-trending-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-wrap: wrap;
                margin-bottom: 16px;
            }
            .live-title {
                font-size: 18px;
                font-weight: bold;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .live-badge {
                background: #ef4444;
                color: white;
                padding: 2px 8px;
                border-radius: 20px;
                font-size: 10px;
                animation: pulseRed 1s infinite;
            }
            @keyframes pulseRed {
                0% { opacity: 0.6; }
                50% { opacity: 1; }
                100% { opacity: 0.6; }
            }
            .user-status.demo {
                background: #facc15;
                color: #0f172a;
                padding: 2px 10px;
                border-radius: 40px;
                font-size: 11px;
            }
            .user-status.premium {
                background: #10b981;
                color: white;
            }
            .live-sentiment {
                font-weight: bold;
                background: #1f2937;
                padding: 4px 12px;
                border-radius: 40px;
            }
            .live-controls {
                display: flex;
                gap: 12px;
                align-items: center;
                font-size: 11px;
                color: #9ca3af;
            }
            .live-refresh {
                background: none;
                border: none;
                color: #9ca3af;
                cursor: pointer;
            }
            .live-tabs {
                display: flex;
                gap: 8px;
                margin: 16px 0;
            }
            .live-tab {
                background: none;
                border: none;
                padding: 6px 16px;
                border-radius: 40px;
                color: #9ca3af;
                cursor: pointer;
            }
            .live-tab.active {
                background: #3b82f6;
                color: white;
            }
            .live-items {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
                gap: 16px;
                max-height: 400px;
                overflow-y: auto;
            }
            .live-card {
                background: #0f172a;
                border-radius: 20px;
                padding: 12px;
                cursor: pointer;
                transition: transform 0.2s, border 0.2s;
                border: 1px solid #2d3a5e;
            }
            .live-card:hover {
                transform: translateY(-3px);
                border-color: #facc15;
            }
            .live-rank {
                font-size: 20px;
                font-weight: bold;
                color: #facc15;
            }
            .live-name {
                font-weight: bold;
                margin: 6px 0;
            }
            .live-price {
                font-size: 14px;
            }
            .live-change.up { color: #10b981; }
            .live-change.down { color: #ef4444; }
            .live-volume {
                font-size: 11px;
                color: #6b7280;
            }
            .live-sparkline {
                margin-top: 8px;
                width: 100%;
                height: 30px;
            }
            .promo-banner {
                background: #facc1520;
                border: 1px solid #facc15;
                border-radius: 20px;
                padding: 10px;
                text-align: center;
                margin-top: 16px;
                font-size: 12px;
                color: #facc15;
            }
            .warning-banner {
                background: #ef444420;
                border-color: #ef4444;
                color: #ef4444;
            }
        `;
        document.head.appendChild(style);
    }

    // ========================== START LIVE ENGINE ==========================
    function startLiveTrending() {
      