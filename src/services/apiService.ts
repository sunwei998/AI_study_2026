import axios from 'axios'
import type { AxiosInstance } from 'axios'
import type { ApiConfig } from '@/types/chat'

class APIService {
  private client: AxiosInstance
  private config: ApiConfig

  constructor(config: ApiConfig) {
    this.config = config
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: 120000
    })
  }

  /**
   * 调用模型API获取回复
   * @param prompt - 用户输入
   * @returns 模型回复文本
   */
  async chat(prompt: string): Promise<string> {
    try {
      const response = await this.client.post('/api/generate', {
        model: this.config.model,
        prompt: prompt,
        stream: false,
        temperature: this.config.temperature
      })

      // 根据具体API格式调整此处
      return response.data.response || response.data.text || ''
    } catch (error) {
      console.error('API调用失败:', error)
      throw new Error('无法获取AI回复，请检查API连接')
    }
  }

  /**
   * 流式调用（支持长回复逐字输出）
   * @param prompt - 用户输入
   * @param onChunk - 每个数据块的回调
   */
  async chatStream(
    prompt: string,
    onChunk: (chunk: string) => void
  ): Promise<void> {
    try {
      const response = await this.client.post(
        '/api/generate',
        {
          model: this.config.model,
          prompt: prompt,
          stream: true,
          temperature: this.config.temperature
        },
        {
          responseType: 'text'
        }
      )

      // 处理流式响应
      const lines = response.data.split('\n')
      for (const line of lines) {
        if (line.trim()) {
          try {
            const json = JSON.parse(line)
            if (json.response) {
              onChunk(json.response)
            }
          } catch (e) {
            // 忽略解析错误的行
          }
        }
      }
    } catch (error) {
      console.error('流式API调用失败:', error)
      throw new Error('流式获取回复失败')
    }
  }

  /**
   * 更新API配置
   */
  updateConfig(newConfig: Partial<ApiConfig>): void {
    this.config = { ...this.config, ...newConfig }
    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: 120000
    })
  }

  /**
   * 获取当前配置
   */
  getConfig(): ApiConfig {
    return { ...this.config }
  }
}

// 默认API配置（假URL）
const defaultConfig: ApiConfig = {
  baseUrl: 'http://localhost:11434',
  model: 'deepseek-r1:7b',
  temperature: 0.7,
  maxTokens: 2048
}

export default new APIService(defaultConfig)
