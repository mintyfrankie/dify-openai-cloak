import request from 'supertest';
import * as yaml from 'js-yaml';
import * as fs from 'fs';
import express from 'express';
import { TranslationService } from './service';
import dotenv from 'dotenv';
import { createApp, loadConfig } from './app';
import { OpenAIApiResponse, OpenAIStreamingResponse } from './interfaces';

jest.mock('./service', () => ({
  TranslationService: jest.fn().mockImplementation(() => ({
    difyApiKey: 'mock-api-key',
    difyApiEndpoint: 'mock-endpoint',
    request: jest.fn(),
    requestStream: jest.fn(),
    translateToDifyRequest: jest.fn(),
    callDifyApi: jest.fn(),
    translateToOpenAIResponse: jest.fn(),
    simulateStreamingChunks: jest.fn(),
  })),
}));

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
  let mockTranslationService: jest.Mocked<TranslationService>;

  beforeEach(() => {
    (fs.readFileSync as jest.Mock).mockReturnValue('dummy content');
    (yaml.load as jest.Mock).mockReturnValue(mockConfig);

    // Create a mock instance of TranslationService
    mockTranslationService = {
      difyApiKey: 'mock-api-key',
      difyApiEndpoint: 'mock-endpoint',
      request: jest.fn(),
      requestStream: jest.fn(),
      translateToDifyRequest: jest.fn(),
      callDifyApi: jest.fn(),
      translateToOpenAIResponse: jest.fn(),
      simulateStreamingChunks: jest.fn(),
    } as unknown as jest.Mocked<TranslationService>;

    // Use a factory function to return the mock instance
    const mockFactory = jest.fn().mockReturnValue(mockTranslationService);

    app = createApp(mockFactory);
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

    const mockResponse: OpenAIApiResponse = {
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

    mockTranslationService.request.mockResolvedValue(mockResponse);

    const response = await request(app).post('/v1/chat/completions').send(mockRequest).expect(200);

    expect(response.body).toEqual(mockResponse);
    expect(mockTranslationService.request).toHaveBeenCalledWith(mockRequest, 'test-app');
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

    const mockStreamResponse: OpenAIStreamingResponse[] = [
      {
        id: 'chatcmpl-123',
        object: 'chat.completion.chunk',
        created: 1677652288,
        model: 'model-1',
        choices: [
          {
            index: 0,
            delta: {
              content: 'I',
            },
            finish_reason: null,
          },
        ],
      },
      // ... more chunks ...
      {
        id: 'chatcmpl-123',
        object: 'chat.completion.chunk',
        created: 1677652288,
        model: 'model-1',
        choices: [
          {
            index: 0,
            delta: {
              content: 'assistant.',
            },
            finish_reason: 'stop',
          },
        ],
      },
    ];

    mockTranslationService.requestStream.mockResolvedValue(mockStreamResponse);

    const response = await request(app)
      .post('/v1/chat/completions')
      .send(mockRequest)
      .expect(200)
      .expect('Content-Type', /text\/event-stream/);

    const events = response.text.split('\n\n').filter(Boolean);

    // Check if we have the correct number of events (number of chunks + [DONE])
    expect(events).toHaveLength(mockStreamResponse.length + 1);

    // Check the content of each event
    events.slice(0, -1).forEach((event, index) => {
      const parsedEvent = JSON.parse(event.replace('data: ', ''));
      expect(parsedEvent).toEqual(mockStreamResponse[index]);
    });

    // Check the [DONE] event
    expect(events[events.length - 1]).toBe('data: [DONE]');

    // Update this expectation to use requestStream and not include the stream property
    expect(mockTranslationService.requestStream).toHaveBeenCalledWith(
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

    mockTranslationService.request.mockRejectedValue(new Error('Test error'));

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

    const mockResponse: OpenAIApiResponse = {
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

    mockTranslationService.request.mockResolvedValue(mockResponse);

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
