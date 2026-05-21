# syntax=docker/dockerfile:1.7
FROM node:20.19.3-alpine AS base
WORKDIR /app

FROM base AS build
RUN apk add --no-cache python3 make g++ pkgconfig
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/data/genealogy.db
RUN mkdir -p /data
COPY --from=build /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY server ./server
COPY public ./public
EXPOSE 3000
CMD ["node", "server/index.js"]
