# 火山方舟 Doubao Seed 2.0：本机调用说明

探测时间：2026-09-17。密钥不写进本文件。

控制台模型页（你给的）：  
https://console.volcengine.com/ark/region:cn-beijing/model/detail?name=doubao-seed-2-0-lite

官方能力说明（全模态：图/视频/音频/文本）：  
https://developer.volcengine.com/articles/7636596381943070763

## 1. 怎么「生成 / 开通」才能调

火山方舟现在对 **Seed 2.0 预置模型** 可以直接用「模型 ID」调，不必先建一个 `ep-` 推理接入点。本次探测就是直接 POST `chat/completions`，`model` 填带日期的 ID。

控制台展示名 `doubao-seed-2-0-lite` **不能当 model 参数**。本次实测：

- `doubao-seed-2-0-lite` → **404**（名字不带版本号）
- `doubao-seed-2-0-lite-260428` → **200**（对应控制台这页的新版本）
- `doubao-seed-2-0-lite-260215` → **200**（2 月旧版，也能看图）

密钥：本机用户目录 `~/.secrets/volcengine-ark.env` 里的 `ARK_API_KEY`（不要提交 Git、不要贴进 README）。

## 2. 调用地址

| 项 | 值 |
|---|---|
| Base URL | `https://ark.cn-beijing.volces.com/api/v3` |
| Chat | `POST /chat/completions` |
| 模型列表 | `GET /models` |
| 鉴权 | `Authorization: Bearer $ARK_API_KEY` |
| 协议 | OpenAI Chat Completions 兼容 |

列出的模型 ≠ 这把密钥都能调。`GET /models` 里有很多 1.5 / 1.6 / vision 名字，实际 chat 会 404/403。**以 chat 实测为准。**

## 3. 本密钥实测（文本 + 看图）

样例图：`https://ark-project.tos-cn-beijing.ivolces.com/images/view.jpeg`

| model | 文本 | 看图 | 说明 |
|---|---|---|---|
| `doubao-seed-2-0-lite-260428` | 可用 | 可用 | **推荐。** 控制台 lite 新版本，官方称全模态 |
| `doubao-seed-2-0-lite-260215` | 可用 | 可用 | lite 旧版本，也能看图 |
| `doubao-seed-2-0-pro-260215` | 可用 | 可用 | 更贵、更慢 |
| `doubao-seed-2-0-lite` | 404 | — | 不要用无日期名 |
| `doubao-seed-2-0-pro` | 404 | — | 同上 |
| `doubao-seed-2-0-mini` | 404 | — | 同上 |
| `doubao-seed-2-0-mini-260215` | 403 | — | 列表有，这把密钥没权限 |
| `doubao-seed-1-6-vision-250815` | 404 | — | 列表有，密钥调不通 |
| `doubao-1-5-vision-pro-32k-250115` | 404 | — | 列表有，密钥调不通 |

看图成功时模型能正确描述湖面、橙船、针叶林、雪山（不是胡编）。lite-260428 看图约 10 秒，带思考 token。

原始记录：`probe-raw.json`。复跑：

```powershell
# 先有 ARK_API_KEY
node internal-review-copilot/_runs/20260917_ark_multimodal_probe/probe-ark-models.mjs
```

## 4. 文本调用

```bash
curl https://ark.cn-beijing.volces.com/api/v3/chat/completions ^
  -H "Authorization: Bearer %ARK_API_KEY%" ^
  -H "Content-Type: application/json" ^
  -d "{\"model\":\"doubao-seed-2-0-lite-260428\",\"messages\":[{\"role\":\"user\",\"content\":\"只回复两个字：可用\"}],\"max_tokens\":32,\"temperature\":0}"
```

Python（OpenAI SDK）：

```python
from openai import OpenAI
import os

client = OpenAI(
    api_key=os.environ["ARK_API_KEY"],
    base_url="https://ark.cn-beijing.volces.com/api/v3",
)
r = client.chat.completions.create(
    model="doubao-seed-2-0-lite-260428",
    messages=[{"role": "user", "content": "只回复两个字：可用"}],
    max_tokens=32,
    temperature=0,
)
print(r.choices[0].message.content)
```

Node：

```js
const r = await fetch("https://ark.cn-beijing.volces.com/api/v3/chat/completions", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${process.env.ARK_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "doubao-seed-2-0-lite-260428",
    messages: [{ role: "user", content: "只回复两个字：可用" }],
    max_tokens: 32,
    temperature: 0,
  }),
});
```

## 5. 看图调用（给 L2.5 认标签/操作说明图用）

`messages[].content` 必须是数组，同时带 `text` 和 `image_url`。图片可以是公网 HTTPS，或 `data:image/jpeg;base64,...`。

```json
{
  "model": "doubao-seed-2-0-lite-260428",
  "messages": [
    {
      "role": "user",
      "content": [
        { "type": "text", "text": "这张图是标签还是操作说明？把能读到的文字原样列出来。" },
        { "type": "image_url", "image_url": { "url": "https://example.com/label.jpg" } }
      ]
    }
  ],
  "max_tokens": 800,
  "temperature": 0
}
```

飞书话题里的图要先用飞书下载接口拿到文件，再转成 URL 或 base64。**当前 Copilot 没有这一步。**

Excel / PDF：这次只测了「公网图片 URL」。表格/PDF 是否要先抽文本再喂模型，还没测，不要假设 lite 能直接吃任意文件二进制。

## 6. 和现有 Copilot LLM 的差别

现网完整性检查走 `lib/llm-client.ts` 的 `LITELLM_*`，只发纯文本 `content: string`。  
要认图必须改成多模态 content 数组，并换 `doubao-seed-2-0-lite-260428`（或继续走 LiteLLM 但后端接这个模型）。**本回合未改。**
