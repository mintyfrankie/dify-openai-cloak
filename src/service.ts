import axios from 'axios';
import { OpenAIApiRequest, OpenAIApiResponse, DifyApiRequest, DifyApiResponse } from './interfaces';

export class TranslationService {
  private difyApiKey: string;
  private difyApiEndpoint: string;

  constructor(difyApiKey: string, difyApiEndpoint: string) {
    this.difyApiKey = difyApiKey;
    this.difyApiEndpoint = difyApiEndpoint;
  }

  async request(
    openAIRequest: OpenAIApiRequest,
    applicationName: string,
  ): Promise<OpenAIApiResponse> {
    const difyRequest = this.translateToDifyRequest(openAIRequest, applicationName);
    const difyResponse = await this.callDifyApi(difyRequest);
    const openAIResponse = this.translateToOpenAIResponse(difyResponse, openAIRequest.model);
    return openAIResponse;
  }

  private translateToDifyRequest(
    openAIRequest: OpenAIApiRequest,
    applicationName: string,
  ): DifyApiRequest {
    const lastMessage = openAIRequest.messages[openAIRequest.messages.length - 1];
    return {
      query: lastMessage.content,
      inputs: {},
      user: applicationName,
      response_mode: 'blocking',
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

  private translateToOpenAIResponse(
    difyResponse: DifyApiResponse,
    model: string,
  ): OpenAIApiResponse {
    return {
      id: difyResponse.id,
      object: 'chat.completion',
      created: Math.floor(difyResponse.created_at / 1000),
      model: model,
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
