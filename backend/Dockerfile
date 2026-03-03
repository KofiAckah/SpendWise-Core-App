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

# Remove npm and yarn from production image (not needed at runtime, contains vulnerabilities)
RUN rm -rf /usr/local/lib/node_modules/npm \
           /usr/local/lib/node_modules/yarn \
           /usr/local/bin/npm \
           /usr/local/bin/npx \
           /usr/local/bin/yarn

# Copy production node_modules from build stage (no package.json to avoid Trivy false positives)
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
