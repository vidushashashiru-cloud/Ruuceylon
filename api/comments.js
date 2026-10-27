// Public comments API
//   GET  /api/comments?product=<id>      approved comments of one product
//   GET  /api/comments?recent=1&limit=6  latest approved comments (all products)
//   GET  /api/comments?summary=1         star average + count per product
//   POST /api/comments                   add a comment (waits for approval unless AUTO_APPROVE=true)
const store = require('./_store');

const clean = (s, max) => String(s ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);

const publicShape = (c) => ({ id: c.id, product: c.product, name: c.name, rating: c.rating, text: c.text, date: c.date, img: Boolean(c.img) });

// photo arrives already shrunk by the browser as a JPEG data URL (~100-400 KB)
const IMG_RE = /^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/;
const IMG_MAX = 450000;

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (!store.configured()) return res.status(503).json({ error: 'not_configured' });

  try {
    if (req.method === 'GET') {
      const q = req.query || {};
      const approved = (await store.allComments()).filter((c) => c.status === 'approved');

      if (q.summary) {
        const summary = {};
        for (const c of approved) {
          const s = (summary[c.product] ||= { count: 0, sum: 0 });
          s.count += 1; s.sum += c.rating || 0;
        }
        for (const k of Object.keys(summary)) summary[k] = { count: summary[k].count, avg: summary[k].sum / summary[k].count };
        res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=120');
        return res.status(200).json({ summary });
      }
      if (q.recent) {
        const limit = Math.min(Number(q.limit) || 6, 20);
        res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=120');
        return res.status(200).json({ comments: approved.slice(0, limit).map(publicShape) });
      }
      if (q.product) {
        res.setHeader('Cache-Control', 'no-store');
        return res.status(200).json({ comments: approved.filter((c) => c.product === q.product).map(publicShape) });
      }
      return res.status(400).json({ error: 'bad_request' });
    }

    if (req.method === 'POST') {
      const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      if (b.website) return res.status(200).json({ status: 'pending' }); // hidden field filled in = robot

      const product = clean(b.product, 90);
      const name = clean(b.name, 40);
      const text = clean(b.text, 800);
      const rating = Math.round(Number(b.rating));
      if (!/^[a-z0-9-]+$/.test(product) || !name || text.length < 5 || !(rating >= 1 && rating <= 5)) {
        return res.status(400).json({ error: 'bad_request' });
      }
      const image = typeof b.image === 'string' ? b.image : '';
      if (image && (image.length > IMG_MAX || !IMG_RE.test(image) || !image.startsWith('data:image/jpeg;base64,/9j/'))) {
        return res.status(400).json({ error: 'bad_image' });
      }
      if (await store.limited('post', req,100, 3600)) return res.status(429).json({ error: 'too_many' });

      const status = process.env.AUTO_APPROVE === 'true' ? 'approved' : 'pending';
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      const comment = { id, product, name, rating, text, date: new Date().toISOString(), status, img: Boolean(image) };
      if (image) await store.cmd('SET', store.IMG + id, image); // photo kept in its own key so comment lists stay small
      await store.cmd('HSET', store.KEY, id, JSON.stringify(comment));
      return res.status(200).json({ status });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'server_error' });
  }
};
