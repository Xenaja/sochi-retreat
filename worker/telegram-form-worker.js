/**
 * Cloudflare Worker: принимает заявку с лендинга «Энергия моря и личной силы»
 * и пересылает её в Telegram.
 *
 * Токен бота НЕ хранится в коде и НЕ попадает на сайт — он лежит в секретах воркера.
 *
 * Переменные окружения (Settings → Variables and Secrets):
 *   BOT_TOKEN    — токен бота от @BotFather (секрет)
 *   CHAT_ID      — chat_id получателя заявок
 *   ALLOW_ORIGIN — https://moresily.ru
 */

export default {
  async fetch(request, env) {
    const origin = env.ALLOW_ORIGIN || '*';
    const cors = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405, headers: cors });
    }

    let data;
    try {
      data = await request.json();
    } catch {
      return json({ ok: false, error: 'bad json' }, 400, cors);
    }

    // честный honeypot: реальные пользователи это поле не видят и не заполняют
    if (data.company) return json({ ok: true }, 200, cors);

    const name = String(data.name || '').trim().slice(0, 80);
    const contact = String(data.contact || '').trim().slice(0, 120);
    const task = String(data.task || '').trim().slice(0, 1500);
    const page = String(data.page || '').trim().slice(0, 300);

    if (!name || !contact) {
      return json({ ok: false, error: 'name and contact required' }, 422, cors);
    }

    const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const text =
      '🟢 <b>Заявка — Энергия моря и личной силы</b>\n\n' +
      `<b>Имя:</b> ${esc(name)}\n` +
      `<b>Контакт:</b> ${esc(contact)}\n` +
      (task ? `<b>Задача:</b> ${esc(task)}\n` : '') +
      (page ? `\n<i>${esc(page)}</i>` : '');

    const tgRes = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: env.CHAT_ID,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    if (!tgRes.ok) {
      return json({ ok: false, error: 'telegram failed' }, 502, cors);
    }
    return json({ ok: true }, 200, cors);
  },
};

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}
