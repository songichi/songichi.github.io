# cardBases — 卡面底纹（黑白 mask）

## 命名

```text
cbNNN.ext
cbNNN_人眼标签.ext
```

| 部分 | 作用 | 例 |
|------|------|-----|
| `cbNNN` | **死 id**，写入 `cardStyle.cardBase`、用于 match | `cb001` |
| `_人眼标签` | 仅方便肉眼辨认，**不参与匹配** | `_点纹` |
| `.ext` | `png` / `jpg` / `jpeg` / `webp` | `.png` |

示例：`cb001_点纹.png` → 记录里写 `"cardBase": "cb001"`。

库注册只需 id + 显示名（无 fileStem）：

```js
createCardBase({ id: 'cb001', name: '点纹' })
```

加载时按 `id_name.ext` → `id.ext` 尝试。

## 渲染

以黑白图作 mask，用配色 **tertiaryColor** 填色，叠在 secondary 色块之上、cardImage（primary）之下。
