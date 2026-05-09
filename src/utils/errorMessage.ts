function cleanText(value: unknown) {
  return String(value ?? "")
    .replace(/&quot;/g, "\"")
    .replace(/&#34;/g, "\"")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseCloudflareJson(text: string) {
  const jsonStart = text.indexOf("{");
  const jsonEnd = text.lastIndexOf("}");
  if (jsonStart < 0 || jsonEnd <= jsonStart) return null;
  try {
    return JSON.parse(text.slice(jsonStart, jsonEnd + 1));
  } catch {
    return null;
  }
}

function cloudflareSummaryFromJson(raw: string, data: any) {
  const status = data?.status || data?.error_code || raw.match(/状态码[:：]\s*(\d+)/)?.[1] || "";
  const title = data?.title || (status ? `Error ${status}` : "Cloudflare error");
  const zone = data?.zone ? `，域名：${data.zone}` : "";
  const ray = data?.ray_id ? `，Ray ID：${data.ray_id}` : "";
  const retry = data?.retry_after ? `，建议 ${data.retry_after}s 后重试` : "";
  return `图片请求失败：上游网关异常（${title}${zone}${ray}${retry}）。可稍后重试，或切换到其他出图模型。`;
}

function cloudflareSummaryFromHtml(raw: string) {
  if (!/(Cloudflare|Bad gateway|Error code 50\d|502|524)/i.test(raw)) return "";
  const status = raw.match(/Error code\s*(\d+)/i)?.[1] || raw.match(/状态码[:：]\s*(\d+)/)?.[1] || raw.match(/\b(50[0-9]|524)\b/)?.[1] || "";
  const title = raw.match(/<title>\s*([^<]+?)\s*<\/title>/i)?.[1] || (status ? `Error ${status}` : "Cloudflare error");
  const ray = raw.match(/Cloudflare Ray ID:\s*<\/span>\s*<strong[^>]*>\s*([^<]+)\s*<\/strong>/i)?.[1] || raw.match(/Ray ID:\s*([a-f0-9]+)/i)?.[1] || "";
  const host = raw.match(/<span[^>]*>\s*(airelayzone\.com|[^<]+\.com)\s*<\/span>\s*<h3[^>]*>\s*Host\s*<\/h3>/i)?.[1] || raw.match(/campaign=([^"&]+\.com)/i)?.[1] || "";
  return `图片请求失败：上游网关异常（${cleanText(title)}${host ? `，域名：${host}` : ""}${ray ? `，Ray ID：${ray}` : ""}）。可稍后重试，或切换到其他出图模型。`;
}

export function formatErrorMessage(error: unknown, fallback = "操作失败") {
  const raw =
    typeof error === "string"
      ? error
      : (error as any)?.message || (error as any)?.msg || (error as any)?.error?.message || (error as any)?.response?.data?.message || "";
  if (!raw) return fallback;

  const text = String(raw);
  const cloudflareJson = parseCloudflareJson(text);
  if (cloudflareJson?.cloudflare_error || /origin_(bad_gateway|response_timeout)/i.test(cloudflareJson?.error_name || "")) {
    return cloudflareSummaryFromJson(text, cloudflareJson);
  }

  const cloudflareHtml = cloudflareSummaryFromHtml(text);
  if (cloudflareHtml) return cloudflareHtml;

  const cleaned = cleanText(text);
  if (!cleaned) return fallback;
  return cleaned.length > 220 ? `${cleaned.slice(0, 220)}...` : cleaned;
}

export function normalizeErrorPayload<T>(payload: T): T {
  if (!payload || typeof payload !== "object") return payload;
  if (!("message" in payload)) return payload;
  return {
    ...(payload as Record<string, unknown>),
    message: formatErrorMessage((payload as Record<string, unknown>).message),
  } as T;
}
