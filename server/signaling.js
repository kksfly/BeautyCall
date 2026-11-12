// Socket.io 시그널링 서버 및 원격 필터 관리자 & 웹 정적 파일 서버
const http = require('http');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3500;
const MAX_USERS_PER_ROOM = 4;

// 🔒 보안 설정 (지인 4인 전용 비공개 액세스 키 및 무차별 대입 방어)
const ACCESS_KEY = process.env.APP_ACCESS_KEY || 'danicajoy';
const MAX_ATTEMPTS = 5;
const BLOCK_DURATION_MS = 24 * 60 * 60 * 1000; // 24시간 (하루 동안 차단)

// IP별 실패 횟수 및 차단 관리 Map: ip -> { attempts: number, blockedUntil: number }
const ipTracker = new Map();

/**
 * 프록시(Render 등)를 고려한 실제 클라이언트 IP 추출
 */
function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

/**
 * IP 차단 상태 검사
 */
function checkIpBlocked(ip) {
  const info = ipTracker.get(ip);
  if (!info) return { blocked: false, attempts: 0 };

  if (info.blockedUntil) {
    if (Date.now() < info.blockedUntil) {
      const remainingMs = info.blockedUntil - Date.now();
      const remainingHours = Math.ceil(remainingMs / (1000 * 60 * 60));
      return { blocked: true, remainingHours, remainingMs, attempts: info.attempts || MAX_ATTEMPTS };
    } else {
      // 24시간 만료 시 초기화
      ipTracker.delete(ip);
      return { blocked: false, attempts: 0 };
    }
  }

  return { blocked: false, attempts: info.attempts || 0 };
}

/**
 * 24시간 차단 시 브라우저에 표시할 에러 HTML
 */
function renderBlockedHtml(remainingHours) {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>접속 차단됨 - BeautyCall</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: radial-gradient(circle at 50% 20%, #1e132b, #0d0e14 70%);
      color: #f1f2f6;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
    }
    .card {
      background: rgba(26, 29, 45, 0.95);
      border: 1px solid rgba(255, 71, 87, 0.4);
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(255, 71, 87, 0.15);
      border-radius: 20px;
      padding: 40px 32px;
      max-width: 460px;
      width: 100%;
      text-align: center;
    }
    .icon { font-size: 56px; margin-bottom: 16px; }
    h1 { font-size: 24px; color: #ff4757; margin-bottom: 14px; font-weight: 700; }
    p { font-size: 15px; color: #a4b0be; line-height: 1.6; margin-bottom: 20px; word-break: keep-all; }
    .badge {
      display: inline-block;
      background: rgba(255, 71, 87, 0.15);
      border: 1px solid rgba(255, 71, 87, 0.3);
      color: #ff6b81;
      padding: 10px 20px;
      border-radius: 30px;
      font-size: 14px;
      font-weight: 600;
    }
    .footer-note {
      margin-top: 24px;
      font-size: 12px;
      color: #57606f;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">⛔</div>
    <h1>접속이 차단되었습니다</h1>
    <p>비밀번호를 <strong>5회 이상</strong> 잘못 입력하여 보안 정책에 따라 <strong>24시간 동안</strong> 이 기기의 모든 접속이 차단되었습니다.</p>
    <div class="badge">차단 해제까지 남은 시간: 약 ${remainingHours}시간</div>
    <div class="footer-note">BeautyCall Private Security Shield</div>
  </div>
</body>
</html>`;
}

// MIME 타입 매핑 테이블
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.map': 'application/json'
};

// 🎨 중앙 관리 필터 설정 (서버에서 추가/수정 시 모든 클라이언트에 실시간 동기화)
const FILTERS_CONFIG = {
  version: '1.2.0',
  basic: [
    {
      id: 'none',
      name: 'Original',
      settings: {
        smoothing: 0, brightness: 100, contrast: 100, saturation: 100,
        rosyTint: 0, eyeBrighten: 0, blush: 0, lipTint: 0, eyeliner: 0, highlighter: 0
      }
    },
    {
      id: 'smooth',
      name: '🌸 Smooth',
      settings: {
        smoothing: 70, brightness: 110, contrast: 102, saturation: 106,
        rosyTint: 25, eyeBrighten: 0, blush: 0, lipTint: 0, eyeliner: 0, highlighter: 0
      }
    },
    {
      id: 'kbeauty',
      name: '✨ K-Beauty',
      settings: {
        smoothing: 80, brightness: 114, contrast: 100, saturation: 104,
        rosyTint: 20, eyeBrighten: 35, blush: 35, lipTint: 45, eyeliner: 0, highlighter: 0
      }
    },
    {
      id: 'glamour',
      name: '💄 Glamour',
      settings: {
        smoothing: 75, brightness: 112, contrast: 104, saturation: 110,
        rosyTint: 15, eyeBrighten: 40, blush: 50, lipTint: 60, eyeliner: 0, highlighter: 0
      }
    },
    {
      id: 'warm',
      name: '☀️ Warm',
      settings: {
        smoothing: 50, brightness: 106, contrast: 104, saturation: 115,
        rosyTint: 30, eyeBrighten: 0, blush: 25, lipTint: 25, eyeliner: 0, highlighter: 0
      }
    },
    {
      id: 'cool',
      name: '❄️ Cool',
      settings: {
        smoothing: 70, brightness: 114, contrast: 100, saturation: 98,
        rosyTint: 15, eyeBrighten: 0, blush: 20, lipTint: 30, eyeliner: 0, highlighter: 0
      }
    },
    {
      id: 'vintage',
      name: '🎞️ Vintage',
      settings: {
        smoothing: 40, brightness: 102, contrast: 112, saturation: 85,
        rosyTint: 10, eyeBrighten: 0, blush: 0, lipTint: 0, eyeliner: 0, highlighter: 0
      }
    },
    {
      id: 'monochrome',
      name: '🖤 Mono',
      settings: {
        smoothing: 60, brightness: 105, contrast: 115, saturation: 0,
        rosyTint: 0, eyeBrighten: 0, blush: 0, lipTint: 0, eyeliner: 0, highlighter: 0
      }
    }
  ],
  special: [
    {
      id: 'poop',
      name: '💩 Poop on Head',
      desc: 'Flawless beauty skin + a cute funny poop on your head tracking your movement!',
      specialType: 'poop',
      settings: {
        smoothing: 82, brightness: 114, contrast: 103, saturation: 112,
        rosyTint: 20, eyeBrighten: 45, blush: 65, lipTint: 70
      }
    },
    {
      id: 'catEars',
      name: '🐱 Cute Kitty',
      desc: 'Porcelain skin + adorable pink cat ears, whiskers and jelly nose.',
      specialType: 'catEars',
      settings: {
        smoothing: 85, brightness: 116, contrast: 102, saturation: 110,
        rosyTint: 25, eyeBrighten: 50, blush: 60, lipTint: 65
      }
    },
    {
      id: 'crown',
      name: '👑 Royal Crown',
      desc: 'Luminous royal glam + a glowing golden crown on your head with sparkling stars.',
      specialType: 'crown',
      settings: {
        smoothing: 80, brightness: 115, contrast: 104, saturation: 114,
        rosyTint: 15, eyeBrighten: 45, blush: 50, lipTint: 75
      }
    },
    {
      id: 'sunglasses',
      name: '🕶️ Cool Shades',
      desc: 'Sleek beauty skin + cool dark sunglasses fitting right on your eyes.',
      specialType: 'sunglasses',
      settings: {
        smoothing: 75, brightness: 110, contrast: 106, saturation: 108,
        rosyTint: 10, eyeBrighten: 30, blush: 40, lipTint: 60
      }
    },
    {
      id: 'dotMask',
      name: '⚪ Cyber Dot Mask',
      desc: 'Hypnotic 3D matrix dots covering your face with crystal clear eyes.',
      specialType: 'dotMask',
      settings: {
        smoothing: 80, brightness: 110, contrast: 104, saturation: 108,
        rosyTint: 15, eyeBrighten: 45, blush: 25, lipTint: 30
      }
    },
    {
      id: 'sausage',
      name: '🌭 Cute Sausage',
      desc: 'Flawless beauty skin + a cute plump juicy sausage on your head tracking your movement!',
      specialType: 'sausage',
      settings: {
        smoothing: 82, brightness: 114, contrast: 103, saturation: 112,
        rosyTint: 20, eyeBrighten: 45, blush: 60, lipTint: 70
      }
    }
  ]
};

const PROJECT_ROOT = path.resolve(__dirname, '..');

// HTTP 서버 (웹 정적 파일 서빙 + REST API + 5회 실패 시 24시간 차단 쉴드)
const server = http.createServer((req, res) => {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const clientIp = getClientIp(req);
  const ipStatus = checkIpBlocked(clientIp);
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  // 🚨 1. 24시간 차단된 IP인 경우: 모든 API 및 페이지 접근 거부
  if (ipStatus.blocked) {
    if (parsedUrl.pathname.startsWith('/api/')) {
      res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        success: false,
        blocked: true,
        remainingHours: ipStatus.remainingHours,
        message: '비밀번호를 5회 이상 잘못 입력하여 24시간 동안 접속이 완전히 차단되었습니다.'
      }));
      return;
    }
    // 브라우저 접속 시 24시간 차단 안내 화면 반환
    res.writeHead(403, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(renderBlockedHtml(ipStatus.remainingHours));
    return;
  }

  // 2. 최신 필터 설정 JSON API (/api/filters)
  if (parsedUrl.pathname === '/api/filters') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(FILTERS_CONFIG));
    return;
  }

  // 3. 현재 IP의 인증 및 남은 기회 확인 API (/api/auth-status)
  if (parsedUrl.pathname === '/api/auth-status') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      blocked: false,
      attempts: ipStatus.attempts || 0,
      remainingAttempts: MAX_ATTEMPTS - (ipStatus.attempts || 0)
    }));
    return;
  }

  // 4. 비밀 액세스 코드 검증 API (/api/verify-auth)
  if (parsedUrl.pathname === '/api/verify-auth') {
    const handleVerify = (providedKey) => {
      if (providedKey === ACCESS_KEY) {
        // 일치: 실패 횟수 리셋 및 인증 성공
        ipTracker.delete(clientIp);
        console.log(`[Auth Success] IP: ${clientIp}`);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: true, message: '인증에 성공했습니다.' }));
      } else {
        // 불일치: 실패 횟수 증가
        const currentAttempts = (ipStatus.attempts || 0) + 1;
        console.warn(`[Auth Failed] IP: ${clientIp} (Attempt ${currentAttempts}/${MAX_ATTEMPTS})`);

        if (currentAttempts >= MAX_ATTEMPTS) {
          // 5회 이상 실패: 24시간 차단 발동!
          ipTracker.set(clientIp, {
            attempts: currentAttempts,
            blockedUntil: Date.now() + BLOCK_DURATION_MS
          });
          console.error(`🚨 [IP BLOCKED for 24H] IP: ${clientIp} exceeded ${MAX_ATTEMPTS} attempts.`);
          res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({
            success: false,
            blocked: true,
            remainingHours: 24,
            message: '비밀번호를 5회 이상 잘못 입력하여 24시간 동안 접속이 완전히 차단되었습니다.'
          }));
        } else {
          ipTracker.set(clientIp, {
            attempts: currentAttempts,
            blockedUntil: null
          });
          res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({
            success: false,
            blocked: false,
            attempts: currentAttempts,
            remainingAttempts: MAX_ATTEMPTS - currentAttempts,
            message: `비밀번호가 올바르지 않습니다. (남은 기회: ${MAX_ATTEMPTS - currentAttempts}회)`
          }));
        }
      }
    };

    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body || '{}');
          handleVerify(parsed.key);
        } catch (_) {
          handleVerify(null);
        }
      });
      return;
    } else {
      const queryKey = parsedUrl.searchParams.get('key');
      handleVerify(queryKey);
      return;
    }
  }

  // 5. 정적 웹 파일 서빙 (브라우저 접속 지원)
  let filePath = '';
  if (parsedUrl.pathname === '/' || parsedUrl.pathname === '/index.html') {
    filePath = path.join(PROJECT_ROOT, 'src', 'index.html');
  } else if (parsedUrl.pathname.startsWith('/assets/')) {
    filePath = path.join(PROJECT_ROOT, parsedUrl.pathname);
  } else if (parsedUrl.pathname.startsWith('/src/')) {
    filePath = path.join(PROJECT_ROOT, parsedUrl.pathname);
  } else {
    // /css/*, /js/* 등은 src 폴더 내에서 탐색
    filePath = path.join(PROJECT_ROOT, 'src', parsedUrl.pathname);
  }

  // 상위 경로 탐색 방지 (Directory Traversal Defense)
  if (!filePath.startsWith(PROJECT_ROOT)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Access Denied');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// 🔒 Socket.io 레벨 보안 미들웨어 (24시간 차단 IP 및 미인증 소켓 차단)
io.use((socket, next) => {
  const forwarded = socket.handshake.headers['x-forwarded-for'];
  const clientIp = forwarded ? forwarded.split(',')[0].trim() : socket.handshake.address;

  const ipStatus = checkIpBlocked(clientIp);
  if (ipStatus.blocked) {
    console.warn(`[Socket Rejected] Blocked IP: ${clientIp}`);
    return next(new Error('IP_BLOCKED_FOR_24_HOURS'));
  }

  const clientKey = socket.handshake.auth?.key || socket.handshake.query?.key;
  if (!clientKey || clientKey !== ACCESS_KEY) {
    console.warn(`[Socket Rejected] Invalid Key from IP: ${clientIp}`);
    return next(new Error('INVALID_ACCESS_KEY'));
  }

  next();
});

// 방별 참가자 정보
const rooms = {};

io.on('connection', (socket) => {
  console.log(`[Connected] Socket ID: ${socket.id}`);

  // 🌟 클라이언트 연결 시 즉시 최신 필터 설정 자동 전송
  socket.emit('filter-configs', FILTERS_CONFIG);

  // 방 참가 요청
  socket.on('join-room', ({ roomId, nickname }) => {
    if (!rooms[roomId]) {
      rooms[roomId] = {};
    }

    const currentUsers = Object.keys(rooms[roomId]);
    if (currentUsers.length >= MAX_USERS_PER_ROOM) {
      socket.emit('room-full', { message: 'The room is full (Maximum 4 participants).' });
      return;
    }

    rooms[roomId][socket.id] = {
      nickname: nickname || `User_${socket.id.substring(0, 4)}`,
      joinedAt: Date.now()
    };
    socket.join(roomId);

    const existingUsers = currentUsers.map(id => ({
      socketId: id,
      nickname: rooms[roomId][id].nickname
    }));
    socket.emit('all-users', existingUsers);

    socket.to(roomId).emit('user-joined', {
      socketId: socket.id,
      nickname: rooms[roomId][socket.id].nickname
    });

    console.log(`[Joined] ${rooms[roomId][socket.id].nickname} (${socket.id}) -> Room: ${roomId} (Total: ${Object.keys(rooms[roomId]).length})`);
  });

  // WebRTC Offer 전달
  socket.on('offer', ({ targetSocketId, sdp }) => {
    io.to(targetSocketId).emit('offer', {
      callerSocketId: socket.id,
      sdp
    });
  });

  // WebRTC Answer 전달
  socket.on('answer', ({ targetSocketId, sdp }) => {
    io.to(targetSocketId).emit('answer', {
      responderSocketId: socket.id,
      sdp
    });
  });

  // ICE Candidate 전달
  socket.on('ice-candidate', ({ targetSocketId, candidate }) => {
    io.to(targetSocketId).emit('ice-candidate', {
      senderSocketId: socket.id,
      candidate
    });
  });

  // 연결 해제 처리
  socket.on('disconnecting', () => {
    for (const roomId of socket.rooms) {
      if (rooms[roomId] && rooms[roomId][socket.id]) {
        const user = rooms[roomId][socket.id];
        delete rooms[roomId][socket.id];

        socket.to(roomId).emit('user-left', {
          socketId: socket.id,
          nickname: user.nickname
        });

        if (Object.keys(rooms[roomId]).length === 0) {
          delete rooms[roomId];
        }
        console.log(`[Left] ${user.nickname} (${socket.id}) <- Room: ${roomId}`);
      }
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Disconnected] Socket ID: ${socket.id}`);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`📡 Signaling server is running on port ${PORT}.`);
});
