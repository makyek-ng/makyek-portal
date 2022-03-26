FROM node:8.17.0
COPY --chown=1000:1000 . /app
USER 1000:1000

WORKDIR /app
RUN npm ci \
    && npm run build:ui \
    && npm run build:server

CMD npm start
