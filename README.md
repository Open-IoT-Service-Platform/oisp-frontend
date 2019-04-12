REMOVE THIS

# OISP Frontend and Dashboard

This repository consists of 2 distinct components. A browser-based dashboard written using AngularJS and also a Node application that provides all the public APIs.

## Dashboard

The dashboard provides a browser-based frontend to most of the APIs available. It is written using HTML/CSS/JS using the Angular application framework. Users can configure devices, create rules, trigger actuations and visualise telemetry data on a graph. The purpose is to provide a reference and complete example of a web frontend for the OISP platform.

## Node

An express-based Node application designed to expose HTTP RESTful APIs. This app. connects to a Postgres database that stores all the 'metadata' needed for the application to function; such as Users, Devices, Rules, etc. The telemetry is stored within Hbase which Node retrieves via the backend (repo: oisp-backend).

### Docker support

This repo is setup to use Docker to easily build and deploy. To easily get started please look at the platform-launcher repo.

### Tests

We are using grunt in order to perform build activities, such static code analysis validation, running unit tests, packaging, etc.

#### Unit tests

For running unit tests you can:

cd ./dashboard/public-interface
NODE_ENV=local grunt

## Localization

All UI labels are defined in file - public-interface/dashboard/public/locale/resourceBundle.json. You can edit resourceBoundle.json in order to modify some UI labels.

