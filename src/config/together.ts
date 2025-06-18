// Together.ai API Configuration

export const TOGETHER_CONFIG = {
  apiKey: import.meta.env.VITE_TOGETHER_API_KEY,
  baseURL: 'https://api.together.xyz/v1/chat/completions',
  model: import.meta.env.VITE_TOGETHER_MODEL || 'meta-llama/Llama-3-70b-chat-hf',
  maxTokens: parseInt(import.meta.env.VITE_TOGETHER_MAX_TOKENS || '1000'),
  temperature: parseFloat(import.meta.env.VITE_TOGETHER_TEMPERATURE || '0.7'),
  headers: {
    'Authorization': `Bearer ${import.meta.env.VITE_TOGETHER_API_KEY}`,
    'Content-Type': 'application/json'
  }
};

// Available Together.ai models
export const AVAILABLE_MODELS = {
  'meta-llama/Llama-3-70b-chat-hf': 'Llama 3 70B Chat',
  'meta-llama/Llama-3-8b-chat-hf': 'Llama 3 8B Chat',
  'mistralai/Mixtral-8x7B-Instruct-v0.1': 'Mixtral 8x7B Instruct',
  'mistralai/Mistral-7B-Instruct-v0.1': 'Mistral 7B Instruct',
  'NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO': 'Nous Hermes 2 Mixtral 8x7B',
  'teknium/OpenHermes-2.5-Mistral-7B': 'OpenHermes 2.5 Mistral 7B',
  'togethercomputer/RedPajama-INCITE-Chat-3B-v1': 'RedPajama INCITE Chat 3B',
  'togethercomputer/RedPajama-INCITE-7B-Chat': 'RedPajama INCITE 7B Chat',
};

export default TOGETHER_CONFIG;