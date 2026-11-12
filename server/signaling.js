// Socket.io 시그널링 서버 및 원격 필터 관리자
const http = require('http');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3500;
const MAX_USERS_PER_ROOM = 4;

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
      id: 'bestMakeup',
      name: '👑 The Best Makeup',
      desc: 'Facebook Messenger style full glam with winged eyeliner, 3D strobing glow & velvet lips.',
      settings: {
        smoothing: 78, brightness: 112, contrast: 104, saturation: 110,
        rosyTint: 15, eyeBrighten: 45, blush: 55, lipTint: 70, eyeliner: 65, highlighter: 55
      }
    },
    {
      id: 'idolMask',
      name: '🎀 Idol Stage Mask',
      desc: 'Radiant K-Pop idol stage look with luminous skin, soft lashes & coral pink lips.',
      settings: {
        smoothing: 82, brightness: 116, contrast: 102, saturation: 106,
        rosyTint: 20, eyeBrighten: 50, blush: 45, lipTint: 60, eyeliner: 40, highlighter: 60
      }
    },
    {
      id: 'foxEyes',
      name: '🦊 Fox Eyes Glam',
      desc: 'Sharp cat-eye winged liner with sleek contouring and defined eye contours.',
      settings: {
        smoothing: 72, brightness: 108, contrast: 106, saturation: 108,
        rosyTint: 10, eyeBrighten: 35, blush: 40, lipTint: 65, eyeliner: 80, highlighter: 45
      }
    },
    {
      id: 'goldenHour',
      name: '🌟 Golden Hour Glow',
      desc: 'Warm amber sunset bronzing with sun-kissed peach blush and golden radiance.',
      settings: {
        smoothing: 65, brightness: 110, contrast: 105, saturation: 118,
        rosyTint: 35, eyeBrighten: 30, blush: 60, lipTint: 60, eyeliner: 45, highlighter: 65
      }
    }
  ]
};

// HTTP 서버 (REST API 지원)
const server = http.createServer((req, res) => {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // 1. 최신 필터 설정 JSON API (/api/filters)
  if (req.url === '/api/filters') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(FILTERS_CONFIG));
    return;
  }

  // 기본 상태 확인 페이지
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('BeautyCall Signaling Server is running.');
});

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
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

server.listen(PORT, () => {
  console.log(`📡 Signaling server is running on port ${PORT}.`);
});
