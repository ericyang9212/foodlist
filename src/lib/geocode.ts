// 用 OpenStreetMap Nominatim 把地址/店名轉成經緯度（免費、不需 key）
// 也嘗試從 Google Maps 連結直接解析座標（更準、零延遲）

export interface GeoResult {
  lat: number;
  lng: number;
}

// 從 Google Maps URL 解析座標：@lat,lng 或 !3dlat!4dlng 或 q=lat,lng
export function parseLatLngFromMapsUrl(url?: string): GeoResult | null {
  if (!url) return null;
  try {
    // @25.033,121.564
    const at = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (at) return { lat: parseFloat(at[1]), lng: parseFloat(at[2]) };

    // !3d25.033!4d121.564
    const bang = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    if (bang) return { lat: parseFloat(bang[1]), lng: parseFloat(bang[2]) };

    // ?q=25.033,121.564  或  query=25.033,121.564
    const q = url.match(/[?&](?:q|query|ll)=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (q) return { lat: parseFloat(q[1]), lng: parseFloat(q[2]) };
  } catch {
    // ignore
  }
  return null;
}

let lastCall = 0;

// Nominatim 政策：最多 1 req/s。簡單節流。
async function throttle() {
  const now = Date.now();
  const wait = Math.max(0, 1100 - (now - lastCall));
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastCall = Date.now();
}

export async function geocodeText(query: string): Promise<GeoResult | null> {
  if (!query.trim()) return null;
  await throttle();
  try {
    // countrycodes=tw 限制只在台灣搜尋，避免座標跑到中國等地
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=tw&accept-language=zh-TW&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (data.length === 0) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch (e) {
    console.warn('geocodeText failed', e);
    return null;
  }
}

// 綜合解析一家店的座標
// 最可靠：Google Maps 連結內的座標；其次才用地址文字查（不保證準）
export async function resolveRestaurantLocation(input: {
  name?: string;
  city?: string;
  area?: string;
  address?: string;
  googleMapsUrl?: string;
}): Promise<GeoResult | null> {
  // 1. 連結裡有精確座標最準
  const fromUrl = parseLatLngFromMapsUrl(input.googleMapsUrl);
  if (fromUrl) return fromUrl;

  // 2. 文字查必須至少有縣市，否則容易亂定位（連鎖店亂選、跑到別處），寧可不定位
  if (!input.city) return null;

  const candidates = [
    // 完整地址（含縣市）最精確
    input.address ? `${input.city}${input.area ?? ''}${input.address}` : null,
    // 店名 + 縣市 + 區域
    [input.name, input.city, input.area].filter(Boolean).join(' '),
  ].filter(Boolean) as string[];

  for (const q of candidates) {
    const r = await geocodeText(q);
    if (r) return r;
  }
  return null;
}
