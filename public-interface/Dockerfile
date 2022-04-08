FROM node:14-alpine

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

RUN apk add --no-cache ncurses make bash python3 g++ chromium

ADD ./package.json /app/package.json
WORKDIR /app

RUN npm install
RUN npm audit fix

ADD . /app
ENV TERM xterm
RUN node_modules/grunt-cli/bin/grunt default

# Remove build time dependencies
RUN apk del python3 g++ chromium

RUN adduser -D nodeuser
USER nodeuser

EXPOSE 4001 4002 4003 4004
