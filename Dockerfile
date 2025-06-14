# Stage 1: build the application
FROM node:20 AS build
WORKDIR /app

# Install dependencies
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build arguments for configuration
ARG INSTANT_APP_ID
ARG INSTANT_API_URI
ARG INSTANT_WEBSOCKET_URI
ARG SENTRY_ENABLED
ARG SENTRY_DSN
ARG MAPTILER_API_KEY
ARG MAPTILER_MAP_STYLE_LIGHT
ARG MAPTILER_MAP_STYLE_DARK

# Provide the arguments as environment variables for the build
ENV INSTANT_APP_ID=$INSTANT_APP_ID \
    INSTANT_API_URI=$INSTANT_API_URI \
    INSTANT_WEBSOCKET_URI=$INSTANT_WEBSOCKET_URI \
    SENTRY_ENABLED=$SENTRY_ENABLED \
    SENTRY_DSN=$SENTRY_DSN \
    MAPTILER_API_KEY=$MAPTILER_API_KEY \
    MAPTILER_MAP_STYLE_LIGHT=$MAPTILER_MAP_STYLE_LIGHT \
    MAPTILER_MAP_STYLE_DARK=$MAPTILER_MAP_STYLE_DARK

RUN pnpm build

# Stage 2: serve the built app
FROM nginx:1.25-alpine AS release
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]