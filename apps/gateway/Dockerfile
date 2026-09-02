FROM node:20-alpine

RUN npm i -g pnpm

WORKDIR /app

# Install ALL production dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile

COPY dist/apps/gateway .

EXPOSE 3000
CMD ["node", "main.js"]