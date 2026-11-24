"""Tiny i18n: Kyrgyz is the source language, Russian is a lookup table.

The active language lives in a context variable. The API sets it from the
Accept-Language header; the worker sets it from the workflow owner's language.
"""

from contextvars import ContextVar

LANGS = ("ky", "ru")
lang_var: ContextVar[str] = ContextVar("lang", default="ky")


def pick_lang(header: str | None) -> str:
    for part in (header or "").split(","):
        code = part.split(";")[0].strip().lower()[:2]
        if code in LANGS:
            return code
    return "ky"


# Message templates: Kyrgyz source -> Russian. Placeholders are named.
RU: dict[str, str] = {
    "Кирүү талап кылынат": "Требуется вход",
    "Workflow табылган жок": "Workflow не найден",
    "Табылган жок": "Не найдено",
    "Webhook табылган жок же өчүк": "Webhook не найден или выключен",
    "Body өтө чоң": "Слишком большое тело запроса",
    "Бул email катталган": "Этот email уже зарегистрирован",
    "Email же сырсөз туура эмес": "Неверный email или пароль",
    "Кол менен иштетилүүчү workflow'ду активдештирүүнүн кереги жок": "Workflow с ручным запуском не нужно активировать",
    "Белгисиз түр: {type}": "Неизвестный тип: {type}",
    "{label} талап кылынат": "Поле «{label}» обязательно",
    "Белгисиз убакыт алкагы: {tz}": "Неизвестный часовой пояс: {tz}",
    "Cron туура эмес: {cron}": "Неверный cron: {cron}",
    "Workflow'до триггер жок": "В workflow нет триггера",
    "Workflow'до бир гана триггер болушу керек": "В workflow должен быть только один триггер",
    "Белгисиз блок: {type} ({id})": "Неизвестный блок: {type} ({id})",
    "Туташуу жок блокко барат: {id}": "Связь ведёт к несуществующему блоку: {id}",
    "Триггерге эч нерсе туташпашы керек": "К триггеру нельзя ничего подключать",
    "Workflow'до цикл бар (блоктор айланып бири-бирине кайтат)": "В workflow есть цикл (блоки ссылаются друг на друга по кругу)",
    "URL http:// же https:// менен башталышы керек": "URL должен начинаться с http:// или https://",
    "Хост табылган жок: {host}": "Хост не найден: {host}",
    "Ички тармактагы дарекке суроо жиберүүгө болбойт: {host}": "Запросы к адресам внутренней сети запрещены: {host}",
    "Headers JSON объект болушу керек": "Headers должны быть JSON-объектом",
    "Суроо ишке ашкан жок: {error}": "Запрос не выполнен: {error}",
    "HTTP {status}: {body}": "HTTP {status}: {body}",
    "Сан эмес: {value}": "Не число: {value}",
    "Белгисиз шарт: {op}": "Неизвестное условие: {op}",
    "Талаалар тизме болушу керек": "Поля должны быть списком",
    "Telegram бот токени тандалган жок (Credentials)": "Не выбран токен Telegram-бота (Ключи)",
    "Билдирүүнүн тексти бош": "Текст сообщения пустой",
    "Telegram'га жетүү мүмкүн болгон жок: {error}": "Не удалось связаться с Telegram: {error}",
    "Telegram: {error}": "Telegram: {error}",
    "ката": "ошибка",
    "AI ачкычы жок: Credentials'ке кошуңуз же серверде LLM_API_KEY коюңуз": "Нет ключа AI: добавьте его в «Ключи» или задайте LLM_API_KEY на сервере",
    "AI кызматы жооп берген жок: {error}": "AI-сервис не ответил: {error}",
    "AI JSON эмес жооп кайтарды": "AI вернул ответ не в формате JSON",
    "Кадамдар {max}дөн ашты": "Превышен лимит шагов ({max})",
    "Тандалган credential табылган жок": "Выбранный ключ не найден",
}


def t(msg: str, **kw) -> str:
    if lang_var.get() == "ru":
        msg = RU.get(msg, msg)
    return msg.format(**kw) if kw else msg


# Node palette in Russian, keyed by node type
NODE_RU: dict[str, dict] = {
    "trigger.manual": {"label": "Ручной запуск", "description": "Запускается кнопкой «Запустить». Введённый JSON передаётся следующим блокам."},
    "trigger.webhook": {"label": "Webhook", "description": "Запускается, когда на уникальный адрес workflow приходит POST-запрос."},
    "trigger.schedule": {
        "label": "По расписанию", "description": "Запускается сам по cron, например каждый день в 9:00.",
        "params": {"cron": {"help": "минута час день месяц день_недели · «0 9 * * *» = каждый день в 09:00"},
                   "timezone": {"label": "Часовой пояс"}},
    },
    "http.request": {
        "label": "HTTP-запрос", "description": "Отправляет GET/POST-запрос к любому API. JSON-ответ приходит объектом.",
        "params": {"method": {"label": "Метод"}, "fail_on_error": {"label": "Остановить при 4xx/5xx"}},
    },
    "logic.if": {
        "label": "Условие (if)", "description": "Если условие выполнено — идёт по ветке «true», иначе — «false».",
        "params": {"left": {"label": "Значение"}, "operator": {"label": "Условие"}, "right": {"label": "Сравнить с"}},
    },
    "data.set": {"label": "Собрать данные", "description": "Собирает новый объект из результатов предыдущих блоков.",
                 "params": {"fields": {"label": "Поля"}}},
    "telegram.send": {"label": "Сообщение в Telegram", "description": "Отправляет сообщение в чат через бота (бесплатно через @BotFather).",
                      "params": {"text": {"label": "Текст"}}},
    "ai.prompt": {
        "label": "AI", "description": "Обрабатывает текст через LLM: сокращение, перевод, классификация, ответы.",
        "params": {"system": {"label": "Инструкция (system)"}, "prompt": {"label": "Запрос"}, "json_output": {"label": "Ожидать JSON-ответ"}},
    },
}

CREDENTIAL_RU: dict[str, dict] = {
    "telegram": {"label": "Telegram-бот"},
    "openai": {"label": "AI (OpenAI-совместимый API)"},
}


def localize_node(meta: dict, node_type: str) -> dict:
    if lang_var.get() != "ru" or node_type not in NODE_RU:
        return meta
    ru = NODE_RU[node_type]
    out = {**meta, **{k: v for k, v in ru.items() if k != "params"}}
    over = ru.get("params", {})
    out["params"] = [{**p, **over.get(p["name"], {})} for p in meta["params"]]
    return out


def localize_credentials(types: dict) -> dict:
    if lang_var.get() != "ru":
        return types
    return {k: {**v, **CREDENTIAL_RU.get(k, {})} for k, v in types.items()}
