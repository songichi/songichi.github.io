# 本地练习账本（个人数据，默认不上传）

当前用户数据文件：**`user-yi.json`**

本目录存放**本机**练习统计。网站默认不提交 `user-*.json`（见 `.gitignore`）。查看页：`app/cao/user/`。

---

## ⚠ 数据政策（必读）

**未来所有 merge / 浏览器「总结」写入的练习记录，永远不得写入 `user-*.json` 的 `chars`。**

| 字段 | 角色 | 规则 |
|------|------|------|
| `chars` | **旧数据兼容层（冻结 base）** | 只保留改版前已有次数；**禁止**被新练习累加或改写 |
| `sessions` | **练习历史（唯一写入路径）** | 每轮练习只追加一条 session（含 `strokes`） |
| `policy` | 文件内标记 | 见各 `user-*.json` / `user.example.json` |
| `ink` | 货币「墨」余额 | 非负整数；缺省 `0`。等级页 UNIQUE 右侧显示 |
| `inkHistory` | 墨流水 | 每笔 `[delta, balance, at, reason, …]`；`gainInk` / `spendInk` 写入。练字 **墨掉落** 在结算时写入，`ref` 对齐 session stroke |
| `shopPurchases`（磁盘 `sp`） | 商店购买明细 | 可选明细；售罄以 `shopBuys` 为准 |
| `shopBuys`（磁盘 `sb`） | 按日已购格位 | 如 `{ "2026-08-31": [1] }`；**售罄按用户**，与货架无关 |

**掉落判定（练字）：** 完成某字并跳到下一字时，以 1/10 进入 unique 词条判定；词条全空则保底 +5 墨（记在 `stroke.inkDrop`）。单字综合墨掉落概率约 **189/3200 ≈ 5.91%**。右侧显示「X墨」与黑圆框提示；**账户入账须等结算写入**。

**磁盘格式 v3：** 落盘为**缩进 JSON**（便于阅读）；顶层短键（`v`/`u`/`at`/`sum`…）；`chars` 每字单行 `[字, 次数, first, last]`；`sessions[].s` 每笔单行 `[id, durationMs]`（unique 再跟 `{cs,cb,cm,d,ci}`）；`f`/`m`/`lib`/`cl`/`src` 收成一行。同 UTC 日的 `e` 只写时刻（如 `06:06:47.129Z`），跨日仍写完整 ISO。读写经 `packUserStatsForDisk` / `normalizeUserStats`（`user-merge.js`），内存仍用长键。旧版长键 pretty JSON 仍可读取。

**界面展示（等级 / 统计）：**

- 每个字的次数 = `chars[id].count`（基数）+ **当场从全部 `sessions[].strokes` 合计的次数**
- 不把 sessions 写回 `chars`；只在打开用户页时计算总和用于等级与次数显示

实现约定：

- 浏览器总结：`meta.committedToLevels = false`，只追加 `sessions`
- `node merge`：同样 `committedToLevels = false`，只追加 `sessions`
- 仅当（且只应在遗留/手工例外时）显式 `committedToLevels: true` 才会改 `chars`——**日常不要这样做**
- `node merge --rebuild`：只从 `sessions.ndjson` **重建 `sessions`**，**不改动**既有 `chars`

---

## 同步整个站到 GitHub

练字站代码在仓库 **`songichi.github.io`** 里，推送到 GitHub 后，GitHub Pages 会自动更新线上站点（`main` 分支）。

**仓库地址：** https://github.com/songichi/songichi.github.io

**本机路径（示例）：**

```text
/Users/zyw/Desktop/art/codes/wangzunyi/songichi.github.io
```

### 会上传什么、不会上传什么

| 内容 | 是否推送到 GitHub |
|------|-------------------|
| `app/cao/` 下页面、JS、CSS、字形图等 | 是 |
| `local/merge`、`merge-snapshot.js`、`inbox.json`（常为空） | 是 |
| `local/user-yi.json`、其它 `user-*.json` | **否**（`.gitignore`） |
| `local/sessions.ndjson`、`users-index.json` | **否** |

个人练习次数**只留在本机**；同步 GitHub 不会把你的练字记录公开。

### 日常推送（改完代码后）

在终端进入仓库根目录，然后：

```bash
cd /Users/zyw/Desktop/art/codes/wangzunyi/songichi.github.io

# 1. 看改了哪些文件
git status

# 2. 暂存要提交的改动（或 git add 具体路径）
git add app/cao

# 3. 提交（写一句说明）
git commit -m "更新练字站"

# 4. 推到 GitHub
git push origin main
```

推送成功后，等一两分钟再打开你的 GitHub Pages 地址查看线上是否已更新。

### 首次或换电脑时

```bash
cd /Users/zyw/Desktop/art/codes/wangzunyi/songichi.github.io

# 若还没有克隆过仓库：
# git clone https://github.com/songichi/songichi.github.io.git
# cd songichi.github.io

# 拉取远端最新（避免冲突）
git pull origin main

# 再按上面的 add → commit → push
```

若 `git push` 提示需要登录，在 GitHub 使用 **Personal Access Token** 或已配置的 SSH / GitHub CLI（`gh auth login`）。

### 和「合并快照」的关系

1. 网页 **复制本轮快照** → 粘贴进 `inbox.json` → `node merge`（只追加本机 `user-yi.json` 的 **`sessions`**）
2. **`git push`** 只同步**网站代码**与 `local` 里允许提交的文件，**不会**上传 `user-yi.json`

备份个人数据请自行拷贝 `user-yi.json` 或整个 `local` 目录，不要依赖 GitHub。

---

## 每日商店（`shop-sessions.json`）

等级页左侧「商店」按钮：进入独立商店界面（仅展示当日 3 张在售卡，无字卡列表）。北京时间每天 **06:00** 刷新。

| 规则 | 说明 |
|------|------|
| 卡面文件 | 仅从**有对应 `.png` 卡面**的字中抽取 |
| 标价 | 分解兑换表 × 2，再乘随机浮动 **−20%～+40%**（取整） |
| 售罄 | **按用户**：该用户当日是否已买该格（`shopBuys` / `sb`）；他人购买不影响你 |
| 货架历史 | 当日卖什么写入 `local/shop-sessions.json`（共享目录，**不含**售罄状态） |
| 购买记录 | 用户 JSON：`shopBuys` 记 `{ 日: [slot…] }`；并追加 unique session（`shopPurchases` 可作明细） |

---

## 最简单用法（推荐）

练完字后，在练字页右上角（模式切换右侧）：

1. 点 **完成** — 结束本轮计时，按钮变为 **总结**（此时刷新/跳过不可用）
2. 点 **总结** — 写入 `local/` 并跳转到 **等级页**（**首次**会弹出选文件夹，选 `app/cao/local`；之后浏览器会记住授权）

需 **Chrome / Edge**（File System Access API）。

### `sessions.ndjson` / session 里的提交标记

每条流水会带 `meta.committedToLevels` 与 `meta.commitSource`：

| 来源 | `committedToLevels` | `commitSource` | 是否改 `chars` |
|------|---------------------|----------------|----------------|
| 练字页 **总结** | `false` | `browser-save` | **否**（只写 `sessions`） |
| `node merge`（inbox 合并） | `false` | `node-merge` | **否**（只写 `sessions`） |
| 网页结算「复制结果」再 merge | `false` | `clipboard-copy` → merge 时改 `node-merge` | **否**（sessions + 墨掉落入 inkHistory） |
| 仅复制快照、未合并 | （不写盘） | — | — |
| 遗留显式 `true` | `true` | 视来源 | 会改 `chars`（**禁止日常使用**） |

## 备用：复制结果 + 终端合并

适合：网站部署在服务器、本机没有连 local 文件夹时。

1. 练字页点 **结算** → 下方 **复制结果**（JSON 含字与时长、unique 卡面、墨掉落）
2. 打开本机 `app/cao/local/inbox.json`，全选清空，粘贴并保存
3. 终端执行：

```bash
cd /Users/zyw/Desktop/art/codes/wangzunyi/songichi.github.io/app/cao/local && node merge
```

成功后会：在 `user-yi.json` 的 **`sessions` 追加一条**、墨掉落写入 **`inkHistory`**、追加 `sessions.ndjson`、刷新 `users-index.json`，并**清空** `inbox.json`。**不会**改写 `chars`。

右上角「复制本轮快照」同样可复制兼容格式的 JSON。

### 无 local 部署说明

静态站可在服务器正常练字（字库在 JS 内）。未连接本机 `local/`、没有用户文件时，练字页左上角**不显示**用户名。等级 / 商店 / 一键「结束」写盘需本机授权 `local` 文件夹，或走上方「复制结果 → inbox → node merge」。

## 用户 JSON 结构（`user-yi.json`）

| 字段 | 说明 |
|------|------|
| `policy` | 数据政策标记（见下） |
| `chars` | **冻结 base**（兼容旧等级数据；新练习禁止写入） |
| `sessions` | **逐轮练习历史**（唯一合法的新数据写入处） |
| `summary` | 文件内汇总（偏 `chars` 侧）；**界面以 chars+sessions 现场合计为准** |

`policy` 示例：

```json
"policy": {
  "chars": "legacy-frozen-base",
  "sessions": "append-only-history",
  "note": "新练习只追加 sessions，禁止写入 chars。chars 仅兼容旧数据。"
}
```

快照 **v3** 含 `strokes` 数组（每项：`id` + `durationMs`，可含 `isUnique` / `cardStyle`）；旧 v2 快照（仅 `items` 次数）仍可合并进 `sessions`。

## 从历史流水重建 `sessions`（可选）

若需要按 `sessions.ndjson` **重建** `user-*.json` 里的 `sessions` 数组：

```bash
cd app/cao/local && node merge --rebuild
```

注意：

- **只重建 `sessions`，不改动既有 `chars`**
- 旧快照没有逐字时长时，stroke 的 `durationMs` 可能为 `0`
- **日常不必运行**

其它维护命令：

```bash
node merge --migrate    # 确保 chars 为 id 键、并初始化 sessions: []
node merge --index      # 刷新 users-index.json
```

## 查看用户数据

打开 `app/cao/user/index.html`（建议用 **Chrome / Edge**）：

1. 从练字页 **总结** 后会自动跳转至此（等级视图）
2. 也可手动打开，点 **连接 local 文件夹**，选中 `app/cao/local`
3. 页面会列出所有 `user*.json`，点名称即可查看
4. 之后刷新可自动恢复（若浏览器再次询问权限，点允许即可）

也可用「刷新列表」重新扫描；不支持文件夹 API 的浏览器可改用手动选文件。

## 文件

| 文件 | 是否提交 | 说明 |
|------|----------|------|
| `inbox.json` | 是（常为空） | 粘贴快照的默认入口 |
| `user.example.json` | 是 | 用户 JSON 模板（含 `policy`） |
| `user-yi.json` | 否 | **当前用户 yi** |
| `users-index.json` | 否 | `cao/user` 页索引（`node merge --index` 生成） |
| `sessions.ndjson` | 否 | 每行一条本轮快照 |
| `merge` | 是 | 一键合并入口（`node merge`） |
| `merge-snapshot.js` | 是 | 合并脚本 |

## 其他用法

```bash
node merge --user yi          # 指定用户（默认 yi → user-yi.json）
node merge ./my-snapshot.json
pbpaste | node merge
node merge --rebuild          # 从 sessions.ndjson 重建 sessions（不改 chars）
node merge --migrate          # id 键迁移 / 初始化 sessions 数组
node merge --index            # 扫描 local 下 user*.json，刷新索引
```
