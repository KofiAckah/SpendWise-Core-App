FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci && \
    npm cache clean --force

# Copy application code (node_modules excluded via .dockerignore)
COPY . .

# Build the application
RUN npm run build

# Production stage - use latest Alpine for security patches
FROM nginx:1.27-alpine

# Update Alpine packages to fix libcrypto3, libssl3, libpng, libxml2 vulnerabilities
RUN apk upgrade --no-cache libcrypto3 libssl3 libpng libxml2 && \
    apk upgrade --no-cache

# Copy built files to nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create a non-root user and set permissions
RUN addgroup -g 1001 -S nginx-app && \
    adduser -S nginx-app -u 1001 && \
    chown -R nginx-app:nginx-app /usr/share/nginx/html && \
    chown -R nginx-app:nginx-app /var/cache/nginx && \
    chown -R nginx-app:nginx-app /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R nginx-app:nginx-app /var/run/nginx.pid

# Switch to non-root user
USER nginx-app

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
