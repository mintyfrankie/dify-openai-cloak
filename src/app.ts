import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import yaml from 'js-yaml';
import fs from 'fs';
import cors from 'cors';
import { OpenAIApiRequest, OpenAIApiResponse, OpenAIStreamingResponse } from './interfaces';
import { TranslationService } from './service';
import http from 'http';

export interface Config {
  application_name: string;
  dify_api_endpoint: string;
  cors_origin: string;
  models: { [key: string]: string };
  ssl?: {
    skip_ssl_verification?: boolean;
  };
}

export function loadConfig(): Config {
  const configPaths = ['/app/config/config.yaml', './config.yaml'];

  for (const path of configPaths) {
    try {
      const config = yaml.load(fs.readFileSync(path, 'utf8')) as Config;

      // Add SSL verification skip if configured
      if (config.ssl && config.ssl.skip_ssl_verification) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        console.warn('SSL verification is disabled. This is not recommended for production use.');
      }

      console.log(`Config loaded from ${path}`);
      return config;
    } catch (error) {
      // If the file doesn't exist or is invalid, continue to the next path
      console.warn(`Failed to load config from ${path}`);
    }
  }

  // If no config file is found, fall back to environment variables
  console.warn('No valid config.yaml found. Falling back to environment variables.');
  dotenv.config();
  return {
    application_name: process.env.APPLICATION_NAME || 'default-app',
    dify_api_endpoint: process.env.DIFY_API_ENDPOINT || '',
    cors_origin: process.env.CORS_ORIGIN || '*',
    models: {
      'default-model': process.env.DIFY_API_KEY || '',
    },
  };
}

export function validateConfig(config: Config): void {
  if (!config.dify_api_endpoint) {
    throw new Error(
      'Dify API endpoint is not set. Please set it in config.yaml or DIFY_API_ENDPOINT environment variable.',
    );
  }

  if (Object.keys(config.models).length === 0) {
    throw new Error(
      'No models configured. Please set them in config.yaml or provide DIFY_API_KEY environment variable.',
    );
  }
}

export function createApp() {
  const config = loadConfig();
  validateConfig(config);

  const app = express();

  app.use(
    cors({
      origin: '*',
      methods: ['GET', 'POST'],
      allowedHeaders: '*',
    }),
  );

  app.use(express.json());

  // Create a TranslationService for each model
  const translationServices: { [key: string]: TranslationService } = {};
  for (const [model, apiKey] of Object.entries(config.models)) {
    translationServices[model] = new TranslationService(apiKey, config.dify_api_endpoint);
  }

  app.post('/v1/chat/completions', async (req: Request, res: Response) => {
    try {
      const openAIRequest: OpenAIApiRequest = req.body;
      const model = openAIRequest.model;
      const stream = openAIRequest.stream || false;

      if (!translationServices[model]) {
        return res.status(400).json({ error: `Unsupported model: ${model}` });
      }

      // Remove the stream property from the request
      const { stream: _, ...requestWithoutStream } = openAIRequest;

      if (stream) {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        });

        const openAIResponse: OpenAIApiResponse = await translationServices[model].request(
          requestWithoutStream,
          config.application_name,
        );

        // Simulate streaming by sending the response in chunks
        const chunks = simulateStreamingChunks(openAIResponse);
        for (const chunk of chunks) {
          res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        }

        res.write('data: [DONE]\n\n');
        res.end();
      } else {
        const openAIResponse: OpenAIApiResponse = await translationServices[model].request(
          requestWithoutStream,
          config.application_name,
        );
        res.json(openAIResponse);
      }
    } catch (error) {
      console.error('Error processing request:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return app;
}

function simulateStreamingChunks(response: OpenAIApiResponse): OpenAIStreamingResponse[] {
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

if (require.main === module) {
  const app = createApp();
  const port = 3000;
  const server = http.createServer(app);

  const gracefulShutdown = () => {
    console.log('Received kill signal, shutting down gracefully');
    server.close(() => {
      console.log('Closed out remaining connections');
      process.exit(0);
    });

    setTimeout(() => {
      console.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);

  server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}
