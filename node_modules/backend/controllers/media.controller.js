const db = require('../config/db_config');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const MEDIA_DIR = path.join(__dirname, '../../media');

// Multer konfigürasyonu
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Desteklenmeyen dosya formatı'));
        }
    }
}).single('file');

// Dosya yükleme
exports.uploadFile = async (req, res) => {
    try {
        upload(req, res, async (err) => {
            if (err) {
                return res.status(400).json({ error: err.message });
            }

            if (!req.file) {
                return res.status(400).json({ error: 'Dosya yüklenmedi' });
            }

            const { filename, path: filePath, mimetype, size } = req.file;
            const userId = req.user.id;

            const result = await db.query(
                'INSERT INTO media_files (file_name, file_type, file_size, file_path, uploaded_by) VALUES ($1, $2, $3, $4, $5) RETURNING *',
                [filename, mimetype, size, filePath, userId]
            );

            res.status(201).json({
                message: 'Dosya başarıyla yüklendi',
                file: result.rows[0]
            });
        });
    } catch (error) {
        res.status(500).json({ error: 'Dosya yükleme hatası' });
    }
};

// Medya yükleme
exports.uploadMedia = (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    res.status(201).json({ url: `/media/${req.file.filename}` });
};

// Dosya silme
exports.deleteFile = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const file = await db.query(
            'SELECT * FROM media_files WHERE id = $1 AND uploaded_by = $2',
            [id, userId]
        );

        if (file.rows.length === 0) {
            return res.status(404).json({ error: 'Dosya bulunamadı' });
        }

        // Fiziksel dosyayı sil
        fs.unlinkSync(file.rows[0].file_path);

        // Veritabanından sil
        await db.query('DELETE FROM media_files WHERE id = $1', [id]);

        res.json({ message: 'Dosya başarıyla silindi' });
    } catch (error) {
        res.status(500).json({ error: 'Dosya silme hatası' });
    }
};

// Dosya listesi
exports.getFiles = async (req, res) => {
    try {
        const userId = req.user.id;
        const files = await db.query(
            'SELECT * FROM media_files WHERE uploaded_by = $1 OR is_public = true ORDER BY uploaded_at DESC',
            [userId]
        );

        res.json(files.rows);
    } catch (error) {
        res.status(500).json({ error: 'Dosya listesi alınamadı' });
    }
};

exports.listMedia = (req, res) => {
    fs.readdir(MEDIA_DIR, (err, files) => {
        if (err) return res.status(500).json({ error: 'Failed to list media' });
        res.json(files.map(f => ({ url: `/media/${f}` })));
    });
};

exports.getMedia = (req, res) => {
    const file = req.params.filename;
    const filePath = path.join(MEDIA_DIR, file);
    if (!fs.existsSync(filePath)) return res.status(404).end();
    res.sendFile(filePath);
};