# Stage 1: Dependencies
FROM registry.access.redhat.com/ubi9/nodejs-20:latest AS deps
USER 0
RUN npm install -g pnpm
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Stage 2: Build
FROM registry.access.redhat.com/ubi9/nodejs-20:latest AS builder
USER 0
RUN npm install -g pnpm
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# Stage 3: Production
FROM registry.access.redhat.com/ubi9/nodejs-20-minimal:latest AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Copy built assets
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Run as default non-root user (1001)
USER 1001

EXPOSE 3000

CMD ["node", "server.js"]
