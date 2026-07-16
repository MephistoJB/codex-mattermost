# Настройка

[English version](SETUP.md)

## 1. Включите поддерживаемый endpoint Mattermost

Администратор Mattermost должен:

1. Использовать Mattermost Server 11.2 или новее.
2. Открыть **System Console > Plugins > Agents > Model Context Protocol (MCP)**.
3. Включить **Mattermost MCP Server (HTTP)**.
4. Включить OAuth 2.0 service provider и настроить ручную или динамическую регистрацию клиента либо утвердить безопасную политику PAT.
5. Проверить, какие инструменты Mattermost MCP разрешены и для каких требуется подтверждение.

Endpoint:

```text
https://ВАШ-MATTERMOST-HOST/plugins/mattermost-ai/mcp-server/mcp
```

В актуальном admin guide Mattermost поддержка MCP указана для Entry, Enterprise и Enterprise Advanced. Уточните доступность функции у администратора Mattermost.

## 2. Подключите Codex

В ChatGPT desktop:

1. Откройте **Settings > MCP servers**.
2. Нажмите **Add server**.
3. Назовите сервер `mattermost`.
4. Выберите **Streamable HTTP**.
5. Введите endpoint выше.
6. Сохраните настройки и перезапустите приложение.
7. Нажмите **Authenticate** и пройдите OAuth, если потребуется.

Codex CLI и расширение для IDE используют общую MCP-конфигурацию Codex-host. Не сохраняйте PAT в файлах проекта. Если администратор требует bearer token, храните его в защищённой переменной окружения и ссылайтесь на неё из MCP-конфигурации Codex.

## 3. Установите плагин

Во время разработки:

```text
codex plugin marketplace add /absolute/path/to/codex-mattermost
codex plugin add mattermost-workflows@personal
```

После установки начните новую задачу.

## 4. Безопасная проверка

Начните с read-only проверок:

1. «Определи команду Engineering и канал Release, но пока не читай сообщения».
2. «Прочитай последние пять сообщений и перечисли их ID без сводки».
3. «Составь сводку этих сообщений и укажи исходные ID».
4. «Подготовь ответ в одну строку, но не публикуй».

Проверяйте публикацию только в несекретном тестовом канале. Подтвердите точный канал и текст, когда плагин запросит подтверждение.

## Решение проблем

- **Нет инструментов Mattermost:** проверьте включение сервера и окончание URL `/plugins/mattermost-ai/mcp-server/mcp`, перезапустите Codex и завершите авторизацию.
- **Ошибка OAuth:** уточните у администратора, включены ли OAuth service provider и регистрация клиентов.
- **Нет доступа к каналу:** у подключённой учётной записи нет прав; плагин не должен обходить ограничение.
- **Недоступна публикация:** администратор мог отключить `create_post` или включить обязательное подтверждение. Это ожидаемое ограничение.

Источники: [admin guide Mattermost Agents](https://docs.mattermost.com/agents/docs/admin_guide.html), [Mattermost MCP server](https://docs.mattermost.com/agents/mcpserver/README.html) и [документация Codex MCP](https://learn.chatgpt.com/docs/extend/mcp).
