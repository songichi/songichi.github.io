/**
 * 应用版本（展示用）
 * 与 user JSON / snapshot / shop 的 schema version 无关。
 * 格式：主.次.修订（如 1.0.00）
 */
const CAO_APP_VERSION = '1.0.00';

function getCaoAppVersion() {
  return CAO_APP_VERSION;
}

/** 把版本号写入带 data-cao-version 的节点 */
function applyCaoAppVersionLabels(root = document) {
  const version = getCaoAppVersion();
  const nodes = root.querySelectorAll('[data-cao-version]');
  for (const node of nodes) {
    const prefix = node.getAttribute('data-cao-version-prefix') || '';
    node.textContent = `${prefix}${version}`;
    if (!node.getAttribute('title')) node.title = `版本 ${version}`;
  }
  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.dataset.caoVersion = version;
  }
}
