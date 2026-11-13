// server/historyLogger.js - 접속 이력 파일 기반 기록 및 관리자 모듈 (No DB)
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const HISTORY_FILE = path.join(DATA_DIR, 'connection_history.json');
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
 * 파일에서 기존 접속 이력 로드
 */
function loadHistoryFromFile() {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      const data = fs.readFileSync(HISTORY_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        historyCache = parsed;
        console.log(`📜 [History Logger] 기존 접속 이력 ${historyCache.length}건을 파일에서 불러왔습니다.`);
        return;
      }
    }
  } catch (err) {
    console.warn('[History Logger] 접속 이력 파일 읽기 실패 (새로 시작):', err.message);
  }
  historyCache = [];
  saveHistoryToFile();
}

/**
 * 접속 이력을 파일에 영구 저장
 */
function saveHistoryToFile() {
  try {
    // 최대 로그 제한 초과 시 오래된 것부터 정리
    if (historyCache.length > MAX_LOGS_LIMIT) {
      historyCache = historyCache.slice(0, MAX_LOGS_LIMIT);
    }
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(historyCache, null, 2), 'utf-8');
  } catch (err) {
    console.error('[History Logger] 접속 이력 파일 저장 실패:', err.message);
  }
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
  formatKST,
  formatDuration
};

