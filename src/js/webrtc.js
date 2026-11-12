/**
 * WebRTC 다자간(최대 4인 Full-Mesh) 연결 관리자
 */
class WebRTCManager {
  constructor({ socketUrl, authKey, onRemoteStream, onUserLeft, onError }) {
    this.socketUrl = socketUrl || (typeof window !== 'undefined' && window.location.protocol.startsWith('http')
      ? window.location.origin
      : 'https://beautycall-server.onrender.com');
    this.authKey = authKey || '';
    this.socket = null;
    this.localStream = null;
    this.peers = {}; // { [socketId]: { peerConnection, nickname } }
    this.roomId = null;
    this.nickname = '';

    this.onRemoteStream = onRemoteStream || (() => {});
    this.onUserLeft = onUserLeft || (() => {});
    this.onError = onError || (() => {});

    this.iceServers = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };
  }

  /**
   * 소켓 연결 및 시그널링 이벤트 리스너 등록
   */
  init(localStream, nickname) {
    this.localStream = localStream;
    this.nickname = nickname;

    if (typeof io === 'undefined') {
      console.error('Socket.io 클라이언트 라이브러리가 로드되지 않았습니다.');
      return;
    }

    this.socket = io(this.socketUrl, {
      auth: { key: this.authKey }
    });

    this.socket.on('connect', () => {
      console.log('시그널링 서버 연결 성공:', this.socket.id);
    });

    this.socket.on('room-full', ({ message }) => {
      this.onError(message);
    });

    // 방에 기존에 있던 유저 목록을 수신 (새로 들어온 사용자 입장)
    this.socket.on('all-users', async (users) => {
      console.log('현재 방 참가자 목록:', users);
      for (const user of users) {
        // 기존 참가자들에게 Offer 생성하여 연결 시작
        await this.createPeerConnection(user.socketId, user.nickname, true);
      }
    });

    // 다른 사용자가 새로 입장했을 때 (기존 참가자 입장)
    this.socket.on('user-joined', ({ socketId, nickname }) => {
      console.log('새 참가자 입장:', nickname, socketId);
      // 새 참가자가 offer를 보낼 것이므로 피어 커넥션만 대기 상태로 준비
      this.createPeerConnection(socketId, nickname, false);
    });

    // 상대방의 Offer 수신
    this.socket.on('offer', async ({ callerSocketId, sdp }) => {
      console.log('Offer 수신:', callerSocketId);
      let peer = this.peers[callerSocketId];
      if (!peer) {
        peer = this.createPeerConnection(callerSocketId, '상대방', false);
      }

      await peer.peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await peer.peerConnection.createAnswer();
      await peer.peerConnection.setLocalDescription(answer);

      this.socket.emit('answer', {
        targetSocketId: callerSocketId,
        sdp: answer
      });
    });

    // 상대방의 Answer 수신
    this.socket.on('answer', async ({ responderSocketId, sdp }) => {
      console.log('Answer 수신:', responderSocketId);
      const peer = this.peers[responderSocketId];
      if (peer) {
        await peer.peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
      }
    });

    // ICE Candidate 수신
    this.socket.on('ice-candidate', async ({ senderSocketId, candidate }) => {
      const peer = this.peers[senderSocketId];
      if (peer && candidate) {
        try {
          await peer.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error('ICE Candidate 추가 실패:', e);
        }
      }
    });

    // 참가자 퇴장
    this.socket.on('user-left', ({ socketId, nickname }) => {
      console.log('참가자 퇴장:', nickname, socketId);
      this.closePeer(socketId);
      this.onUserLeft(socketId);
    });
  }

  /**
   * 방 입장 요청
   */
  joinRoom(roomId) {
    this.roomId = roomId;
    if (this.socket) {
      this.socket.emit('join-room', {
        roomId: this.roomId,
        nickname: this.nickname
      });
    }
  }

  /**
   * 개별 피어 커넥션 생성 및 트랙 추가
   */
  createPeerConnection(targetSocketId, nickname, isCaller) {
    const pc = new RTCPeerConnection(this.iceServers);

    this.peers[targetSocketId] = {
      peerConnection: pc,
      nickname: nickname
    };

    // 로컬 스트림(필터 적용 영상 + 오디오)의 트랙을 피어 커넥션에 추가
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localStream);
      });
    }

    // ICE Candidate 이벤트 발생 시 시그널링 서버로 전송
    pc.onicecandidate = (event) => {
      if (event.candidate && this.socket) {
        this.socket.emit('ice-candidate', {
          targetSocketId: targetSocketId,
          candidate: event.candidate
        });
      }
    };

    // 상대방의 미디어 스트림 수신 이벤트
    pc.ontrack = (event) => {
      console.log('원격 스트림 수신:', targetSocketId, event.streams[0]);
      if (event.streams && event.streams[0]) {
        this.onRemoteStream(targetSocketId, nickname, event.streams[0]);
      }
    };

    // 통화 발신자(Caller)인 경우 Offer 생성 및 전송
    if (isCaller) {
      pc.onnegotiationneeded = async () => {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          this.socket.emit('offer', {
            targetSocketId: targetSocketId,
            sdp: offer
          });
        } catch (err) {
          console.error('Offer 생성 오류:', err);
        }
      };
    }

    return this.peers[targetSocketId];
  }

  /**
   * 로컬 비디오/오디오 트랙 활성화/비활성화 (음소거 / 카메라 토글)
   */
  toggleAudio(enabled) {
    if (this.localStream) {
      const audioTracks = this.localStream.getAudioTracks();
      audioTracks.forEach(track => { track.enabled = enabled; });
    }
  }

  toggleVideo(enabled) {
    if (this.localStream) {
      const videoTracks = this.localStream.getVideoTracks();
      videoTracks.forEach(track => { track.enabled = enabled; });
    }
  }

  closePeer(socketId) {
    if (this.peers[socketId]) {
      this.peers[socketId].peerConnection.close();
      delete this.peers[socketId];
    }
  }

  /**
   * 통화 종료 및 방 나가기
   */
  leaveRoom() {
    for (const socketId of Object.keys(this.peers)) {
      this.closePeer(socketId);
    }
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = WebRTCManager;
}

