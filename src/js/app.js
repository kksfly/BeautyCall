/**
 * BeautyCall 메인 애플리케이션 로직
 */
document.addEventListener('DOMContentLoaded', async () => {
  // SVG 아이콘 템플릿
  const ICONS = {
    micOn: `
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
        <line x1="12" x2="12" y1="19" y2="22"/>
      </svg>
    `,
    micOff: `
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="2" x2="22" y1="2" y2="22"/>
        <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"/>
        <path d="M5 10v2a7 7 0 0 0 12 5"/>
        <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"/>
        <path d="M9 9v3a3 3 0 0 0 5.12 2.12"/>
        <line x1="12" x2="12" y1="19" y2="22"/>
      </svg>
    `,
    camOn: `
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m22 8-6 4 6 4V8Z"/>
        <rect width="14" height="12" x="2" y="6" rx="2" ry="2"/>
      </svg>
    `,
    camOff: `
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="2" x2="22" y1="2" y2="22"/>
        <path d="M10.66 6H14a2 2 0 0 1 2 2v2.5l3.4-2.27A1 1 0 0 1 21 9.07v5.86"/>
        <path d="M16 16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h1.34"/>
      </svg>
    `,
    flip: `
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="2" x2="12" y2="22" stroke-dasharray="2 3"/>
        <polyline points="7 9 4 12 7 15"/>
        <polyline points="17 9 20 12 17 15"/>
        <path d="M4 12h16"/>
      </svg>
    `
  };

  // DOM 요소 참조
  const rawVideo = document.getElementById('rawWebcam');
  const previewCanvas = document.getElementById('previewCanvas');
  const previewCtx = previewCanvas.getContext('2d');
  const callLocalCanvas = document.getElementById('callLocalCanvas');
  const callLocalCtx = callLocalCanvas.getContext('2d');
  const cameraOffPlaceholder = document.getElementById('cameraOffPlaceholder');

  // 뷰
  const lobbyView = document.getElementById('lobbyView');
  const callView = document.getElementById('callView');

  // 대기실 입력
  const nicknameInput = document.getElementById('nicknameInput');
  const roomIdInput = document.getElementById('roomIdInput');
  const joinCallBtn = document.getElementById('joinCallBtn');
  const toggleMicBtn = document.getElementById('toggleMicBtn');
  const toggleCamBtn = document.getElementById('toggleCamBtn');
  const toggleFlipBtn = document.getElementById('toggleFlipBtn');

  // 필터 프리셋
  const presetBtns = document.querySelectorAll('.preset-btn');

  // 메이크업 & 뷰티 슬라이더 (대기실)
  const eyeBrightenSlider = document.getElementById('eyeBrightenSlider');
  const eyeBrightenVal = document.getElementById('eyeBrightenVal');
  const blushSlider = document.getElementById('blushSlider');
  const blushVal = document.getElementById('blushVal');
  const lipTintSlider = document.getElementById('lipTintSlider');
  const lipTintVal = document.getElementById('lipTintVal');
  const smoothingSlider = document.getElementById('smoothingSlider');
  const smoothingVal = document.getElementById('smoothingVal');
  const brightnessSlider = document.getElementById('brightnessSlider');
  const brightnessVal = document.getElementById('brightnessVal');

  // 통화 화면 요소
  const currentRoomTitle = document.getElementById('currentRoomTitle');
  const userCountBadge = document.getElementById('userCountBadge');
  const copyRoomCodeBtn = document.getElementById('copyRoomCodeBtn');
  const videoGrid = document.getElementById('videoGrid');
  const localUserName = document.getElementById('localUserName');
  const callToggleMicBtn = document.getElementById('callToggleMicBtn');
  const callToggleCamBtn = document.getElementById('callToggleCamBtn');
  const callToggleFlipBtn = document.getElementById('callToggleFlipBtn');
  const leaveCallBtn = document.getElementById('leaveCallBtn');
  const toggleFilterDrawerBtn = document.getElementById('toggleFilterDrawerBtn');
  const inCallFilterDrawer = document.getElementById('inCallFilterDrawer');
  const closeDrawerBtn = document.getElementById('closeDrawerBtn');

  // 통화 중 필터 슬라이더
  const inCallEyeSlider = document.getElementById('inCallEyeSlider');
  const inCallEyeVal = document.getElementById('inCallEyeVal');
  const inCallBlushSlider = document.getElementById('inCallBlushSlider');
  const inCallBlushVal = document.getElementById('inCallBlushVal');
  const inCallLipSlider = document.getElementById('inCallLipSlider');
  const inCallLipVal = document.getElementById('inCallLipVal');
  const inCallSmoothingSlider = document.getElementById('inCallSmoothingSlider');
  const inCallSmoothingVal = document.getElementById('inCallSmoothingVal');

  // 상태 관리
  let rawStream = null;
  let isMicEnabled = true;
  let isCamEnabled = true;
  let isMirrored = true; // 좌우 반전(거울 모드) 기본값: ON
  let currentRoomId = '';
  let currentNickname = '';
  let webrtcManager = null;
  let remoteUsersCount = 0;

  // 1. 뷰티 필터 엔진 인스턴스 (기본 프리셋: glamour 메이크업)
  const filterProcessor = new BeautyFilterProcessor();
  filterProcessor.setPreset('glamour');

  // 프리뷰 및 로컬 화면 복사 동기화 루프
  function startSyncPreviewLoop() {
    function loop() {
      if (filterProcessor.isRunning && isCamEnabled) {
        const sourceCanvas = filterProcessor.canvas;
        if (sourceCanvas.width > 0 && sourceCanvas.height > 0) {
          // 대기실 프리뷰 캔버스 동기화
          if (lobbyView.classList.contains('active')) {
            if (previewCanvas.width !== sourceCanvas.width) {
              previewCanvas.width = sourceCanvas.width;
              previewCanvas.height = sourceCanvas.height;
            }
            previewCtx.drawImage(sourceCanvas, 0, 0);
          }

          // 통화 화면 로컬 캔버스 동기화
          if (callView.classList.contains('active')) {
            if (callLocalCanvas.width !== sourceCanvas.width) {
              callLocalCanvas.width = sourceCanvas.width;
              callLocalCanvas.height = sourceCanvas.height;
            }
            callLocalCtx.drawImage(sourceCanvas, 0, 0);
          }
        }
      }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }

  // 2. 웹캠 및 마이크 스트림 가져오기
  try {
    rawStream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: true
    });
    rawVideo.srcObject = rawStream;
    await rawVideo.play();

    // 뷰티 필터 엔진 시작
    filterProcessor.start(rawVideo);
    startSyncPreviewLoop();
  } catch (err) {
    console.error('카메라/마이크 접근 권한 실패:', err);
    alert('Unable to access camera or microphone. Please check your permissions.');
  }

  // 3. 슬라이더 수치 및 상태 동기화 함수
  function updateSliderDisplay() {
    const s = filterProcessor.settings;
    if (eyeBrightenSlider) {
      eyeBrightenSlider.value = s.eyeBrighten;
      eyeBrightenVal.textContent = `${s.eyeBrighten}%`;
    }
    if (blushSlider) {
      blushSlider.value = s.blush;
      blushVal.textContent = `${s.blush}%`;
    }
    if (lipTintSlider) {
      lipTintSlider.value = s.lipTint;
      lipTintVal.textContent = `${s.lipTint}%`;
    }
    if (smoothingSlider) {
      smoothingSlider.value = s.smoothing;
      smoothingVal.textContent = `${s.smoothing}%`;
    }
    if (brightnessSlider) {
      brightnessSlider.value = s.brightness;
      brightnessVal.textContent = `${s.brightness}%`;
    }

    // 통화 중 드로어 슬라이더 동기화
    if (inCallEyeSlider) {
      inCallEyeSlider.value = s.eyeBrighten;
      inCallEyeVal.textContent = `${s.eyeBrighten}%`;
    }
    if (inCallBlushSlider) {
      inCallBlushSlider.value = s.blush;
      inCallBlushVal.textContent = `${s.blush}%`;
    }
    if (inCallLipSlider) {
      inCallLipSlider.value = s.lipTint;
      inCallLipVal.textContent = `${s.lipTint}%`;
    }
    if (inCallSmoothingSlider) {
      inCallSmoothingSlider.value = s.smoothing;
      inCallSmoothingVal.textContent = `${s.smoothing}%`;
    }
  }

  // 초기 슬라이더 수치 세팅
  updateSliderDisplay();

  // 프리셋 버튼 클릭 이벤트
  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = btn.dataset.preset;
      filterProcessor.setPreset(preset);

      // 활성 버튼 스타일 업데이트 (대기실 & 드로어 공통)
      document.querySelectorAll(`[data-preset]`).forEach(b => {
        b.classList.toggle('active', b.dataset.preset === preset);
      });

      updateSliderDisplay();
    });
  });

  // 슬라이더 바인딩 헬퍼 함수
  function bindSlider(mainSlider, mainVal, inCallSlider, inCallVal, settingKey) {
    if (mainSlider) {
      mainSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        if (mainVal) mainVal.textContent = `${val}%`;
        if (inCallSlider) inCallSlider.value = val;
        if (inCallVal) inCallVal.textContent = `${val}%`;
        filterProcessor.updateSetting(settingKey, val);
      });
    }
    if (inCallSlider) {
      inCallSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        if (inCallVal) inCallVal.textContent = `${val}%`;
        if (mainSlider) mainSlider.value = val;
        if (mainVal) mainVal.textContent = `${val}%`;
        filterProcessor.updateSetting(settingKey, val);
      });
    }
  }

  // 눈가 브라이트닝, 볼터치, 입술 틴트, 피부 보정, 밝기 슬라이더 연결
  bindSlider(eyeBrightenSlider, eyeBrightenVal, inCallEyeSlider, inCallEyeVal, 'eyeBrighten');
  bindSlider(blushSlider, blushVal, inCallBlushSlider, inCallBlushVal, 'blush');
  bindSlider(lipTintSlider, lipTintVal, inCallLipSlider, inCallLipVal, 'lipTint');
  bindSlider(smoothingSlider, smoothingVal, inCallSmoothingSlider, inCallSmoothingVal, 'smoothing');
  bindSlider(brightnessSlider, brightnessVal, null, null, 'brightness');

  // 4. 마이크/카메라 토글
  function updateMediaTogglesUI() {
    const micSvg = isMicEnabled ? ICONS.micOn : ICONS.micOff;
    const camSvg = isCamEnabled ? ICONS.camOn : ICONS.camOff;
    const flipSvg = ICONS.flip;

    [toggleMicBtn, callToggleMicBtn].forEach(btn => {
      if (!btn) return;
      btn.classList.toggle('active', isMicEnabled);
      btn.classList.toggle('off', !isMicEnabled);
      btn.innerHTML = micSvg;
    });

    [toggleCamBtn, callToggleCamBtn].forEach(btn => {
      if (!btn) return;
      btn.classList.toggle('active', isCamEnabled);
      btn.classList.toggle('off', !isCamEnabled);
      btn.innerHTML = camSvg;
    });

    [toggleFlipBtn, callToggleFlipBtn].forEach(btn => {
      if (!btn) return;
      btn.classList.toggle('active', isMirrored);
      btn.classList.toggle('off', !isMirrored);
      btn.innerHTML = flipSvg;
      btn.title = isMirrored ? 'Mirror Mode: ON (Click to unmirror)' : 'Mirror Mode: OFF (Click to mirror)';
    });

    [previewCanvas, callLocalCanvas].forEach(canvas => {
      if (!canvas) return;
      canvas.classList.toggle('mirrored', isMirrored);
      canvas.classList.toggle('unmirrored', !isMirrored);
    });

    cameraOffPlaceholder.classList.toggle('hidden', isCamEnabled);
  }

  function handleFlipToggle() {
    isMirrored = !isMirrored;
    updateMediaTogglesUI();
  }

  // 초기 아이콘 및 거울 모드 세팅
  updateMediaTogglesUI();

  function handleMicToggle() {
    isMicEnabled = !isMicEnabled;
    if (rawStream) {
      rawStream.getAudioTracks().forEach(t => { t.enabled = isMicEnabled; });
    }
    if (webrtcManager) {
      webrtcManager.toggleAudio(isMicEnabled);
    }
    updateMediaTogglesUI();
  }

  function handleCamToggle() {
    isCamEnabled = !isCamEnabled;
    if (rawStream) {
      rawStream.getVideoTracks().forEach(t => { t.enabled = isCamEnabled; });
    }
    if (webrtcManager) {
      webrtcManager.toggleVideo(isCamEnabled);
    }
    updateMediaTogglesUI();
  }

  toggleMicBtn.addEventListener('click', handleMicToggle);
  callToggleMicBtn.addEventListener('click', handleMicToggle);
  toggleCamBtn.addEventListener('click', handleCamToggle);
  callToggleCamBtn.addEventListener('click', handleCamToggle);
  if (toggleFlipBtn) toggleFlipBtn.addEventListener('click', handleFlipToggle);
  if (callToggleFlipBtn) callToggleFlipBtn.addEventListener('click', handleFlipToggle);

  // 5. 비디오 그리드 레이아웃 업데이트
  function updateGridLayout() {
    const totalUsers = 1 + remoteUsersCount;
    videoGrid.className = `video-grid count-${Math.min(4, Math.max(1, totalUsers))}`;
    userCountBadge.textContent = `Participants: ${totalUsers}/4`;
  }

  // 6. 화상 통화 방 입장
  joinCallBtn.addEventListener('click', () => {
    currentNickname = nicknameInput.value.trim() || 'User';
    currentRoomId = roomIdInput.value.trim() || 'room-101';

    // 뷰티 & 메이크업 필터가 적용된 Canvas에서 실시간 비디오 스트림 추출
    const filteredVideoStream = filterProcessor.getFilteredStream(30);
    const filteredVideoTrack = filteredVideoStream.getVideoTracks()[0];

    // 원본 마이크 오디오 트랙 결합
    const combinedStream = new MediaStream();
    if (filteredVideoTrack) {
      combinedStream.addTrack(filteredVideoTrack);
    }
    if (rawStream && rawStream.getAudioTracks().length > 0) {
      combinedStream.addTrack(rawStream.getAudioTracks()[0]);
    }

    // WebRTC 연결 관리자 초기화
    webrtcManager = new WebRTCManager({
      socketUrl: 'http://localhost:3500',
      onRemoteStream: (socketId, nickname, stream) => {
        addRemoteVideo(socketId, nickname, stream);
      },
      onUserLeft: (socketId) => {
        removeRemoteVideo(socketId);
      },
      onError: (msg) => {
        alert(msg);
        leaveRoom();
      }
    });

    webrtcManager.init(combinedStream, currentNickname);
    webrtcManager.joinRoom(currentRoomId);

    // 통화 화면으로 전환
    localUserName.textContent = `${currentNickname} (You)`;
    currentRoomTitle.textContent = `Room: ${currentRoomId}`;
    lobbyView.classList.remove('active');
    callView.classList.add('active');

    updateGridLayout();
  });

  // 상대방 비디오 타일 동적 추가
  function addRemoteVideo(socketId, nickname, stream) {
    let card = document.getElementById(`remote-${socketId}`);
    if (!card) {
      card = document.createElement('div');
      card.id = `remote-${socketId}`;
      card.className = 'video-card remote-card';

      const video = document.createElement('video');
      video.autoplay = true;
      video.playsInline = true;
      video.srcObject = stream;

      const meta = document.createElement('div');
      meta.className = 'user-meta';
      meta.innerHTML = `<span class="user-name">${nickname || 'Participant'}</span>`;

      card.appendChild(video);
      card.appendChild(meta);
      videoGrid.appendChild(card);

      remoteUsersCount++;
      updateGridLayout();
    } else {
      const video = card.querySelector('video');
      if (video) video.srcObject = stream;
    }
  }

  // 상대방 비디오 타일 제거
  function removeRemoteVideo(socketId) {
    const card = document.getElementById(`remote-${socketId}`);
    if (card) {
      card.remove();
      remoteUsersCount = Math.max(0, remoteUsersCount - 1);
      updateGridLayout();
    }
  }

  // 통화 종료 / 나가기
  function leaveRoom() {
    if (webrtcManager) {
      webrtcManager.leaveRoom();
      webrtcManager = null;
    }

    // 원격 비디오 제거
    document.querySelectorAll('.remote-card').forEach(el => el.remove());
    remoteUsersCount = 0;

    // 대기실 뷰로 복귀
    callView.classList.remove('active');
    lobbyView.classList.add('active');
    inCallFilterDrawer.classList.add('hidden');
  }

  leaveCallBtn.addEventListener('click', leaveRoom);

  // 통화 중 필터 조절 드로어 토글
  toggleFilterDrawerBtn.addEventListener('click', () => {
    inCallFilterDrawer.classList.toggle('hidden');
  });

  closeDrawerBtn.addEventListener('click', () => {
    inCallFilterDrawer.classList.add('hidden');
  });

  // 방 코드 복사
  copyRoomCodeBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(currentRoomId).then(() => {
      const originalText = copyRoomCodeBtn.textContent;
      copyRoomCodeBtn.textContent = '✅ Copied!';
      setTimeout(() => {
        copyRoomCodeBtn.textContent = originalText;
      }, 1500);
    });
  });
});
