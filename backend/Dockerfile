FROM node:20-alpine AS base

WORKDIR /usr/src/app

RUN addgroup -S nodegroup && adduser -S nodeuser -G nodegroup

COPY package*.json ./

FROM base AS deps

RUN npm ci --only=production

FROM base AS final

ENV NODE_ENV=production

COPY --from=deps /usr/src/app/node_modules ./node_modules

COPY . .

RUN mkdir -p uploads && chmod 777 uploads && chown -R nodeuser:nodegroup /usr/src/app

USER nodeuser

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --retries=5 CMD wget -qO- http://127.0.0.1:5000/health || exit 1

CMD ["node", "index.js"]

