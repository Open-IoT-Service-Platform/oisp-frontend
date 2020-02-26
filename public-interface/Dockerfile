FROM node:10-alpine

RUN apk add --no-cache ncurses make bash python g++

ADD ./package.json /app/package.json
WORKDIR /app

RUN npm install

# Remove build time dependencies
RUN apk del python g++

ADD . /app
ENV TERM xterm
RUN node_modules/grunt-cli/bin/grunt build-api

RUN adduser -D nodeuser
USER nodeuser

EXPOSE 4001 4002 4003 4004
