![Banner](public/banner.jpg)

[English](README.md) | 简体中文

# Mapster

一个基于 React 的 Web 应用程序，用于为您在世界上的任何位置创建精美、极简的地图海报。搜索城市、自定义主题和布局，然后将海报下载为 SVG 或 PNG。

**在线演示：** [mymapster.vercel.app](https://mymapster.vercel.app/)

## 功能特点

- **交互式地图** - 平移和缩放以选择全球任何位置
- **地点搜索** - 使用 OpenStreetMap Nominatim 查找城市
- **20 种主题** - 从经典的 Noir 到 Neon Cyberpunk，从 Midnight Gold 到 Nordic Light
- **自定义字体** - 从 5 种字体系列中选择
- **灵活布局** - 纵向/横向，多种宽高比（2:3, 3:4, 4:5, 1:1）
- **导出选项** - 下载高清 PNG 或可缩放 SVG

## 应用截图

![Mapster 应用程序](screenshots/app-screenshot.png)

## 快速开始

### 一键部署到 Vercel
[![使用 Vercel 部署](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fpoorfish%2Fmapster)

### 本地部署
```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

在浏览器中打开 [http://localhost:5173](http://localhost:5173)。

## 使用方法

1. **搜索** 城市或平移地图到您想要的位置
2. **点击 "Generate"** 生成地图海报
3. 在设置面板中 **自定义** 主题、字体和布局
4. **下载** 为 PNG 或 SVG

## 可用主题

| 主题 | 风格 |
|-------|-------|
| Feature-Based | 经典的黑白层次结构 |
| Noir | 纯黑背景，白色道路 |
| Midnight Blue | 海军蓝配金色点缀 |
| Midnight Gold | 黑色配拉丝金 |
| Neon Cyberpunk | 电光粉和青色 |
| Blueprint | 建筑美学 |
| Warm Beige | 复古棕褐色调 |
| Pastel Dream | 柔和的哑光粉彩色 |
| Japanese Ink | 极简水墨感 |
| Forest | 深绿色和鼠尾草绿 |
| Ocean | 蓝色和青蓝色 |
| Terracotta | 地中海式的温暖 |
| Sunset | 温暖的橙色和粉色 |
| Autumn | 焦橙色和红色 |
| Copper Patina | 氧化铜美学 |
| Monochrome Blue | 单一蓝色系 |
| Gradient Roads | 平滑渐变阴影 |
| Contrast Zones | 高对比度城市密度 |
| Emerald City | 深绿色配银色高光 |
| Nordic Light | 斯堪的纳维亚极简主义 |

## 技术栈

- **React 18** (Vite)
- **Leaflet** 用于交互式地图
- **OpenStreetMap** Overpass API 获取地图数据
- **纯 SVG** 渲染，确保导出清晰

## 开发

```bash
npm run dev      # 启动开发服务器
npm run build    # 生产环境构建
npm run preview  # 预览生产环境构建
```

## 致谢

本项目基于 [originalankur/maptoposter](https://github.com/originalankur/maptoposter) 的优秀工作。我们在原始概念的基础上进行了以下扩展：

- **品牌重塑** - 更名为 Mapster，拥有自定义品牌和图标
- **增强用户体验** - 改进了菜单交互和按钮状态
- **深色主题集成** - 所有 UI 元素保持一致的深色配色方案
- **更好的布局** - 针对桌面端优化了分栏设计

我们非常感谢原作者开源了这款出色的工具，让其他人能够在其基础上继续创作。

## 许可协议

MIT
