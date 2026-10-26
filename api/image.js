// Public photo endpoint:  GET /api/image?id=<commentId>
// Only shows photos of comments that you approved.
const store = require('./_store');

module.exports = async (req, res) => {
  if (!store.configured()) return res.status(503).end();
  try {
    const id = String((req.query || {}).id || '');
    if (!/^[a-z0-9]+$/.test(id)) return res.status(400).end();

    const raw = await store.cmd('HGET', store.KEY, id);
    if (!raw || JSON.parse(raw).status !== 'approved') return res.status(404).end();

    const data = await store.cmd('GET', store.IMG + id);
    if (!data || !data.startsWith('data:image/jpeg;base64,')) return res.status(404).end();

    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, s-maxage=86400, max-age=3600');
    return res.status(200).send(Buffer.from(data.slice(23), 'base64'));
  } catch (e) {
    console.error(e);
    return res.status(500).end();
  }
};
