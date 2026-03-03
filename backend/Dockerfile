FROM node:20-alpine AS dependencies

WORKDIR /tmp/build

# Copy only package.json
COPY package.json ./

# Generate production-only lock file and install
RUN npm install --production --package-lock-only && \
    npm ci --production && \
    npm cache clean --force

# Production image
FROM node:20-alpine

WORKDIR /app

# Copy package.json
COPY package.json ./

# Copy production node_modules from build stage
COPY --from=dependencies /tmp/build/node_modules ./node_modules

# Copy application code  
COPY index.js init.sql ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 5000

CMD ["node", "index.js"]
