FROM node:22-alpine

WORKDIR /app/mastra

COPY mastra/package.json mastra/package-lock.json ./
RUN npm ci

COPY mastra/ .

EXPOSE 4111

CMD ["npm", "run", "dev"]
