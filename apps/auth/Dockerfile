FROM node:20-alpine

RUN npm i -g pnpm

WORKDIR /app

# We assume you ran 'nx build gateway' locally first
COPY package*.json ./
COPY pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY dist/apps/auth .

EXPOSE 3001
CMD ["node", "main.js"]