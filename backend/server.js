
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
  // Create clients table if it doesn't exist
  db.run(`
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      industry TEXT,
      websiteUrl TEXT,
      uniqueValueProp TEXT,
      brandVoice TEXT,
      contentStrategy TEXT,
      wpUrl TEXT,
      wpUsername TEXT,
      wpAppPassword TEXT,
      sitemapUrl TEXT,
      externalSitemapUrls TEXT, -- Stored as JSON string
      generatedBlogPostUrls TEXT, -- Stored as JSON string
      sitemapSummary TEXT
    )
  `);

  // Check if sitemapSummary column exists and add it if not
  db.get("PRAGMA table_info(clients)", (err, row) => {
    if (err) {
      logger.error(`Error checking table info for clients: ${err.message}`);
      return;
    }
    let sitemapSummaryExists = false;
    if (row) { // Check if row is not null (table exists)
      db.all("PRAGMA table_info(clients)", (err, columns) => {
        if (err) {
          logger.error(`Error getting columns for clients: ${err.message}`);
          return;
        }
        sitemapSummaryExists = columns.some(col => col.name === 'sitemapSummary');
        if (!sitemapSummaryExists) {
          db.run("ALTER TABLE clients ADD COLUMN sitemapSummary TEXT", (err) => {
            if (err) {
              logger.error(`Error adding sitemapSummary column: ${err.message}`);
            } else {
              logger.info("Added sitemapSummary column to clients table.");
            }
          });
        }
      });
    }
  });

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

// Client Management Routes
app.get('/api/clients', (req, res, next) => {
  logger.info('Fetching all clients');
  db.all('SELECT * FROM clients', (err, rows) => {
    if (err) {
      logger.error(`Error fetching all clients: ${err.message}`);
      return next(err);
    }
    // Parse JSON strings back to arrays/objects
    const clients = rows.map(row => ({
      ...row,
      externalSitemapUrls: row.externalSitemapUrls ? JSON.parse(row.externalSitemapUrls) : [],
      generatedBlogPostUrls: row.generatedBlogPostUrls ? JSON.parse(row.generatedBlogPostUrls) : [],
      wp: {
        url: row.wpUrl,
        username: row.wpUsername,
        appPassword: row.wpAppPassword
      }
    }));
    logger.info(`Successfully fetched ${clients.length} clients.`);
    res.json(clients);
  });
});

app.get('/api/clients/:id', (req, res, next) => {
  const { id } = req.params;
  logger.info(`Fetching client with ID: ${id}`);
  db.get('SELECT * FROM clients WHERE id = ?', [id], (err, row) => {
    if (err) {
      logger.error(`Error fetching client ${id}: ${err.message}`);
      return next(err);
    }
    if (!row) {
      logger.warn(`Client with ID ${id} not found.`);
      return res.status(404).json({ error: 'Client not found' });
    }
    const client = {
      ...row,
      externalSitemapUrls: row.externalSitemapUrls ? JSON.parse(row.externalSitemapUrls) : [],
      generatedBlogPostUrls: row.generatedBlogPostUrls ? JSON.parse(row.generatedBlogPostUrls) : [],
      wp: {
        url: row.wpUrl,
        username: row.wpUsername,
        appPassword: row.wpAppPassword
      }
    };
    logger.info(`Successfully fetched client: ${id}`);
    res.json(client);
  });
});

app.post('/api/clients', (req, res, next) => {
  const { id, name, industry, websiteUrl, uniqueValueProp, brandVoice, contentStrategy, wp, sitemapUrl, externalSitemapUrls, generatedBlogPostUrls, sitemapSummary } = req.body;
  logger.info(`Attempting to add new client: ${name}`);
  db.run(`
    INSERT INTO clients (id, name, industry, websiteUrl, uniqueValueProp, brandVoice, contentStrategy, wpUrl, wpUsername, wpAppPassword, sitemapUrl, externalSitemapUrls, generatedBlogPostUrls, sitemapSummary)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id, name, industry, websiteUrl, uniqueValueProp, brandVoice, contentStrategy,
    wp.url, wp.username, wp.appPassword, sitemapUrl,
    JSON.stringify(externalSitemapUrls || []),
    JSON.stringify(generatedBlogPostUrls || []),
    sitemapSummary
  ], function (err) {
    if (err) {
      logger.error(`Error adding client ${name}: ${err.message}`);
      return next(err);
    }
    logger.info(`Successfully added client ${name} with ID: ${id}`);
    res.status(201).json({ id: id });
  });
});

app.put('/api/clients/:id', (req, res, next) => {
  const { id } = req.params;
  const { name, industry, websiteUrl, uniqueValueProp, brandVoice, contentStrategy, wp, sitemapUrl, externalSitemapUrls, generatedBlogPostUrls, sitemapSummary } = req.body;
  logger.info(`Attempting to update client: ${id}`);
  db.run(`
    UPDATE clients SET
      name = ?, industry = ?, websiteUrl = ?, uniqueValueProp = ?, brandVoice = ?, contentStrategy = ?,
      wpUrl = ?, wpUsername = ?, wpAppPassword = ?, sitemapUrl = ?, externalSitemapUrls = ?, generatedBlogPostUrls = ?, sitemapSummary = ?
    WHERE id = ?
  `, [
    name, industry, websiteUrl, uniqueValueProp, brandVoice, contentStrategy,
    wp.url, wp.username, wp.appPassword, sitemapUrl,
    JSON.stringify(externalSitemapUrls || []),
    JSON.stringify(generatedBlogPostUrls || []),
    sitemapSummary,
    id
  ], function (err) {
    if (err) {
      logger.error(`Error updating client ${id}: ${err.message}`);
      return next(err);
    }
    if (this.changes === 0) {
      logger.warn(`Client with ID ${id} not found for update.`);
      return res.status(404).json({ error: 'Client not found' });
    }
    logger.info(`Successfully updated client: ${id}`);
    res.json({ message: 'Client updated successfully' });
  });
});

app.delete('/api/clients/:id', (req, res, next) => {
  const { id } = req.params;
  logger.info(`Attempting to delete client: ${id}`);
  db.run('DELETE FROM clients WHERE id = ?', [id], function (err) {
    if (err) {
      logger.error(`Error deleting client ${id}: ${err.message}`);
      return next(err);
    }
    if (this.changes === 0) {
      logger.warn(`Client with ID ${id} not found for deletion.`);
      return res.status(404).json({ error: 'Client not found' });
    }
    logger.info(`Successfully deleted client: ${id}`);
    res.json({ message: 'Client deleted successfully' });
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
