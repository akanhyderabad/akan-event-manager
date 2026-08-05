/**
 * Lightweight, dependency-free browser fingerprint.
 *
 * Collects the seven signals the new-vs-returning classifier weights:
 *   canvas 20 · webgl 20 · fonts 15 · audio 15 · screen 10 · os 10 · browser 10
 *
 * Each signal is reduced to a short hash/string client-side so we never ship
 * raw canvas/audio buffers over the wire. The server stores these and does the
 * weighted-similarity comparison. Every collector is defensively wrapped — a
 * blocked API (privacy mode, Brave shields, etc.) just yields an empty string
 * for that component, which lowers match confidence but never throws.
 */

export interface FingerprintComponents {
  canvas: string;
  webgl: string;
  fonts: string;
  audio: string;
  screen: string;
  os: string;
  browser: string;
}

/** Fast 53-bit string hash (cyrb53) — short, stable, no crypto needed. */
function hash(str: string): string {
  let h1 = 0xdeadbeef ^ str.length;
  let h2 = 0x41c6ce57 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

function canvasFp(): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 240; canvas.height = 60;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.textBaseline = 'top';
    ctx.font = "16px 'Arial'";
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('Akan ✨ events 🎉', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('Akan ✨ events 🎉', 4, 17);
    ctx.beginPath();
    ctx.arc(50, 30, 20, 0, Math.PI * 2, true);
    ctx.fillStyle = 'rgba(255,0,255,0.5)';
    ctx.fill();
    return hash(canvas.toDataURL());
  } catch { return ''; }
}

function webglFp(): string {
  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (!gl) return '';
    const parts: string[] = [];
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    if (dbg) {
      parts.push(String(gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL)));
      parts.push(String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)));
    }
    parts.push(String(gl.getParameter(gl.VERSION)));
    parts.push(String(gl.getParameter(gl.SHADING_LANGUAGE_VERSION)));
    parts.push(String(gl.getParameter(gl.MAX_TEXTURE_SIZE)));
    parts.push(String(gl.getParameter(gl.MAX_VERTEX_ATTRIBS)));
    const exts = gl.getSupportedExtensions();
    if (exts) parts.push(exts.sort().join(','));
    return hash(parts.join('~'));
  } catch { return ''; }
}

function fontsFp(): string {
  try {
    const base = ['monospace', 'sans-serif', 'serif'];
    const test = [
      'Arial', 'Arial Black', 'Arial Narrow', 'Calibri', 'Cambria', 'Comic Sans MS',
      'Courier New', 'Georgia', 'Helvetica', 'Impact', 'Lucida Console', 'Lucida Sans',
      'Palatino', 'Segoe UI', 'Tahoma', 'Times New Roman', 'Trebuchet MS', 'Verdana',
      'Roboto', 'Open Sans', 'Noto Sans', 'Ubuntu', 'Cantarell', 'DejaVu Sans',
      'Menlo', 'Monaco', 'Consolas', 'San Francisco', 'Geneva',
    ];
    const span = document.createElement('span');
    span.style.position = 'absolute';
    span.style.left = '-9999px';
    span.style.fontSize = '72px';
    span.textContent = 'mmmmmmmmmmlli';
    document.body.appendChild(span);

    const baseline: Record<string, { w: number; h: number }> = {};
    for (const b of base) {
      span.style.fontFamily = b;
      baseline[b] = { w: span.offsetWidth, h: span.offsetHeight };
    }
    const detected: string[] = [];
    for (const f of test) {
      let matched = false;
      for (const b of base) {
        span.style.fontFamily = `'${f}',${b}`;
        if (span.offsetWidth !== baseline[b].w || span.offsetHeight !== baseline[b].h) {
          matched = true; break;
        }
      }
      if (matched) detected.push(f);
    }
    document.body.removeChild(span);
    return detected.sort().join(',');
  } catch { return ''; }
}

async function audioFp(): Promise<string> {
  try {
    const Ctx = (window as unknown as { OfflineAudioContext?: typeof OfflineAudioContext; webkitOfflineAudioContext?: typeof OfflineAudioContext }).OfflineAudioContext
      || (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext }).webkitOfflineAudioContext;
    if (!Ctx) return '';
    const ctx = new Ctx(1, 44100, 44100);
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = 10000;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -50;
    comp.knee.value = 40;
    comp.ratio.value = 12;
    comp.attack.value = 0;
    comp.release.value = 0.25;
    osc.connect(comp);
    comp.connect(ctx.destination);
    osc.start(0);
    const buffer = await ctx.startRendering();
    const data = buffer.getChannelData(0);
    let sum = 0;
    for (let i = 4500; i < 5000; i++) sum += Math.abs(data[i]);
    return hash(sum.toString());
  } catch { return ''; }
}

function screenFp(): string {
  try {
    const s = window.screen;
    return `${s.width}x${s.height}x${s.colorDepth}@${window.devicePixelRatio || 1}`;
  } catch { return ''; }
}

function osFp(): string {
  try {
    const ua = navigator.userAgent;
    const plat = (navigator as unknown as { platform?: string }).platform || '';
    let os = 'Unknown';
    if (/Windows NT 10/.test(ua)) os = 'Windows 10/11';
    else if (/Windows/.test(ua)) os = 'Windows';
    else if (/iPhone|iPad|iPod/.test(ua)) os = 'iOS';
    else if (/Mac OS X/.test(ua)) os = 'macOS';
    else if (/Android/.test(ua)) os = 'Android';
    else if (/Linux/.test(ua)) os = 'Linux';
    else if (/CrOS/.test(ua)) os = 'ChromeOS';
    return `${os}|${plat}`;
  } catch { return ''; }
}

function browserFp(): string {
  try {
    const ua = navigator.userAgent;
    let name = 'Unknown';
    let m: RegExpMatchArray | null = null;
    if ((m = ua.match(/Edg\/([\d.]+)/))) name = `Edge ${m[1].split('.')[0]}`;
    else if ((m = ua.match(/OPR\/([\d.]+)/))) name = `Opera ${m[1].split('.')[0]}`;
    else if ((m = ua.match(/Chrome\/([\d.]+)/))) name = `Chrome ${m[1].split('.')[0]}`;
    else if ((m = ua.match(/Firefox\/([\d.]+)/))) name = `Firefox ${m[1].split('.')[0]}`;
    else if ((m = ua.match(/Version\/([\d.]+).*Safari/))) name = `Safari ${m[1].split('.')[0]}`;
    const lang = navigator.language || '';
    return `${name}|${lang}`;
  } catch { return ''; }
}

export async function collectFingerprint(): Promise<FingerprintComponents> {
  // canvas/webgl/fonts/screen/os/browser are synchronous; audio is async.
  const audio = await audioFp();
  return {
    canvas: canvasFp(),
    webgl: webglFp(),
    fonts: fontsFp(),
    audio,
    screen: screenFp(),
    os: osFp(),
    browser: browserFp(),
  };
}
