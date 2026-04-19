/* ===============================================================
   TRADINGPRO - MODAL & UI COMPONENTS (ULTIMATE)
   Versi: 3.0.0 | Manajemen modal, profil user, ganti password, admin create/edit user, info akun, konfirmasi
   =============================================================== */

/**
 * MODUL INI MENYEDIAKAN:
 * ✅ Modal umum (create, show, close)
 * ✅ Modal profil user (lihat & edit email, ganti password)
 * ✅ Modal ganti password (dengan validasi)
 * ✅ Modal info akun (statistik user pribadi)
 * ✅ Modal konfirmasi (yes/no untuk aksi berbahaya)
 * ✅ Modal notifikasi info/error/success
 * ✅ Modal loading (spinner)
 * ✅ Modal untuk admin: create user, edit user (dipanggil dari admin.js)
 * ✅ Modal tampilkan daftar user (untuk admin)
 * ✅ Semua modal reusable dan terintegrasi dengan DataManager
 */

(function() {
    'use strict';

    // ========================== KONFIGURASI ==========================
    const MODAL_CONFIG = {
        defaultPassword: 'password123',
        defaultBalance: 10000,
        animationDuration: 200
    };

    // ========================== UTILITY ==========================
    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }

    // ========================== MODAL CORE ==========================
    let activeModal = null;

    function createModal(id, title, content, onConfirm = null, onCancel = null, confirmText = 'Konfirmasi', cancelText = 'Batal', options = {}) {
        // Hapus modal lama jika ada
        let modal = document.getElementById(id);
        if (modal) modal.remove();

        modal = document.createElement('div');
        modal.id = id;
        modal.className = 'modal';
        if (options.size === 'small') modal.classList.add('modal-sm');
        if (options.size === 'large') modal.classList.add('modal-lg');
        if (options.noFooter) modal.classList.add('modal-no-footer');

        modal.innerHTML = `
            <div class="modal-content">
                <span class="close-modal">&times;</span>
                <div class="modal-header">
                    <h3>${escapeHtml(title)}</h3>
                </div>
                <div class="modal-body">${content}</div>
                ${!options.noFooter ? `
                <div class="modal-footer">
                    <button class="modal-confirm-btn btn-primary">${escapeHtml(confirmText)}</button>
                    <button class="modal-cancel-btn btn-secondary">${escapeHtml(cancelText)}</button>
                </div>
                ` : ''}
            </div>
        `;

        document.body.appendChild(modal);
        activeModal = modal;

        const closeSpan = modal.querySelector('.close-modal');
        const confirmBtn = modal.querySelector('.modal-confirm-btn');
        const cancelBtn = modal.querySelector('.modal-cancel-btn');

        const closeModal = () => {
            modal.style.display = 'none';
            if (activeModal === modal) activeModal = null;
        };

        closeSpan.onclick = closeModal;
        if (cancelBtn) cancelBtn.onclick = () => {
            if (onCancel) onCancel();
            closeModal();
        };
        if (confirmBtn) confirmBtn.onclick = async () => {
            const result = onConfirm ? await onConfirm() : true;
            if (result !== false) closeModal();
        };

        modal.style.display = 'flex';
        return modal;
    }

    function closeModal(id) {
        const modal = document.getElementById(id);
        if (modal) modal.style.display = 'none';
        if (activeModal === modal) activeModal = null;
    }

    function closeAllModals() {
        document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
        activeModal = null;
    }

    // ========================== MODAL NOTIFIKASI ==========================
    function showNotificationModal(title, message, type = 'info', duration = 3000) {
        const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
        const content = `
            <div class="notification-content">
                <div class="notification-icon">${icon}</div>
                <div class="notification-message">${escapeHtml(message)}</div>
            </div>
        `;
        const modal = createModal('notificationModal', title, content, null, null, 'Tutup', '', { noFooter: false });
        if (duration > 0) {
            setTimeout(() => closeModal('notificationModal'), duration);
        }
        return modal;
    }

    function showToastNotification(message, type = 'info', duration = 3000) {
        // Gunakan toast dari utils.js jika ada
        if (window.Utils && window.Utils.showToast) {
            window.Utils.showToast(message, type, duration);
        } else {
            showNotificationModal('Notifikasi', message, type, duration);
        }
    }

    // ========================== MODAL LOADING ==========================
    let loadingModal = null;
    function showLoading(message = 'Memuat...') {
        if (loadingModal) closeModal('loadingModal');
        loadingModal = createModal('loadingModal', 'Loading', `<div class="loading-spinner"></div><p>${escapeHtml(message)}</p>`, null, null, '', '', { noFooter: true });
        return loadingModal;
    }

    function hideLoading() {
        if (loadingModal) closeModal('loadingModal');
        loadingModal = null;
    }

    // ========================== MODAL KONFIRMASI ==========================
    function showConfirmModal(title, message, onConfirm, onCancel = null) {
        return createModal('confirmModal', title, `<p>${escapeHtml(message)}</p>`, onConfirm, onCancel, 'Ya', 'Tidak');
    }

    // ========================== MODAL PROFIL USER ==========================
    function showUserProfileModal() {
        const currentUser = DataManager.getCurrentUser();
        if (!currentUser) {
            showToastNotification('Anda belum login', 'error');
            return;
        }

        const content = `
            <div class="profile-form">
                <div class="profile-avatar">
                    <i class="fas fa-user-circle"></i>
                </div>
                <div class="profile-field">
                    <label>Username</label>
                    <input type="text" value="${escapeHtml(currentUser.username)}" disabled>
                </div>
                <div class="profile-field">
                    <label>Email</label>
                    <input type="email" id="profileEmail" value="${escapeHtml(currentUser.email || '')}" placeholder="Email (opsional)">
                </div>
                <div class="profile-field">
                    <label>Role</label>
                    <input type="text" value="${currentUser.role === 'admin' ? 'Administrator' : 'User'}" disabled>
                </div>
                <div class="profile-field">
                    <label>Saldo</label>
                    <input type="text" value="${Utils.formatCurrency(currentUser.balance)}" disabled>
                </div>
                <div class="profile-field">
                    <label>Virtual Account</label>
                    <input type="text" value="${currentUser.virtualAccount || 'Belum diatur'}" disabled>
                </div>
                <div class="profile-field">
                    <label>Bergabung</label>
                    <input type="text" value="${currentUser.createdAt ? Utils.formatDate(currentUser.createdAt, true) : '-'}" disabled>
                </div>
                <hr>
                <button id="changePasswordFromProfile" class="btn-primary btn-block">Ganti Password</button>
            </div>
        `;

        const modal = createModal('profileModal', 'Profil Saya', content, async () => {
            const newEmail = document.getElementById('profileEmail')?.value.trim();
            if (newEmail !== currentUser.email) {
                DataManager.updateUser(currentUser.username, { email: newEmail });
                showToastNotification('Email berhasil diperbarui', 'success');
            }
            return true;
        }, null, 'Simpan Perubahan', 'Tutup');

        document.getElementById('changePasswordFromProfile')?.addEventListener('click', () => {
            closeModal('profileModal');
            showChangePasswordModal();
        });
    }

    // ========================== MODAL GANTI PASSWORD ==========================
    function showChangePasswordModal() {
        const currentUser = DataManager.getCurrentUser();
        if (!currentUser) return;

        const content = `
            <div class="password-form">
                <div class="profile-field">
                    <label>Password Lama</label>
                    <input type="password" id="oldPassword" placeholder="Masukkan password lama">
                </div>
                <div class="profile-field">
                    <label>Password Baru</label>
                    <input type="password" id="newPassword" placeholder="Minimal 4 karakter">
                </div>
                <div class="profile-field">
                    <label>Konfirmasi Password Baru</label>
                    <input type="password" id="confirmPassword" placeholder="Ulangi password baru">
                </div>
            </div>
        `;

        createModal('changePwModal', 'Ganti Password', content, async () => {
            const oldPass = document.getElementById('oldPassword')?.value;
            const newPass = document.getElementById('newPassword')?.value;
            const confirmPass = document.getElementById('confirmPassword')?.value;

            if (!oldPass || !newPass || !confirmPass) {
                showToastNotification('Semua field harus diisi', 'error');
                return false;
            }
            if (newPass !== confirmPass) {
                showToastNotification('Password baru tidak cocok', 'error');
                return false;
            }
            if (newPass.length < 4) {
                showToastNotification('Password minimal 4 karakter', 'error');
                return false;
            }
            // Verifikasi password lama
            const users = DataManager.getUsers();
            const user = users.find(u => u.username === currentUser.username);
            if (!user || user.password !== oldPass) {
                showToastNotification('Password lama salah', 'error');
                return false;
            }
            DataManager.updateUser(currentUser.username, { password: newPass });
            showToastNotification('Password berhasil diubah', 'success');
            return true;
        }, null, 'Ubah Password', 'Batal');
    }

    // ========================== MODAL INFO AKUN (USER) ==========================
    function showAccountInfoModal() {
        const currentUser = DataManager.getCurrentUser();
        if (!currentUser) return;

        const transactions = DataManager.getUserTransactions(currentUser.username);
        const totalDeposit = transactions.filter(t => t.type === 'deposit').reduce((s, t) => s + (t.total || t.amount || 0), 0);
        const totalWithdraw = transactions.filter(t => t.type === 'withdraw').reduce((s, t) => s + (t.total || t.amount || 0), 0);
        const totalBuy = transactions.filter(t => t.type === 'buy').reduce((s, t) => s + (t.total || 0), 0);
        const totalSell = transactions.filter(t => t.type === 'sell').reduce((s, t) => s + (t.total || 0), 0);
        const totalFee = transactions.reduce((s, t) => s + (t.fee || 0), 0);

        const content = `
            <div class="account-info">
                <div class="info-row"><span class="label">Username:</span><span class="value">${escapeHtml(currentUser.username)}</span></div>
                <div class="info-row"><span class="label">Email:</span><span class="value">${escapeHtml(currentUser.email || '-')}</span></div>
                <div class="info-row"><span class="label">Role:</span><span class="value">${currentUser.role === 'admin' ? 'Admin' : 'User'}</span></div>
                <div class="info-row"><span class="label">Saldo Saat Ini:</span><span class="value">${Utils.formatCurrency(currentUser.balance)}</span></div>
                <hr>
                <div class="info-row"><span class="label">Total Deposit:</span><span class="value">${Utils.formatCurrency(totalDeposit)}</span></div>
                <div class="info-row"><span class="label">Total Withdraw:</span><span class="value">${Utils.formatCurrency(totalWithdraw)}</span></div>
                <div class="info-row"><span class="label">Total Pembelian:</span><span class="value">${Utils.formatCurrency(totalBuy)}</span></div>
                <div class="info-row"><span class="label">Total Penjualan:</span><span class="value">${Utils.formatCurrency(totalSell)}</span></div>
                <div class="info-row"><span class="label">Total Fee:</span><span class="value">${Utils.formatCurrency(totalFee)}</span></div>
                <div class="info-row"><span class="label">Jumlah Transaksi:</span><span class="value">${transactions.length}</span></div>
                <hr>
                <div class="info-row"><span class="label">Virtual Account:</span><span class="value">${currentUser.virtualAccount || 'Belum diatur'}</span></div>
            </div>
        `;
        createModal('accountInfoModal', 'Info Akun & Statistik', content, null, null, 'Tutup', '');
    }

    // ========================== MODAL ADMIN CREATE USER (DIPANGGIL DARI ADMIN.JS) ==========================
    function showAdminCreateUserModal() {
        const content = `
            <div class="admin-form">
                <div class="form-group">
                    <label>Username *</label>
                    <input type="text" id="newUsername" placeholder="3-20 karakter (huruf/angka/underscore)">
                </div>
                <div class="form-group">
                    <label>Password *</label>
                    <input type="password" id="newPassword" placeholder="Minimal 4 karakter">
                </div>
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" id="newEmail" placeholder="Email (opsional)">
                </div>
                <div class="form-group">
                    <label>Role</label>
                    <select id="newRole">
                        <option value="user">User Biasa</option>
                        <option value="vip">VIP</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Saldo Awal</label>
                    <input type="number" id="newBalance" value="${MODAL_CONFIG.defaultBalance}" step="1000">
                </div>
                <div class="form-group">
                    <label>Virtual Account (opsional)</label>
                    <input type="text" id="newVA" placeholder="Nomor rekening deposit">
                </div>
            </div>
        `;

        createModal('adminCreateUserModal', 'Buat User Baru (Admin)', content, async () => {
            const username = document.getElementById('newUsername')?.value.trim();
            const password = document.getElementById('newPassword')?.value;
            const email = document.getElementById('newEmail')?.value.trim();
            const role = document.getElementById('newRole')?.value;
            const balance = parseFloat(document.getElementById('newBalance')?.value);
            const va = document.getElementById('newVA')?.value.trim();

            if (!username || !password) {
                showToastNotification('Username dan password harus diisi', 'error');
                return false;
            }
            if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
                showToastNotification('Username hanya huruf/angka/underscore, 3-20 karakter', 'error');
                return false;
            }
            if (password.length < 4) {
                showToastNotification('Password minimal 4 karakter', 'error');
                return false;
            }
            if (DataManager.getUserByUsername(username)) {
                showToastNotification('Username sudah ada', 'error');
                return false;
            }
            const newUser = {
                username, password, email: email || '',
                balance: isNaN(balance) ? MODAL_CONFIG.defaultBalance : balance,
                role, virtualAccount: va || '',
                createdAt: new Date().toISOString(), lastLogin: null, isActive: true,
                preferences: { theme: 'dark', notifications: true, language: 'id' }
            };
            DataManager.addUser(newUser);
            if (window.AdminManager) window.AdminManager.refresh();
            showToastNotification(`User ${username} berhasil dibuat`, 'success');
            return true;
        }, null, 'Buat User', 'Batal');
    }

    // ========================== MODAL ADMIN EDIT USER ==========================
    function showAdminEditUserModal(username) {
        const user = DataManager.getUserByUsername(username);
        if (!user) return;

        const content = `
            <div class="admin-form">
                <div class="form-group">
                    <label>Username</label>
                    <input type="text" value="${escapeHtml(user.username)}" disabled>
                </div>
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" id="editEmail" value="${escapeHtml(user.email || '')}">
                </div>
                <div class="form-group">
                    <label>Role</label>
                    <select id="editRole">
                        <option value="user" ${user.role === 'user' ? 'selected' : ''}>User</option>
                        <option value="vip" ${user.role === 'vip' ? 'selected' : ''}>VIP</option>
                        <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Saldo</label>
                    <input type="number" id="editBalance" value="${user.balance}" step="1000">
                </div>
                <div class="form-group">
                    <label>Virtual Account</label>
                    <input type="text" id="editVA" value="${escapeHtml(user.virtualAccount || '')}">
                </div>
                <div class="form-group">
                    <button id="resetPasswordBtn" class="btn-secondary">Reset Password (ke ${MODAL_CONFIG.defaultPassword})</button>
                </div>
            </div>
        `;

        createModal('adminEditUserModal', `Edit User: ${username}`, content, async () => {
            const newEmail = document.getElementById('editEmail')?.value.trim();
            const newRole = document.getElementById('editRole')?.value;
            const newBalance = parseFloat(document.getElementById('editBalance')?.value);
            const newVA = document.getElementById('editVA')?.value.trim();

            if (!isNaN(newBalance) && newBalance !== user.balance) {
                DataManager.updateUserBalance(username, newBalance);
            }
            if (newEmail !== user.email) DataManager.updateUser(username, { email: newEmail });
            if (newRole !== user.role) DataManager.updateUser(username, { role: newRole });
            if (newVA !== (user.virtualAccount || '')) DataManager.updateUser(username, { virtualAccount: newVA });

            showToastNotification(`User ${username} berhasil diupdate`, 'success');
            if (window.AdminManager) window.AdminManager.refresh();
            return true;
        }, null, 'Simpan', 'Batal');

        document.getElementById('resetPasswordBtn')?.addEventListener('click', () => {
            DataManager.updateUser(username, { password: MODAL_CONFIG.defaultPassword });
            showToastNotification(`Password ${username} direset menjadi ${MODAL_CONFIG.defaultPassword}`, 'success');
            closeModal('adminEditUserModal');
        });
    }

    // ========================== MODAL TAMPILAN DAFTAR USER (ADMIN) ==========================
    function showAdminUserListModal() {
        const users = DataManager.getUsers();
        const content = `
            <div class="user-list-modal">
                <input type="text" id="userSearchInput" placeholder="Cari user..." class="search-input">
                <div class="user-list" id="userListContainer">
                    ${users.map(u => `
                        <div class="user-list-item" data-username="${u.username}">
                            <span><strong>${escapeHtml(u.username)}</strong> (${u.role}) - ${Utils.formatCurrency(u.balance)}</span>
                            <button class="btn-edit-user-small" data-username="${u.username}">Edit</button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        createModal('adminUserListModal', 'Daftar User', content, null, null, 'Tutup', '', { size: 'large' });
        // Search filter
        const searchInput = document.getElementById('userSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const keyword = e.target.value.toLowerCase();
                document.querySelectorAll('.user-list-item').forEach(item => {
                    const text = item.innerText.toLowerCase();
                    item.style.display = text.includes(keyword) ? 'flex' : 'none';
                });
            });
        }
        // Edit button
        document.querySelectorAll('.btn-edit-user-small').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const username = btn.dataset.username;
                closeModal('adminUserListModal');
                showAdminEditUserModal(username);
            });
        });
    }

    // ========================== INISIALISASI & EXPORT ==========================
    function initModals() {
        // Menambahkan style untuk modal jika belum ada
        if (!document.getElementById('modal-styles')) {
            const style = document.createElement('style');
            style.id = 'modal-styles';
            style.textContent = `
                .modal { display: none; position: fixed; z-index: 10000; left: 0; top: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); justify-content: center; align-items: center; }
                .modal-content { background: #111827; border-radius: 32px; max-width: 500px; width: 90%; padding: 24px; border: 1px solid #facc15; animation: modalFadeIn 0.2s; }
                .modal-sm .modal-content { max-width: 350px; }
                .modal-lg .modal-content { max-width: 700px; }
                .modal-header { margin-bottom: 16px; }
                .modal-header h3 { margin: 0; color: #facc15; }
                .modal-body { margin-bottom: 20px; color: #e5e7eb; }
                .modal-footer { display: flex; justify-content: flex-end; gap: 12px; }
                .close-modal { float: right; font-size: 24px; cursor: pointer; color: #9ca3af; }
                .btn-primary { background: #3b82f6; border: none; padding: 8px 20px; border-radius: 40px; color: white; cursor: pointer; }
                .btn-secondary { background: #374151; border: none; padding: 8px 20px; border-radius: 40px; color: white; cursor: pointer; }
                .btn-block { width: 100%; }
                .profile-field { margin-bottom: 16px; }
                .profile-field label { display: block; margin-bottom: 6px; font-size: 12px; color: #9ca3af; }
                .profile-field input, .admin-form input, .admin-form select { width: 100%; padding: 10px; background: #0f172a; border: 1px solid #334155; border-radius: 40px; color: white; }
                .profile-avatar { text-align: center; font-size: 64px; margin-bottom: 16px; color: #3b82f6; }
                .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #2d3a5e; }
                .loading-spinner { width: 40px; height: 40px; border: 3px solid #334155; border-top-color: #facc15; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px; }
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes modalFadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
                .user-list-item { display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #2d3a5e; }
                .search-input { width: 100%; padding: 8px; margin-bottom: 16px; background: #0f172a; border: 1px solid #334155; border-radius: 40px; color: white; }
                .btn-edit-user-small { background: #3b82f6; border: none; border-radius: 20px; padding: 4px 12px; color: white; cursor: pointer; }
            `;
            document.head.appendChild(style);
        }
        console.log('[MODAL] Initialized');
    }

    // ========================== PUBLIC API ==========================
    window.ModalManager = {
        init: initModals,
        showConfirm: showConfirmModal,
        showNotification: showNotificationModal,
        showToast: showToastNotification,
        showLoading,
        hideLoading,
        showProfile: showUserProfileModal,
        showChangePassword: showChangePasswordModal,
        showAccountInfo: showAccountInfoModal,
        showAdminCreateUser: showAdminCreateUserModal,
        showAdminEditUser: showAdminEditUserModal,
        showAdminUserList: showAdminUserListModal,
        close: closeModal,
        closeAll: closeAllModals
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initModals);
    } else {
        initModals();
    }
})();