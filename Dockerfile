# Build arguments:
#   INSTANT_API_URI
#   INSTANT_WEBSOCKET_URI
#   INSTANT_APP_ID
#   SENTRY_ENABLED
#   SENTRY_DSN
#   MAPTILER_API_KEY
#   MAPTILER_MAP_STYLE_LIGHT
#   MAPTILER_MAP_STYLE_DARK
# Stage 1 - builder

FROM node:22 AS build

WORKDIR /app

# Copy package.json and lockfile and install dependencies
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

# Copy source files
COPY . .

# Build arguments from .env.example
ARG INSTANT_API_URI
ARG INSTANT_WEBSOCKET_URI
ARG INSTANT_APP_ID
ARG SENTRY_ENABLED
ARG SENTRY_DSN
ARG MAPTILER_API_KEY
ARG MAPTILER_MAP_STYLE_LIGHT
ARG MAPTILER_MAP_STYLE_DARK

# Build the application
RUN pnpm build

# Stage 2 - static server
FROM nginx:alpine

COPY --from=build /app/dist/ /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
