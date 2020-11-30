FROM rs-api-builder as builder

RUN npx pkg ./src/migrate.js --targets=node12-alpine-x64 --output migrate -c package.json
RUN npx pkg package.json --targets=node12-alpine-x64 --output www

FROM node:12-alpine

RUN apk add --no-cache vips

COPY --from=builder /app/Backend/migrate /app/migrate
COPY --from=builder /app/Backend/www /app/www
COPY --from=builder /app/Backend/node_modules/sharp /app/modules/sharp
RUN ln -s /app/modules/sharp/build/Release/sharp.node /app/sharp.node

EXPOSE 80
