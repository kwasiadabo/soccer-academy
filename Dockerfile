# apps/web is its own standalone repo — build context is THIS directory:
#   cd apps/web && docker build -t soccer-academy-web .
# (docker-compose.yml already points its "web" service context here correctly.)
#
# The app calls the API via relative "/api/..." paths (baked in at build time, not
# runtime); nginx.conf.template's reverse proxy is what actually wires this image to
# a backend at runtime. Where that backend lives is set via API_UPSTREAM below —
# defaults to the compose-internal "api" service (see ../../docker-compose.yml);
# override it (`docker run -e API_UPSTREAM=https://api.example.com ...`, or the
# equivalent in your deploy platform) when the API is its own separately-deployed
# service instead of a docker-compose sibling.

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runtime
ENV API_UPSTREAM=https://api.sams.variablexsolutions.com 
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:80/ >/dev/null || exit 1
CMD ["nginx", "-g", "daemon off;"]
