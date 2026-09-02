FROM node:20-alpine

RUN npm i -g pnpm

WORKDIR /app

# Copy root package files
COPY package*.json ./

# Install ALL production dependencies
COPY package*.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile

COPY dist/apps/transactions .

EXPOSE 3008
CMD ["node", "main.js"]