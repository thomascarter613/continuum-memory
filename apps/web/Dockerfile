FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json ./package.json
COPY apps/web/package.json apps/web/package.json
RUN bun install || true

FROM oven/bun:1 AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./package.json
COPY apps/web ./apps/web
EXPOSE 5173
CMD ["bun", "--filter", "@continuum/web", "run", "dev", "--host", "0.0.0.0"]
