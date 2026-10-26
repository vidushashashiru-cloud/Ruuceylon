// Tiny helper that talks to Upstash Redis (free) through its REST API.
// No npm packages needed. Vercel adds these variables for you when you
// connect "Upstash for Redis" (or Vercel KV) to the project.
const crypto = require('crypto');

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const configured = () => Boolean(URL_ && TOKEN);

async function cmd(...args) {
  const r = await fetch(URL_, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  const j = await r.json();
  if (!r.ok || j.error) throw new Error(j.error || `Redis error ${r.status}`);
  return j.result;
}

const KEY = 'rc:comments';

async function allComments() {
  const flat = (await cmd('HGETALL', KEY)) || [];
  const out = [];
  for (let i = 0; i < flat.length; i += 2) {
    try { out.push(JSON.parse(flat[i + 1])); } catch (e) { /* skip broken row */ }
  }
  return out.sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

const hash = (s) => crypto.createHash('sha256').update(`rc-salt:${s}`).digest('hex').slice(0, 24);
const clientIp = (req) => String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'x').split(',')[0].trim();

// returns true when the caller is over the limit
async function limited(prefix, req, max, seconds) {
  const k = `rc:rl:${prefix}:${hash(clientIp(req))}`;
  const n = await cmd('INCR', k);
  if (n === 1) await cmd('EXPIRE', k, seconds);
  return n > max;
}

module.exports = { configured, cmd, KEY, allComments, limited, hash };
