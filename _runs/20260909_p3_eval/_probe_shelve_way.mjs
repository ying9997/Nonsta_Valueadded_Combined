import fs from "fs";

const cookies = JSON.parse(
  fs.readFileSync("D:/DA/AI_EXPERT/TOM/共享认证/playwright_cookies.json", "utf8"),
);
const header = cookies
  .filter((c) => c.name && c.value)
  .map((c) => `${c.name}=${c.value}`)
  .join("; ");

const urls = [
  "https://cnomstom.winit.com.cn/VasOrder/detail/isFill/Y/orderNo/VASC000000315774/isView/N",
  "https://cnomstom.winit.com.cn/VasOrder/detail/isFill/Y/orderNo/VASC000000315774/isView/Y",
];

function parseSelect(html, name) {
  const re = new RegExp(`<select[^>]*name=["']${name}["'][^>]*>([\\s\\S]*?)</select>`, "i");
  const m = html.match(re);
  if (!m) return null;
  return [...m[1].matchAll(/<option[^>]*value=["']([^"']*)["'][^>]*>([\s\S]*?)<\/option>/gi)].map((x) => ({
    value: x[1].trim(),
    label: x[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim(),
    selected: /selected/i.test(x[0]),
  }));
}

for (const url of urls) {
  const res = await fetch(url, {
    headers: { Cookie: header, "User-Agent": "Mozilla/5.0" },
    redirect: "follow",
  });
  const html = await res.text();
  const login = /cniam|#\/login/i.test(res.url) || /cniam|#\/login/i.test(html.slice(0, 2000));
  const out = {
    url,
    status: res.status,
    finalHost: new URL(res.url).host,
    login,
    htmlLen: html.length,
    shelveWayCode: parseSelect(html, "shelveWayCode"),
    idx: html.indexOf("shelveWayCode"),
  };
  console.log(JSON.stringify(out, null, 2));
}
