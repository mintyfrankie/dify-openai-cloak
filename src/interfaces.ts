// OpenAI API Request Interface
export interface OpenAIApiRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  n?: number;
  stop?: string | string[];
  functions?: Array<{
    name: string;
    description?: string;
    parameters: {
      type: 'object';
      properties: {
        [key: string]: {
          type: string;
          description?: string;
          enum?: string[];
        };
      };
      required?: string[];
    };
  }>;
  function_call?: 'auto' | 'none' | { name: string };
}

// OpenAI API Response Interface
export interface OpenAIApiResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: 'assistant';
      content: string | null;
      function_call?: {
        name: string;
        arguments: string;
      };
    };
    finish_reason: 'stop' | 'length' | 'function_call';
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
