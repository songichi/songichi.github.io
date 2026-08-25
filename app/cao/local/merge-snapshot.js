#!/usr/bin/env node
/**
 * 将网页导出的本轮快照合并进本地账本
 *
 * 最简单：
 *   1. 把快照粘贴进 inbox.json 并保存
 *   2. node merge
 *   （成功后会自动清空 inbox.json）
 *
 * 默认用户文件：user-yi.json
 * 切换用户：node merge --user yi
 */

const fs = require('fs');
const path = require('path');

const LOCAL_DIR = __dirname;
const DEFAULT_USER_ID = 'yi';
const INBOX_PATH = path.join(LOCAL_DIR, 'inbox.json');
const STATS_EXAMPLE_PATH = path.join(LOCAL_DIR, 'user.example.json');
const SESSIONS_PATH = path.join(LOCAL_DIR, 'sessions.ndjson');
const USERS_INDEX_PATH = path.join(LOCAL_DIR, 'users-index.json');
const EMPTY_INBOX = '{}\n';

const SNAPSHOT_TYPE = 'practice-session-snapshot';

function userStatsPath(userId) {
  return path.join(LOCAL_DIR, `user-${userId}.json`);
}

function parseUserId(args) {
  const idx = args.indexOf('--user');
  if (idx !== -1 && args[idx + 1]) return String(args[idx + 1]).trim();
  if (process.env.CAO_USER) return String(process.env.CAO_USER).trim();
  return DEFAULT_USER_ID;
}

function printHelp() {
  console.log(`最简单用法:
  1. 网页复制本轮快照
  2. 粘贴进 inbox.json 并保存
  3. 运行：
     cd ${LOCAL_DIR} && node merge

其它:
  node merge --user yi
  node merge <文件.json>
  pbpaste | node merge
  node merge --rebuild
  node merge --index          # 仅刷新 users-index.json
`);
}

function entryKey(char, script) {
  const normalized = !script || script === 'cursive' || script === 'cao'
    ? 'cao'
    : script === 'song'
      ? 'ming'
      : script;
  return normalized === 'cao' ? char : `${char}@${normalized}`;
}

function normalizeScript(script) {
  if (!script || script === 'cursive' || script === 'cao') return 'cao';
  if (script === 'song') return 'ming';
  return script;
}

function readJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function clearInbox() {
  fs.writeFileSync(INBOX_PATH, EMPTY_INBOX, 'utf8');
}

function ensureInboxFile() {
  if (!fs.existsSync(INBOX_PATH)) {
    clearInbox();
  }
}

/** 扫描 local 下所有 user*.json（排除 example） */
function listUserFiles() {
  return fs.readdirSync(LOCAL_DIR)
    .filter((name) => /^user(-[\w.-]+)?\.json$/i.test(name))
    .filter((name) => !/\.example\.json$/i.test(name))
    .sort((a, b) => a.localeCompare(b, 'en'));
}

function userIdFromFile(fileName) {
  const match = /^user-(.+)\.json$/i.exec(fileName);
  if (match) return match[1];
  if (/^user\.json$/i.test(fileName)) return 'default';
  return fileName.replace(/\.json$/i, '');
}

function refreshUsersIndex() {
  const files = listUserFiles();
  const users = files.map((file) => {
    const id = userIdFromFile(file);
    let updatedAt = null;
    let summary = null;
    try {
      const data = readJSON(path.join(LOCAL_DIR, file));
      updatedAt = data.updatedAt || null;
      summary = data.summary || null;
    } catch {
      // 损坏文件仍列入索引
    }
    return {
      id,
      file,
      name: id,
      updatedAt,
      summary,
    };
  });

  const index = {
    version: 1,
    updatedAt: new Date().toISOString(),
    users,
  };
  writeJSON(USERS_INDEX_PATH, index);
  return index;
}

function ensureStatsFile(statsPath, userId) {
  if (fs.existsSync(statsPath)) return;
  if (!fs.existsSync(STATS_EXAMPLE_PATH)) {
    throw new Error(`缺少模板：${STATS_EXAMPLE_PATH}`);
  }
  const data = readJSON(STATS_EXAMPLE_PATH);
  data.user = userId;
  writeJSON(statsPath, data);
  console.log(`已创建 ${path.basename(statsPath)}（来自模板）`);
}

function emptyStats(userId) {
  return {
    version: 1,
    user: userId,
    updatedAt: null,
    summary: {
      uniqueChars: 0,
      totalAppearances: 0,
      sessionCount: 0,
    },
    chars: {},
  };
}

function loadStats(statsPath, userId) {
  ensureStatsFile(statsPath, userId);
  const data = readJSON(statsPath);
  if (!data.chars || typeof data.chars !== 'object') data.chars = {};
  if (!data.summary || typeof data.summary !== 'object') {
    data.summary = emptyStats(userId).summary;
  }
  data.user = userId;
  return data;
}

function refreshSummary(stats, sessionCount) {
  const items = Object.values(stats.chars);
  stats.summary = {
    uniqueChars: items.length,
    totalAppearances: items.reduce((sum, item) => sum + (item.count || 0), 0),
    sessionCount: sessionCount ?? stats.summary.sessionCount ?? 0,
  };
  stats.updatedAt = new Date().toISOString();
  stats.version = stats.version || 1;
}

function countSessionsFile() {
  if (!fs.existsSync(SESSIONS_PATH)) return 0;
  const text = fs.readFileSync(SESSIONS_PATH, 'utf8').trim();
  if (!text) return 0;
  return text.split('\n').filter((line) => line.trim()).length;
}

function mergeItemIntoStats(stats, item) {
  if (!item || !item.char) return;

  const script = normalizeScript(item.script);
  const key = entryKey(item.char, script);
  const add = Number(item.count) || 0;
  if (add <= 0) return;

  const existing = stats.chars[key];
  if (!existing) {
    stats.chars[key] = {
      char: item.char,
      script,
      count: add,
      firstSeenAt: item.firstSeenAt || null,
      lastSeenAt: item.lastSeenAt || null,
    };
    return;
  }

  existing.count = (existing.count || 0) + add;
  if (item.firstSeenAt) {
    if (!existing.firstSeenAt || item.firstSeenAt < existing.firstSeenAt) {
      existing.firstSeenAt = item.firstSeenAt;
    }
  }
  if (item.lastSeenAt) {
    if (!existing.lastSeenAt || item.lastSeenAt > existing.lastSeenAt) {
      existing.lastSeenAt = item.lastSeenAt;
    }
  }
}

function applySnapshotToStats(stats, snapshot) {
  const items = Array.isArray(snapshot.items) ? snapshot.items : [];
  for (const item of items) {
    mergeItemIntoStats(stats, item);
  }
}

function parseSnapshot(raw) {
  const text = String(raw || '').trim();
  if (!text) {
    throw new Error('快照内容为空');
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch (error) {
    throw new Error(`无法解析 JSON：${error.message}`);
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('快照必须是 JSON 对象');
  }

  if (!Array.isArray(data.items)) {
    if (Object.keys(data).length === 0) {
      throw new Error(`请先把网页复制的快照粘贴进 ${path.basename(INBOX_PATH)} 并保存`);
    }
    throw new Error('快照缺少 items 数组（请使用网页「复制本轮快照」）');
  }

  if (data.type && data.type !== SNAPSHOT_TYPE) {
    console.warn(`警告：type 不是 ${SNAPSHOT_TYPE}（当前为 ${data.type}），仍将尝试合并`);
  }

  return data;
}

function appendSession(snapshot) {
  const line = `${JSON.stringify(snapshot)}\n`;
  fs.appendFileSync(SESSIONS_PATH, line, 'utf8');
}

function readStdin() {
  return new Promise((resolve, reject) => {
    if (process.stdin.isTTY) {
      resolve('');
      return;
    }

    let raw = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      raw += chunk;
    });
    process.stdin.on('end', () => resolve(raw));
    process.stdin.on('error', reject);
  });
}

function rebuildFromSessions(statsPath, userId) {
  if (!fs.existsSync(SESSIONS_PATH)) {
    throw new Error(`没有 ${path.basename(SESSIONS_PATH)}，无法 rebuild`);
  }

  const stats = emptyStats(userId);
  const lines = fs.readFileSync(SESSIONS_PATH, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  let ok = 0;
  for (let i = 0; i < lines.length; i++) {
    try {
      const snapshot = parseSnapshot(lines[i]);
      applySnapshotToStats(stats, snapshot);
      ok += 1;
    } catch (error) {
      console.warn(`跳过第 ${i + 1} 行：${error.message}`);
    }
  }

  refreshSummary(stats, ok);
  writeJSON(statsPath, stats);
  refreshUsersIndex();
  console.log(`已从 ${ok} 条会话重算总账 → ${path.basename(statsPath)}`);
  printStatsBrief(stats, statsPath);
}

function printStatsBrief(stats, statsPath) {
  const { uniqueChars, totalAppearances, sessionCount } = stats.summary;
  console.log(`用户：${stats.user || '—'}　总账：${uniqueChars} 字 / ${totalAppearances} 次 / ${sessionCount} 轮`);
  console.log(`文件：${statsPath}`);
}

function mergeSnapshot(snapshot, { appendOnly = false, clearInboxAfter = false, statsPath, userId }) {
  appendSession(snapshot);
  console.log(`已追加会话 → ${path.basename(SESSIONS_PATH)}`);

  if (appendOnly) {
    console.log('（--append-only：未更新总账）');
  } else {
    const stats = loadStats(statsPath, userId);
    applySnapshotToStats(stats, snapshot);
    refreshSummary(stats, countSessionsFile());
    writeJSON(statsPath, stats);
    refreshUsersIndex();

    const added = (snapshot.items || []).reduce((sum, item) => sum + (Number(item.count) || 0), 0);
    console.log(`已合并本轮 ${snapshot.items.length} 字 / ${added} 次`);
    printStatsBrief(stats, statsPath);
  }

  if (clearInboxAfter) {
    clearInbox();
    console.log(`已清空 ${path.basename(INBOX_PATH)}`);
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('-h') || args.includes('--help')) {
    printHelp();
    return;
  }

  if (args.includes('--index')) {
    const index = refreshUsersIndex();
    console.log(`已刷新 users-index.json（${index.users.length} 个用户文件）`);
    for (const user of index.users) {
      console.log(`  - ${user.file}`);
    }
    return;
  }

  const userId = parseUserId(args);
  const statsPath = userStatsPath(userId);
  const argsWithoutUser = args.filter((arg, i, arr) => {
    if (arg === '--user') return false;
    if (arr[i - 1] === '--user') return false;
    return true;
  });

  if (argsWithoutUser.includes('--rebuild')) {
    rebuildFromSessions(statsPath, userId);
    return;
  }

  const appendOnly = argsWithoutUser.includes('--append-only');
  const fileArgs = argsWithoutUser.filter((arg) => !arg.startsWith('--'));

  let raw = '';
  let clearInboxAfter = false;

  if (fileArgs[0]) {
    const filePath = path.resolve(process.cwd(), fileArgs[0]);
    raw = fs.readFileSync(filePath, 'utf8');
    clearInboxAfter = path.resolve(filePath) === path.resolve(INBOX_PATH);
  } else {
    raw = await readStdin();
    if (!raw.trim()) {
      ensureInboxFile();
      raw = fs.readFileSync(INBOX_PATH, 'utf8');
      clearInboxAfter = true;
    }
  }

  const snapshot = parseSnapshot(raw);
  mergeSnapshot(snapshot, {
    appendOnly,
    clearInboxAfter,
    statsPath,
    userId,
  });
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
