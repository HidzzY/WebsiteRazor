const $ = (id) => document.getElementById(id);

$('run').addEventListener('click', async () => {
  const code = $('in').value;
  if (!code.trim()) return;
  $('out').value = 'working...';
  try {
    const res = await fetch('/api/obfuscate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        opts: {
          cff: $('cff').checked,
          dead: $('dead').checked,
          selfDefending: $('selfDefending').checked,
          debug: $('debug').checked
        }
      })
    });
    const data = await res.json();
    $('out').value = data.output || data.error || '';
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
