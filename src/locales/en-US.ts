export default {
  app: {
    name: 'AI Chat'
  },
  common: {
    send: 'Send',
    clear: 'Clear',
    stop: 'Stop',
    copy: 'Copy',
    copied: 'Copied',
    regenerate: 'Regenerate',
    delete: 'Delete',
    pin: 'Pin',
    unpin: 'Unpin',
    newSession: 'New chat',
    clearSession: 'Clear current chat',
    switchTheme: 'Switch theme',
    switchModel: 'Switch model',
    collapseSessions: 'Collapse session list',
    expandSessions: 'Expand session list',
    backToTop: 'Back to top',
    close: 'Close',
    errorOccurred: 'An error occurred'
  },
  input: {
    placeholder: 'Type your question... (Enter to send)',
    tip: 'Enter to send, Shift+Enter for newline',
    attachImage: 'Attach image'
  },
  chat: {
    title: 'Chat history',
    filterPlaceholder: 'Search session titles...',
    filterSearch: 'Search',
    filterEmpty: 'No matching sessions',
    messageCount: '{count} messages',
    emptyTitle: 'Start a conversation',
    emptyDesc: 'Start an exciting conversation with the AI assistant',
    suggestions: [
      'Explain quantum computing',
      'How do I learn programming?',
      'Write a Python function',
      'Tell me a funny joke'
    ],
    you: 'You',
    assistant: 'AI Assistant',
    thinking: 'Thinking...',
    sessionTitle: 'Chat {time}',
    error: '❌ Error: {msg}',
    imageTooLarge: 'Image exceeds the {size}MB limit, skipped',
    maxImages: 'Up to {count} images allowed'
  },
  model: {
    select: 'Select model',
    count: '{count} models'
  },
  theme: {
    dark: 'Deep Space Black',
    light: 'Bright White',
    neon: 'Neon Green',
    ocean: 'Ocean Blue',
    midnight: 'Midnight Violet',
    amber: 'Amber Orange',
    mint: 'Mint Green',
    sand: 'Warm Sand'
  },
  api: {
    noKey: 'No API key configured. Set VITE_LLM_API_KEY in .env.local',
    requestFailed: 'Request failed ({status})',
    failed: 'Unable to get AI reply, please check the API connection',
    noStream: 'Response does not support streaming',
    streamFailed: 'Failed to get streaming reply'
  },
  confirm: {
    confirm: 'Delete',
    cancel: 'Cancel',
    deleteSessionTitle: 'Delete Session',
    deleteSessionMessage: 'Delete this session? All messages will be permanently removed. This cannot be undone.',
    clearTitle: 'Clear Current Chat',
    clearMessage: 'Clear all messages in this chat? This cannot be undone.'
  }
}