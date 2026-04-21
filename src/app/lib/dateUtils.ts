/**
 * 后端 SQLite 存储的是 UTC 时间，FastAPI 序列化时不带 Z 或 +00:00。
 * 此函数统一将这类字符串标记为 UTC，再转换为北京时间 (Asia/Shanghai) 显示。
 */
function toBeijingDate(utcStr: string): Date {
  // 已有时区信息则直接用；否则补 Z 标记为 UTC
  const s = utcStr.replace(' ', 'T');
  const marked = s.endsWith('Z') || s.includes('+') || s.includes('-', 10) ? s : s + 'Z';
  return new Date(marked);
}

const SH: Intl.DateTimeFormatOptions = { timeZone: 'Asia/Shanghai' };

/** 返回北京时间的 HH:MM 字符串，用于聊天气泡等 */
export function fmtTime(utcStr: string): string {
  const d = toBeijingDate(utcStr);
  return d.toLocaleTimeString('zh-CN', { ...SH, hour: '2-digit', minute: '2-digit', hour12: false });
}

/** 返回北京时间的 M/D HH:MM，用于历史记录列表 */
export function fmtShort(utcStr: string): string {
  const d = toBeijingDate(utcStr);
  const month = d.toLocaleDateString('zh-CN', { ...SH, month: 'numeric' }).replace('月', '');
  const day   = d.toLocaleDateString('zh-CN', { ...SH, day:   'numeric' }).replace('日', '');
  const time  = d.toLocaleTimeString('zh-CN', { ...SH, hour: '2-digit', minute: '2-digit', hour12: false });
  return `${month}/${day} ${time}`;
}

/** 返回北京时间的完整日期时间，用于管理端 */
export function fmtFull(utcStr: string | null | undefined): string {
  if (!utcStr) return '从未活跃';
  const d = toBeijingDate(utcStr);
  if (isNaN(d.getTime())) return utcStr;
  return d.toLocaleString('zh-CN', {
    ...SH,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

/** 返回北京时间的 YYYY/M/D HH:MM，用于基因/健康等 */
export function fmtLong(utcStr: string): string {
  const d = toBeijingDate(utcStr);
  return d.toLocaleString('zh-CN', {
    ...SH,
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}
