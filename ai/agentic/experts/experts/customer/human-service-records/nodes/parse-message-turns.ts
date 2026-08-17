/**
 * 节点：parse-message-turns
 * 将 messages 文本解析为消息级 turn，支持后续行并入上一条消息。
 */

interface HumanServiceRecordLite {
  recordId?: string;
  conversationId?: string;
  conversationStartedAt?: string;
  messages?: string;
  agentName?: string;
  channel?: string;
  categories?: string[];
}

interface MessageTurn {
  recordId: string;
  conversationId: string;
  conversationStartedAt: string;
  timestamp: string;
  role: "agent" | "customer" | "other";
  speaker: string;
  text: string;
  agentName: string;
  channel: string;
  categories: string[];
}

function roleFromSpeaker(speaker: string): "agent" | "customer" | "other" {
  const s = speaker.toLowerCase();
  if (/客服|坐席|agent|service/.test(s)) return "agent";
  if (/客户|用户|customer|user/.test(s)) return "customer";
  return "other";
}

function asRecordArray(v: unknown): HumanServiceRecordLite[] {
  if (!v || typeof v !== "object") return [];
  const records = (v as { records?: unknown }).records;
  return Array.isArray(records) ? records as HumanServiceRecordLite[] : [];
}

function parseRecord(record: HumanServiceRecordLite): MessageTurn[] {
  const text = String(record.messages ?? "");
  const normalizedText = text.replace(/(?!^)(\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}]\s*)/g, "\n$1");
  const lines = normalizedText.split(/\r?\n/);
  const turns: MessageTurn[] = [];
  const re = /^\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})]\s*([^:：]+)[:：]\s*(.*)$/;
  for (const line of lines) {
    const m = re.exec(line);
    if (m) {
      const speaker = String(m[2] ?? "").trim();
      turns.push({
        recordId: String(record.recordId ?? ""),
        conversationId: String(record.conversationId || record.recordId || ""),
        conversationStartedAt: String(record.conversationStartedAt ?? ""),
        timestamp: String(m[1] ?? ""),
        role: roleFromSpeaker(speaker),
        speaker,
        text: String(m[3] ?? "").trim(),
        agentName: String(record.agentName ?? ""),
        channel: String(record.channel ?? ""),
        categories: Array.isArray(record.categories) ? record.categories.map((x) => String(x)) : [],
      });
      continue;
    }
    const tail = line.trim();
    if (tail && turns.length > 0) {
      const last = turns[turns.length - 1]!;
      last.text = `${last.text}\n${tail}`.trim();
    }
  }
  return turns;
}

async function main({ params }: { params: Record<string, unknown> }) {
  const records = asRecordArray(params.humanServiceRecords);
  const messageTurns = records.flatMap((record) => parseRecord(record));
  return {
    messageTurns,
    parseSummary: {
      recordCount: records.length,
      messageTurnCount: messageTurns.length,
      parseStatus: records.length === 0 ? "no_records" : messageTurns.length === 0 ? "no_messages" : "ok",
    },
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("parse-message-turns")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((r) => process.stdout.write(JSON.stringify(r)))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
