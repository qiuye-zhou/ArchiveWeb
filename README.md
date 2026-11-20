# ArchiveWeb

在线文档系统 **ArchiveWeb** 前端，基于 React 19 + Ant Design 6 + Vite 构建，对接后端 [ArchiveCore](https://github.com/qiuye-zhou/ArchiveCore)

> 完整系统 = 本前端（:3030）+ [ArchiveCore](https://github.com/qiuye-zhou/ArchiveCore) 后端（:3666）。开发环境下 `/api` 由 Vite 代理转发到后端。

## 技术栈

| 类别 | 选型 |
| --- | --- |
| 框架 | React 19、TypeScript、Vite 8 |
| UI | Ant Design 6、@ant-design/icons |
| 路由 | react-router-dom 7 |
| 状态 | zustand（登录态持久化到 localStorage） |
| 请求 | axios（统一拦截、token 注入、响应解包） |
| 编辑器 | Milkdown 7（CommonMark + GFM，所见即所得 / 源码双模式） |
| 图表 | recharts |

## 功能特性

- **登录 / 初始化**：登录页支持「记住密码」，首次使用时引导初始化管理员账号
- **启动即鉴权**：刷新页面先校验本地 token，失败直接跳登录，不会闪现受保护内容
- **文档工作台**
  - 左侧分类目录树，文件夹展开状态与上次打开的文档自动记忆
  - Milkdown 所见即所得编辑，支持工具栏、标题层级、列表、链接（新标签打开）、图片上传
  - 「编辑 / 更新」两态切换，非编辑状态隐藏工具栏，只展示正文
  - 显示最后修改人与修改时间
  - 右侧标题目录快捷跳转 + 阅读进度
  - 单篇导出 Markdown、全部导出 zip（带确认）、删除（仅管理员）
- **历史版本**：查看历史修订记录并一键回溯
- **回收站**：列出已删除文档，支持恢复与永久删除（仅管理员）
- **分享链接**：`/share/:id` 免登录只读查看，可一键登录进入正常编辑界面
- **数据分析**：文档量、分类分布、最近更新等可视化图表
- **备份管理**：创建、上传、恢复、删除备份（仅管理员）
- **日志查看**：日志文件列表、虚拟滚动预览（大文件不卡顿）、按行数截取、下载完整文件
- **设置**：个人资料与用户管理（仅管理员）
- **异常处理**：接口不可达（断网 / 超时 / 502 / 503 / 504）跳转独立网络错误页，恢复后自动返回来源页

## 目录结构

```
src/
├─ pages/            # 页面
│  ├─ Login/         # 登录（记住密码）
│  ├─ Init/          # 初始化引导
│  ├─ Document/      # 文档工作台
│  ├─ Share/         # 分享只读页
│  ├─ Recycle/       # 回收站（管理员）
│  ├─ Analyze/       # 数据分析
│  ├─ Backup/        # 备份管理（管理员）
│  ├─ Loglist/       # 日志查看
│  ├─ Settings/      # 设置 / 用户管理
│  ├─ NetworkError/  # 网络错误页
│  └─ NotFound/      # 404
├─ components/
│  ├─ Layout/        # BasicLayout、Header 导航
│  ├─ MilkdownEditor/# 所见即所得编辑器
│  ├─ DocumentTree/  # 分类目录树
│  ├─ DocumentOutline/ # 右侧标题目录与阅读进度
│  └─ common/        # Logo、Empty、Loading、StatisticCard
├─ services/         # axios 封装与各业务接口
├─ store/            # zustand 状态（登录态）
├─ router/           # 路由配置与守卫
├─ types/            # 接口与业务类型
├─ utils/            # 格式化、下载、存储等工具
└─ hooks/            # 自定义 hooks
```

## 快速开始

环境要求：Node.js >= 20。

先确保后端 ArchiveCore 已启动（默认 http://127.0.0.1:3666），然后：

```bash
pnpm install
pnpm dev          # http://localhost:3030
```

首次访问会自动跳转初始化页面；若后端地址不同，请修改代理配置（见下节）。

### 常用脚本

| 命令 | 说明 |
| --- | --- |
| `pnpm dev` | 启动开发服务器（:3030） |
| `pnpm build` | 类型检查 + 生产构建（`tsc -b && vite build`） |
| `pnpm preview` | 预览构建产物 |
| `pnpm lint` | ESLint 检查 |
| `pnpm format` | Prettier 格式化 |

## 与后端的对接

代理配置位于 [vite.config.ts](vite.config.ts)：

```ts
server: {
  port: 3030,
  proxy: {
    '/api': {
      target: 'http://127.0.0.1:3666',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api/, ''),
      ws: true,
    },
  },
}
```

- 前端所有请求走 `/api` 前缀，代理转发时去掉该前缀并指向后端
- 后端默认端口为 `3666`，如已修改请同步调整 `target`
- axios 实例会自动注入 `Authorization: Bearer <token>`，并解包后端统一响应 `{ code, message, data }`
- 响应拦截器统一处理 401（清空登录态并跳登录）与网络不可达（跳网络错误页）

## 页面路由

| 路径 | 说明 | 权限 |
| --- | --- | --- |
| `/login` | 登录（已登录自动跳转） | 公开 |
| `/init` | 初始化引导 | 公开 |
| `/share/:id` | 文档分享只读页 | 公开 |
| `/network-error` | 网络错误页 | 公开 |
| `/document` | 文档工作台 | 登录 |
| `/analyze` | 数据分析 | 登录 |
| `/logs` | 日志查看 | 登录 |
| `/backup` | 备份管理 | 管理员 |
| `/recycle` | 回收站 | 管理员 |
| `/settings` | 设置 / 用户管理 | 管理员 |
