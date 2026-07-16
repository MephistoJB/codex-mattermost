# Mattermost Workflows для Codex

[English version](README.md)

Независимый плагин Codex на основе skill-файла для безопасной работы с Mattermost через официальный MCP-сервер Mattermost.

Плагин помогает Codex составлять сводки каналов и тредов, искать сообщения и готовить публикации с обязательным подтверждением. Плагин не проксирует данные Mattermost и не запускает собственный MCP-сервис.

> Проект не связан с Mattermost, Inc. или OpenAI, не одобрен и не спонсируется ими.

## MVP

- Сводка канала или треда: решения, задачи, препятствия и открытые вопросы.
- Поиск сообщений только в запрошенных пользователем командах и каналах.
- Определение команды и канала по читаемому названию до выполнения действия.
- Подготовка сообщения или ответа с обязательным явным подтверждением перед публикацией.
- Инструкция по настройке, если официальный Mattermost MCP не подключён.

Создание пользователей, команд и каналов, изменение участников, выдача себя за другого пользователя, dev-инструменты, вложения и массовая рассылка намеренно не входят в MVP. См. [границы MVP](docs/MVP.ru.md).

## Требования

- Развёртывание Mattermost, где администратор включил внешний MCP endpoint. В актуальной документации Mattermost для внешних клиентов указан Server 11.2 или новее; также может потребоваться подходящая лицензия Mattermost.
- Учётная запись Mattermost с доступом к нужным каналам.
- ChatGPT desktop, Codex CLI или расширение Codex для IDE с поддержкой MCP.
- OAuth, включённый администратором Mattermost, либо безопасно настроенный personal access token. Предпочтителен OAuth.

## Установка

### Из каталога плагинов Codex

После одобрения в marketplace откройте **Plugins**, найдите **Mattermost Workflows** и нажмите **Install**.

### Из этого репозитория

```text
codex plugin marketplace add shanginn/codex-mattermost --ref main
codex plugin add mattermost-workflows@personal
```

После установки начните новую задачу, чтобы Codex загрузил skill.

## Подключение Mattermost MCP

Администратор Mattermost должен включить **System Console > Plugins > Agents > Model Context Protocol (MCP) > Enable Mattermost MCP Server (HTTP)**.

Production endpoint:

```text
https://ВАШ-MATTERMOST-HOST/plugins/mattermost-ai/mcp-server/mcp
```

В ChatGPT desktop откройте **Settings > MCP servers**, добавьте сервер **Streamable HTTP** с именем `mattermost`, укажите endpoint, сохраните настройки, перезапустите приложение и пройдите авторизацию. Никогда не вставляйте токены доступа в чат.

Подробности — в [инструкции по настройке](docs/SETUP.ru.md).

## Примеры запросов

- «Составь сводку решений и задач из канала Engineering / Release с понедельника».
- «Найди в команде Operations сообщения об исчерпании соединений с базой данных».
- «Подготовь уведомление о техобслуживании для Town Square. Не публикуй без моего подтверждения».

## Разработка и тесты

Плагин находится в `plugins/mattermost-workflows`. Marketplace репозитория описан в `.agents/plugins/marketplace.json`.

```text
python3 -m unittest discover -s tests -v
python3 plugins/mattermost-workflows/skills/mattermost-workflows/scripts/check_mattermost_url.py https://chat.example.com
```

Тесты проверяют manifest плагина, двуязычную документацию, точное количество marketplace-сценариев, защитные правила workflow, атрибуцию и построение endpoint. Они используют только фикстуры и не подключаются к Mattermost.

## Конфиденциальность, поддержка и условия

- [Конфиденциальность](PRIVACY.ru.md) · [Privacy](PRIVACY.md)
- [Условия](TERMS.ru.md) · [Terms](TERMS.md)
- [Поддержка](SUPPORT.ru.md) · [Support](SUPPORT.md)
- [Участие](CONTRIBUTING.ru.md) · [Contributing](CONTRIBUTING.md)

## Лицензия и обязательная атрибуция

Проект использует пользовательскую [Shangin Attribution License 1.0](LICENSE). Любое использование, развёртывание, производная работа или форк должны содержать:

> Based on Mattermost Workflows for Codex by Nikolai Shangin (shanginn@gmail.com).

Лицензия разрешает использование исходного кода при обязательной атрибуции и не заявляется как одобренная OSI.
