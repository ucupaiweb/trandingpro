/* ===============================================================
   TRADINGPRO - UTILITY FUNCTIONS
   Versi: 2.0.0 | Format angka, tanggal, notifikasi toast, debounce, validasi, dll
   =============================================================== */

/**
 * Modul ini berisi fungsi-fungsi bantu yang digunakan di seluruh aplikasi:
 * - Format mata uang (Rupiah / USD)
 * - Format tanggal dan waktu
 * - Notifikasi toast (sukses, error, info, warning)
 * - Debounce dan throttle
 * - Validasi input umum
 * - Manipulasi DOM helper
 * - Copy ke clipboard
 * - Generate ID unik
 * - Parse query string
 * - Logging dengan level
 */

(function() {
    'use strict';

    // ========================== KONFIGURASI ==========================
    const UTILS_CONFIG = {
        currencySymbol: 'Rp',
        currencyCode: 'IDR',
        useRupiah: true,      // set false untuk USD
        decimalPlaces: 0,     // Rupiah tanpa desimal
        thousandSeparator: '.',
        decimalSeparator: ',',
        dateFormat: 'dd/mm/yyyy',
        timeFormat: 'HH:MM:SS',
        toastDuration: 3000,
        toastPosition: 'bottom-right'
    };

    // ========================== FORMAT ANGKA & MATA UANG ==========================
    
    /**
     * Format angka dengan pemisah ribuan
     * @param {number} num - Angka yang akan diformat
     * @param {number} decimals - Jumlah desimal (default 0)
     * @returns {string}
     */
    function formatNumber(num, decimals = 0) {
        if (num === null || num === undefined || isNaN(num)) return '0';
        return num.toLocaleString('id-ID', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    }

    /**
     * Format mata uang (Rupiah atau USD)
     * @param {number} amount - Jumlah uang
     * @param {boolean} showSymbol - Tampilkan simbol mata uang
     * @returns {string}
     */
    function formatCurrency(amount, showSymbol = true) {
        if (amount === null || amount === undefined || isNaN(amount)) amount = 0;
        
        if (UTILS_CONFIG.useRupiah) {
            const formatted = formatNumber(amount, 0);
            return showSymbol ? `Rp${formatted}` : formatted;
        } else {
            const formatted = amount.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
            return showSymbol ? `$${formatted}` : formatted;
        }
    }

    /**
     * Format persentase
     * @param {number} value 
     * @param {number} decimals 
     * @returns {string}
     */
    function formatPercent(value, decimals = 2) {
        if (value === null || isNaN(value)) return '0%';
        return `${value.toFixed(decimals)}%`;
    }

    /**
     * Format volume (dalam M/B/T)
     * @param {number} volume 
     * @returns {string}
     */
    function formatVolume(volume) {
        if (volume >= 1e12) return (volume / 1e12).toFixed(2) + 'T';
        if (volume >= 1e9) return (volume / 1e9).toFixed(2) + 'B';
        if (volume >= 1e6) return (volume / 1e6).toFixed(2) + 'M';
        if (volume >= 1e3) return (volume / 1e3).toFixed(2) + 'K';
        return volume.toString();
    }

    // ========================== FORMAT TANGGAL & WAKTU ==========================
    
    /**
     * Format tanggal menjadi string lokal Indonesia
     * @param {Date|string} date - Objek Date atau string ISO
     * @param {boolean} includeTime - Sertakan waktu atau tidak
     * @returns {string}
     */
    function formatDate(date, includeTime = false) {
        if (!date) return '-';
        const d = new Date(date);
        if (isNaN(d.getTime())) return '-';
        
        const day = d.getDate().toString().padStart(2, '0');
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const year = d.getFullYear();
        const hours = d.getHours().toString().padStart(2, '0');
        const minutes = d.getMinutes().toString().padStart(2, '0');
        const seconds = d.getSeconds().toString().padStart(2, '0');
        
        if (includeTime) {
            return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
        }
        return `${day}/${month}/${year}`;
    }

    /**
     * Format waktu relatif (misal: "2 menit lalu")
     * @param {Date|string} date 
     * @returns {string}
     */
    function formatRelativeTime(date) {
        const now = new Date();
        const past = new Date(date);
        const diffMs = now - past;
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);
        
        if (diffSec < 60) return 'baru saja';
        if (diffMin < 60) return `${diffMin} menit lalu`;
        if (diffHour < 24) return `${diffHour} jam lalu`;
        if (diffDay < 7) return `${diffDay} hari lalu`;
        if (diffDay < 30) return `${Math.floor(diffDay / 7)} minggu lalu`;
        if (diffDay < 365) return `${Math.floor(diffDay / 30)} bulan lalu`;
        return `${Math.floor(diffDay / 365)} tahun lalu`;
    }

    // ========================== NOTIFIKASI TOAST ==========================
    
    let toastContainer = null;
    
    /**
     * Membuat container untuk toast jika belum ada
     */
    function ensureToastContainer() {
        if (toastContainer) return;
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        toastContainer.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;
        document.body.appendChild(toastContainer);
    }

    /**
     * Menampilkan notifikasi toast
     * @param {string} message - Pesan yang ditampilkan
     * @param {string} type - 'success', 'error', 'info', 'warning'
     * @param {number} duration - Durasi dalam ms (default 3000)
     */
    function showToast(message, type = 'info', duration = UTILS_CONFIG.toastDuration) {
        ensureToastContainer();
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.style.cssText = `
            background: #1f2937;
            backdrop-filter: blur(8px);
            border-radius: 40px;
            padding: 12px 20px;
            display: flex;
            align-items: center;
            gap: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            border-left: 4px solid ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f97316' : '#3b82f6'};
            animation: slideInRight 0.3s ease;
            min-width: 240px;
            max-width: 320px;
        `;
        
        let icon = '';
        if (type === 'success') icon = '✅';
        else if (type === 'error') icon = '❌';
        else if (type === 'warning') icon = '⚠️';
        else icon = 'ℹ️';
        
        toast.innerHTML = `
            <span style="font-size: 18px;">${icon}</span>
            <span style="flex:1; font-size: 13px;">${escapeHtml(message)}</span>
            <button class="toast-close" style="background:none; border:none; color:#9ca3af; cursor:pointer;">✕</button>
        `;
        
        toastContainer.appendChild(toast);
        
        const closeBtn = toast.querySelector('.toast-close');
        let timeoutId = setTimeout(() => {
            if (toast.parentNode) toast.remove();
        }, duration);
        
        closeBtn.addEventListener('click', () => {
            clearTimeout(timeoutId);
            toast.remove();
        });
        
        return toast;
    }

    // ========================== VALIDASI ==========================
    
    /**
     * Validasi email
     * @param {string} email 
     * @returns {boolean}
     */
    function isValidEmail(email) {
        const re = /^[^\s@]+@([^\s@.,]+\.)+[^\s@.,]{2,}$/;
        return re.test(email);
    }

    /**
     * Validasi username (hanya huruf, angka, underscore, min 3 max 20)
     * @param {string} username 
     * @returns {boolean}
     */
    function isValidUsername(username) {
        const re = /^[a-zA-Z0-9_]{3,20}$/;
        return re.test(username);
    }

    /**
     * Validasi password (minimal 4 karakter)
     * @param {string} password 
     * @returns {boolean}
     */
    function isValidPassword(password) {
        return password && password.length >= 4;
    }

    /**
     * Validasi nominal (angka positif)
     * @param {number} amount 
     * @returns {boolean}
     */
    function isValidAmount(amount) {
        return !isNaN(amount) && amount > 0;
    }

    // ========================== DEBOUNCE & THROTTLE ==========================
    
    /**
     * Debounce function (menunda eksekusi sampai berhenti dipanggil)
     * @param {Function} func 
     * @param {number} delay 
     * @returns {Function}
     */
    function debounce(func, delay = 300) {
        let timeoutId;
        return function(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }

    /**
     * Throttle function (membatasi eksekusi maksimal sekali per interval)
     * @param {Function} func 
     * @param {number} limit 
     * @returns {Function}
     */
    function throttle(func, limit = 300) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // ========================== DOM HELPERS ==========================
    
    /**
     * Escape HTML untuk mencegah XSS
     * @param {string} str 
     * @returns {string}
     */
    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }

    /**
     * Menampilkan atau menyembunyikan elemen
     * @param {HTMLElement|string} element 
     * @param {boolean} show 
     */
    function toggleElement(element, show) {
        const el = typeof element === 'string' ? document.getElementById(element) : element;
        if (el) el.style.display = show ? 'block' : 'none';
    }

    /**
     * Menampilkan loading overlay
     * @param {boolean} show 
     */
    function showLoading(show) {
        let loader = document.getElementById('globalLoader');
        if (show) {
            if (!loader) {
                loader = document.createElement('div');
                loader.id = 'globalLoader';
                loader.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0,0,0,0.7);
                    backdrop-filter: blur(4px);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 10000;
                `;
                loader.innerHTML = '<div class="spinner-lg"></div>';
                document.body.appendChild(loader);
            }
            loader.style.display = 'flex';
        } else {
            if (loader) loader.style.display = 'none';
        }
    }

    // ========================== LAIN-LAIN ==========================
    
    /**
     * Generate ID unik
     * @param {string} prefix 
     * @returns {string}
     */
    function generateId(prefix = 'id') {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Copy teks ke clipboard
     * @param {string} text 
     * @returns {Promise<boolean>}
     */
    async function copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            showToast('Teks disalin!', 'success', 1500);
            return true;
        } catch (err) {
            console.error('Copy failed:', err);
            showToast('Gagal menyalin', 'error');
            return false;
        }
    }

    /**
     * Download file JSON
     * @param {Object} data 
     * @param {string} filename 
     */
    function downloadJson(data, filename = 'data.json') {
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Parse query string dari URL
     * @returns {Object}
     */
    function getQueryParams() {
        const params = {};
        const query = window.location.search.substring(1);
        if (!query) return params;
        const pairs = query.split('&');
        for (const pair of pairs) {
            const [key, value] = pair.split('=');
            if (key) params[decodeURIComponent(key)] = decodeURIComponent(value || '');
        }
        return params;
    }

    /**
     * Sleep/delay
     * @param {number} ms 
     * @returns {Promise}
     */
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Logging dengan level (debug, info, warn, error)
     * @param {string} level 
     * @param {string} message 
     * @param {any} data 
     */
    function log(level, message, data = null) {
        const prefix = `[${new Date().toLocaleTimeString()}] [${level.toUpperCase()}]`;
        if (data) {
            console.log(prefix, message, data);
        } else {
            console.log(prefix, message);
        }
    }

    // ========================== EXPOSE PUBLIC API ==========================
    window.Utils = {
        // Format
        formatNumber,
        formatCurrency,
        formatPercent,
        formatVolume,
        formatDate,
        formatRelativeTime,
        
        // Notifikasi
        showToast,
        
        // Validasi
        isValidEmail,
        isValidUsername,
        isValidPassword,
        isValidAmount,
        
        // Utils
        debounce,
        throttle,
        escapeHtml,
        toggleElement,
        showLoading,
        generateId,
        copyToClipboard,
        downloadJson,
        getQueryParams,
        sleep,
        log,
        
        // Config getter
        getCurrencyConfig: () => ({ ...UTILS_CONFIG })
    };
    
    // Tambahkan ke global juga untuk akses mudah
    window.showToast = window.Utils.showToast;
    
    console.log('[UTILS] Module loaded');
})();