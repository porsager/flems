FROM node:latest as build
WORKDIR /usr/src/flems
COPY . .
RUN npm install ;\
    npm run build

FROM nginx:latest
COPY --from=build /usr/src/flems/dist /usr/share/nginx/html
COPY contrib/index.html /usr/share/nginx/html/
