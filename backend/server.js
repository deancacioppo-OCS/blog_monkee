
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

const db = new sqlite3.Database('./database.db', (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Connected to the SQLite database.');
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

app.get('/api/clients/:clientId/used-topics', (req, res) => {
  const { clientId } = req.params;
  db.all('SELECT topic FROM used_topics WHERE client_id = ?', [clientId], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows.map(row => row.topic));
  });
});

app.post('/api/clients/:clientId/used-topics', (req, res) => {
  const { clientId } = req.params;
  const { topic } = req.body;
  db.run('INSERT INTO used_topics (client_id, topic) VALUES (?, ?)', [clientId, topic], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ id: this.lastID });
  });
});

app.get('/api/clients/:clientId/sitemap-urls', (req, res) => {
  const { clientId } = req.params;
  db.all('SELECT url FROM sitemap_urls WHERE client_id = ?', [clientId], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows.map(row => row.url));
  });
});

app.post('/api/clients/:clientId/sitemap-urls', (req, res) => {
  const { clientId } = req.params;
  const { url } = req.body;
  db.run('INSERT INTO sitemap_urls (client_id, url) VALUES (?, ?)', [clientId, url], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ id: this.lastID });
  });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
