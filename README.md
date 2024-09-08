# dify-openai-cloak

dify-openai-cloak is a TypeScript-based Express application that acts as a proxy between OpenAI-compatible clients and the Dify API. It translates OpenAI API requests to Dify API requests, allowing you to use Dify's AI capabilities with OpenAI-compatible clients.

## Features

- Translates OpenAI API requests to Dify API requests
- Supports multiple models with separate API keys
- Implements streaming responses
- Configurable via YAML file or environment variables
- CORS support
- Docker support

## Prerequisites

- Node.js (v14 or later)
- pnpm

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/dify-openai-cloak.git
   cd dify-openai-cloak
   ```

2. Install dependencies:
   ```
   pnpm install
   ```

3. Copy the example configuration file and edit it with your settings:
   ```
   cp config.example.yaml config.yaml
   ```

## Configuration

You can configure the application using either a `config.yaml` file or environment variables. The application will look for the config file in the following locations:

1. `/app/config/config.yaml` (for Docker deployments)
2. `./config.yaml` (in the project root)

If no config file is found, it will fall back to environment variables.

### Config File Structure
