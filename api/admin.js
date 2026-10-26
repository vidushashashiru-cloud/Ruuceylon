// Owner-only API used by /admin  (needs the ADMIN_PASSWORD environment variable in Vercel)
//   GET  /api/admin                       every comment (pending + approved)
//   POST /api/admin {action, id}          action = approve | hide | delete
const crypto = require('crypto');
const store = require('./_store');

const sha = (s) => crypto.createHash('sha256').update(String(s)).digest();

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  const pass = process.env.ADMIN_PASSWORD;
  if (!pass || !store.configured()) return res.status(503).json({ error: 'not_configured' });

  try {
    if (await store.limited('adm', req, 30, 900)) return res.status(429).json({ error: 'too_many' });
    const given = req.headers['x-admin-password'] || '';
    if (!crypto.timingSafeEqual(sha(given), sha(pass))) return res.status(401).json({ error: 'wrong_password' });

    if (req.method === 'GET') return res.status(200).json({ comments: await store.allComments() });

    if (req.method === 'POST') {
      const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const id = String(b.id || '');
      if (!/^[a-z0-9]+$/.test(id)) return res.status(400).json({ error: 'bad_request' });
      if (b.action === 'delete') {
        await store.cmd('HDEL', store.KEY, id);
      } else if (b.action === 'approve' || b.action === 'hide') {
        const raw = await store.cmd('HGET', store.KEY, id);
        if (!raw) return res.status(404).json({ error: 'not_found' });
        const c = JSON.parse(raw);
        c.status = b.action === 'approve' ? 'approved' : 'pending';
        await store.cmd('HSET', store.KEY, id, JSON.stringify(c));
      } else {
        return res.status(400).json({ error: 'bad_request' });
      }
      return res.status(200).json({ ok: true });
    }
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'server_error' });
  }
};
