FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build-time environment variables for Vite SPA/SSR
ARG VITE_API_BASE
ARG VITE_API_PREFIX=/api/v1
ARG VITE_SEPAY_BANK
ARG VITE_SEPAY_ACCOUNT
ARG VITE_SEPAY_ACCOUNT_NAME

ENV VITE_API_BASE=$VITE_API_BASE
ENV VITE_API_PREFIX=$VITE_API_PREFIX
ENV VITE_SEPAY_BANK=$VITE_SEPAY_BANK
ENV VITE_SEPAY_ACCOUNT=$VITE_SEPAY_ACCOUNT
ENV VITE_SEPAY_ACCOUNT_NAME=$VITE_SEPAY_ACCOUNT_NAME

RUN npm run build

# Runner stage
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/robots.txt || exit 1

CMD ["npm", "run", "start"]
