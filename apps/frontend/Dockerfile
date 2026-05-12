FROM node:20-alpine AS deps
WORKDIR /app
COPY apps/frontend/package*.json ./
RUN npm install

FROM deps AS build
COPY apps/frontend ./
RUN npm run build

FROM nginx:1.27-alpine AS production
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
