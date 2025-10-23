import { ModelConfig } from './types';

/**
 * 静态模型配置定义
 * 这些配置在所有环境中都是相同的
 */
export function createStaticModels(envVars: {
  OPENAI_API_KEY: string;
  GEMINI_API_KEY: string;
  DEEPSEEK_API_KEY: string;
  SILICONFLOW_API_KEY: string;
  ZHIPU_API_KEY: string;
  CUSTOM_API_KEY: string;
  CUSTOM_API_BASE_URL: string;
  CUSTOM_API_MODEL: string;
  // Enterprise/private deployment (optional overrides)
  HTSC_API_BASE_URL?: string;
  HTSC_API_MODEL?: string;
  HTSC_API_KEY?: string;
  HTSC_ENABLED?: boolean | string;
}): Record<string, ModelConfig> {
  return {
    // saasDeepseekv3: {
    //   name: 'ht::saas-deepseek-v3',
    //   baseURL:  'http://168.63.65.40:8090/llm-service/v1/chat/completions',
    //   models: ['saas-deepseek-v3','saas-deepseek-r1'],
    //   defaultModel: 'saas-deepseek-v3',
    //   apiKey: envVars.HTSC_API_KEY,
    //   enabled: true,
    //   provider: 'ht',
    //   llmParams: {}
    // },
    htsc:{
      name: 'htsc',
      baseURL:  'http://webassist.saassit.htsc.com.cn/llmproxy/web/unauth/LLM_api_proxy/v1/chat/completions',
      models: [
        'ht::saas-deepseek-v3',
        'ht::saas-deepseek-r1',
        'ht::saas-deepseek-r1-thinking',
        'ht::saas-doubao-15-pro-32k',
        'ht::qwen-25-14b-int4',
        'ht::qwen-25-14b-int4-noft',
        'ht::local-qwq-32b',
        'ht::local-qwen-25-vl-7b',
        'ht::saas-doubao-1.5-vl-pro-32k'
      ],
      defaultModel: 'ht::saas-deepseek-v3',
      enabled: true,
      provider: 'ht',
      llmParams: {}
    },
    openai: {
      name: 'OpenAI',
      baseURL: 'https://api.openai.com/v1',
      models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4', 'gpt-3.5-turbo', 'o1', 'o1-mini', 'o1-preview', 'o3', 'o4-mini'],
      defaultModel: 'gpt-4o-mini',
      apiKey: envVars.OPENAI_API_KEY,
      enabled: !!envVars.OPENAI_API_KEY,
      provider: 'openai',
      llmParams: {}
    },
    gemini: {
      name: 'Gemini',
      baseURL: 'https://generativelanguage.googleapis.com',
      models: ['gemini-2.0-flash'],
      defaultModel: 'gemini-2.0-flash',
      apiKey: envVars.GEMINI_API_KEY,
      enabled: !!envVars.GEMINI_API_KEY,
      provider: 'gemini',
      llmParams: {}
    },
    deepseek: {
      name: 'DeepSeek',
      baseURL: 'https://api.deepseek.com/v1',
      models: ['deepseek-chat', 'deepseek-reasoner'],
      defaultModel: 'deepseek-chat',
      apiKey: envVars.DEEPSEEK_API_KEY,
      enabled: !!envVars.DEEPSEEK_API_KEY,
      provider: 'deepseek',
      llmParams: {}
    },
    siliconflow: {
      name: 'SiliconFlow',
      baseURL: 'https://api.siliconflow.cn/v1',
      models: ['Qwen/Qwen3-8B'],
      defaultModel: 'Qwen/Qwen3-8B',
      apiKey: envVars.SILICONFLOW_API_KEY,
      enabled: !!envVars.SILICONFLOW_API_KEY,
      provider: 'siliconflow',
      llmParams: {}
    },
    zhipu: {
      name: 'Zhipu',
      baseURL: 'https://open.bigmodel.cn/api/paas/v4',
      models: ['glm-4-plus', 'glm-4-0520', 'glm-4', 'glm-4-air', 'glm-4-airx', 'glm-4-flash'],
      defaultModel: 'glm-4-flash',
      apiKey: envVars.ZHIPU_API_KEY,
      enabled: !!envVars.ZHIPU_API_KEY,
      provider: 'zhipu',
      llmParams: {}
    },
    custom: {
      name: 'Custom',
      baseURL: envVars.CUSTOM_API_BASE_URL || 'http://localhost:11434/v1',
      models: [envVars.CUSTOM_API_MODEL || 'custom-model'],
      defaultModel: envVars.CUSTOM_API_MODEL || 'custom-model',
      apiKey: envVars.CUSTOM_API_KEY,
      enabled: !!envVars.CUSTOM_API_KEY,
      provider: 'custom',
      llmParams: {}
    },
  };
}
