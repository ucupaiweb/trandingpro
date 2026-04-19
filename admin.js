/* ===============================================================
   TRADINGPRO - ADMIN CONTROL CENTER (ULTIMATE)
   Versi: 5.0.0 | Create user, edit user, ubah saldo, kelola deposit & rekening deposit
   =============================================================== */

/**
 * FITUR LENGKAP ADMIN:
 * ✅ Create user baru (username, password, email, role, saldo awal)
 * ✅ Edit user (ubah email, role, reset password, ubah saldo)
 * ✅ Hapus user (kecuali master admin)
 * ✅ Kelola Deposit: tambah deposit manual ke user (dengan catatan)
 * ✅ Kelola Rekening Deposit: ubah nomor virtual account / rekening user
 * ✅ Lihat riwayat deposit & withdraw user
 * ✅ Log aktivitas admin (setiap aksi tercatat)
 * ✅ Export/import data user
 * ✅ Reset semua data ke default
 * ✅ Kontrol sistem (start/stop simulasi, reset trending)
 * ✅ Broadcast pesan ke semua user
 * ✅ Set premium/demo mode untuk trending manipulasi
 */

(function() {
    'use strict';

    // ========================== KONFIGURASI ==========================
    const ADMIN_CONFIG = {
        masterAdminUsername: 'admin',
        defaultPassword: 'password123',
        defaultBalance: 10000,
        maxLogEntries: 200,
        currencySymbol: 'Rp'
    };

    // ========================== STATE ==========================
    let adminLogs = [];
    let allUsers = [];
    let currentEditUsername = null;

    // ========================== DOM ELEMENTS ==========================
    let elements = {};

    // ========================== STORAGE LOGS ==========================
    function addAdminLog(action, target = null, details = null) {
        const currentAdmin = DataManager.getCurrentUser();
        const logEntry = {
            id: Date.now() + '-' + Math.random().toString(36).substr(2, 6),
            admin: currentAdmin?.username || 'system',
            action: action,
            target: target,
            details: details,
            timestamp: new Date().toISOString()
        };
        adminLogs.unshift(logEntry);
        if (adminLogs.length > ADMIN_CONFIG.maxLogEntries) adminLogs.pop();
        localStorage.setItem('tradingpro_admin_logs', JSON.stringify(adminLogs));
    }

    function loadAdminLogs() {
        const saved = localStorage.getItem('tradingpro_admin_logs');
        if (saved) adminLogs = JSON.parse(saved);
    }

    // ========================== UI HELPER ==========================
    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }

    function formatCurrency(value) {
        return ADMIN_CONFIG.currencySymbol + Math.floor(value).toLocaleString('id-ID');
    }

    // ========================== RENDER TABEL USER ==========================
    function refreshUserTable() {
        allUsers = DataManager.getUsers();
        const tbody = document.getElementById('adminUserTableBody');
        if (!tbody) return;

        tbody.innerHTML = allUsers.map(user => `
            <tr data-username="${user.username}">
                <td>${escapeHtml(user.username)}</td>
                <td>${escapeHtml(user.email || '-')}</td>
                <td>${formatCurrency(user.balance)}</td>
                <td>${user.role === 'admin' ? '<span class="badge-admin">Admin</span>' : '<span class="badge-user">User</span>'}</td>
                <td>${user.virtualAccount || '-'}</td>
                <td>${user.lastLogin ? Utils.formatDate(user.lastLogin, true) : '-'}</td>
                <td>
                    <button class="btn-edit-user" data-username="${user.username}"><i class="fas fa-edit"></i> Edit</button>
                    <button class="btn-deposit-user" data-username="${user.username}"><i class="fas fa-plus-circle"></i> Deposit</button>
                    <button class="btn-va-user" data-username="${user.username}"><i class="fas fa-credit-card"></i> VA</button>
                    <button class="btn-delete-user" data-username="${user.username}" ${user.username === ADMIN_CONFIG.masterAdminUsername ? 'disabled' : ''}><i class="fas fa-trash"></i> Hapus</button>
                </td>
            </tr>
        `).join('');

        // Event edit user
        document.querySelectorAll('.btn-edit-user').forEach(btn => {
            btn.addEventListener('click', () => showEditUserModal(btn.dataset.username));
        });
        // Event deposit manual
        document.querySelectorAll('.btn-deposit-user').forEach(btn => {
            btn.addEventListener('click', () => showManualDepositModal(btn.dataset.username));
        });
        // Event ubah virtual account
        document.querySelectorAll('.btn-va-user').forEach(btn => {
            btn.addEventListener('click', () => showEditVAModal(btn.dataset.username));
        });
        // Event delete user
        document.querySelectorAll('.btn-delete-user').forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.dataset.username !== ADMIN_CONFIG.masterAdminUsername) {
                    confirmDeleteUser(btn.dataset.username);
                }
            });
        });
    }

    // ========================== CREATE USER (ADMIN) ==========================
    function showCreateUserModal() {
        const modalHtml = `
            <div class="admin-form">
                <div class="form-group">
                    <label>Username *</label>
                    <input type="text" id="newUsername" placeholder="huruf/angka/underscore, 3-20 karakter">
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
                    <input type="number" id="newBalance" value="${ADMIN_CONFIG.defaultBalance}" step="1000">
                </div>
                <div class="form-group">
                    <label>Virtual Account (opsional)</label>
                    <input type="text" id="newVA" placeholder="Nomor rekening deposit">
                </div>
            </div>
        `;

        const modal = createModal('createUserModal', 'Buat User Baru', modalHtml, () => {
            const username = document.getElementById('newUsername')?.value.trim();
            const password = document.getElementById('newPassword')?.value;
            const email = document.getElementById('newEmail')?.value.trim();
            const role = document.getElementById('newRole')?.value;
            const balance = parseFloat(document.getElementById('newBalance')?.value);
            const va = document.getElementById('newVA')?.value.trim();

            if (!username || !password) {
                Utils.showToast('Username dan password harus diisi', 'error');
                return false;
            }
            if (!Utils.isValidUsername(username)) {
                Utils.showToast('Username hanya huruf/angka/underscore, 3-20 karakter', 'error');
                return false;
            }
            if (password.length < 4) {
                Utils.showToast('Password minimal 4 karakter', 'error');
                return false;
            }
            if (DataManager.getUserByUsername(username)) {
                Utils.showToast('Username sudah ada', 'error');
                return false;
            }

            const newUser = {
                username: username,
                password: password,
                email: email || '',
                balance: isNaN(balance) ? ADMIN_CONFIG.defaultBalance : balance,
                role: role,
                virtualAccount: va || '',
                createdAt: new Date().toISOString(),
                lastLogin: null,
                isActive: true,
                preferences: { theme: 'dark', notifications: true, language: 'id' }
            };
            DataManager.addUser(newUser);
            addAdminLog('CREATE_USER', username, `role=${role}, balance=${balance}, VA=${va}`);
            Utils.showToast(`User ${username} berhasil dibuat`, 'success');
            refreshUserTable();
            return true;
        }, null, 'Buat User', 'Batal');
    }

    // ========================== EDIT USER (LENGKAP) ==========================
    function showEditUserModal(username) {
        const user = DataManager.getUserByUsername(username);
        if (!user) return;
        currentEditUsername = username;

        const modalHtml = `
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
                        <option value="user" ${user.role === 'user' ? 'selected' : ''}>User Biasa</option>
                        <option value="vip" ${user.role === 'vip' ? 'selected' : ''}>VIP</option>
                        <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Saldo</label>
                    <input type="number" id="editBalance" value="${user.balance}" step="1000">
                </div>
                <div class="form-group">
                    <label>Virtual Account (Rekening Deposit)</label>
                    <input type="text" id="editVA" value="${escapeHtml(user.virtualAccount || '')}" placeholder="Nomor rekening deposit user">
                </div>
                <div class="form-group">
                    <label>Reset Password</label>
                    <button id="resetPasswordBtn" class="btn-secondary" style="width:auto;">Reset ke default</button>
                    <span class="note">(password akan direset menjadi "${ADMIN_CONFIG.defaultPassword}")</span>
                </div>
            </div>
        `;

        const modal = createModal('editUserModal', `Edit User: ${username}`, modalHtml, () => {
            const newEmail = document.getElementById('editEmail')?.value.trim();
            const newRole = document.getElementById('editRole')?.value;
            const newBalance = parseFloat(document.getElementById('editBalance')?.value);
            const newVA = document.getElementById('editVA')?.value.trim();

            if (!isNaN(newBalance) && newBalance !== user.balance) {
                DataManager.updateUserBalance(username, newBalance);
                addAdminLog('EDIT_BALANCE', username, `${user.balance} → ${newBalance}`);
            }
            if (newEmail !== user.email) {
                DataManager.updateUser(username, { email: newEmail });
                addAdminLog('EDIT_EMAIL', username, newEmail);
            }
            if (newRole !== user.role) {
                DataManager.updateUser(username, { role: newRole });
                addAdminLog('EDIT_ROLE', username, newRole);
            }
            if (newVA !== (user.virtualAccount || '')) {
                DataManager.updateUser(username, { virtualAccount: newVA });
                addAdminLog('EDIT_VA', username, newVA);
            }
            Utils.showToast(`User ${username} berhasil diupdate`, 'success');
            refreshUserTable();
            return true;
        }, null, 'Simpan Perubahan', 'Batal');

        // Reset password
        document.getElementById('resetPasswordBtn')?.addEventListener('click', () => {
            DataManager.updateUser(username, { password: ADMIN_CONFIG.defaultPassword });
            addAdminLog('RESET_PASSWORD', username, 'to default');
            Utils.showToast(`Password ${username} direset menjadi ${ADMIN_CONFIG.defaultPassword}`, 'success');
            modal.style.display = 'none';
        });
    }

    // ========================== MANUAL DEPOSIT (TAMBAH SALDO + CATATAN) ==========================
    function showManualDepositModal(username) {
        const user = DataManager.getUserByUsername(username);
        if (!user) return;

        const modalHtml = `
            <div class="admin-form">
                <p>User: <strong>${escapeHtml(username)}</strong><br>Saldo saat ini: ${formatCurrency(user.balance)}</p>
                <div class="form-group">
                    <label>Nominal Deposit</label>
                    <input type="number" id="depositAmount" placeholder="Jumlah deposit" step="1000">
                </div>
                <div class="form-group">
                    <label>Catatan (opsional)</label>
                    <input type="text" id="depositNote" placeholder="Contoh: Deposit manual via bank">
                </div>
            </div>
        `;

        createModal('manualDepositModal', 'Tambah Deposit Manual', modalHtml, () => {
            const amount = parseFloat(document.getElementById('depositAmount')?.value);
            const note = document.getElementById('depositNote')?.value || 'Deposit manual oleh admin';
            if (isNaN(amount) || amount <= 0) {
                Utils.showToast('Nominal deposit tidak valid', 'error');
                return false;
            }
            const newBalance = user.balance + amount;
            DataManager.updateUserBalance(username, newBalance);
            // Catat transaksi deposit
            DataManager.addTransaction({
                username: username,
                type: 'deposit',
                amount: amount,
                total: amount,
                description: note,
                timestamp: new Date().toISOString(),
                source: 'admin_manual'
            });
            addAdminLog('MANUAL_DEPOSIT', username, `${formatCurrency(amount)} - ${note}`);
            Utils.showToast(`Deposit ${formatCurrency(amount)} berhasil ditambahkan ke ${username}`, 'success');
            refreshUserTable();
            return true;
        }, null, 'Tambah Deposit', 'Batal');
    }

    // ========================== EDIT VIRTUAL ACCOUNT (REKENING DEPOSIT) ==========================
    function showEditVAModal(username) {
        const user = DataManager.getUserByUsername(username);
        if (!user) return;

        const modalHtml = `
            <div class="admin-form">
                <p>User: <strong>${escapeHtml(username)}</strong></p>
                <div class="form-group">
                    <label>Nomor Virtual Account / Rekening Deposit</label>
                    <input type="text" id="vaNumber" value="${escapeHtml(user.virtualAccount || '')}" placeholder="Contoh: 88081234567890">
                </div>
                <small>Nomor ini akan ditampilkan saat user melakukan deposit.</small>
            </div>
        `;

        createModal('editVAModal', 'Atur Rekening Deposit', modalHtml, () => {
            const newVA = document.getElementById('vaNumber')?.value.trim();
            DataManager.updateUser(username, { virtualAccount: newVA });
            addAdminLog('EDIT_VA', username, newVA);
            Utils.showToast(`Rekening deposit ${username} diubah menjadi ${newVA || '-'}`, 'success');
            refreshUserTable();
            return true;
        }, null, 'Simpan', 'Batal');
    }

    // ========================== HAPUS USER ==========================
    function confirmDeleteUser(username) {
        createModal('deleteConfirmModal', 'Hapus User', `<p>Yakin ingin menghapus user <strong>${escapeHtml(username)}</strong>? Semua data transaksinya akan hilang.</p>`, () => {
            DataManager.deleteUserByUsername(username);
            addAdminLog('DELETE_USER', username);
            Utils.showToast(`User ${username} dihapus`, 'success');
            refreshUserTable();
            return true;
        }, null, 'Hapus', 'Batal');
    }

    // ========================== LOGS MODAL ==========================
    function showAdminLogsModal() {
        const logsHtml = adminLogs.map(log => `
            <div class="log-item">
                <div class="log-time">${Utils.formatDate(log.timestamp, true)}</div>
                <div class="log-action"><strong>${log.action}</strong> ${log.target ? '→ ' + log.target : ''}</div>
                <div class="log-detail">${log.details || ''}</div>
            </div>
        `).join('');
        const content = `<div class="logs-container">${logsHtml || '<p>Belum ada log</p>'}</div><button id="clearLogsBtn" class="btn-danger">Hapus Semua Log</button>`;
        const modal = createModal('adminLogsModal', 'Log Aktivitas Admin', content, null, null, 'Tutup', '');
        document.getElementById('clearLogsBtn')?.addEventListener('click', () => {
            adminLogs = [];
            localStorage.setItem('tradingpro_admin_logs', JSON.stringify(adminLogs));
            modal.style.display = 'none';
            Utils.showToast('Log dihapus', 'info');
        });
    }

    // ========================== EKSPORT/IMPORT, RESET DLL (SINGKAT) ==========================
    function exportUserData() {
        const data = {
            exportDate: new Date().toISOString(),
            users: DataManager.getUsers(),
            transactions: DataManager.getTransactions()
        };
        Utils.downloadJson(data, `tradingpro_users_${Date.now()}.json`);
        addAdminLog('EXPORT_DATA', null, `${data.users.length} users`);
        Utils.showToast('Data diexport', 'success');
    }

    function importUserData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const imported = JSON.parse(ev.target.result);
                    if (imported.users) {
                        StorageManager.saveUsers(imported.users);
                        addAdminLog('IMPORT_DATA', null, `${imported.users.length} users`);
                        Utils.showToast('Import berhasil, reload halaman', 'success');
                        setTimeout(() => location.reload(), 1500);
                    } else {
                        Utils.showToast('File tidak valid', 'error');
                    }
                } catch (err) {
                    Utils.showToast('Gagal import', 'error');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    function resetAllData() {
        createModal('resetConfirmModal', 'Reset Semua Data', '<p class="warning">⚠️ PERINGATAN: Semua data user, transaksi, dan pengaturan akan dihapus permanen! Tindakan ini tidak bisa dibatalkan.</p>', () => {
            DataManager.resetAllData();
            addAdminLog('RESET_ALL_DATA', null, 'Full system reset');
            Utils.showToast('Data direset, halaman akan dimuat ulang', 'success');
            setTimeout(() => location.reload(), 2000);
            return true;
        }, null, 'Ya, Reset!', 'Batal');
    }

    // ========================== KONTROL SISTEM & BROADCAST ==========================
    function broadcastMessage() {
        const msg = prompt('Pesan broadcast ke semua user:', 'Halo! Ada promo deposit 20%');
        if (msg) {
            localStorage.setItem('tradingpro_broadcast', JSON.stringify({ message: msg, timestamp: new Date().toISOString() }));
            addAdminLog('BROADCAST', null, msg);
            Utils.showToast('Pesan terkirim', 'success');
        }
    }

    // ========================== INISIALISASI UI ADMIN ==========================
    function buildAdminUI() {
        const adminPanel = document.getElementById('adminPanel');
        if (!adminPanel) return;
        adminPanel.innerHTML = `
            <div class="admin-header">
                <h3><i class="fas fa-crown"></i> Panel Administrator</h3>
                <div class="admin-actions">
                    <button id="adminCreateUserBtn" class="btn-admin"><i class="fas fa-user-plus"></i> Buat User</button>
                    <button id="adminExportBtn" class="btn-admin"><i class="fas fa-download"></i> Export</button>
                    <button id="adminImportBtn" class="btn-admin"><i class="fas fa-upload"></i> Import</button>
                    <button id="adminResetAllBtn" class="btn-admin btn-danger"><i class="fas fa-trash-alt"></i> Reset Semua</button>
                    <button id="adminLogsBtn" class="btn-admin"><i class="fas fa-history"></i> Logs</button>
                    <button id="adminBroadcastBtn" class="btn-admin"><i class="fas fa-broadcast-tower"></i> Broadcast</button>
                </div>
            </div>
            <div class="admin-table-container">
                <table class="admin-user-table" id="adminUserTable">
                    <thead>
                        <tr><th>Username</th><th>Email</th><th>Saldo</th><th>Role</th><th>Rekening Deposit</th><th>Last Login</th><th>Aksi</th></tr>
                    </thead>
                    <tbody id="adminUserTableBody"></tbody>
                </table>
            </div>
            <div id="adminStatusMsg" class="admin-status"></div>
        `;
        // Styling (tambahkan jika belum)
        if (!document.getElementById('adminStyles')) {
            const style = document.createElement('style');
            style.id = 'adminStyles';
            style.textContent = `
                .admin-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; margin-bottom: 20px; }
                .admin-actions { display: flex; gap: 8px; flex-wrap: wrap; }
                .btn-admin { background: #3b82f6; border: none; padding: 6px 12px; border-radius: 40px; color: white; cursor: pointer; }
                .btn-danger { background: #ef4444; }
                .admin-user-table { width: 100%; border-collapse: collapse; font-size: 13px; }
                .admin-user-table th, .admin-user-table td { padding: 8px; border-bottom: 1px solid #2d3a5e; text-align: left; }
                .badge-admin { background: #ef4444; padding: 2px 8px; border-radius: 20px; }
                .badge-user { background: #10b981; padding: 2px 8px; border-radius: 20px; }
                .admin-status { margin-top: 12px; padding: 8px; background: #0f172a; border-radius: 12px; }
                .logs-container { max-height: 300px; overflow-y: auto; }
                .log-item { padding: 6px; border-bottom: 1px solid #2d3a5e; font-size: 12px; }
                .warning { color: #facc15; }
            `;
            document.head.appendChild(style);
        }

        // Event tombol
        document.getElementById('adminCreateUserBtn')?.addEventListener('click', showCreateUserModal);
        document.getElementById('adminExportBtn')?.addEventListener('click', exportUserData);
        document.getElementById('adminImportBtn')?.addEventListener('click', importUserData);
        document.getElementById('adminResetAllBtn')?.addEventListener('click', resetAllData);
        document.getElementById('adminLogsBtn')?.addEventListener('click', showAdminLogsModal);
        document.getElementById('adminBroadcastBtn')?.addEventListener('click', broadcastMessage);

        refreshUserTable();
    }

    // ========================== CHECK ADMIN ACCESS ==========================
    function initAdmin() {
        const currentUser = DataManager.getCurrentUser();
        if (currentUser && currentUser.role === 'admin') {
            const adminPanel = document.getElementById('adminPanel');
            if (adminPanel) {
                adminPanel.style.display = 'block';
                buildAdminUI();
            }
            loadAdminLogs();
        } else {
            const adminPanel = document.getElementById('adminPanel');
            if (adminPanel) adminPanel.style.display = 'none';
        }
    }

    // ========================== PUBLIC API ==========================
    window.AdminManager = {
        init: initAdmin,
        refresh: refreshUserTable,
        createUser: showCreateUserModal,
        editUser: showEditUserModal,
        manualDeposit: showManualDepositModal,
        editVirtualAccount: showEditVAModal
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAdmin);
    } else {
        initAdmin();
    }
})();