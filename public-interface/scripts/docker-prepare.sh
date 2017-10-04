#!/bin/bash


cd /app/public-interface
npm install
node_modules/grunt-cli/bin/grunt build-api
