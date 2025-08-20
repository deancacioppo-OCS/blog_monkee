
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const winston = require('winston');
const fetch = require('node-fetch'); // Added node-fetch

// Configure Winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

const db = new sqlite3.Database('./database.db', (err) => {
  if (err) {
    logger.error(`Database connection error: ${err.message}`);
  }
  logger.info('Connected to the SQLite database.');
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS used_topics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id TEXT NOT NULL,
      topic TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS sitemap_urls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id TEXT NOT NULL,
      url TEXT NOT NULL
    )
  `);
});

app.get('/api/clients/:clientId/used-topics', (req, res, next) => {
  const { clientId } = req.params;
  logger.info(`Fetching used topics for client: ${clientId}`);
  db.all('SELECT topic FROM used_topics WHERE client_id = ?', [clientId], (err, rows) => {
    if (err) {
      logger.error(`Error fetching used topics for client ${clientId}: ${err.message}`);
      return next(err);
    }
    logger.info(`Successfully fetched ${rows.length} used topics for client: ${clientId}`);
    res.json(rows.map(row => row.topic));
  });
});

app.post('/api/clients/:clientId/used-topics', (req, res, next) => {
  const { clientId } = req.params;
  const { topic } = req.body;
  logger.info(`Attempting to add used topic "${topic}" for client: ${clientId}`);
  db.run('INSERT INTO used_topics (client_id, topic) VALUES (?, ?)', [clientId, topic], function (err) {
    if (err) {
      logger.error(`Error adding used topic "${topic}" for client ${clientId}: ${err.message}`);
      return next(err);
    }
    logger.info(`Successfully added used topic "${topic}" for client ${clientId} with ID: ${this.lastID}`);
    res.status(201).json({ id: this.lastID });
  });
});

app.get('/api/clients/:clientId/sitemap-urls', (req, res, next) => {
  const { clientId } = req.params;
  logger.info(`Fetching sitemap URLs for client: ${clientId}`);
  db.all('SELECT url FROM sitemap_urls WHERE client_id = ?', [clientId], (err, rows) => {
    if (err) {
      logger.error(`Error fetching sitemap URLs for client ${clientId}: ${err.message}`);
      return next(err);
    }
    logger.info(`Successfully fetched ${rows.length} sitemap URLs for client: ${clientId}`);
    res.json(rows.map(row => row.url));
  });
});

app.post('/api/clients/:clientId/sitemap-urls', (req, res, next) => {
  const { clientId } = req.params;
  const { url } = req.body;
  logger.info(`Attempting to add sitemap URL "${url}" for client: ${clientId}`);
  db.run('INSERT INTO sitemap_urls (client_id, url) VALUES (?, ?)', [clientId, url], function (err) {
    if (err) {
      logger.error(`Error adding sitemap URL "${url}" for client ${clientId}: ${err.message}`);
      return next(err);
    }
    logger.info(`Successfully added sitemap URL "${url}" for client ${clientId} with ID: ${this.lastID}`);
    res.status(201).json({ id: this.lastID });
  });
});

// Centralized error handling middleware
app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}`, { stack: err.stack, path: req.path, method: req.method, ip: req.ip });
  res.status(500).json({ error: 'An unexpected error occurred.' });
});

app.get('/api/sitemap-fetch', async (req, res) => {
  const { sitemapUrl } = req.query;
  logger.info(`Fetching sitemap from: ${sitemapUrl}`);

  if (!sitemapUrl) {
    return res.status(400).json({ error: 'sitemapUrl query parameter is required.' });
  }

  try {
    const response = await fetch(sitemapUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch sitemap: ${response.statusText}`);
    }
    const text = await response.text();
    logger.info(`Raw sitemap content for ${sitemapUrl}:\n${text}`);
    res.set('Content-Type', response.headers.get('Content-Type') || 'application/xml');
    res.send(text);
  } catch (error) {
    logger.error(`Error fetching sitemap from ${sitemapUrl}: ${error.message}`);
    res.status(500).json({ error: error.message || 'Failed to fetch sitemap.' });
  }
});

app.listen(port, () => {
  logger.info(`Server is running on http://localhost:${port}`);
});
