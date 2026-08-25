# 本地练习账本（个人数据，默认不上传）

当前用户数据文件：**`user-yi.json`**

本目录存放**本机**练习统计。网站默认不提交 `user-*.json`（见 `.gitignore`）。查看页：`app/cao/user/`。

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

1. 网页 **复制本轮快照** → 粘贴进 `inbox.json` → `node merge`（更新本机 `user-yi.json`）
2. **`git push`** 只同步**网站代码**与 `local` 里允许提交的文件，**不会**上传 `user-yi.json`

备份个人数据请自行拷贝 `user-yi.json` 或整个 `local` 目录，不要依赖 GitHub。






！！！关于用户数据
## 最简单用法（推荐）

1. 网页右上角点 **复制本轮快照**
2. 打开 `inbox.json`，全选清空，粘贴进去并保存
3. 在终端执行（可直接复制）：

```bash
cd /Users/zyw/Desktop/art/codes/wangzunyi/songichi.github.io/app/cao/local && node merge
```

成功后会：写入总账 `user-yi.json`、追加流水 `sessions.ndjson`、刷新 `users-index.json`，并**清空** `inbox.json`。

## 查看用户数据

打开 `app/cao/user/index.html`（建议用 **Chrome / Edge**）：

1. 点 **连接 local 文件夹**，选中 `app/cao/local`
2. 页面会列出所有 `user*.json`，点名称即可查看
3. 之后刷新可自动恢复（若浏览器再次询问权限，点允许即可）

也可用「刷新列表」重新扫描；不支持文件夹 API 的浏览器可改用手动选文件。

## 文件

| 文件 | 是否提交 | 说明 |
|------|----------|------|
| `inbox.json` | 是（常为空） | 粘贴快照的默认入口 |
| `user.example.json` | 是 | 总账模板 |
| `user-yi.json` | 否 | **当前用户 yi 的总账** |
| `users-index.json` | 否 | `cao/user` 页索引（`node merge --index` 生成） |
| `sessions.ndjson` | 否 | 每行一条本轮快照 |
| `merge` | 是 | 一键合并入口（`node merge`） |
| `merge-snapshot.js` | 是 | 合并脚本 |

## 其他用法

```bash
node merge --user yi          # 指定用户（默认 yi → user-yi.json）
node merge ./my-snapshot.json
pbpaste | node merge
node merge --rebuild
node merge --index            # 扫描 local 下 user*.json，刷新索引
```
