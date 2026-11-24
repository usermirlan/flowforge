import type { Graph } from "./types";

/** Starter workflows shown on the dashboard. All use free APIs only. */
export const TEMPLATES: { name: string; description: string; graph: Graph }[] = [
  {
    name: "Валюта курсу → AI → Telegram",
    description: "Ар күнү саат 9да USD/KGS курсун алып, AI кыскача түшүндүрмө жазат жана Telegram'га жиберет.",
    graph: {
      nodes: [
        { id: "schedule_1", type: "trigger.schedule", position: { x: 40, y: 140 },
          data: { label: "Ар күнү 09:00", params: { cron: "0 9 * * *", timezone: "Asia/Bishkek" } } },
        { id: "http_1", type: "http.request", position: { x: 330, y: 140 },
          data: { label: "Курсту алуу", params: { method: "GET", url: "https://open.er-api.com/v6/latest/USD", headers: {}, body: null, fail_on_error: true } } },
        { id: "ai_1", type: "ai.prompt", position: { x: 620, y: 140 },
          data: { label: "Кыскача жазуу", params: {
            system: "Сен кыргыз тилинде 2 сүйлөм менен жооп бересиң.",
            prompt: "Бүгүнкү курс: 1 USD = {{ nodes.http_1.body.rates.KGS }} KGS, 1 USD = {{ nodes.http_1.body.rates.RUB }} RUB. Кыскача маалымат жаз.",
            json_output: false } } },
        { id: "telegram_1", type: "telegram.send", position: { x: 910, y: 140 },
          data: { label: "Telegram'га", params: { chat_id: "", text: "💱 {{ nodes.ai_1.text }}" } } },
      ],
      edges: [
        { id: "e1", source: "schedule_1", target: "http_1" },
        { id: "e2", source: "http_1", target: "ai_1" },
        { id: "e3", source: "ai_1", target: "telegram_1" },
      ],
    },
  },
  {
    name: "Заказ webhook → шарт → билдирүү",
    description: "Сайттан заказ келет; суммасы 5000 сомдон ашса — менеджерге Telegram, болбосо жөн гана жазуу.",
    graph: {
      nodes: [
        { id: "webhook_1", type: "trigger.webhook", position: { x: 40, y: 160 }, data: { label: "Жаңы заказ", params: {} } },
        { id: "if_1", type: "logic.if", position: { x: 320, y: 160 },
          data: { label: "Чоң заказбы?", params: { left: "{{ trigger.body.total }}", operator: "gt", right: "5000" } } },
        { id: "telegram_1", type: "telegram.send", position: { x: 620, y: 60 },
          data: { label: "Менеджерге", params: { chat_id: "", text: "🔥 Чоң заказ #{{ trigger.body.id }}: {{ trigger.body.total }} сом" } } },
        { id: "set_1", type: "data.set", position: { x: 620, y: 270 },
          data: { label: "Кадимки заказ", params: { fields: [{ key: "note", value: "Заказ #{{ trigger.body.id }} кабыл алынды" }] } } },
      ],
      edges: [
        { id: "e1", source: "webhook_1", target: "if_1" },
        { id: "e2", source: "if_1", target: "telegram_1", sourceHandle: "true" },
        { id: "e3", source: "if_1", target: "set_1", sourceHandle: "false" },
      ],
    },
  },
  {
    name: "Кол менен: API → маалымат",
    description: "Эң жөнөкөй мисал: иштетүү баскычы → ачык API'ден маалымат → керектүү талааларды тандоо.",
    graph: {
      nodes: [
        { id: "manual_1", type: "trigger.manual", position: { x: 40, y: 140 }, data: { label: "Иштетүү", params: {} } },
        { id: "http_1", type: "http.request", position: { x: 330, y: 140 },
          data: { label: "Аба ырайы (Бишкек)", params: { method: "GET",
            url: "https://api.open-meteo.com/v1/forecast?latitude=42.87&longitude=74.59&current=temperature_2m,wind_speed_10m",
            headers: {}, body: null, fail_on_error: true } } },
        { id: "set_1", type: "data.set", position: { x: 620, y: 140 },
          data: { label: "Натыйжа", params: { fields: [
            { key: "temp", value: "{{ nodes.http_1.body.current.temperature_2m }}" },
            { key: "summary", value: "Бишкекте азыр {{ nodes.http_1.body.current.temperature_2m }}°C" },
          ] } } },
      ],
      edges: [
        { id: "e1", source: "manual_1", target: "http_1" },
        { id: "e2", source: "http_1", target: "set_1" },
      ],
    },
  },
];
