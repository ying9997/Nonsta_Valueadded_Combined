export type FmsRegion = "CN" | "US" | "EU" | "AU" | "DEFAULT";

export type FmsCredential = {
  fmsUrl: string;
  clientId: string;
  clientSecret: string;
  edsUser: string;
  edsToken: string;
};

export type FmsRuntimeConfig = Partial<Record<FmsRegion, FmsCredential>>;

export type FmsTokenUrlResult = {
  rawUrl: string;
  signedUrl: string;
  region: FmsRegion | "";
  status: "ok" | "not_fms" | "missing_config" | "invalid_url";
};

const FMS_REGIONS: FmsRegion[] = ["CN", "US", "EU", "AU"];

function fmsEnv(name: string, fallback: string): string {
  if (typeof process !== "undefined" && process.env?.[name]) {
    return String(process.env[name]).trim();
  }
  return fallback;
}

function fmsPlaceholder(region: FmsRegion, name: "CLIENT_KEY" | "CLIENT_SECRET" | "USER_KEY" | "USER_SECRET"): string {
  const placeholders: Record<FmsRegion, Record<"CLIENT_KEY" | "CLIENT_SECRET" | "USER_KEY" | "USER_SECRET", string>> = {
    CN: {
      CLIENT_KEY: "__FMS_CN_CLIENT_KEY__",
      CLIENT_SECRET: "__FMS_CN_CLIENT_SECRET__",
      USER_KEY: "__FMS_CN_USER_KEY__",
      USER_SECRET: "__FMS_CN_USER_SECRET__",
    },
    US: {
      CLIENT_KEY: "__FMS_US_CLIENT_KEY__",
      CLIENT_SECRET: "__FMS_US_CLIENT_SECRET__",
      USER_KEY: "__FMS_US_USER_KEY__",
      USER_SECRET: "__FMS_US_USER_SECRET__",
    },
    AU: {
      CLIENT_KEY: "__FMS_AU_CLIENT_KEY__",
      CLIENT_SECRET: "__FMS_AU_CLIENT_SECRET__",
      USER_KEY: "__FMS_AU_USER_KEY__",
      USER_SECRET: "__FMS_AU_USER_SECRET__",
    },
    EU: {
      CLIENT_KEY: "__FMS_EU_CLIENT_KEY__",
      CLIENT_SECRET: "__FMS_EU_CLIENT_SECRET__",
      USER_KEY: "__FMS_EU_USER_KEY__",
      USER_SECRET: "__FMS_EU_USER_SECRET__",
    },
    DEFAULT: {
      CLIENT_KEY: "__FMS_US_CLIENT_KEY__",
      CLIENT_SECRET: "__FMS_US_CLIENT_SECRET__",
      USER_KEY: "__FMS_US_USER_KEY__",
      USER_SECRET: "__FMS_US_USER_SECRET__",
    },
  };
  return placeholders[region][name];
}

function fmsCredentialFromEnv(region: FmsRegion, defaultUrl: string): FmsCredential {
  return {
    fmsUrl: fmsEnv(`FMS_${region}_URL`, defaultUrl).replace(/\/+$/, ""),
    clientId: fmsEnv(`FMS_${region}_CLIENT_KEY`, fmsPlaceholder(region, "CLIENT_KEY")),
    clientSecret: fmsEnv(`FMS_${region}_CLIENT_SECRET`, fmsPlaceholder(region, "CLIENT_SECRET")),
    edsUser: fmsEnv(`FMS_${region}_USER_KEY`, fmsPlaceholder(region, "USER_KEY")),
    edsToken: fmsEnv(`FMS_${region}_USER_SECRET`, fmsPlaceholder(region, "USER_SECRET")),
  };
}

export function defaultFmsRuntimeConfig(): FmsRuntimeConfig {
  const us = fmsCredentialFromEnv("US", "https://usfmsstream.winit.com.cn");
  return {
    CN: fmsCredentialFromEnv("CN", "https://cnfmsstream.winit.com.cn"),
    US: us,
    AU: fmsCredentialFromEnv("AU", "https://aufmsstream.winit.com.cn"),
    EU: fmsCredentialFromEnv("EU", "https://eufmsstream.winit.com.cn"),
    DEFAULT: us,
  };
}

function fmsIsConfigured(value: string): boolean {
  const s = value.trim();
  return Boolean(s) && !/^__FMS_[A-Z]+_[A-Z_]+__$/.test(s);
}

function fmsHasCredential(credential: FmsCredential | undefined): credential is FmsCredential {
  return Boolean(
    credential &&
      fmsIsConfigured(credential.fmsUrl) &&
      fmsIsConfigured(credential.clientId) &&
      fmsIsConfigured(credential.clientSecret) &&
      fmsIsConfigured(credential.edsUser) &&
      fmsIsConfigured(credential.edsToken)
  );
}

function fmsParseUrl(rawUrl: string): { isAbsolute: boolean; host: string; path: string } | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) {
    const match = trimmed.match(/^https?:\/\/([^/?#]+)([^?#]*)/i);
    if (!match) return null;
    return {
      isAbsolute: true,
      host: match[1] ?? "",
      path: match[2] || "/",
    };
  }
  const pathOnly = trimmed.split(/[?#]/)[0] ?? "";
  return { isAbsolute: false, host: "", path: pathOnly.startsWith("/") ? pathOnly : `/${pathOnly}` };
}

function fmsRegionByUrl(rawUrl: string, config: FmsRuntimeConfig): FmsRegion | "" {
  const trimmed = rawUrl.trim();
  for (const region of FMS_REGIONS) {
    const cfgUrl = config[region]?.fmsUrl?.replace(/\/+$/, "");
    if (cfgUrl && trimmed.startsWith(cfgUrl)) return region;
  }

  const parsed = fmsParseUrl(trimmed);
  if (parsed?.isAbsolute) {
    const match = parsed.host.match(/^([a-z]+)fmsstream\.winit\.com/i);
    const region = match?.[1]?.toUpperCase() as FmsRegion | undefined;
    if (region && FMS_REGIONS.includes(region)) return region;
    return "";
  }

  return config.DEFAULT ? "DEFAULT" : "";
}

export function isFmsUrl(rawUrl: unknown, config: FmsRuntimeConfig = defaultFmsRuntimeConfig()): rawUrl is string {
  return typeof rawUrl === "string" && fmsRegionByUrl(rawUrl, config) !== "";
}

function fmsUrlForSigning(rawUrl: string, credential: FmsCredential): string {
  const parsed = fmsParseUrl(rawUrl);
  const path = parsed?.path || "/";
  const base = credential.fmsUrl.replace(/\/+$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

function fmsObjectUri(fileUrl: string): string {
  return fmsParseUrl(fileUrl)?.path || "/";
}

function fmsUtf8Bytes(input: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < input.length; i++) {
    let code = input.charCodeAt(i);
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code >= 0xd800 && code <= 0xdbff && i + 1 < input.length) {
      const next = input.charCodeAt(++i);
      code = 0x10000 + ((code & 0x3ff) << 10) + (next & 0x3ff);
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f)
      );
    } else {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    }
  }
  return bytes;
}

function fmsLeftRotate(value: number, bits: number): number {
  return ((value << bits) | (value >>> (32 - bits))) >>> 0;
}

function fmsSha1(bytes: number[]): number[] {
  const message = bytes.slice();
  const bitLength = message.length * 8;
  message.push(0x80);
  while ((message.length % 64) !== 56) message.push(0);
  for (let i = 7; i >= 0; i--) message.push((bitLength / Math.pow(2, i * 8)) & 0xff);

  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;

  for (let offset = 0; offset < message.length; offset += 64) {
    const w = new Array<number>(80);
    for (let i = 0; i < 16; i++) {
      const j = offset + i * 4;
      w[i] = ((message[j]! << 24) | (message[j + 1]! << 16) | (message[j + 2]! << 8) | message[j + 3]!) >>> 0;
    }
    for (let i = 16; i < 80; i++) {
      w[i] = fmsLeftRotate((w[i - 3]! ^ w[i - 8]! ^ w[i - 14]! ^ w[i - 16]!) >>> 0, 1);
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;

    for (let i = 0; i < 80; i++) {
      let f = 0;
      let k = 0;
      if (i < 20) {
        f = (b & c) | (~b & d);
        k = 0x5a827999;
      } else if (i < 40) {
        f = b ^ c ^ d;
        k = 0x6ed9eba1;
      } else if (i < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f1bbcdc;
      } else {
        f = b ^ c ^ d;
        k = 0xca62c1d6;
      }
      const temp = (fmsLeftRotate(a, 5) + f + e + k + w[i]!) >>> 0;
      e = d;
      d = c;
      c = fmsLeftRotate(b, 30);
      b = a;
      a = temp;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
  }

  const out: number[] = [];
  for (const h of [h0, h1, h2, h3, h4]) {
    out.push((h >>> 24) & 0xff, (h >>> 16) & 0xff, (h >>> 8) & 0xff, h & 0xff);
  }
  return out;
}

function fmsHmacSha1Hex(key: string, message: string): string {
  let keyBytes = fmsUtf8Bytes(key);
  if (keyBytes.length > 64) keyBytes = fmsSha1(keyBytes);
  while (keyBytes.length < 64) keyBytes.push(0);

  const outer = keyBytes.map((b) => b ^ 0x5c);
  const inner = keyBytes.map((b) => b ^ 0x36);
  const digest = fmsSha1(inner.concat(fmsUtf8Bytes(message)));
  return fmsSha1(outer.concat(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

function fmsBase64Utf8(input: string): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const bytes = fmsUtf8Bytes(input);
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i]!;
    const b = bytes[i + 1];
    const c = bytes[i + 2];
    out += alphabet[a >> 2];
    out += alphabet[((a & 3) << 4) | ((b ?? 0) >> 4)];
    out += b === undefined ? "=" : alphabet[((b & 15) << 2) | ((c ?? 0) >> 6)];
    out += c === undefined ? "=" : alphabet[c & 63];
  }
  return out;
}

export function buildFmsTokenUrl(
  rawUrl: string,
  config: FmsRuntimeConfig = defaultFmsRuntimeConfig(),
  nowMs = Date.now()
): FmsTokenUrlResult {
  const parsed = fmsParseUrl(rawUrl);
  if (!parsed) return { rawUrl, signedUrl: rawUrl, region: "", status: "invalid_url" };

  const region = fmsRegionByUrl(rawUrl, config);
  if (!region) return { rawUrl, signedUrl: rawUrl, region: "", status: "not_fms" };

  const credential = config[region] ?? config.DEFAULT;
  if (!fmsHasCredential(credential)) {
    return { rawUrl, signedUrl: rawUrl, region, status: "missing_config" };
  }

  const fileUrl = fmsUrlForSigning(rawUrl, credential);
  const objectUri = fmsObjectUri(fileUrl);
  const date = Math.floor(nowMs);
  const canonical = `GET\n${objectUri}?clientId=${credential.clientId}&date=${date}&user=${credential.edsUser}`;
  const clientSign = fmsHmacSha1Hex(credential.clientSecret, canonical);
  const userSign = fmsHmacSha1Hex(credential.edsToken, canonical);
  const tokenContent =
    `${objectUri}?clientSign=${clientSign}` +
    `&userSign=${userSign}` +
    `&version=V1.0` +
    `&date=${date}` +
    `&user=${credential.edsUser}` +
    `&clientId=${credential.clientId}`;
  return {
    rawUrl,
    signedUrl: `${fileUrl}?token=${fmsBase64Utf8(tokenContent)}`,
    region,
    status: "ok",
  };
}

function fmsSignedKey(key: string): string {
  if (key === "fileUrl") return "signedFileUrl";
  if (key === "url") return "signedUrl";
  return `signed${key.charAt(0).toUpperCase()}${key.slice(1)}`;
}

function fmsSignStatusKey(key: string): string {
  if (key === "fileUrl") return "fileUrlSignStatus";
  if (key === "url") return "urlSignStatus";
  return `${key}SignStatus`;
}

function fmsShouldSignScalarKey(key: string): boolean {
  return key === "fileUrl" || key === "url" || /url$/i.test(key);
}

export function signFmsUrlDeep(
  value: unknown,
  config: FmsRuntimeConfig = defaultFmsRuntimeConfig(),
  nowMs = Date.now()
): unknown {
  if (Array.isArray(value)) return value.map((item) => signFmsUrlDeep(item, config, nowMs));
  if (!value || typeof value !== "object") return value;

  const source = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};

  for (const [key, raw] of Object.entries(source)) {
    out[key] = signFmsUrlDeep(raw, config, nowMs);
    if (fmsShouldSignScalarKey(key) && typeof raw === "string") {
      const signed = buildFmsTokenUrl(raw, config, nowMs);
      if (signed.status === "ok") {
        out[fmsSignedKey(key)] = signed.signedUrl;
      } else if (signed.status === "missing_config") {
        out[fmsSignStatusKey(key)] = signed.status;
      }
    }
  }

  if (Array.isArray(source.unusualFiles)) {
    const signedUnusualFiles: string[] = [];
    const statuses: string[] = [];
    for (const raw of source.unusualFiles) {
      if (typeof raw !== "string") continue;
      const signed = buildFmsTokenUrl(raw, config, nowMs);
      if (signed.status === "ok") signedUnusualFiles.push(signed.signedUrl);
      else if (signed.status === "missing_config") statuses.push(signed.status);
    }
    if (signedUnusualFiles.length > 0) out.signedUnusualFiles = signedUnusualFiles;
    if (statuses.length > 0) out.unusualFilesSignStatus = Array.from(new Set(statuses)).join(",");
  }

  return out;
}
