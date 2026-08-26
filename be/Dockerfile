# Stage 1: Build ứng dụng
FROM node:20-alpine AS builder

WORKDIR /usr/src/app
ENV HUSKY=0

# Copy file cấu hình dependencies trước để tận dụng cache Docker
COPY package*.json ./

# Install dependencies (bao gồm cả devDependencies để build)
RUN npm install

# Copy toàn bộ source code
COPY . .

# Build ứng dụng
RUN npm run build

# Stage 2: Production image
FROM node:20-alpine

WORKDIR /usr/src/app

# Chỉ copy package.json để cài production dependencies
COPY package*.json ./

# Install chỉ production dependencies
RUN npm install

# Copy kết quả build từ stage builder
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/public ./public

# Thiết lập môi trường
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Chạy ứng dụng
CMD ["node", "dist/src/main.js"]