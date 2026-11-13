// server/statusRenderer.js - 관리자 Status 대시보드 및 인증 화면 HTML 렌더러
const { formatKST, formatDuration } = require('./historyLogger');

/**
 * 🔒 Status 접근 비밀번호 입력 화면 렌더링
 */
function renderStatusLogin({ error = null, attemptsLeft = 5, blocked = false, remainingHours = 24 } = {}) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BeautyCall Status - Restricted Access</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background: radial-gradient(circle at 50% 20%, #1a1530 0%, #0d0e15 65%, #050608 100%);
      color: #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
    }
    .login-card {
      background: rgba(22, 24, 38, 0.88);
      backdrop-filter: blur(24px);
      border: 1px solid rgba(255, 45, 120, 0.25);
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.7), 0 0 40px rgba(255, 45, 120, 0.12);
      border-radius: 24px;
      padding: 42px 36px;
      max-width: 440px;
      width: 100%;
      text-align: center;
    }
    .lock-badge {
      width: 72px;
      height: 72px;
      margin: 0 auto 20px;
      background: linear-gradient(135deg, rgba(255, 45, 120, 0.2), rgba(168, 85, 247, 0.2));
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 34px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.4);
    }
    h1 {
      font-size: 24px;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 8px;
    }
    p.sub {
      font-size: 14px;
      color: #94a3b8;
      line-height: 1.5;
      margin-bottom: 28px;
    }
    .form-group {
      margin-bottom: 20px;
      text-align: left;
    }
    .form-group label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: #cbd5e1;
      margin-bottom: 8px;
    }
    .input-wrapper {
      position: relative;
    }
    input[type="password"] {
      width: 100%;
      background: rgba(13, 14, 23, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 12px;
      padding: 14px 18px;
      font-size: 15px;
      color: #ffffff;
      outline: none;
      transition: all 0.2s ease;
      font-family: inherit;
    }
    input[type="password"]:focus {
      border-color: #ff2d78;
      box-shadow: 0 0 0 3px rgba(255, 45, 120, 0.25);
    }
    .submit-btn {
      width: 100%;
      background: linear-gradient(135deg, #ff2d78, #a855f7);
      border: none;
      color: #ffffff;
      font-size: 15px;
      font-weight: 700;
      padding: 14px 20px;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 8px 20px rgba(255, 45, 120, 0.35);
    }
    .submit-btn:hover {
      opacity: 0.95;
      transform: translateY(-1px);
    }
    .error-box {
      margin-bottom: 18px;
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.35);
      color: #fca5a5;
      padding: 12px 14px;
      border-radius: 10px;
      font-size: 13px;
      line-height: 1.4;
      display: flex;
      align-items: center;
      gap: 8px;
      text-align: left;
    }
    .warning-note {
      margin-top: 20px;
      padding: 12px;
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.25);
      border-radius: 10px;
      font-size: 12px;
      color: #fcd34d;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="login-card">
    <div class="lock-badge">🛡️</div>
    <h1>System Status & Logs</h1>
    <p class="sub">This dashboard is protected by security access key. Enter the key to proceed.</p>

    ${error ? `<div class="error-box"><span>⚠️</span> <span>${error}</span></div>` : ''}

    <form method="POST" action="/status">
      <div class="form-group">
        <label for="passwordInput">Security Access Key</label>
        <div class="input-wrapper">
          <input type="password" id="passwordInput" name="key" placeholder="Enter security key" autofocus required />
        </div>
      </div>
      <button type="submit" class="submit-btn">Unlock Status Dashboard</button>
    </form>

    <div class="warning-note">
      ⚠️ <strong>Warning:</strong> 5 consecutive incorrect attempts will block access for 24 hours. (Remaining: ${attemptsLeft})
    </div>
  </div>
</body>
</html>`;
}

/**
 * 📊 실시간 Status & 접속 이력 대시보드 HTML 렌더링
 */
function renderStatusDashboard({ activeRooms = {}, history = [], uptime = 0, serverTime = Date.now(), accessKey = '' }) {
  // 활성 룸 & 사용자 집계
  const roomIds = Object.keys(activeRooms);
  let totalActiveUsers = 0;
  const activeUserList = [];

  roomIds.forEach(roomId => {
    const roomUsers = activeRooms[roomId] || {};
    Object.keys(roomUsers).forEach(socketId => {
      totalActiveUsers++;
      const user = roomUsers[socketId];
      const durationMs = Date.now() - (user.joinedAt || Date.now());
      activeUserList.push({
        socketId,
        nickname: user.nickname || 'Unknown',
        roomId,
        ip: user.ip || 'unknown',
        joinedAt: user.joinedAt,
        joinedAtFormatted: formatKST(user.joinedAt),
        durationText: formatDuration(durationMs),
        isScreenSharing: !!user.isScreenSharing
      });
    });
  });

  const uptimeText = formatDuration(uptime);
  const currentTimeKST = formatKST(serverTime);

  // 세션 테이블 행 렌더링
  let activeUsersRows = '';
  if (activeUserList.length === 0) {
    activeUsersRows = `<tr><td colspan="6" class="empty-state">No users are currently active in any room.</td></tr>`;
  } else {
    activeUsersRows = activeUserList.map(u => `
      <tr>
        <td><strong class="user-name">${escapeHtml(u.nickname)}</strong></td>
        <td><span class="badge room-badge">${escapeHtml(u.roomId)}</span></td>
        <td><span class="ip-text">${escapeHtml(u.ip)}</span></td>
        <td>${u.joinedAtFormatted}</td>
        <td><span class="badge duration-badge">${u.durationText}</span></td>
        <td>
          ${u.isScreenSharing ? '<span class="status-pill screen">🎬 Sharing Screen</span>' : '<span class="status-pill live">🟢 In Call</span>'}
        </td>
      </tr>
    `).join('');
  }

  // 접속 이력 행 렌더링 (최신 100건 표시)
  let historyRows = '';
  if (history.length === 0) {
    historyRows = `<tr><td colspan="7" class="empty-state">No connection history logged yet.</td></tr>`;
  } else {
    historyRows = history.map(h => {
      const isJoin = h.type === 'JOIN';
      return `
        <tr>
          <td>
            <span class="type-pill ${isJoin ? 'join' : 'leave'}">
              ${isJoin ? '🟢 JOIN' : '🔴 LEAVE'}
            </span>
          </td>
          <td><strong>${escapeHtml(h.nickname)}</strong></td>
          <td><span class="badge room-badge">${escapeHtml(h.roomId)}</span></td>
          <td><span class="ip-text">${escapeHtml(h.ip)}</span></td>
          <td>${h.formattedTime || formatKST(h.timestamp)}</td>
          <td><span class="badge ${isJoin ? 'none-badge' : 'duration-badge'}">${h.durationText || '-'}</span></td>
          <td><code class="socket-id">${h.socketId ? h.socketId.substring(0, 8) + '...' : '-'}</code></td>
        </tr>
      `;
    }).join('');
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BeautyCall Server Status & Logs</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0c0d14;
      --card-bg: rgba(20, 22, 34, 0.85);
      --card-border: rgba(255, 255, 255, 0.08);
      --primary: #ff2d78;
      --primary-gradient: linear-gradient(135deg, #ff2d78, #a855f7);
      --accent-green: #10b981;
      --accent-red: #ef4444;
      --text: #f1f5f9;
      --text-muted: #94a3b8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background: radial-gradient(circle at 50% 0%, #1c1830 0%, #0c0d14 70%);
      color: var(--text);
      min-height: 100vh;
      padding: 30px 20px 60px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    header.dashboard-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 16px;
      margin-bottom: 28px;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--card-border);
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .brand-icon {
      width: 48px;
      height: 48px;
      background: var(--primary-gradient);
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      box-shadow: 0 8px 20px rgba(255, 45, 120, 0.35);
    }
    .brand h1 {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.5px;
    }
    .brand p {
      font-size: 13px;
      color: var(--text-muted);
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.2s ease;
      border: none;
    }
    .btn-primary {
      background: var(--primary-gradient);
      color: #ffffff;
      box-shadow: 0 4px 15px rgba(255, 45, 120, 0.3);
    }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.08);
      color: #e2e8f0;
      border: 1px solid rgba(255, 255, 255, 0.12);
    }
    .btn:hover {
      opacity: 0.92;
      transform: translateY(-1px);
    }

    /* Stats bar */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-bottom: 28px;
    }
    .stat-card {
      background: var(--card-bg);
      backdrop-filter: blur(16px);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 20px;
    }
    .stat-label {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-muted);
      margin-bottom: 8px;
    }
    .stat-value {
      font-size: 26px;
      font-weight: 800;
      color: #ffffff;
    }
    .stat-sub {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 4px;
    }

    /* Card & Tables */
    .section-card {
      background: var(--card-bg);
      backdrop-filter: blur(16px);
      border: 1px solid var(--card-border);
      border-radius: 18px;
      padding: 24px;
      margin-bottom: 30px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
    }
    .section-title {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 18px;
    }
    .section-title h2 {
      font-size: 17px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .count-pill {
      background: rgba(255, 45, 120, 0.15);
      border: 1px solid rgba(255, 45, 120, 0.3);
      color: #ff6b81;
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
    }

    .table-container {
      overflow-x: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 13px;
    }
    th {
      padding: 12px 14px;
      background: rgba(255, 255, 255, 0.03);
      color: var(--text-muted);
      font-weight: 600;
      border-bottom: 1px solid var(--card-border);
      white-space: nowrap;
    }
    td {
      padding: 14px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      color: #cbd5e1;
      vertical-align: middle;
      white-space: nowrap;
    }
    tr:hover td {
      background: rgba(255, 255, 255, 0.02);
    }
    .empty-state {
      text-align: center;
      padding: 36px 16px;
      color: var(--text-muted);
      font-style: italic;
    }

    /* Badges & Pills */
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
    }
    .room-badge {
      background: rgba(99, 102, 241, 0.15);
      border: 1px solid rgba(99, 102, 241, 0.3);
      color: #818cf8;
      font-family: 'JetBrains Mono', monospace;
    }
    .duration-badge {
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.25);
      color: #34d399;
      font-family: 'JetBrains Mono', monospace;
    }
    .none-badge {
      color: #64748b;
    }
    .ip-text {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      color: #94a3b8;
    }
    .socket-id {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: #64748b;
    }
    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
    }
    .status-pill.live {
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    .status-pill.screen {
      background: rgba(236, 72, 153, 0.15);
      color: #f472b6;
      border: 1px solid rgba(236, 72, 153, 0.3);
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }
    .type-pill {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    .type-pill.join {
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    .type-pill.leave {
      background: rgba(239, 68, 68, 0.15);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }
    .auto-refresh-tag {
      font-size: 12px;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 8px #10b981;
      display: inline-block;
      animation: blink 1.5s infinite;
    }
    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }
  </style>
  <meta http-equiv="refresh" content="10">
</head>
<body>
  <div class="container">
    <header class="dashboard-header">
      <div class="brand">
        <div class="brand-icon">✨</div>
        <div>
          <h1>BeautyCall Status Dashboard</h1>
          <p>Real-time active sessions & persistent file-based connection history</p>
        </div>
      </div>
      <div class="header-actions">
        <div class="auto-refresh-tag">
          <span class="dot"></span> Auto-refreshes every 10s
        </div>
        <a href="/status?key=${encodeURIComponent(accessKey)}" class="btn btn-secondary">🔄 Refresh</a>
        <a href="/api/status/export?key=${encodeURIComponent(accessKey)}" class="btn btn-primary" download="connection_history.json">💾 Export JSON</a>
      </div>
    </header>

    <!-- Stat boxes -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Online Users</div>
        <div class="stat-value">${totalActiveUsers}</div>
        <div class="stat-sub">Across ${roomIds.length} active room${roomIds.length === 1 ? '' : 's'}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Active Rooms</div>
        <div class="stat-value">${roomIds.length}</div>
        <div class="stat-sub">Max 4 users per room</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Server Uptime</div>
        <div class="stat-value">${uptimeText}</div>
        <div class="stat-sub">Started at server boot</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Current Server Time</div>
        <div class="stat-value" style="font-size: 16px; font-family: 'JetBrains Mono', monospace; padding-top: 6px;">${currentTimeKST}</div>
        <div class="stat-sub">Korean Standard Time (KST)</div>
      </div>
    </div>

    <!-- Active Sessions -->
    <div class="section-card">
      <div class="section-title">
        <h2>🟢 Real-time Active Sessions <span class="count-pill">${totalActiveUsers} online</span></h2>
      </div>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Nickname</th>
              <th>Room ID</th>
              <th>IP Address</th>
              <th>Joined At (KST)</th>
              <th>Duration</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${activeUsersRows}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Connection History -->
    <div class="section-card">
      <div class="section-title">
        <h2>📜 Connection History (Logs) <span class="count-pill">${history.length} records</span></h2>
        <span style="font-size: 12px; color: var(--text-muted);">Recorded to <code>server/data/connection_history.json</code> (No DB)</span>
      </div>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Event</th>
              <th>Nickname</th>
              <th>Room ID</th>
              <th>IP Address</th>
              <th>Timestamp (KST)</th>
              <th>Stay Duration</th>
              <th>Socket ID</th>
            </tr>
          </thead>
          <tbody>
            ${historyRows}
          </tbody>
        </table>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

module.exports = {
  renderStatusLogin,
  renderStatusDashboard
};
