FROM node:20-alpine

RUN npm i -g pnpm

WORKDIR /app

# Copy root package files
COPY package*.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile

COPY dist/apps/ehr .

EXPOSE 3006
CMD ["node", "main.js"]