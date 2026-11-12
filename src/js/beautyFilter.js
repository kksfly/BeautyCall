/**
 * 실시간 뷰티 및 드라마틱 AR 스페셜 마스크 필터 프로세서
 * - Basic Filters: 기본 뷰티 (스킨 스무딩, 톤업, 색감 프리셋)
 * - Special Filters: 극강 뽀샤시 뷰티 + 머리/얼굴 움직임을 따라다니는 재미있는 3D AR 스티커 (머리 위 똥 💩, 고양이 귀 🐱, 황금 왕관 👑, 선글라스 🕶️)
 */
class BeautyFilterProcessor {
  constructor() {
    this.videoElement = null;
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: false });
    
    this.blurCanvas = document.createElement('canvas');
    this.blurCtx = this.blurCanvas.getContext('2d');

    this.maskCanvas = document.createElement('canvas');
    this.maskCtx = this.maskCanvas.getContext('2d');

    this.animationFrameId = null;
    this.isRunning = false;

    // 현재 설정값
    this.settings = {
      category: 'special',
      preset: 'poop',
      specialType: 'poop', // 'poop' | 'catEars' | 'crown' | 'sunglasses' | null
      beautyIntensity: 45, // 0 ~ 100 (%) Special Filters 상단 단일 뷰티 강도 (기본값: 자연스러운 45%)
      smoothing: 75,
      brightness: 110,
      contrast: 102,
      saturation: 108,
      rosyTint: 20,
      vignette: false,
      eyeBrighten: 40,
      blush: 55,
      lipTint: 65
    };

    // 1. Basic Filters
    this.basicPresets = {
      none: {
        specialType: null,
        smoothing: 0, brightness: 100, contrast: 100, saturation: 100,
        rosyTint: 0, vignette: false, eyeBrighten: 0, blush: 0, lipTint: 0
      },
      smooth: {
        specialType: null,
        smoothing: 70, brightness: 110, contrast: 102, saturation: 106,
        rosyTint: 25, vignette: false, eyeBrighten: 0, blush: 0, lipTint: 0
      },
      kbeauty: {
        specialType: null,
        smoothing: 80, brightness: 114, contrast: 100, saturation: 104,
        rosyTint: 20, vignette: false, eyeBrighten: 35, blush: 35, lipTint: 45
      },
      glamour: {
        specialType: null,
        smoothing: 75, brightness: 112, contrast: 104, saturation: 110,
        rosyTint: 15, vignette: false, eyeBrighten: 40, blush: 50, lipTint: 60
      },
      warm: {
        specialType: null,
        smoothing: 50, brightness: 106, contrast: 104, saturation: 115,
        rosyTint: 30, vignette: false, eyeBrighten: 0, blush: 25, lipTint: 25
      },
      cool: {
        specialType: null,
        smoothing: 70, brightness: 114, contrast: 100, saturation: 98,
        rosyTint: 15, vignette: false, eyeBrighten: 0, blush: 20, lipTint: 30
      },
      vintage: {
        specialType: null,
        smoothing: 40, brightness: 102, contrast: 112, saturation: 85,
        rosyTint: 10, vignette: true, eyeBrighten: 0, blush: 0, lipTint: 0
      },
      monochrome: {
        specialType: null,
        smoothing: 60, brightness: 105, contrast: 115, saturation: 0,
        rosyTint: 0, vignette: true, eyeBrighten: 0, blush: 0, lipTint: 0
      }
    };

    // 2. Special Filters (얼굴 뷰티 + 재미있는 3D AR 소품 장착)
    this.specialPresets = {
      poop: {
        specialType: 'poop',
        smoothing: 82,      // 도자기 피부
        brightness: 114,
        contrast: 103,
        saturation: 112,
        rosyTint: 20,
        vignette: false,
        eyeBrighten: 45,
        blush: 65,          // 수줍은 핑크 볼터치
        lipTint: 70         // 로즈 립
      },
      catEars: {
        specialType: 'catEars',
        smoothing: 85,      // 뽀샤시 고양이
        brightness: 116,
        contrast: 102,
        saturation: 110,
        rosyTint: 25,
        vignette: false,
        eyeBrighten: 50,
        blush: 60,
        lipTint: 65
      },
      crown: {
        specialType: 'crown',
        smoothing: 80,      // 우아한 로열 뷰티
        brightness: 115,
        contrast: 104,
        saturation: 114,
        rosyTint: 15,
        vignette: false,
        eyeBrighten: 45,
        blush: 50,
        lipTint: 75
      },
      sunglasses: {
        specialType: 'sunglasses',
        smoothing: 75,      // 힙합 쿨 뷰티
        brightness: 110,
        contrast: 106,
        saturation: 108,
        rosyTint: 10,
        vignette: false,
        eyeBrighten: 30,
        blush: 40,
        lipTint: 60
      },
      dotMask: {
        specialType: 'dotMask',
        smoothing: 80,      // 하얀 3D 도트 매트릭스 마스크
        brightness: 110,    // 화사한 컬러 뷰티
        contrast: 104,
        saturation: 108,    // 🎨 생생한 자연스러운 컬러 유지
        rosyTint: 15,
        vignette: false,    // 어두운 비네팅 해제
        eyeBrighten: 45,
        blush: 25,
        lipTint: 30
      },
      hotdog: {
        specialType: 'sausage',
        smoothing: 82,      // 뽀샤시 도자기 피부
        brightness: 114,
        contrast: 103,
        saturation: 112,
        rosyTint: 20,
        vignette: false,
        eyeBrighten: 45,
        blush: 60,          // 귀여운 핑크 볼터치
        lipTint: 70         // 로즈 립
      },
      sausage: {
        specialType: 'sausage',
        smoothing: 82,      // 뽀샤시 도자기 피부
        brightness: 114,
        contrast: 103,
        saturation: 112,
        rosyTint: 20,
        vignette: false,
        eyeBrighten: 45,
        blush: 60,          // 귀여운 핑크 볼터치
        lipTint: 70         // 로즈 립
      }
    };

    // 랜드마크 인덱스
    this.faceOvalIndices = [
      10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
      397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
      172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109
    ];
    this.outerLipIndices = [
      61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291,
      375, 321, 405, 314, 17, 84, 181, 91, 146
    ];

    this.faceMesh = null;
    this.landmarks = null;
    this.isDetectingFace = false;

    this.initFaceMesh();
  }

  async initFaceMesh() {
    let FaceMeshModule = null;

    if (typeof require !== 'undefined') {
      try {
        const mp = require('@mediapipe/face_mesh');
        FaceMeshModule = mp.FaceMesh;
      } catch (e) {
        console.warn('로컬 @mediapipe/face_mesh require 실패:', e);
      }
    }

    if (!FaceMeshModule && typeof window !== 'undefined' && window.FaceMesh) {
      FaceMeshModule = window.FaceMesh;
    }

    if (FaceMeshModule) {
      try {
        this.faceMesh = new FaceMeshModule({
          locateFile: (file) => {
            if (typeof require !== 'undefined') {
              try {
                const path = require('path');
                return path.join(__dirname, '../node_modules/@mediapipe/face_mesh', file);
              } catch (_) {}
            }
            return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
          }
        });

        this.faceMesh.setOptions({
          maxNumFaces: 1,
          refineLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        this.faceMesh.onResults((results) => {
          if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
            this.landmarks = results.multiFaceLandmarks[0];
          } else {
            this.landmarks = null;
          }
        });

        console.log('✅ FaceMesh 엔진 로드 성공');
      } catch (err) {
        console.error('FaceMesh 초기화 오류:', err);
      }
    }
  }

  hasPreset(presetName) {
    return Boolean(
      (this.specialPresets && this.specialPresets[presetName]) ||
      (this.basicPresets && this.basicPresets[presetName])
    );
  }

  getPresetCategory(presetName) {
    if (this.specialPresets && this.specialPresets[presetName]) return 'special';
    if (this.basicPresets && this.basicPresets[presetName]) return 'basic';
    return null;
  }

  loadRemotePresets(config) {
    if (!config) return;

    if (Array.isArray(config.basic)) {
      this.basicPresets = {};
      config.basic.forEach(item => {
        this.basicPresets[item.id] = { specialType: null, ...item.settings };
      });
    }

    if (Array.isArray(config.special)) {
      this.specialPresets = {};
      config.special.forEach(item => {
        this.specialPresets[item.id] = { specialType: item.specialType || item.id, ...item.settings };
      });
    }

    // 🛡️ 현재 선택된 프리셋이 새로 업데이트된 서버 목록에 여전히 존재하는지 확인
    const currentPreset = this.settings.preset;
    if (!this.hasPreset(currentPreset)) {
      console.warn(`🛡️ [Defense] 서버에서 "${currentPreset}" 필터가 삭제/변경되어 안전한 기본 필터로 전환합니다.`);
      this.setPreset(this.settings.category === 'basic' ? 'none' : 'poop');
    } else {
      this.setPreset(currentPreset);
    }

    console.log('✅ 서버로부터 최신 필터 프리셋 동기화 완료');
  }

  start(videoElement) {
    this.videoElement = videoElement;
    this.isRunning = true;

    const updateDimensions = () => {
      const width = this.videoElement.videoWidth || 640;
      const height = this.videoElement.videoHeight || 480;

      if (this.canvas.width !== width || this.canvas.height !== height) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.blurCanvas.width = width;
        this.blurCanvas.height = height;
        this.maskCanvas.width = width;
        this.maskCanvas.height = height;
      }
    };

    if (this.videoElement.videoWidth > 0) {
      updateDimensions();
    } else {
      this.videoElement.addEventListener('loadedmetadata', updateDimensions, { once: true });
    }

    let lastDetectionTime = 0;

    const render = (time) => {
      if (!this.isRunning) return;

      if (this.videoElement && this.videoElement.readyState >= 2) {
        updateDimensions();

        if (this.faceMesh && !this.isDetectingFace && (time - lastDetectionTime > 45)) {
          this.isDetectingFace = true;
          lastDetectionTime = time;
          this.faceMesh.send({ image: this.videoElement }).finally(() => {
            this.isDetectingFace = false;
          });
        }

        this.applyFilters();
      }

      this.animationFrameId = requestAnimationFrame(render);
    };

    render(0);
  }

  stop() {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  setPreset(presetName) {
    if (this.specialPresets && this.specialPresets[presetName]) {
      this.settings.category = 'special';
      this.settings.preset = presetName;
      Object.assign(this.settings, this.specialPresets[presetName]);
      return presetName;
    } else if (this.basicPresets && this.basicPresets[presetName]) {
      this.settings.category = 'basic';
      this.settings.preset = presetName;
      Object.assign(this.settings, this.basicPresets[presetName]);
      return presetName;
    } else {
      // 🛡️ 서버나 로컬에 해당 필터가 존재하지 않는 경우의 방어 조치
      console.warn(`🛡️ [Defense] 요청한 필터 "${presetName}"을 찾을 수 없어 안전한 기본 필터로 전환합니다.`);
      const fallback = (this.specialPresets && this.specialPresets['poop']) ? 'poop'
        : (this.specialPresets && Object.keys(this.specialPresets)[0])
        || (this.basicPresets && this.basicPresets['none'] ? 'none' : Object.keys(this.basicPresets || {})[0])
        || 'none';

      if (fallback && fallback !== presetName && (this.specialPresets?.[fallback] || this.basicPresets?.[fallback])) {
        return this.setPreset(fallback);
      }
      return null;
    }
  }

  updateSetting(key, value) {
    if (key in this.settings) {
      this.settings[key] = value;
    }
  }

  getFaceCoordinates(width, height) {
    if (!this.landmarks) return null;

    const lm = this.landmarks;
    const leftEyeX = (lm[468]?.x ?? (lm[159].x + lm[145].x) / 2) * width;
    const leftEyeY = (lm[468]?.y ?? (lm[159].y + lm[145].y) / 2) * height;

    const rightEyeX = (lm[473]?.x ?? (lm[386].x + lm[374].x) / 2) * width;
    const rightEyeY = (lm[473]?.y ?? (lm[386].y + lm[374].y) / 2) * height;

    const leftCheekX = (lm[205]?.x ?? 0.38) * width;
    const leftCheekY = (lm[205]?.y ?? 0.52) * height;
    const rightCheekX = (lm[425]?.x ?? 0.62) * width;
    const rightCheekY = (lm[425]?.y ?? 0.52) * height;

    const lipX = ((lm[13]?.x ?? 0.5) + (lm[14]?.x ?? 0.5)) * 0.5 * width;
    const lipY = ((lm[13]?.y ?? 0.65) + (lm[14]?.y ?? 0.65)) * 0.5 * height;

    // 얼굴 기울기 각도 (Roll Angle)
    const angle = Math.atan2(rightEyeY - leftEyeY, rightEyeX - leftEyeX);

    // 얼굴 크기 (Scale)
    const eyeDist = Math.hypot(rightEyeX - leftEyeX, rightEyeY - leftEyeY);
    const faceScale = Math.max(30, eyeDist);

    // 머리 정수리 위치 (랜드마크 10번)
    const headTopX = lm[10].x * width;
    const headTopY = lm[10].y * height;

    // 코 끝 위치 (랜드마크 4번)
    const noseX = lm[4].x * width;
    const noseY = lm[4].y * height;

    return {
      leftEye: { x: leftEyeX, y: leftEyeY, radius: faceScale * 0.35 },
      rightEye: { x: rightEyeX, y: rightEyeY, radius: faceScale * 0.35 },
      leftCheek: { x: leftCheekX, y: leftCheekY, radius: faceScale * 0.5 },
      rightCheek: { x: rightCheekX, y: rightCheekY, radius: faceScale * 0.5 },
      lip: { x: lipX, y: lipY, radiusX: faceScale * 0.38, radiusY: faceScale * 0.18 },
      headTop: { x: headTopX, y: headTopY },
      nose: { x: noseX, y: noseY },
      angle,
      scale: faceScale
    };
  }

  applyFilters() {
    const { width, height } = this.canvas;
    if (width === 0 || height === 0) return;

    const {
      smoothing, brightness, contrast, saturation, rosyTint,
      vignette, eyeBrighten, blush, lipTint, specialType, beautyIntensity
    } = this.settings;

    // Special Filters 탭일 때는 상단 단일 슬라이더(beautyIntensity)로 뷰티 전체 강도를 일괄 제어
    const intensityRatio = (this.settings.category === 'special')
      ? ((beautyIntensity ?? 45) / 100)
      : 1.0;

    const effectiveSmoothing = smoothing * intensityRatio;
    const effectiveBlush = blush * intensityRatio;
    const effectiveLip = lipTint * intensityRatio;
    const effectiveEyeBrighten = eyeBrighten * intensityRatio;
    const effectiveRosy = rosyTint * intensityRatio;
    const effectiveBrightness = 100 + (brightness - 100) * intensityRatio;

    const filterString = `brightness(${effectiveBrightness}%) contrast(${contrast}%) saturate(${saturation}%)`;

    // 1. 메인 선명한 원본 영상 렌더링
    this.ctx.filter = filterString;
    this.ctx.drawImage(this.videoElement, 0, 0, width, height);
    this.ctx.filter = 'none';

    const coords = this.getFaceCoordinates(width, height);

    // 2. 얼굴 전용 스킨 스무딩 (도자기 피부)
    if (effectiveSmoothing > 0 && coords && this.landmarks) {
      this.applyFaceOnlySmoothing(width, height, filterString, effectiveSmoothing, coords);
    }

    // 3. 뷰티 메이크업 (치크 블러셔, 립 틴트, 눈가 브라이트닝)
    if (coords && this.landmarks) {
      if (effectiveBlush > 0) {
        this.applyCheekBlush(coords.leftCheek, (effectiveBlush / 100) * 0.38);
        this.applyCheekBlush(coords.rightCheek, (effectiveBlush / 100) * 0.38);
      }

      if (effectiveEyeBrighten > 0) {
        this.applyEyeBrightening(coords.leftEye, (effectiveEyeBrighten / 100) * 0.22);
        this.applyEyeBrightening(coords.rightEye, (effectiveEyeBrighten / 100) * 0.22);
      }

      if (effectiveLip > 0) {
        this.applyContouredLipTint(width, height, (effectiveLip / 100) * 0.45);
      }

      // 4. 🎭 Special Filters: 머리/얼굴 움직임을 따라다니는 재미있는 3D AR 스티커 렌더링
      if (specialType) {
        this.renderDramaticSpecialProps(width, height, coords, specialType);
      }
    }

    // 5. 전체 핑크 생기 틴트
    if (effectiveRosy > 0) {
      this.ctx.save();
      this.ctx.globalCompositeOperation = 'soft-light';
      this.ctx.fillStyle = `rgba(255, 175, 190, ${(effectiveRosy / 100) * 0.3})`;
      this.ctx.fillRect(0, 0, width, height);
      this.ctx.restore();
    }

    // 6. 비네팅
    if (vignette) {
      this.ctx.save();
      const gradient = this.ctx.createRadialGradient(
        width / 2, height / 2, Math.min(width, height) * 0.35,
        width / 2, height / 2, Math.max(width, height) * 0.75
      );
      gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(0, 0, width, height);
      this.ctx.restore();
    }
  }

  /**
   * 🎭 드라마틱한 스페셜 AR 소품/스티커 실시간 렌더링 (얼굴 각도 및 크기 완벽 추적)
   */
  renderDramaticSpecialProps(width, height, coords, type) {
    const { headTop, angle, scale, leftEye, rightEye, nose, leftCheek, rightCheek } = coords;

    this.ctx.save();

    // 1. 💩 머리 위의 귀여운 똥 (Poop on Head)
    if (type === 'poop') {
      // 머리 정수리 위쪽으로 이동 및 머리 기울기 각도 회전
      const propY = headTop.y - scale * 0.35;
      this.ctx.translate(headTop.x, propY);
      this.ctx.rotate(angle);

      const propSize = scale * 0.95; // 얼굴 크기에 비례하는 큼직하고 재미있는 크기

      this.ctx.font = `${Math.round(propSize)}px -apple-system, BlinkMacSystemFont, "Segoe UI Emoji", "Apple Color Emoji"`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';

      // 그림자 효과로 입체감 부여
      this.ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
      this.ctx.shadowBlur = 10;
      this.ctx.shadowOffsetY = 6;

      this.ctx.fillText('💩', 0, 0);

      // 머리 위에 떠 있는 작은 반짝임 파티클들
      this.ctx.shadowBlur = 0;
      this.ctx.font = `${Math.round(propSize * 0.3)}px sans-serif`;
      this.ctx.fillText('✨', propSize * 0.45, -propSize * 0.25);
      this.ctx.fillText('💫', -propSize * 0.45, -propSize * 0.15);
    }

    // 2. 🐱 귀여운 고양이 귀 & 수염 (Cute Cat Ears & Whiskers)
    else if (type === 'catEars') {
      // 머리 정수리 기준 고양이 귀
      this.ctx.translate(headTop.x, headTop.y - scale * 0.15);
      this.ctx.rotate(angle);

      const earDist = scale * 0.65;
      const earSize = scale * 0.55;

      this.ctx.font = `${Math.round(earSize)}px -apple-system, BlinkMacSystemFont, "Segoe UI Emoji"`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';

      // 왼쪽 핑크 귀 & 오른쪽 핑크 귀
      this.ctx.fillText('🌸', -earDist, -earSize * 0.3);
      this.ctx.fillText('🌸', earDist, -earSize * 0.3);

      this.ctx.restore();
      this.ctx.save();

      // 코 중심 핑크 젤리 코
      this.ctx.fillStyle = 'rgba(255, 130, 165, 0.85)';
      this.ctx.beginPath();
      this.ctx.arc(nose.x, nose.y, scale * 0.08, 0, Math.PI * 2);
      this.ctx.fill();

      // 양 볼 깜찍한 고양이 수염 3줄씩
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      this.ctx.lineWidth = Math.max(2, scale * 0.035);
      this.ctx.lineCap = 'round';

      // 왼쪽 수염 3가닥
      const wLen = scale * 0.45;
      [-0.15, 0, 0.15].forEach(dy => {
        this.ctx.beginPath();
        this.ctx.moveTo(leftCheek.x - scale * 0.1, leftCheek.y + dy * scale);
        this.ctx.lineTo(leftCheek.x - scale * 0.1 - wLen, leftCheek.y + dy * scale * 1.6);
        this.ctx.stroke();
      });

      // 오른쪽 수염 3가닥
      [-0.15, 0, 0.15].forEach(dy => {
        this.ctx.beginPath();
        this.ctx.moveTo(rightCheek.x + scale * 0.1, rightCheek.y + dy * scale);
        this.ctx.lineTo(rightCheek.x + scale * 0.1 + wLen, rightCheek.y + dy * scale * 1.6);
        this.ctx.stroke();
      });
    }

    // 3. 👑 황금 왕관 (Royal Crown)
    else if (type === 'crown') {
      const propY = headTop.y - scale * 0.35;
      this.ctx.translate(headTop.x, propY);
      this.ctx.rotate(angle);

      const propSize = scale * 1.05;

      this.ctx.shadowColor = 'rgba(255, 215, 0, 0.6)';
      this.ctx.shadowBlur = 18;

      this.ctx.font = `${Math.round(propSize)}px -apple-system, BlinkMacSystemFont, "Segoe UI Emoji"`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText('👑', 0, 0);

      // 왕관 주변 번쩍이는 별빛
      this.ctx.font = `${Math.round(propSize * 0.28)}px sans-serif`;
      this.ctx.fillText('✨', -propSize * 0.55, -propSize * 0.2);
      this.ctx.fillText('⭐', propSize * 0.55, -propSize * 0.25);
    }

    // 4. 🕶️ 힙합 쿨 선글라스 (눈 위치와 너비에 100% 완벽 밀착되는 와이드 선글라스)
    else if (type === 'sunglasses') {
      const eyeMidX = (leftEye.x + rightEye.x) / 2;
      const eyeMidY = (leftEye.y + rightEye.y) / 2;
      const eyeDist = Math.hypot(rightEye.x - leftEye.x, rightEye.y - leftEye.y);

      this.ctx.translate(eyeMidX, eyeMidY);
      this.ctx.rotate(angle);

      // 눈 사이 거리를 기준으로 정확한 렌즈 크기 계산
      const lensW = eyeDist * 0.85;  // 렌즈 가로 폭
      const lensH = eyeDist * 0.55;  // 렌즈 세로 높이
      const halfDist = eyeDist * 0.5; // 두 눈 사이 중심 오프셋

      // 안경 그림자
      this.ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
      this.ctx.shadowBlur = 12;
      this.ctx.shadowOffsetY = 6;

      // 1. 선글라스 프레임 (블랙 웨이페어러 / 픽셀 힙합 스타일)
      this.ctx.fillStyle = '#0a0a0c';
      this.ctx.strokeStyle = '#1a1a20';
      this.ctx.lineWidth = Math.max(2, eyeDist * 0.05);

      // 상단 탑 브로우 라인 (양쪽 관자놀이까지 시원하게 연결)
      const topBarW = eyeDist * 2.3;
      const topBarH = eyeDist * 0.16;
      this.ctx.beginPath();
      this.ctx.roundRect(-topBarW * 0.5, -lensH * 0.6, topBarW, topBarH, 4);
      this.ctx.fill();
      this.ctx.stroke();

      // 가운데 코 브릿지
      this.ctx.fillRect(-eyeDist * 0.2, -lensH * 0.45, eyeDist * 0.4, eyeDist * 0.18);

      // 2. 왼쪽 렌즈 (정확히 왼쪽 눈 위에 안착)
      this.ctx.beginPath();
      this.ctx.roundRect(-halfDist - lensW * 0.5, -lensH * 0.5, lensW, lensH, [2, 2, 8, 8]);
      this.ctx.fill();
      this.ctx.stroke();

      // 3. 오른쪽 렌즈 (정확히 오른쪽 눈 위에 안착)
      this.ctx.beginPath();
      this.ctx.roundRect(halfDist - lensW * 0.5, -lensH * 0.5, lensW, lensH, [2, 2, 8, 8]);
      this.ctx.fill();
      this.ctx.stroke();

      // 그림자 제거 후 렌즈 반사광 렌더링
      this.ctx.shadowColor = 'transparent';
      this.ctx.shadowBlur = 0;

      // 스타일리시한 대각선 화이트 반사광 (Glossy Glare)
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      this.ctx.lineWidth = Math.max(2, eyeDist * 0.04);
      this.ctx.lineCap = 'round';

      // 왼쪽 렌즈 반사광
      this.ctx.beginPath();
      this.ctx.moveTo(-halfDist - lensW * 0.28, -lensH * 0.35);
      this.ctx.lineTo(-halfDist + lensW * 0.15, lensH * 0.3);
      this.ctx.stroke();

      // 오른쪽 렌즈 반사광
      this.ctx.beginPath();
      this.ctx.moveTo(halfDist - lensW * 0.28, -lensH * 0.35);
      this.ctx.lineTo(halfDist + lensW * 0.15, lensH * 0.3);
      this.ctx.stroke();
    }

    // 5. ⚪ Cyber Dot Mask (눈을 제외한 나머지 얼굴과 목을 하얀색 점들로 덮는 3D AR 효과)
    else if (type === 'dotMask') {
      const lm = this.landmarks;
      if (!lm) {
        this.ctx.restore();
        return;
      }

      const leftEye = coords.leftEye;
      const rightEye = coords.rightEye;
      const eyeDist = Math.hypot(rightEye.x - leftEye.x, rightEye.y - leftEye.y);

      // 1. 눈과 입술 제외 반경 (표정이 자연스럽고 예쁘게 드러나도록 설정)
      const eyeExclusionRadiusX = eyeDist * 0.38;
      const eyeExclusionRadiusY = eyeDist * 0.26;
      const lipRadiusX = (coords.lip.radiusX || 30) * 1.25;
      const lipRadiusY = (coords.lip.radiusY || 20) * 1.25;

      // 2. 점의 크기: 약간만 더 큼직하게 (약 4.2 ~ 5.6px)
      const baseDotRadius = Math.max(4.2, scale * 0.028);

      // 3. 일정한 패턴을 위한 최소 거리 간격 (점 크기 확대에 맞춰 자연스러운 간격 유지)
      const minSpacing = Math.max(16, scale * 0.096);
      const minSpacingSq = minSpacing * minSpacing;

      // 4. 머리카락(헤어라인) 및 턱 바깥 침범 방지용 순수 얼굴 윤곽 Path
      const facePath = new Path2D();
      for (let i = 0; i < this.faceOvalIndices.length; i++) {
        const idx = this.faceOvalIndices[i];
        const px = lm[idx].x * width;
        const py = lm[idx].y * height;
        if (i === 0) facePath.moveTo(px, py);
        else facePath.lineTo(px, py);
      }
      facePath.closePath();

      // 코끝 중심점 (콧망울 밀집 완화용)
      const noseTip = lm[4] || lm[1];
      const noseTipX = noseTip ? noseTip.x * width : 0;
      const noseTipY = noseTip ? noseTip.y * height : 0;

      // 균일한 일정한 패턴으로 선택된 3D 포인트 목록
      const selectedPoints = [];

      // 랜드마크를 순회하며 균일한 간격(Poisson Disk)으로 샘플링
      for (let i = 0; i < 468; i++) {
        const pt = lm[i];
        if (!pt) continue;

        const px = pt.x * width;
        const py = pt.y * height;

        // (1) 머리카락 및 턱선 바깥 제외 (얼굴 피부 윤곽선 내부만 허용)
        if (!this.ctx.isPointInPath(facePath, px, py)) continue;

        // (2) 왼쪽 눈 제외
        const dxL = (px - leftEye.x) / eyeExclusionRadiusX;
        const dyL = (py - leftEye.y) / eyeExclusionRadiusY;
        if (dxL * dxL + dyL * dyL < 1.0) continue;

        // (3) 오른쪽 눈 제외
        const dxR = (px - rightEye.x) / eyeExclusionRadiusX;
        const dyR = (py - rightEye.y) / eyeExclusionRadiusY;
        if (dxR * dxR + dyR * dyR < 1.0) continue;

        // (4) 입술 영역 제외 (입 주변 뭉침 및 징그러운 느낌 방지)
        const dxLip = (px - coords.lip.x) / lipRadiusX;
        const dyLip = (py - coords.lip.y) / lipRadiusY;
        if (dxLip * dxLip + dyLip * dyLip < 1.0) continue;

        // (5) 콧볼/콧구멍 바로 밑 과도한 밀집 방지 (코끝 중심 하나만 남기고 주변 미세점 정리)
        if (noseTip) {
          const distToNose = Math.hypot(px - noseTipX, py - noseTipY);
          if (distToNose < minSpacing * 0.75 && i !== 4 && i !== 1) {
            continue;
          }
        }

        // (6) 얼굴 곡선을 따라 일정한 간격 유지 검사
        let isTooClose = false;
        for (let j = 0; j < selectedPoints.length; j++) {
          const sp = selectedPoints[j];
          const distSq = (px - sp.x) * (px - sp.x) + (py - sp.y) * (py - sp.y);
          if (distSq < minSpacingSq) {
            isTooClose = true;
            break;
          }
        }
        if (isTooClose) continue;

        selectedPoints.push({
          x: px,
          y: py,
          z: pt.z || 0
        });
      }

      // 5. 점 렌더링: 가우시안 블러 및 은은한 소프트 글로우 도트
      this.ctx.save();

      // 전체 가우시안 블러 필터 적용 (테두리가 뽀얗고 몽환적으로 흐려짐)
      this.ctx.filter = 'blur(2.4px)';
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      this.ctx.shadowColor = 'rgba(255, 255, 255, 0.95)';
      this.ctx.shadowBlur = Math.max(6, baseDotRadius * 1.8);

      this.ctx.beginPath();
      for (let i = 0; i < selectedPoints.length; i++) {
        const p = selectedPoints[i];
        // 3D 깊이(z) 반영: 코/볼 중심은 조금 더 크고, 외곽으로 갈수록 자연스럽게 원근 축소
        const zFactor = Math.max(0.78, Math.min(1.22, 1.0 - (p.z || 0) * 1.8));
        const r = baseDotRadius * zFactor;

        this.ctx.moveTo(p.x + r, p.y);
        this.ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      }
      this.ctx.fill();

      // 블러 필터 해제
      this.ctx.filter = 'none';
      this.ctx.restore();
    }

    // 6. 🌭 머리 위의 통통하고 귀여운 소세지 (Cute Sausage on Head)
    else if (type === 'sausage' || type === 'hotdog') {
      const propY = headTop.y - scale * 0.38;
      this.ctx.translate(headTop.x, propY);
      this.ctx.rotate(angle);

      // 소세지 본체 크기 (가로로 통통하게 얹혀짐)
      const w = scale * 1.05; // 소세지 가로 길이
      const h = scale * 0.44; // 소세지 세로 두께
      const r = h * 0.5;      // 캡슐 라운드 반경

      // 1. 소세지 전체 입체 그림자
      this.ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
      this.ctx.shadowBlur = 14;
      this.ctx.shadowOffsetY = 8;

      // 2. 소세지 캡슐 바디 (매끄러운 그라데이션)
      const sausageGrad = this.ctx.createLinearGradient(0, -h / 2, 0, h / 2);
      sausageGrad.addColorStop(0, '#ff6b81');   // 상단 밝은 코랄 핑크 하이라이트
      sausageGrad.addColorStop(0.3, '#ee5253'); // 신선하고 먹음직스러운 레드
      sausageGrad.addColorStop(0.7, '#d63031'); // 깊은 소세지 레드
      sausageGrad.addColorStop(1, '#8b152b');   // 하단 섀도우

      this.ctx.fillStyle = sausageGrad;
      this.ctx.beginPath();
      this.ctx.roundRect(-w / 2, -h / 2, w, h, r);
      this.ctx.fill();

      // 소세지 외곽 테두리 (살짝 짙은 윤곽선)
      this.ctx.strokeStyle = '#741022';
      this.ctx.lineWidth = Math.max(1.5, scale * 0.02);
      this.ctx.stroke();

      // 그림자 해제
      this.ctx.shadowColor = 'transparent';
      this.ctx.shadowBlur = 0;
      this.ctx.shadowOffsetY = 0;

      // 3. 양쪽 끝 매듭 주름 디테일 (비엔나 꼬투리)
      this.ctx.fillStyle = '#6b0f20';
      this.ctx.beginPath();
      this.ctx.arc(-w / 2 + r * 0.25, 0, r * 0.22, 0, Math.PI * 2);
      this.ctx.arc(w / 2 - r * 0.25, 0, r * 0.22, 0, Math.PI * 2);
      this.ctx.fill();

      // 4. 귀여운 사선 칼집 (3줄)
      const cutOffsets = [-w * 0.24, 0, w * 0.24];
      cutOffsets.forEach(cx => {
        // 칼집 벌어진 안쪽 핑크 살코기
        this.ctx.strokeStyle = 'rgba(255, 205, 215, 0.9)';
        this.ctx.lineWidth = Math.max(2.5, scale * 0.035);
        this.ctx.lineCap = 'round';
        this.ctx.beginPath();
        this.ctx.moveTo(cx - scale * 0.06, -h * 0.35);
        this.ctx.lineTo(cx + scale * 0.06, h * 0.25);
        this.ctx.stroke();

        // 칼집 안쪽 짙은 그림자 라인
        this.ctx.strokeStyle = 'rgba(115, 15, 30, 0.7)';
        this.ctx.lineWidth = Math.max(1, scale * 0.015);
        this.ctx.beginPath();
        this.ctx.moveTo(cx - scale * 0.06, -h * 0.35);
        this.ctx.lineTo(cx + scale * 0.06, h * 0.25);
        this.ctx.stroke();
      });

      // 5. 상단 탱글탱글 윤기 하이라이트 (Glossy White Sheen)
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
      this.ctx.lineWidth = Math.max(2, scale * 0.03);
      this.ctx.lineCap = 'round';
      this.ctx.beginPath();
      this.ctx.moveTo(-w * 0.38, -h * 0.28);
      this.ctx.quadraticCurveTo(0, -h * 0.34, w * 0.38, -h * 0.28);
      this.ctx.stroke();

      // 6. 소세지 얼굴 카와이 표정 (귀여운 눈 & 볼터치 & 미소 입)
      // 양쪽 눈 (초롱초롱 블랙 도트)
      const eyeSpacing = w * 0.12;
      const eyeY = -h * 0.02;
      const eyeRadius = Math.max(2.5, scale * 0.03);
      this.ctx.fillStyle = '#2d3436';
      this.ctx.beginPath();
      this.ctx.arc(-eyeSpacing, eyeY, eyeRadius, 0, Math.PI * 2);
      this.ctx.arc(eyeSpacing, eyeY, eyeRadius, 0, Math.PI * 2);
      this.ctx.fill();

      // 눈 속 하얀 반짝이 하이라이트
      this.ctx.fillStyle = '#ffffff';
      this.ctx.beginPath();
      this.ctx.arc(-eyeSpacing - eyeRadius * 0.3, eyeY - eyeRadius * 0.3, eyeRadius * 0.4, 0, Math.PI * 2);
      this.ctx.arc(eyeSpacing - eyeRadius * 0.3, eyeY - eyeRadius * 0.3, eyeRadius * 0.4, 0, Math.PI * 2);
      this.ctx.fill();

      // 귀여운 핑크 볼터치
      this.ctx.fillStyle = 'rgba(255, 120, 160, 0.85)';
      this.ctx.beginPath();
      this.ctx.arc(-eyeSpacing - eyeRadius * 1.5, eyeY + eyeRadius * 1.2, eyeRadius * 0.9, 0, Math.PI * 2);
      this.ctx.arc(eyeSpacing + eyeRadius * 1.5, eyeY + eyeRadius * 1.2, eyeRadius * 0.9, 0, Math.PI * 2);
      this.ctx.fill();

      // 귀여운 방긋 미소 입 (∪)
      this.ctx.strokeStyle = '#2d3436';
      this.ctx.lineWidth = Math.max(1.8, scale * 0.022);
      this.ctx.beginPath();
      this.ctx.arc(0, eyeY + eyeRadius * 0.6, eyeRadius * 0.8, 0.1 * Math.PI, 0.9 * Math.PI, false);
      this.ctx.stroke();

      // 7. 소세지 위 모락모락 김(♨️) & 반짝이(✨, ⭐)
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';

      // 모락모락 김
      this.ctx.font = `${Math.round(scale * 0.34)}px sans-serif`;
      this.ctx.fillText('♨️', 0, -h * 0.9);

      // 양쪽 반짝이
      this.ctx.font = `${Math.round(scale * 0.28)}px sans-serif`;
      this.ctx.fillText('✨', w * 0.52, -h * 0.55);
      this.ctx.fillText('⭐', -w * 0.52, -h * 0.55);
    }

    this.ctx.restore();
  }

  applyFaceOnlySmoothing(width, height, filterString, smoothing, coords) {
    const blurRadius = Math.max(2, Math.round((smoothing / 100) * 9));
    this.blurCtx.clearRect(0, 0, width, height);
    this.blurCtx.filter = `blur(${blurRadius}px) ${filterString}`;
    this.blurCtx.drawImage(this.videoElement, 0, 0, width, height);
    this.blurCtx.filter = 'none';

    this.maskCtx.clearRect(0, 0, width, height);
    this.maskCtx.save();
    this.maskCtx.filter = 'blur(12px)';
    this.maskCtx.fillStyle = '#ffffff';

    this.maskCtx.beginPath();
    const lm = this.landmarks;
    for (let i = 0; i < this.faceOvalIndices.length; i++) {
      const idx = this.faceOvalIndices[i];
      const px = lm[idx].x * width;
      const py = lm[idx].y * height;
      if (i === 0) this.maskCtx.moveTo(px, py);
      else this.maskCtx.lineTo(px, py);
    }
    this.maskCtx.closePath();
    this.maskCtx.fill();

    // 눈과 입술 구멍 제외 (선명도 유지)
    this.maskCtx.filter = 'blur(6px)';
    this.maskCtx.globalCompositeOperation = 'destination-out';

    this.maskCtx.beginPath();
    this.maskCtx.arc(coords.leftEye.x, coords.leftEye.y, coords.leftEye.radius * 0.9, 0, Math.PI * 2);
    this.maskCtx.fill();

    this.maskCtx.beginPath();
    this.maskCtx.arc(coords.rightEye.x, coords.rightEye.y, coords.rightEye.radius * 0.9, 0, Math.PI * 2);
    this.maskCtx.fill();

    this.maskCtx.save();
    this.maskCtx.translate(coords.lip.x, coords.lip.y);
    this.maskCtx.scale(1, coords.lip.radiusY / coords.lip.radiusX);
    this.maskCtx.beginPath();
    this.maskCtx.arc(0, 0, coords.lip.radiusX * 1.1, 0, Math.PI * 2);
    this.maskCtx.fill();
    this.maskCtx.restore();

    this.maskCtx.restore();

    this.blurCtx.save();
    this.blurCtx.globalCompositeOperation = 'destination-in';
    this.blurCtx.drawImage(this.maskCanvas, 0, 0);
    this.blurCtx.restore();

    this.ctx.save();
    this.ctx.globalAlpha = (smoothing / 100) * 0.72;
    this.ctx.drawImage(this.blurCanvas, 0, 0);
    this.ctx.restore();
  }

  applyContouredLipTint(width, height, alpha) {
    const lm = this.landmarks;
    if (!lm) return;

    this.ctx.save();
    this.ctx.globalCompositeOperation = 'soft-light';

    this.ctx.beginPath();
    for (let i = 0; i < this.outerLipIndices.length; i++) {
      const idx = this.outerLipIndices[i];
      const px = lm[idx].x * width;
      const py = lm[idx].y * height;
      if (i === 0) this.ctx.moveTo(px, py);
      else this.ctx.lineTo(px, py);
    }
    this.ctx.closePath();

    this.ctx.fillStyle = `rgba(230, 40, 80, ${alpha * 1.3})`;
    this.ctx.fill();

    const centerLip = lm[13];
    const centerGrad = this.ctx.createRadialGradient(
      centerLip.x * width, centerLip.y * height, 0,
      centerLip.x * width, centerLip.y * height, width * 0.04
    );
    centerGrad.addColorStop(0, `rgba(200, 20, 60, ${alpha * 1.1})`);
    centerGrad.addColorStop(1, 'rgba(200, 20, 60, 0)');
    this.ctx.fillStyle = centerGrad;
    this.ctx.fill();

    this.ctx.restore();
  }

  applyEyeBrightening(eye, alpha) {
    const { x, y, radius } = eye;
    if (radius <= 5) return;

    this.ctx.save();
    this.ctx.globalCompositeOperation = 'soft-light';

    const grad = this.ctx.createRadialGradient(x, y, 0, x, y, radius);
    grad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
    grad.addColorStop(0.5, `rgba(255, 255, 255, ${alpha * 0.5})`);
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

    this.ctx.fillStyle = grad;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  }

  applyCheekBlush(cheek, alpha) {
    const { x, y, radius } = cheek;
    if (radius <= 5) return;

    this.ctx.save();
    this.ctx.globalCompositeOperation = 'soft-light';

    const grad = this.ctx.createRadialGradient(x, y, radius * 0.1, x, y, radius);
    grad.addColorStop(0, `rgba(255, 120, 140, ${alpha * 1.2})`);
    grad.addColorStop(0.5, `rgba(255, 140, 160, ${alpha * 0.6})`);
    grad.addColorStop(1, 'rgba(255, 150, 170, 0)');

    this.ctx.fillStyle = grad;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  }

  getFilteredStream(fps = 30) {
    return this.canvas.captureStream(fps);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BeautyFilterProcessor;
}
