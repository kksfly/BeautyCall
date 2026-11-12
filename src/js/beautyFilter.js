/**
 * 실시간 뷰티 및 메이크업 필터 프로세서
 * - 얼굴 영역 분할(Face Mask) 기반 스킨 스무딩: 배경과 머리카락, 옷은 칼초점으로 선명하게 유지하고 오직 얼굴 피부에만 뽀샤시 적용
 * - 눈/입술 선명도 보존 (또렷한 이목구비)
 * - 톤업 & 화사함
 * - 볼터치 블러셔 & 립 틴트
 */
class BeautyFilterProcessor {
  constructor() {
    this.videoElement = null;
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: false });
    
    // 피부 보정 전용 보조 캔버스 (얼굴 마스크용)
    this.blurCanvas = document.createElement('canvas');
    this.blurCtx = this.blurCanvas.getContext('2d');

    // 얼굴 마스크 생성용 보조 캔버스
    this.maskCanvas = document.createElement('canvas');
    this.maskCtx = this.maskCanvas.getContext('2d');

    this.animationFrameId = null;
    this.isRunning = false;

    // 필터 설정값
    this.settings = {
      preset: 'glamour',
      smoothing: 70,        // 0 ~ 100 (얼굴 피부 매끈함)
      brightness: 110,      // 70 ~ 140 (%)
      contrast: 102,        // 80 ~ 130 (%)
      saturation: 108,      // 70 ~ 140 (%)
      rosyTint: 15,         // 0 ~ 100 (전체 핑크 생기)
      vignette: false,
      eyeBrighten: 40,      // 0 ~ 100 (눈가 맑은 톤업)
      blush: 50,            // 0 ~ 100 (양 볼 블러셔)
      lipTint: 60           // 0 ~ 100 (입술 틴트)
    };

    // 프리셋 정의
    this.presets = {
      none: {
        smoothing: 0,
        brightness: 100,
        contrast: 100,
        saturation: 100,
        rosyTint: 0,
        vignette: false,
        eyeBrighten: 0,
        blush: 0,
        lipTint: 0
      },
      glamour: {
        smoothing: 75,
        brightness: 112,
        contrast: 104,
        saturation: 110,
        rosyTint: 15,
        vignette: false,
        eyeBrighten: 45,
        blush: 55,
        lipTint: 65
      },
      kbeauty: {
        smoothing: 80,
        brightness: 114,
        contrast: 100,
        saturation: 104,
        rosyTint: 20,
        vignette: false,
        eyeBrighten: 35,
        blush: 35,
        lipTint: 45
      },
      smooth: {
        smoothing: 70,
        brightness: 110,
        contrast: 102,
        saturation: 106,
        rosyTint: 25,
        vignette: false,
        eyeBrighten: 0,
        blush: 0,
        lipTint: 0
      },
      warm: {
        smoothing: 50,
        brightness: 106,
        contrast: 104,
        saturation: 115,
        rosyTint: 30,
        vignette: false,
        eyeBrighten: 20,
        blush: 30,
        lipTint: 30
      },
      cool: {
        smoothing: 70,
        brightness: 114,
        contrast: 100,
        saturation: 98,
        rosyTint: 15,
        vignette: false,
        eyeBrighten: 20,
        blush: 25,
        lipTint: 35
      },
      vintage: {
        smoothing: 40,
        brightness: 102,
        contrast: 112,
        saturation: 85,
        rosyTint: 10,
        vignette: true,
        eyeBrighten: 0,
        blush: 0,
        lipTint: 0
      },
      monochrome: {
        smoothing: 60,
        brightness: 105,
        contrast: 115,
        saturation: 0,
        rosyTint: 0,
        vignette: true,
        eyeBrighten: 0,
        blush: 0,
        lipTint: 0
      }
    };

    // 얼굴 윤곽선(Face Oval) 랜드마크 인덱스
    this.faceOvalIndices = [
      10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
      397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
      172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109
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

        // 60ms 간격으로 얼굴 랜드마크 감지
        if (this.faceMesh && !this.isDetectingFace && (time - lastDetectionTime > 60)) {
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
    if (this.presets[presetName]) {
      this.settings.preset = presetName;
      Object.assign(this.settings, this.presets[presetName]);
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

    const eyeDist = Math.hypot(rightEyeX - leftEyeX, rightEyeY - leftEyeY);
    const faceScale = Math.max(25, eyeDist);

    return {
      leftEye: { x: leftEyeX, y: leftEyeY, radius: faceScale * 0.35 },
      rightEye: { x: rightEyeX, y: rightEyeY, radius: faceScale * 0.35 },
      leftCheek: { x: leftCheekX, y: leftCheekY, radius: faceScale * 0.5 },
      rightCheek: { x: rightCheekX, y: rightCheekY, radius: faceScale * 0.5 },
      lip: { x: lipX, y: lipY, radiusX: faceScale * 0.38, radiusY: faceScale * 0.18 },
      scale: faceScale
    };
  }

  applyFilters() {
    const { width, height } = this.canvas;
    if (width === 0 || height === 0) return;

    const { smoothing, brightness, contrast, saturation, rosyTint, vignette, eyeBrighten, blush, lipTint } = this.settings;

    // 1. 기본 색상 보정 필터 (화면 전체의 색감 및 밝기)
    const filterString = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;

    // 메인 캔버스에 "선명한 원본 영상"을 먼저 렌더링 (배경, 옷, 머리카락 등 100% 선명도 유지)
    this.ctx.filter = filterString;
    this.ctx.drawImage(this.videoElement, 0, 0, width, height);
    this.ctx.filter = 'none';

    // 2. 얼굴 영역 전용 피부 보정 (Skin Smoothing)
    // 화면 전체가 흐려지지 않고, 오직 인식된 얼굴 영역에만 부드러운 블러가 마스킹 처리됩니다.
    const coords = this.getFaceCoordinates(width, height);

    if (smoothing > 0 && coords && this.landmarks) {
      this.applyFaceOnlySmoothing(width, height, filterString, smoothing, coords);
    }

    // 3. 메이크업 필터 (얼굴이 감지되었을 때만 적용)
    if (coords) {
      // 3-1. 눈가 맑은 톤업 브라이트닝
      if (eyeBrighten > 0) {
        const alpha = (eyeBrighten / 100) * 0.22;
        this.applyEyeBrightening(coords.leftEye, alpha);
        this.applyEyeBrightening(coords.rightEye, alpha);
      }

      // 3-2. 볼터치 치크 블러셔 (사랑스러운 생기 핑크)
      if (blush > 0) {
        const alpha = (blush / 100) * 0.32;
        this.applyCheekBlush(coords.leftCheek, alpha);
        this.applyCheekBlush(coords.rightCheek, alpha);
      }

      // 3-3. 입술 틴트 (촉촉한 로즈 코랄 립)
      if (lipTint > 0) {
        const alpha = (lipTint / 100) * 0.38;
        this.applyLipTint(coords.lip, alpha);
      }
    }

    // 4. 전체 핑크 생기 틴트
    if (rosyTint > 0) {
      this.ctx.save();
      this.ctx.globalCompositeOperation = 'soft-light';
      this.ctx.fillStyle = `rgba(255, 175, 190, ${(rosyTint / 100) * 0.3})`;
      this.ctx.fillRect(0, 0, width, height);
      this.ctx.restore();
    }

    // 5. 비네팅
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
   * 오직 얼굴 피부 영역에만 스킨 스무딩을 적용하는 정밀 마스킹 파이프라인
   */
  applyFaceOnlySmoothing(width, height, filterString, smoothing, coords) {
    // 1. 보조 캔버스에 블러 적용된 비디오 렌더링
    const blurRadius = Math.max(2, Math.round((smoothing / 100) * 9));
    this.blurCtx.clearRect(0, 0, width, height);
    this.blurCtx.filter = `blur(${blurRadius}px) ${filterString}`;
    this.blurCtx.drawImage(this.videoElement, 0, 0, width, height);
    this.blurCtx.filter = 'none';

    // 2. 마스크 캔버스에 얼굴 윤곽선(Face Oval) 마스크 그리기
    this.maskCtx.clearRect(0, 0, width, height);
    this.maskCtx.save();
    
    // 부드러운 가장자리 페더링 효과를 위해 blur 필터 적용된 마스크 생성
    this.maskCtx.filter = 'blur(12px)';
    this.maskCtx.fillStyle = '#ffffff';

    this.maskCtx.beginPath();
    const lm = this.landmarks;
    for (let i = 0; i < this.faceOvalIndices.length; i++) {
      const idx = this.faceOvalIndices[i];
      const px = lm[idx].x * width;
      const py = lm[idx].y * height;
      if (i === 0) {
        this.maskCtx.moveTo(px, py);
      } else {
        this.maskCtx.lineTo(px, py);
      }
    }
    this.maskCtx.closePath();
    this.maskCtx.fill();

    // 3. 눈과 입술 영역은 선명함을 유지하기 위해 마스크에서 구멍을 뚫어(clear) 제외시킴
    this.maskCtx.filter = 'blur(6px)';
    this.maskCtx.globalCompositeOperation = 'destination-out';

    // 왼쪽 눈 구멍
    this.maskCtx.beginPath();
    this.maskCtx.arc(coords.leftEye.x, coords.leftEye.y, coords.leftEye.radius * 0.9, 0, Math.PI * 2);
    this.maskCtx.fill();

    // 오른쪽 눈 구멍
    this.maskCtx.beginPath();
    this.maskCtx.arc(coords.rightEye.x, coords.rightEye.y, coords.rightEye.radius * 0.9, 0, Math.PI * 2);
    this.maskCtx.fill();

    // 입술 구멍
    this.maskCtx.save();
    this.maskCtx.translate(coords.lip.x, coords.lip.y);
    this.maskCtx.scale(1, coords.lip.radiusY / coords.lip.radiusX);
    this.maskCtx.beginPath();
    this.maskCtx.arc(0, 0, coords.lip.radiusX * 1.1, 0, Math.PI * 2);
    this.maskCtx.fill();
    this.maskCtx.restore();

    this.maskCtx.restore();

    // 4. 블러 레이어에 마스크 적용 (destination-in: 마스크 영역 외의 배경/옷/머리카락은 완전 투명화)
    this.blurCtx.save();
    this.blurCtx.globalCompositeOperation = 'destination-in';
    this.blurCtx.drawImage(this.maskCanvas, 0, 0);
    this.blurCtx.restore();

    // 5. 얼굴 피부에만 남은 부드러운 블러를 메인 캔버스에 자연스럽게 합성
    this.ctx.save();
    this.ctx.globalAlpha = (smoothing / 100) * 0.72;
    this.ctx.drawImage(this.blurCanvas, 0, 0);
    this.ctx.restore();
  }

  /**
   * 눈가 톤업 브라이트닝
   */
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

  /**
   * 볼터치 블러셔
   */
  applyCheekBlush(cheek, alpha) {
    const { x, y, radius } = cheek;
    if (radius <= 5) return;

    this.ctx.save();
    this.ctx.globalCompositeOperation = 'soft-light';

    const grad = this.ctx.createRadialGradient(x, y, radius * 0.1, x, y, radius);
    grad.addColorStop(0, `rgba(255, 120, 150, ${alpha * 1.2})`);
    grad.addColorStop(0.5, `rgba(255, 135, 165, ${alpha * 0.6})`);
    grad.addColorStop(1, 'rgba(255, 140, 175, 0)');

    this.ctx.fillStyle = grad;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  }

  /**
   * 입술 틴트
   */
  applyLipTint(lip, alpha) {
    const { x, y, radiusX, radiusY } = lip;
    if (radiusX <= 5 || radiusY <= 2) return;

    this.ctx.save();
    this.ctx.globalCompositeOperation = 'soft-light';

    this.ctx.translate(x, y);
    this.ctx.scale(1, radiusY / radiusX);

    const grad = this.ctx.createRadialGradient(0, 0, radiusX * 0.15, 0, 0, radiusX);
    grad.addColorStop(0, `rgba(235, 45, 80, ${alpha * 1.2})`);
    grad.addColorStop(0.6, `rgba(240, 65, 100, ${alpha * 0.7})`);
    grad.addColorStop(1, 'rgba(245, 80, 115, 0)');

    this.ctx.fillStyle = grad;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, radiusX, 0, Math.PI * 2);
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
