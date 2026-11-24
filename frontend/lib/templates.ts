import type { Graph } from "./types";
import type { Locale } from "./i18n";

type T = { name: string; description: string; graph: Graph };

const S = {
  ky: {
    fx: ["Валюта курсу → AI → Telegram", "Ар күнү саат 9да USD/KGS курсун алып, AI кыскача түшүндүрмө жазат жана Telegram'га жиберет."],
    fxNodes: ["Ар күнү 09:00", "Курсту алуу", "Кыскача жазуу", "Telegram'га"],
    fxSystem: "Сен кыргыз тилинде 2 сүйлөм менен жооп бересиң.",
    fxPrompt: "Бүгүнкү курс: 1 USD = {{ nodes.http_1.body.rates.KGS }} KGS, 1 USD = {{ nodes.http_1.body.rates.RUB }} RUB. Кыскача маалымат жаз.",
    order: ["Заказ webhook → шарт → билдирүү", "Сайттан заказ келет; суммасы 5000 сомдон ашса — менеджерге Telegram, болбосо жөн гана жазуу."],
    orderNodes: ["Жаңы заказ", "Чоң заказбы?", "Менеджерге", "Кадимки заказ"],
    orderBig: "🔥 Чоң заказ #{{ trigger.body.id }}: {{ trigger.body.total }} сом",
    orderNote: "Заказ #{{ trigger.body.id }} кабыл алынды",
    wx: ["Кол менен: API → маалымат", "Эң жөнөкөй мисал: иштетүү баскычы → ачык API'ден маалымат → керектүү талааларды тандоо."],
    wxNodes: ["Иштетүү", "Аба ырайы (Бишкек)", "Натыйжа"],
    wxSummary: "Бишкекте азыр {{ nodes.http_1.body.current.temperature_2m }}°C",
  },
  ru: {
    fx: ["Курс валют → AI → Telegram", "Каждый день в 9:00 берёт курс USD/KGS, AI пишет короткую сводку и отправляет её в Telegram."],
    fxNodes: ["Каждый день 09:00", "Получить курс", "Краткая сводка", "В Telegram"],
    fxSystem: "Ты отвечаешь по-русски, в 2 предложениях.",
    fxPrompt: "Курс на сегодня: 1 USD = {{ nodes.http_1.body.rates.KGS }} KGS, 1 USD = {{ nodes.http_1.body.rates.RUB }} RUB. Напиши короткую сводку.",
    order: ["Заказ webhook → условие → уведомление", "С сайта приходит заказ; если сумма больше 5000 сом — сообщение менеджеру в Telegram, иначе просто запись."],
    orderNodes: ["Новый заказ", "Крупный заказ?", "Менеджеру", "Обычный заказ"],
    orderBig: "🔥 Крупный заказ #{{ trigger.body.id }}: {{ trigger.body.total }} сом",
    orderNote: "Заказ #{{ trigger.body.id }} принят",
    wx: ["Вручную: API → данные", "Самый простой пример: кнопка запуска → данные из открытого API → выбор нужных полей."],
    wxNodes: ["Запуск", "Погода (Бишкек)", "Результат"],
    wxSummary: "Сейчас в Бишкеке {{ nodes.http_1.body.current.temperature_2m }}°C",
  },
};

/** Starter workflows shown on the dashboard. All use free APIs only. */
export function templates(locale: Locale): T[] {
  const s = S[locale];
  return [
    {
      name: s.fx[0], description: s.fx[1],
      graph: {
        nodes: [
          { id: "schedule_1", type: "trigger.schedule", position: { x: 40, y: 140 },
            data: { label: s.fxNodes[0], params: { cron: "0 9 * * *", timezone: "Asia/Bishkek" } } },
          { id: "http_1", type: "http.request", position: { x: 330, y: 140 },
            data: { label: s.fxNodes[1], params: { method: "GET", url: "https://open.er-api.com/v6/latest/USD", headers: {}, body: null, fail_on_error: true } } },
          { id: "ai_1", type: "ai.prompt", position: { x: 620, y: 140 },
            data: { label: s.fxNodes[2], params: { system: s.fxSystem, prompt: s.fxPrompt, json_output: false } } },
          { id: "telegram_1", type: "telegram.send", position: { x: 910, y: 140 },
            data: { label: s.fxNodes[3], params: { chat_id: "", text: "💱 {{ nodes.ai_1.text }}" } } },
        ],
        edges: [
          { id: "e1", source: "schedule_1", target: "http_1" },
          { id: "e2", source: "http_1", target: "ai_1" },
          { id: "e3", source: "ai_1", target: "telegram_1" },
        ],
      },
    },
    {
      name: s.order[0], description: s.order[1],
      graph: {
        nodes: [
          { id: "webhook_1", type: "trigger.webhook", position: { x: 40, y: 160 }, data: { label: s.orderNodes[0], params: {} } },
          { id: "if_1", type: "logic.if", position: { x: 320, y: 160 },
            data: { label: s.orderNodes[1], params: { left: "{{ trigger.body.total }}", operator: "gt", right: "5000" } } },
          { id: "telegram_1", type: "telegram.send", position: { x: 620, y: 60 },
            data: { label: s.orderNodes[2], params: { chat_id: "", text: s.orderBig } } },
          { id: "set_1", type: "data.set", position: { x: 620, y: 270 },
            data: { label: s.orderNodes[3], params: { fields: [{ key: "note", value: s.orderNote }] } } },
        ],
        edges: [
          { id: "e1", source: "webhook_1", target: "if_1" },
          { id: "e2", source: "if_1", target: "telegram_1", sourceHandle: "true" },
          { id: "e3", source: "if_1", target: "set_1", sourceHandle: "false" },
        ],
      },
    },
    {
      name: s.wx[0], description: s.wx[1],
      graph: {
        nodes: [
          { id: "manual_1", type: "trigger.manual", position: { x: 40, y: 140 }, data: { label: s.wxNodes[0], params: {} } },
          { id: "http_1", type: "http.request", position: { x: 330, y: 140 },
            data: { label: s.wxNodes[1], params: { method: "GET",
              url: "https://api.open-meteo.com/v1/forecast?latitude=42.87&longitude=74.59&current=temperature_2m,wind_speed_10m",
              headers: {}, body: null, fail_on_error: true } } },
          { id: "set_1", type: "data.set", position: { x: 620, y: 140 },
            data: { label: s.wxNodes[2], params: { fields: [
              { key: "temp", value: "{{ nodes.http_1.body.current.temperature_2m }}" },
              { key: "summary", value: s.wxSummary },
            ] } } },
        ],
        edges: [
          { id: "e1", source: "manual_1", target: "http_1" },
          { id: "e2", source: "http_1", target: "set_1" },
        ],
      },
    },
  ];
}
