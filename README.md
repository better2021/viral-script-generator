# 爆火视频文案生产器

基于 AI 的短视频爆款文案生成工具，提供多场景文案生成、模板管理与预览功能。

## 技术栈

- **Vue 3** — Composition API + `<script setup>` 组合式写法
- **Vite 6** — 开发/构建工具
- **Tabler Icons** — 图标库（CDN 引入）
- **qrcode** — 二维码生成
- **AI 服务** — 集成 LLM API 进行文案生成

## 本地启动

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

## 目录结构

```
viral-script-generator/
├── public/                  # 静态资源
│   ├── favicon.svg
│   └── icons.svg
├── src/
│   ├── assets/              # 图片等静态资源
│   ├── components/          # 通用 UI 组件
│   │   ├── CopyButton.vue       # 复制按钮
│   │   ├── CoverPreview.vue     # 封面预览
│   │   ├── SceneBlock.vue       # 场景块组件
│   │   ├── ScriptForm.vue       # 文案生成表单
│   │   └── StatsBar.vue         # 数据统计栏
│   ├── pages/               # 子功能页面
│   │   ├── mind-diffuser/       # 思维发散工具
│   │   ├── movie-recommender/   # 电影推荐工具
│   │   ├── pomodoro-todo/       # 番茄钟待办
│   │   └── qrcode-generator/    # 二维码生成
│   ├── composables/
│   │   └── useGenerator.js      # 文案生成逻辑
│   ├── prompts/
│   │   └── index.js             # AI 提示词模板
│   ├── services/
│   │   └── ai.js                # AI API 封装
│   ├── templates/
│   │   └── index.js             # 文案模板
│   ├── App.vue              # 主页面
│   ├── AppShell.vue         # 应用外壳布局
│   └── main.js              # 入口文件
├── index.html
├── package.json
└── vite.config.js
```

