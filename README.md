# Cloudflare Edge Visualizer / Cloudflare 边缘网络可视化器

<div align="center">
  <img src="./屏幕截图 2025-11-28 132824.png" alt="Cloudflare Edge Visualizer - Global View" width="800">
  <img src="./屏幕截图 2025-11-28 132727.png" alt="Cloudflare Edge Visualizer - Detail View" width="800">
</div>

一个基于 React 和 Three.js 的交互式 3D 地球可视化应用，用于展示 Cloudflare 全球边缘网络节点的分布和流量情况。

An interactive 3D globe visualization application built with React and Three.js, designed to display the distribution and traffic of Cloudflare's global edge network nodes.

---

## 🌟 Features / 功能特性

- **3D Globe Visualization** / **3D 地球可视化**: Beautiful interactive 3D globe using react-globe.gl / 使用 react-globe.gl 创建美观的交互式 3D 地球
- **Real-time Data Display** / **实时数据展示**: Edge node visualization based on Cloudflare IP range data / 基于 Cloudflare IP 范围数据的边缘节点可视化
- **Smart Lazy Loading** / **智能懒加载**: Dynamically load relevant data based on view range for better performance / 根据视图范围动态加载相关数据，提升性能
- **Geographic Location Mapping** / **地理位置映射**: Integrated GeoLite2 database for precise geographic location identification / 集成 GeoLite2 数据库进行精确的地理位置识别
- **Interactive Exploration** / **交互式探索**: Click nodes to view detailed information including IP ranges, cities, countries / 点击节点查看详细信息，包括 IP 范围、城市、国家等
- **Dynamic Data Updates** / **动态数据更新**: Support incremental updates with intelligent caching to reduce network requests / 支持增量更新，智能缓存机制减少网络请求
- **Responsive Design** / **响应式设计**: Adaptive to different screen sizes / 自适应不同屏幕尺寸

---

## 🛠️ Tech Stack / 技术栈

- **Frontend Framework** / **前端框架**: React 19.2.0
- **3D Rendering** / **3D 渲染**: Three.js + react-globe.gl
- **Data Visualization** / **数据可视化**: D3.js (d3-scale)
- **Build Tool** / **构建工具**: Vite
- **Development Language** / **开发语言**: TypeScript
- **Geographic Location** / **地理位置**: GeoLite2-City.mmdb local database / GeoLite2-City.mmdb 本地数据库
- **Styling** / **样式**: Tailwind CSS

---

## 🚀 Quick Start / 快速开始

### Prerequisites / 前置要求

- Node.js (recommended 18.0 or higher / 推荐 18.0 或更高版本)
- npm or yarn / npm 或 yarn

### Install Dependencies / 安装依赖

```bash
npm install
```

### Start Development Server / 启动开发服务器

```bash
npm run dev
```

The application will start at `http://localhost:5173` / 应用将在 `http://localhost:5173` 启动。

### Build Production Version / 构建生产版本

```bash
npm run build
```

### Preview Production Version / 预览生产版本

```bash
npm run preview
```

---

## 📁 Project Structure / 项目结构

```
cloudflare-edge-visualizer/
├── components/           # React components / React 组件
│   ├── GlobeViz.tsx     # 3D globe visualization component / 3D 地球可视化组件
│   ├── Hud.tsx          # HUD display component / HUD 显示组件
│   └── DetailPanel.tsx  # Detail panel component / 详情面板组件
├── services/            # Service layer / 服务层
│   └── dataService.ts   # Data fetching and processing service / 数据获取和处理服务
├── public/              # Static assets / 静态资源
│   └── GeoLite2-City.mmdb # Geographic location database / 地理位置数据库
├── App.tsx              # Main application component / 主应用组件
├── types.ts             # TypeScript type definitions / TypeScript 类型定义
├── constants.ts         # Constants configuration / 常量配置
└── index.html           # HTML entry file / HTML 入口文件
```

---

## 🔧 Core Features / 核心功能详解

### Data Fetching & Processing / 数据获取与处理

- **Incremental Update Mechanism** / **增量更新机制**: Content hash-based change detection to avoid unnecessary network requests / 基于内容哈希检测数据变化，避免不必要的网络请求
- **Smart Caching** / **智能缓存**: localStorage-based data persistence caching / 使用 localStorage 实现数据持久化缓存
- **Lazy Loading Strategy** / **懒加载策略**: Dynamically load relevant regional data based on current view range / 根据当前视图范围动态加载相关区域数据
- **Geographic Location Mapping** / **地理位置映射**: Combination of GeoLite2 database and static mapping tables / 结合 GeoLite2 数据库和静态映射表

### 3D Visualization / 3D 可视化

- **Hexagonal Binning** / **六边形分箱**: Use hexBin to aggregate and display geographic location data / 使用 hexBin 对地理位置数据进行聚合显示
- **Color Mapping** / **颜色映射**: Use gradient colors to represent node load / 根据节点负载使用渐变色彩表示
- **Lighting Effects** / **光照效果**: Multi-layer lighting system to enhance 3D visual effects / 多层光照系统增强 3D 视觉效果
- **Interactive Controls** / **交互控制**: Support rotation, zoom, click and other interactive operations / 支持旋转、缩放、点击等交互操作

### Performance Optimization / 性能优化

- **Batch Processing** / **分批处理**: Use batch processing for large data volumes to avoid UI blocking / 大数据量时采用分批处理避免 UI 阻塞
- **Debouncing Mechanism** / **防抖机制**: Use debouncing when camera moves to reduce data request frequency / 相机移动时使用防抖减少数据请求频率
- **Memory Management** / **内存管理**: Smart cache management to avoid memory leaks / 智能缓存管理，避免内存泄漏

---

## 🎮 User Guide / 使用指南

### Basic Operations / 基本操作

1. **Rotate Globe** / **旋转地球**: Left mouse button drag / 鼠标左键拖拽
2. **Zoom View** / **缩放视图**: Mouse wheel / 鼠标滚轮
3. **View Details** / **查看详情**: Click hexagonal nodes on the globe / 点击地球上的六边形节点
4. **Auto Rotation** / **自动旋转**: Auto rotation is enabled by default, stops after clicking / 默认开启自动旋转，点击后停止

### Data Panel / 数据面板

After clicking a node, a detailed information panel will be displayed, including:
点击节点后会显示详细信息面板，包含：
- City name and country / 城市名称和国家
- IP range list / IP 范围列表
- Node load status / 节点负载情况
- Routing information / 路由信息

---

## 🌐 Data Sources / 数据源

- **Cloudflare IP Ranges** / **Cloudflare IP 范围**: https://www.cloudflare.com/ips-v4
- **Cloudflare Local IP Ranges CSV** / **Cloudflare 本地 IP 范围 CSV**: https://api.cloudflare.com/local-ip-ranges.csv
- **GeoLite2 Database** / **GeoLite2 数据库**: MaxMind GeoLite2-City.mmdb

---

## 🔧 Configuration Options / 配置选项

Main configurations are in `constants.ts` / 主要配置在 `constants.ts` 中：

```typescript
export const THEME = {
  background: '#02040a',
  hexColorLow: '#00f2ff',
  hexColorMid: '#00ff88',
  hexColorHigh: '#ff0088',
  atmosphere: '#00f2ff'
};
```

---

## 🤝 Contributing / 贡献指南

1. Fork this project / Fork 本项目
2. Create feature branch / 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. Commit changes / 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch / 推送到分支 (`git push origin feature/AmazingFeature`)
5. Open Pull Request / 开启 Pull Request

---

## 📝 License / 许可证

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details / 本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

---

## 🙏 Acknowledgments / 致谢

- [react-globe.gl](https://github.com/vasturiano/react-globe.gl) - Powerful React globe component / 强大的 React 地球组件
- [Three.js](https://threejs.org/) - Excellent 3D graphics library / 优秀的 3D 图形库
- [Cloudflare](https://www.cloudflare.com/) - Providing edge network data / 提供边缘网络数据
- [MaxMind](https://www.maxmind.com/) - GeoLite2 geographic location database / GeoLite2 地理位置数据库
