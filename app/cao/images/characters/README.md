# 字形图片目录

按书体分子目录存放。点击眼睛按钮后，图片会直接替代中间的汉字文字。

## 目录对应

| 书体 | 常量 | 目录 |
|------|------|------|
| 草体 | `SCRIPT.cao` | `images/characters/cao/` |
| 真书 | `SCRIPT.zhen` | `images/characters/zhen/`（文件名 `{styleId}_{字}`） |
| 楷书（遗留） | — | `images/characters/kai/` |
| 明体（遗留） | — | `images/characters/ming/` |
| 黑体（遗留） | — | `images/characters/hei/` |

## 命名规则

草体文件名使用汉字本身，推荐 `.png`，也兼容 `.jpg` / `.jpeg` / `.webp`：

```
cao/永.png
cao/和.jpg
```

真书：

```
zhen/zk001_永.png
```

加载时按 `png → jpg → jpeg → webp` 顺序尝试。

## 示例

```
images/characters/
├── cao/
│   └── 永.png          ← 草体
├── zhen/
│   └── zk001_永.png    ← 真书
├── kai/
│   └── 永.png          ← 遗留楷书目录
└── ming/
    └── 永.png
```
