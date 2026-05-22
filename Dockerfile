FROM node:20-alpine AS build

WORKDIR /app

COPY package.json ./
RUN npm install --no-fund --no-audit

COPY . .
RUN npm run build -- --configuration production

FROM nginx:alpine

LABEL description="Frontend image for Group&Meet made with Angular."
LABEL author="Borgia Leiva <edoardo.borgia.leiva@outlook.com>"
LABEL version="0.1.dev1"

COPY default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /tmp/dist

RUN set -eux; \
    app_root="$(find /tmp/dist -type f -name index.html | head -n 1 | xargs dirname)"; \
    test -n "$app_root"; \
    cp -R "$app_root"/. /usr/share/nginx/html/; \
    rm -rf /tmp/dist

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]