// Socket.io 시그널링 서버 (Node.js 기본 http 모듈 사용, 외부 프레임워크 의존성 없음)
const http = require('http');
const { Server } = require('socket.io');

// 기본 HTTP 서버 생성 (express 불필요)
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('BeautyCall Signaling Server is running.');
});

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3500;
const MAX_USERS_PER_ROOM = 4;

// 방별 참가자 정보: { [roomId]: { [socketId]: { nickname, joinedAt } } }
const rooms = {};

io.on('connection', (socket) => {
  console.log(`[Connected] Socket ID: ${socket.id}`);

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

    // 방에 사용자 등록
    rooms[roomId][socket.id] = {
      nickname: nickname || `User_${socket.id.substring(0, 4)}`,
      joinedAt: Date.now()
    };
    socket.join(roomId);

    // 기존 참가자 목록을 방금 들어온 사용자에게 전달
    const existingUsers = currentUsers.map(id => ({
      socketId: id,
      nickname: rooms[roomId][id].nickname
    }));
    socket.emit('all-users', existingUsers);

    // 기존 참가자들에게 새 사용자가 입장했음을 알림
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

        // 방에 남은 다른 참가자들에게 퇴장 알림
        socket.to(roomId).emit('user-left', {
          socketId: socket.id,
          nickname: user.nickname
        });

        // 방에 아무도 없으면 방 삭제
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
