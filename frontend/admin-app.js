// FanCake Admin Panel - v2.0
(function() {
    'use strict';
    console.log('[FanCake Admin] Loading...');

    var SUPABASE_URL = 'https://lftlvycvgauzrryyqxpu.supabase.co';
    var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmdGx2eWN2Z2F1enJyeXlxeHB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NTY2MTksImV4cCI6MjA5MjMzMjYxOX0.rO4T1MAmrVr78gl6Bnh5sNqqh7aiGupZNRuIGZBmU2s';
    var supabase = null;
    var currentUser = null;

    function initSupabase() {
        if (typeof window.supabase === 'undefined') {
            showError('Supabase SDK failed to load.');
            return false;
        }
        try {
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            return true;
        } catch (e) {
            showError('Failed to init: ' + e.message);
            return false;
        }
    }

    function showError(msg) {
        var el = document.createElement('div');
        el.className = 'alert alert-danger position-fixed top-0 start-50 translate-middle-x mt-3 shadow-lg';
        el.style.zIndex = '9999';
        el.innerHTML = '<i class="fas fa-exclamation-triangle me-2"></i>' + msg;
        document.body.prepend(el);
        setTimeout(function() { el.remove(); }, 8000);
    }

    // ---- Auth ----
    async function checkAuth() {
        try {
            var result = await supabase.auth.getSession();
            if (result.error || !result.data.session) {
                window.location.href = 'reads.html';
                return;
            }
            currentUser = result.data.session.user;

            // Check admin
            var adminRes = await supabase.from('admin_users').select('*').eq('user_id', currentUser.id).limit(1);
            if (!adminRes.data || adminRes.data.length === 0) {
                showError('Access denied. Admin only.');
                setTimeout(function() { window.location.href = 'reads.html'; }, 1500);
                return;
            }

            document.getElementById('adminName').textContent = currentUser.email;
            loadStats();
            loadUsers();
            loadBooksAdmin();
            loadMediaAdmin();
        } catch (e) {
            showError('Auth error: ' + e.message);
        }
    }

    // ---- Stats ----
    async function loadStats() {
        try {
            var users = await supabase.from('users').select('id', { count: 'exact', head: true });
            var books = await supabase.from('reads_books').select('id', { count: 'exact', head: true });
            var media = await supabase.from('media').select('id', { count: 'exact', head: true });
            var pending = await supabase.from('media').select('id', { count: 'exact', head: true }).eq('status', 'draft');

            document.getElementById('totalUsers').textContent = users.count || 0;
            document.getElementById('totalBooks').textContent = books.count || 0;
            document.getElementById('totalMedia').textContent = media.count || 0;
            document.getElementById('pendingModeration').textContent = pending.count || 0;

            document.getElementById('usersBadge').textContent = users.count || 0;
            document.getElementById('booksBadge').textContent = books.count || 0;
            document.getElementById('mediaBadge').textContent = media.count || 0;
            document.getElementById('moderationBadge').textContent = pending.count || 0;
        } catch (e) {
            console.error('[Admin] Stats error:', e);
        }
    }

    // ---- Users ----
    async function loadUsers() {
        try {
            var res = await supabase.from('users').select('*').order('created_at', { ascending: false }).limit(50);
            if (res.error) throw res.error;
            var tbody = document.querySelector('#usersTable tbody');
            if (!tbody) return;
            if (!res.data || res.data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center">No users</td></tr>';
                return;
            }
            tbody.innerHTML = res.data.map(function(u) {
                return '<tr><td><strong>' + (u.display_name || u.username) + '</strong><br><small class="text-muted">@' + u.username + '</small></td>' +
                    '<td>' + u.email + '</td>' +
                    '<td>' + (u.is_creator ? '<span class="badge bg-primary">Creator</span>' : '<span class="badge bg-secondary">User</span>') + '</td>' +
                    '<td>' + new Date(u.created_at).toLocaleDateString() + '</td>' +
                    '<td><span class="badge bg-success">Active</span></td>' +
                    '<td><button class="btn btn-sm btn-outline-danger" onclick="deleteUser(\'' + u.id + '\')">Delete</button></td></tr>';
            }).join('');
        } catch (e) {
            console.error('[Admin] Users error:', e);
        }
    }

    window.deleteUser = async function(userId) {
        if (!confirm('Delete user?')) return;
        try {
            await supabase.from('users').delete().eq('id', userId);
            loadUsers();
            loadStats();
        } catch (e) { showError('Error: ' + e.message); }
    };

    // ---- Books Admin ----
    async function loadBooksAdmin() {
        try {
            var res = await supabase.from('reads_books').select('*, users(username, display_name)').order('created_at', { ascending: false }).limit(50);
            if (res.error) throw res.error;
            var tbody = document.querySelector('#booksTable tbody');
            if (!tbody) return;
            if (!res.data || res.data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center">No books</td></tr>';
                return;
            }
            tbody.innerHTML = res.data.map(function(b) {
                var author = b.users ? (b.users.display_name || b.users.username) : 'Unknown';
                return '<tr><td><strong>' + b.title + '</strong></td>' +
                    '<td>' + author + '</td>' +
                    '<td>' + (b.genre || '-') + '</td>' +
                    '<td><span class="badge ' + (b.status === 'published' ? 'bg-success' : 'bg-warning') + '">' + b.status + '</span></td>' +
                    '<td><i class="fas fa-eye"></i> ' + (b.view_count || 0) + ' <i class="fas fa-star text-warning ms-2"></i> ' + (b.rating ? b.rating.toFixed(1) : 'N/A') + '</td>' +
                    '<td><button class="btn btn-sm btn-outline-danger" onclick="deleteBookAdmin(\'' + b.id + '\')">Delete</button></td></tr>';
            }).join('');
        } catch (e) {
            console.error('[Admin] Books error:', e);
        }
    }

    window.deleteBookAdmin = async function(bookId) {
        if (!confirm('Delete book and all chapters?')) return;
        try {
            await supabase.from('reads_chapters').delete().eq('book_id', bookId);
            await supabase.from('reads_books').delete().eq('id', bookId);
            loadBooksAdmin();
            loadStats();
        } catch (e) { showError('Error: ' + e.message); }
    };

    // ---- Media Admin ----
    async function loadMediaAdmin() {
        try {
            var res = await supabase.from('media').select('*, users(username)').order('created_at', { ascending: false }).limit(50);
            if (res.error) throw res.error;
            var grid = document.getElementById('mediaGrid');
            if (!grid) return;
            if (!res.data || res.data.length === 0) {
                grid.innerHTML = '<div class="col-12 text-center">No media</div>';
                return;
            }
            grid.innerHTML = res.data.map(function(m) {
                return '<div class="col-md-3 mb-3"><div class="card">' +
                    '<div class="card-body"><h6>' + (m.title || 'Untitled') + '</h6>' +
                    '<small class="text-muted">by ' + (m.users ? m.users.username : '?') + '</small><br>' +
                    '<span class="badge ' + (m.status === 'published' ? 'bg-success' : 'bg-warning') + '">' + m.status + '</span> ' +
                    '<span class="badge bg-secondary">' + m.media_type + '</span></div>' +
                    '<div class="card-footer"><button class="btn btn-sm btn-outline-danger" onclick="deleteMediaAdmin(\'' + m.id + '\')">Delete</button></div></div></div>';
            }).join('');
        } catch (e) {
            console.error('[Admin] Media error:', e);
        }
    }

    window.deleteMediaAdmin = async function(mediaId) {
        if (!confirm('Delete media?')) return;
        try {
            await supabase.from('media').delete().eq('id', mediaId);
            loadMediaAdmin();
            loadStats();
        } catch (e) { showError('Error: ' + e.message); }
    };

    // ---- Navigation ----
    window.showAdminSection = function(name) {
        var sections = ['dashboard', 'users', 'books', 'media', 'moderation', 'analytics', 'settings'];
        sections.forEach(function(s) {
            var el = document.getElementById(s + 'Section');
            if (el) el.style.display = (s === name) ? '' : 'none';
        });
        document.querySelectorAll('.nav-link-admin').forEach(function(el) { el.classList.remove('active'); });
        var link = document.querySelector('.nav-link-admin[data-section="' + name + '"]');
        if (link) link.classList.add('active');
        document.getElementById('sectionTitle').textContent = name.charAt(0).toUpperCase() + name.slice(1);
    };

    // ---- Init ----
    function main() {
        if (!initSupabase()) return;
        checkAuth();

        // Sidebar nav
        document.querySelectorAll('.nav-link-admin').forEach(function(link) {
            link.addEventListener('click', function(e) {
                var section = this.getAttribute('data-section');
                if (section) {
                    e.preventDefault();
                    window.showAdminSection(section);
                }
            });
        });

        document.getElementById('logoutBtn').addEventListener('click', function(e) {
            e.preventDefault();
            supabase.auth.signOut().then(function() { window.location.href = 'reads.html'; });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', main);
    } else {
        main();
    }

    console.log('[FanCake Admin] App initialized');
})();
