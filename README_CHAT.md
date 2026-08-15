# DeepSeek AI Chat - 本地网页聊天工具

一个完整的、生产级别的AI聊天网页工具，使用Vue 3 + TypeScript + Pinia构建。专门设计用于与本地部署的Ollama模型（如DeepSeek-R1 7B）进行交互。

## ✨ 功能特性

- 🎨 **多主题切换** - 支持4种主题（深空黑、亮白、霓虹绿、深海蓝）
- 💬 **完整聊天功能** - 支持多会话、消息管理、本地存储
- ⚡ **流式响应** - 支持流式输出，实时显示AI回复
- 🎭 **科技美学** - 现代化UI设计，炫彩动画效果
- 📱 **响应式设计** - 完美支持桌面和平板设备
- 🔧 **模块化架构** - 清晰的代码结构，易于维护和扩展
- 💾 **本地存储** - 会话和主题设置自动保存
- 🚀 **高性能** - 使用Vite构建，快速的开发和生产体验

## 📋 技术栈

- **前端框架** - Vue 3 (Composition API)
- **编程语言** - TypeScript
- **状态管理** - Pinia
- **HTTP客户端** - Axios
- **构建工具** - Vite
- **样式方案** - CSS 3 + CSS变量主题系统

## 🚀 快速开始

### 前置条件

- Node.js 16+
- npm 或 yarn
- 本地部署的Ollama服务（可选，API调用会失败但不影响UI测试）

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

浏览器将自动打开 http://localhost:5173

### 生产构建

```bash
npm run build
```

构建输出位于 `dist` 目录。

## 🔌 API配置

### 配置Ollama API地址

在 `src/services/apiService.ts` 中修改默认配置：

```typescript
const defaultConfig: ApiConfig = {
  baseUrl: 'http://localhost:11434',  // 你的Ollama服务地址
  model: 'deepseek-r1:7b',             // 模型名称
  temperature: 0.7,                    // 温度参数 (0.0-1.0)
  maxTokens: 2048                      // 最大token数
}
```

### 启动Ollama服务示例

```bash
# 启动Ollama服务（假设已安装）
ollama serve

# 在另一个终端拉取模型
ollama pull deepseek-r1:7b

# 测试API连接
curl http://localhost:11434/api/generate -d '{
  "model": "deepseek-r1:7b",
  "prompt": "Hello"
}'
```

## 📁 项目结构

```
src/
├── components/
│   └── chat/
│       ├── ChatWindow.vue      # 主聊天窗口
│       ├── MessageList.vue     # 消息列表
│       ├── MessageItem.vue     # 单条消息组件
│       ├── InputBox.vue        # 输入框
│       └── ThemeSwitcher.vue   # 主题切换器
├── services/
│   └── apiService.ts           # API调用服务层
├── stores/
│   └── chatStore.ts            # Pinia状态管理
├── styles/
│   ├── themes.ts               # 主题配置
│   └── global.css              # 全局样式
├── types/
│   └── chat.ts                 # TypeScript类型定义
├── App.vue                     # 根组件
└── main.ts                     # 应用入口
```

## 🎨 主题系统

### 当前可用主题

1. **深空黑** (dark) - 深蓝色主调，适合长时间使用
2. **亮白** (light) - 浅色主调，适合明亮环境
3. **霓虹绿** (neon) - 高对比度荧光绿，科技感十足
4. **深海蓝** (ocean) - 蓝色渐变，宁静舒适

### 自定义主题

在 `src/styles/themes.ts` 中添加新主题：

```typescript
export const themes: Record<ThemeType, ThemeConfig> = {
  // ... 现有主题
  custom: {
    name: 'custom',
    primary: '#你的颜色',
    secondary: '#你的颜色',
    // ... 其他颜色配置
  }
}
```

然后在 `src/types/chat.ts` 中更新ThemeType：

```typescript
export type ThemeType = 'dark' | 'light' | 'neon' | 'ocean' | 'custom'
```

## 🔄 API集成指南

### 非流式调用

```typescript
const response = await store.sendMessage("你的问题")
```

### 流式调用

```typescript
const response = await store.sendMessageStream("你的问题")
```

### 自定义API调用

```typescript
import apiService from '@/services/apiService'

// 更新API配置
apiService.updateConfig({
  baseUrl: 'http://your-api:port',
  model: 'your-model-name'
})

// 调用API
const result = await apiService.chat('prompt')
```

## 🎯 使用指南

### 基本操作

1. **发送消息** - 在输入框输入内容，按 `Enter` 或点击发送按钮
2. **换行** - 在输入框按 `Shift + Enter`
3. **复制回复** - 将鼠标悬停在AI消息上，点击复制按钮
4. **重新生成** - 点击AI消息上的刷新按钮
5. **切换主题** - 点击右上角调色板图标选择主题
6. **新建会话** - 点击右上角加号按钮
7. **删除会话** - 在侧边栏点击会话上的删除按钮
8. **清空会话** - 点击清空按钮清除所有消息

### 会话管理

- 所有会话自动保存到浏览器本地存储
- 支持多个并行会话
- 每个会话独立维护消息历史
- 关闭浏览器后会话和消息保持保存

## 🛠️ 开发说明

### 状态管理（Pinia）

```typescript
import { useChatStore } from '@/stores/chatStore'

const store = useChatStore()

// 发送消息
await store.sendMessage('你的问题')

// 创建新会话
store.createNewSession()

// 切换主题
store.setTheme('neon')
```

### 添加新功能

1. 在 `src/types/chat.ts` 中定义类型
2. 在 `src/stores/chatStore.ts` 中添加状态和方法
3. 创建相应的Vue组件
4. 在 `ChatWindow.vue` 中引入和使用

### 样式定义

使用CSS变量进行主题管理：

```css
/* 在你的组件中使用 */
.your-element {
  color: var(--color-text);
  background: var(--color-surface);
  border-color: var(--color-border);
  box-shadow: var(--shadow-md);
}
```

## 🐛 故障排除

### API连接失败

1. 确保Ollama服务正在运行
2. 检查API地址和端口是否正确
3. 检查浏览器控制台的错误信息
4. 尝试使用 `curl` 测试API连接

### 样式显示异常

1. 清除浏览器缓存
2. 检查CSS变量是否正确应用
3. 在开发者工具中检查计算样式

### 消息丢失

1. 检查浏览器是否启用了本地存储
2. 检查存储空间是否已满
3. 清除浏览器数据可能导致消息丢失

## 📝 文件大小

| 文件 | 大小 |
|-----|------|
| CSS | 3.55 kB (gzip) |
| JS | 48.92 kB (gzip) |
| HTML | 0.28 kB (gzip) |
| **总计** | **~52.75 kB (gzip)** |

## 🔐 注意事项

- 此应用只涉及前端，不存储任何个人数据在服务器
- 所有会话数据保存在浏览器本地存储中
- 清除浏览器数据会导致所有会话丢失
- 建议定期备份重要的对话记录

## 🤝 贡献

欢迎提交问题报告和功能建议！

## 📄 许可证

MIT License

## 🎓 学习资源

- [Vue 3 官方文档](https://vuejs.org/)
- [TypeScript 文档](https://www.typescriptlang.org/)
- [Pinia 文档](https://pinia.vuejs.org/)
- [Vite 文档](https://vitejs.dev/)
- [Ollama 文档](https://github.com/ollama/ollama)

## 💡 后续改进建议

- [ ] 导出对话记录为JSON/PDF
- [ ] 支持多种模型切换
- [ ] 添加消息搜索功能
- [ ] 支持图片上传和识别
- [ ] 添加用户偏好设置页面
- [ ] 支持快捷键定制
- [ ] 添加消息分类和标签
- [ ] 支持Markdown渲染
- [ ] 添加代码高亮
- [ ] 支持语音输入和输出

---

**开发者**: Copilot  
**最后更新**: 2026-08-06
