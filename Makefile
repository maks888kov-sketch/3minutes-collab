# 3Minutes — self-hosted stack. Запускать из корня проекта.
#   make up      — собрать образы и поднять весь стек (одна команда)
#   make help    — список всех команд
#
# На Windows GNU make не обязателен: рядом лежит make.cmd/make.ps1,
# поэтому `make up` работает и без установки make.

COMPOSE := docker compose -f selfhost/docker-compose.yml

.DEFAULT_GOAL := help

help:
	@echo "3Minutes — команды (make <target>):"
	@echo "  up           собрать образы и запустить весь стек"
	@echo "  build        только собрать образы"
	@echo "  start        запустить без пересборки"
	@echo "  down         остановить контейнеры"
	@echo "  restart      перезапустить"
	@echo "  backend      пересобрать и перезапустить только бэкенд"
	@echo "  frontend     пересобрать и перезапустить только фронтенд"
	@echo "  logs         логи всех сервисов (Ctrl+C — выход)"
	@echo "  ps           статус контейнеров"
	@echo "  migrate      применить миграции БД вручную"
	@echo "  reset-db     очистить данные (TRUNCATE), сервисы не трогает"
	@echo "  clean        остановить и удалить тома (полная очистка данных)"
	@echo "  smoke        API-смоук тест"
	@echo "  e2e          E2E в Яндекс Браузере (авторизация / чат / видео)"
	@echo ""
	@echo "Приложение: http://localhost:5180    Почта (коды): http://localhost:8026"

up:
	$(COMPOSE) up -d --build
	@echo ""
	@echo "Готово. Приложение: http://localhost:5180   Почта (коды): http://localhost:8026"

build:
	$(COMPOSE) build

start:
	$(COMPOSE) up -d

down:
	$(COMPOSE) down

restart:
	$(COMPOSE) restart

backend:
	$(COMPOSE) up -d --build backend

frontend:
	$(COMPOSE) up -d --build frontend

logs:
	$(COMPOSE) logs -f

ps:
	$(COMPOSE) ps

migrate:
	$(COMPOSE) exec backend alembic upgrade head

reset-db:
	$(COMPOSE) exec postgres psql -U threemin -d threemin -c "TRUNCATE profiles, matches, messages, likes, users, otp_codes, feedback CASCADE;"

clean:
	$(COMPOSE) down -v

smoke:
	cd selfhost/e2e && npm install --silent && node smoke.mjs

e2e:
	cd selfhost/e2e && npm install --silent && node run.mjs

.PHONY: help up build start down restart backend frontend logs ps migrate reset-db clean smoke e2e
