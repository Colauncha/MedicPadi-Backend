FROM node:20-alpine

RUN npm i -g pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile

COPY dist/apps/ai-agent .

EXPOSE 3007
CMD ["node", "main.js"]
