# Single-stage Node image — backend is small, no build step needed.
FROM node:20-alpine

WORKDIR /app

# Install dependencies first for better layer caching.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy the rest of the source.
COPY src ./src

# Both Fly.io and Cloud Run inject PORT; the server already honours it.
ENV NODE_ENV=production
EXPOSE 8080

# The uploads/ directory is created at runtime by multer if needed.
CMD ["node", "src/server.js"]
