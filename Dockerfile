# Stage 1: Dependency installer and builder
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies first for caching layers
COPY package*.json ./
RUN npm ci

# Copy source and build the application
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 2: Production runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

# Copy only production dependencies and build artifacts
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/context ./context
COPY --from=builder /app/app ./app

EXPOSE 3000

CMD ["npm", "run", "start"]
