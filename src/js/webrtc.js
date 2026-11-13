/**
 * WebRTC 다자간(최대 4인 Full-Mesh) 연결 관리자
 */
class WebRTCManager {
  constructor({ socketUrl, authKey, onRemoteStream, onUserLeft, onError, onConnected, onRemoteScreenStream, onRemoteScreenStopped }) {
    this.socketUrl = socketUrl || (typeof window !== 'undefined' && window.location.protocol.startsWith('http')
      ? window.location.origin
      : 'https://beautycall-server.onrender.com');
    this.authKey = authKey || '';
    this.socket = null;
    this.localStream = null;
    this.screenStream = null; // 내가 공유 중인 화면 스트림
    this.screenSenders = {};  // { [socketId]: RTCRtpSender[] }
    this.peers = {}; // { [socketId]: { peerConnection, nickname, cameraStream, screenStream } }
    this.roomId = null;
    this.nickname = '';

    this.remoteScreenInfo = null; // { sharerSocketId, sharerName, streamId }
    this.currentRemoteScreenStream = null;

    this.onRemoteStream = onRemoteStream || (() => {});
    this.onUserLeft = onUserLeft || (() => {});
    this.onError = onError || (() => {});
    this.onConnected = onConnected || (() => {});
    this.onRemoteScreenStream = onRemoteScreenStream || (() => {});
    this.onRemoteScreenStopped = onRemoteScreenStopped || (() => {});

    this.iceServers = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' },
        { urls: 'stun:openrelay.metered.ca:80' },
        // 🚀 모바일 LTE/5G 통신망(Symmetric NAT) 및 다른 Wi-Fi 환경 연결을 위한 OpenRelay 무료 TURN Relay 서버
        {
          urls: 'turn:openrelay.metered.ca:80',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        },
        {
          urls: 'turn:openrelay.metered.ca:443',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        },
        {
          urls: 'turn:openrelay.metered.ca:443?transport=tcp',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        }
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
      this.onConnected();
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
    this.socket.on('user-joined', async ({ socketId, nickname }) => {
      console.log('새 참가자 입장:', nickname, socketId);
      // 새 참가자가 offer를 보낼 것이므로 피어 커넥션만 대기 상태로 준비
      await this.createPeerConnection(socketId, nickname, false);
    });

    // 상대방의 Offer 수신
    this.socket.on('offer', async ({ callerSocketId, sdp }) => {
      console.log('Offer 수신:', callerSocketId);
      let peer = this.peers[callerSocketId];
      if (!peer) {
        peer = await this.createPeerConnection(callerSocketId, '상대방', false);
      }

      try {
        await peer.peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
        // 대기 중이던 ICE Candidate 일괄 등록
        await this.drainIceCandidates(peer);

        const answer = await peer.peerConnection.createAnswer();
        await peer.peerConnection.setLocalDescription(answer);

        this.socket.emit('answer', {
          targetSocketId: callerSocketId,
          sdp: answer
        });
      } catch (err) {
        console.error('Offer 처리 중 오류:', err);
      }
    });

    // 상대방의 Answer 수신
    this.socket.on('answer', async ({ responderSocketId, sdp }) => {
      console.log('Answer 수신:', responderSocketId);
      const peer = this.peers[responderSocketId];
      if (peer) {
        try {
          await peer.peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
          // 대기 중이던 ICE Candidate 일괄 등록
          await this.drainIceCandidates(peer);
        } catch (err) {
          console.error('Answer 처리 중 오류:', err);
        }
      }
    });

    // ICE Candidate 수신 (원격 디스크립션 설정 전이면 큐에 저장)
    this.socket.on('ice-candidate', async ({ senderSocketId, candidate }) => {
      const peer = this.peers[senderSocketId];
      if (!peer || !candidate) return;

      if (peer.peerConnection.remoteDescription && peer.peerConnection.remoteDescription.type) {
        try {
          await peer.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error('ICE Candidate 추가 실패:', e);
        }
      } else {
        // remoteDescription이 아직 없으면 큐에 임시 보관
        peer.iceQueue.push(candidate);
      }
    });

    // 참가자 퇴장
    this.socket.on('user-left', ({ socketId, nickname }) => {
      console.log('참가자 퇴장:', nickname, socketId);
      this.closePeer(socketId);
      this.onUserLeft(socketId);
    });

    // 🎬 화면 공유 시작 브로드캐스트 수신
    this.socket.on('screen-share-started', ({ sharerSocketId, sharerName, streamId }) => {
      console.log('🎬 화면 공유 시작 알림 수신:', sharerName, streamId);
      this.remoteScreenInfo = { sharerSocketId, sharerName, streamId };
      const peer = this.peers[sharerSocketId];
      if (peer && peer.screenStream) {
        this.currentRemoteScreenStream = peer.screenStream;
        this.onRemoteScreenStream(sharerSocketId, sharerName, peer.screenStream);
      }
    });

    // 🎬 화면 공유 종료 브로드캐스트 수신
    this.socket.on('screen-share-stopped', ({ sharerSocketId }) => {
      console.log('🎬 화면 공유 종료 알림 수신:', sharerSocketId);
      this.remoteScreenInfo = null;
      this.currentRemoteScreenStream = null;
      const peer = this.peers[sharerSocketId];
      if (peer) {
        peer.screenStream = null;
      }
      this.onRemoteScreenStopped(sharerSocketId);
    });
  }

  /**
   * 보관된 ICE Candidate들을 RTCPeerConnection에 일괄 등록
   */
  async drainIceCandidates(peer) {
    if (!peer || !peer.iceQueue || peer.iceQueue.length === 0) return;
    const candidates = [...peer.iceQueue];
    peer.iceQueue = [];

    for (const cand of candidates) {
      try {
        await peer.peerConnection.addIceCandidate(new RTCIceCandidate(cand));
      } catch (e) {
        console.warn('보관된 ICE Candidate 등록 실패:', e);
      }
    }
  }

  /**
   * 🍎 Safari & Chrome 간 교차 호환성을 위한 H.264 코덱 우선순위 지정
   */
  preferH264Codec(pc) {
    try {
      if (typeof RTCRtpSender !== 'undefined' && RTCRtpSender.getCapabilities) {
        const capabilities = RTCRtpSender.getCapabilities('video');
        if (capabilities && capabilities.codecs) {
          const h264Codecs = capabilities.codecs.filter(c => c.mimeType.toLowerCase() === 'video/h264');
          const otherCodecs = capabilities.codecs.filter(c => c.mimeType.toLowerCase() !== 'video/h264');
          const preferredOrder = [...h264Codecs, ...otherCodecs];
          pc.getTransceivers().forEach(transceiver => {
            if (transceiver.receiver && transceiver.receiver.track && transceiver.receiver.track.kind === 'video') {
              if (typeof transceiver.setCodecPreferences === 'function') {
                transceiver.setCodecPreferences(preferredOrder);
              }
            }
          });
        }
      }
    } catch (e) {
      console.warn('[preferH264Codec] Skipped:', e);
    }
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
  async createPeerConnection(targetSocketId, nickname, isCaller) {
    if (this.peers[targetSocketId]) {
      return this.peers[targetSocketId];
    }

    const pc = new RTCPeerConnection(this.iceServers);

    const peerInfo = {
      peerConnection: pc,
      nickname: nickname,
      iceQueue: []
    };
    this.peers[targetSocketId] = peerInfo;

    // 로컬 스트림(필터 적용 영상 + 오디오)의 트랙을 피어 커넥션에 추가
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localStream);
      });
    }

    // 로컬 화면 공유가 진행 중인 경우 해당 트랙들도 함께 추가
    if (this.screenStream) {
      if (!this.screenSenders[targetSocketId]) {
        this.screenSenders[targetSocketId] = [];
      }
      this.screenStream.getTracks().forEach((track) => {
        const sender = pc.addTrack(track, this.screenStream);
        this.screenSenders[targetSocketId].push(sender);
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

    // 상대방의 미디어 스트림 수신 이벤트 (카메라 vs 화면공유 분기)
    pc.ontrack = (event) => {
      const incomingStream = event.streams && event.streams[0];
      if (!incomingStream) return;

      console.log('미디어 트랙 수신:', targetSocketId, incomingStream.id, event.track.kind);

      // 화면 공유 스트림 식별 로직:
      // 1) remoteScreenInfo의 streamId와 일치하거나,
      // 2) 이미 cameraStream을 등록받은 피어인데 추가 스트림이 온 경우 화면 공유 스트림으로 판별
      const isScreen = (this.remoteScreenInfo && this.remoteScreenInfo.streamId === incomingStream.id) ||
                       (peerInfo.cameraStream && peerInfo.cameraStream.id !== incomingStream.id);

      if (isScreen) {
        console.log('🎬 화면 공유 스트림 수신 성공:', targetSocketId, incomingStream);
        peerInfo.screenStream = incomingStream;
        this.currentRemoteScreenStream = incomingStream;
        const sharerName = (this.remoteScreenInfo && this.remoteScreenInfo.sharerName) || nickname;
        this.onRemoteScreenStream(targetSocketId, sharerName, incomingStream);
      } else {
        console.log('원격 카메라 스트림 수신 성공:', targetSocketId, incomingStream);
        peerInfo.cameraStream = incomingStream;
        this.onRemoteStream(targetSocketId, nickname, incomingStream);
      }
    };

    // 🍎 Safari & Chrome 교차 호환성을 위한 H.264 코덱 우선순위 지정
    this.preferH264Codec(pc);

    // 피어 연결 상태 로깅 및 끊김/실패 시 자동 ICE 재시작
    pc.oniceconnectionstatechange = () => {
      console.log(`[ICE State: ${targetSocketId}]`, pc.iceConnectionState);
      if (pc.iceConnectionState === 'failed') {
        console.warn(`[ICE Failed: ${targetSocketId}] Attempting ICE restart...`);
        if (typeof pc.restartIce === 'function') {
          try {
            pc.restartIce();
          } catch (e) {
            console.warn('ICE restart error:', e);
          }
        }
      } else if (pc.iceConnectionState === 'disconnected') {
        console.warn(`[ICE Disconnected: ${targetSocketId}]`);
      }
    };

    // 통화 발신자(Caller)인 경우 지연 없이 직접 Offer 생성 및 즉시 전송
    if (isCaller) {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        this.socket.emit('offer', {
          targetSocketId: targetSocketId,
          sdp: offer
        });
        console.log('Offer 전송 완료 ->', targetSocketId);
      } catch (err) {
        console.error('Offer 생성 오류:', err);
      }
    }

    return peerInfo;
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
   * 🎬 화면 및 시스템 오디오 공유(Watch Party) 시작
   */
  async startScreenShare() {
    if (this.screenStream) return this.screenStream;

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always',
          frameRate: { ideal: 30, max: 60 }
        },
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });

      this.screenStream = displayStream;

      // 브라우저 상단 "공유 중지" 버튼 클릭 시 자동 종료 이벤트 바인딩
      const videoTrack = displayStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          this.stopScreenShare();
        };
      }

      // 각 피어 커넥션에 화면 스트림 트랙 추가
      for (const [targetSocketId, peer] of Object.entries(this.peers)) {
        if (!this.screenSenders[targetSocketId]) {
          this.screenSenders[targetSocketId] = [];
        }
        displayStream.getTracks().forEach((track) => {
          try {
            const sender = peer.peerConnection.addTrack(track, displayStream);
            this.screenSenders[targetSocketId].push(sender);
          } catch (e) {
            console.warn(`트랙 추가 실패 (${targetSocketId}):`, e);
          }
        });
      }

      // 모든 피어와 SDP 재협상(Renegotiation)
      await this.renegotiateAllPeers();

      // 시그널링 서버로 화면 공유 시작 알림 브로드캐스트
      if (this.socket && this.roomId) {
        this.socket.emit('screen-share-start', {
          roomId: this.roomId,
          sharerName: this.nickname,
          streamId: displayStream.id
        });
      }

      console.log('🎬 화면 및 오디오 공유 시작 완료:', displayStream.id);
      return displayStream;
    } catch (err) {
      console.warn('화면 공유 시작 취소 또는 실패:', err);
      throw err;
    }
  }

  /**
   * 🎬 화면 공유 중지
   */
  async stopScreenShare() {
    if (!this.screenStream) return;

    console.log('🎬 화면 공유 중지 처리 시작');

    // 1. 모든 트랙 중지
    this.screenStream.getTracks().forEach((track) => {
      try { track.stop(); } catch (_) {}
    });

    // 2. 각 피어에서 sender 제거
    for (const [targetSocketId, peer] of Object.entries(this.peers)) {
      const senders = this.screenSenders[targetSocketId] || [];
      senders.forEach((sender) => {
        try {
          peer.peerConnection.removeTrack(sender);
        } catch (_) {}
      });
      delete this.screenSenders[targetSocketId];
    }

    this.screenStream = null;

    // 3. 모든 피어와 SDP 재협상
    await this.renegotiateAllPeers();

    // 4. 시그널링 서버로 화면 공유 종료 알림 전송
    if (this.socket && this.roomId) {
      this.socket.emit('screen-share-stop', {
        roomId: this.roomId
      });
    }
  }

  /**
   * 모든 피어 커넥션과 SDP 재협상(Renegotiation Offer/Answer) 실행
   */
  async renegotiateAllPeers() {
    for (const [targetSocketId, peer] of Object.entries(this.peers)) {
      try {
        const offer = await peer.peerConnection.createOffer();
        await peer.peerConnection.setLocalDescription(offer);
        if (this.socket) {
          this.socket.emit('offer', {
            targetSocketId,
            sdp: offer
          });
        }
      } catch (err) {
        console.error(`피어(${targetSocketId}) 재협상 오류:`, err);
      }
    }
  }

  /**
   * 통화 종료 및 방 나가기
   */
  leaveRoom() {
    this.stopScreenShare();
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

