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

# Production stage
FROM node:22-alpine

WORKDIR /app

# Copy built dependencies and source
COPY --from=builder /app ./

# Expose API port
EXPOSE 5000

# Start the application
CMD ["npm", "start"]
