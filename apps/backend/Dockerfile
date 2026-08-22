FROM node:20-alpine AS deps
WORKDIR /app
COPY apps/backend/package*.json ./
RUN npm ci

FROM deps AS build
COPY api ./api
COPY contracts ./contracts
COPY db ./db
COPY apps/backend/tsconfig.json ./tsconfig.json
COPY scripts/send-opening-ceremony-invitation.ts ./scripts/send-opening-ceremony-invitation.ts
COPY scripts/send-quran-evening-invitation.ts ./scripts/send-quran-evening-invitation.ts
COPY scripts/send-closing-ceremony-invitation.ts ./scripts/send-closing-ceremony-invitation.ts
RUN npm run build && npx esbuild scripts/send-opening-ceremony-invitation.ts --platform=node --bundle --format=esm --outfile=dist/send-opening-ceremony-invitation.js --external:mysql2 --external:nodemailer --external:dotenv && npx esbuild scripts/send-quran-evening-invitation.ts --platform=node --bundle --format=esm --outfile=dist/send-quran-evening-invitation.js --external:mysql2 --external:nodemailer --external:dotenv && npx esbuild scripts/send-closing-ceremony-invitation.ts --platform=node --bundle --format=esm --outfile=dist/send-closing-ceremony-invitation.js --external:mysql2 --external:nodemailer --external:dotenv

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY apps/backend/package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY apps/frontend/public/images/logo.png ./public/images/logo.png
COPY storage/final-admission/edition-18-final-acceptance.pdf ./storage/final-admission/edition-18-final-acceptance.pdf
COPY storage/opening-ceremony/edition-18-invitation.jpeg ./storage/opening-ceremony/edition-18-invitation.jpeg
COPY storage/quran-evening/edition-18-quran-evening.jpeg ./storage/quran-evening/edition-18-quran-evening.jpeg
COPY storage/closing-ceremony/edition-18-closing-invitation.jpeg ./storage/closing-ceremony/edition-18-closing-invitation.jpeg
COPY storage/candidate-programme/programme-edition-18.pdf ./storage/candidate-programme/programme-edition-18.pdf
RUN mkdir -p storage/private/uploads
EXPOSE 3000
CMD ["npm", "start"]
