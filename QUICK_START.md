# 快速开始指南

## 第一步：启动开发服务器

```bash
npm run dev
```

浏览器会自动打开 http://localhost:5173

## 第二步：配置Ollama API（可选，如果已部署）

编辑文件 `src/services/apiService.ts`，第50-57行：

```typescript
const defaultConfig: ApiConfig = {
  baseUrl: 'http://localhost:11434',  // 修改为你的Ollama地址
  model: 'deepseek-r1:7b',            // 修改为你的模型名称
  temperature: 0.7,
  maxTokens: 2048
}
```

## 第三步：启动Ollama服务

在终端运行：

```bash
# 启动Ollama
ollama serve

# 另一个终端拉取模型
ollama pull deepseek-r1:7b

# 或使用你已有的其他模型
ollama pull your-model-name
```

## 项目结构速览

```
src/
├── components/chat/      ← 聊天组件
├── services/             ← API服务
├── stores/               ← 状态管理
├── styles/               ← 主题和样式
└── types/                ← 类型定义
```

## 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 生产构建 |
| `npm run preview` | 预览生产构建 |
| `npm run type-check` | TypeScript类型检查 |

## 主要功能

- ✅ 聊天界面（支持多会话）
- ✅ 主题切换（4种主题）
- ✅ 消息管理（复制、重新生成）
- ✅ 本地存储（自动保存会话）
- ✅ 流式响应（实时显示回复）
- ✅ 动画效果（科技感UI）

## 修改API的几种方式

### 方式1：直接修改配置（推荐）

编辑 `src/services/apiService.ts` 最后部分：

```typescript
const defaultConfig: ApiConfig = {
  baseUrl: 'http://your-server:port',
  model: 'your-model-name',
  temperature: 0.7,
  maxTokens: 2048
}
```

### 方式2：运行时动态修改

在Vue组件中：

```typescript
import apiService from '@/services/apiService'

apiService.updateConfig({
  baseUrl: 'http://your-server:port',
  model: 'your-model-name'
})
```

## 故障排除

| 问题 | 解决方案 |
|------|--------|
| API连接失败 | 检查Ollama是否运行，检查地址和端口 |
| 样式不显示 | 清除浏览器缓存，刷新页面 |
| 消息消失 | 本地存储已满，清理浏览器数据 |
| 构建失败 | 运行 `npm install` 重新安装依赖 |

## 下一步

1. 根据需要修改主题配置 (`src/styles/themes.ts`)
2. 部署Ollama服务并配置API
3. 开始使用聊天应用！

## 需要帮助？

- 查看 `README_CHAT.md` 获取详细文档
- 检查浏览器开发者工具的Console标签查看错误
- 确保Node.js版本 >= 16

祝你使用愉快！🚀
