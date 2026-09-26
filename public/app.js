const $ = (id) => document.getElementById(id);

const langSelect = $('lang');
const jsOpts = $('jsOpts');

function syncOpts() {
  jsOpts.style.display = langSelect.value === 'js' ? 'flex' : 'none';
}
langSelect.addEventListener('change', syncOpts);
syncOpts();

$('run').addEventListener('click', async () => {
  const code = $('in').value;
  const lang = langSelect.value;
  if (!code.trim()) return;
  $('out').value = 'working...';

  let endpoint, body;

  if (lang === 'js') {
    endpoint = '/api/obfuscate';
    body = {
      code,
      opts: {
        cff: $('cff').checked,
        dead: $('dead').checked,
        selfDefending: $('selfDefending').checked,
        debug: $('debug').checked
      }
    };
  } else {
    endpoint = '/api/obfuscate-all';
    body = { code, lang };
  }

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) {
      $('out').value = 'error: ' + (data.error || res.status);
      if (data.hint) $('out').value += '\n' + data.hint;
    } else {
      $('out').value = data.output || '';
    }
  } catch (e) {
    $('out').value = 'error: ' + e.message;
  }
});

$('copy').addEventListener('click', () => {
  navigator.clipboard.writeText($('out').value);
});

$('clear').addEventListener('click', () => {
  $('in').value = '';
  $('out').value = '';
});
