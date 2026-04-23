// FanCake Reads - Complete App
(function() {
    'use strict';

    var SUPABASE_URL = 'https://lftlvycvgauzrryyqxpu.supabase.co';
    var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmdGx2eWN2Z2F1enJyeXlxeHB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NTY2MTksImV4cCI6MjA5MjMzMjYxOX0.rO4T1MAmrVr78gl6Bnh5sNqqh7aiGupZNRuIGZBmU2s';
    var supabase = null;
    var currentUser = null;
    var currentBook = null;
    var currentChapter = null;
    var allBooks = [];
    var myBooks = [];
    var chaptersList = [];
    var editingBookId = null;
    var fontSize = 16;
    var isDarkMode = false;

    function initSupabase() {
        if (typeof window.supabase === 'undefined') {
            showError('Supabase SDK not loaded');
            return false;
        }
        try {
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            return true;
        } catch (e) {
            showError('Failed to init Supabase: ' + e.message);
            return false;
        }
    }

    function showError(msg) {
        var el = document.createElement('div');
        el.className = 'alert alert-danger position-fixed top-0 start-50 translate-middle-x mt-3 shadow-lg';
        el.style.zIndex = '9999';
        el.innerHTML = '<i class="fas fa-exclamation-triangle me-2"></i>' + msg;
        document.body.prepend(el);
        setTimeout(function() { el.remove(); }, 6000);
    }

    function showSuccess(msg) {
        var el = document.createElement('div');
        el.className = 'alert alert-success position-fixed top-0 start-50 translate-middle-x mt-3 shadow-lg';
        el.style.zIndex = '9999';
        el.innerHTML = '<i class="fas fa-check-circle me-2"></i>' + msg;
        document.body.prepend(el);
        setTimeout(function() { el.remove(); }, 4000);
    }

    function setLoading(id, msg) {
        var el = document.getElementById(id);
        if (!el) return;
        el.innerHTML = '<div class="text-center py-4"><div class="spinner-border text-primary"></div><p class="mt-2 text-muted">' + (msg || 'Loading...') + '</p></div>';
    }

    // ---- Auth ----
    function showAuthModal(mode) {
        var existing = document.getElementById('authModal');
        if (existing) existing.remove();
        var isLogin = mode === 'login';
        var overlay = document.createElement('div');
        overlay.id = 'authModal';
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;';
        overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
        overlay.innerHTML = '<div class="bg-white rounded-4 shadow-lg p-4" style="width:380px;max-width:90vw;" onclick="event.stopPropagation()">' +
            '<div class="d-flex justify-content-between align-items-center mb-3"><h4 class="mb-0">' + (isLogin ? 'Login' : 'Sign Up') + '</h4>' +
            '<button class="btn-close" onclick="document.getElementById(\'authModal\').remove()"></button></div>' +
            '<div id="authAlert" class="mb-2"></div>' +
            '<input type="email" id="authEmail" class="form-control mb-2" placeholder="Email">' +
            '<input type="password" id="authPassword" class="form-control mb-2" placeholder="Password">' +
            (!isLogin ? '<input type="text" id="authUsername" class="form-control mb-2" placeholder="Username">' : '') +
            '<button class="btn btn-primary w-100" id="authBtn" onclick="' + (isLogin ? 'window.doLogin()' : 'window.doSignup()') + '">' + (isLogin ? 'Login' : 'Create Account') + '</button>' +
            '<p class="text-center mt-2 mb-0"><small>' + (isLogin ? 'No account? <a href="#" onclick="showAuthModal(\'signup\');return false;">Sign up</a>' : 'Already registered? <a href="#" onclick="showAuthModal(\'login\');return false;">Login</a>') + '</small></p></div>';
        document.body.appendChild(overlay);
    }

    window.showAuthModal = showAuthModal;

    function setAuthAlert(msg, type) {
        var el = document.getElementById('authAlert');
        if (el) el.innerHTML = '<div class="alert alert-' + (type || 'info') + ' py-1 mb-0">' + msg + '</div>';
    }

    window.doLogin = async function() {
        var email = document.getElementById('authEmail').value.trim();
        var password = document.getElementById('authPassword').value;
        if (!email || !password) { setAuthAlert('Fill in all fields', 'warning'); return; }
        var btn = document.getElementById('authBtn');
        btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Logging in...';
        try {
            var result = await supabase.auth.signInWithPassword({ email: email, password: password });
            if (result.error) throw result.error;
            setAuthAlert('Login successful!', 'success');
            setTimeout(function() { var m = document.getElementById('authModal'); if (m) m.remove(); checkAuth(); }, 600);
        } catch (e) {
            setAuthAlert(e.message, 'danger');
            btn.disabled = false; btn.innerHTML = 'Login';
        }
    };

    window.doSignup = async function() {
        var email = document.getElementById('authEmail').value.trim();
        var password = document.getElementById('authPassword').value;
        var username = document.getElementById('authUsername') ? document.getElementById('authUsername').value.trim() : '';
        if (!email || !password || !username) { setAuthAlert('Fill in all fields', 'warning'); return; }
        var btn = document.getElementById('authBtn');
        btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Creating...';
        try {
            var result = await supabase.auth.signUp({ email: email, password: password, options: { data: { username: username } } });
            if (result.error) throw result.error;
            if (result.data.user) {
                await supabase.from('users').insert([{ id: result.data.user.id, email: email, username: username, display_name: username, is_creator: true }]);
            }
            setAuthAlert('Account created! Check your email, then login.', 'success');
            btn.disabled = false; btn.innerHTML = 'Create Account';
        } catch (e) {
            setAuthAlert(e.message, 'danger');
            btn.disabled = false; btn.innerHTML = 'Create Account';
        }
    };

    window.login = function() { showAuthModal('login'); };
    window.signup = function() { showAuthModal('signup'); };
    window.logout = async function() {
        await supabase.auth.signOut();
        currentUser = null;
        updateNavbar();
        showTab('library');
    };

    async function checkAuth() {
        var result = await supabase.auth.getSession();
        currentUser = result.data.session ? result.data.session.user : null;
        updateNavbar();
        if (currentUser) {
            var navCreator = document.getElementById('navCreatorLink');
            if (navCreator) navCreator.style.display = '';
        }
    }

    function updateNavbar() {
        var navBtns = document.querySelector('.navbar .d-flex');
        if (!navBtns) return;
        var creatorLink = document.getElementById('navCreatorLink');
        if (currentUser) {
            navBtns.innerHTML = '<span class="text-light me-2"><i class="fas fa-user-circle"></i> ' + (currentUser.user_metadata && currentUser.user_metadata.username ? currentUser.user_metadata.username : currentUser.email) + '</span>' +
                '<button class="btn btn-outline-light btn-sm" onclick="logout()">Logout</button>';
            if (creatorLink) creatorLink.style.display = '';
        } else {
            navBtns.innerHTML = '<button class="btn btn-outline-light me-2" onclick="login()">Login</button>' +
                '<button class="btn btn-primary" onclick="signup()">Sign Up</button>';
            if (creatorLink) creatorLink.style.display = 'none';
        }
    }

    // ---- Tabs ----
    window.showTab = function(name) {
        var tabs = ['library', 'myBooks', 'create', 'dashboard', 'reader'];
        tabs.forEach(function(t) {
            var el = document.getElementById(t);
            if (el) el.style.display = (t === name) ? '' : 'none';
        });
        document.querySelectorAll('.nav-reads .nav-link').forEach(function(el) { el.classList.remove('active'); });
        var activeLink = document.querySelector('.nav-reads .nav-link[onclick*="' + name + '"]');
        if (activeLink) activeLink.classList.add('active');

        if (name === 'library') loadLibrary();
        if (name === 'myBooks') loadMyBooks();
        if (name === 'create') resetCreateForm();
        if (name === 'dashboard') loadDashboard();
    };

    // ---- Library ----
    async function loadLibrary() {
        setLoading('bookGrid', 'Loading books...');
        try {
            var result = await supabase.from('reads_books').select('*, users(username, display_name)').eq('status', 'published').order('published_at', { ascending: false });
            if (result.error) throw result.error;
            allBooks = result.data || [];
            renderBooks(allBooks);
        } catch (e) {
            document.getElementById('bookGrid').innerHTML = '<div class="col-12"><div class="alert alert-danger">Error: ' + e.message + '</div></div>';
        }
    }

    function renderBooks(books) {
        var grid = document.getElementById('bookGrid');
        if (!grid) return;
        if (books.length === 0) {
            grid.innerHTML = '<div class="col-12 text-center"><div class="alert alert-info"><i class="fas fa-info-circle"></i> No books found.</div></div>';
            return;
        }
        var html = '';
        books.forEach(function(book) {
            var author = book.users ? (book.users.display_name || book.users.username) : 'Unknown';
            var cover = book.cover_filename || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300&h=450&fit=crop';
            var rating = book.rating ? book.rating.toFixed(1) : 'N/A';
            var words = book.word_count ? Math.floor(book.word_count / 1000) + 'k' : '0';
            html += '<div class="col-md-4 col-lg-3 mb-4">' +
                '<div class="card book-card h-100">' +
                '<img src="' + cover + '" class="card-img-top book-cover" alt="' + book.title + '">' +
                '<div class="card-body">' +
                '<h5 class="card-title">' + book.title + '</h5>' +
                '<p class="card-text text-muted small">by ' + author + '</p>' +
                '<div class="d-flex justify-content-between align-items-center mb-2">' +
                '<span class="badge bg-primary">' + (book.genre || 'General') + '</span>' +
                '<small class="text-muted">' + words + ' words</small></div>' +
                '<div class="d-flex justify-content-between align-items-center">' +
                '<div><i class="fas fa-star text-warning"></i> <small>' + rating + '</small></div>' +
                '<div><i class="fas fa-eye text-muted"></i> <small>' + (book.view_count || 0) + '</small></div></div></div>' +
                '<div class="card-footer bg-transparent border-top-0">' +
                '<button class="btn btn-outline-primary btn-sm w-100" onclick="openBook(\'' + book.id + '\')">' +
                '<i class="fas fa-book-open me-1"></i> Read</button></div></div></div>';
        });
        grid.innerHTML = html;
    }

    window.filterBooks = function() {
        var query = document.getElementById('searchBooks').value.toLowerCase();
        var genre = document.getElementById('genreFilter').value;
        var filtered = allBooks.filter(function(b) {
            var matchTitle = !query || (b.title && b.title.toLowerCase().indexOf(query) !== -1);
            var matchGenre = !genre || b.genre === genre;
            return matchTitle && matchGenre;
        });
        renderBooks(filtered);
    };

    // ---- Reader ----
    window.openBook = async function(bookId) {
        try {
            var result = await supabase.from('reads_books').select('*').eq('id', bookId).single();
            if (result.error) throw result.error;
            currentBook = result.data;

            var chResult = await supabase.from('reads_chapters').select('*').eq('book_id', bookId).eq('status', 'published').order('chapter_number', { ascending: true });
            if (chResult.error) throw chResult.error;
            chaptersList = chResult.data || [];

            if (chaptersList.length > 0) {
                currentChapter = chaptersList[0];
                renderChapter();
            } else {
                document.getElementById('readerContent').innerHTML = '<div class="alert alert-info">No chapters available yet.</div>';
            }

            document.querySelectorAll('section').forEach(function(s) { s.style.display = 'none'; });
            document.getElementById('reader').style.display = '';
            window.scrollTo(0, 0);
        } catch (e) {
            showError('Error opening book: ' + e.message);
        }
    };

    function renderChapter() {
        if (!currentChapter) return;
        var content = document.getElementById('readerContent');
        var navText = document.querySelector('#reader .text-center small');
        content.innerHTML = '<div class="text-center mb-4"><h2>' + currentChapter.title + '</h2><p class="text-muted">Chapter ' + currentChapter.chapter_number + '</p></div>' +
            '<div class="chapter-content">' + formatText(currentChapter.content) + '</div>';
        if (navText) navText.textContent = 'Chapter ' + currentChapter.chapter_number + ' of ' + chaptersList.length;

        // Update nav buttons
        var prevBtn = document.getElementById('prevChapter');
        var nextBtn = document.getElementById('nextChapter');
        if (prevBtn) prevBtn.disabled = currentChapter.chapter_number <= 1;
        if (nextBtn) nextBtn.disabled = currentChapter.chapter_number >= chaptersList.length;
    }

    function formatText(text) {
        if (!text) return '';
        return text.split('\n').map(function(p) {
            return p.trim() ? '<p>' + p + '</p>' : '<br>';
        }).join('');
    }

    window.prevChapter = function() {
        var idx = chaptersList.findIndex(function(c) { return c.id === currentChapter.id; });
        if (idx > 0) { currentChapter = chaptersList[idx - 1]; renderChapter(); window.scrollTo(0, 0); }
    };
    window.nextChapter = function() {
        var idx = chaptersList.findIndex(function(c) { return c.id === currentChapter.id; });
        if (idx < chaptersList.length - 1) { currentChapter = chaptersList[idx + 1]; renderChapter(); window.scrollTo(0, 0); }
    };
    window.closeReader = function() {
        document.getElementById('reader').style.display = 'none';
        showTab('library');
    };
    window.fontSmaller = function() { fontSize = Math.max(12, fontSize - 1); applyFontSize(); };
    window.fontLarger = function() { fontSize = Math.min(24, fontSize + 1); applyFontSize(); };
    window.fontReset = function() { fontSize = 16; applyFontSize(); };
    function applyFontSize() {
        var el = document.querySelector('.chapter-content');
        if (el) el.style.fontSize = fontSize + 'px';
    }
    window.toggleDarkMode = function() {
        isDarkMode = !isDarkMode;
        document.body.classList.toggle('bg-dark');
        document.body.classList.toggle('text-light');
        var rc = document.querySelector('.chapter-content');
        if (rc) rc.classList.toggle('text-light');
        var ctrl = document.querySelector('.reader-controls');
        if (ctrl) { ctrl.classList.toggle('bg-dark'); ctrl.classList.toggle('text-light'); }
    };
    window.toggleFullscreen = function() {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen();
        else document.exitFullscreen();
    };

    // ---- My Books ----
    async function loadMyBooks() {
        if (!currentUser) {
            document.getElementById('myBooksGrid').innerHTML = '<div class="col-12 text-center"><div class="alert alert-info">Please login to see your books.</div></div>';
            return;
        }
        setLoading('myBooksGrid', 'Loading your books...');
        try {
            var result = await supabase.from('reads_books').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false });
            if (result.error) throw result.error;
            myBooks = result.data || [];
            renderMyBooks();
        } catch (e) {
            document.getElementById('myBooksGrid').innerHTML = '<div class="col-12"><div class="alert alert-danger">Error: ' + e.message + '</div></div>';
        }
    }

    function renderMyBooks() {
        var grid = document.getElementById('myBooksGrid');
        if (!grid) return;
        if (myBooks.length === 0) {
            grid.innerHTML = '<div class="col-12 text-center"><div class="alert alert-info"><i class="fas fa-info-circle"></i> You have no books yet. Create one!</div></div>';
            return;
        }
        var html = '';
        myBooks.forEach(function(book) {
            var statusBadge = book.status === 'published' ? '<span class="badge bg-success">Published</span>' : '<span class="badge bg-warning">Draft</span>';
            html += '<div class="col-md-4 col-lg-3 mb-4">' +
                '<div class="card book-card h-100">' +
                '<div class="card-body">' +
                '<h5 class="card-title">' + book.title + '</h5>' +
                '<p class="text-muted small">' + (book.description ? book.description.substring(0, 80) + '...' : 'No description') + '</p>' +
                '<div class="mb-2">' + statusBadge + ' <span class="badge bg-secondary">' + (book.genre || 'General') + '</span></div>' +
                '<small class="text-muted">' + (book.chapter_count || 0) + ' chapters | ' + (book.word_count || 0) + ' words</small></div>' +
                '<div class="card-footer bg-transparent border-top-0 d-flex gap-2">' +
                '<button class="btn btn-outline-primary btn-sm flex-fill" onclick="editBook(\'' + book.id + '\')">Edit</button>' +
                '<button class="btn btn-outline-danger btn-sm" onclick="deleteBook(\'' + book.id + '\')">Delete</button></div></div></div>';
        });
        grid.innerHTML = html;
    }

    // ---- Create / Edit Book ----
    function resetCreateForm() {
        editingBookId = null;
        document.getElementById('createForm').reset();
        document.getElementById('createTitle').textContent = 'Create New Book';
        document.getElementById('chaptersSection').style.display = 'none';
        document.getElementById('chaptersList').innerHTML = '';
        document.getElementById('createAlert').innerHTML = '';
    }

    window.saveBook = async function() {
        if (!currentUser) { showError('Please login first'); return; }
        var title = document.getElementById('bookTitle').value.trim();
        var desc = document.getElementById('bookDesc').value.trim();
        var genre = document.getElementById('bookGenre').value;
        var price = parseFloat(document.getElementById('bookPrice').value) || 0;
        var lang = document.getElementById('bookLang').value;
        var tagsStr = document.getElementById('bookTags').value.trim();
        var status = document.getElementById('bookStatus').value;
        if (!title) { document.getElementById('createAlert').innerHTML = '<div class="alert alert-warning">Title is required</div>'; return; }

        var tags = tagsStr ? tagsStr.split(',').map(function(t) { return t.trim(); }).filter(function(t) { return t; }) : [];
        var data = {
            user_id: currentUser.id,
            title: title,
            description: desc,
            genre: genre,
            language: lang,
            tags: tags,
            price: price,
            status: status
        };
        if (status === 'published' && !editingBookId) data.published_at = new Date().toISOString();

        try {
            if (editingBookId) {
                var res = await supabase.from('reads_books').update(data).eq('id', editingBookId).select();
                if (res.error) throw res.error;
                showSuccess('Book updated!');
            } else {
                var res2 = await supabase.from('reads_books').insert([data]).select();
                if (res2.error) throw res2.error;
                editingBookId = res2.data[0].id;
                showSuccess('Book created! Now add chapters.');
                document.getElementById('createTitle').textContent = 'Edit Book';
                document.getElementById('chaptersSection').style.display = '';
                loadChaptersForEdit();
            }
            document.getElementById('createAlert').innerHTML = '';
        } catch (e) {
            document.getElementById('createAlert').innerHTML = '<div class="alert alert-danger">' + e.message + '</div>';
        }
    };

    window.editBook = async function(bookId) {
        editingBookId = bookId;
        try {
            var res = await supabase.from('reads_books').select('*').eq('id', bookId).single();
            if (res.error) throw res.error;
            var book = res.data;
            document.getElementById('bookTitle').value = book.title || '';
            document.getElementById('bookDesc').value = book.description || '';
            document.getElementById('bookGenre').value = book.genre || '';
            document.getElementById('bookPrice').value = book.price || '';
            document.getElementById('bookLang').value = book.language || 'en';
            document.getElementById('bookTags').value = book.tags ? book.tags.join(', ') : '';
            document.getElementById('bookStatus').value = book.status || 'draft';
            document.getElementById('createTitle').textContent = 'Edit Book';
            document.getElementById('chaptersSection').style.display = '';
            showTab('create');
            loadChaptersForEdit();
        } catch (e) {
            showError('Error loading book: ' + e.message);
        }
    };

    window.deleteBook = async function(bookId) {
        if (!confirm('Delete this book? This cannot be undone.')) return;
        try {
            await supabase.from('reads_chapters').delete().eq('book_id', bookId);
            await supabase.from('reads_books').delete().eq('id', bookId);
            showSuccess('Book deleted');
            loadMyBooks();
        } catch (e) {
            showError('Error: ' + e.message);
        }
    };

    // ---- Chapter Management ----
    async function loadChaptersForEdit() {
        if (!editingBookId) return;
        var list = document.getElementById('chaptersList');
        try {
            var res = await supabase.from('reads_chapters').select('*').eq('book_id', editingBookId).order('chapter_number', { ascending: true });
            if (res.error) throw res.error;
            var chapters = res.data || [];
            if (chapters.length === 0) {
                list.innerHTML = '<p class="text-muted">No chapters yet.</p>';
                return;
            }
            var html = '<div class="list-group">';
            chapters.forEach(function(ch) {
                var badge = ch.is_premium ? '<span class="badge bg-warning">Premium</span>' : '<span class="badge bg-success">Free</span>';
                html += '<div class="list-group-item d-flex justify-content-between align-items-center">' +
                    '<div><strong>Ch ' + ch.chapter_number + ':</strong> ' + ch.title + ' ' + badge + '</div>' +
                    '<div><button class="btn btn-sm btn-outline-primary" onclick="editChapter(\'' + ch.id + '\')">Edit</button> ' +
                    '<button class="btn btn-sm btn-outline-danger" onclick="deleteChapter(\'' + ch.id + '\')">Delete</button></div></div>';
            });
            html += '</div>';
            list.innerHTML = html;
        } catch (e) {
            list.innerHTML = '<div class="alert alert-danger">Error: ' + e.message + '</div>';
        }
    }

    window.showChapterForm = function() {
        document.getElementById('chapterForm').style.display = '';
        document.getElementById('chapterId').value = '';
        document.getElementById('chapterNumber').value = '';
        document.getElementById('chapterTitle').value = '';
        document.getElementById('chapterContent').value = '';
        document.getElementById('chapterPremium').checked = false;
    };

    window.hideChapterForm = function() {
        document.getElementById('chapterForm').style.display = 'none';
    };

    window.saveChapter = async function() {
        if (!editingBookId) return;
        var chId = document.getElementById('chapterId').value;
        var num = parseInt(document.getElementById('chapterNumber').value) || 1;
        var title = document.getElementById('chapterTitle').value.trim();
        var content = document.getElementById('chapterContent').value;
        var isPremium = document.getElementById('chapterPremium').checked;
        if (!title) { showError('Chapter title required'); return; }

        var wordCount = content ? content.split(/\s+/).length : 0;
        var data = {
            book_id: editingBookId,
            chapter_number: num,
            title: title,
            content: content,
            word_count: wordCount,
            is_premium: isPremium,
            status: 'published'
        };

        try {
            if (chId) {
                await supabase.from('reads_chapters').update(data).eq('id', chId);
            } else {
                await supabase.from('reads_chapters').insert([data]);
            }
            // Update book word_count and chapter_count
            var allCh = await supabase.from('reads_chapters').select('word_count').eq('book_id', editingBookId);
            var totalWords = 0;
            (allCh.data || []).forEach(function(c) { totalWords += c.word_count || 0; });
            await supabase.from('reads_books').update({ word_count: totalWords, chapter_count: (allCh.data || []).length }).eq('id', editingBookId);
            showSuccess('Chapter saved!');
            hideChapterForm();
            loadChaptersForEdit();
        } catch (e) {
            showError('Error: ' + e.message);
        }
    };

    window.editChapter = async function(chId) {
        try {
            var res = await supabase.from('reads_chapters').select('*').eq('id', chId).single();
            if (res.error) throw res.error;
            var ch = res.data;
            document.getElementById('chapterId').value = ch.id;
            document.getElementById('chapterNumber').value = ch.chapter_number;
            document.getElementById('chapterTitle').value = ch.title;
            document.getElementById('chapterContent').value = ch.content || '';
            document.getElementById('chapterPremium').checked = ch.is_premium;
            document.getElementById('chapterForm').style.display = '';
        } catch (e) {
            showError('Error: ' + e.message);
        }
    };

    window.deleteChapter = async function(chId) {
        if (!confirm('Delete this chapter?')) return;
        try {
            await supabase.from('reads_chapters').delete().eq('id', chId);
            showSuccess('Chapter deleted');
            loadChaptersForEdit();
        } catch (e) {
            showError('Error: ' + e.message);
        }
    };

    // ---- Dashboard ----
    async function loadDashboard() {
        if (!currentUser) {
            document.getElementById('dashStats').innerHTML = '<div class="alert alert-info">Please login to view your dashboard.</div>';
            return;
        }
        try {
            var booksRes = await supabase.from('reads_books').select('*').eq('user_id', currentUser.id);
            var books = booksRes.data || [];
            var totalReads = 0, totalEarnings = 0, totalRating = 0, ratingCount = 0;
            books.forEach(function(b) {
                totalReads += b.view_count || 0;
                totalEarnings += (b.price || 0) * (b.like_count || 0);
                if (b.rating_count > 0) { totalRating += b.rating; ratingCount++; }
            });
            var avgRating = ratingCount > 0 ? (totalRating / ratingCount).toFixed(1) : 'N/A';

            document.getElementById('dashBooks').textContent = books.length;
            document.getElementById('dashReads').textContent = totalReads;
            document.getElementById('dashEarnings').textContent = '\u20AC' + totalEarnings.toFixed(2);
            document.getElementById('dashRating').textContent = avgRating;

            var tbody = document.getElementById('dashBooksTable');
            if (books.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No books yet</td></tr>';
            } else {
                tbody.innerHTML = books.map(function(b) {
                    return '<tr><td>' + b.title + '</td><td><span class="badge ' + (b.status === 'published' ? 'bg-success' : 'bg-warning') + '">' + b.status + '</span></td>' +
                        '<td>' + (b.view_count || 0) + '</td><td>' + (b.chapter_count || 0) + '</td>' +
                        '<td>' + (b.rating ? b.rating.toFixed(1) : 'N/A') + '</td>' +
                        '<td><button class="btn btn-sm btn-outline-primary" onclick="editBook(\'' + b.id + '\')">Edit</button></td></tr>';
                }).join('');
            }
        } catch (e) {
            document.getElementById('dashStats').innerHTML = '<div class="alert alert-danger">Error: ' + e.message + '</div>';
        }
    }

    // ---- Init ----
    function main() {
        if (!initSupabase()) return;
        checkAuth();
        supabase.auth.onAuthStateChange(function(event, session) {
            currentUser = session ? session.user : null;
            updateNavbar();
        });
        showTab('library');

        // Event listeners for search/filter
        var searchInput = document.getElementById('searchBooks');
        if (searchInput) searchInput.addEventListener('input', window.filterBooks);
        var genreFilter = document.getElementById('genreFilter');
        if (genreFilter) genreFilter.addEventListener('change', window.filterBooks);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', main);
    } else {
        main();
    }
})();
