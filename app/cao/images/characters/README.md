# 字形图片目录

按书体分子目录存放。点击眼睛按钮后，图片会直接替代中间的汉字文字。

## 目录对应

| 书体 | 常量 | 目录 |
|------|------|------|
| 草体 | `DEFAULT_CHARACTERS_cao` | `images/characters/` |
| 楷书 | `DEFAULT_CHARACTERS_kai` | `images/characters/kai/` |
| 明体 | `DEFAULT_CHARACTERS_ming` | `images/characters/ming/` |
| 黑体 | `DEFAULT_CHARACTERS_hei` | `images/characters/hei/` |

## 命名规则

文件名使用汉字本身，推荐 `.png`，也兼容 `.jpg` / `.jpeg` / `.webp`：

```
永.png
和.jpg
九.webp
```

加载时按 `png → jpg → jpeg → webp` 顺序尝试。

## 示例

```
images/characters/
├── 永.png          ← 草体
├── kai/
│   └── 永.png      ← 楷书
└── ming/
    └── 永.png      ← 明体
```
