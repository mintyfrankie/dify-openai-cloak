import request from 'supertest';
import * as yaml from 'js-yaml';
import * as fs from 'fs';
import { TranslationService } from './service';

jest.mock('./service');
jest.mock('js-yaml');
jest.mock('fs');

// Mock the config before importing the app
const mockConfig = {
  application_name: 'test-app',
  dify_api_endpoint: 'https://test-dify-api.com/v1',
  models: {
    'model-1': 'test-api-key-1',
    'model-2': 'test-api-key-2',
  },
};

jest.mock('js-yaml', () => ({
  load: jest.fn().mockReturnValue(mockConfig),
}));

// Import app after mocking the config
import { app } from './app';

describe('POST /v1/chat/completions', () => {
  beforeEach(() => {
    (fs.readFileSync as jest.Mock).mockReturnValue('dummy content');
  });

  it('should return a valid OpenAI API response', async () => {
    const mockRequest = {
      model: 'model-1',
      messages: [
        {
          role: 'user',
          content: 'Who are you?',
        },
      ],
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
    expect(TranslationService.prototype.request).toHaveBeenCalledWith(mockRequest, 'test-app');
  });

  it('should return 400 for unsupported model', async () => {
    const mockRequest = {
      model: 'unsupported-model',
      messages: [
        {
          role: 'user',
          content: 'Who are you?',
        },
      ],
    };

    const response = await request(app).post('/v1/chat/completions').send(mockRequest).expect(400);

    expect(response.body).toEqual({ error: 'Unsupported model: unsupported-model' });
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
    };

    (TranslationService.prototype.request as jest.Mock).mockRejectedValue(new Error('Test error'));

    const response = await request(app).post('/v1/chat/completions').send(mockRequest).expect(500);

    expect(response.body).toEqual({ error: 'Internal server error' });
  });
});
