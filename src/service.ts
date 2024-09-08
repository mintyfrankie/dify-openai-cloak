import axios from 'axios';
import { OpenAIApiRequest, OpenAIApiResponse, DifyApiRequest, DifyApiResponse } from './interfaces';

// Note that this implementation makes some assumptions and simplifications:
// It only uses the last message from the OpenAI request as the query for Dify.
// It doesn't handle all possible fields from the OpenAI request (like temperature, max_tokens, etc.).
// It uses a placeholder 'dify-model' as the model name in the OpenAI response.
// It doesn't handle function calls, which are present in the OpenAI interface but not in the Dify interface.

export class TranslationService {
  private difyApiKey: string;
  private difyApiEndpoint: string;

  constructor(difyApiKey: string, difyApiEndpoint: string) {
    this.difyApiKey = difyApiKey;
    this.difyApiEndpoint = difyApiEndpoint;
  }

  async request(openAIRequest: OpenAIApiRequest): Promise<OpenAIApiResponse> {
    const difyRequest = this.translateToDifyRequest(openAIRequest);
    const difyResponse = await this.callDifyApi(difyRequest);
    const openAIResponse = this.translateToOpenAIResponse(difyResponse);
    return openAIResponse;
  }

  private translateToDifyRequest(openAIRequest: OpenAIApiRequest): DifyApiRequest {
    const lastMessage = openAIRequest.messages[openAIRequest.messages.length - 1];
    return {
      query: lastMessage.content,
      inputs: {},
      user: 'user', // You might want to generate a unique user ID
      response_mode: 'blocking',
      // You can add more fields here if needed
    };
  }

  private async callDifyApi(difyRequest: DifyApiRequest): Promise<DifyApiResponse> {
    try {
      const chatEndpoint = `${this.difyApiEndpoint}/chat-messages`;
      const response = await axios.post(chatEndpoint, difyRequest, {
        headers: {
          Authorization: `Bearer ${this.difyApiKey}`,
          'Content-Type': 'application/json',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error calling Dify API:', error);
      throw error;
    }
  }

  private translateToOpenAIResponse(difyResponse: DifyApiResponse): OpenAIApiResponse {
    return {
      id: difyResponse.id,
      object: 'chat.completion',
      created: Math.floor(difyResponse.created_at / 1000), // Convert to seconds TODO: Check if this is correct
      model: 'dify-model', // You might want to use a specific model name
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: difyResponse.answer,
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: difyResponse.metadata.usage.prompt_tokens,
        completion_tokens: difyResponse.metadata.usage.completion_tokens,
        total_tokens: difyResponse.metadata.usage.total_tokens,
      },
    };
  }
}
