FROM node:26-alpine AS build

WORKDIR /app

# Install the full dependency set required to compile TypeScript.
COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

FROM node:26-alpine AS runtime

WORKDIR /app

# package.json is needed at runtime to read the server version.
COPY package*.json ./
RUN npm ci --omit=dev

# Copy the compiled application from the build stage. This makes `docker build`
# work from a clean Git checkout, where dist/ is intentionally not committed.
COPY --from=build /app/dist/ ./dist/

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 && \
    chown -R nextjs:nodejs /app

USER nextjs

# Set default command
CMD ["node", "dist/index.js"]
