/* ===============================================================
   TRADINGPRO - AUTHENTICATION MODULE
   Versi: 2.0.0 | Login, Register, Logout, Session Management, Auto Login
   =============================================================== */

/**
 * Modul ini menangani semua yang berhubungan dengan autentikasi:
 * - Login (validasi username/password)
 * - Register (buat akun baru)
 * - Logout (hapus session)
 * - Auto login (dari session yang tersimpan)
 * - Modal trending (muncul pertama kali)
 * - Event listener untuk form auth
 */

(function() {
    'use strict';

    // ========================== DOM ELEMENTS ==========================
    let elements = {};

    function cacheElements() {
        elements = {
            // Auth containers
            authSection: document.getElementById('authSection'),
            dashboardSection: document.getElementById('dashboardSection'),
            loginCard: document.getElementById('loginCard'),
            registerCard: document.getElementById('registerCard'),
            
            // Login form
            loginUsername: document.getElementById('loginUsername'),
            loginPassword: document.getElementById('loginPassword'),
            loginBtn: document.getElementById('loginBtn'),
            loginError: document.getElementById('loginError'),
            
            // Register form
            regUsername: document.getElementById('regUsername'),
            regPassword: document.getElementById('regPassword'),
            regEmail: document.getElementById('regEmail'),
            registerBtn: document.getElementById('registerBtn'),
            regError: document.getElementById('regError'),
            
            // Switch links
            showRegisterLink: document.getElementById('showRegisterLink'),
            showLoginLink: document.getElementById('showLoginLink'),
            
            // Dashboard elements (akan diisi setelah login)
            userNameDisplay: document.getElementById('userNameDisplay'),
            userBalance: document.getElementById('userBalance'),
            logoutButton: document.getElementById('logoutButton'),
            
            // Modal
            trendingModal: document.getElementById('trendingModal'),
            closeModalBtn: document.getElementById('closeModalBtn'),
            modalCloseSpan: document.querySelector('#trendingModal .close-modal')
        };
    }

    // ========================== HELPER FUNCTIONS ==========================
    
    /**
     * Tampilkan pesan error pada form tertentu
     * @param {string} formType - 'login' atau 'register'
     * @param {string} message - Pesan error
     */
    function showError(formType, message) {
        const errorDiv = formType === 'login' ? elements.loginError : elements.regError;
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            // Auto hilang setelah 4 detik
            setTimeout(() => {
                if (errorDiv) errorDiv.style.display = 'none';
            }, 4000);
        }
    }

    /**
     * Bersihkan input form
     * @param {string} formType - 'login' atau 'register'
     */
    function clearForm(formType) {
        if (formType === 'login') {
            if (elements.loginUsername) elements.loginUsername.value = '';
            if (elements.loginPassword) elements.loginPassword.value = '';
            if (elements.loginError) elements.loginError.style.display = 'none';
        } else {
            if (elements.regUsername) elements.regUsername.value = '';
            if (elements.regPassword) elements.regPassword.value = '';
            if (elements.regEmail) elements.regEmail.value = '';
            if (elements.regError) elements.regError.style.display = 'none';
        }
    }

    /**
     * Validasi input register
     * @param {string} username 
     * @param {string} password 
     * @param {string} email 
     * @returns {Object} { valid: boolean, message: string }
     */
    function validateRegister(username, password, email) {
        if (!username || username.trim() === '') {
            return { valid: false, message: 'Username tidak boleh kosong' };
        }
        if (username.length < 3) {
            return { valid: false, message: 'Username minimal 3 karakter' };
        }
        if (username.length > 20) {
            return { valid: false, message: 'Username maksimal 20 karakter' };
        }
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            return { valid: false, message: 'Username hanya boleh huruf, angka, dan underscore' };
        }
        if (!password || password.trim() === '') {
            return { valid: false, message: 'Password tidak boleh kosong' };
        }
        if (password.length < 4) {
            return { valid: false, message: 'Password minimal 4 karakter' };
        }
        if (email && email.trim() !== '') {
            const emailRegex = /^[^\s@]+@([^\s@.,]+\.)+[^\s@.,]{2,}$/;
            if (!emailRegex.test(email)) {
                return { valid: false, message: 'Format email tidak valid' };
            }
        }
        return { valid: true, message: '' };
    }

    /**
     * Validasi input login
     * @param {string} username 
     * @param {string} password 
     * @returns {Object}
     */
    function validateLogin(username, password) {
        if (!username || username.trim() === '') {
            return { valid: false, message: 'Username tidak boleh kosong' };
        }
        if (!password || password.trim() === '') {
            return { valid: false, message: 'Password tidak boleh kosong' };
        }
        return { valid: true, message: '' };
    }

    // ========================== MODAL TRENDING ==========================
    
    /**
     * Tampilkan modal trending (hanya sekali per session)
     */
    function showTrendingModalOnce() {
        // Cek apakah sudah pernah ditampilkan di session ini
        const alreadyShown = sessionStorage.getItem('trendingModalShown');
        if (alreadyShown) return;
        
        // Tampilkan modal setelah delay 1 detik (biar halaman stabil)
        setTimeout(() => {
            if (elements.trendingModal) {
                elements.trendingModal.style.display = 'flex';
                sessionStorage.setItem('trendingModalShown', 'true');
            }
        }, 1000);
    }

    /**
     * Tutup modal trending
     */
    function closeTrendingModal() {
        if (elements.trendingModal) {
            elements.trendingModal.style.display = 'none';
        }
    }

    // ========================== LOGIN PROCESS ==========================
    
    /**
     * Proses login user
     * @param {string} username 
     * @param {string} password 
     * @returns {Promise<boolean>}
     */
    async function processLogin(username, password) {
        // Validasi input
        const validation = validateLogin(username, password);
        if (!validation.valid) {
            showError('login', validation.message);
            return false;
        }
        
        // Cari user di database
        const users = DataManager.getUsers();
        const user = users.find(u => u.username === username && u.password === password);
        
        if (!user) {
            showError('login', 'Username atau password salah');
            return false;
        }
        
        if (!user.isActive) {
            showError('login', 'Akun Anda telah dinonaktifkan. Hubungi admin.');
            return false;
        }
        
        // Update lastLogin
        DataManager.updateUser(username, { lastLogin: new Date().toISOString() });
        
        // Set current user
        DataManager.setCurrentUser(user);
        
        // Update tampilan dashboard
        if (elements.userNameDisplay) {
            elements.userNameDisplay.textContent = user.username;
        }
        if (elements.userBalance) {
            elements.userBalance.textContent = user.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
        
        // Tampilkan dashboard, sembunyikan auth
        if (elements.authSection) elements.authSection.style.display = 'none';
        if (elements.dashboardSection) elements.dashboardSection.style.display = 'block';
        
        // Load dashboard components (dipanggil dari dashboard.js)
        if (window.DashboardManager && window.DashboardManager.loadDashboard) {
            window.DashboardManager.loadDashboard();
        }
        
        // Tampilkan notifikasi sukses
        if (window.showToast) {
            window.showToast(`Selamat datang, ${user.username}!`, 'success');
        } else {
            console.log(`Login success: ${user.username}`);
        }
        
        // Bersihkan form login
        clearForm('login');
        
        return true;
    }

    // ========================== REGISTER PROCESS ==========================
    
    /**
     * Proses registrasi user baru
     * @param {string} username 
     * @param {string} password 
     * @param {string} email 
     * @returns {Promise<boolean>}
     */
    async function processRegister(username, password, email) {
        // Validasi input
        const validation = validateRegister(username, password, email);
        if (!validation.valid) {
            showError('register', validation.message);
            return false;
        }
        
        // Cek apakah username sudah ada
        const users = DataManager.getUsers();
        if (users.find(u => u.username === username)) {
            showError('register', 'Username sudah terdaftar. Silakan gunakan username lain.');
            return false;
        }
        
        // Buat user baru
        const newUser = {
            username: username,
            password: password,
            email: email || '',
            balance: CONFIG.DEFAULT_BALANCE || 10000,
            role: 'user',
            createdAt: new Date().toISOString(),
            lastLogin: null,
            isActive: true,
            preferences: { theme: 'dark', notifications: true, language: 'id' }
        };
        
        const success = DataManager.addUser(newUser);
        if (!success) {
            showError('register', 'Gagal mendaftar. Silakan coba lagi.');
            return false;
        }
        
        // Tampilkan pesan sukses
        showError('register', 'Registrasi berhasil! Silakan login.');
        
        // Bersihkan form register
        clearForm('register');
        
        // Alihkan ke form login setelah 1.5 detik
        setTimeout(() => {
            showLoginForm();
        }, 1500);
        
        return true;
    }

    // ========================== LOGOUT ==========================
    
    function processLogout() {
        // Hentikan simulasi harga (opsional, akan di-restart saat login lagi)
        if (window.DataManager) {
            DataManager.stopPriceSimulation();
        }
        
        // Hapus session
        DataManager.logout();
        
        // Sembunyikan dashboard, tampilkan auth
        if (elements.dashboardSection) elements.dashboardSection.style.display = 'none';
        if (elements.authSection) elements.authSection.style.display = 'block';
        
        // Tampilkan form login
        showLoginForm();
        
        // Bersihkan input
        clearForm('login');
        
        // Tampilkan notifikasi
        if (window.showToast) {
            window.showToast('Anda telah logout', 'info');
        }
    }

    // ========================== SWITCH FORM ==========================
    
    function showLoginForm() {
        if (elements.loginCard) elements.loginCard.style.display = 'block';
        if (elements.registerCard) elements.registerCard.style.display = 'none';
        clearForm('login');
        clearForm('register');
    }
    
    function showRegisterForm() {
        if (elements.loginCard) elements.loginCard.style.display = 'none';
        if (elements.registerCard) elements.registerCard.style.display = 'block';
        clearForm('login');
        clearForm('register');
    }

    // ========================== AUTO LOGIN (SESSION) ==========================
    
    function checkAutoLogin() {
        const currentUser = DataManager.getCurrentUser();
        if (currentUser) {
            // Ada session tersimpan, langsung login
            console.log('[AUTH] Auto login for:', currentUser.username);
            if (elements.userNameDisplay) elements.userNameDisplay.textContent = currentUser.username;
            if (elements.userBalance) {
                elements.userBalance.textContent = currentUser.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            }
            if (elements.authSection) elements.authSection.style.display = 'none';
            if (elements.dashboardSection) elements.dashboardSection.style.display = 'block';
            
            // Load dashboard
            if (window.DashboardManager && window.DashboardManager.loadDashboard) {
                window.DashboardManager.loadDashboard();
            }
            
            // Restart price simulation jika perlu
            if (window.DataManager) {
                DataManager.startPriceSimulation();
            }
        } else {
            // Tampilkan modal trending untuk user yang belum login
            showTrendingModalOnce();
        }
    }

    // ========================== EVENT LISTENERS ==========================
    
    function attachEventListeners() {
        // Login button
        if (elements.loginBtn) {
            elements.loginBtn.addEventListener('click', async () => {
                const username = elements.loginUsername?.value.trim() || '';
                const password = elements.loginPassword?.value || '';
                await processLogin(username, password);
            });
        }
        
        // Register button
        if (elements.registerBtn) {
            elements.registerBtn.addEventListener('click', async () => {
                const username = elements.regUsername?.value.trim() || '';
                const password = elements.regPassword?.value || '';
                const email = elements.regEmail?.value.trim() || '';
                await processRegister(username, password, email);
            });
        }
        
        // Logout button
        if (elements.logoutButton) {
            elements.logoutButton.addEventListener('click', () => {
                processLogout();
            });
        }
        
        // Switch to register
        if (elements.showRegisterLink) {
            elements.showRegisterLink.addEventListener('click', (e) => {
                e.preventDefault();
                showRegisterForm();
            });
        }
        
        // Switch to login
        if (elements.showLoginLink) {
            elements.showLoginLink.addEventListener('click', (e) => {
                e.preventDefault();
                showLoginForm();
            });
        }
        
        // Modal close
        if (elements.closeModalBtn) {
            elements.closeModalBtn.addEventListener('click', closeTrendingModal);
        }
        if (elements.modalCloseSpan) {
            elements.modalCloseSpan.addEventListener('click', closeTrendingModal);
        }
        
        // Klik di luar modal untuk menutup
        if (elements.trendingModal) {
            elements.trendingModal.addEventListener('click', (e) => {
                if (e.target === elements.trendingModal) {
                    closeTrendingModal();
                }
            });
        }
        
        // Enter key pada form login
        const loginInputs = [elements.loginUsername, elements.loginPassword];
        loginInputs.forEach(input => {
            if (input) {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        elements.loginBtn?.click();
                    }
                });
            }
        });
        
        // Enter key pada form register
        const regInputs = [elements.regUsername, elements.regPassword, elements.regEmail];
        regInputs.forEach(input => {
            if (input) {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        elements.registerBtn?.click();
                    }
                });
            }
        });
    }

    // ========================== INITIALIZATION ==========================
    
    function initAuth() {
        cacheElements();
        attachEventListeners();
        checkAutoLogin();
        console.log('[AUTH] Module initialized');
    }
    
    // ========================== PUBLIC API ==========================
    window.AuthManager = {
        init: initAuth,
        login: processLogin,
        register: processRegister,
        logout: processLogout,
        showLoginForm,
        showRegisterForm,
        getCurrentUser: () => DataManager.getCurrentUser(),
        isLoggedIn: () => DataManager.getCurrentUser() !== null
    };
    
    // Auto init saat DOM siap
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAuth);
    } else {
        initAuth();
    }
    
    console.log('[AUTH] Module loaded');
})();