# Build context is the repository root (see docker-compose: context: ..)
FROM node:20-bookworm AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Same-origin in the browser: the adapter talks to /api and /ws via nginx.
ENV VITE_BASE44_APP_BASE_URL=""
RUN npm run build

FROM nginx:1.27-alpine AS serve
COPY selfhost/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
