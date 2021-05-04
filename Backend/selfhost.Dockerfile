FROM rs-api-builder as builder

RUN npx pkg@4.5.1 ./src/migrate.js --targets=node12-alpine-x64 --output migrate -c package.json
RUN npx pkg@4.5.1 ./src/activate.js --targets=node12-alpine-x64 --output activate -c package.json
RUN npx pkg@4.5.1 package.json --targets=node12-alpine-x64 --output www

FROM node:12-alpine

RUN apk add --no-cache vips

COPY --from=builder /app/Backend/migrate /app/migrate
COPY --from=builder /app/Backend/activate /app/activate
COPY --from=builder /app/Backend/www /app/www
COPY --from=builder /app/Backend/node_modules/sharp /app/modules/sharp
RUN ln -s /app/modules/sharp/build/Release/sharp.node /app/sharp.node

EXPOSE 80
