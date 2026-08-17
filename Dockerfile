FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

RUN mkdir -p /app/data /app/uploads

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Roda o seed (idempotente) e sobe o servidor
CMD ["sh", "-c", "node seed/seed.js && node server.js"]
