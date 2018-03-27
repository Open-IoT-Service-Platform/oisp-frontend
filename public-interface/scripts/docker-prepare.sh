#!/bin/bash

export TERM=xterm

cd /app/public-interface
npm install
node_modules/grunt-cli/bin/grunt build-api
