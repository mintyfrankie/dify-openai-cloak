import request from 'supertest';
import { app } from './app';
import { TranslationService } from './service';

jest.mock('./service');

describe('POST /v1/chat/completions', () => {
  it('should return a valid OpenAI API response', async () => {
    const mockRequest = {
      model: 'model-1',
      messages: [
        {
          role: 'user',
          content: 'Who are you?',
        },
      ],
      streaming: false,
    };

    const mockResponse = {
      id: 'chatcmpl-123',
      object: 'chat.completion',
      created: 1677652288,
      model: 'model-1',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: 'I am an AI assistant created by OpenAI.',
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 9,
        completion_tokens: 12,
        total_tokens: 21,
      },
    };

    (TranslationService.prototype.request as jest.Mock).mockResolvedValue(mockResponse);

    const response = await request(app).post('/v1/chat/completions').send(mockRequest).expect(200);

    expect(response.body).toEqual(mockResponse);
    expect(TranslationService.prototype.request).toHaveBeenCalledWith(mockRequest);
  });

  it('should return 500 when an error occurs', async () => {
    const mockRequest = {
      model: 'model-1',
      messages: [
        {
          role: 'user',
          content: 'Who are you?',
        },
      ],
      streaming: false,
    };

    (TranslationService.prototype.request as jest.Mock).mockRejectedValue(new Error('Test error'));

    const response = await request(app).post('/v1/chat/completions').send(mockRequest).expect(500);

    expect(response.body).toEqual({ error: 'Internal server error' });
  });
});
