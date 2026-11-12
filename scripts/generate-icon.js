// 황금빛 반짝임(✨) 아이콘 PNG 생성기
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const size = 128;
const buffer = Buffer.alloc(size * size * 4); // RGBA

// 4각 반짝임 별(Sparkle) 그리기 함수
function drawSparkle(cx, cy, r, brightness = 1.0) {
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = Math.abs(x - cx);
      const dy = Math.abs(y - cy);

      // Astroid 거리 계산 (|dx|^0.5 + |dy|^0.5)
      const dist = Math.sqrt(dx) + Math.sqrt(dy);
      const threshold = Math.sqrt(r);

      if (dist <= threshold) {
        const edge = 1 - (dist / threshold);
        const alpha = Math.min(1, Math.max(0, edge * 2.5)) * brightness;

        const idx = (y * size + x) * 4;
        const currentA = buffer[idx + 3] / 255;
        const newA = currentA + alpha * (1 - currentA);

        if (newA > 0) {
          // 따뜻하고 영롱한 황금빛 노란색 그라디언트 (#FFDF00 ~ #FFA000)
          const grad = edge;
          const rCol = Math.round(255);
          const gCol = Math.round(200 + grad * 55);
          const bCol = Math.round(40 + grad * 120);

          buffer[idx] = Math.round((buffer[idx] * currentA + rCol * alpha * (1 - currentA)) / newA);
          buffer[idx + 1] = Math.round((buffer[idx + 1] * currentA + gCol * alpha * (1 - currentA)) / newA);
          buffer[idx + 2] = Math.round((buffer[idx + 2] * currentA + bCol * alpha * (1 - currentA)) / newA);
          buffer[idx + 3] = Math.round(newA * 255);
        }
      }
    }
  }
}

// 1. 메인 큰 반짝임 별 (중앙)
drawSparkle(60, 68, 48, 1.0);
// 2. 우측 상단 작은 반짝임 별
drawSparkle(100, 36, 26, 0.95);
// 3. 좌측 하단 미니 반짝임 별
drawSparkle(26, 102, 18, 0.85);

// PNG 인코더
function createPng(width, height, rgbaBuffer) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR 청크
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type 6 (RGBA)
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);

  // IDAT 청크 (raw scanlines + filter byte 0)
  const scanlines = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    const rowStart = y * (width * 4 + 1);
    scanlines[rowStart] = 0; // no filter
    rgbaBuffer.copy(scanlines, rowStart + 1, y * width * 4, (y + 1) * width * 4);
  }

  const compressed = zlib.deflateSync(scanlines);
  const idatChunk = makeChunk('IDAT', compressed);

  // IEND 청크
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4);
  data.copy(chunk, 8);

  const crc = crc32(chunk.subarray(4, 8 + len));
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let j = 0; j < 8; j++) {
      c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

const assetsDir = path.join(__dirname, 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

const pngPath = path.join(assetsDir, 'icon.png');
fs.writeFileSync(pngPath, createPng(size, size, buffer));
console.log('✅ 노란색 반짝임 아이콘 생성 완료:', pngPath);

