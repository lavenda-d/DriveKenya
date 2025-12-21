# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm install

# Copy source code
COPY . .

# Build the application
# We use --frozen-lockfile if using yarn/pnpm, but npm install is fine here
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy custom nginx config if we had one, otherwise default
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose frontend port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
