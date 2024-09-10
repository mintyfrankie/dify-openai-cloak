import axios from 'axios';
import {
  OpenAIApiRequest,
  OpenAIApiResponse,
  DifyApiRequest,
  DifyApiResponse,
  OpenAIStreamingResponse,
} from './interfaces';

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

  async requestStream(
    openAIRequest: OpenAIApiRequest,
    applicationName: string,
  ): Promise<OpenAIStreamingResponse[]> {
    const openAIResponse = await this.request(openAIRequest, applicationName);
    return this.simulateStreamingChunks(openAIResponse);
  }

  private translateToDifyRequest(
    openAIRequest: OpenAIApiRequest,
    applicationName: string,
  ): DifyApiRequest {
    const formattedMessages = openAIRequest.messages
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join('\n');
    const query = `Chat history:\n${formattedMessages}\n\nPlease respond to the last message.`;

    return {
      query: query,
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

  private simulateStreamingChunks(response: OpenAIApiResponse): OpenAIStreamingResponse[] {
    const content = response.choices[0].message.content;
    if (!content) return [];

    const words = content.split(' ');
    const chunks: OpenAIStreamingResponse[] = [];

    for (let i = 0; i < words.length; i++) {
      chunks.push({
        id: response.id,
        object: 'chat.completion.chunk',
        created: response.created,
        model: response.model,
        choices: [
          {
            index: 0,
            delta: {
              content: i === 0 ? words[i] : ' ' + words[i],
            },
            finish_reason: i === words.length - 1 ? 'stop' : null,
          },
        ],
      });
    }

    return chunks;
  }
}
