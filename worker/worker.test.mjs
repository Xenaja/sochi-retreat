import worker from 'file:///C:/Users/Acer/Documents/Projects/sochi-retreat-lending/Zakharevith/worker/telegram-form-worker.js';

const ENV = {
  ALLOW_ORIGIN: 'https://moresily.ru,https://xenaja.github.io',
  BOT_TOKEN: 'test-token',
  CHAT_ID: '1',
};

let sent = null;
globalThis.fetch = async (url, opts) => {
  sent = JSON.parse(opts.body);
  return { ok: true };
};

const req = (origin, body, method = 'POST') =>
  new Request('https://worker.dev/', {
    method,
    headers: { 'Content-Type': 'application/json', ...(origin ? { Origin: origin } : {}) },
    ...(method === 'POST' ? { body: JSON.stringify(body) } : {}),
  });

let pass = 0, fail = 0;
const check = (name, got, want) => {
  const ok = got === want;
  ok ? pass++ : fail++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}: ${got}${ok ? '' : `  (ждали ${want})`}`);
};

// preflight с обоих лендингов
let r = await worker.fetch(req('https://moresily.ru', null, 'OPTIONS'), ENV);
check('preflight moresily.ru', r.headers.get('Access-Control-Allow-Origin'), 'https://moresily.ru');
r = await worker.fetch(req('https://xenaja.github.io', null, 'OPTIONS'), ENV);
check('preflight xenaja.github.io', r.headers.get('Access-Control-Allow-Origin'), 'https://xenaja.github.io');
check('Vary выставлен', r.headers.get('Vary'), 'Origin');

// чужой origin получает не свой адрес — браузер такой ответ отклонит
r = await worker.fetch(req('https://evil.example', null, 'OPTIONS'), ENV);
check('чужой origin не проходит', r.headers.get('Access-Control-Allow-Origin'), 'https://moresily.ru');

// заявка с лендинга ретрита
sent = null;
r = await worker.fetch(req('https://xenaja.github.io', { name: 'Мария', contact: '+79001234567', task: '[тати] Заявка на женский ретрит в Вардане', page: 'https://xenaja.github.io/vardane-retreat/' }), ENV);
check('статус ответа [тати]', r.status, 200);
check('заголовок в телеграме [тати]', sent.text.split('\n')[0], '🟢 <b>Заявка — женский ретрит в Вардане</b>');

// заявка соседнего лендинга не изменилась
sent = null;
await worker.fetch(req('https://moresily.ru', { name: 'Пётр', contact: '+79005554433', task: '[сочи] Заявка с лендинга' }), ENV);
check('заголовок в телеграме [сочи]', sent.text.split('\n')[0], '🟢 <b>Заявка — Энергия моря и личной силы</b>');

// honeypot: до телеграма не доходит
sent = null;
r = await worker.fetch(req('https://xenaja.github.io', { name: 'бот', contact: 'x', company: 'ООО Спам', task: '[тати] x' }), ENV);
check('honeypot не шлёт в телеграм', sent, null);
check('honeypot отвечает 200', r.status, 200);

// без имени и контакта
r = await worker.fetch(req('https://xenaja.github.io', { name: '', contact: '' }), ENV);
check('пустая заявка отклонена', r.status, 422);

console.log(`\nитого: ${pass} прошло, ${fail} упало`);
process.exit(fail ? 1 : 0);
