import { describe, expect, it } from '@jest/globals';
import { app } from './app';
import request from 'supertest';
import { OpenAIApiRequest } from './interfaces';

describe('Express App', () => {
  it('should be an Express application', () => {
    expect(app).toHaveProperty('listen');
    expect(app).toHaveProperty('use');
    expect(app).toHaveProperty('get');
    expect(app).toHaveProperty('post');
  });

  describe('POST /v1/chat/completions', () => {
    it('should return a mock OpenAI response', async () => {
      const mockRequest: OpenAIApiRequest = {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Hello, AI!' }],
      };
      const response = await request(app).post('/v1/chat/completions').send(mockRequest);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('object', 'chat.completion');
      expect(response.body).toHaveProperty('created');
      expect(response.body).toHaveProperty('model');
      expect(response.body).toHaveProperty('usage');
      expect(response.body).toHaveProperty('choices');
      expect(response.body.choices).toBeInstanceOf(Array);
      expect(response.body.choices[0]).toHaveProperty('message');
      expect(response.body.choices[0].message).toHaveProperty('role', 'assistant');
      expect(response.body.choices[0].message).toHaveProperty('content');
    });
  });
});
