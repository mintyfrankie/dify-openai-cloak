FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm
COPY package.json package-lock.json ./
RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm run build

RUN mkdir -p /app/config
ENV CONFIG_PATH=/app/config/config.yaml

EXPOSE 3000

CMD ["node", "dist/app.js"]