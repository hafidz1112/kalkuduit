import express from 'express';
import { apiRouter } from '../src/server/router';

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
  next();
});

app.use(express.json());
app.use('/api', apiRouter);
app.use('/', apiRouter);

export default app;
