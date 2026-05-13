FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY next.config.mjs tsconfig.json postcss.config.mjs ./
COPY app/ app/
COPY components/ components/
COPY lib/ lib/
COPY hooks/ hooks/

EXPOSE 3000

CMD ["npm", "run", "dev"]
