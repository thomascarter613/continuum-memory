FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json ./package.json
COPY tsconfig.base.json ./tsconfig.base.json
COPY apps/api/package.json apps/api/package.json
COPY packages/domain/package.json packages/domain/package.json
COPY packages/sdk-js/package.json packages/sdk-js/package.json
RUN bun install || true

FROM oven/bun:1 AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./package.json
COPY tsconfig.base.json ./tsconfig.base.json
COPY apps/api ./apps/api
COPY packages ./packages
COPY infra/migrations ./infra/migrations
EXPOSE 3030
CMD ["bun", "--filter", "@continuum/api", "run", "dev"]
