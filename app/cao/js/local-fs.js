/**
 * local 文件夹读写（File System Access API + IndexedDB 记住授权）
 * 练字页与用户页共用同一目录 handle。
 */

const CAO_LOCAL_IDB_NAME = 'cao-user-viewer';
const CAO_LOCAL_IDB_STORE = 'handles';
const CAO_LOCAL_IDB_KEY = 'local-dir';
const CAO_LOCAL_PICKER_ID = 'cao-local';

/** sessionStorage：练完保存后立即渲染等级页 */
const CAO_USER_DATA_CACHE_KEY = 'cao-user-data-cache';

/** localStorage：user 页当前选中的用户 id（练字页共用） */
const CAO_ACTIVE_USER_STORAGE_KEY = 'cao-active-user-id';

const CAO_LOCAL_FILES = {
  sessionsNdjson: 'sessions.ndjson',
  usersIndex: 'users-index.json',
  userExample: 'user.example.json',
  shopSessions: typeof SHOP_SESSIONS_FILE !== 'undefined' ? SHOP_SESSIONS_FILE : 'shop-sessions.json',
};

function supportsLocalDirectoryPicker() {
  return typeof window.showDirectoryPicker === 'function';
}

function openLocalIdb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(CAO_LOCAL_IDB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(CAO_LOCAL_IDB_STORE)) {
        db.createObjectStore(CAO_LOCAL_IDB_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

async function saveLocalDirHandle(handle) {
  const db = await openLocalIdb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(CAO_LOCAL_IDB_STORE, 'readwrite');
    tx.objectStore(CAO_LOCAL_IDB_STORE).put(handle, CAO_LOCAL_IDB_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function loadLocalDirHandle() {
  const db = await openLocalIdb();
  const handle = await new Promise((resolve, reject) => {
    const tx = db.transaction(CAO_LOCAL_IDB_STORE, 'readonly');
    const request = tx.objectStore(CAO_LOCAL_IDB_STORE).get(CAO_LOCAL_IDB_KEY);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return handle;
}

async function clearLocalDirHandle() {
  const db = await openLocalIdb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(CAO_LOCAL_IDB_STORE, 'readwrite');
    tx.objectStore(CAO_LOCAL_IDB_STORE).delete(CAO_LOCAL_IDB_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function ensureDirPermission(handle, mode = 'readwrite') {
  if (!handle) return false;
  const options = { mode };
  if ((await handle.queryPermission(options)) === 'granted') return true;
  if ((await handle.requestPermission(options)) === 'granted') return true;
  return false;
}

async function pickLocalDirectory(mode = 'readwrite') {
  if (!supportsLocalDirectoryPicker()) {
    throw new Error('当前浏览器不支持文件夹访问，请使用 Chrome / Edge');
  }
  const handle = await window.showDirectoryPicker({
    id: CAO_LOCAL_PICKER_ID,
    mode,
    startIn: 'documents',
  });
  await saveLocalDirHandle(handle);
  return handle;
}

async function readTextFromDir(dirHandle, fileName) {
  const fileHandle = await dirHandle.getFileHandle(fileName);
  const file = await fileHandle.getFile();
  return file.text();
}

async function writeTextToDir(dirHandle, fileName, text) {
  const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(text);
  await writable.close();
}

async function appendLineToDir(dirHandle, fileName, line) {
  const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
  const file = await fileHandle.getFile();
  const writable = await fileHandle.createWritable({ keepExistingData: true });
  if (typeof writable.seek === 'function' && file.size > 0) {
    await writable.seek(file.size);
  }
  await writable.write(line);
  await writable.close();
}

async function readJsonFromDir(dirHandle, fileName) {
  const text = await readTextFromDir(dirHandle, fileName);
  return JSON.parse(text);
}

async function writeJsonToDir(dirHandle, fileName, data) {
  const text = (typeof isUserStatsPayload === 'function' && isUserStatsPayload(data)
    && typeof stringifyUserStatsForDisk === 'function')
    ? stringifyUserStatsForDisk(data)
    : `${JSON.stringify(data, null, 2)}\n`;
  await writeTextToDir(dirHandle, fileName, text);
}

function cacheUserDataForLevelPage(userId, data) {
  sessionStorage.setItem(CAO_USER_DATA_CACHE_KEY, JSON.stringify({
    userId,
    data,
    cachedAt: new Date().toISOString(),
  }));
}

function consumeCachedUserData() {
  const raw = sessionStorage.getItem(CAO_USER_DATA_CACHE_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(CAO_USER_DATA_CACHE_KEY);
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * 练完一键：写 user JSON、追加 ndjson、刷新 users-index
 * @param {FileSystemDirectoryHandle} dirHandle
 */
async function savePracticeSessionToLocal(dirHandle, snapshot, userId) {
  const uid = userId || USER_MERGE_DEFAULT_USER_ID;
  const maps = buildCatalogMapsInBrowser();
  const statsFile = userStatsFileName(uid);

  let stats;
  try {
    stats = await readJsonFromDir(dirHandle, statsFile);
  } catch {
    try {
      stats = await readJsonFromDir(dirHandle, CAO_LOCAL_FILES.userExample);
      stats.user = uid;
    } catch {
      stats = emptyUserStats(uid);
    }
  }

  const committedSnapshot = annotateSnapshotCommit(snapshot, {
    // chars 为冻结 base，浏览器总结只写入 sessions 历史
    committedToLevels: false,
    commitSource: 'browser-save',
  });

  const merged = mergeSnapshotIntoUserStats(
    typeof normalizeUserStats === 'function' ? normalizeUserStats(stats, uid) : stats,
    committedSnapshot,
    maps,
    uid,
  );

  await writeJsonToDir(dirHandle, statsFile, merged);
  await appendLineToDir(dirHandle, CAO_LOCAL_FILES.sessionsNdjson, `${JSON.stringify(committedSnapshot)}\n`);

  let indexEntries = [{ id: uid, file: statsFile, data: merged }];
  try {
    const index = await readJsonFromDir(dirHandle, CAO_LOCAL_FILES.usersIndex);
    const others = (index.users || []).filter((u) => u.id !== uid);
    indexEntries = [...others.map((u) => ({ id: u.id, file: u.file, data: null })), indexEntries[0]];
  } catch {
    // 无索引则只写当前用户
  }

  const indexPayload = buildUsersIndexFromStatsList(
    indexEntries.map((entry) => ({
      ...entry,
      data: entry.data || merged,
    })),
  );
  await writeJsonToDir(dirHandle, CAO_LOCAL_FILES.usersIndex, indexPayload);

  cacheUserDataForLevelPage(uid, merged);
  saveActiveUserId(uid);
  return merged;
}

function loadActiveUserId() {
  const raw = localStorage.getItem(CAO_ACTIVE_USER_STORAGE_KEY);
  return raw ? String(raw).trim() : null;
}

function saveActiveUserId(userId) {
  if (!userId) localStorage.removeItem(CAO_ACTIVE_USER_STORAGE_KEY);
  else localStorage.setItem(CAO_ACTIVE_USER_STORAGE_KEY, String(userId));
}

async function localDirHasUserFile(dirHandle, userId) {
  if (!dirHandle || !userId) return false;
  try {
    await dirHandle.getFileHandle(userStatsFileName(userId));
    return true;
  } catch {
    return false;
  }
}

/** 练字页：从已授权的 local 目录解析当前用户 id */
async function resolveLocalPracticeUser() {
  const displayNone = '无用户';
  if (!supportsLocalDirectoryPicker()) {
    return { userId: null, display: displayNone };
  }

  try {
    const handle = await loadLocalDirHandle();
    if (!handle) return { userId: null, display: displayNone };

    const allowed = await ensureDirPermission(handle, 'read');
    if (!allowed) return { userId: null, display: displayNone };

    const savedId = loadActiveUserId();
    if (savedId && (await localDirHasUserFile(handle, savedId))) {
      return { userId: savedId, display: savedId };
    }

    const found = [];
    for await (const [name, entry] of handle.entries()) {
      if (entry.kind !== 'file' || !isUserJsonFileName(name)) continue;
      found.push({ name, id: userIdFromFileName(name) });
    }
    found.sort((a, b) => a.name.localeCompare(b.name, 'en'));
    if (found.length === 0) return { userId: null, display: displayNone };

    const picked = found[0];
    saveActiveUserId(picked.id);
    return { userId: picked.id, display: picked.id };
  } catch {
    return { userId: null, display: displayNone };
  }
}
