import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pg from 'pg';
import crypto from 'node:crypto';

const app = express();
const port = Number(process.env.PORT || 8787);
const allowedOrigin = process.env.APP_ORIGIN || 'http://localhost:5173';
const { Pool } = pg;
const pool = process.env.DATABASE_URL ? new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
}) : null;

app.use(cors({ origin: allowedOrigin.split(',').map(v => v.trim()), credentials: true }));
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', async (_req, res) => {
  let database = 'not_configured';
  if (pool) {
    try { await pool.query('SELECT 1'); database = 'connected'; }
    catch { database = 'unavailable'; }
  }
  res.json({ ok: true, service: 'higgsfield-animation-studio-api', database, providerConfigured: Boolean(process.env.COMFY_CLOUD_API_KEY && process.env.COMFY_CLOUD_SUBMIT_PATH) });
});

app.get('/api/jobs', async (_req, res) => {
  if (!pool) return res.status(503).json({ error: 'DATABASE_URL is not configured. Configure PostgreSQL before using persistent jobs.' });
  try {
    const { rows } = await pool.query('SELECT id, title, mode, provider, status, progress, aspect_ratio AS "aspectRatio", duration_seconds AS "durationSeconds", prompt, created_at AS "createdAt" FROM render_jobs ORDER BY created_at DESC LIMIT 100');
    res.json({ jobs: rows });
  } catch (error) {
    console.error('list jobs failed', error.message);
    res.status(500).json({ error: 'Could not load render jobs.' });
  }
});

app.post('/api/jobs', async (req, res) => {
  const { prompt, mode, model, aspectRatio, duration } = req.body || {};
  if (typeof prompt !== 'string' || prompt.trim().length < 3) return res.status(400).json({ error: 'Prompt must be at least 3 characters.' });
  if (prompt.length > 12000) return res.status(400).json({ error: 'Prompt is too long.' });
  const allowedModes = new Set(['Text to video', 'Image to video', 'Video to video', 'Text to image']);
  if (!allowedModes.has(mode)) return res.status(400).json({ error: 'Unsupported generation mode.' });
  const seconds = Number.parseInt(String(duration || '6'), 10) || 6;
  if (![4, 6, 8, 10].includes(seconds)) return res.status(400).json({ error: 'Unsupported duration.' });
  if (!pool) return res.status(503).json({ error: 'Persistent backend is not configured. Start PostgreSQL and set DATABASE_URL.' });
  const id = crypto.randomUUID();
  const title = prompt.trim().replace(/\s+/g, ' ').slice(0, 120);
  const provider = typeof model === 'string' ? model.slice(0, 80) : 'Comfy Cloud';
  const aspect = ['16:9', '9:16', '1:1', '4:3', '3:2'].includes(aspectRatio) ? aspectRatio : '16:9';
  try {
    const { rows } = await pool.query(
      'INSERT INTO render_jobs (id, title, prompt, mode, provider, status, progress, aspect_ratio, duration_seconds) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id, title, mode, provider AS model, status, progress, aspect_ratio AS ratio, duration_seconds AS duration, prompt, created_at',
      [id, title, prompt.trim(), mode, provider, 'Queued', 0, aspect, seconds]
    );
    const job = rows[0];
    // Provider submission is intentionally not guessed. Wire this to the documented API
    // endpoint and workflow payload for the user's Comfy Cloud account before enabling.
    if (!process.env.COMFY_CLOUD_API_KEY || !process.env.COMFY_CLOUD_SUBMIT_PATH) {
      return res.status(202).json({ job: { ...job, time: 'Just now' }, warning: 'Saved to PostgreSQL; provider submission is not configured yet.' });
    }
    return res.status(202).json({ job: { ...job, time: 'Just now' }, warning: 'Saved to queue. Configure the provider workflow worker to submit jobs.' });
  } catch (error) {
    console.error('create job failed', error.message);
    res.status(500).json({ error: 'Could not save render job.' });
  }
});

app.use((err, _req, res, _next) => {
  console.error('API error', err.message);
  res.status(500).json({ error: 'Unexpected server error.' });
});

app.listen(port, () => console.log(`Higgsfield Studio API listening on port ${port}`));
