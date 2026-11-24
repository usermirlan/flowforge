export const LOCALES = ["ky", "ru"] as const;
export type Locale = (typeof LOCALES)[number];
export const LOCALE_COOKIE = "ff_lang";

const ky = {
  meta: {
    title: "FlowForge — визуалдык автоматташтыруу",
    description: "Блокторду туташтырып, коддосуз автоматтык процесстерди түзүңүз: webhook, cron, HTTP, Telegram, AI.",
    workflows: "Workflow'лор — FlowForge",
    editor: "Редактор — FlowForge",
    credentials: "Ачкычтар — FlowForge",
  },
  nav: { workflows: "Workflow'лор", credentials: "Ачкычтар", logout: "Чыгуу", login: "Кирүү", start: "Баштоо", lang: "Тил" },
  auth: {
    login: "Кирүү", register: "Катталуу", name: "Атыңыз", email: "Email", password: "Сырсөз",
    haveAccount: "Аккаунтуңуз барбы?", noAccount: "Аккаунт жокпу?",
  },
  errors: { server: "Сервер жеткиликсиз, кийинчерээк аракет кылыңыз" },
  landing: {
    badge: "n8n / Zapier'ге окшош · open source портфолио долбоору",
    title1: "Блокторду туташтырыңыз — ", title2: "иш өзү аткарылат",
    lead: "FlowForge'до автоматтык процесстерди коддосуз түзөсүз: окуя келет, маалымат иштетилет, жыйынтык керектүү жерге кетет.",
    cta: "Акысыз баштоо",
    chip: [["Webhook", "Жаңы заказ"], ["Шарт", "total > 5000"], ["Telegram", "Менеджерге билдирүү"]],
    features: [
      ["⚡", "Триггерлер", "Webhook, cron боюнча же кол менен — workflow каалаган окуядан башталат."],
      ["🌐", "Каалаган API", "HTTP блогу ар кандай REST API'ни чакырат; жооп кийинки блокторго өтөт."],
      ["⑂", "Шарттар", "if/else менен бутактар: ар кандай учурга ар кандай жол."],
      ["✦", "AI кадамы", "LLM менен текстти кыскартуу, котормо, классификация — бир блок менен."],
      ["📡", "Тирүү статус", "Иштеп жатканда ар бир блоктун абалы WebSocket аркылуу экранда жанат."],
      ["🔐", "Коопсуз", "Ачкычтар шифрленет, ички тармакка суроолор бөгөттөлөт (SSRF)."],
    ],
  },
  list: {
    title: "Workflow'лор",
    lead: "Автоматтык процесстериңиз. Бирөөнү ачып, редактордо блокторду туташтырыңыз.",
    newName: "Жаңы workflow'дун аты", create: "+ Түзүү", orTemplate: "Же даяр үлгүдөн баштаңыз",
    empty: "Азырынча workflow жок — жогорудан түзүңүз.", noTrigger: "Триггер жок", changed: "өзгөртүлдү", active: "Активдүү",
    triggers: { "trigger.manual": "Кол менен", "trigger.webhook": "Webhook", "trigger.schedule": "Убакыт боюнча" } as Record<string, string>,
  },
  status: { success: "Ийгиликтүү", error: "Ката", running: "Иштеп жатат", queued: "Кезекте", never: "— иштетиле элек" } as Record<string, string>,
  ago: { sec: "сек мурун", min: "мүн мурун", hour: "саат мурун", intl: "ky-KG" },
  groups: { trigger: "Триггерлер", action: "Аракеттер", logic: "Логика", data: "Маалымат", ai: "AI" },
  handles: { true: "ооба", false: "жок" } as Record<string, string>,
  editor: {
    back: "Артка", name: "Workflow'дун аты", unsaved: "● сакталган жок", history: "Тарых", save: "Сактоо",
    active: "Активдүү", activate: "Активдештирүү", run: "▶ Иштетүү", saved: "Сакталды", untitled: "Аталышсыз",
    oneTrigger: "Workflow'до бир гана триггер болот — алгач эскисин өчүрүңүз.",
    badPayload: "Киргизүү JSON туура эмес", activated: "Активдештирилди", stopped: "Токтотулду",
    palette: "Сүйрөп таштаңыз же басыңыз", emptyCanvas: "Сол жактан триггер кошуудан баштаңыз",
    runTitle: "Иштетүү", historyTitle: "Иштетүүлөр тарыхы", close: "Жабуу",
    payloadWebhook: "Киргизүү (JSON) — webhook'тун body'си катары", payloadTrigger: "Киргизүү (JSON) — триггердин маалыматы",
    running: "Иштеп жатат…", runNow: "▶ Азыр иштетүү", clear: "тазалоо",
    runHint: "Иштеткенде ар бир блоктун абалы ушул жерде жана канваста тирүү көрүнөт.",
    noRuns: "Азырынча иштетүү жок.", ms: "мс",
    stats: (n: number, e: number) => `${n} блок · ${e} байланыш`, next: "кийинки иштетүү",
    fit: "Баарын көрсөтүү", deleteWf: "Workflow'ду өчүрүү", confirmDelete: "Бул workflow биротоло өчүрүлөт. Уланталыбы?",
    samplePayload: '{\n  "name": "Айбек"\n}',
  },
  panel: {
    nodeName: "Блоктун аты", webhookUrl: "Webhook URL (POST)", copied: "Көчүрүлдү ✓",
    copyHint: "Басып көчүрүңүз. Workflow активдүү болгондо гана иштейт.",
    credential: "Ачкыч", optional: "(милдеттүү эмес)", serverKey: "Сервердин ачкычы", choose: "— тандаңыз —",
    addCredential: "+ жаңы ачкыч кошуу", continueOnError: "Ката болсо да улантуу",
    vars: "Өзгөрмөлөр (басып көчүрүңүз)", nested: "Ичкери кирүү:", lastResult: "Акыркы натыйжа",
    deleteNode: "Блокту өчүрүү", badJson: "JSON туура эмес", key: "Ачкыч", value: "Маани", remove: "Өчүрүү", addField: "+ талаа кошуу",
  },
  creds: {
    title: "Ачкычтар",
    lead: "Telegram бот токени, AI API ачкычы сыяктуу купуя маалыматтар. Блоктордо аты менен тандалат.",
    empty: "Азырынча ачкыч жок.", delete: "Өчүрүү", new: "Жаңы ачкыч", type: "Түрү", name: "Аты",
    namePh: "Мисалы: Менин ботум", saved: "Сакталды — шифрленген түрдө.", save: "Сактоо",
    note: "Купуя маанилер серверде Fernet менен шифрленип сакталат жана кайра эч качан толук көрсөтүлбөйт.",
  },
  notFound: { text: "Мындай бет табылган жок.", home: "Башкы бет" },
};

export type Dict = typeof ky;

const ru: Dict = {
  meta: {
    title: "FlowForge — визуальная автоматизация",
    description: "Соединяйте блоки и создавайте автоматизации без кода: webhook, cron, HTTP, Telegram, AI.",
    workflows: "Workflow — FlowForge",
    editor: "Редактор — FlowForge",
    credentials: "Ключи — FlowForge",
  },
  nav: { workflows: "Workflow", credentials: "Ключи", logout: "Выйти", login: "Войти", start: "Начать", lang: "Язык" },
  auth: {
    login: "Вход", register: "Регистрация", name: "Имя", email: "Email", password: "Пароль",
    haveAccount: "Уже есть аккаунт?", noAccount: "Нет аккаунта?",
  },
  errors: { server: "Сервер недоступен, попробуйте позже" },
  landing: {
    badge: "Аналог n8n / Zapier · open source портфолио-проект",
    title1: "Соединяйте блоки — ", title2: "работа сделается сама",
    lead: "В FlowForge автоматизации создаются без кода: приходит событие, данные обрабатываются, результат уходит куда нужно.",
    cta: "Начать бесплатно",
    chip: [["Webhook", "Новый заказ"], ["Условие", "total > 5000"], ["Telegram", "Сообщение менеджеру"]],
    features: [
      ["⚡", "Триггеры", "Webhook, по расписанию или вручную — workflow стартует от любого события."],
      ["🌐", "Любой API", "HTTP-блок вызывает любой REST API; ответ передаётся следующим блокам."],
      ["⑂", "Условия", "Ветвление if/else: для разных случаев — разные пути."],
      ["✦", "AI-шаг", "Сокращение, перевод, классификация текста через LLM — одним блоком."],
      ["📡", "Живой статус", "Во время запуска статус каждого блока обновляется на экране через WebSocket."],
      ["🔐", "Безопасность", "Ключи шифруются, запросы во внутреннюю сеть блокируются (SSRF)."],
    ],
  },
  list: {
    title: "Workflow",
    lead: "Ваши автоматизации. Откройте любую и соединяйте блоки в редакторе.",
    newName: "Название нового workflow", create: "+ Создать", orTemplate: "Или начните с готового шаблона",
    empty: "Пока нет ни одного workflow — создайте выше.", noTrigger: "Нет триггера", changed: "изменён", active: "Активен",
    triggers: { "trigger.manual": "Вручную", "trigger.webhook": "Webhook", "trigger.schedule": "По расписанию" },
  },
  status: { success: "Успешно", error: "Ошибка", running: "Выполняется", queued: "В очереди", never: "— ещё не запускался" },
  ago: { sec: "сек назад", min: "мин назад", hour: "ч назад", intl: "ru-RU" },
  groups: { trigger: "Триггеры", action: "Действия", logic: "Логика", data: "Данные", ai: "AI" },
  handles: { true: "да", false: "нет" },
  editor: {
    back: "Назад", name: "Название workflow", unsaved: "● не сохранено", history: "История", save: "Сохранить",
    active: "Активен", activate: "Активировать", run: "▶ Запустить", saved: "Сохранено", untitled: "Без названия",
    oneTrigger: "В workflow может быть только один триггер — сначала удалите старый.",
    badPayload: "Входной JSON некорректен", activated: "Активирован", stopped: "Остановлен",
    palette: "Перетащите или нажмите", emptyCanvas: "Начните с добавления триггера слева",
    runTitle: "Запуск", historyTitle: "История запусков", close: "Закрыть",
    payloadWebhook: "Входные данные (JSON) — как body webhook'а", payloadTrigger: "Входные данные (JSON) — данные триггера",
    running: "Выполняется…", runNow: "▶ Запустить сейчас", clear: "очистить",
    runHint: "При запуске статус каждого блока виден здесь и на холсте в реальном времени.",
    noRuns: "Запусков пока нет.", ms: "мс",
    stats: (n: number, e: number) => `${n} блок(ов) · ${e} связ(ей)`, next: "следующий запуск",
    fit: "Показать всё", deleteWf: "Удалить workflow", confirmDelete: "Workflow будет удалён навсегда. Продолжить?",
    samplePayload: '{\n  "name": "Айбек"\n}',
  },
  panel: {
    nodeName: "Название блока", webhookUrl: "Webhook URL (POST)", copied: "Скопировано ✓",
    copyHint: "Нажмите, чтобы скопировать. Работает, только когда workflow активен.",
    credential: "Ключ", optional: "(необязательно)", serverKey: "Ключ сервера", choose: "— выберите —",
    addCredential: "+ добавить ключ", continueOnError: "Продолжать при ошибке",
    vars: "Переменные (нажмите, чтобы скопировать)", nested: "Вложенный доступ:", lastResult: "Последний результат",
    deleteNode: "Удалить блок", badJson: "Некорректный JSON", key: "Ключ", value: "Значение", remove: "Удалить", addField: "+ добавить поле",
  },
  creds: {
    title: "Ключи",
    lead: "Секретные данные: токен Telegram-бота, API-ключ AI и т.п. В блоках выбираются по названию.",
    empty: "Ключей пока нет.", delete: "Удалить", new: "Новый ключ", type: "Тип", name: "Название",
    namePh: "Например: Мой бот", saved: "Сохранено в зашифрованном виде.", save: "Сохранить",
    note: "Секретные значения шифруются на сервере (Fernet) и больше никогда не показываются целиком.",
  },
  notFound: { text: "Такой страницы нет.", home: "На главную" },
};

export const DICTS: Record<Locale, Dict> = { ky, ru };

export function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (LOCALES as readonly string[]).includes(v);
}
