/* ═══════════════════════════════════════════════════════════
   REPORTS.JS — Reports page with Chart.js charts
   ═══════════════════════════════════════════════════════════ */

const ReportsPage = {
  activeTab: 'daily',
  charts: {},

  render() {
    return `
      <div class="page-header">
        <div class="page-header-left">
          <h1>Reports &amp; Analytics</h1>
          <p>Detailed analysis of truck entries and material movement.</p>
        </div>
      </div>

      <div class="card animate-fadeup">
        <!-- Tabs -->
        <div class="tab-bar">
          <button class="tab-btn active" id="tab-daily" onclick="ReportsPage.switchTab('daily')">Daily Report</button>
          <button class="tab-btn" id="tab-weekly" onclick="ReportsPage.switchTab('weekly')">Weekly Report</button>
          <button class="tab-btn" id="tab-monthly" onclick="ReportsPage.switchTab('monthly')">Monthly Report</button>
        </div>

        <!-- Report Content -->
        <div id="report-content" style="padding:1.5rem;">
          <div class="loading-state"><div class="spinner"></div><p>Loading report...</p></div>
        </div>
      </div>
    `;
  },

  async load() {
    await this.loadReport('daily');
  },

  async switchTab(tab) {
    this.activeTab = tab;
    ['daily','weekly','monthly'].forEach(t => {
      document.getElementById(`tab-${t}`)?.classList.toggle('active', t === tab);
    });
    await this.loadReport(tab);
  },

  async loadReport(type) {
    const container = document.getElementById('report-content');
    if (!container) return;
    container.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading report...</p></div>';

    // Destroy old charts
    Object.values(this.charts).forEach(c => c?.destroy());
    this.charts = {};

    try {
      const data = await API.get(`/api/reports/${type}`);
      this.renderReport(type, data, container);
    } catch (err) {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>Failed to load report: ${err.message}</p></div>`;
    }
  },

  renderReport(type, data, container) {
    const { summary, byMaterial, byTransporter = [] } = data;
    const byTime = data.byHour || data.byDay || [];

    const typeLabels = { daily: 'Today', weekly: 'This Week', monthly: 'This Month' };
    const label = typeLabels[type];

    const timeLabel = type === 'daily' ? 'Hour of Day' : 'Date';

    container.innerHTML = `
      <!-- Summary Cards -->
      <div class="stats-grid" style="margin-bottom:1.5rem;">
        <div class="stat-card">
          <div class="stat-icon-wrapper orange">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
          </div>
          <div class="stat-content">
            <div class="stat-label">Total Trucks</div>
            <div class="stat-value">${summary.total_trucks || 0}</div>
            <div class="stat-sub">${label}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon-wrapper green">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg>
          </div>
          <div class="stat-content">
            <div class="stat-label">Total Quantity</div>
            <div class="stat-value">${formatQuantity(summary.total_quantity || 0)}</div>
            <div class="stat-sub">kg moved ${label.toLowerCase()}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon-wrapper orange">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
          </div>
          <div class="stat-content">
            <div class="stat-label">Material Types</div>
            <div class="stat-value">${byMaterial.length}</div>
            <div class="stat-sub">distinct materials</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon-wrapper purple">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
          </div>
          <div class="stat-content">
            <div class="stat-label">Avg Per Entry</div>
            <div class="stat-value">${summary.total_trucks ? Math.round(summary.total_quantity / summary.total_trucks).toLocaleString() : 0}</div>
            <div class="stat-sub">kg per truck</div>
          </div>
        </div>
      </div>

      <!-- Charts Row -->
      <div style="display:grid;grid-template-columns:1.5fr 1fr;gap:1.5rem;margin-bottom:1.5rem;" id="charts-row">
        <!-- Bar Chart -->
        <div class="card">
          <div class="card-header">
            <div class="card-title"> ${timeLabel} Breakdown</div>
          </div>
          <div class="chart-container">
            <div class="chart-wrapper">
              <canvas id="chart-timeline"></canvas>
            </div>
          </div>
        </div>

        <!-- Doughnut Chart -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">Material Distribution</div>
          </div>
          <div class="chart-container">
            <div class="chart-wrapper">
              <canvas id="chart-material"></canvas>
            </div>
          </div>
        </div>
      </div>

      <!-- Material Table -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">Material-wise Summary</div>
          <div class="card-subtitle">${label}</div>
        </div>
        <div class="table-wrapper">
          ${byMaterial.length === 0
            ? `<div class="empty-state"><div class="empty-icon" style="font-size:1.5rem;font-weight:300;">--</div><p>No data for this period.</p></div>`
            : `<table>
              <thead>
                <tr>
                  <th>Material Type</th>
                  <th>No. of Trucks</th>
                  <th>Total Quantity (kg)</th>
                  <th>Share %</th>
                  <th>Progress</th>
                </tr>
              </thead>
              <tbody>
                ${byMaterial.map(m => {
                  const pct = summary.total_quantity ? ((m.quantity / summary.total_quantity) * 100).toFixed(1) : 0;
                  return `<tr>
                    <td><span class="badge badge-${m.material_type.toLowerCase()}">${m.material_type}</span></td>
                    <td class="td-qty">${m.count}</td>
                    <td class="td-qty">${m.quantity.toLocaleString()} kg</td>
                    <td style="font-weight:600;">${pct}%</td>
                    <td style="min-width:120px;">
                      <div style="height:8px;background:var(--gray-200);border-radius:4px;overflow:hidden;">
                        <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,var(--primary),#60A5FA);border-radius:4px;transition:width 0.6s ease;"></div>
                      </div>
                    </td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>`
          }
        </div>
      </div>

      <!-- Transporter Summary Table -->
      <div class="card" style="margin-top:1.5rem;">
        <div class="card-header">
          <div class="card-title">Transporter-wise Summary</div>
          <div class="card-subtitle">${label}</div>
        </div>
        <div class="table-wrapper">
          ${byTransporter.length === 0
            ? `<div class="empty-state"><div class="empty-icon" style="font-size:1.5rem;font-weight:300;">--</div><p>No transporter data for this period.</p></div>`
            : `<table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Transporter Name</th>
                  <th>Deliveries</th>
                  <th>Total Quantity (kg)</th>
                  <th>Share %</th>
                  <th>Progress</th>
                </tr>
              </thead>
              <tbody>
                ${byTransporter.map((t, i) => {
                  const pct = summary.total_trucks ? ((t.deliveries / summary.total_trucks) * 100).toFixed(1) : 0;
                  return `<tr>
                    <td style="color:var(--gray-400);font-size:0.8rem;">${i + 1}</td>
                    <td style="font-weight:600;color:var(--navy);">
                      <span style="display:inline-flex;align-items:center;gap:0.4rem;">${t.transporter_name}</span>
                    </td>
                    <td class="td-qty">
                      <span style="display:inline-flex;align-items:center;gap:0.4rem;">
                        <span style="font-size:1rem;font-weight:800;color:var(--primary);">${t.deliveries}</span>
                        <span style="font-size:0.75rem;color:var(--gray-500);">deliveries</span>
                      </span>
                    </td>
                    <td class="td-qty">${t.quantity.toLocaleString()} kg</td>
                    <td style="font-weight:600;">${pct}%</td>
                    <td style="min-width:140px;">
                      <div style="height:8px;background:var(--gray-200);border-radius:4px;overflow:hidden;">
                        <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#8B5CF6,#C4B5FD);border-radius:4px;transition:width 0.6s ease;"></div>
                      </div>
                    </td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>`
          }
        </div>
      </div>
    `;

    // Responsive charts grid
    if (window.innerWidth < 768) {
      const chartsRow = document.getElementById('charts-row');
      if (chartsRow) chartsRow.style.gridTemplateColumns = '1fr';
    }

    // Render Charts
    setTimeout(() => {
      this.renderTimelineChart(type, byTime);
      this.renderMaterialChart(byMaterial);
    }, 100);
  },

  renderTimelineChart(type, byTime) {
    const canvas = document.getElementById('chart-timeline');
    if (!canvas || !byTime.length) return;

    const labels = byTime.map(r => {
      if (type === 'daily') return `${r.hour}:00`;
      return new Date(r.day).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    });

    this.charts.timeline = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Trucks',
            data: byTime.map(r => r.count),
            backgroundColor: 'rgba(250, 131, 23, 0.75)',
            borderColor: '#FA8317',
            borderWidth: 1,
            borderRadius: 4,
            yAxisID: 'y',
          },
          {
            label: 'Quantity (kg)',
            data: byTime.map(r => r.quantity),
            type: 'line',
            borderColor: '#6366F1',
            backgroundColor: 'rgba(99, 102, 241, 0.08)',
            borderWidth: 2.5,
            pointRadius: 4.5,
            pointBackgroundColor: '#6366F1',
            fill: true,
            yAxisID: 'y1',
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'top', labels: { font: { family: 'Inter', size: 11 }, padding: 16 } },
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { family: 'Inter', size: 10 } } },
          y: { position: 'left', title: { display: true, text: 'Trucks', font: { size: 10 } }, ticks: { font: { size: 10 } } },
          y1: { position: 'right', title: { display: true, text: 'Quantity (kg)', font: { size: 10 } }, grid: { drawOnChartArea: false }, ticks: { font: { size: 10 } } },
        },
      },
    });
  },

  renderMaterialChart(byMaterial) {
    const canvas = document.getElementById('chart-material');
    if (!canvas || !byMaterial.length) return;

    const palette = ['#FA8317', '#6366F1', '#10B981', '#F59E0B', '#EC4899', '#06B6D4'];

    this.charts.material = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: byMaterial.map(m => m.material_type),
        datasets: [{
          data: byMaterial.map(m => m.quantity),
          backgroundColor: palette.slice(0, byMaterial.length),
          borderWidth: 2,
          borderColor: '#fff',
          hoverOffset: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            position: 'right',
            labels: {
              font: { family: 'Inter', size: 11 },
              padding: 12,
              usePointStyle: true,
            },
          },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${ctx.raw.toLocaleString()} kg`,
            },
          },
        },
      },
    });
  },
};
