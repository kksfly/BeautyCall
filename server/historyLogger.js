// server/historyLogger.js - 접속 이력 파일 기반 기록 및 관리자 모듈 (No DB)
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const HISTORY_FILE = path.join(DATA_DIR, 'connection_history.json');
const BACKUP_FILE = path.join(DATA_DIR, 'connection_history.bak.json');
const MAX_LOGS_LIMIT = 1000; // 최대 보관 로그 수

// 데이터 디렉토리 자동 생성
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (err) {
  console.error('로그 데이터 디렉토리 생성 실패:', err);
}

// 메모리 캐시
let historyCache = [];

/**
 * 한국 시간(KST) 포맷팅 헬퍼 (YYYY-MM-DD HH:mm:ss)
 */
function formatKST(date) {
  try {
    const d = new Date(date);
    // UTC+9 계산
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstDate = new Date(d.getTime() + kstOffset);
    return kstDate.toISOString().replace('T', ' ').substring(0, 19) + ' (KST)';
  } catch (_) {
    return new Date(date).toLocaleString();
  }
}

/**
 * 경과 시간 포맷팅 헬퍼 (예: 1h 24m 10s / 45s)
 */
function formatDuration(ms) {
  if (!ms || ms < 0) return '0s';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);
  return parts.join(' ');
}

/**
 * 파일에서 기존 접속 이력 로드 (메인 파일 실패 시 백업 파일 자동 복구)
 */
function loadHistoryFromFile() {
  const tryFile = (filePath) => {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      if (data && data.trim().length > 0) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    }
    return null;
  };

  try {
    const mainData = tryFile(HISTORY_FILE);
    if (mainData) {
      historyCache = mainData;
      console.log(`📜 [History Logger] 기존 접속 이력 ${historyCache.length}건을 파일에서 불러왔습니다.`);
      return;
    }

    const backupData = tryFile(BACKUP_FILE);
    if (backupData) {
      historyCache = backupData;
      console.log(`📜 [History Logger] 백업 파일에서 접속 이력 ${historyCache.length}건을 복구했습니다.`);
      saveHistoryToFile();
      return;
    }
  } catch (err) {
    console.warn('[History Logger] 접속 이력 파일 읽기 실패 (새로 시작):', err.message);
  }

  historyCache = [];
  saveHistoryToFile();
}

/**
 * 접속 이력을 파일에 영구 저장 (Atomic Write + Backup 동시 유지)
 */
function saveHistoryToFile() {
  try {
    // 최대 로그 제한 초과 시 오래된 것부터 정리
    if (historyCache.length > MAX_LOGS_LIMIT) {
      historyCache = historyCache.slice(0, MAX_LOGS_LIMIT);
    }
    const jsonStr = JSON.stringify(historyCache, null, 2);

    // 원자적 파일 쓰기 (임시 파일 -> 원본 교체로 깨짐 방지)
    const tmpFile = `${HISTORY_FILE}.tmp`;
    fs.writeFileSync(tmpFile, jsonStr, 'utf-8');
    fs.renameSync(tmpFile, HISTORY_FILE);

    // 백업 파일도 함께 보관
    fs.writeFileSync(BACKUP_FILE, jsonStr, 'utf-8');
  } catch (err) {
    console.error('[History Logger] 접속 이력 파일 저장 실패:', err.message);
  }
}

/**
 * 외부(브라우저 로컬 스토리지 백업 또는 JSON 파일 업로드)로부터 히스토리 복원 및 병합
 */
function restoreHistory(importedEntries, isMerge = true) {
  if (!Array.isArray(importedEntries) || importedEntries.length === 0) {
    return { success: false, message: 'Invalid or empty entries array', count: historyCache.length };
  }

  if (!isMerge) {
    historyCache = importedEntries.slice(0, MAX_LOGS_LIMIT);
  } else {
    // 기존 캐시와 중복 제거하며 병합 (고유 key: entry.id 또는 timestamp_socketId_type)
    const seen = new Set();
    const merged = [];

    const getKey = (item) => item.id || `${item.timestamp}_${item.socketId}_${item.type}`;

    // 1. 기존 캐시 먼저 등록
    historyCache.forEach(item => {
      const k = getKey(item);
      if (!seen.has(k)) {
        seen.add(k);
        merged.push(item);
      }
    });

    // 2. 임포트된 항목 추가 등록
    importedEntries.forEach(item => {
      if (item && item.type && item.timestamp) {
        const k = getKey(item);
        if (!seen.has(k)) {
          seen.add(k);
          merged.push(item);
        }
      }
    });

    // 최신 타임스탬프 순 내림차순 정렬
    merged.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    historyCache = merged.slice(0, MAX_LOGS_LIMIT);
  }

  saveHistoryToFile();
  console.log(`🔄 [History Logger] 접속 이력 복원/동기화 완료 (총 ${historyCache.length}건 보관 중)`);
  return { success: true, count: historyCache.length };
}

// 서버 시작 시 기존 로그 로드
loadHistoryFromFile();

/**
 * 입장(JOIN) 이벤트 기록
 */
function recordJoin({ socketId, nickname, roomId, ip, joinedAt }) {
  const now = joinedAt || Date.now();
  const entry = {
    id: `join_${now}_${Math.random().toString(36).substring(2, 7)}`,
    type: 'JOIN',
    timestamp: now,
    formattedTime: formatKST(now),
    nickname: nickname || 'Anonymous',
    roomId: roomId || 'unknown',
    socketId: socketId || '',
    ip: ip || 'unknown',
    durationMs: 0,
    durationText: '-'
  };

  historyCache.unshift(entry); // 최신순 맨 앞 삽입
  saveHistoryToFile();
  console.log(`[Log JOIN] ${entry.nickname} joined ${entry.roomId} (${entry.formattedTime})`);
  return entry;
}

/**
 * 퇴장(LEAVE) 이벤트 기록
 */
function recordLeave({ socketId, nickname, roomId, ip, joinedAt, leftAt }) {
  const now = leftAt || Date.now();
  const start = joinedAt || now;
  const durationMs = Math.max(0, now - start);

  const entry = {
    id: `leave_${now}_${Math.random().toString(36).substring(2, 7)}`,
    type: 'LEAVE',
    timestamp: now,
    formattedTime: formatKST(now),
    nickname: nickname || 'Anonymous',
    roomId: roomId || 'unknown',
    socketId: socketId || '',
    ip: ip || 'unknown',
    joinedAt: start,
    leftAt: now,
    durationMs,
    durationText: formatDuration(durationMs)
  };

  historyCache.unshift(entry); // 최신순 맨 앞 삽입
  saveHistoryToFile();
  console.log(`[Log LEAVE] ${entry.nickname} left ${entry.roomId} (Stayed: ${entry.durationText})`);
  return entry;
}

/**
 * 전체 접속 이력 반환
 */
function getHistory(limit = 200) {
  return historyCache.slice(0, limit);
}

/**
 * 전체 접속 이력 원본 JSON 문자열 반환 (다운로드용)
 */
function getRawHistoryJson() {
  return JSON.stringify(historyCache, null, 2);
}

module.exports = {
  recordJoin,
  recordLeave,
  getHistory,
  getRawHistoryJson,
  restoreHistory,
  formatKST,
  formatDuration
};

