/* ===============================================================
   TRADINGPRO - DASHBOARD MANAGER
   Versi: 2.0.0 | Load dashboard, update UI, koordinasi modul, live chat user-admin
   =============================================================== */

/**
 * Modul ini bertanggung jawab untuk:
 * - Menampilkan dashboard setelah login
 * - Mengupdate elemen UI (username, balance)
 * - Mengkoordinasikan inisialisasi modul lain (market, chart, trading, funds, history, trending, admin)
 * - Fitur LIVE CHAT: user kirim pesan ke admin, admin bisa membalas (real-time via localStorage)
 */

(function() {
    'use strict';

    // ========================== DOM ELEMENTS ==========================
    let elements = {};

    function cacheDashboardElements() {
        elements = {
            // Top bar
            userNameDisplay: document.getElementById('userNameDisplay'),
            userBalance: document.getElementById('userBalance'),
            logoutButton: document.getElementById('logoutButton'),
            
            // Admin panel (akan ditampilkan jika role admin)
            adminPanel: document.getElementById('adminPanel'),
            
            // Chat widget (akan kita buat dinamis)
            chatContainer: null
        };
    }

    // ========================== LIVE CHAT SYSTEM ==========================
    // Storage key untuk chat messages
    const CHAT_STORAGE_KEY = 'tradingpro_chat_messages';
    
    // Inisialisasi chat messages jika belum ada
    function initChatStorage() {
        let messages = localStorage.getItem(CHAT_STORAGE_KEY);
        if (!messages) {
            localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify([]));
        }
    }
    
    // Ambil semua pesan chat
    function getChatMessages() {
        return JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY) || '[]');
    }
    
    // Simpan pesan chat
    function saveChatMessages(messages) {
        localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
        // Trigger event untuk update UI real-time
        window.dispatchEvent(new CustomEvent('chat-updated'));
    }
    
    // Kirim pesan dari user ke admin
    function sendUserMessage(username, message) {
        if (!message || message.trim() === '') return false;
        const messages = getChatMessages();
        const newMsg = {
            id: Date.now() + '-' + Math.random().toString(36).substr(2, 6),
            from: username,
            fromRole: 'user',
            message: message.trim(),
            timestamp: new Date().toISOString(),
            status: 'unread',       // unread, read, replied
            adminReply: null,
            repliedAt: null
        };
        messages.push(newMsg);
        saveChatMessages(messages);
        
        // Tampilkan notifikasi ke user (pesan terkirim)
        if (window.showToast) {
            window.showToast('Pesan terkirim ke admin', 'success');
        }
        return true;
    }
    
    // Kirim balasan dari admin ke user
    function sendAdminReply(userTarget, replyMessage, originalMsgId) {
        if (!replyMessage || replyMessage.trim() === '') return false;
        const messages = getChatMessages();
        const msgIndex = messages.findIndex(m => m.id === originalMsgId);
        if (msgIndex === -1) return false;
        
        messages[msgIndex].adminReply = replyMessage.trim();
        messages[msgIndex].repliedAt = new Date().toISOString();
        messages[msgIndex].status = 'replied';
        saveChatMessages(messages);
        
        if (window.showToast) {
            window.showToast(`Balasan ke ${userTarget} terkirim`, 'success');
        }
        return true;
    }
    
    // Ambil pesan untuk user tertentu (semua pesan yang dari user itu atau balasan admin untuk user itu)
    function getUserChatHistory(username) {
        const messages = getChatMessages();
        // Pesan yang dikirim oleh user tersebut, dan balasan admin yang terkait (adminReply tidak null)
        // Untuk user, tampilkan pesan mereka dan balasan admin yang ditujukan ke pesan mereka
        const userMessages = messages.filter(m => m.from === username);
        // Juga tampilkan balasan admin yang sudah ada (sudah termasuk dalam userMessages karena adminReply field)
        return userMessages.sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp));
    }
    
    // Ambil semua pesan untuk admin (belum dibaca atau yang perlu direspon)
    function getAdminInbox() {
        const messages = getChatMessages();
        // Urutkan dari terbaru
        return messages.filter(m => m.fromRole === 'user').sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
    }
    
    // Tandai pesan sebagai dibaca oleh admin
    function markMessageAsRead(msgId) {
        const messages = getChatMessages();
        const msg = messages.find(m => m.id === msgId);
        if (msg && msg.status === 'unread') {
            msg.status = 'read';
            saveChatMessages(messages);
        }
    }
    
    // Hapus pesan (admin only)
    function deleteChatMessage(msgId) {
        let messages = getChatMessages();
        messages = messages.filter(m => m.id !== msgId);
        saveChatMessages(messages);
    }
    
    // ========================== UI CHAT WIDGET (UNTUK USER) ==========================
    // Membuat widget chat di dashboard user (sebelah kanan bawah)
    function createUserChatWidget() {
        // Cek apakah sudah ada
        if (document.getElementById('userChatWidget')) return;
        
        const currentUser = DataManager.getCurrentUser();
        if (!currentUser || currentUser.role === 'admin') return; // Admin punya panel sendiri
        
        const widget = document.createElement('div');
        widget.id = 'userChatWidget';
        widget.className = 'user-chat-widget';
        widget.innerHTML = `
            <div class="chat-toggle">
                <i class="fas fa-headset"></i> <span>Bantuan</span>
                <span class="chat-unread-badge" id="chatUnreadBadge" style="display:none;">0</span>
            </div>
            <div class="chat-panel" style="display:none;">
                <div class="chat-header">
                    <span><i class="fas fa-headset"></i> Live Chat dengan Admin</span>
                    <button class="chat-close"><i class="fas fa-times"></i></button>
                </div>
                <div class="chat-messages" id="chatMessagesList">
                    <div class="chat-empty">Belum ada percakapan. Kirim pesan ke admin.</div>
                </div>
                <div class="chat-input-area">
                    <textarea id="chatMessageInput" placeholder="Tulis pesan keluhan atau pertanyaan..." rows="2"></textarea>
                    <button id="chatSendBtn" class="btn-send"><i class="fas fa-paper-plane"></i> Kirim</button>
                </div>
                <div class="chat-info">Admin akan membalas sesegera mungkin.</div>
            </div>
        `;
        document.body.appendChild(widget);
        
        // Styling widget (tambahkan ke components.css nanti, tapi kita inline dulu)
        const style = document.createElement('style');
        style.textContent = `
            .user-chat-widget {
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 1000;
                font-family: 'Inter', sans-serif;
            }
            .chat-toggle {
                background: linear-gradient(135deg, #3b82f6, #2563eb);
                color: white;
                padding: 12px 20px;
                border-radius: 40px;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                transition: transform 0.2s;
            }
            .chat-toggle:hover {
                transform: scale(1.02);
            }
            .chat-unread-badge {
                background: #ef4444;
                color: white;
                border-radius: 50%;
                padding: 2px 6px;
                font-size: 10px;
                margin-left: 5px;
            }
            .chat-panel {
                position: absolute;
                bottom: 60px;
                right: 0;
                width: 320px;
                background: #111827;
                border-radius: 20px;
                box-shadow: 0 10px 25px rgba(0,0,0,0.5);
                border: 1px solid #2d3a5e;
                overflow: hidden;
                display: flex;
                flex-direction: column;
                max-height: 450px;
            }
            .chat-header {
                background: #1f2937;
                padding: 12px 16px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1px solid #2d3a5e;
                font-weight: bold;
                color: #facc15;
            }
            .chat-close {
                background: none;
                border: none;
                color: #9ca3af;
                cursor: pointer;
                font-size: 16px;
            }
            .chat-messages {
                flex: 1;
                padding: 12px;
                overflow-y: auto;
                max-height: 300px;
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            .chat-message {
                background: #1f2937;
                border-radius: 16px;
                padding: 8px 12px;
                max-width: 85%;
                font-size: 13px;
            }
            .chat-message.user {
                background: #3b82f6;
                color: white;
                align-self: flex-end;
            }
            .chat-message.admin-reply {
                background: #374151;
                border-left: 3px solid #facc15;
                align-self: flex-start;
            }
            .chat-message .sender {
                font-size: 10px;
                opacity: 0.7;
                margin-bottom: 4px;
            }
            .chat-message .time {
                font-size: 9px;
                text-align: right;
                margin-top: 4px;
                opacity: 0.6;
            }
            .chat-empty {
                text-align: center;
                color: #6b7280;
                padding: 20px;
                font-size: 12px;
            }
            .chat-input-area {
                padding: 12px;
                border-top: 1px solid #2d3a5e;
                display: flex;
                gap: 8px;
                align-items: flex-end;
            }
            .chat-input-area textarea {
                flex: 1;
                background: #0f172a;
                border: 1px solid #334155;
                border-radius: 20px;
                padding: 8px 12px;
                color: white;
                resize: none;
                font-size: 12px;
            }
            .btn-send {
                background: #3b82f6;
                border: none;
                border-radius: 40px;
                padding: 8px 12px;
                color: white;
                cursor: pointer;
            }
            .chat-info {
                font-size: 10px;
                color: #6b7280;
                text-align: center;
                padding: 8px;
                border-top: 1px solid #2d3a5e;
            }
        `;
        document.head.appendChild(style);
        
        // Event listeners untuk widget
        const toggle = widget.querySelector('.chat-toggle');
        const panel = widget.querySelector('.chat-panel');
        const closeBtn = widget.querySelector('.chat-close');
        const sendBtn = widget.querySelector('#chatSendBtn');
        const input = widget.querySelector('#chatMessageInput');
        
        toggle.addEventListener('click', () => {
            const isVisible = panel.style.display === 'flex';
            panel.style.display = isVisible ? 'none' : 'flex';
            if (!isVisible) {
                // Refresh chat history saat dibuka
                refreshUserChatHistory();
                // Reset badge unread
                const badge = widget.querySelector('#chatUnreadBadge');
                if (badge) badge.style.display = 'none';
            }
        });
        
        closeBtn.addEventListener('click', () => {
            panel.style.display = 'none';
        });
        
        sendBtn.addEventListener('click', () => {
            const msg = input.value.trim();
            if (msg) {
                sendUserMessage(currentUser.username, msg);
                input.value = '';
                refreshUserChatHistory();
            }
        });
        
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendBtn.click();
            }
        });
        
        // Update unread badge (jumlah pesan yang belum dibalas atau status unread dari admin)
        function updateUnreadBadge() {
            const messages = getChatMessages();
            const userMessages = messages.filter(m => m.from === currentUser.username && m.status !== 'replied' && m.adminReply === null);
            const unreadCount = userMessages.length;
            const badge = widget.querySelector('#chatUnreadBadge');
            if (badge) {
                if (unreadCount > 0) {
                    badge.textContent = unreadCount;
                    badge.style.display = 'inline-block';
                } else {
                    badge.style.display = 'none';
                }
            }
        }
        
        function refreshUserChatHistory() {
            const history = getUserChatHistory(currentUser.username);
            const container = widget.querySelector('.chat-messages');
            if (!container) return;
            if (history.length === 0) {
                container.innerHTML = '<div class="chat-empty">Belum ada percakapan. Kirim pesan ke admin.</div>';
            } else {
                container.innerHTML = history.map(msg => {
                    if (msg.adminReply) {
                        // Tampilkan pesan user dan balasan admin
                        return `
                            <div class="chat-message user">
                                <div class="sender">Anda (${msg.from})</div>
                                <div>${escapeHtml(msg.message)}</div>
                                <div class="time">${formatTime(msg.timestamp)}</div>
                            </div>
                            <div class="chat-message admin-reply">
                                <div class="sender">Admin</div>
                                <div>${escapeHtml(msg.adminReply)}</div>
                                <div class="time">${formatTime(msg.repliedAt)}</div>
                            </div>
                        `;
                    } else {
                        return `
                            <div class="chat-message user">
                                <div class="sender">Anda (${msg.from})</div>
                                <div>${escapeHtml(msg.message)}</div>
                                <div class="time">${formatTime(msg.timestamp)}</div>
                            </div>
                        `;
                    }
                }).join('');
            }
            updateUnreadBadge();
            // Scroll ke bawah
            container.scrollTop = container.scrollHeight;
        }
        
        window.addEventListener('chat-updated', () => {
            if (panel.style.display === 'flex') {
                refreshUserChatHistory();
            } else {
                updateUnreadBadge();
            }
        });
        
        // Initial load
        refreshUserChatHistory();
    }
    
    // ========================== ADMIN CHAT PANEL (di dalam admin panel) ==========================
    function renderAdminChatPanel() {
        const adminPanelDiv = elements.adminPanel;
        if (!adminPanelDiv) return;
        
        // Cek apakah sudah ada section chat
        let chatSection = document.getElementById('adminChatSection');
        if (chatSection) chatSection.remove();
        
        chatSection = document.createElement('div');
        chatSection.id = 'adminChatSection';
        chatSection.className = 'admin-chat-section';
        chatSection.innerHTML = `
            <div class="card-title" style="margin-top: 20px;">
                <i class="fas fa-comments"></i> Live Chat dengan Pengguna
            </div>
            <div class="admin-chat-container">
                <div class="chat-user-list" id="adminChatUserList">
                    <div class="loading">Memuat percakapan...</div>
                </div>
                <div class="chat-reply-panel" id="adminChatReplyPanel" style="display:none;">
                    <div class="reply-header">
                        <strong>Percakapan dengan: <span id="replyTargetUser"></span></strong>
                        <button id="closeReplyPanel" class="btn-sm">Tutup</button>
                    </div>
                    <div class="reply-conversation" id="replyConversation"></div>
                    <textarea id="adminReplyMessage" placeholder="Tulis balasan..." rows="2"></textarea>
                    <button id="sendReplyBtn" class="btn-admin">Kirim Balasan</button>
                </div>
            </div>
        `;
        adminPanelDiv.appendChild(chatSection);
        
        // Styling tambahan
        const style = document.createElement('style');
        style.textContent = `
            .admin-chat-section {
                margin-top: 20px;
                background: #0f172a;
                border-radius: 20px;
                padding: 16px;
            }
            .admin-chat-container {
                display: flex;
                gap: 20px;
                flex-wrap: wrap;
            }
            .chat-user-list {
                flex: 1;
                min-width: 200px;
                background: #111827;
                border-radius: 16px;
                padding: 8px;
                max-height: 300px;
                overflow-y: auto;
            }
            .chat-user-item {
                padding: 10px;
                border-bottom: 1px solid #2d3a5e;
                cursor: pointer;
                transition: background 0.2s;
                display: flex;
                justify-content: space-between;
            }
            .chat-user-item:hover {
                background: #1f2937;
            }
            .chat-user-item.unread {
                background: #3b82f620;
                border-left: 3px solid #facc15;
            }
            .chat-reply-panel {
                flex: 2;
                background: #111827;
                border-radius: 16px;
                padding: 16px;
            }
            .reply-header {
                display: flex;
                justify-content: space-between;
                margin-bottom: 12px;
            }
            .reply-conversation {
                max-height: 200px;
                overflow-y: auto;
                background: #0f172a;
                border-radius: 12px;
                padding: 8px;
                margin-bottom: 12px;
            }
            .reply-conversation .msg-item {
                padding: 6px;
                border-bottom: 1px solid #2d3a5e;
                font-size: 12px;
            }
            .reply-conversation .msg-user {
                color: #3b82f6;
            }
            .reply-conversation .msg-admin {
                color: #facc15;
            }
            #adminReplyMessage {
                width: 100%;
                background: #0f172a;
                border: 1px solid #334155;
                border-radius: 12px;
                padding: 8px;
                color: white;
                margin-bottom: 8px;
            }
            #sendReplyBtn {
                width: 100%;
            }
            #closeReplyPanel {
                background: #ef4444;
                color: white;
                border: none;
                border-radius: 20px;
                padding: 4px 12px;
                cursor: pointer;
            }
        `;
        document.head.appendChild(style);
        
        // Load daftar user yang mengirim pesan
        function loadUserList() {
            const messages = getAdminInbox();
            const usersMap = new Map();
            messages.forEach(msg => {
                if (!usersMap.has(msg.from)) {
                    usersMap.set(msg.from, {
                        username: msg.from,
                        lastMessage: msg.message,
                        lastTimestamp: msg.timestamp,
                        unreadCount: messages.filter(m => m.from === msg.from && m.status === 'unread').length
                    });
                }
            });
            const userList = Array.from(usersMap.values()).sort((a,b) => new Date(b.lastTimestamp) - new Date(a.lastTimestamp));
            const container = document.getElementById('adminChatUserList');
            if (!container) return;
            if (userList.length === 0) {
                container.innerHTML = '<div class="empty">Belum ada pesan dari user</div>';
                return;
            }
            container.innerHTML = userList.map(user => `
                <div class="chat-user-item ${user.unreadCount > 0 ? 'unread' : ''}" data-username="${user.username}">
                    <span><i class="fas fa-user"></i> ${user.username}</span>
                    <span class="badge">${user.unreadCount > 0 ? user.unreadCount : ''}</span>
                </div>
            `).join('');
            
            // Event klik user
            document.querySelectorAll('.chat-user-item').forEach(el => {
                el.addEventListener('click', () => {
                    const username = el.dataset.username;
                    openReplyPanel(username);
                });
            });
        }
        
        function openReplyPanel(username) {
            const replyPanel = document.getElementById('adminChatReplyPanel');
            const targetUserSpan = document.getElementById('replyTargetUser');
            const conversationDiv = document.getElementById('replyConversation');
            if (!replyPanel || !targetUserSpan || !conversationDiv) return;
            
            targetUserSpan.textContent = username;
            replyPanel.style.display = 'block';
            
            // Tampilkan riwayat percakapan
            const allMessages = getChatMessages();
            const userMessages = allMessages.filter(m => m.from === username).sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp));
            conversationDiv.innerHTML = userMessages.map(msg => {
                let adminReplyHtml = '';
                if (msg.adminReply) {
                    adminReplyHtml = `<div class="msg-item"><span class="msg-admin">Admin:</span> ${escapeHtml(msg.adminReply)} <span class="time">${formatTime(msg.repliedAt)}</span></div>`;
                }
                return `<div class="msg-item"><span class="msg-user">${msg.from}:</span> ${escapeHtml(msg.message)} <span class="time">${formatTime(msg.timestamp)}</span></div>${adminReplyHtml}`;
            }).join('');
            if (userMessages.length === 0) {
                conversationDiv.innerHTML = '<div>Tidak ada pesan</div>';
            }
            
            // Tandai semua pesan dari user ini sebagai read
            userMessages.forEach(msg => {
                if (msg.status === 'unread') markMessageAsRead(msg.id);
            });
            loadUserList(); // refresh daftar
            
            // Event send reply
            const sendBtn = document.getElementById('sendReplyBtn');
            const replyInput = document.getElementById('adminReplyMessage');
            const newSendBtn = sendBtn.cloneNode(true);
            sendBtn.parentNode.replaceChild(newSendBtn, sendBtn);
            newSendBtn.addEventListener('click', () => {
                const reply = replyInput.value.trim();
                if (reply) {
                    // Cari pesan terakhir yang belum dibalas dari user ini
                    const lastUnreplied = userMessages.filter(m => !m.adminReply).pop();
                    if (lastUnreplied) {
                        sendAdminReply(username, reply, lastUnreplied.id);
                        replyInput.value = '';
                        openReplyPanel(username); // refresh
                    } else {
                        alert('Tidak ada pesan yang perlu dibalas atau sudah dibalas semua.');
                    }
                }
            });
        }
        
        // Event close panel
        document.getElementById('closeReplyPanel')?.addEventListener('click', () => {
            const replyPanel = document.getElementById('adminChatReplyPanel');
            if (replyPanel) replyPanel.style.display = 'none';
        });
        
        // Load awal
        loadUserList();
        
        // Update berkala setiap 5 detik
        setInterval(() => {
            if (document.getElementById('adminChatUserList')) {
                loadUserList();
            }
        }, 5000);
        
        // Listen global chat update
        window.addEventListener('chat-updated', () => {
            if (document.getElementById('adminChatUserList')) {
                loadUserList();
            }
        });
    }
    
    // ========================== UTILITY ==========================
    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        }).replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, function(c) {
            return c;
        });
    }
    
    function formatTime(isoString) {
        if (!isoString) return '';
        const date = new Date(isoString);
        return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    }
    
    // ========================== DASHBOARD LOADING ==========================
    function loadDashboard() {
        const currentUser = DataManager.getCurrentUser();
        if (!currentUser) return;
        
        // Update UI elements
        if (elements.userNameDisplay) elements.userNameDisplay.textContent = currentUser.username;
        if (elements.userBalance) {
            elements.userBalance.textContent = currentUser.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
        
        // Tampilkan admin panel jika role admin
        if (currentUser.role === 'admin') {
            if (elements.adminPanel) elements.adminPanel.style.display = 'block';
            // Inisialisasi admin chat panel
            renderAdminChatPanel();
        } else {
            if (elements.adminPanel) elements.adminPanel.style.display = 'none';
            // Buat widget chat untuk user
            createUserChatWidget();
        }
        
        // Inisialisasi modul lain (market, chart, dll) jika belum
        if (window.MarketManager && window.MarketManager.initMarketTicker) {
            window.MarketManager.initMarketTicker();
        }
        if (window.ChartManager && window.ChartManager.initChart) {
            window.ChartManager.initChart();
        }
        if (window.TradingManager && window.TradingManager.attachEvents) {
            window.TradingManager.attachEvents();
        }
        if (window.FundsManager && window.FundsManager.attachEvents) {
            window.FundsManager.attachEvents();
        }
        if (window.HistoryManager && window.HistoryManager.loadHistory) {
            window.HistoryManager.loadHistory();
        }
        if (window.TrendingManager && window.TrendingManager.renderTrendingWidget) {
            window.TrendingManager.renderTrendingWidget();
        }
        if (window.StatsManager && window.StatsManager.renderUserStats) {
            window.StatsManager.renderUserStats();
        }
        
        // Start price simulation jika belum berjalan
        if (window.DataManager && !window.DataManager._priceIntervalRunning) {
            window.DataManager.startPriceSimulation();
            window.DataManager._priceIntervalRunning = true;
        }
        
        console.log('[DASHBOARD] Loaded for user:', currentUser.username);
    }
    
    function updateBalance(balance) {
        if (elements.userBalance) {
            elements.userBalance.textContent = balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
    }
    
    // ========================== EVENT LISTENER DATA CHANGE ==========================
    function listenDataChanges() {
        if (window.DataManager && window.DataManager.onDataChange) {
            window.DataManager.onDataChange('currentUser', (user) => {
                if (user && elements.userNameDisplay) {
                    elements.userNameDisplay.textContent = user.username;
                }
            });
            window.DataManager.onDataChange('prices', () => {
                // Update balance mungkin berubah karena trading? Tidak langsung, tapi biar aman
                const curr = DataManager.getCurrentUser();
                if (curr && elements.userBalance) {
                    elements.userBalance.textContent = curr.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                }
            });
        }
    }
    
    // ========================== INITIALIZATION ==========================
    function initDashboard() {
        cacheDashboardElements();
        listenDataChanges();
        initChatStorage();
        console.log('[DASHBOARD] Module initialized');
    }
    
    // ========================== PUBLIC API ==========================
    window.DashboardManager = {
        init: initDashboard,
        loadDashboard,
        updateBalance,
        // Chat public methods
        sendUserMessage,
        getAdminInbox,
        markMessageAsRead,
        sendAdminReply
    };
    
    // Auto init saat DOM siap
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDashboard);
    } else {
        initDashboard();
    }
    
    console.log('[DASHBOARD] Module loaded');
})();