# GastroPrime

Монорепозиторий корпоративного питания GastroPrime.

## Структура

|-- site/           # Маркетинговый сайт (Next.js) - gastroprime.ru
|-- backend/        # SaaS-бэкенд (NestJS + Prisma + PostgreSQL) - app.gastroprime.ru/api
|-- frontend/       # CRM/личный кабинет (React + Vite) - app.gastroprime.ru
|-- docs/           # Документация
|-- scripts/        # Вспомогательные скрипты

## Стек

- Next.js - маркетинговый сайт (SSG/SSR)
- NestJS - API-бэкенд
- Prisma - ORM, PostgreSQL
- React + Vite - SPA-фронтенд CRM
- PM2 - управление процессами
- Nginx - reverse proxy, SSL (Let"s Encrypt)

## Деплой

Проект развёрнут на сервере 89.108.98.249:

- gastroprime.ru - Next.js (localhost:3000) - маркетинг
- app.gastroprime.ru - статика + API (NestJS на 3001) - SaaS
