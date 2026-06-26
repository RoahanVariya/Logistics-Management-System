/* ═══════════════════════════════════════════════════════════
   APP.JS — Router, Auth Guard, RBAC, Global State
   ═══════════════════════════════════════════════════════════ */

// Pages only Admin can access
const ADMIN_ONLY_PAGES = ['reports', 'export'];

const App = {
  currentUser: null,
  currentPage: null,

  async init() {
    // Check authentication
    try {
      const data = await API.get('/api/auth/me');
      this.currentUser = data.user;
    } catch {
      window.location.href = '/';
      return;
    }

    // Initialize components
    Notify.init();
    Sidebar.init();
    this.updateUserUI();
    Sidebar.applyRoleVisibility(this.currentUser.role);
    this.startClock();

    // Navigate to default page
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    this.navigate(hash);

    // Listen for hash changes
    window.addEventListener('hashchange', () => {
      const page = window.location.hash.replace('#', '') || 'dashboard';
      this.navigate(page, false);
    });
  },

  updateUserUI() {
    const user = this.currentUser;
    if (!user) return;

    const nameEl   = document.getElementById('user-name');
    const roleEl   = document.getElementById('user-role');
    const avatarEl = document.getElementById('user-avatar');
    const badgeEl  = document.getElementById('role-badge');

    if (nameEl) nameEl.textContent = user.username;
    if (roleEl) roleEl.textContent = user.role === 'admin' ? 'Administrator' : 'Supervisor';
    if (avatarEl) avatarEl.textContent = user.username[0].toUpperCase();

    if (badgeEl) {
      badgeEl.textContent = user.role === 'admin' ? 'Admin' : 'Supervisor';
      badgeEl.className = `badge badge-${user.role}`;
    }
  },

  // ── RBAC check ────────────────────────────────────────────
  canAccess(page) {
    if (!this.currentUser) return false;
    if (this.currentUser.role === 'admin') return true;
    return !ADMIN_ONLY_PAGES.includes(page);
  },

  // ── Router ────────────────────────────────────────────────
  navigate(page, updateHash = true) {
    const allPages = ['dashboard', 'entry', 'history', 'reports', 'export'];
    if (!allPages.includes(page)) page = 'dashboard';

    // RBAC gate — supervisor cannot access restricted pages
    if (!this.canAccess(page)) {
      this.renderAccessDenied(page);
      return;
    }

    this.currentPage = page;
    if (updateHash) window.location.hash = page;

    Sidebar.setActive(page);

    const content = document.getElementById('page-content');
    if (!content) return;

    const pageMap = {
      dashboard: DashboardPage,
      entry:     EntryPage,
      history:   HistoryPage,
      reports:   ReportsPage,
      export:    ExportPage,
    };

    const pageObj = pageMap[page];
    if (!pageObj) return;

    content.innerHTML = pageObj.render();

    if (pageObj.load) {
      pageObj.load().catch(err => {
        console.error(`Failed to load page ${page}:`, err);
        Notify.error('Page Load Error', err.message);
      });
    }
  },

  // ── Access Denied Page ────────────────────────────────────
  renderAccessDenied(page) {
    // Clear hash so user isn't stuck on the restricted URL
    window.location.hash = 'dashboard';

    const content = document.getElementById('page-content');
    if (!content) return;

    const pageLabel = page.charAt(0).toUpperCase() + page.slice(1);

    content.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;min-height:60vh;">
        <div style="text-align:center;max-width:480px;padding:2.5rem;animation:fadeInUp 0.4s ease;">

          <!-- Icon -->
          <div style="width:90px;height:90px;background:linear-gradient(135deg,#FEE2E2,#FECACA);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.5rem;font-weight:900;color:#DC2626;margin:0 auto 1.5rem;">403</div>

          <!-- Heading -->
          <h1 style="font-size:1.625rem;font-weight:800;color:var(--gray-900);margin-bottom:0.5rem;">Access Denied</h1>
          <p style="font-size:1rem;color:var(--danger);font-weight:600;margin-bottom:1rem;">
            You do not have permission to access the <strong>${pageLabel}</strong> page.
          </p>
          <p style="font-size:0.875rem;color:var(--gray-500);line-height:1.7;margin-bottom:2rem;">
            This section is restricted to <strong>Admin</strong> accounts only.<br/>
            Please contact your administrator if you need access.
          </p>

          <!-- Permissions summary -->
          <div style="background:var(--gray-50);border:1px solid var(--gray-200);border-radius:var(--radius-lg);padding:1.25rem;margin-bottom:2rem;text-align:left;">
            <div style="font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--gray-500);margin-bottom:0.75rem;">Your Permissions (Supervisor)</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;font-size:0.8125rem;">
              <div style="color:var(--success);">Yes — Add Entries</div>
              <div style="color:var(--success);">Yes — Edit Entries</div>
              <div style="color:var(--success);">Yes — View Entries</div>
              <div style="color:var(--success);">Yes — Search Entries</div>
              <div style="color:var(--danger);">No — Delete Entries</div>
              <div style="color:var(--danger);">No — View Reports</div>
              <div style="color:var(--danger);">No — Export CSV/Excel</div>
              <div style="color:var(--danger);">No — User Management</div>
            </div>
          </div>

          <!-- Countdown + button -->
          <p style="font-size:0.875rem;color:var(--gray-500);margin-bottom:1rem;">
            Redirecting to Dashboard in <strong id="access-countdown">3</strong> seconds...
          </p>
          <button class="btn btn-primary" onclick="App.navigate('dashboard')" style="padding:0.75rem 2rem;">
            ← Go to Dashboard Now
          </button>
        </div>
      </div>
    `;

    // Countdown timer
    let count = 3;
    const timer = setInterval(() => {
      count--;
      const el = document.getElementById('access-countdown');
      if (el) el.textContent = count;
      if (count <= 0) {
        clearInterval(timer);
        App.navigate('dashboard');
      }
    }, 1000);
  },

  async logout() {
    if (!confirm('Are you sure you want to logout?')) return;
    try {
      await API.post('/api/auth/logout');
    } catch { /* ignore */ }
    sessionStorage.removeItem('lms_user');
    window.location.href = '/';
  },

  startClock() {
    const update = () => {
      const el = document.getElementById('header-datetime');
      if (el) {
        const now = new Date();
        el.textContent = now.toLocaleString('en-IN', {
          day: '2-digit', month: 'short',
          hour: '2-digit', minute: '2-digit', hour12: true,
        });
      }
    };
    update();
    setInterval(update, 60000);
  },
};

// ── Boot ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => App.init());
