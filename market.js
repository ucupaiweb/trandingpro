/* ===============================================================
   TRADINGPRO - MARKET & TICKER MANAGER
   Versi: 2.0.0 | Market ticker real-time, update harga, volume, perubahan persen, order book simulation
   =============================================================== */

/**
 * Modul ini bertanggung jawab untuk:
 * - Menampilkan market ticker (harga, perubahan 24h, volume)
 * - Mengupdate harga secara real-time dari DataManager
 * - Menyediakan data order book simulasi (bid/ask)
 * - Menyediakan data market depth untuk pair tertentu
 * - Menampilkan indikator tren (RSI sederhana, MA)
 * - Mendukung multiple pair dengan switch cepat
 */

(function() {
    'use strict';

    // ========================== KONFIGURASI ==========================
    const MARKET_CONFIG = {
        updateInterval: 3000,           // ms, sinkron dengan DataManager
        tickerDisplayCount: 8,           // jumlah pair ditampilkan di ticker
        showVolume: true,                // tampilkan volume
        showChange: true,                // tampilkan persen perubahan
        showMarketCap: false,            // tampilkan market cap (dummy)
        orderBookDepth: 10               // depth order book (bid/ask)
    };

    // Data tambahan untuk setiap pair (dummy)
    let marketStats = {};               // { BTC: { volume24h, high24h, low24h, change24h, marketCap, rsi, ma7, ma25 } }
    let orderBooks = {};                // { BTC: { bids: [[price, size]], asks: [[price, size]] } }
    let lastPrices = {};                // harga sebelumnya untuk hitung perubahan

    // ========================== DOM ELEMENTS ==========================
    let elements = {
        marketTicker: null,
        tickerContainer: null
    };

    function cacheElements() {
        elements.marketTicker = document.getElementById('marketTicker');
    }

    // ========================== DATA GENERATOR (DUMMY) ==========================
    /**
     * Generate statistik pasar untuk suatu pair
     * @param {string} symbol 
     * @param {number} currentPrice 
     * @returns {Object}
     */
    function generateMarketStats(symbol, currentPrice) {
        const prevPrice = lastPrices[symbol] || currentPrice;
        const change24h = ((currentPrice - prevPrice) / prevPrice) * 100;
        // Simpan harga sekarang untuk iterasi berikutnya
        lastPrices[symbol] = currentPrice;
        
        // Volume acak antara 50M - 5B (dalam USD)
        const volume24h = (Math.random() * 5000 + 500).toFixed(1) + 'M';
        // High/Low acak dalam rentang ±2% dari current price
        const high24h = currentPrice * (1 + Math.random() * 0.02);
        const low24h = currentPrice * (1 - Math.random() * 0.02);
        // RSI dummy (30-70)
        const rsi = Math.floor(Math.random() * 40 + 30);
        // Moving average sederhana (dummy)
        const ma7 = currentPrice * (1 + (Math.random() - 0.5) * 0.01);
        const ma25 = currentPrice * (1 + (Math.random() - 0.5) * 0.015);
        // Market cap dummy (untuk BTC, ETH besar)
        let marketCap = 0;
        if (symbol === 'BTC') marketCap = (currentPrice * 19_500_000) / 1e9;
        else if (symbol === 'ETH') marketCap = (currentPrice * 120_000_000) / 1e9;
        else marketCap = (currentPrice * (Math.random() * 500 + 50)) / 1e9;
        
        return {
            volume24h,
            high24h: high24h.toFixed(2),
            low24h: low24h.toFixed(2),
            change24h: change24h.toFixed(2),
            marketCap: marketCap.toFixed(2) + 'B',
            rsi,
            ma7: ma7.toFixed(2),
            ma25: ma25.toFixed(2)
        };
    }

    /**
     * Generate order book simulasi untuk suatu pair
     * @param {string} symbol 
     * @param {number} currentPrice 
     * @returns {Object}
     */
    function generateOrderBook(symbol, currentPrice) {
        let bids = [];
        let asks = [];
        // Generate bid (harga beli) di bawah current price
        for (let i = 1; i <= MARKET_CONFIG.orderBookDepth; i++) {
            const price = currentPrice * (1 - (i * 0.001) - (Math.random() * 0.002));
            const size = (Math.random() * 5 + 0.5).toFixed(4);
            bids.push([price.toFixed(2), size]);
        }
        // Generate ask (harga jual) di atas current price
        for (let i = 1; i <= MARKET_CONFIG.orderBookDepth; i++) {
            const price = currentPrice * (1 + (i * 0.001) + (Math.random() * 0.002));
            const size = (Math.random() * 5 + 0.5).toFixed(4);
            asks.push([price.toFixed(2), size]);
        }
        return { bids, asks };
    }

    /**
     * Update semua statistik pasar berdasarkan harga terbaru
     */
    function updateAllMarketStats() {
        const prices = DataManager.getPrices();
        const pairs = CONFIG.AVAILABLE_PAIRS || [];
        pairs.forEach(pair => {
            const symbol = pair.symbol;
            const price = prices[symbol];
            if (price) {
                marketStats[symbol] = generateMarketStats(symbol, price);
                orderBooks[symbol] = generateOrderBook(symbol, price);
            }
        });
    }

    // ========================== RENDER MARKET TICKER ==========================
    /**
     * Membuat tampilan market ticker (horizontal scrolling atau grid)
     */
    function renderTicker() {
        if (!elements.marketTicker) return;
        const prices = DataManager.getPrices();
        const pairs = CONFIG.AVAILABLE_PAIRS || [];
        
        let html = '';
        pairs.forEach(pair => {
            const symbol = pair.symbol;
            const price = prices[symbol];
            if (!price) return;
            const stats = marketStats[symbol] || { change24h: 0, volume24h: '0M' };
            const changeClass = parseFloat(stats.change24h) >= 0 ? 'positive' : 'negative';
            const changeSymbol = parseFloat(stats.change24h) >= 0 ? '+' : '';
            
            html += `
                <div class="ticker-item" data-symbol="${symbol}">
                    <div class="ticker-pair">
                        <span class="pair-name">${pair.name}</span>
                        <span class="pair-icon"><i class="${pair.icon || 'fas fa-chart-line'}"></i></span>
                    </div>
                    <div class="ticker-price">$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    <div class="ticker-change ${changeClass}">${changeSymbol}${stats.change24h}%</div>
                    ${MARKET_CONFIG.showVolume ? `<div class="ticker-volume">Vol: ${stats.volume24h}</div>` : ''}
                </div>
            `;
        });
        
        elements.marketTicker.innerHTML = html;
        
        // Tambahkan event click pada setiap ticker untuk switch pair di chart
        document.querySelectorAll('.ticker-item').forEach(item => {
            item.addEventListener('click', () => {
                const symbol = item.dataset.symbol;
                if (symbol && window.ChartManager && window.ChartManager.switchPair) {
                    window.ChartManager.switchPair(symbol);
                    // Highlight active ticker
                    document.querySelectorAll('.ticker-item').forEach(i => i.classList.remove('active'));
                    item.classList.add('active');
                    // Tampilkan notifikasi
                    if (window.showToast) {
                        window.showToast(`Beralih ke ${symbol}/USD`, 'info');
                    }
                }
            });
        });
    }

    // ========================== ORDER BOOK POPUP (DETAIL) ==========================
    /**
     * Menampilkan modal order book untuk pair tertentu
     * @param {string} symbol 
     */
    function showOrderBook(symbol) {
        const orderBook = orderBooks[symbol];
        if (!orderBook) return;
        const price = DataManager.getPrice(symbol);
        const stats = marketStats[symbol];
        
        // Buat modal jika belum ada
        let modal = document.getElementById('orderBookModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'orderBookModal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content orderbook-modal">
                    <span class="close-modal">&times;</span>
                    <div class="modal-header">
                        <h3>Order Book <span id="orderBookSymbol"></span></h3>
                    </div>
                    <div class="orderbook-container">
                        <div class="orderbook-asks">
                            <div class="orderbook-title">SELL (Asks)</div>
                            <div class="orderbook-row header"><span>Price (USD)</span><span>Size</span><span>Total</span></div>
                            <div id="orderbookAsksList"></div>
                        </div>
                        <div class="orderbook-spread">
                            <div>Spread: <span id="orderbookSpread"></span></div>
                            <div class="current-price" id="orderbookCurrentPrice"></div>
                        </div>
                        <div class="orderbook-bids">
                            <div class="orderbook-title">BUY (Bids)</div>
                            <div class="orderbook-row header"><span>Price (USD)</span><span>Size</span><span>Total</span></div>
                            <div id="orderbookBidsList"></div>
                        </div>
                    </div>
                    <div class="orderbook-stats">
                        <div>24h High: <span id="obHigh"></span></div>
                        <div>24h Low: <span id="obLow"></span></div>
                        <div>Volume: <span id="obVolume"></span></div>
                        <div>RSI: <span id="obRSI"></span></div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            
            // Styling khusus orderbook
            const style = document.createElement('style');
            style.textContent = `
                .orderbook-modal {
                    max-width: 600px;
                    width: 90%;
                }
                .orderbook-container {
                    display: flex;
                    gap: 20px;
                    flex-wrap: wrap;
                }
                .orderbook-asks, .orderbook-bids {
                    flex: 1;
                    background: #0f172a;
                    border-radius: 16px;
                    padding: 12px;
                }
                .orderbook-title {
                    font-weight: bold;
                    text-align: center;
                    margin-bottom: 8px;
                }
                .orderbook-asks .orderbook-title { color: #ef4444; }
                .orderbook-bids .orderbook-title { color: #10b981; }
                .orderbook-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr 1fr;
                    gap: 8px;
                    font-size: 12px;
                    padding: 4px 0;
                    border-bottom: 1px solid #2d3a5e;
                }
                .orderbook-row.header {
                    color: #9ca3af;
                    border-bottom: 1px solid #4b5563;
                }
                .orderbook-spread {
                    text-align: center;
                    padding: 8px;
                    background: #1f2937;
                    border-radius: 40px;
                    margin: 8px 0;
                }
                .current-price {
                    font-size: 20px;
                    font-weight: bold;
                    color: #facc15;
                }
                .orderbook-stats {
                    display: flex;
                    justify-content: space-between;
                    margin-top: 16px;
                    flex-wrap: wrap;
                    gap: 8px;
                    background: #111827;
                    padding: 12px;
                    border-radius: 16px;
                }
            `;
            document.head.appendChild(style);
        }
        
        // Isi data
        document.getElementById('orderBookSymbol').textContent = symbol + '/USD';
        document.getElementById('orderbookCurrentPrice').textContent = `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        if (stats) {
            document.getElementById('obHigh').textContent = `$${stats.high24h}`;
            document.getElementById('obLow').textContent = `$${stats.low24h}`;
            document.getElementById('obVolume').textContent = stats.volume24h;
            document.getElementById('obRSI').textContent = stats.rsi;
        }
        
        // Hitung spread
        const bestBid = orderBook.bids[0] ? parseFloat(orderBook.bids[0][0]) : price * 0.999;
        const bestAsk = orderBook.asks[0] ? parseFloat(orderBook.asks[0][0]) : price * 1.001;
        const spread = (bestAsk - bestBid).toFixed(2);
        document.getElementById('orderbookSpread').textContent = `$${spread} (${((spread/price)*100).toFixed(3)}%)`;
        
        // Render asks (tertinggi ke terendah)
        const asksList = document.getElementById('orderbookAsksList');
        asksList.innerHTML = orderBook.asks.slice(0, 10).map(ask => {
            const priceNum = parseFloat(ask[0]);
            const size = parseFloat(ask[1]);
            const total = (priceNum * size).toFixed(2);
            return `<div class="orderbook-row"><span>${ask[0]}</span><span>${ask[1]}</span><span>$${total}</span></div>`;
        }).join('');
        
        // Render bids (tertinggi ke terendah)
        const bidsList = document.getElementById('orderbookBidsList');
        bidsList.innerHTML = orderBook.bids.slice(0, 10).map(bid => {
            const priceNum = parseFloat(bid[0]);
            const size = parseFloat(bid[1]);
            const total = (priceNum * size).toFixed(2);
            return `<div class="orderbook-row"><span>${bid[0]}</span><span>${bid[1]}</span><span>$${total}</span></div>`;
        }).join('');
        
        // Tampilkan modal
        modal.style.display = 'flex';
        
        // Tutup modal
        const closeSpan = modal.querySelector('.close-modal');
        closeSpan.onclick = () => modal.style.display = 'none';
        window.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
    }

    // ========================== INDIKATOR TEKNIS SEDERHANA ==========================
    /**
     * Mendapatkan rekomendasi trading berdasarkan RSI dan MA
     * @param {string} symbol 
     * @returns {string} signal (BUY, SELL, NEUTRAL)
     */
    function getSignal(symbol) {
        const stats = marketStats[symbol];
        if (!stats) return 'NEUTRAL';
        const rsi = stats.rsi;
        const price = DataManager.getPrice(symbol);
        const ma7 = parseFloat(stats.ma7);
        const ma25 = parseFloat(stats.ma25);
        
        if (rsi < 35 && price > ma7) return 'BUY';
        if (rsi > 65 && price < ma7) return 'SELL';
        if (ma7 > ma25 && rsi > 50) return 'BULLISH';
        if (ma7 < ma25 && rsi < 50) return 'BEARISH';
        return 'NEUTRAL';
    }

    // ========================== UPDATE LOOP ==========================
    let updateInterval = null;
    
    function startMarketUpdates() {
        if (updateInterval) clearInterval(updateInterval);
        // Update pertama langsung
        updateAllMarketStats();
        renderTicker();
        // Event listener untuk perubahan harga dari DataManager
        if (window.DataManager && window.DataManager.onDataChange) {
            window.DataManager.onDataChange('prices', () => {
                updateAllMarketStats();
                renderTicker();
                // Trigger event untuk komponen lain yang butuh data pasar terbaru
                window.dispatchEvent(new CustomEvent('market-updated', { detail: { marketStats, orderBooks } }));
            });
        }
        // Interval fallback (tapi sebenarnya sudah di-trigger oleh perubahan harga)
        updateInterval = setInterval(() => {
            updateAllMarketStats();
            renderTicker();
        }, MARKET_CONFIG.updateInterval);
    }
    
    function stopMarketUpdates() {
        if (updateInterval) {
            clearInterval(updateInterval);
            updateInterval = null;
        }
    }

    // ========================== PUBLIC API ==========================
    function initMarketTicker() {
        cacheElements();
        startMarketUpdates();
        console.log('[MARKET] Ticker initialized');
    }

    // Export fungsi tambahan
    window.MarketManager = {
        init: initMarketTicker,
        initMarketTicker,   // alias
        getMarketStats: () => marketStats,
        getOrderBook: (symbol) => orderBooks[symbol],
        showOrderBook,
        getSignal,
        stopUpdates: stopMarketUpdates,
        refreshTicker: renderTicker
    };

    // Auto init jika DOM siap (tapi akan dipanggil dari dashboard juga)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            cacheElements();
            // Jangan auto start dulu, tunggu dashboard panggil
        });
    } else {
        cacheElements();
    }

    console.log('[MARKET] Module loaded');
})();