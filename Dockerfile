FROM node:20-alpine AS build
RUN apk add --no-cache git
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY .git ./.git
COPY src ./src
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/src/.vitepress/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
