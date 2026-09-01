# 草体卡面（cardImages/cao）

PNG 文件名与字库 **Zi id** 末两位 `dup` 对应：

| 文件名（不含扩展名） | id 示例 | 说明 |
|---------------------|---------|------|
| `服` | `c.0670D.01` | 第 1 个版本（dup 01），**不写后缀** |
| `服_02` | `c.0670D.02` | 第 2 个版本 |
| `服_03` | `c.0670D.03` | 第 3 个版本，以此类推 |

规则：

- 目录：`images/cardImages/cao/`
- 扩展名：`.png`（也支持 `.jpg` / `.jpeg` / `.webp`）
- 文件名用 catalog **主字** `char`，不是异体字
- `_{dup2}` 与 id 末两位一致（01 省略后缀，02 起写 `_02`）
- 主字文件不存在时，会回退尝试 `alternatives` 中的字形文件名

逻辑见 `js/zi.js` 中的 `cardImageBasename` / `cardImageBasenamesForEntry`。

## 图案颜色（等级页预览）

PNG 只提供**形状蒙版**（不透明笔画 + 透明底）；实际墨色由 CSS `background-color` 填充，可在等级页右下角切换 **黑 / 白**。

- 默认：黑色 `#000000`
- 切换后：白色 `#ffffff`（偏好保存在 `localStorage`：`cao-card-preview-tone`）

导出卡图时建议：笔画区域不透明（黑或白均可），背景完全透明。
