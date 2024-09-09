# dify-openai-cloak

![Meme](https://github.com/user-attachments/assets/ec8891b3-5495-4847-b060-ad121927d630)

dify-openai-cloak is a service that acts as a proxy between OpenAI-compatible clients and the [Dify](https://dify.ai) API. 

It translates [OpenAI API requests](https://platform.openai.com/docs/api-reference/introduction) to [Dify API requests](https://docs.dify.ai/guides/application-publishing/developing-with-apis), allowing you to use Dify's AI capabilities with OpenAI-compatible clients.

## Features

- Translates OpenAI API requests to Dify API requests
- Supports multiple models with separate API keys
- Docker support


## Installation


### Docker Installation (Recommended)

1. Pull the Docker image:
   ```
   docker pull ghcr.io/mintyfrankie/dify-openai-cloak:latest
   ```

2. Create a `config.yaml` file with your configuration (see Configuration section below).

3. Run the Docker container:
   ```
   docker run -d -p 3000:3000 -v /path/to/your/config.yaml:/app/config/config.yaml ghcr.io/yourusername/dify-openai-cloak:latest
   ```

   Replace `/path/to/your/config.yaml` with the actual path to your configuration file.

### Local Installation

1. Clone the repository:
   ```
   git clone https://github.com/mintyfrankie/dify-openai-cloak.git
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

4. Start the server:
   ```
   pnpm start
   ```


## Configuration

You can configure the application using either a `config.yaml` file or environment variables. The application will look for the config file in the following locations:

1. `/app/config/config.yaml` (for Docker deployments)
2. `./config.yaml` (in the project root)

If no config file is found, it will fall back to environment variables.

Reference to [config.example.yaml](./config.example.yaml) for more details.
