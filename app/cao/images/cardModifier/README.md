# cardModifier — 卡面修饰层

## 命名

```text
cmNNN.ext
cmNNN_人眼标签.ext
```

| 部分 | 作用 | 例 |
|------|------|-----|
| `cmNNN` | **死 id**，写入 `cardStyle.cardModifier`、用于 match | `cm001` |
| `_人眼标签` | 仅方便肉眼辨认，**不参与匹配** | `_黑白角标` |
| `.ext` | `png` / `jpg` / `jpeg` / `webp` | `.png` |

示例：`cm001_黑白角标.png` → `"cardModifier": "cm001"`。

库注册：

```js
createCardModifier({ id: 'cm001', type: 'sticker', name: '黑白角标' })
```

加载时按 `id_name.ext` → `id.ext` 尝试。

## type

| type | 渲染 |
|------|------|
| `sticker` | 原图直接叠在卡最上层（不走 mask / 配色填色） |

## 层叠

secondary → cardBase → cardImage → **cardModifier(sticker)**
