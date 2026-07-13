FROM node:20-bookworm-slim

# Install Chromium from Debian's own repo instead of listing individual
# libX* shared-library packages by hand — apt resolves every correct
# transitive dependency automatically, avoiding version-name drift across
# Debian releases (e.g. libxfixes1 vs libxfixes3 between releases).
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium ca-certificates fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
# Use the system Chromium installed above instead of downloading Puppeteer's
# own copy — faster build, and sidesteps the same dependency fragility.
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
EXPOSE 8080

CMD ["node", "server.js"]
