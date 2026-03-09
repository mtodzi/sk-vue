# Этап 1: Сборка приложения Vue.js
FROM node:20-alpine as builder

WORKDIR /app
COPY package*.json ./
# Используем npm ci для более быстрых и надежных сборок,
# которые точно соответствуют package-lock.json.
RUN npm ci --no-audit
COPY . .
RUN npm run build

# Этап 2: Настройка и запуск Nginx для раздачи статических файлов
FROM nginx:1.25-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]