FROM node:20-alpine

RUN npm i -g pnpm

WORKDIR /app

# Copy root package files
COPY package.json pnpm-lock.yaml ./

# Install ALL production dependencies
RUN pnpm install --frozen-lockfile

COPY dist/apps/notification .

EXPOSE 3003
CMD ["node", "main.js"]