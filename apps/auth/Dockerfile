FROM node:20-alpine

RUN npm i -g pnpm

WORKDIR /app

# Copy root package files
COPY package*.json ./

# Install ALL production dependencies
COPY package*.json ./
# COPY pnpm-lock.yaml ./
RUN pnpm install --no-frozen-lockfile

COPY dist/apps/auth .

EXPOSE 3001
CMD ["node", "main.js"]