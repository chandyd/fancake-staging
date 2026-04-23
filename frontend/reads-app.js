// FanCake Staging Frontend - v2.0 (Robust)
(function() {
    'use strict';
    console.log('[FanCake] Loading...');

    let SUPABASE_URL = '';
    let SUPABASE_ANON_KEY = '';
    let supabase = null;

    // ---- Bootstrap: get env vars ----
    function loadEnv() {
        const metaUrl = document.querySelector('meta[name="supabase-url"]');
        const metaKey = document.querySelector('meta[name="supabase-anon-key"]');
        if (metaUrl && metaKey) {
            SUPABASE_URL = metaUrl.getAttribute('content');
            SUPABASE_ANON_KEY = metaKey.getAttribute('content');
            console.log('[FanCake] Env loaded from meta tags');
            return true;
        }
        // Fallback: window globals
        if (window.VITE_SUPABASE_URL && window.VITE_SUPABASE_ANON_KEY) {
            SUPABASE_URL = window.VITE_SUPABASE_URL;
            SUPABASE_ANON_KEY = window.VITE_SUPABASE_ANON_KEY;
            console.log('[FanCake] Env loaded from window globals');
            return true;
        }
        console.error('[FanCake] No Supabase credentials found');
        return false;
    }

    // ---- Init Supabase ----
    function initSupabase() {
        if (typeof window.supabase === 'undefined') {
            console.error('[FanCake] Supabase SDK not loaded');
            showError('Supabase SDK failed to load. Refresh the page or try again later.');
            return false;
        }
        try {
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('[FanCake] Supabase client created');
            return true;
        } catch (e) {
            console.error('[FanCake] Failed to create Supabase client:', e);
            showError('Failed to initialize database connection: ' + e.message);
            return false;
        }
    }

    // ---- UI Helpers ----
    function showError(msg) {
        const el = document.createElement('div');
        el.className = 'alert alert-danger position-fixed top-0 start-50 translate-middle-x mt-3 shadow-lg';
        el.style.zIndex = '9999';
        el.innerHTML = '<i class="bi bi-exclamation-triangle me-2"></i>' + msg;
        document.body.prepend(el);
        setTimeout(function() { el.remove(); }, 8000);
    }

    function setLoading(container, msg) {
        if (!container) return;
        container.innerHTML = '<div class="col-12"><div class="alert alert-info"><div class="spinner-border spinner-border-sm me-2" role="status"></div>' + msg + '</div></div>';
    }

    function createMediaCard(media) {
        var title = media.title || 'Untitled';
        var desc = media.description || 'No description';
        var views = media.view_count || 0;
        var likes = media.like_count || 0;
        var type = media.media_type || 'media';
        return '<div class="col-md-6 col-lg-4 mb-4">' +
            '<div class="card media-card h-100"><div class="card-body">' +
            '<h5 class="card-title">' + title + '</h5>' +
            '<p class="card-text text-muted">' + desc + '</p>' +
            '<div class="d-flex justify-content-between">' +
            '<small class="text-muted"><i class="bi bi-eye"></i> ' + views +
            ' <i class="bi bi-heart ms-2"></i> ' + likes + '</small>' +
            '<small class="text-muted">' + type + '</small></div></div></div></div>';
    }

    function createCreatorCard(creator) {
        var name = creator.display_name || creator.username;
        var bio = creator.bio || 'No bio yet';
        var followers = creator.follower_count || 0;
        var verified = creator.is_verified ? '<span class="badge bg-success ms-1"><i class="bi bi-check-circle"></i></span>' : '';
        return '<div class="col-md-6 col-lg-4 mb-3">' +
            '<div class="card creator-card h-100"><div class="card-body">' +
            '<h5 class="card-title">' + name + verified + '</h5>' +
            '<p class="card-text">' + bio + '</p>' +
            '<div class="d-flex justify-content-between align-items-center">' +
            '<small class="text-muted"><i class="bi bi-people"></i> ' + followers + ' followers</small>' +
            '<span class="badge bg-primary">Creator</span></div></div></div></div>';
    }

    // ---- Data Loading ----
    async function loadMedia(container) {
        if (!container) return;
        setLoading(container, 'Loading media...');
        try {
            console.log('[FanCake] Fetching media...');
            var result = await supabase
                .from('media')
                .select('id, title, description, media_type, filename, view_count, like_count, published_at')
                .eq('status', 'published')
                .order('published_at', { ascending: false })
                .limit(6);
            if (result.error) throw result.error;
            var data = result.data;
            console.log('[FanCake] Media loaded:', data.length, 'items');
            container.innerHTML = '';
            if (data.length === 0) {
                container.innerHTML = '<div class="col-12"><div class="alert alert-info"><i class="bi bi-info-circle"></i> No media yet. Be the first creator!</div></div>';
                return;
            }
            data.forEach(function(m) { container.innerHTML += createMediaCard(m); });
        } catch (e) {
            console.error('[FanCake] Media error:', e);
            container.innerHTML = '<div class="col-12"><div class="alert alert-danger"><i class="bi bi-exclamation-triangle"></i> Error loading media: ' + e.message + '</div></div>';
        }
    }

    async function loadCreators(container) {
        if (!container) return;
        setLoading(container, 'Loading creators...');
        try {
            console.log('[FanCake] Fetching creators...');
            var result = await supabase
                .from('users')
                .select('id, username, display_name, is_verified, is_featured, bio, follower_count')
                .eq('is_creator', true)
                .order('follower_count', { ascending: false })
                .limit(5);
            if (result.error) throw result.error;
            var data = result.data;
            console.log('[FanCake] Creators loaded:', data.length, 'creators');
            container.innerHTML = '';
            if (data.length === 0) {
                container.innerHTML = '<div class="alert alert-info"><i class="bi bi-info-circle"></i> No creators yet.</div>';
                return;
            }
            data.forEach(function(c) { container.innerHTML += createCreatorCard(c); });
        } catch (e) {
            console.error('[FanCake] Creators error:', e);
            container.innerHTML = '<div class="alert alert-danger"><i class="bi bi-exclamation-triangle"></i> Error loading creators: ' + e.message + '</div>';
        }
    }

    // ---- Search ----
    window.search = async function() {
        var input = document.getElementById('searchInput');
        var container = document.getElementById('mediaContainer');
        if (!input || !container) return;
        var query = input.value.trim();
        if (!query) return;
        setLoading(container, 'Searching for "' + query + '"...');
        try {
            var result = await supabase.rpc('search_media', { search_query: query, limit_val: 10 });
            if (result.error) throw result.error;
            var data = result.data;
            container.innerHTML = '';
            if (data.length === 0) {
                container.innerHTML = '<div class="col-12"><div class="alert alert-warning"><i class="bi bi-search"></i> No results for "' + query + '"</div></div>';
                return;
            }
            data.forEach(function(m) { container.innerHTML += createMediaCard(m); });
            var title = document.querySelector('h3');
            if (title) title.innerHTML = '<i class="bi bi-search"></i> Results for "' + query + '"';
        } catch (e) {
            console.error('[FanCake] Search error:', e);
            container.innerHTML = '<div class="col-12"><div class="alert alert-danger"><i class="bi bi-exclamation-triangle"></i> Search error: ' + e.message + '</div></div>';
        }
    };

    // ---- Login / Signup con Supabase Auth ----
    function showAuthModal(mode) {
        var existing = document.getElementById('authModal');
        if (existing) existing.remove();
        var isLogin = mode === 'login';
        var modal = document.createElement('div');
        modal.id = 'authModal';
        modal.className = 'modal fade show d-block';
        modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
        modal.innerHTML = '<div class="modal-dialog modal-dialog-centered"><div class="modal-content">' +
            '<div class="modal-header"><h5 class="modal-title">' + (isLogin ? 'Login' : 'Sign Up') + '</h5>' +
            '<button type="button" class="btn-close" onclick="closeAuthModal()"></button></div>' +
            '<div class="modal-body">' +
            '<div id="authAlert"></div>' +
            '<div class="mb-3"><label class="form-label">Email</label>' +
            '<input type="email" id="authEmail" class="form-control" placeholder="your@email.com"></div>' +
            '<div class="mb-3"><label class="form-label">Password</label>' +
            '<input type="password" id="authPassword" class="form-control" placeholder="••••••••"></div>' +
            (isLogin ? '' : '<div class="mb-3"><label class="form-label">Username</label>' +
            '<input type="text" id="authUsername" class="form-control" placeholder="coolcreator"></div>') +
            '<button class="btn btn-primary w-100" onclick="' + (isLogin ? 'doLogin()' : 'doSignup()') + '">' +
            (isLogin ? 'Login' : 'Create Account') + '</button></div></div></div>';
        document.body.appendChild(modal);
    }

    window.closeAuthModal = function() {
        var el = document.getElementById('authModal');
        if (el) el.remove();
    };

    window.doLogin = async function() {
        var email = document.getElementById('authEmail').value.trim();
        var password = document.getElementById('authPassword').value;
        if (!email || !password) { setAuthAlert('Fill in all fields', 'warning'); return; }
        setAuthAlert('Logging in...', 'info');
        try {
            var result = await supabase.auth.signInWithPassword({ email: email, password: password });
            if (result.error) throw result.error;
            setAuthAlert('Login successful! Redirecting...', 'success');
            setTimeout(function() { window.location.reload(); }, 1000);
        } catch (e) {
            setAuthAlert(e.message, 'danger');
        }
    };

    window.doSignup = async function() {
        var email = document.getElementById('authEmail').value.trim();
        var password = document.getElementById('authPassword').value;
        var username = document.getElementById('authUsername') ? document.getElementById('authUsername').value.trim() : '';
        if (!email || !password || !username) { setAuthAlert('Fill in all fields', 'warning'); return; }
        setAuthAlert('Creating account...', 'info');
        try {
            var result = await supabase.auth.signUp({ email: email, password: password });
            if (result.error) throw result.error;
            // Create user profile in users table
            if (result.data.user) {
                await supabase.from('users').insert([{
                    id: result.data.user.id,
                    email: email,
                    username: username,
                    display_name: username,
                    is_creator: true
                }]);
            }
            setAuthAlert('Account created! Check your email to confirm, then login.', 'success');
        } catch (e) {
            setAuthAlert(e.message, 'danger');
        }
    };

    function setAuthAlert(msg, type) {
        var el = document.getElementById('authAlert');
        if (el) el.innerHTML = '<div class="alert alert-' + type + ' alert-dismissible">' + msg + '</div>';
    }

    window.login = function() { showAuthModal('login'); };
    window.signup = function() { showAuthModal('signup'); };

    window.logout = function() {
        supabase.auth.signOut().then(function() { window.location.reload(); });
    };

    // ---- Session / Navbar update ----
    function updateNavbar(user) {
        var navBtns = document.querySelector('.navbar .d-flex');
        if (!navBtns) return;
        var creatorLink = document.getElementById('navCreatorLink');
        if (user) {
            navBtns.innerHTML = '<span class="text-light me-2"><i class="bi bi-person-circle"></i> ' + (user.user_metadata?.username || user.email) + '</span>' +
                '<button class="btn btn-outline-light btn-sm" onclick="logout()">Logout</button>';
            if (creatorLink) creatorLink.style.display = '';
        } else {
            navBtns.innerHTML = '<button class="btn btn-outline-light me-2" onclick="login()">Login</button>' +
                '<button class="btn btn-primary" onclick="signup()">Sign Up</button>';
            if (creatorLink) creatorLink.style.display = 'none';
        }
    }

    // ---- Main ----
    function main() {
        if (!loadEnv()) {
            showError('Configuration error: Missing Supabase credentials');
            return;
        }
        if (!initSupabase()) return;

        // Check existing session
        supabase.auth.getSession().then(function(resp) {
            updateNavbar(resp.data.session ? resp.data.session.user : null);
        });

        // Listen for auth changes
        supabase.auth.onAuthStateChange(function(event, session) {
            updateNavbar(session ? session.user : null);
        });

        var mediaContainer = document.getElementById('mediaContainer');
        var creatorsContainer = document.getElementById('creatorsContainer');

        loadMedia(mediaContainer);
        loadCreators(creatorsContainer);
    }

    // Wait for DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', main);
    } else {
        main();
    }

    console.log('[FanCake] App initialized');
})();