FROM nginx:1.13.1

ARG WEBSOCKET_SERVER
ARG DASHBOARD_SERVER

ADD default.conf /etc/nginx/conf.d/default.conf

RUN sed -i 's/localhost:5000/'"$WEBSOCKET_SERVER"'/g' /etc/nginx/conf.d/default.conf
RUN sed -i 's/localhost:4001/'"$DASHBOARD_SERVER"'/g' /etc/nginx/conf.d/default.conf
RUN sed -i 's|/opt/dashboard/iotkit-dashboard/dashboard/public/|/app/dashboard/public/|g' /etc/nginx/conf.d/default.conf

EXPOSE 80
EXPOSE 443

CMD ["nginx", "-g", "daemon off;"]