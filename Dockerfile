# apps/web is its own standalone repo — build context is THIS directory:
#   cd apps/web && docker build -t soccer-academy-web .
# (docker-compose.yml already points its "web" service context here correctly.)
#
# The app calls the API via relative "/api/..." paths (baked in at build time, not
# runtime), so nginx.conf's reverse proxy to a compose service named "api" is what
# actually wires this image to a backend — see ../../docker-compose.yml.

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:80/ >/dev/null || exit 1
CMD ["nginx", "-g", "daemon off;"]
