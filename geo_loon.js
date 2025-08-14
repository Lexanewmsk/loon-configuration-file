// Loon: Проверка геолокации узла
// Источник идеи — скрипт XIAO_KOP, адаптация для Loon

const url = "http://ip-api.com/json/";

// Проверка, есть ли информация о запуске с узлом
let nodeName = $environment?.params?.node || null;

if (!nodeName) {
  $done({ title: "Ошибка", message: "Не выбран узел. Запусти скрипт через Tools с указанием узла." });
} else {
  $httpClient.get({ url: url, node: nodeName }, (error, response, data) => {
    if (error) {
      $done({ title: "Гео IP", message: "❌ Ошибка запроса" });
    } else {
      try {
        const res = JSON.parse(data);
        const msg = [
          `🌐 IP: ${res.query || "N/A"}`,
          `🏢 ASN: ${res.as || "N/A"}`,
          `🏛 Организация: ${res.org || "N/A"}`,
          `📡 ISP: ${res.isp || "N/A"}`,
          `🗺 Страна: ${res.country || "N/A"} ${flags.get(res.countryCode) || ""}`,
          `🏙 Город: ${res.city || "N/A"}`,
          `📍 Координаты: ${res.lat}, ${res.lon}`,
          `🔹 Узел: ${nodeName}`
        ].join("\n");

        $done({ title: "Геолокация узла", message: msg });
      } catch (e) {
        $done({ title: "Гео IP", message: "❌ Ошибка обработки данных" });
      }
    }
  });
}

// Карта флагов (сокращённый набор)
const flags = new Map([
  ["US", "🇺🇸"], ["RU", "🇷🇺"], ["CN", "🇨🇳"], ["JP", "🇯🇵"], ["KR", "🇰🇷"],
  ["DE", "🇩🇪"], ["FR", "🇫🇷"], ["GB", "🇬🇧"], ["NL", "🇳🇱"], ["SG", "🇸🇬"]
]);
