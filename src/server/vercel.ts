import express from 'express';
import { apiRouter } from './router';

const app = express();

// Restore original /api/... path when rewritten by vercel.json
app.use((req, _res, next) => {
  const vp = req.query.__vercel_path;
  if (typeof vp === 'string') {
    const cleanPath = vp.startsWith('/') ? vp : `/${vp}`;
    const parsed = new URL(req.url, 'http://localhost');
    parsed.searchParams.delete('__vercel_path');
    const qs = parsed.searchParams.toString();
    req.url = `/api${cleanPath}${qs ? `?${qs}` : ''}`;
  }

  // If serverless runtime already pre-parsed req.body, prevent express.json() from re-reading ended stream
  if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
    (req as any)._body = true;
  }

  next();
});

app.use(express.json());
app.use('/api', apiRouter);
app.use('/', apiRouter);

export default app;
