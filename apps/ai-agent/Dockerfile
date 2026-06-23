FROM node:20-alpine

RUN npm i -g pnpm

WORKDIR /app

COPY package*.json ./

RUN pnpm install --no-frozen-lockfile

COPY dist/apps/ai-agent .

EXPOSE 3007
CMD ["node", "main.js"]
