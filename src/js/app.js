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
  const copyInviteLinkBtn = document.getElementById('copyInviteLinkBtn');
  const toggleMicBtn = document.getElementById('toggleMicBtn');
  const toggleCamBtn = document.getElementById('toggleCamBtn');
  const toggleFlipBtn = document.getElementById('toggleFlipBtn');

  // 보안 인증 모달 & 차단 오버레이 DOM
  const authModal = document.getElementById('authModal');
  const blockedOverlay = document.getElementById('blockedOverlay');
  const accessKeyInput = document.getElementById('accessKeyInput');
  const verifyKeyBtn = document.getElementById('verifyKeyBtn');
  const authErrorMsg = document.getElementById('authErrorMsg');
  const remainingAttemptsText = document.getElementById('remainingAttemptsText');
  const blockedTimeBadge = document.getElementById('blockedTimeBadge');

  // 필터 프리셋 및 카테고리
  const categoryTabBtns = document.querySelectorAll('.category-tab-btn');
  const basicPresetsList = document.getElementById('basicPresetsList');
  const specialPresetsSection = document.getElementById('specialPresetsSection');
  const specialPresetsList = document.getElementById('specialPresetsList');
  const inCallBasicPresetsList = document.getElementById('inCallBasicPresetsList');
  const inCallSpecialPresetsSection = document.getElementById('inCallSpecialPresetsSection');
  const inCallSpecialPresetsList = document.getElementById('inCallSpecialPresetsList');
  const tuningSlidersSection = document.getElementById('tuningSlidersSection');
  const inCallTuningSection = document.getElementById('inCallTuningSection');
  const presetBtns = document.querySelectorAll('.preset-btn');

  // Special Filters 상단 단일 뷰티 강도 슬라이더
  const specialIntensitySlider = document.getElementById('specialIntensitySlider');
  const specialIntensityVal = document.getElementById('specialIntensityVal');
  const inCallSpecialIntensitySlider = document.getElementById('inCallSpecialIntensitySlider');
  const inCallSpecialIntensityVal = document.getElementById('inCallSpecialIntensityVal');

  // 메이크업 & 뷰티 슬라이더 (대기실)
  const eyelinerSlider = document.getElementById('eyelinerSlider');
  const eyelinerVal = document.getElementById('eyelinerVal');
  const highlighterSlider = document.getElementById('highlighterSlider');
  const highlighterVal = document.getElementById('highlighterVal');
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
  const inCallEyelinerSlider = document.getElementById('inCallEyelinerSlider');
  const inCallEyelinerVal = document.getElementById('inCallEyelinerVal');
  const inCallHighlighterSlider = document.getElementById('inCallHighlighterSlider');
  const inCallHighlighterVal = document.getElementById('inCallHighlighterVal');
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

  // 시그널링 서버 주소 (웹 브라우저 접속 시 자기 자신 origin, Electron 접속 시 Render 클라우드)
  const SIGNALING_URL = (typeof window !== 'undefined' && window.location.protocol.startsWith('http'))
    ? window.location.origin
    : 'https://video-call-app-q6e2.onrender.com';

  // 로컬 스토리지 키
  const FILTER_STORAGE_KEY = 'beautycall_filter_settings';
  const AUTH_STORAGE_KEY = 'beautycall_access_key';

  // 현재 인증 키
  let currentAccessKey = localStorage.getItem(AUTH_STORAGE_KEY) || '';

  // 1. 뷰티 필터 엔진 인스턴스 생성
  const filterProcessor = new BeautyFilterProcessor();

  /**
   * 카테고리 탭 UI 전환 함수 (대기실 & 통화 중 드로어 공통)
   */
  function applyCategoryTabUI(category) {
    document.querySelectorAll('.category-tab-btn').forEach(t => {
      t.classList.toggle('active', t.dataset.category === category);
    });

    const isBasic = category === 'basic';
    if (basicPresetsList) basicPresetsList.classList.toggle('hidden', !isBasic);
    if (specialPresetsSection) specialPresetsSection.classList.toggle('hidden', isBasic);
    if (inCallBasicPresetsList) inCallBasicPresetsList.classList.toggle('hidden', !isBasic);
    if (inCallSpecialPresetsSection) inCallSpecialPresetsSection.classList.toggle('hidden', isBasic);

    // Special Filters 선택 시에는 하단 세부 조절(Tuning) 섹션을 숨김 (Basic Filters일 때만 표시)
    if (tuningSlidersSection) tuningSlidersSection.classList.toggle('hidden', !isBasic);
    if (inCallTuningSection) inCallTuningSection.classList.toggle('hidden', !isBasic);
  }

  /**
   * 사용자의 현재 필터 및 뷰티 설정을 localStorage에 안전하게 저장
   */
  function saveFilterSettings() {
    try {
      const s = filterProcessor.settings;
      const dataToSave = {
        category: s.category || 'special',
        preset: s.preset || 'poop',
        beautyIntensity: (s.beautyIntensity !== undefined) ? s.beautyIntensity : 45,
        customTuning: {
          smoothing: s.smoothing,
          brightness: s.brightness,
          contrast: s.contrast,
          saturation: s.saturation,
          rosyTint: s.rosyTint,
          eyeBrighten: s.eyeBrighten,
          blush: s.blush,
          lipTint: s.lipTint,
          eyeliner: s.eyeliner,
          highlighter: s.highlighter
        }
      };
      localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (e) {
      console.warn('필터 설정 로컬 저장 실패:', e);
    }
  }

  /**
   * localStorage로부터 이전 필터 설정을 안전하게 복원하고,
   * 만약 서버/로컬에서 삭제되었거나 유효하지 않은 프리셋인 경우 방어 조치 수행
   */
  function restoreSavedFilterSettings() {
    try {
      const raw = localStorage.getItem(FILTER_STORAGE_KEY);
      if (!raw) {
        filterProcessor.setPreset('poop');
        applyCategoryTabUI('special');
        return null;
      }

      const saved = JSON.parse(raw);
      if (!saved || typeof saved !== 'object') {
        filterProcessor.setPreset('poop');
        applyCategoryTabUI('special');
        return null;
      }

      // 1. 프리셋 적용 (방어 로직 내장 setPreset 호출)
      const targetPreset = saved.preset || 'poop';
      const appliedPreset = filterProcessor.setPreset(targetPreset);

      // 2. 카테고리 복원
      const category = saved.category || filterProcessor.getPresetCategory(appliedPreset) || 'special';
      filterProcessor.settings.category = category;

      // 3. 뷰티 강도 복원
      if (typeof saved.beautyIntensity === 'number') {
        filterProcessor.updateSetting('beautyIntensity', saved.beautyIntensity);
      }

      // 4. 세부 튜닝 설정 복원
      if (saved.customTuning && typeof saved.customTuning === 'object') {
        Object.entries(saved.customTuning).forEach(([k, v]) => {
          if (typeof v === 'number') {
            filterProcessor.updateSetting(k, v);
          }
        });
      }

      // 5. UI 카테고리 탭 동기화
      applyCategoryTabUI(category);

      console.log(`✨ 마지막 필터 설정 복원 완료 (카테고리: ${category}, 프리셋: ${appliedPreset})`);
      return saved;
    } catch (e) {
      console.warn('저장된 필터 설정 복원 중 오류 (기본값 사용):', e);
      filterProcessor.setPreset('poop');
      applyCategoryTabUI('special');
      return null;
    }
  }

  // 앱 시작 시 저장된 필터 설정 복원 (없으면 기본 poop 적용)
  restoreSavedFilterSettings();

  /**
   * 서버에서 동적으로 내려받은 필터 목록을 UI 버튼으로 렌더링
   */
  function renderFilterButtons(config) {
    if (!config) return;

    // 서버 프리셋 로드 (현재 프리셋이 삭제되었으면 내부에서 fallback 방어 조치 동작)
    filterProcessor.loadRemotePresets(config);

    const currentPreset = filterProcessor.settings.preset;
    const currentCategory = filterProcessor.settings.category;

    function createButtons(listElement, items, isSmall = false) {
      if (!listElement) return;
      listElement.innerHTML = '';

      items.forEach(item => {
        const btn = document.createElement('button');
        btn.className = `preset-btn ${isSmall ? 'in-call-preset' : ''}`;
        btn.dataset.preset = item.id;
        btn.textContent = item.name;

        if (filterProcessor.settings.preset === item.id) {
          btn.classList.add('active');
        }

        btn.addEventListener('click', () => {
          filterProcessor.setPreset(item.id);

          document.querySelectorAll(`[data-preset]`).forEach(b => {
            b.classList.toggle('active', b.dataset.preset === item.id);
          });

          updateSliderDisplay();
          saveFilterSettings();
        });

        listElement.appendChild(btn);
      });
    }

    function createSpecialCards(listElement, items, isSmall = false) {
      if (!listElement) return;
      listElement.innerHTML = '';

      items.forEach(item => {
        const card = document.createElement('div');
        card.className = `special-filter-card ${isSmall ? 'small' : ''}`;
        card.dataset.preset = item.id;

        if (filterProcessor.settings.preset === item.id) {
          card.classList.add('active');
        }

        const title = document.createElement('div');
        title.className = 'special-card-title';
        title.innerHTML = `<span>${item.name}</span><span style="font-size: 11px; opacity: 0.7;">AR Mask</span>`;

        const desc = document.createElement('div');
        desc.className = 'special-card-desc';
        desc.textContent = item.desc || 'Special AR makeup mask effect.';

        card.appendChild(title);
        card.appendChild(desc);

        card.addEventListener('click', () => {
          filterProcessor.setPreset(item.id);

          document.querySelectorAll(`[data-preset]`).forEach(b => {
            b.classList.toggle('active', b.dataset.preset === item.id);
          });

          updateSliderDisplay();
          saveFilterSettings();
        });

        listElement.appendChild(card);
      });
    }

    if (config.basic) {
      createButtons(basicPresetsList, config.basic, false);
      createButtons(inCallBasicPresetsList, config.basic, true);
    }

    if (config.special) {
      createSpecialCards(specialPresetsList, config.special, false);
      createSpecialCards(inCallSpecialPresetsList, config.special, true);
    }

    // 🛡️ 필터가 변경/삭제되었을 경우 UI 활성화 상태 및 저장 동기화
    document.querySelectorAll(`[data-preset]`).forEach(b => {
      b.classList.toggle('active', b.dataset.preset === currentPreset);
    });
    applyCategoryTabUI(currentCategory);
    saveFilterSettings();

    console.log('✨ 서버 필터 목록 UI 렌더링 완료');
  }

  // 원격 필터 목록 로드 함수
  function loadRemoteFilters() {
    fetch(`${SIGNALING_URL}/api/filters`)
      .then(res => res.json())
      .then(data => {
        renderFilterButtons(data);
        updateSliderDisplay();
      })
      .catch(err => {
        console.warn('원격 필터 로드 실패(로컬 기본값 사용):', err);
        const localConfig = {
          basic: [
            { id: 'none', name: 'Original' },
            { id: 'smooth', name: '🌸 Smooth' },
            { id: 'kbeauty', name: '✨ K-Beauty' },
            { id: 'glamour', name: '💄 Glamour' },
            { id: 'warm', name: '☀️ Warm' },
            { id: 'cool', name: '❄️ Cool' },
            { id: 'vintage', name: '🎞️ Vintage' },
            { id: 'monochrome', name: '🖤 Mono' }
          ],
          special: [
            { id: 'poop', name: '💩 Poop on Head', desc: 'Flawless beauty skin + a cute funny poop on your head tracking your movement!' },
            { id: 'catEars', name: '🐱 Cute Kitty', desc: 'Porcelain skin + adorable pink cat ears, whiskers and jelly nose.' },
            { id: 'crown', name: '👑 Royal Crown', desc: 'Luminous royal glam + a glowing golden crown on your head with sparkling stars.' },
            { id: 'sunglasses', name: '🕶️ Cool Shades', desc: 'Sleek beauty skin + cool dark sunglasses fitting right on your eyes.' },
            { id: 'dotMask', name: '⚪ Cyber Dot Mask', desc: 'Hypnotic matrix dots covering your face with crystal clear eyes.' }
          ]
        };
        renderFilterButtons(localConfig);
        updateSliderDisplay();
      });
  }

  // 대기실 소켓 연결 (실시간 필터 업데이트 이벤트 수신용 + 인증 키 전달)
  let lobbySocket = null;
  function initLobbySocket() {
    if (typeof io !== 'undefined' && currentAccessKey && !lobbySocket) {
      lobbySocket = io(SIGNALING_URL, {
        auth: { key: currentAccessKey }
      });

      lobbySocket.on('filter-configs', (data) => {
        renderFilterButtons(data);
        updateSliderDisplay();
      });

      lobbySocket.on('filters-updated', (data) => {
        console.log('📢 서버에서 필터가 업데이트되었습니다!');
        renderFilterButtons(data);
        updateSliderDisplay();
      });

      lobbySocket.on('connect_error', (err) => {
        console.warn('소켓 보안 차단 알림:', err.message);
        if (err.message === 'IP_BLOCKED_FOR_24_HOURS') {
          showBlockedOverlay(24);
        }
      });
    }
  }

  // 🔒 24시간 차단 화면 표시
  function showBlockedOverlay(remainingHours = 24) {
    if (authModal) authModal.classList.add('hidden');
    if (blockedOverlay) {
      blockedOverlay.classList.remove('hidden');
      if (blockedTimeBadge) {
        blockedTimeBadge.textContent = `차단 해제까지: 약 ${remainingHours}시간`;
      }
    }
  }

  // 🔒 인증 모달 표시
  function showAuthModal(remainingAttempts = 5, errorMsg = '') {
    if (blockedOverlay) blockedOverlay.classList.add('hidden');
    if (authModal) {
      authModal.classList.remove('hidden');
      if (remainingAttemptsText) remainingAttemptsText.textContent = `남은 기회: ${remainingAttempts}회`;
      if (errorMsg && authErrorMsg) {
        authErrorMsg.textContent = errorMsg;
        authErrorMsg.classList.remove('hidden');
      } else if (authErrorMsg) {
        authErrorMsg.classList.add('hidden');
      }
      if (accessKeyInput) {
        accessKeyInput.value = '';
        accessKeyInput.focus();
      }
    }
  }

  // 🔒 액세스 키 검증 함수 (서버 API 호출)
  async function verifyAccessCode(codeToTest, isAuto = false) {
    if (!codeToTest && !isAuto) {
      showAuthModal(5, '비밀번호를 입력해 주세요.');
      return false;
    }

    try {
      const res = await fetch(`${SIGNALING_URL}/api/verify-auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: codeToTest })
      });

      const data = await res.json();

      if (res.status === 200 && data.success) {
        // 인증 성공!
        currentAccessKey = codeToTest;
        localStorage.setItem(AUTH_STORAGE_KEY, codeToTest);
        if (authModal) authModal.classList.add('hidden');
        if (blockedOverlay) blockedOverlay.classList.add('hidden');
        console.log('🔒 보안 인증 완료: 정상 접속 허용');

        // URL 쿼리에 key가 있었다면 깔끔하게 정리 (방 번호만 유지)
        const currentUrl = new URL(window.location.href);
        if (currentUrl.searchParams.has('key')) {
          currentUrl.searchParams.delete('key');
          window.history.replaceState({}, document.title, currentUrl.pathname + currentUrl.search);
        }

        // 서비스 초기화 진행
        loadRemoteFilters();
        initLobbySocket();
        return true;
      } else if (data.blocked) {
        // 5회 이상 실패로 24시간 차단 상태
        showBlockedOverlay(data.remainingHours || 24);
        return false;
      } else {
        // 비밀번호 불일치 (남은 기회 안내)
        currentAccessKey = '';
        localStorage.removeItem(AUTH_STORAGE_KEY);
        showAuthModal(data.remainingAttempts, data.message);
        return false;
      }
    } catch (err) {
      console.warn('인증 서버 연결 실패(오프라인 또는 오류):', err);
      // 오프라인 상태에서도 기본 로드는 시도
      loadRemoteFilters();
      return true;
    }
  }

  // 🔒 페이지 로드 시 URL 파라미터 및 저장된 키 검증
  const urlParams = new URLSearchParams(window.location.search);
  const paramKey = urlParams.get('key');
  const paramRoom = urlParams.get('room');
  if (paramRoom && roomIdInput) {
    roomIdInput.value = paramRoom;
  }

  // 초기 인증 시도
  if (paramKey) {
    // 1) URL에 ?key=...가 포함된 경우 자동 인증
    verifyAccessCode(paramKey, true);
  } else if (currentAccessKey) {
    // 2) 브라우저에 저장된 키가 있는 경우 자동 인증
    verifyAccessCode(currentAccessKey, true);
  } else {
    // 3) 키가 없으면 현재 IP 차단 상태 조회 후 모달 표시
    fetch(`${SIGNALING_URL}/api/auth-status`)
      .then(res => res.json())
      .then(status => {
        if (status.blocked) {
          showBlockedOverlay(status.remainingHours || 24);
        } else {
          showAuthModal(status.remainingAttempts || 5);
        }
      })
      .catch(() => {
        showAuthModal(5);
      });
  }

  // 모달 버튼 및 엔터키 이벤트 바인딩
  if (verifyKeyBtn) {
    verifyKeyBtn.addEventListener('click', () => {
      const inputVal = accessKeyInput ? accessKeyInput.value.trim() : '';
      verifyAccessCode(inputVal, false);
    });
  }
  if (accessKeyInput) {
    accessKeyInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const inputVal = accessKeyInput.value.trim();
        verifyAccessCode(inputVal, false);
      }
    });
  }

  // 🔗 지인 초대 링크 복사 버튼 이벤트 바인딩
  if (copyInviteLinkBtn) {
    copyInviteLinkBtn.addEventListener('click', () => {
      const baseOrigin = (typeof window !== 'undefined' && window.location.protocol.startsWith('http'))
        ? window.location.origin
        : 'https://video-call-app-q6e2.onrender.com';
      const targetRoom = roomIdInput ? roomIdInput.value.trim() || 'room-101' : 'room-101';
      const inviteUrl = `${baseOrigin}/?key=${encodeURIComponent(currentAccessKey || 'beauty2026')}&room=${encodeURIComponent(targetRoom)}`;

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(inviteUrl).then(() => {
          copyInviteLinkBtn.classList.add('copied');
          copyInviteLinkBtn.textContent = '✓ 초대 링크 복사 완료!';
          setTimeout(() => {
            copyInviteLinkBtn.classList.remove('copied');
            copyInviteLinkBtn.textContent = '🔗 지인 초대 링크 복사';
          }, 2500);
        }).catch(() => {
          prompt('아래 링크를 복사하여 지인 4명에게 보내주세요:', inviteUrl);
        });
      } else {
        prompt('아래 링크를 복사하여 지인 4명에게 보내주세요:', inviteUrl);
      }
    });
  }

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
    if (eyelinerSlider) {
      eyelinerSlider.value = s.eyeliner;
      eyelinerVal.textContent = `${s.eyeliner}%`;
    }
    if (highlighterSlider) {
      highlighterSlider.value = s.highlighter;
      highlighterVal.textContent = `${s.highlighter}%`;
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

    // Special Filters 단일 뷰티 강도 슬라이더 동기화
    const intensity = (s.beautyIntensity !== undefined) ? s.beautyIntensity : 45;
    if (specialIntensitySlider) {
      specialIntensitySlider.value = intensity;
      specialIntensityVal.textContent = `${intensity}%`;
    }
    if (inCallSpecialIntensitySlider) {
      inCallSpecialIntensitySlider.value = intensity;
      inCallSpecialIntensityVal.textContent = `${intensity}%`;
    }

    // 통화 중 드로어 슬라이더 동기화
    if (inCallEyelinerSlider) {
      inCallEyelinerSlider.value = s.eyeliner;
      inCallEyelinerVal.textContent = `${s.eyeliner}%`;
    }
    if (inCallHighlighterSlider) {
      inCallHighlighterSlider.value = s.highlighter;
      inCallHighlighterVal.textContent = `${s.highlighter}%`;
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

  // 카테고리 탭 (Basic Filters vs Special Filters) 전환 이벤트
  categoryTabBtns.forEach(tab => {
    tab.addEventListener('click', () => {
      const category = tab.dataset.category;
      filterProcessor.settings.category = category;
      applyCategoryTabUI(category);
      saveFilterSettings();
    });
  });

  // 프리셋 버튼 클릭 이벤트 (HTML 기본 하드코딩 버튼용)
  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = btn.dataset.preset;
      filterProcessor.setPreset(preset);

      // 활성 버튼 스타일 업데이트 (대기실 & 드로어 공통)
      document.querySelectorAll(`[data-preset]`).forEach(b => {
        b.classList.toggle('active', b.dataset.preset === preset);
      });

      updateSliderDisplay();
      saveFilterSettings();
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
        saveFilterSettings();
      });
    }
    if (inCallSlider) {
      inCallSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        if (inCallVal) inCallVal.textContent = `${val}%`;
        if (mainSlider) mainSlider.value = val;
        if (mainVal) mainVal.textContent = `${val}%`;
        filterProcessor.updateSetting(settingKey, val);
        saveFilterSettings();
      });
    }
  }

  // 아이라인, 하이라이터, 볼터치, 입술 틴트, 피부 보정, 밝기 슬라이더 연결
  bindSlider(eyelinerSlider, eyelinerVal, inCallEyelinerSlider, inCallEyelinerVal, 'eyeliner');
  bindSlider(highlighterSlider, highlighterVal, inCallHighlighterSlider, inCallHighlighterVal, 'highlighter');
  bindSlider(blushSlider, blushVal, inCallBlushSlider, inCallBlushVal, 'blush');
  bindSlider(lipTintSlider, lipTintVal, inCallLipSlider, inCallLipVal, 'lipTint');
  bindSlider(smoothingSlider, smoothingVal, inCallSmoothingSlider, inCallSmoothingVal, 'smoothing');
  bindSlider(brightnessSlider, brightnessVal, null, null, 'brightness');

  // Special Filters 상단 단일 뷰티 강도 슬라이더 연결
  bindSlider(specialIntensitySlider, specialIntensityVal, inCallSpecialIntensitySlider, inCallSpecialIntensityVal, 'beautyIntensity');

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

    // WebRTC 연결 관리자 초기화 (Render 클라우드 시그널링 서버 및 보안 키 연동)
    webrtcManager = new WebRTCManager({
      socketUrl: SIGNALING_URL,
      authKey: currentAccessKey,
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
