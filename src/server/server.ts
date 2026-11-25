import express from 'express';
import path from 'path';
import { loadEnvFiles } from './env';
import { apiRouter } from './router';
import { getDbRepository } from './repository';

loadEnvFiles();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize repository on startup so active DB mode is logged immediately
getDbRepository();

app.use(express.json());

// API routes
app.use('/api', apiRouter);

// Serve static frontend in production
const distDir = path.resolve(process.cwd(), 'dist');
app.use(express.static(distDir));

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 KalkuDuit server running on http://localhost:${PORT}`);
});
