// FanCake Creator Dashboard - v1.0
(function() {
    'use strict';
    console.log('[FanCake Creator] Loading...');

    let SUPABASE_URL = '';
    let SUPABASE_ANON_KEY = '';
    let supabase = null;
    let currentUser = null;
    let currentProfile = null;
    let mediaCache = [];

    // ---- Bootstrap ----
    function loadEnv() {
        const metaUrl = document.querySelector('meta[name="supabase-url"]');
        const metaKey = document.querySelector('meta[name="supabase-anon-key"]');
        if (metaUrl && metaKey) {
            SUPABASE_URL = metaUrl.getAttribute('content');
            SUPABASE_ANON_KEY = metaKey.getAttribute('content');
            return true;
        }
        if (window.VITE_SUPABASE_URL && window.VITE_SUPABASE_ANON_KEY) {
            SUPABASE_URL = window.VITE_SUPABASE_URL;
            SUPABASE_ANON_KEY = window.VITE_SUPABASE_ANON_KEY;
            return true;
        }
        console.error('[FanCake Creator] No Supabase credentials');
        return false;
    }

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
        el.innerHTML = '<i class="bi bi-exclamation-triangle me-2"></i>' + msg;
        document.body.prepend(el);
        setTimeout(function() { el.remove(); }, 8000);
    }

    function showAlert(containerId, msg, type) {
        var el = document.getElementById(containerId);
        if (!el) return;
        type = type || 'info';
        el.innerHTML = '<div class="alert alert-' + type + ' alert-dismissible">' + msg + '</div>';
        setTimeout(function() { el.innerHTML = ''; }, 6000);
    }

    // ---- Auth Modal (inline, same pattern as app.js) ----
    function showAuthModal(mode) {
        var existing = document.getElementById('authModal');
        if (existing) existing.remove();

        var overlay = document.createElement('div');
        overlay.id = 'authModal';
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;';
        overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };

        var isLogin = (mode === 'login');
        overlay.innerHTML = '<div class="bg-white rounded-4 shadow-lg p-4" style="width:380px;max-width:90vw;" onclick="event.stopPropagation()">' +
            '<div class="d-flex justify-content-between align-items-center mb-3">' +
            '<h4 class="mb-0">' + (isLogin ? 'Login' : 'Sign Up') + '</h4>' +
            '<button class="btn-close" onclick="document.getElementById(\'authModal\').remove()"></button></div>' +
            '<div id="authAlert" class="mb-2"></div>' +
            '<input type="email" id="authEmail" class="form-control mb-2" placeholder="Email">' +
            '<input type="password" id="authPassword" class="form-control mb-2" placeholder="Password">' +
            (!isLogin ? '<input type="text" id="authUsername" class="form-control mb-2" placeholder="Username">' : '') +
            '<button class="btn btn-primary w-100" id="authBtn" onclick="' + (isLogin ? 'handleLogin()' : 'handleSignup()') + '">' +
            (isLogin ? 'Login' : 'Create Account') + '</button>' +
            '<p class="text-center mt-2 mb-0"><small>' +
            (isLogin ? 'No account? <a href="#" onclick="showAuthModal(\'signup\');return false;">Sign up</a>' :
            'Already registered? <a href="#" onclick="showAuthModal(\'login\');return false;">Login</a>') +
            '</small></p></div>';

        document.body.appendChild(overlay);
        document.getElementById('authEmail').focus();
    }

    function setAuthAlert(msg, type) {
        var el = document.getElementById('authAlert');
        if (el) el.innerHTML = '<div class="alert alert-' + (type || 'info') + ' py-1 mb-0">' + msg + '</div>';
    }

    window.login = function() { showAuthModal('login'); };
    window.signup = function() { showAuthModal('signup'); };

    window.logout = function() {
        supabase.auth.signOut().then(function() { window.location.reload(); });
    };

    window.handleLogin = async function() {
        var email = document.getElementById('authEmail').value.trim();
        var password = document.getElementById('authPassword').value.trim();
        if (!email || !password) { setAuthAlert('Fill in all fields', 'warning'); return; }
        var btn = document.getElementById('authBtn');
        btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Logging in...';
        try {
            var result = await supabase.auth.signInWithPassword({ email: email, password: password });
            if (result.error) throw result.error;
            setAuthAlert('Login successful! <i class="bi bi-check-circle"></i>', 'success');
            setTimeout(function() {
                var m = document.getElementById('authModal');
                if (m) m.remove();
                window.location.reload();
            }, 800);
        } catch (e) {
            setAuthAlert(e.message, 'danger');
            btn.disabled = false; btn.innerHTML = 'Login';
        }
    };

    window.handleSignup = async function() {
        var email = document.getElementById('authEmail').value.trim();
        var password = document.getElementById('authPassword').value.trim();
        var username = document.getElementById('authUsername').value.trim();
        if (!email || !password || !username) { setAuthAlert('Fill in all fields', 'warning'); return; }
        var btn = document.getElementById('authBtn');
        btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Creating...';
        try {
            var result = await supabase.auth.signUp({
                email: email,
                password: password,
                options: { data: { username: username } }
            });
            if (result.error) throw result.error;
            if (result.data.user) {
                // Create profile in users table
                await supabase.from('users').insert([{
                    id: result.data.user.id,
                    email: email,
                    username: username,
                    display_name: username,
                    is_creator: true
                }]).select();
            }
            setAuthAlert('Account created! Check your email for confirmation, then login.', 'success');
            btn.disabled = false; btn.innerHTML = 'Create Account';
        } catch (e) {
            setAuthAlert(e.message, 'danger');
            btn.disabled = false; btn.innerHTML = 'Create Account';
        }
    };

    // ---- Dashboard Functions ----

    async function loadStats() {
        if (!currentUser) return;
        try {
            // Count user's media
            var { data: myMedia, error: mediaErr } = await supabase
                .from('media')
                .select('id, view_count, like_count')
                .eq('user_id', currentUser.id);
            if (mediaErr) throw mediaErr;

            var totalViews = 0, totalLikes = 0;
            myMedia.forEach(function(m) {
                totalViews += (m.view_count || 0);
                totalLikes += (m.like_count || 0);
            });

            document.getElementById('statMedia').textContent = myMedia.length;
            document.getElementById('statViews').textContent = totalViews;
            document.getElementById('statLikes').textContent = totalLikes;
            document.getElementById('statFollowers').textContent = currentProfile.follower_count || 0;
        } catch (e) {
            console.error('[FanCake Creator] Stats error:', e);
        }
    }

    async function loadMyMedia() {
        if (!currentUser) return;
        var container = document.getElementById('mediaList');
        try {
            var { data, error } = await supabase
                .from('media')
                .select('*')
                .eq('user_id', currentUser.id)
                .order('created_at', { ascending: false });
            if (error) throw error;
            mediaCache = data || [];

            if (mediaCache.length === 0) {
                container.innerHTML = '<div class="text-center py-4 text-muted"><i class="bi bi-inbox display-4"></i><p class="mt-2">No media yet. Start publishing!</p></div>';
                return;
            }

            var html = '<div class="table-responsive"><table class="table table-hover"><thead><tr><th>Title</th><th>Type</th><th>Status</th><th>Views</th><th>Likes</th><th>Date</th></tr></thead><tbody>';
            mediaCache.forEach(function(m) {
                var date = new Date(m.created_at).toLocaleDateString();
                html += '<tr>' +
                    '<td>' + (m.title || 'Untitled') + '</td>' +
                    '<td><span class="badge bg-secondary">' + (m.media_type || '?') + '</span></td>' +
                    '<td><span class="badge ' + (m.status === 'published' ? 'bg-success' : 'bg-warning') + '">' + (m.status || 'draft') + '</span></td>' +
                    '<td>' + (m.view_count || 0) + '</td>' +
                    '<td>' + (m.like_count || 0) + '</td>' +
                    '<td>' + date + '</td></tr>';
            });
            html += '</tbody></table></div>';
            container.innerHTML = html;
        } catch (e) {
            container.innerHTML = '<div class="alert alert-danger">Error loading media: ' + e.message + '</div>';
        }
    }

    async function loadProfile() {
        if (!currentUser) return;
        document.getElementById('profDisplayName').value = currentProfile.display_name || '';
        document.getElementById('profUsername').value = currentProfile.username || '';
        document.getElementById('profBio').value = currentProfile.bio || '';
        document.getElementById('profWebsite').value = currentProfile.website || '';
    }

    function showTab(name) {
        document.querySelectorAll('.tab-pane').forEach(function(el) { el.style.display = 'none'; });
        document.getElementById('tab' + name.charAt(0).toUpperCase() + name.slice(1)).style.display = '';
        document.querySelectorAll('#dashTabs .nav-link').forEach(function(el) { el.classList.remove('active'); });
        var btn = document.querySelector('#dashTabs button[onclick*="' + name + '"]');
        if (btn) btn.classList.add('active');
        // Reload tab content
        if (name === 'media') loadMyMedia();
        if (name === 'profile') loadProfile();
    }

    window.showTab = showTab;

    // ---- File selection preview ----
    window.handleFileSelect = function(evt) {
        var file = evt.target.files[0];
        if (!file) return;
        var preview = document.getElementById('filePreview');
        var type = file.type.split('/')[0];
        preview.style.display = 'block';
        if (type === 'image') {
            var reader = new FileReader();
            reader.onload = function(e) { preview.innerHTML = '<img src="' + e.target.result + '" class="media-preview"><small class="d-block mt-1 text-muted">' + file.name + ' (' + (file.size / 1024).toFixed(0) + ' KB)</small>'; };
            reader.readAsDataURL(file);
        } else {
            preview.innerHTML = '<i class="bi bi-file-earmark-text display-6"></i> <span>' + file.name + ' (' + (file.size / 1024).toFixed(0) + ' KB)</span>';
        }
        // Set URL to filename hint
        document.getElementById('pubFileUrl').value = file.name;
    };

    // ---- Publish Form ----
    document.addEventListener('submit', function(e) {
        var form = e.target;
        if (form.id !== 'publishForm') return;
        e.preventDefault();
        handlePublish();
    });

    async function handlePublish() {
        if (!currentUser) { showAlert('publishAlert', 'You must be logged in.', 'danger'); return; }
        var btn = document.getElementById('publishBtn');
        btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Publishing...';

        try {
            var title = document.getElementById('pubTitle').value.trim();
            var desc = document.getElementById('pubDesc').value.trim();
            var mediaType = document.getElementById('pubType').value;
            var access = document.getElementById('pubAccess').value;
            var tagsStr = document.getElementById('pubTags').value.trim();
            var price = parseFloat(document.getElementById('pubPrice').value) || null;
            var status = document.getElementById('pubStatus').value;
            var fileUrl = document.getElementById('pubFileUrl').value.trim();
            var fileInput = document.getElementById('pubFile');
            var file = fileInput.files[0];

            if (!title || !desc) { showAlert('publishAlert', 'Title and description are required.', 'warning'); btn.disabled = false; btn.innerHTML = '<i class="bi bi-cloud-upload"></i> Publish'; return; }

            var tags = tagsStr ? tagsStr.split(',').map(function(t) { return t.trim(); }).filter(function(t) { return t; }) : [];
            var filename = '';
            var fileSize = 0;
            var mimeType = '';

            if (file) {
                filename = file.name;
                fileSize = file.size;
                mimeType = file.type;
            } else if (fileUrl) {
                filename = fileUrl.split('/').pop();
                mimeType = (mediaType === 'video' ? 'video/mp4' : 'image/jpeg');
                fileSize = 0;
            }

            var insertData = {
                user_id: currentUser.id,
                title: title,
                description: desc,
                media_type: mediaType,
                filename: filename,
                file_size: fileSize,
                mime_type: mimeType,
                tags: tags,
                access_type: access,
                status: status,
                currency: 'EUR'
            };
            if (price) insertData.price = price;
            if (status === 'published') insertData.published_at = new Date().toISOString();

            var { data, error } = await supabase.from('media').insert([insertData]).select();
            if (error) throw error;

            showAlert('publishAlert', '<i class="bi bi-check-circle"></i> ' + (status === 'published' ? 'Published!' : 'Draft saved!'), 'success');
            document.getElementById('publishForm').reset();
            document.getElementById('filePreview').style.display = 'none';
            // Refresh stats + media list
            loadStats();
            loadMyMedia();
        } catch (e) {
            showAlert('publishAlert', 'Error: ' + e.message, 'danger');
        }
        btn.disabled = false; btn.innerHTML = '<i class="bi bi-cloud-upload"></i> Publish';
    }

    // ---- Profile Save ----
    document.addEventListener('submit', function(e) {
        var form = e.target;
        if (form.id !== 'profileForm') return;
        e.preventDefault();
        handleProfileSave();
    });

    async function handleProfileSave() {
        if (!currentUser) return;
        try {
            var displayName = document.getElementById('profDisplayName').value.trim();
            var bio = document.getElementById('profBio').value.trim();
            var website = document.getElementById('profWebsite').value.trim();

            var { error } = await supabase.from('users').update({
                display_name: displayName || currentProfile.display_name,
                bio: bio,
                website: website || null
            }).eq('id', currentUser.id);

            if (error) throw error;
            showAlert('profileAlert', '<i class="bi bi-check-circle"></i> Profile updated!', 'success');
        } catch (e) {
            showAlert('profileAlert', 'Error: ' + e.message, 'danger');
        }
    }

    // ---- Auth Check ----
    async function checkAuth() {
        var notAuthCard = document.getElementById('notAuthCard');
        var dashContent = document.getElementById('dashContent');
        var navUser = document.getElementById('navUser');

        var { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) {
            notAuthCard.style.display = '';
            dashContent.style.display = 'none';
            return;
        }

        currentUser = session.user;
        navUser.textContent = currentUser.user_metadata?.username || currentUser.email;

        // Load profile
        var { data: profiles } = await supabase.from('users').select('*').eq('id', currentUser.id).limit(1);
        if (profiles && profiles.length > 0) {
            currentProfile = profiles[0];
            // Ensure is_creator
            if (!currentProfile.is_creator) {
                await supabase.from('users').update({ is_creator: true }).eq('id', currentUser.id);
                currentProfile.is_creator = true;
            }
        } else {
            // Create profile on the fly
            var { data: newProfile } = await supabase.from('users').insert([{
                id: currentUser.id,
                email: currentUser.email,
                username: currentUser.user_metadata?.username || currentUser.email.split('@')[0],
                display_name: currentUser.user_metadata?.username || currentUser.email.split('@')[0],
                is_creator: true
            }]).select();
            if (newProfile) currentProfile = newProfile[0];
        }

        notAuthCard.style.display = 'none';
        dashContent.style.display = '';
        document.getElementById('dashCreatorBadge').textContent = '@' + (currentProfile.username || 'creator');

        loadStats();
        loadMyMedia();
        loadProfile();
    }

    // ---- Init ----
    function main() {
        if (!loadEnv() || !initSupabase()) return;

        supabase.auth.getSession().then(function(resp) {
            if (resp.data.session) {
                checkAuth();
            } else {
                document.getElementById('notAuthCard').style.display = '';
            }
        });

        supabase.auth.onAuthStateChange(function(event, session) {
            if (event === 'SIGNED_IN') {
                // No reload: just refresh the dashboard in-place
                var modal = document.getElementById('authModal');
                if (modal) modal.remove();
                checkAuth();
            }
            if (event === 'SIGNED_OUT') {
                document.getElementById('notAuthCard').style.display = '';
                document.getElementById('dashContent').style.display = 'none';
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', main);
    } else {
        main();
    }

    console.log('[FanCake Creator] App initialized');
})();
