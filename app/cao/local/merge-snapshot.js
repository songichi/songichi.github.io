#!/usr/bin/env node
/**
 * 将网页导出的本轮快照合并进本地账本
 *
 * 最简单：
 *   1. 把快照粘贴进 inbox.json 并保存
 *   2. node merge
 *
 * 默认用户文件：user-yi.json
 * 切换用户：node merge --user yi
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const LOCAL_DIR = __dirname;
const DEFAULT_USER_ID = 'yi';
const INBOX_PATH = path.join(LOCAL_DIR, 'inbox.json');
const STATS_EXAMPLE_PATH = path.join(LOCAL_DIR, 'user.example.json');
const SESSIONS_PATH = path.join(LOCAL_DIR, 'sessions.ndjson');
const USERS_INDEX_PATH = path.join(LOCAL_DIR, 'users-index.json');
const EMPTY_INBOX = '{}\n';

const JS_DIR = path.join(LOCAL_DIR, '..', 'js');

function loadUserMergeApi() {
  const sandbox = {
    console,
    Map,
    Set,
    Array,
    Object,
    String,
    Number,
    Math,
    Date,
    JSON,
  };
  vm.runInContext(fs.readFileSync(path.join(JS_DIR, 'user-merge.js'), 'utf8'), vm.createContext(sandbox));
  return sandbox;
}

const mergeApi = loadUserMergeApi();

function loadCatalogMaps() {
  const code = [
    fs.readFileSync(path.join(JS_DIR, 'user-merge.js'), 'utf8'),
    fs.readFileSync(path.join(JS_DIR, 'zi.js'), 'utf8'),
    fs.readFileSync(path.join(JS_DIR, 'zi-catalog-cao.js'), 'utf8'),
    fs.readFileSync(path.join(JS_DIR, 'zi-catalog-kai.js'), 'utf8'),
    'finalizeZiCatalog([DEFAULT_ZI_CAO, DEFAULT_ZI_KAI]);',
    'buildCatalogMapsFromZiGroups([DEFAULT_ZI_CAO, DEFAULT_ZI_KAI]);',
  ].join('\n');
  return vm.runInNewContext(code, {
    console,
    Map,
    Set,
    Array,
    Object,
    String,
    Number,
    Math,
    Date,
    JSON,
  });
}

function userStatsPath(userId) {
  return path.join(LOCAL_DIR, mergeApi.userStatsFileName(userId));
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
  node merge --rebuild   # 只重建 sessions，不改 chars
  node merge --migrate
  node merge --index

政策: 新练习只追加 sessions，禁止写入 chars（见 README）。
`);
}

function readJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJSON(filePath, data) {
  const text = (mergeApi.isUserStatsPayload?.(data) && mergeApi.stringifyUserStatsForDisk)
    ? mergeApi.stringifyUserStatsForDisk(data)
    : `${JSON.stringify(data, null, 2)}\n`;
  fs.writeFileSync(filePath, text, 'utf8');
}

function clearInbox() {
  fs.writeFileSync(INBOX_PATH, EMPTY_INBOX, 'utf8');
}

function ensureInboxFile() {
  if (!fs.existsSync(INBOX_PATH)) clearInbox();
}

function listUserFiles() {
  return fs.readdirSync(LOCAL_DIR)
    .filter((name) => mergeApi.isUserJsonFileName(name))
    .sort((a, b) => a.localeCompare(b, 'en'));
}

function refreshUsersIndex() {
  const files = listUserFiles();
  const users = files.map((file) => {
    const id = mergeApi.userIdFromFileName(file);
    let updatedAt = null;
    let summary = null;
    try {
      const data = readJSON(path.join(LOCAL_DIR, file));
      updatedAt = data.updatedAt || null;
      summary = data.summary || null;
    } catch {
      // ignore
    }
    return { id, file, name: id, updatedAt, summary };
  });

  const index = mergeApi.buildUsersIndexFromStatsList(
    users.map((u) => ({ id: u.id, file: u.file, data: { updatedAt: u.updatedAt, summary: u.summary } })),
  );
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

function loadStats(statsPath, userId) {
  ensureStatsFile(statsPath, userId);
  return mergeApi.normalizeUserStats(readJSON(statsPath), userId);
}

function countSessionsFile() {
  if (!fs.existsSync(SESSIONS_PATH)) return 0;
  const text = fs.readFileSync(SESSIONS_PATH, 'utf8').trim();
  if (!text) return 0;
  return text.split('\n').filter((line) => line.trim()).length;
}

function applySnapshotToStats(stats, snapshot, maps) {
  mergeApi.applySnapshotToUserStats(stats, snapshot, maps);
}

function parseSnapshot(raw) {
  const data = mergeApi.parseSnapshotData(raw);
  if (data.type && data.type !== mergeApi.USER_MERGE_SNAPSHOT_TYPE) {
    console.warn(`警告：type 不是 ${mergeApi.USER_MERGE_SNAPSHOT_TYPE}（当前为 ${data.type}），仍将尝试合并`);
  }
  return mergeApi.annotateSnapshotCommit(data, {
    // 政策：merge 只追加 sessions，永不写入 chars
    committedToLevels: false,
    commitSource: 'node-merge',
  });
}

function appendSession(snapshot) {
  fs.appendFileSync(SESSIONS_PATH, `${JSON.stringify(snapshot)}\n`, 'utf8');
}

function readStdin() {
  return new Promise((resolve, reject) => {
    if (process.stdin.isTTY) {
      resolve('');
      return;
    }
    let raw = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { raw += chunk; });
    process.stdin.on('end', () => resolve(raw));
    process.stdin.on('error', reject);
  });
}

function rebuildFromSessions(statsPath, userId) {
  if (!fs.existsSync(SESSIONS_PATH)) {
    throw new Error(`没有 ${path.basename(SESSIONS_PATH)}，无法 rebuild`);
  }

  const maps = loadCatalogMaps();
  // 保留既有 chars（冻结 base）；只从流水重建 sessions
  const stats = loadStats(statsPath, userId);
  mergeApi.migrateStatsToIdKeys(stats, maps);
  stats.sessions = [];

  const lines = fs.readFileSync(SESSIONS_PATH, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  let ok = 0;
  for (let i = 0; i < lines.length; i++) {
    try {
      const raw = mergeApi.parseSnapshotData(lines[i]);
      const snapshot = mergeApi.annotateSnapshotCommit(raw, {
        committedToLevels: false,
        commitSource: raw.meta?.commitSource || 'rebuild',
      });
      applySnapshotToStats(stats, snapshot, maps);
      ok += 1;
    } catch (error) {
      console.warn(`跳过第 ${i + 1} 行：${error.message}`);
    }
  }

  mergeApi.annotateStatsChars(stats, maps.idToChar);
  mergeApi.refreshUserSummary(stats);
  writeJSON(statsPath, stats);
  refreshUsersIndex();
  console.log(`已从 ${ok} 条流水重建 sessions（未改动 chars）→ ${path.basename(statsPath)}`);
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
  console.log(`  committedToLevels: ${mergeApi.isSnapshotCommittedToLevels(snapshot)}`);

  const maps = loadCatalogMaps();

  if (appendOnly) {
    console.log('（--append-only：未更新总账）');
  } else {
    const stats = loadStats(statsPath, userId);
    mergeApi.migrateStatsToIdKeys(stats, maps);
    applySnapshotToStats(stats, snapshot, maps);
    mergeApi.annotateStatsChars(stats, maps.idToChar);
    mergeApi.refreshUserSummary(stats);
    writeJSON(statsPath, stats);
    refreshUsersIndex();

    const strokeCount = (snapshot.strokes || []).length
      || (snapshot.items || []).reduce((sum, item) => sum + (Number(item.count) || 0), 0);
    console.log(`已合并本轮 ${strokeCount} 次`);
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

  if (args.includes('--migrate')) {
    const userId = parseUserId(args);
    const statsPath = userStatsPath(userId);
    const maps = loadCatalogMaps();
    const stats = loadStats(statsPath, userId);
    mergeApi.migrateStatsToIdKeys(stats, maps);
    mergeApi.annotateStatsChars(stats, maps.idToChar);
    if (!Array.isArray(stats.sessions)) stats.sessions = [];
    mergeApi.refreshUserSummary(stats);
    writeJSON(statsPath, stats);
    refreshUsersIndex();
    console.log(`已迁移总账 → ${path.basename(statsPath)}`);
    printStatsBrief(stats, statsPath);
    return;
  }

  if (args.includes('--index')) {
    const index = refreshUsersIndex();
    console.log(`已刷新 users-index.json（${index.users.length} 个用户）`);
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

  if (!raw.trim() || raw.trim() === '{}') {
    throw new Error(`请先把网页复制的快照粘贴进 ${path.basename(INBOX_PATH)} 并保存`);
  }

  const snapshot = parseSnapshot(raw);
  mergeSnapshot(snapshot, { appendOnly, clearInboxAfter, statsPath, userId });
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
