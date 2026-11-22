# Obraz produkcyjny (Next.js standalone). Budowa: docker build -t rodzicownik .
FROM node:24-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM node:24-alpine AS build
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

FROM node:24-alpine AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S app && adduser -S app -G app
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
# Korpus asystenta i prywatne sprawy ZUS montuje się jako wolumeny: /app/data/corpus, /app/private-cases
RUN mkdir -p /app/data && chown -R app:app /app/data
USER app
EXPOSE 3000
CMD ["node", "server.js"]
