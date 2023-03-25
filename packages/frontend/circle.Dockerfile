FROM nginx

COPY www /usr/share/nginx/html

ARG VERSION=development

RUN sed -i "s/window.version = 'development';/window.version = '$VERSION';/" /usr/share/nginx/html/index.html

EXPOSE 80
