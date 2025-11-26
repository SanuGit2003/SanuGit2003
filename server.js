const path = require('path');
const fs = require('fs');
const express = require('express');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// Use Render disk if present, otherwise local content/
const useDataDir = fs.existsSync('/data');
const CONTENT_DIR = useDataDir
  ? path.join('/data', 'content')
  : path.join(__dirname, 'content');

const TEXT_DIR = path.join(CONTENT_DIR, 'text');
const PICTURES_DIR = path.join(CONTENT_DIR, 'pictures');
const TEXT_FILE = path.join(TEXT_DIR, 'content.json');

[CONTENT_DIR, TEXT_DIR, PICTURES_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

if (!fs.existsSync(TEXT_FILE)) {
  fs.writeFileSync(TEXT_FILE, JSON.stringify({}, null, 2), 'utf-8');
}

const upload = multer({ dest: path.join(CONTENT_DIR, 'tmp') });

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(PICTURES_DIR));

// Get content JSON
app.get('/api/content', (req, res) => {
  fs.readFile(TEXT_FILE, 'utf-8', (err, data) => {
    if (err) {
      console.error('Error reading content file:', err);
      return res.json({});
    }
    try {
      const obj = JSON.parse(data || '{}');
      res.json(obj);
    } catch (e) {
      console.error('Error parsing content file:', e);
      res.json({});
    }
  });
});

// Save content JSON
app.post('/api/content', (req, res) => {
  const payload = req.body || {};
  fs.writeFile(TEXT_FILE, JSON.stringify(payload, null, 2), 'utf-8', (err) => {
    if (err) {
      console.error('Error writing content file:', err);
      return res.status(500).json({ ok: false });
    }
    res.json({ ok: true });
  });
});

// Allowed images
const ALLOWED_IMAGES = new Set([
  'homepage.png',
  'economicpage.png',
  'socialpage.png',
  'culturalpage.png',
  'healthpage.png',
  'crisispage.png',
]);

// Upload/replace image
app.post('/api/image', upload.single('image'), (req, res) => {
  const name = req.query.name;
  if (!name || !ALLOWED_IMAGES.has(name)) {
    if (req.file && req.file.path) fs.unlink(req.file.path, () => {});
    return res.status(400).json({ ok: false, error: 'Invalid image name' });
  }
  if (!req.file || !req.file.path) {
    return res.status(400).json({ ok: false, error: 'No file uploaded' });
  }

  const destPath = path.join(PICTURES_DIR, name);
  fs.rename(req.file.path, destPath, (err) => {
    if (err) {
      console.error('Error saving image:', err);
      return res.status(500).json({ ok: false });
    }
    res.json({ ok: true });
  });
});

app.listen(PORT, () => {
  console.log('Server listening on port', PORT);
});
