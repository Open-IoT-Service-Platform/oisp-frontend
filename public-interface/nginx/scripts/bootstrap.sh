#!/bin/sh
set -e

sed -i 's/localhost:5000/'"$WEBSOCKET_SERVER"'/g' /etc/nginx/conf.d/default.conf
sed -i 's/localhost:4001/'"$DASHBOARD_SERVER"'/g' /etc/nginx/conf.d/default.conf

/usr/sbin/nginx -t

/usr/sbin/nginx -g "daemon off;"
