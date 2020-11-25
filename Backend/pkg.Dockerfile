FROM rs-api-builder as builder

RUN npx pkg ./src/bin/www --targets=node12-alpine-x64

FROM node:12-alpine

RUN apk add --no-cache vips

COPY --from=builder /app/Backend/www /app/www
COPY --from=builder /app/Backend/node_modules/sharp /app/modules/sharp
RUN ln -s /app/modules/sharp/build/Release/sharp.node /app/sharp.node

EXPOSE 80
