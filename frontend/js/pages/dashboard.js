/* ═══════════════════════════════════════════════════════════
   DASHBOARD.JS — Role-aware Dashboard page
   ═══════════════════════════════════════════════════════════ */

const DashboardPage = {
  render() {
    const isAdmin = App.currentUser?.role === 'admin';

    // Skeleton count: 4 for admin, 1 for supervisor
    const skeletonCount = isAdmin ? 4 : 1;

    return `
      <div class="page-header">
        <div class="page-header-left">
          <h1>Dashboard</h1>
          <p>${isAdmin
            ? "Welcome back, Admin! Here's your full logistics overview."
            : "Welcome back! Here are today's truck entries."}</p>
        </div>
        <div>
          <button class="btn btn-outline btn-sm" onclick="DashboardPage.load()">↻ Refresh</button>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="stats-grid" id="stats-grid">
        ${Array(skeletonCount).fill(0).map(() => `
          <div class="stat-card">
            <div class="stat-icon-wrapper blue"><div class="spinner" style="width:24px;height:24px;border-width:2px;"></div></div>
            <div class="stat-content">
              <div class="stat-label" style="background:var(--gray-100);width:80px;height:12px;border-radius:4px;"></div>
              <div style="background:var(--gray-200);width:60px;height:28px;border-radius:4px;margin-top:6px;"></div>
            </div>
          </div>
        `).join('')}
      </div>



      <!-- Recent Entries -->
      <div class="card animate-fadeup">
        <div class="card-header">
          <div>
            <div class="card-title">Recent Truck Entries</div>
            <div class="card-subtitle">Latest 10 entries across all operations</div>
          </div>
          <button class="btn btn-outline btn-sm" onclick="App.navigate('history')">View All →</button>
        </div>
        <div class="table-wrapper" id="recent-table">
          <div class="loading-state"><div class="spinner"></div><p>Loading entries...</p></div>
        </div>
      </div>
    `;
  },

  async load() {
    try {
      const data = await API.get('/api/reports/dashboard');
      this.renderStats(data);
      this.renderRecentTable(data.recentEntries);
    } catch (err) {
      Notify.error('Failed to load dashboard', err.message);
    }
  },

  renderStats(data) {
    const grid = document.getElementById('stats-grid');
    if (!grid) return;
    const isAdmin = App.currentUser?.role === 'admin';

    if (isAdmin) {
      // Full 4-card admin view
      grid.innerHTML = `
        <div class="stat-card animate-fadein">
          <div class="stat-icon-wrapper orange">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
          </div>
          <div class="stat-content">
            <div class="stat-label">Trucks Today</div>
            <div class="stat-value">${data.todayTrucks}</div>
            <div class="stat-sub">Active entries today</div>
          </div>
        </div>
        <div class="stat-card animate-fadein" style="animation-delay: 0.1s;">
          <div class="stat-icon-wrapper green">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          </div>
          <div class="stat-content">
            <div class="stat-label">This Week</div>
            <div class="stat-value">${data.weekEntries}</div>
            <div class="stat-sub">Entries this week</div>
          </div>
        </div>
        <div class="stat-card animate-fadein" style="animation-delay: 0.2s;">
          <div class="stat-icon-wrapper purple">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line><path d="M8 14h.01"></path><path d="M12 14h.01"></path><path d="M16 14h.01"></path><path d="M8 18h.01"></path><path d="M12 18h.01"></path><path d="M16 18h.01"></path></svg>
          </div>
          <div class="stat-content">
            <div class="stat-label">This Month</div>
            <div class="stat-value">${data.monthEntries}</div>
            <div class="stat-sub">Entries this month</div>
          </div>
        </div>
        <div class="stat-card animate-fadein" style="animation-delay: 0.3s;">
          <div class="stat-icon-wrapper blue">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg>
          </div>
          <div class="stat-content">
            <div class="stat-label">Total Quantity</div>
            <div class="stat-value">${formatQuantity(data.totalQuantity)}</div>
            <div class="stat-sub">kg moved this month</div>
          </div>
        </div>
      `;
    } else {
      // Supervisor view — only "Trucks Today"
      grid.innerHTML = `
        <div class="stat-card animate-fadein" style="max-width:320px;">
          <div class="stat-icon-wrapper orange">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
          </div>
          <div class="stat-content">
            <div class="stat-label">Trucks Today</div>
            <div class="stat-value">${data.todayTrucks}</div>
            <div class="stat-sub">Active entries today</div>
          </div>
        </div>
      `;
    }
  },

  renderRecentTable(entries) {
    const container = document.getElementById('recent-table');
    if (!container) return;

    if (!entries || entries.length === 0) {
      container.innerHTML = `<div class="empty-state">
        <p>No entries yet</p>
        <div class="text-sm">Add your first truck entry to get started.</div>
      </div>`;
      return;
    }

    container.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Truck Number</th>
            <th>Driver Name</th>
            <th>Transporter</th>
            <th>Material Type</th>
            <th>Quantity (kg)</th>
            <th>Entry Date &amp; Time</th>
          </tr>
        </thead>
        <tbody>
          ${entries.map(e => `
            <tr>
              <td><span class="td-truck">${e.truck_number}</span></td>
              <td class="td-driver">${e.driver_name}</td>
              <td style="font-size:0.8rem;color:var(--gray-600);">${e.transporter_name || '—'}</td>
              <td><span class="badge badge-${e.material_type.toLowerCase()}">${e.material_type}</span></td>
              <td class="td-qty">${e.quantity.toLocaleString()} kg</td>
              <td class="td-date">${formatDateTime(e.entry_time)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  },
};

// ── Helpers ────────────────────────────────────────────────────

function formatDateTime(dt) {
  if (!dt) return '—';
  const d = new Date(dt.replace(' ', 'T'));
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function formatQuantity(qty) {
  if (!qty) return '0';
  if (qty >= 1000) return (qty / 1000).toFixed(1) + 'k';
  return qty.toLocaleString();
}
