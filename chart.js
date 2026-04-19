/* ===============================================================
   TRADINGPRO - CHART MANAGER
   Versi: 2.0.0 | Grafik real-time, multiple timeframe, indikator teknis (MA, RSI, Volume), zoom, crosshair
   =============================================================== */

/**
 * Modul ini bertanggung jawab untuk:
 * - Menampilkan chart harga real-time menggunakan Chart.js
 * - Support multiple pair (BTC, ETH, SOL, dll)
 * - Support multiple timeframe (1m, 5m, 1h, 4h, 1d)
 * - Menampilkan indikator: Moving Average (MA7, MA25), RSI, Volume
 * - Crosshair (garis vertikal/horizontal saat hover)
 * - Zoom in/out (simulasi dengan mengubah jumlah titik data)
 * - Screenshot chart (download sebagai gambar)
 * - Toggle indikator on/off
 */

(function() {
    'use strict';

    // ========================== KONFIGURASI ==========================
    const CHART_CONFIG = {
        defaultPair: 'BTC',
        defaultTimeframe: '1m',
        chartColors: {
            line: '#FACC15',
            area: 'rgba(250, 204, 21, 0.1)',
            grid: '#1E293B',
            text: '#94A3B8',
            up: '#10B981',
            down: '#EF4444',
            ma7: '#3B82F6',
            ma25: '#8B5CF6',
            rsi: '#F97316',
            volume: '#334155'
        },
        ma7Period: 7,
        ma25Period: 25,
        rsiPeriod: 14,
        showVolumeChart: true,
        showMA7: true,
        showMA25: true,
        showRSI: true,
        enableCrosshair: true,
        zoomLevels: [30, 50, 100, 200] // jumlah titik data
    };

    // ========================== STATE ==========================
    let chartInstance = null;
    let currentPair = CHART_CONFIG.defaultPair;
    let currentTimeframe = CHART_CONFIG.defaultTimeframe;
    let currentZoomIndex = 1; // 50 points default
    let priceHistoryCache = {}; // { BTC: { '1m': [], '5m': [], ... } }
    let ma7Data = [];
    let ma25Data = [];
    let rsiData = [];
    let volumeData = [];
    let isChartInitialized = false;
    
    // Toggle states
    let showMA7 = CHART_CONFIG.showMA7;
    let showMA25 = CHART_CONFIG.showMA25;
    let showRSI = CHART_CONFIG.showRSI;
    let showVolume = CHART_CONFIG.showVolumeChart;

    // ========================== DOM ELEMENTS ==========================
    let elements = {
        chartCanvas: null,
        chartContainer: null,
        timeframeButtons: null,
        pairSelector: null,
        zoomInBtn: null,
        zoomOutBtn: null,
        screenshotBtn: null,
        toggleMa7Btn: null,
        toggleMa25Btn: null,
        toggleRsiBtn: null,
        toggleVolumeBtn: null,
        indicatorPanel: null
    };

    function cacheElements() {
        elements.chartCanvas = document.getElementById('priceChart');
        elements.chartContainer = elements.chartCanvas?.parentElement;
        elements.timeframeButtons = document.querySelectorAll('.chart-time');
        elements.zoomInBtn = document.getElementById('zoomInBtn');
        elements.zoomOutBtn = document.getElementById('zoomOutBtn');
        elements.screenshotBtn = document.getElementById('screenshotBtn');
    }

    // ========================== DATA GENERATOR (PRICE HISTORY) ==========================
    /**
     * Generate price history untuk pair dan timeframe tertentu
     * @param {string} symbol 
     * @param {string} timeframe 
     * @param {number} points 
     * @returns {Array}
     */
    function generatePriceHistory(symbol, timeframe, points) {
        const initialPrice = CONFIG.getInitialPrice(symbol);
        const volatility = CONFIG.getVolatility(symbol);
        let prices = [];
        let price = initialPrice;
        
        // Faktor timeframe: timeframe lebih panjang => volatilitas lebih besar
        let timeFactor = 1;
        if (timeframe === '5m') timeFactor = 1.5;
        else if (timeframe === '15m') timeFactor = 2;
        else if (timeframe === '1h') timeFactor = 3;
        else if (timeframe === '4h') timeFactor = 5;
        else if (timeframe === '1d') timeFactor = 10;
        
        for (let i = 0; i < points; i++) {
            const change = (volatility.min + Math.random() * (volatility.max - volatility.min)) * timeFactor;
            price = price + change;
            // Batasan harga
            const pair = CONFIG.AVAILABLE_PAIRS?.find(p => p.symbol === symbol);
            if (pair) {
                if (pair.minPrice) price = Math.max(pair.minPrice, price);
                if (pair.maxPrice) price = Math.min(pair.maxPrice, price);
            }
            prices.push(parseFloat(price.toFixed(2)));
        }
        return prices;
    }

    /**
     * Hitung Moving Average
     * @param {Array} data 
     * @param {number} period 
     * @returns {Array}
     */
    function calculateMA(data, period) {
        let result = [];
        for (let i = 0; i < data.length; i++) {
            if (i < period - 1) {
                result.push(null);
                continue;
            }
            let sum = 0;
            for (let j = 0; j < period; j++) {
                sum += data[i - j];
            }
            result.push(parseFloat((sum / period).toFixed(2)));
        }
        return result;
    }

    /**
     * Hitung RSI (Relative Strength Index)
     * @param {Array} data 
     * @param {number} period 
     * @returns {Array}
     */
    function calculateRSI(data, period) {
        let result = [];
        let gains = 0;
        let losses = 0;
        
        for (let i = 1; i < data.length; i++) {
            const change = data[i] - data[i-1];
            if (change >= 0) {
                gains += change;
            } else {
                losses += Math.abs(change);
            }
            
            if (i < period) {
                result.push(null);
                continue;
            }
            
            if (i === period) {
                // Rata-rata pertama
                const avgGain = gains / period;
                const avgLoss = losses / period;
                const rs = avgGain / avgLoss;
                const rsi = 100 - (100 / (1 + rs));
                result.push(parseFloat(rsi.toFixed(2)));
            } else {
                // Smoothing
                const prevGain = gains;
                const prevLoss = losses;
                const avgGain = (prevGain * (period - 1) + (change >= 0 ? change : 0)) / period;
                const avgLoss = (prevLoss * (period - 1) + (change < 0 ? Math.abs(change) : 0)) / period;
                const rs = avgGain / avgLoss;
                const rsi = 100 - (100 / (1 + rs));
                result.push(parseFloat(rsi.toFixed(2)));
                gains = avgGain * period;
                losses = avgLoss * period;
            }
        }
        return result;
    }

    /**
     * Update semua data indikator berdasarkan harga terbaru
     */
    function updateIndicators(prices) {
        if (!prices || prices.length === 0) return;
        ma7Data = calculateMA(prices, CHART_CONFIG.ma7Period);
        ma25Data = calculateMA(prices, CHART_CONFIG.ma25Period);
        rsiData = calculateRSI(prices, CHART_CONFIG.rsiPeriod);
        // Volume data dummy (volume naik turun mengikuti pergerakan harga)
        volumeData = prices.map((price, idx) => {
            if (idx === 0) return 1000000;
            const change = Math.abs(price - prices[idx-1]);
            return parseFloat((change / price * 10000000).toFixed(0));
        });
    }

    /**
     * Ambil atau generate price history untuk pair + timeframe
     * @returns {Array}
     */
    function getPriceHistoryForCurrent() {
        const cacheKey = currentPair + '_' + currentTimeframe;
        const points = CHART_CONFIG.zoomLevels[currentZoomIndex] || 50;
        
        if (!priceHistoryCache[cacheKey] || priceHistoryCache[cacheKey].length !== points) {
            // Generate baru
            const newHistory = generatePriceHistory(currentPair, currentTimeframe, points);
            priceHistoryCache[cacheKey] = newHistory;
            updateIndicators(newHistory);
        } else {
            // Update indikator jika perlu (misal harga terbaru berubah)
            const currentPrice = DataManager.getPrice(currentPair);
            const lastPrice = priceHistoryCache[cacheKey][priceHistoryCache[cacheKey].length - 1];
            if (currentPrice && Math.abs(currentPrice - lastPrice) > 0.01) {
                // Harga terbaru berbeda, update history
                priceHistoryCache[cacheKey].push(currentPrice);
                if (priceHistoryCache[cacheKey].length > points) priceHistoryCache[cacheKey].shift();
                updateIndicators(priceHistoryCache[cacheKey]);
            } else {
                updateIndicators(priceHistoryCache[cacheKey]);
            }
        }
        return priceHistoryCache[cacheKey];
    }

    // ========================== RENDER CHART ==========================
    /**
     * Buat atau update chart dengan data terkini
     */
    function renderChart() {
        if (!elements.chartCanvas) {
            console.error('[CHART] Canvas not found');
            return;
        }
        
        const prices = getPriceHistoryForCurrent();
        const labels = Array(prices.length).fill('');
        const ctx = elements.chartCanvas.getContext('2d');
        
        // Dataset utama (harga)
        let datasets = [
            {
                label: `${currentPair}/USD`,
                data: prices,
                borderColor: CHART_CONFIG.chartColors.line,
                backgroundColor: CHART_CONFIG.chartColors.area,
                borderWidth: 2,
                fill: true,
                tension: 0.3,
                pointRadius: 0,
                pointHoverRadius: 4,
                pointHoverBackgroundColor: CHART_CONFIG.chartColors.line,
                yAxisID: 'y'
            }
        ];
        
        // Moving Average 7
        if (showMA7 && ma7Data.length > 0) {
            datasets.push({
                label: 'MA 7',
                data: ma7Data,
                borderColor: CHART_CONFIG.chartColors.ma7,
                borderWidth: 1.5,
                borderDash: [5, 5],
                fill: false,
                pointRadius: 0,
                tension: 0.2,
                yAxisID: 'y'
            });
        }
        
        // Moving Average 25
        if (showMA25 && ma25Data.length > 0) {
            datasets.push({
                label: 'MA 25',
                data: ma25Data,
                borderColor: CHART_CONFIG.chartColors.ma25,
                borderWidth: 1.5,
                borderDash: [8, 4],
                fill: false,
                pointRadius: 0,
                tension: 0.2,
                yAxisID: 'y'
            });
        }
        
        // Volume (bar chart)
        if (showVolume && volumeData.length > 0) {
            datasets.push({
                label: 'Volume',
                data: volumeData,
                type: 'bar',
                backgroundColor: CHART_CONFIG.chartColors.volume,
                borderColor: 'transparent',
                yAxisID: 'y1',
                barPercentage: 0.8,
                categoryPercentage: 0.9
            });
        }
        
        // RSI (di axis terpisah)
        if (showRSI && rsiData.length > 0) {
            datasets.push({
                label: 'RSI (14)',
                data: rsiData,
                borderColor: CHART_CONFIG.chartColors.rsi,
                borderWidth: 1.5,
                fill: false,
                pointRadius: 0,
                tension: 0.2,
                yAxisID: 'y2'
            });
        }
        
        // Jika chart sudah ada, update data dan destroy/recreate (karena dataset bisa berubah)
        if (chartInstance) {
            chartInstance.destroy();
        }
        
        // Konfigurasi sumbu Y
        let yAxes = [
            {
                id: 'y',
                position: 'left',
                title: { display: true, text: 'Harga (USD)', color: CHART_CONFIG.chartColors.text },
                grid: { color: CHART_CONFIG.chartColors.grid },
                ticks: { color: CHART_CONFIG.chartColors.text, callback: (value) => '$' + value.toLocaleString() }
            }
        ];
        
        if (showVolume) {
            yAxes.push({
                id: 'y1',
                position: 'right',
                title: { display: true, text: 'Volume', color: CHART_CONFIG.chartColors.text },
                grid: { display: false },
                ticks: { color: CHART_CONFIG.chartColors.text, callback: (value) => (value / 1e6).toFixed(1) + 'M' }
            });
        }
        
        if (showRSI) {
            yAxes.push({
                id: 'y2',
                position: 'right',
                title: { display: true, text: 'RSI', color: CHART_CONFIG.chartColors.rsi },
                grid: { display: false },
                min: 0,
                max: 100,
                ticks: { color: CHART_CONFIG.chartColors.rsi, stepSize: 20 },
                position: showVolume ? 'right' : 'right'
            });
            // Adjust position jika ada volume juga
            if (showVolume) {
                yAxes[2].position = 'right';
                yAxes[2].offset = true;
            }
        }
        
        chartInstance = new Chart(ctx, {
            type: 'line',
            data: { labels: labels, datasets: datasets },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: (context) => {
                                let label = context.dataset.label || '';
                                let value = context.raw;
                                if (context.dataset.yAxisID === 'y') {
                                    return label + ': $' + value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                } else if (context.dataset.label === 'Volume') {
                                    return label + ': ' + (value / 1e6).toFixed(2) + 'M';
                                } else if (context.dataset.label === 'RSI (14)') {
                                    return label + ': ' + value.toFixed(2);
                                }
                                return label + ': ' + value;
                            }
                        }
                    },
                    legend: {
                        labels: { color: CHART_CONFIG.chartColors.text, font: { size: 11 } },
                        position: 'top'
                    },
                    zoom: {
                        pan: { enabled: true, mode: 'x' },
                        zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' }
                    }
                },
                scales: {
                    x: {
                        ticks: { display: false },
                        grid: { color: CHART_CONFIG.chartColors.grid }
                    },
                    y: yAxes[0],
                    ...(showVolume && { y1: yAxes[1] }),
                    ...(showRSI && { y2: yAxes[showVolume ? 2 : 1] })
                },
                hover: { mode: 'index', intersect: false },
                elements: { point: { hoverRadius: 5 } }
            }
        });
        
        // Crosshair (garis vertikal/horizontal saat hover)
        if (CHART_CONFIG.enableCrosshair && elements.chartCanvas) {
            elements.chartCanvas.style.cursor = 'crosshair';
            // Crosshair di-handle oleh plugin Chart.js? Kita bisa pakai plugin atau sederhananya tooltip sudah cukup
        }
        
        isChartInitialized = true;
        console.log('[CHART] Rendered for', currentPair, currentTimeframe);
    }

    // ========================== UPDATE CHART REAL-TIME ==========================
    /**
     * Update chart dengan harga terbaru (dipanggil saat harga berubah)
     */
    function updateChartRealtime() {
        if (!isChartInitialized) return;
        const currentPrice = DataManager.getPrice(currentPair);
        if (!currentPrice) return;
        
        const cacheKey = currentPair + '_' + currentTimeframe;
        let history = priceHistoryCache[cacheKey];
        if (!history) {
            history = getPriceHistoryForCurrent();
        }
        // Update harga terakhir
        if (history.length > 0) {
            history[history.length - 1] = currentPrice;
        } else {
            history.push(currentPrice);
        }
        updateIndicators(history);
        
        // Update chart datasets
        if (chartInstance) {
            chartInstance.data.datasets[0].data = history;
            if (showMA7) chartInstance.data.datasets.find(d => d.label === 'MA 7').data = ma7Data;
            if (showMA25) chartInstance.data.datasets.find(d => d.label === 'MA 25').data = ma25Data;
            if (showRSI) chartInstance.data.datasets.find(d => d.label === 'RSI (14)').data = rsiData;
            if (showVolume) chartInstance.data.datasets.find(d => d.label === 'Volume').data = volumeData;
            chartInstance.update('none'); // update tanpa animasi
        }
    }

    // ========================== SWITCH PAIR ==========================
    function switchPair(symbol) {
        if (!CONFIG.isPairAvailable(symbol)) return;
        currentPair = symbol;
        // Reset cache untuk pair ini? Tidak perlu, biar regenerate
        renderChart();
        // Update tampilan pair selector jika ada
        if (elements.pairSelector) {
            elements.pairSelector.value = symbol;
        }
        // Trigger event untuk komponen lain
        window.dispatchEvent(new CustomEvent('pair-changed', { detail: { pair: symbol } }));
        console.log('[CHART] Switched to', symbol);
    }

    // ========================== SWITCH TIMEFRAME ==========================
    function switchTimeframe(timeframeId) {
        currentTimeframe = timeframeId;
        renderChart();
        // Update active class pada tombol
        if (elements.timeframeButtons) {
            elements.timeframeButtons.forEach(btn => {
                if (btn.dataset.time === timeframeId) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        }
        console.log('[CHART] Timeframe changed to', timeframeId);
    }

    // ========================== ZOOM CONTROL ==========================
    function zoomIn() {
        if (currentZoomIndex < CHART_CONFIG.zoomLevels.length - 1) {
            currentZoomIndex++;
            renderChart();
        }
    }
    
    function zoomOut() {
        if (currentZoomIndex > 0) {
            currentZoomIndex--;
            renderChart();
        }
    }

    // ========================== SCREENSHOT ==========================
    function takeScreenshot() {
        if (!elements.chartCanvas) return;
        const link = document.createElement('a');
        link.download = `tradingpro_chart_${currentPair}_${currentTimeframe}.png`;
        link.href = elements.chartCanvas.toDataURL();
        link.click();
        if (window.showToast) {
            window.showToast('Screenshot chart berhasil diunduh', 'success');
        }
    }

    // ========================== TOGGLE INDIKATOR ==========================
    function toggleMA7() {
        showMA7 = !showMA7;
        renderChart();
        if (window.showToast) window.showToast(`MA7 ${showMA7 ? 'ditampilkan' : 'disembunyikan'}`, 'info');
    }
    
    function toggleMA25() {
        showMA25 = !showMA25;
        renderChart();
        if (window.showToast) window.showToast(`MA25 ${showMA25 ? 'ditampilkan' : 'disembunyikan'}`, 'info');
    }
    
    function toggleRSI() {
        showRSI = !showRSI;
        renderChart();
        if (window.showToast) window.showToast(`RSI ${showRSI ? 'ditampilkan' : 'disembunyikan'}`, 'info');
    }
    
    function toggleVolume() {
        showVolume = !showVolume;
        renderChart();
        if (window.showToast) window.showToast(`Volume ${showVolume ? 'ditampilkan' : 'disembunyikan'}`, 'info');
    }

    // ========================== INISIALISASI UI CONTROLS ==========================
    function createControlPanel() {
        // Buat panel kontrol jika belum ada
        let controlPanel = document.querySelector('.chart-control-panel');
        if (controlPanel) return;
        
        const chartPanel = document.querySelector('.chart-panel');
        if (!chartPanel) return;
        
        controlPanel = document.createElement('div');
        controlPanel.className = 'chart-control-panel';
        controlPanel.innerHTML = `
            <div class="control-group">
                <button id="zoomOutBtn" class="btn-icon" title="Zoom Out"><i class="fas fa-search-minus"></i></button>
                <button id="zoomInBtn" class="btn-icon" title="Zoom In"><i class="fas fa-search-plus"></i></button>
                <button id="screenshotBtn" class="btn-icon" title="Screenshot"><i class="fas fa-camera"></i></button>
            </div>
            <div class="control-group indicators">
                <span class="indicator-label">Indikator:</span>
                <button id="toggleMa7Btn" class="btn-indicator ${showMA7 ? 'active' : ''}" title="MA 7">MA7</button>
                <button id="toggleMa25Btn" class="btn-indicator ${showMA25 ? 'active' : ''}" title="MA 25">MA25</button>
                <button id="toggleRsiBtn" class="btn-indicator ${showRSI ? 'active' : ''}" title="RSI">RSI</button>
                <button id="toggleVolumeBtn" class="btn-indicator ${showVolume ? 'active' : ''}" title="Volume">Vol</button>
            </div>
        `;
        chartPanel.insertBefore(controlPanel, chartPanel.querySelector('.chart-control') || chartPanel.firstChild);
        
        // Styling
        const style = document.createElement('style');
        style.textContent = `
            .chart-control-panel {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
                flex-wrap: wrap;
                gap: 10px;
            }
            .control-group {
                display: flex;
                gap: 8px;
                align-items: center;
            }
            .btn-icon {
                background: #1f2937;
                border: 1px solid #334155;
                border-radius: 40px;
                padding: 6px 12px;
                color: #9ca3af;
                cursor: pointer;
                transition: all 0.2s;
            }
            .btn-icon:hover {
                background: #3b82f6;
                color: white;
                border-color: #3b82f6;
            }
            .indicator-label {
                font-size: 12px;
                color: #9ca3af;
            }
            .btn-indicator {
                background: #111827;
                border: 1px solid #334155;
                border-radius: 20px;
                padding: 4px 12px;
                font-size: 11px;
                font-weight: bold;
                cursor: pointer;
                color: #9ca3af;
            }
            .btn-indicator.active {
                background: #3b82f6;
                color: white;
                border-color: #3b82f6;
            }
        `;
        document.head.appendChild(style);
        
        // Event listeners untuk tombol baru
        document.getElementById('zoomInBtn')?.addEventListener('click', () => zoomIn());
        document.getElementById('zoomOutBtn')?.addEventListener('click', () => zoomOut());
        document.getElementById('screenshotBtn')?.addEventListener('click', () => takeScreenshot());
        document.getElementById('toggleMa7Btn')?.addEventListener('click', (e) => {
            toggleMA7();
            e.target.classList.toggle('active');
        });
        document.getElementById('toggleMa25Btn')?.addEventListener('click', (e) => {
            toggleMA25();
            e.target.classList.toggle('active');
        });
        document.getElementById('toggleRsiBtn')?.addEventListener('click', (e) => {
            toggleRSI();
            e.target.classList.toggle('active');
        });
        document.getElementById('toggleVolumeBtn')?.addEventListener('click', (e) => {
            toggleVolume();
            e.target.classList.toggle('active');
        });
        
        elements.zoomInBtn = document.getElementById('zoomInBtn');
        elements.zoomOutBtn = document.getElementById('zoomOutBtn');
        elements.screenshotBtn = document.getElementById('screenshotBtn');
    }

    // ========================== EVENT LISTENERS ==========================
    function attachChartEvents() {
        // Timeframe buttons (sudah ada di HTML)
        if (elements.timeframeButtons) {
            elements.timeframeButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const timeframe = e.target.dataset.time;
                    if (timeframe) switchTimeframe(timeframe);
                });
            });
        }
        
        // Pair selector (jika ada)
        const pairSelect = document.getElementById('tradePairSelect');
        if (pairSelect) {
            pairSelect.addEventListener('change', (e) => {
                switchPair(e.target.value);
            });
            elements.pairSelector = pairSelect;
        }
        
        // Data perubahan harga dari DataManager
        if (window.DataManager && window.DataManager.onDataChange) {
            window.DataManager.onDataChange('prices', (data) => {
                if (data.symbol === currentPair) {
                    updateChartRealtime();
                }
            });
        }
    }

    // ========================== PUBLIC API ==========================
    function initChart() {
        cacheElements();
        if (!elements.chartCanvas) {
            console.warn('[CHART] Canvas not found, retrying...');
            setTimeout(() => initChart(), 500);
            return;
        }
        createControlPanel();
        attachChartEvents();
        renderChart();
        console.log('[CHART] Initialized');
    }
    
    // Export untuk dipanggil dari dashboard
    window.ChartManager = {
        init: initChart,
        initChart,
        switchPair,
        switchTimeframe,
        updateChartRealtime,
        takeScreenshot,
        toggleMA7,
        toggleMA25,
        toggleRSI,
        toggleVolume,
        zoomIn,
        zoomOut,
        getCurrentPair: () => currentPair,
        getCurrentTimeframe: () => currentTimeframe
    };
    
    // Auto init jika DOM siap (tapi tunggu dashboard)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            // Jangan auto init, biar dashboard panggil
        });
    }
    
    console.log('[CHART] Module loaded');
})();