# Verse web client: build the bundle, serve it with nginx (non-root, port 8020).
#   docker build -t verse/frontend client
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run webpack

FROM nginxinc/nginx-unprivileged:1.29-alpine
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/build/webpack /usr/share/nginx/html
ENV VERSE_SERVER_URL=http://server:8080
EXPOSE 8020
