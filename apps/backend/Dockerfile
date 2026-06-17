FROM node:20-alpine AS deps
WORKDIR /app
COPY apps/backend/package*.json ./
RUN npm install

FROM deps AS build
COPY api ./api
COPY contracts ./contracts
COPY db ./db
COPY apps/backend/tsconfig.json ./tsconfig.json
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY apps/backend/package*.json ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
COPY apps/frontend/public/images/logo.png ./public/images/logo.png
RUN mkdir -p storage/private/uploads
EXPOSE 3000
CMD ["npm", "start"]
