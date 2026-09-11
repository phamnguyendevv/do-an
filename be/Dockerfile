
FROM node:22-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./


RUN npm ci

COPY . .


RUN npm run build
FROM node:22-alpine

WORKDIR /usr/src/app


COPY package*.json ./


RUN npm ci --omit=dev


COPY --from=builder /usr/src/app/dist ./dist



ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000


HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1


CMD ["node", "dist/src/main.js"]