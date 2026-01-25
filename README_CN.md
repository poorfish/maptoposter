![Banner](public/banner.jpg)

[English](README.md) | 简体中文

# Mapster

一个高端的 React Web 应用程序，旨在为您在地球上的任何位置创建精美、极简的地图海报。Mapster 将强大的地图数据可视化与精致的“毛玻璃（Glassmorphism）”UI 相结合，提供工作室级的专业设计体验。

**在线演示：** [mymapster.vercel.app](https://mymapster.vercel.app/)

## 核心功能

- **全球交互式地图** - 支持平移、缩放与城市搜索，精准选择全球任何地点。
- **高保真导出** - 将您的作品下载为生产级高清 PNG 或可无限放大的可缩放 SVG。
- **灵活的个性化自定** - 20 多种专业策划的主题、5 种以上高端字体系列以及多种宽高比（纵向、横向、正方形）。
- **移动端深度优化** - 针对移动端浏览器进行了精细打磨，包含自适应“底部菜单”以及稳健的视口处理。
- **艺术化的 3D 倒影** - 在虚拟画廊地板上展示您的海报，拥有逼真的梯形倒影效果，并同步镜像文字与元数据。
- **毛玻璃设计系统** - 精致现代的界面，具有自适应模糊效果、流畅的微动画以及深色模式支持。
- **渐进式渲染效果** - 异步加载状态与优雅的入场动画，确保海报生成的全过程都充满设计感。

## 应用截图

![Mapster 应用程序](screenshots/app-screenshot.png)

## 快速开始

### 使用 Vercel 一键部署
[![使用 Vercel 部署](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fpoorfish%2Fmapster)

### 本地部署
```bash
# 克隆并安装依赖
git clone https://github.com/poorfish/mapster.git
cd mapster
npm install

# 启动开发工作台
npm run dev
```

在浏览器中打开 [http://localhost:5173](http://localhost:5173)。

## 自定义选项

| 类别 | 可选内容 |
|----------|-------|
| **主题** | Noir, Midnight Gold, Cyberpunk, Forest, Ocean, Blueprint 等 (共 20+) |
| **字体** | Inter, Playfair Display, Montserrat, Courier Prime, Outfit, Nunito |
| **布局** | 纵向 (Portrait), 横向 (Landscape) |
| **比例** | 2:3, 3:4, 4:5, 1:1, 16:9 |

## 技术栈

- **React 18** (由 **Vite** 提供极速的热重载能力)
- **Leaflet** 提供高性能的地图交互能力
- **OSM Overpass API** 实时获取地理地理数据
- **SVG 渲染引擎** 确保分辨率无关的高质量解析

## 致谢

Mapster 的灵感源自 [originalankur/maptoposter](https://github.com/originalankur/maptoposter) 的核心概念。我们在其基础上通过以下改进显著提升了体验：

- **高端视觉语言** - 全面重塑了深度、光感和现代审美。
- **稳健的跨平台支持** - 在移动端 Safari 上拥有原生般的交互体验与视口修复逻辑。
- **异步优化架构** - 改进了数据获取与错误处理，提供更可靠的用户体验。

我们非常感谢开源社区以及原作者为这款创意工具打下的坚实基础。

## 许可协议

MIT
