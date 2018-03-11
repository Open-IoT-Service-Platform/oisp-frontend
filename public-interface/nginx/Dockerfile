FROM nginx:1.13.1

ADD scripts/bootstrap.sh /scripts/bootstrap.sh
ADD default.conf /etc/nginx/conf.d/default.conf

RUN sed -i 's|/opt/dashboard/iotkit-dashboard/dashboard/public/|/app/dashboard/public/|g' /etc/nginx/conf.d/default.conf
RUN sed -i '/root/a \ \ resolver 127.0.0.11;' /etc/nginx/conf.d/default.conf 

EXPOSE 80
EXPOSE 443

ENTRYPOINT ["/scripts/bootstrap.sh"]
