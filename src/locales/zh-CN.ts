export default {
  app: {
    name: 'AI Chat'
  },
  common: {
    send: '发送',
    clear: '清空',
    stop: '停止生成',
    copy: '复制',
    copied: '已复制',
    regenerate: '重新生成',
    delete: '删除',
    newSession: '新建会话',
    clearSession: '清空当前会话',
    switchTheme: '切换主题',
    switchModel: '切换模型',
    collapseSessions: '收起会话列表',
    expandSessions: '展开会话列表',
    backToTop: '回到顶部',
    close: '关闭',
    errorOccurred: '发生错误'
  },
  input: {
    placeholder: '输入您的问题... (按 Enter 发送)',
    tip: '按 Enter 发送，Shift+Enter 换行',
    attachImage: '添加图片'
  },
  chat: {
    title: '会话历史',
    messageCount: '{count} 条消息',
    confirmClear: '确定要清空当前会话的所有消息吗？此操作无法撤销。',
    emptyTitle: '开始对话',
    emptyDesc: '与AI助手开始一场令人兴奋的交流吧',
    suggestions: ['请解释一下量子计算', '如何学习编程？', '写一个Python函数', '讲一个有趣的笑话'],
    you: '你',
    assistant: 'AI助手',
    thinking: '正在思考中...',
    sessionTitle: '聊天 {time}',
    error: '❌ 错误: {msg}',
    imageTooLarge: '图片超过 {size}MB 上限，已跳过',
    maxImages: '最多支持 {count} 张图片'
  },
  model: {
    select: '选择模型',
    count: '{count} 个'
  },
  theme: {
    dark: '深空黑',
    light: '亮白',
    neon: '霓虹绿',
    ocean: '深海蓝',
    midnight: '午夜紫',
    amber: '琥珀橙',
    rose: '绯红玫瑰',
    forest: '极光森林'
  },
  api: {
    noKey: '未配置 API Key，请在 .env.local 中设置 VITE_LLM_API_KEY',
    requestFailed: '请求失败 ({status})',
    failed: '无法获取AI回复，请检查API连接',
    noStream: '响应不支持流式读取',
    streamFailed: '流式获取回复失败'
  }
}