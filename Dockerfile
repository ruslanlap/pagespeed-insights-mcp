FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files (package.json is also needed at runtime to read version)
COPY package*.json ./

# Install production dependencies
RUN npm ci --omit=dev

# Copy built application
COPY dist/ ./dist/

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Change ownership of the app directory
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port (if needed for health checks)
EXPOSE 3000

# Set default command
CMD ["node", "dist/index.js"]