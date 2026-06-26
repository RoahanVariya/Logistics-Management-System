/* ═══════════════════════════════════════════════════════════
   SIDEBAR.JS — Sidebar navigation, collapse, RBAC visibility
   ═══════════════════════════════════════════════════════════ */

const Sidebar = {
  sidebar: null,
  toggle: null,
  mobileToggle: null,
  overlay: null,
  collapsed: false,

  init() {
    this.sidebar = document.getElementById('sidebar');
    this.toggle  = document.getElementById('sidebar-toggle');
    this.mobileToggle = document.getElementById('mobile-toggle');
    this.overlay = document.getElementById('mobile-overlay');

    // Desktop collapse toggle
    if (this.toggle) {
      this.toggle.addEventListener('click', () => this.toggleCollapse());
    }

    // Mobile toggle
    if (this.mobileToggle) {
      this.mobileToggle.addEventListener('click', () => this.toggleMobile());
    }

    // Close on overlay click
    if (this.overlay) {
      this.overlay.addEventListener('click', () => this.closeMobile());
    }

    // Nav item clicks — only bind visible items
    document.querySelectorAll('.nav-item[data-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        const page = btn.dataset.page;
        App.navigate(page);
        this.closeMobile();
      });
    });

    // Logout
    const logoutBtn = document.getElementById('nav-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => App.logout());
    }
  },

  // ── Role-Based Visibility ────────────────────────────────────
  applyRoleVisibility(role) {
    // Items only admins can see
    const adminOnlyIds = ['nav-reports', 'nav-export', 'nav-section-analytics'];

    adminOnlyIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.style.display = role === 'admin' ? '' : 'none';
      }
    });

    // Add a visual role indicator strip to the sidebar brand
    const brand = document.querySelector('.sidebar-brand');
    if (brand && !document.getElementById('role-strip')) {
      const strip = document.createElement('div');
      strip.id = 'role-strip';
      strip.style.cssText = `
        margin: 0 0.75rem 0.5rem;
        padding: 0.35rem 0.75rem;
        border-radius: 6px;
        font-size: 0.7rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        text-align: center;
        ${role === 'admin'
          ? 'background: rgba(255,255,255,0.08); color: #E5E7EB; border: 1px solid rgba(255,255,255,0.15);'
          : 'background: rgba(16,185,129,0.15); color: #34D399; border: 1px solid rgba(16,185,129,0.25);'}
      `;
      strip.textContent = role === 'admin' ? 'Admin Access' : 'Supervisor Access';
      brand.insertAdjacentElement('afterend', strip);
    }
  },

  setActive(page) {
    document.querySelectorAll('.nav-item[data-page]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.page === page);
    });
    const titles = {
      dashboard: 'Dashboard',
      entry: 'Truck Entry',
      history: 'Entry History',
      reports: 'Reports',
      export: 'Export Data',
    };
    const titleEl = document.getElementById('page-title');
    if (titleEl) titleEl.textContent = titles[page] || page;
  },

  toggleCollapse() {
    this.collapsed = !this.collapsed;
    this.sidebar.classList.toggle('collapsed', this.collapsed);
    const icon = this.toggle;
    icon.textContent = this.collapsed ? '▶' : '◀';
    icon.classList.toggle('collapsed', this.collapsed);
  },

  toggleMobile() {
    const isOpen = this.sidebar.classList.contains('mobile-open');
    if (isOpen) this.closeMobile();
    else this.openMobile();
  },

  openMobile() {
    this.sidebar.classList.add('mobile-open');
    this.overlay.classList.add('visible');
    document.body.style.overflow = 'hidden';
  },

  closeMobile() {
    this.sidebar.classList.remove('mobile-open');
    this.overlay.classList.remove('visible');
    document.body.style.overflow = '';
  },
};
