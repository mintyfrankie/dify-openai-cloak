import request from 'supertest';
import * as yaml from 'js-yaml';
import * as fs from 'fs';
import express from 'express';
import { TranslationService } from './service';
import dotenv from 'dotenv';
import { createApp, loadConfig } from './app';

jest.mock('./service');
jest.mock('fs');
jest.mock('dotenv');

// Use a factory function for the yaml mock
jest.mock('js-yaml', () => {
  return {
    load: jest.fn(),
  };
});

// Import app after mocking dependencies
const mockConfig = {
  application_name: 'test-app',
  dify_api_endpoint: 'https://test-dify-api.com/v1',
  cors_origin: '*',
  models: {
    'model-1': 'test-api-key-1',
    'model-2': 'test-api-key-2',
  },
};

describe('POST /v1/chat/completions', () => {
  let app: express.Application;

  beforeEach(() => {
    (fs.readFileSync as jest.Mock).mockReturnValue('dummy content');
    (yaml.load as jest.Mock).mockReturnValue(mockConfig);
    app = createApp();
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

  it('should return a valid event stream when stream is true', async () => {
    const mockRequest = {
      model: 'model-1',
      messages: [
        {
          role: 'user',
          content: 'Who are you?',
        },
      ],
      stream: true,
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
            content: 'I am an AI assistant.',
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 9,
        completion_tokens: 6,
        total_tokens: 15,
      },
    };

    (TranslationService.prototype.request as jest.Mock).mockResolvedValue(mockResponse);

    const response = await request(app)
      .post('/v1/chat/completions')
      .send(mockRequest)
      .expect(200)
      .expect('Content-Type', /text\/event-stream/);

    const events = response.text.split('\n\n').filter(Boolean);

    // Check if we have the correct number of events (5 words + [DONE])
    expect(events).toHaveLength(6);

    // Check the content of each event
    const expectedWords = ['I', 'am', 'an', 'AI', 'assistant.'];
    events.slice(0, 5).forEach((event, index) => {
      const parsedEvent = JSON.parse(event.replace('data: ', ''));
      expect(parsedEvent.choices[0].delta.content).toContain(expectedWords[index]);
      expect(parsedEvent.id).toBe('chatcmpl-123');
      expect(parsedEvent.object).toBe('chat.completion.chunk');
      expect(parsedEvent.model).toBe('model-1');
    });

    // Check the [DONE] event
    expect(events[5]).toBe('data: [DONE]');

    // Update this expectation to not include the stream property
    expect(TranslationService.prototype.request).toHaveBeenCalledWith(
      {
        model: 'model-1',
        messages: [
          {
            role: 'user',
            content: 'Who are you?',
          },
        ],
      },
      'test-app',
    );
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

  it('should include CORS headers in the response', async () => {
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

    const response = await request(app)
      .post('/v1/chat/completions')
      .send(mockRequest)
      .expect(200)
      .expect('Access-Control-Allow-Origin', '*');

    expect(response.body).toEqual(mockResponse);
  });
});

describe('Config loading', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('should load config from YAML file when available', () => {
    (fs.readFileSync as jest.Mock).mockReturnValue('dummy content');
    (yaml.load as jest.Mock).mockReturnValue(mockConfig);

    const config = loadConfig();

    expect(config).toEqual(mockConfig);
    expect(yaml.load).toHaveBeenCalled();
    expect(dotenv.config).not.toHaveBeenCalled();
  });

  it('should fallback to environment variables when config file is not found', () => {
    (fs.readFileSync as jest.Mock).mockImplementation(() => {
      throw new Error('File not found');
    });
    process.env.APPLICATION_NAME = 'env-app';
    process.env.DIFY_API_ENDPOINT = 'https://env-dify-api.com/v1';
    process.env.DIFY_API_KEY = 'env-api-key';
    process.env.CORS_ORIGIN = 'http://localhost:3000';

    const config = loadConfig();

    expect(config).toEqual({
      application_name: 'env-app',
      dify_api_endpoint: 'https://env-dify-api.com/v1',
      cors_origin: 'http://localhost:3000',
      models: {
        'default-model': 'env-api-key',
      },
    });
    expect(yaml.load).not.toHaveBeenCalled();
    expect(dotenv.config).toHaveBeenCalled();
  });

  it('should use default values when neither config file nor environment variables are set', () => {
    (fs.readFileSync as jest.Mock).mockImplementation(() => {
      throw new Error('File not found');
    });
    delete process.env.APPLICATION_NAME;
    delete process.env.DIFY_API_ENDPOINT;
    delete process.env.DIFY_API_KEY;
    delete process.env.CORS_ORIGIN;

    const config = loadConfig();

    expect(config).toEqual({
      application_name: 'default-app',
      dify_api_endpoint: '',
      cors_origin: '*',
      models: {
        'default-model': '',
      },
    });
    expect(yaml.load).not.toHaveBeenCalled();
    expect(dotenv.config).toHaveBeenCalled();
  });
});
