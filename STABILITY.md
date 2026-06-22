# STABILITY.md — План обеспечения стабильности проекта GastroPrime

> Дата: 2026-05-11
> Анализ выполнен на основе кода backend/src/

---

## 1. 🔴 HIGH — Часовые пояса: `new Date(dateString)` без TZ-коррекции

### Проблема
`new Date("2026-05-12")` в Node.js интерпретируется как **UTC midnight**. В часовом поясе +3 (Москва/Алматы) это соответствует **11 мая 23:00**. В результате:
- Поиск меню по дате возвращает данные предыдущего дня
- Запись данных происходит не на ту дату
- Отчёты и аналитика по дням съезжают

### Уже исправлено
- ✅ **driver.service.ts** (строки 9, 198, 237): `new Date(date + 'T00:00:00Z')` — корректно

### Где ещё чинить

#### daily-menu.service.ts
| Строка | Сейчас | Надо |
|--------|--------|------|
| 63 | `where: { date: new Date(date) }` | `where: { date: new Date(date + 'T00:00:00Z') }` |
| 177 | `const date = new Date(data.date)` | `const date = new Date(data.date + 'T00:00:00Z')` |
| 218 | `where: { date: new Date(date) }` | `where: { date: new Date(date + 'T00:00:00Z') }` |
| 122-124 | `gte: new Date(start)`, `lte: new Date(end)` | с суффиксом + 'T00:00:00Z' |

#### weekly-menu.service.ts
| Строка | Сейчас | Надо |
|--------|--------|------|
| 55 | `const date = new Date(value)` | `const date = new Date(value + 'T00:00:00Z')` |
| 293 | `date: new Date(date)` | `date: new Date(date + 'T00:00:00Z')` |
| 303 | `where: { date: new Date(date) }` | `where: { date: new Date(date + 'T00:00:00Z') }` |

#### logistics.service.ts
| Строка | Сейчас | Надо |
|--------|--------|------|
| 9 | `const targetDate = new Date(date)` | `const targetDate = new Date(date + 'T00:00:00Z')` |
| 26 | `const targetDate = new Date(date)` | `const targetDate = new Date(date + 'T00:00:00Z')` |
| 42 | `date: new Date(data.date)` | `date: new Date(data.date + 'T00:00:00Z')` |
| 64 | `updateData.date = new Date(data.date)` | `updateData.date = new Date(data.date + 'T00:00:00Z')` |

#### users.service.ts
| Строка | Сейчас | Надо |
|--------|--------|------|
| 78 | `const date = value ? new Date(value) : new Date()` | `const date = value ? new Date(value + 'T00:00:00Z') : new Date()` |

#### admin.service.ts
| Строка | Сейчас | Надо |
|--------|--------|------|
| 785-786 | `new Date(start)`, `new Date(end)` | с суффиксом + 'T00:00:00Z' |
| 1275 | `validDates.map(date => new Date(date))` | с суффиксом |
| 1328, 1331 | `new Date(date)` | с суффиксом |
| 1925 | `const targetDate = new Date(date)` | с суффиксом |
| 2611 | `const baseDate = date ? new Date(date) : new Date()` | с суффиксом |
| 1850-1851 | `new Date(start)`, `new Date(end)` | с суффиксом |
| 2314-2315 | `new Date(start)`, `new Date(end)` | с суффиксом |
| 2323-2324 | `new Date(end)`, `new Date(start)` | с суффиксом |
| 2498-2499 | `new Date(start)`, `new Date(end)` | с суффиксом |
| 2507-2508 | `new Date(end)`, `new Date(start)` | с суффиксом |

**Рекомендация:** Создать хелпер `parseDate(dateStr: string)` в common/utils.ts и использовать везде вместо raw `new Date()`.

---

## 2. ✅ НЕ АКТУАЛЬНО — JWT userId (`req.user.id` vs `req.user.userId`)

### Диагностика
- `grep -rn "req\.user\." ` показал **0 совпадений** с `req.user.id`
- Все контроллеры используют `req.user.userId`
- JWT-стратегия возвращает `{ userId: payload.sub, email, role }`

**Статус: ИСПРАВЛЕНО** (подтверждено коммитом `cfd8501`)

---

## 3. ✅ НЕ АКТУАЛЬНО — Отсутствие гардов

### Диагностика
- Все контроллеры защищены: каждый имеет либо `@UseGuards(AuthGuard('jwt'))` на уровне класса, либо на каждом методе
- `login` и `register` в auth.controller.ts — **намеренно публичные**
- admin.controller.ts дополнительно защищён `AdminGuard`
- driver.controller.ts дополнительно защищён `DriverGuard`
- daily-menu.controller.ts: `createOrUpdate` и `delete` дополнительно защищены `AdminGuard`

**Статус: ИСПРАВЛЕНО**

---

## 4. 🟡 MEDIUM — Кеш PM2: устаревший dist после деплоя

### Проблема
- После `git pull` и `npx nest build` старый `dist/` перезаписывается, но PM2 продолжает держать в памяти **предыдущую версию кода**
- Нет скрипта деплоя, который бы гарантированно перезапускал PM2 после сборки
- В `package.json` нет команды `start:prod` или `deploy`

### Что делать
1. Добавить в `package.json` скрипты:
   ```json
   "start:prod": "node dist/main",
   "deploy": "npm run build && pm2 restart gastro-api"
   ```
2. Или добавить в deploy-скрипт:
   ```bash
   cd /root/gastroprime/backend
   git pull origin main
   npm run build
   pm2 restart gastro-api
   ```
3. Рассмотреть PM2 `watch` mode (только для `dist/`):
   ```
   pm2 start dist/main --name gastro-api --watch dist
   ```

---

## 5. 🟡 MEDIUM — deleteMany без фильтрации

### Уже исправлено
- ✅ **weekly-menu.service.ts** (коммит `b0fa837`): `deleteMany` теперь фильтрует по `userId` и конкретным датам, а не удаляет всё подряд

### Что ещё проверить

#### daily-menu.service.ts (строки 193, 217)
- `deleteMany({ where: { date } })` — фильтр по одной дате, безопасно
- После фикса TZ-бага (п.1) — риска нет
- Рекомендуется заменить на `delete({ where: { date } })` для семантической точности

#### admin.service.ts (строки 1713-1758) — удаление пользователей
- Все `deleteMany` в `deleteUser` и `deleteCompany` имеют корректные `where`-фильтры (по `userId`, `companyId`)
- Выполняются внутри транзакции — безопасно

#### crm-routes.service.ts, crm-projects.service.ts, crm-deals.service.ts
- `deleteMany` только для каскадного удаления с корректными `where` — безопасно

**Вывод:** deleteMany-проблема решена, дополнительных рисков нет.

---

## 6. 🟡 MEDIUM — Нет DTO с валидацией

### Проблема
- `ValidationPipe` подключён глобально (`main.ts` строка 16)
- `class-validator` и `class-transformer` установлены в зависимостях
- Но **ни один** контроллер не использует DTO-классы с декораторами (`@IsString`, `@IsNumber`, `@Min`, `@Max`, `@IsOptional` и т.д.)
- Все тела запросов принимаются как `any` или сырые типы

### Риски
- Клиент может отправить отрицательную цену, бесконечное количество, SQL-инъекции через строковые поля
- Ошибка в фронтенде может записать мусор в БД
- Отсутствие `@MaxLength` на строковых полях может привести к превышению лимита БД

### Что делать
1. Создать папки `dto/` в каждом модуле
2. Для **наиболее критичных эндпоинтов** (создание/обновление данных) добавить DTO:
   - `create-or-update-daily-menu.dto.ts`
   - `create-weekly-menu.dto.ts`
   - `register.dto.ts`
   - `create-order.dto.ts` (когда появится)
3. Добавить в DTO хотя бы базовые проверки:
   - `@IsString()`, `@IsOptional()`, `@MaxLength(255)` для строк
   - `@IsInt()`, `@Min(0)` для чисел
   - `@IsEmail()` для email
   - `@IsArray()`, `@ValidateNested({ each: true })` для массивов
4. Убедиться, что `ValidationPipe` настроен на `whitelist: true`:
   ```ts
   app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false }));
   ```

---

## 7. 🟢 LOW — Нет скрипта деплоя

### Проблема
Деплой делается вручную: `git pull`, `nest build`, `pm2 restart`. Нет единой команды, нет отката.

### Что делать
1. Создать `/root/gastroprime/deploy.sh`:
   ```bash
   #!/bin/bash
   set -e
   cd /root/gastroprime/backend
   git pull origin main
   npm install --production
   npx prisma generate
   npx nest build
   pm2 restart gastro-api
   ```
2. Добавить в package.json: `"deploy": "bash ../deploy.sh"`

---

## 8. 🟢 LOW — Нет мониторинга ошибок

### Проблема
Нет интеграции с Sentry, Logtail или аналогами. В случае падения — только логи PM2.

### Что делать
1. Подключить минимальный логгер (pino или nest-winston) с ротацией файлов
2. Рассмотреть бесплатный Sentry для отслеживания необработанных исключений

---

## Сводка приоритетов

| Приоритет | Задача | Статус |
|-----------|--------|--------|
| 🔴 HIGH | Часовые пояса (TZ-коррекция new Date) | **Не исправлено** |
| 🟡 MEDIUM | Кеш PM2 (restart после сборки) | **Не исправлено** |
| 🟡 MEDIUM | deleteMany (проверка остальных мест) | **Исправлено** |
| 🟡 MEDIUM | Валидация через DTO | **Не исправлено** |
| ✅ FIXED | JWT userId (req.user.userId) | Исправлено |
| ✅ FIXED | Гарды на эндпоинтах | Исправлено |
| 🟢 LOW | Скрипт деплоя | Не исправлено |
| 🟢 LOW | Мониторинг ошибок | Не исправлено |

---

*Сгенерировано автоматически по результатам анализа кода backend/src/*
