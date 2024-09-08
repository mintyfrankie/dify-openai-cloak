export interface OpenAIApiRequest {
  model: string;
  messages: Array<{
    role: string;
    content: string;
  }>;
  // Add other fields as needed
}

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

export interface DifyApiRequest {
  query: string;
  inputs?: Record<string, any>;
  user: string;
  conversation_id?: string;
  response_mode: 'blocking';
}

export interface DifyApiResponse {
  answer: string;
  conversation_id: string;
  created_at: number;
  id: string;
  metadata: {
    usage: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
  };
}
