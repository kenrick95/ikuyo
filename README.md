# Ikuyo!

Ikuyo! (行くよ！) is an itinerary planning web application.

## Setup

Install the dependencies:

```bash
pnpm install
```

## Get started

Start the dev server:

```bash
pnpm dev
```

Build the app for production:

```bash
pnpm build
```

Preview the production build locally:

```bash
pnpm preview
```

## Docker

Copy the example environment file and fill in the required values:

```bash
cp .env.example .env
# edit .env and provide the correct settings
```

Build and run the container:

```bash
docker compose build
docker compose up -d
```

Build arguments are loaded from `.env`, so the file must be present before running `docker compose build`. After the containers start, open `http://localhost:8080` in your browser.

