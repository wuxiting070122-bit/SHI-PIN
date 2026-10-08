# ASSET SOURCES · 素材来源与授权

本仓库所有素材的来源与使用范围说明。除标注外，均为本项目专用素材。

## 3D 模型（`public/models/`）

| 文件 | 来源 | 备注 |
| --- | --- | --- |
| `retro_tv_stack.glb` | 本人 Blender 建模，导出网页版 | 建模源文件与脚本在 `models-source/`；69 节点、23 个可点击屏幕，节点命名即交互约定 |
| `record-player.glb` | 本人 Blender 建模，导出网页版 | 保留铰链层级，源文件未修改 |
| `fold-installation.glb` | 本人 Blender 建模，导出网页版 | 文稿信件空间的八片折板 |

## 图片（`public/images/`）

| 目录 / 文件 | 生成方式 | 提示词存档 |
| --- | --- | --- |
| `photographer.png`、`photographer-sketch.png`、`tv-sketch-paper.png` | AI 生成（内置 imagegen，2026-09），以手绘参考图控制风格 | `IMAGE_PROMPT.md`、`STYLE_ASSETS.md` |
| `seasons/`（四季封面）、`channel-covers/` | AI 生成 + 人工修正，修正提示词见存档 | `design-drafts/autumn-flow-v3-prompt.txt`、`season-cover-correction-prompts.json` |
| `artworks/`、`video-covers/` | 作品封面与视频海报（海报由 `scripts/create-video-posters.py` 从视频帧生成） | — |

AI 生成图片仅用于本项目展示，无第三方版权素材混入。

## 视频（`public/videos/` — 未入仓库）

三个作品视频（`campus-band.mp4`、`kexinrou.mp4`、`hpv.mp4`）均为本人作品，
合计约 111MB，超出常规代码仓库的合理体量，故未随仓库分发：

- 在线观看：https://61340197ab2a43758aa51e7e6a9af9d6.app.workbuddy.host
- 如需原始文件，请联系作者。

视频在代码中按需加载（`preload='metadata'`，切换作品时才赋 `src`），
仓库缺失该目录不影响 `npm run dev` 启动与代码阅读，仅对应条目无法播放。

## 音频

无音频文件。全部音效由 Web Audio API 在运行时合成（见 `src/`）。

## 字体与第三方依赖

项目未内嵌任何字体文件，界面使用系统字体栈。
第三方运行时依赖仅 `three` 与 `gsap`，见 `package.json`，均按其官方开源许可证使用。
