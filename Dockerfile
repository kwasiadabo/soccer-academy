# Build context must be the monorepo root, since this workspace depends on
# @soccer-academy/shared-types via npm workspaces:
#   docker build -f apps/web/Dockerfile -t soccer-academy-web .
#
# The app calls the API via relative "/api/..." paths (baked in at build time, not
# runtime), so nginx.conf's reverse proxy to a compose service named "api" is what
# actually wires this image to a backend — see docker-compose.yml.

FROM node:20-alpine AS deps
WORKDIR /repo
COPY package.json package-lock.json ./
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci

FROM deps AS build
COPY packages/shared-types packages/shared-types
COPY apps/web apps/web
RUN npm run build --workspace=apps/web

FROM nginx:1.27-alpine AS runtime
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:80/ >/dev/null || exit 1
CMD ["nginx", "-g", "daemon off;"]
