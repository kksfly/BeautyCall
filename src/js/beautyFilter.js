/**
 * 실시간 뷰티 및 메이크업 필터 프로세서
 * - Basic Filters (기본 뷰티 & 색감)
 * - Special Filters (Facebook Messenger 스타일 The Best Makeup 등 고급 AR 마스크)
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
      category: 'special',  // 'basic' | 'special'
      preset: 'bestMakeup',
      smoothing: 78,
      brightness: 112,
      contrast: 104,
      saturation: 110,
      rosyTint: 15,
      vignette: false,
      eyeBrighten: 45,
      blush: 55,
      lipTint: 70,
      eyeliner: 65,
      highlighter: 55
    };

    // 1. Basic Filters (기본 필터)
    this.basicPresets = {
      none: {
        smoothing: 0,
        brightness: 100,
        contrast: 100,
        saturation: 100,
        rosyTint: 0,
        vignette: false,
        eyeBrighten: 0,
        blush: 0,
        lipTint: 0,
        eyeliner: 0,
        highlighter: 0
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
        lipTint: 0,
        eyeliner: 0,
        highlighter: 0
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
        lipTint: 45,
        eyeliner: 0,
        highlighter: 30
      },
      glamour: {
        smoothing: 75,
        brightness: 112,
        contrast: 104,
        saturation: 110,
        rosyTint: 15,
        vignette: false,
        eyeBrighten: 40,
        blush: 50,
        lipTint: 60,
        eyeliner: 0,
        highlighter: 0
      },
      warm: {
        smoothing: 50,
        brightness: 106,
        contrast: 104,
        saturation: 115,
        rosyTint: 30,
        vignette: false,
        eyeBrighten: 0,
        blush: 25,
        lipTint: 25,
        eyeliner: 0,
        highlighter: 0
      },
      cool: {
        smoothing: 70,
        brightness: 114,
        contrast: 100,
        saturation: 98,
        rosyTint: 15,
        vignette: false,
        eyeBrighten: 0,
        blush: 20,
        lipTint: 30,
        eyeliner: 0,
        highlighter: 0
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
        lipTint: 0,
        eyeliner: 0,
        highlighter: 0
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
        lipTint: 0,
        eyeliner: 0,
        highlighter: 0
      }
    };

    // 2. Special Filters (스페셜 AR 메이크업 마스크)
    this.specialPresets = {
      bestMakeup: {
        smoothing: 78,      // 무결점 도자기 피부
        brightness: 112,
        contrast: 104,
        saturation: 110,
        rosyTint: 15,
        vignette: false,
        eyeBrighten: 45,
        blush: 55,          // 화사한 피치 블러셔
        lipTint: 70,        // 매혹적인 벨벳 로즈 립
        eyeliner: 65,       // 그윽한 소프트 윙 아이라인
        highlighter: 55     // 3D 콧대/광대 윤광 하이라이터
      },
      idolMask: {
        smoothing: 82,      // 투명하고 깨끗한 아이돌 무대 피부
        brightness: 116,
        contrast: 102,
        saturation: 106,
        rosyTint: 20,
        vignette: false,
        eyeBrighten: 50,
        blush: 45,          // 러블리 핑크 치크
        lipTint: 60,        // 촉촉한 코랄 핑크 립
        eyeliner: 40,       // 자연스러운 속눈썹 라인
        highlighter: 60     // 화사한 샴페인 스트로빙
      },
      foxEyes: {
        smoothing: 72,
        brightness: 108,
        contrast: 106,
        saturation: 108,
        rosyTint: 10,
        vignette: false,
        eyeBrighten: 35,
        blush: 40,
        lipTint: 65,
        eyeliner: 80,       // 날렵하고 섹시한 캣츠아이 윙
        highlighter: 45
      },
      goldenHour: {
        smoothing: 65,
        brightness: 110,
        contrast: 105,
        saturation: 118,
        rosyTint: 35,       // 노을빛 따스한 엠버 틴트
        vignette: false,
        eyeBrighten: 30,
        blush: 60,          // 웜 골드 브론징 블러셔
        lipTint: 60,        // 누드 로즈 립
        eyeliner: 45,
        highlighter: 65     // 골든 하이라이트
      }
    };

    // 랜드마크 인덱스
    this.faceOvalIndices = [
      10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
      397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
      172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109
    ];
    this.leftEyeTopIndices = [33, 246, 161, 160, 159, 158, 157, 173, 133];
    this.rightEyeTopIndices = [263, 466, 388, 387, 386, 385, 384, 398, 362];
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

        if (this.faceMesh && !this.isDetectingFace && (time - lastDetectionTime > 50)) {
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
    if (this.specialPresets[presetName]) {
      this.settings.category = 'special';
      this.settings.preset = presetName;
      Object.assign(this.settings, this.specialPresets[presetName]);
    } else if (this.basicPresets[presetName]) {
      this.settings.category = 'basic';
      this.settings.preset = presetName;
      Object.assign(this.settings, this.basicPresets[presetName]);
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

    const {
      smoothing, brightness, contrast, saturation, rosyTint,
      vignette, eyeBrighten, blush, lipTint, eyeliner, highlighter
    } = this.settings;

    const filterString = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;

    // 메인 선명한 원본 영상 렌더링
    this.ctx.filter = filterString;
    this.ctx.drawImage(this.videoElement, 0, 0, width, height);
    this.ctx.filter = 'none';

    const coords = this.getFaceCoordinates(width, height);

    // 얼굴 전용 피부 스무딩
    if (smoothing > 0 && coords && this.landmarks) {
      this.applyFaceOnlySmoothing(width, height, filterString, smoothing, coords);
    }

    // AR 메이크업 효과
    if (coords && this.landmarks) {
      if (highlighter > 0) {
        this.applyHighlighter(width, height, (highlighter / 100) * 0.45, coords);
      }

      if (blush > 0) {
        this.applyCheekBlush(coords.leftCheek, (blush / 100) * 0.35);
        this.applyCheekBlush(coords.rightCheek, (blush / 100) * 0.35);
      }

      if (eyeliner > 0) {
        this.applyEyeliner(width, height, (eyeliner / 100) * 0.65, coords.scale);
      }

      if (eyeBrighten > 0) {
        this.applyEyeBrightening(coords.leftEye, (eyeBrighten / 100) * 0.22);
        this.applyEyeBrightening(coords.rightEye, (eyeBrighten / 100) * 0.22);
      }

      if (lipTint > 0) {
        this.applyContouredLipTint(width, height, (lipTint / 100) * 0.45);
      }
    }

    if (rosyTint > 0) {
      this.ctx.save();
      this.ctx.globalCompositeOperation = 'soft-light';
      this.ctx.fillStyle = `rgba(255, 175, 190, ${(rosyTint / 100) * 0.3})`;
      this.ctx.fillRect(0, 0, width, height);
      this.ctx.restore();
    }

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

  applyEyeliner(width, height, alpha, faceScale) {
    const lm = this.landmarks;
    if (!lm) return;

    this.ctx.save();
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.strokeStyle = `rgba(28, 22, 25, ${alpha})`;
    this.ctx.lineWidth = Math.max(1.8, faceScale * 0.038);

    // 왼쪽 눈
    this.ctx.beginPath();
    for (let i = 0; i < this.leftEyeTopIndices.length; i++) {
      const idx = this.leftEyeTopIndices[i];
      const px = lm[idx].x * width;
      const py = lm[idx].y * height;
      if (i === 0) this.ctx.moveTo(px, py);
      else this.ctx.lineTo(px, py);
    }
    const leftEnd = lm[133];
    const leftPrev = lm[173];
    const leftWingX = (leftEnd.x + (leftEnd.x - leftPrev.x) * 0.8) * width;
    const leftWingY = (leftEnd.y - Math.abs(leftEnd.y - leftPrev.y) * 0.6) * height;
    this.ctx.lineTo(leftWingX, leftWingY);
    this.ctx.stroke();

    // 오른쪽 눈
    this.ctx.beginPath();
    for (let i = 0; i < this.rightEyeTopIndices.length; i++) {
      const idx = this.rightEyeTopIndices[i];
      const px = lm[idx].x * width;
      const py = lm[idx].y * height;
      if (i === 0) this.ctx.moveTo(px, py);
      else this.ctx.lineTo(px, py);
    }
    const rightEnd = lm[362];
    const rightPrev = lm[398];
    const rightWingX = (rightEnd.x + (rightEnd.x - rightPrev.x) * 0.8) * width;
    const rightWingY = (rightEnd.y - Math.abs(rightEnd.y - rightPrev.y) * 0.6) * height;
    this.ctx.lineTo(rightWingX, rightWingY);
    this.ctx.stroke();

    this.ctx.restore();
  }

  applyHighlighter(width, height, alpha, coords) {
    const lm = this.landmarks;
    if (!lm) return;

    this.ctx.save();
    this.ctx.globalCompositeOperation = 'screen';

    const noseTip = lm[4];
    const noseTop = lm[168];
    const nx = ((noseTip.x + noseTop.x) / 2) * width;
    const ny = ((noseTip.y + noseTop.y) / 2) * height;
    const noseH = Math.abs(noseTip.y - noseTop.y) * height;

    const noseGrad = this.ctx.createLinearGradient(nx, ny - noseH * 0.5, nx, ny + noseH * 0.5);
    noseGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
    noseGrad.addColorStop(0.5, `rgba(255, 250, 240, ${alpha * 0.7})`);
    noseGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

    this.ctx.fillStyle = noseGrad;
    this.ctx.beginPath();
    this.ctx.ellipse(nx, ny, coords.scale * 0.06, noseH * 0.45, 0, 0, Math.PI * 2);
    this.ctx.fill();

    const tipGrad = this.ctx.createRadialGradient(noseTip.x * width, noseTip.y * height, 0, noseTip.x * width, noseTip.y * height, coords.scale * 0.08);
    tipGrad.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.8})`);
    tipGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    this.ctx.fillStyle = tipGrad;
    this.ctx.beginPath();
    this.ctx.arc(noseTip.x * width, noseTip.y * height, coords.scale * 0.08, 0, Math.PI * 2);
    this.ctx.fill();

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
