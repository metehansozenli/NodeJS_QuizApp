// Controller for sound effects (upload/list/get)
const path = require('path');
const fs = require('fs');

const SOUND_DIR = path.join(__dirname, '../../sounds');

exports.uploadSound = (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.status(201).json({ url: `/sounds/${req.file.filename}` });
};

exports.listSounds = (req, res) => {
  fs.readdir(SOUND_DIR, (err, files) => {
    if (err) return res.status(500).json({ error: 'Failed to list sounds' });
    res.json(files.map(f => ({ url: `/sounds/${f}` })));
  });
};

exports.getSound = (req, res) => {
  const file = req.params.filename;
  const filePath = path.join(SOUND_DIR, file);
  if (!fs.existsSync(filePath)) return res.status(404).end();
  res.sendFile(filePath);
};
