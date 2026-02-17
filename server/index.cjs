require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs/promises');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const PORT = process.env.PORT || 5000;
const app = express();

// ------------------------------------------
// MYSQL CONFIGURATION
// ------------------------------------------
const pool = mysql.createPool({
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'forsaj_user',
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE || 'forsaj_admin',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 10000 // 10s timeout
});

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-this';

console.log('--- SYSTEM CHECK ---');
console.log('PORT:', PORT);
console.log('DB_HOST:', process.env.MYSQL_HOST || 'localhost');
console.log('DB_USER:', process.env.MYSQL_USER || 'forsaj_user');
console.log('DB_NAME:', process.env.MYSQL_DATABASE || 'forsaj_admin');
console.log('DB_PASS_LEN:', (process.env.MYSQL_PASSWORD || '').length);
console.log('-------------------');

// Database Initialization with Retry logic
const initDB = async (retries = 10) => {
    if (dbInitInProgress) return;
    dbInitInProgress = true;
    lastDbInitAttemptAt = Date.now();

    while (retries > 0) {
        try {
            const connection = await pool.getConnection();
            console.log('Connected to MySQL Database');

            await connection.query(`
                CREATE TABLE IF NOT EXISTS users (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    username VARCHAR(255) UNIQUE NOT NULL,
                    password VARCHAR(255) NOT NULL,
                    name VARCHAR(255),
                    role VARCHAR(50) DEFAULT 'secondary',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            await connection.query(`
                CREATE TABLE IF NOT EXISTS applications (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    contact VARCHAR(255) NOT NULL,
                    type VARCHAR(100) NOT NULL,
                    content TEXT,
                    status ENUM('unread', 'read') DEFAULT 'unread',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            await connection.query(`
                CREATE TABLE IF NOT EXISTS site_content (
                    id VARCHAR(255) PRIMARY KEY,
                    content_data LONGTEXT NOT NULL,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            `);
            console.log('Database initialized: users, applications, and site_content tables ready');
            dbReady = true;
            await migrateFilesToDB();
            connection.release();
            dbInitInProgress = false;
            return; // Success
        } catch (error) {
            dbReady = false;
            console.error(`Database initialization attempt failed (${retries} retries left):`, error.message);
            retries -= 1;
            if (retries > 0) {
                console.log('Retrying in 5 seconds...');
                await new Promise(resolve => setTimeout(resolve, 5000));
            } else {
                console.error('All database initialization attempts failed.');
            }
        }
    }

    dbInitInProgress = false;
};



// Auth Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// ------------------------------------------
// MIDDLEWARE CONFIGURATION
// ------------------------------------------
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Request Logger & Trailing Slash Normalizer
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl || req.url}`);
    if (req.url.startsWith('/api/') && req.url.length > 5 && req.url.endsWith('/')) {
        req.url = req.url.slice(0, -1);
    }
    next();
});

// ------------------------------------------
// ENVIRONMENT & PATH CONFIGURATION
// ------------------------------------------
const WEB_DATA_DIR = process.env.WEB_DATA_DIR || path.join(__dirname, '../front/public');
const FRONT_PUBLIC_DIR = WEB_DATA_DIR;
const SITE_CONTENT_PATH = path.join(WEB_DATA_DIR, 'site-content.json');

const ADMIN_PUBLIC_DIR = process.env.ADMIN_PUBLIC_DIR || path.join(__dirname, '../public');
const ADMIN_SITEMAP_PATH = path.join(ADMIN_PUBLIC_DIR, 'sitemap.json');

const UPLOAD_DIR_PATH = process.env.UPLOAD_DIR || path.join(FRONT_PUBLIC_DIR, 'uploads');

const USERS_FILE_PATH = path.join(WEB_DATA_DIR, 'users.json');
const EVENTS_FILE_PATH = path.join(FRONT_PUBLIC_DIR, 'events.json');
const NEWS_FILE_PATH = path.join(FRONT_PUBLIC_DIR, 'news.json');
const GALLERY_PHOTOS_FILE_PATH = path.join(FRONT_PUBLIC_DIR, 'gallery-photos.json');
const VIDEOS_FILE_PATH = path.join(FRONT_PUBLIC_DIR, 'videos.json');
const DRIVERS_FILE_PATH = path.join(FRONT_PUBLIC_DIR, 'drivers.json');

// Ensure runtime directories exist in fresh deployments (especially with empty volumes).
const ensureRuntimeDirs = () => {
    const dirs = [WEB_DATA_DIR, ADMIN_PUBLIC_DIR, UPLOAD_DIR_PATH];
    for (const dir of dirs) {
        try {
            fs.mkdirSync(dir, { recursive: true });
        } catch (err) {
            console.error(`Failed to ensure directory: ${dir}`, err.message);
        }
    }
};
ensureRuntimeDirs();

const CONTENT_FILE_PATHS = {
    'site-content': SITE_CONTENT_PATH,
    'events': EVENTS_FILE_PATH,
    'news': NEWS_FILE_PATH,
    'gallery-photos': GALLERY_PHOTOS_FILE_PATH,
    'videos': VIDEOS_FILE_PATH,
    'drivers': DRIVERS_FILE_PATH
};

let dbReady = false;
let dbInitInProgress = false;
let lastDbInitAttemptAt = 0;

// ------------------------------------------
// DATABASE HELPERS & MIGRATION
// ------------------------------------------
// ... (migration logic uses these paths)

const getContentFromDB = async (id) => {
    if (!dbReady) return null;
    try {
        const [rows] = await pool.query('SELECT content_data FROM site_content WHERE id = ?', [id]);
        if (rows.length > 0) {
            return JSON.parse(rows[0].content_data);
        }
        return null;
    } catch (error) {
        console.error(`Error getting content for ${id}:`, error);
        dbReady = false;
        return null;
    }
};

const saveContentToDB = async (id, data) => {
    if (!dbReady) return false;
    try {
        const jsonData = JSON.stringify(data);
        await pool.query(
            'INSERT INTO site_content (id, content_data) VALUES (?, ?) ON DUPLICATE KEY UPDATE content_data = ?',
            [id, jsonData, jsonData]
        );
        return true;
    } catch (error) {
        console.error(`Error saving content for ${id}:`, error);
        dbReady = false;
        return false;
    }
};

const getContentFromFile = async (id) => {
    const filePath = CONTENT_FILE_PATHS[id];
    if (!filePath) return null;
    try {
        const raw = await fsPromises.readFile(filePath, 'utf8');
        return JSON.parse(raw);
    } catch {
        return null;
    }
};

const saveContentToFile = async (id, data) => {
    const filePath = CONTENT_FILE_PATHS[id];
    if (!filePath) return false;
    try {
        await fsPromises.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error(`Error saving content file for ${id}:`, error);
        return false;
    }
};

const getContent = async (id, fallback = []) => {
    if (!dbReady && !dbInitInProgress && Date.now() - lastDbInitAttemptAt > 15000) {
        initDB(1).catch(() => { });
    }

    const dbData = await getContentFromDB(id);
    if (dbData !== null) return dbData;

    const fileData = await getContentFromFile(id);
    if (fileData !== null) return fileData;

    return fallback;
};

const saveContent = async (id, data) => {
    if (!dbReady && !dbInitInProgress && Date.now() - lastDbInitAttemptAt > 15000) {
        initDB(1).catch(() => { });
    }

    const dbSaved = await saveContentToDB(id, data);
    const fileSaved = await saveContentToFile(id, data);
    return dbSaved || fileSaved;
};

const migrateFilesToDB = async () => {
    const filesToMigrate = [
        { id: 'site-content', path: SITE_CONTENT_PATH },
        { id: 'events', path: EVENTS_FILE_PATH },
        { id: 'news', path: NEWS_FILE_PATH },
        { id: 'gallery-photos', path: GALLERY_PHOTOS_FILE_PATH },
        { id: 'videos', path: VIDEOS_FILE_PATH },
        { id: 'drivers', path: DRIVERS_FILE_PATH }
    ];

    for (const file of filesToMigrate) {
        try {
            if (fs.existsSync(file.path)) {
                const data = await fsPromises.readFile(file.path, 'utf8');
                await saveContentToDB(file.id, JSON.parse(data));
                console.log(`[MIGRATION] ${file.id} data synced to database.`);
            }
        } catch (err) {
            console.error(`[MIGRATION] Failed for ${file.id}:`, err);
        }
    }
};

initDB();

// ------------------------------------------
// CORE ROUTES
// ------------------------------------------
app.get('/', (req, res) => {
    res.send('Admin Backend is running!');
});

app.get('/api', async (req, res) => {
    const users = await getUsers();
    let fileInfo = { exists: false, path: USERS_FILE_PATH };
    try {
        const stats = await fsPromises.stat(USERS_FILE_PATH);
        fileInfo.exists = true;
        fileInfo.mtime = stats.mtime;
        fileInfo.size = stats.size;
    } catch (e) { }
    res.json({
        status: 'ready',
        version: '1.2.6',
        port: PORT,
        userCount: users.length,
        database: fileInfo,
        adminEnabled: true,
        message: 'Forsaj API is fully operational'
    });
});

app.get('/api/ping', (req, res) => {
    res.json({ pong: true, time: new Date().toISOString() });
});

// API: Database Connectivity Check
app.get('/api/db-status', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query('SELECT 1 as connected');
        connection.release();
        res.json({
            status: 'connected',
            details: 'Database is reachable',
            host: process.env.MYSQL_HOST || 'localhost',
            user: process.env.MYSQL_USER || 'forsaj_user'
        });
    } catch (e) {
        console.error('Database Status Check Failed:', e);
        res.status(500).json({
            status: 'error',
            message: 'Database connection failed',
            details: e.message,
            code: e.code,
            host: process.env.MYSQL_HOST || 'localhost'
        });
    }
});

app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        db_pool: !!pool
    });
});

app.get('/', (req, res) => {
    res.send('Forsaj Backend API is running. Use /api/health for details.');
});

app.use('/uploads', express.static(UPLOAD_DIR_PATH));

// API: Get Gallery Photos
app.get('/api/gallery-photos', async (req, res) => {
    try {
        const data = await getContent('gallery-photos', []);
        res.json(data);
    } catch (error) {
        console.error('Error reading gallery photos:', error);
        res.status(500).json({ error: 'Failed to read gallery photos' });
    }
});

// API: Save Gallery Photos
app.post('/api/gallery-photos', async (req, res) => {
    try {
        const photos = req.body;
        const ok = await saveContent('gallery-photos', photos);
        if (!ok) return res.status(500).json({ error: 'Failed to save gallery photos' });
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving gallery photos:', error);
        res.status(500).json({ error: 'Failed to save gallery photos' });
    }
});

// Helper: Get Users
const getUsers = async () => {
    try {
        await fsPromises.access(USERS_FILE_PATH);
        const data = await fsPromises.readFile(USERS_FILE_PATH, 'utf8');
        return JSON.parse(data);
    } catch {
        return [];
    }
};

// Helper: Save Users
const saveUsers = async (users) => {
    await fsPromises.writeFile(USERS_FILE_PATH, JSON.stringify(users, null, 2));
};

// API: Get Events
app.get('/api/events', async (req, res) => {
    try {
        const data = await getContent('events', []);
        res.json(data);
    } catch (error) {
        console.error('Error reading events:', error);
        res.status(500).json({ error: 'Failed to read events' });
    }
});

// API: Save Events
app.post('/api/events', async (req, res) => {
    try {
        const events = req.body;
        const ok = await saveContent('events', events);
        if (!ok) return res.status(500).json({ error: 'Failed to save events' });
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving events:', error);
        res.status(500).json({ error: 'Failed to save events' });
    }
});

// API: Get News
app.get('/api/news', async (req, res) => {
    try {
        const data = await getContent('news', []);
        res.json(data);
    } catch (error) {
        console.error('Error reading news:', error);
        res.status(500).json({ error: 'Failed to read news' });
    }
});
// API: Save News
app.post('/api/news', async (req, res) => {
    try {
        const news = req.body;
        const ok = await saveContent('news', news);
        if (!ok) return res.status(500).json({ error: 'Failed to save news' });
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving news:', error);
        res.status(500).json({ error: 'Failed to save news' });
    }
});

// ==========================================
// CORE AUTH & SETUP ROUTES (Move to top)
// ==========================================

// API: Get Users (MySQL)
app.get('/api/users', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, username, name, role, created_at FROM users ORDER BY created_at ASC');
        res.json(rows);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'İstifadəçiləri yükləmək mümkün olmadı' });
    }
});

// API: Save User (MySQL Create or Update)
app.post('/api/users', authenticateToken, async (req, res) => {
    const { id, username, name, role, password } = req.body;

    try {
        if (req.user.role !== 'master') {
            return res.status(403).json({ error: 'Yalnız Master Admin istifadəçi əlavə edə bilər' });
        }

        if (id) {
            // Update existing user
            let query = 'UPDATE users SET username = ?, name = ?, role = ? WHERE id = ?';
            let params = [username, name, role, id];

            if (password) {
                const hashedPassword = await bcrypt.hash(password, 10);
                query = 'UPDATE users SET username = ?, name = ?, role = ?, password = ? WHERE id = ?';
                params = [username, name, role, hashedPassword, id];
            }

            await pool.query(query, params);
        } else {
            // Create new user
            const hashedPassword = await bcrypt.hash(password, 10);
            await pool.query(
                'INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)',
                [username, hashedPassword, name, role || 'secondary']
            );
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error saving user:', error);
        res.status(500).json({ error: error.message || 'Xəta baş verdi' });
    }
});

// API: Delete User (MySQL)
app.delete('/api/users/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        if (req.user.role !== 'master') {
            return res.status(403).json({ error: 'İcazə yoxdur' });
        }

        // Check if last master admin
        const [users] = await pool.query('SELECT * FROM users WHERE role = ?', ['master']);
        const userToDelete = await pool.query('SELECT role FROM users WHERE id = ?', [id]);

        if (userToDelete[0][0]?.role === 'master' && users.length <= 1) {
            return res.status(400).json({ error: 'Sonuncu Master Admini silə bilməzsiniz' });
        }

        await pool.query('DELETE FROM users WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: error.message || 'Silmək mümkün olmadı' });
    }
});

// API: Setup initial Master Admin
// API: Setup initial Master Admin
app.post('/api/setup', async (req, res) => {
    const { username, password, name } = req.body;

    try {
        const [rows] = await pool.query('SELECT COUNT(*) as count FROM users');
        if (rows[0].count > 0) {
            return res.status(400).json({ error: 'Sistem artıq quraşdırılıb' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
            'INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)',
            [username, hashedPassword, name, 'master']
        );

        res.json({ success: true, message: 'Master Admin uğurla yaradıldı' });
    } catch (error) {
        console.error('Setup error:', error);
        res.status(500).json({
            error: 'Quraşdırma zamanı xəta baş verdi',
            details: error.message,
            code: error.code
        });
    }
});

// API: Login
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const [users] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
        if (users.length === 0) {
            return res.status(401).json({ error: 'İstifadəçi tapılmadı' });
        }

        const user = users[0];
        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            return res.status(401).json({ error: 'Şifrə yanlışdır' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role, name: user.name },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Daxil olarkən xəta baş verdi' });
    }
});

// LEGACY SUPPORT /api/check-setup
// API: Check Setup
app.get('/api/check-setup', async (req, res) => {
    try {
        // Using pool.query directly to get count
        const [rows] = await pool.query('SELECT COUNT(*) as count FROM users');
        res.json({ needsSetup: rows[0].count === 0 });
    } catch (e) {
        // If table doesn't exist yet, it needs setup
        res.json({ needsSetup: true });
    }
});

// ==========================================
// CONTENT API ROUTES
// ==========================================

// API: Get Videos
app.get('/api/videos', async (req, res) => {
    try {
        const data = await getContentFromDB('videos');
        res.json(data || []);
    } catch (error) {
        console.error('Error reading videos:', error);
        res.status(500).json({ error: 'Failed to read videos' });
    }
});

// API: Save Videos
app.post('/api/videos', async (req, res) => {
    try {
        const videos = req.body;
        const ok = await saveContent('videos', videos);
        if (!ok) return res.status(500).json({ error: 'Failed to save videos' });
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving videos:', error);
        res.status(500).json({ error: 'Failed to save videos' });
    }
});


// ------------------------------------------
// API ENDPOINTS
// ------------------------------------------

app.get('/api/ping', (req, res) => {
    res.json({ success: true, message: 'API is working' });
});

// API: Upload Image
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR_PATH);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

app.post('/api/upload-image', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    const relativePath = `/uploads/${req.file.filename}`;
    res.json({ url: relativePath });
});

// API: Save Content
app.post('/api/save-content', async (req, res) => {
    try {
        const content = req.body;
        const ok = await saveContent('site-content', content);
        if (!ok) return res.status(500).json({ error: 'Failed to save content' });
        res.json({ success: true });
    } catch (error) {
        console.error('Save error:', error);
        res.status(500).json({ error: 'Failed to save content' });
    }
});

// API: Get Site Content
app.get('/api/site-content', async (req, res) => {
    try {
        const data = await getContent('site-content', []);
        res.json(data);
    } catch (error) {
        console.error('Error reading site content:', error);
        res.status(500).json({ error: 'Failed to read site content' });
    }
});

// API: Get Drivers
app.get('/api/drivers', async (req, res) => {
    try {
        const data = await getContent('drivers', []);
        res.json(data);
    } catch (error) {
        console.error('Error reading drivers:', error);
        res.status(500).json({ error: 'Failed to read drivers' });
    }
});

// API: Save Drivers with Automatic Ranking
app.post('/api/drivers', async (req, res) => {
    try {
        let categories = req.body;

        // Automatic Ranking Logic
        if (Array.isArray(categories)) {
            categories = categories.map(cat => {
                if (cat.drivers && Array.isArray(cat.drivers)) {
                    // Sort drivers by points descending
                    cat.drivers.sort((a, b) => (b.points || 0) - (a.points || 0));

                    // Reassign ranks based on sorted order
                    cat.drivers = cat.drivers.map((driver, index) => ({
                        ...driver,
                        rank: index + 1
                    }));
                }
                return cat;
            });
        }

        const ok = await saveContent('drivers', categories);
        if (!ok) return res.status(500).json({ error: 'Failed to save drivers' });
        res.json({ success: true, data: categories });
    } catch (error) {
        console.error('Error saving drivers:', error);
        res.status(500).json({ error: 'Failed to save drivers' });
    }
});

// API: Submit Application
app.post('/api/applications', async (req, res) => {
    const { name, contact, type, content } = req.body;
    try {
        await pool.query(
            'INSERT INTO applications (name, contact, type, content) VALUES (?, ?, ?, ?)',
            [name, contact, type, content]
        );
        res.json({ success: true });
    } catch (error) {
        console.error('Error submitting application:', error);
        res.status(500).json({ error: 'Müraciət göndərilərkən xəta baş verdi' });
    }
});

// API: Get Applications (Auth)
app.get('/api/applications', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM applications ORDER BY created_at DESC');
        res.json(rows);
    } catch (error) {
        console.error('Error fetching applications:', error);
        res.status(500).json({ error: 'Müraciətlər yüklənərkən xəta baş verdi' });
    }
});

// API: Mark Application as Read (Auth)
app.post('/api/applications/:id/read', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('UPDATE applications SET status = "read" WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Error marking application as read:', error);
        res.status(500).json({ error: 'Xəta baş verdi' });
    }
});

// API: Unread Count (Auth)
app.get('/api/applications/unread-count', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT COUNT(*) as count FROM applications WHERE status = "unread"');
        res.json({ count: rows[0].count });
    } catch (error) {
        console.error('Error fetching unread count:', error);
        res.status(500).json({ error: 'Xəta baş verdi' });
    }
});


// Logic from extractJsonMap.cjs
const isTrueText = (str) => {
    if (!str || typeof str !== 'string') return false;
    const trimmed = str.trim();
    if (trimmed.length < 2 || trimmed.length > 300) return false;

    // Must contain at least one letter (including Azerbaijani specific)
    if (!/[a-zA-ZəƏüÜöÖğĞıIçÇşŞ]/.test(trimmed)) return false;

    // Filter out common code characters/patterns
    if (/[{}<>;]/.test(trimmed)) return false;
    if (trimmed.includes('=>')) return false;
    if (trimmed.includes('=')) return false;
    if (trimmed.includes('(') && trimmed.includes(')')) return false; // functions/methods
    if (trimmed.startsWith('.') || trimmed.includes(' .')) return false; // method chaining
    if (trimmed.includes('/') && trimmed.split('/').length > 2) return false; // likely regex or path

    const technicalKeywords = [
        'return ', 'import ', 'export ', 'function', 'const ', 'let ', 'var ',
        'void', 'REZERV', 'replace', 'map', 'filter', 'join', 'split',
        'true', 'false', 'null', 'undefined', 'NaN', 'string', 'number', 'any',
        'async', 'await', 'console.', 'process.', 'fetch', 'failed', 'error',
        'API', 'HTTP', '404', '500', 'status', 'token', 'auth', 'database',
        'MYSQL', 'query', 'payload', 'res.', 'req.', 'next(', 'catch', 'throw'
    ];

    if (technicalKeywords.some(kw => trimmed.toLowerCase().includes(kw.toLowerCase()))) return false;

    return true;
};

// API: Extract Content (Scan Frontend)
app.all('/api/extract-content', async (req, res) => {
    console.log('Starting Clean Content Extraction...');
    try {
        const COMPONENTS_DIR = path.join(__dirname, '../front/components');
        const pagesMap = new Map();

        // Load existing to potentially preserve IDs if needed, 
        // BUT user asked to rebuild extraction. 
        // We will prioritize fresh clean extraction.

        try {
            await fsPromises.access(COMPONENTS_DIR);
            const compFiles = await fsPromises.readdir(COMPONENTS_DIR);

            // Add App.tsx from root if exists
            const FRONT_DIR = path.join(__dirname, '../front');
            const allFiles = compFiles.map(f => path.join(COMPONENTS_DIR, f));
            if (await fsPromises.access(path.join(FRONT_DIR, 'App.tsx')).then(() => true).catch(() => false)) {
                allFiles.push(path.join(FRONT_DIR, 'App.tsx'));
            }

            const tsxFiles = allFiles.filter(f => f.endsWith('.tsx'));

            for (const file of tsxFiles) {
                try {
                    const filePath = file;
                    const content = await fsPromises.readFile(filePath, 'utf8');
                    const pageId = path.basename(file, '.tsx').toLowerCase();
                    const filenameBase = path.basename(file, '.tsx');

                    const AZ_TITLES = {
                        'about': 'HAQQIMIZDA',
                        'news': 'XƏBƏRLƏR',
                        'newspage': 'Xəbər Səhifəsi',
                        'eventspage': 'Tədbirlər Səhifəsi',
                        'driverspage': 'Sürücülər Səhifəsi',
                        'gallerypage': 'Qalereya',
                        'rulespage': 'Qaydalar',
                        'contactpage': 'Əlaqə Səhifəsi',
                        'categoryleaders': 'Kateqoriya Liderləri',
                        'footer': 'Sayt Sonu',
                        'hero': 'Giriş Hissəsi',
                        'marquee': 'Sürüşən Yazı',
                        'navbar': 'Naviqasiya',
                        'nextrace': 'Növbəti Yarış',
                        'partners': 'Tərəfdaşlar',
                        'socials': 'Sosial Media',
                        'videoarchive': 'Video Arxiv',
                        'whatisoffroad': 'Offroad Nədir?',
                        'home': 'ANA SƏHİFƏ',
                        'app': 'Ümumi Ayarlar'
                    };

                    const title = AZ_TITLES[pageId] || filenameBase;
                    const items = [];
                    const seenValues = new Set();

                    // Strip noise
                    const clean = content
                        .replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1')
                        .replace(/import\s+.*?from\s+['"].*?['"];?/g, '')
                        .replace(/style=\{\{[\s\S]*?\}\}/g, '')
                        .replace(/console\.(log|error|warn|info)\s*\([\s\S]*?\);?/g, '')
                        .replace(/throw\s+new\s+Error\s*\([\s\S]*?\);?/g, '');

                    let match;

                    // 1. JSX Text
                    const jsxRegex = />([^<{}]+)</g;
                    while ((match = jsxRegex.exec(clean)) !== null) {
                        let text = match[1].trim().replace(/\s+/g, ' ');
                        if (isTrueText(text) && !seenValues.has(text)) {
                            seenValues.add(text);

                            // Look for nearby URL context
                            const context = clean.slice(Math.max(0, match.index - 150), Math.min(clean.length, match.index + 150));
                            const urlMatch = context.match(/(?:onViewChange|onClick|handleViewChange|handleAction)\s*\(\s*['"]([^'"]+)['"]/i) ||
                                context.match(/(?:href|to|id|path|url)=['"]([^'"]+)['"]/i);
                            const url = urlMatch ? urlMatch[1] : undefined;

                            const slug = text.slice(0, 15).toLowerCase().replace(/[^a-z0-9]+/g, '-');

                            // Specific safeguard for navbar: only extract if it has a valid-looking URL 
                            // and isn't a known internal technical string.
                            if (pageId === 'navbar') {
                                const internalStrings = ['FORSAJ', 'CLUB', 'SITE_LOGO_LIGHT', 'AZ', 'RU', 'ENG'];
                                if (internalStrings.includes(text.toUpperCase()) || !url) {
                                    continue;
                                }
                            }

                            if (pageId === 'partners') {
                                const junkStrings = ['TITLE', 'OFFICIAL PARTNER', 'SECTION_TITLE', 'PARTNER_1', 'PARTNER_2', 'PARTNER_3', 'PARTNER_4'];
                                if (junkStrings.includes(text.toUpperCase())) {
                                    continue;
                                }
                            }

                            items.push({
                                pos: match.index,
                                item: {
                                    id: `txt-${slug}-${Math.floor(Math.random() * 1000)}`,
                                    type: 'text',
                                    label: text.length > 20 ? text.slice(0, 20) + '...' : text.toUpperCase(),
                                    value: text,
                                    url: url
                                }
                            });
                        }
                    }

                    // 2. Attributes
                    const attrRegex = /\s(placeholder|title|alt|label)=(['"])(.*?)\2/g;
                    while ((match = attrRegex.exec(clean)) !== null) {
                        const attr = match[1];
                        const text = match[3];
                        if (isTrueText(text) && !seenValues.has(text)) {
                            seenValues.add(text);
                            const slug = text.slice(0, 15).toLowerCase().replace(/[^a-z0-9]+/g, '-');
                            items.push({
                                pos: match.index,
                                item: {
                                    id: `attr-${slug}-${Math.floor(Math.random() * 1000)}`,
                                    type: 'text',
                                    label: `${attr.toUpperCase()}: ${text.slice(0, 15)}...`,
                                    value: text
                                }
                            });
                        }
                    }

                    // 3. getText and getUrl calls
                    const getTextRegex = /getText\s*\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*\)/g;
                    while ((match = getTextRegex.exec(clean)) !== null) {
                        const key = match[1];
                        const text = match[2];
                        if (isTrueText(text) && !seenValues.has(text)) {
                            seenValues.add(text);

                            // Try to find a corresponding getUrl call for the same key
                            const getUrlRegex = new RegExp(`getUrl\\s*\\(\\s*['"]${key}['"]\\s*,\\s*['"]([^'"]+)['"]\\s*\\)`, 'g');
                            const urlMatch = getUrlRegex.exec(clean);
                            const url = urlMatch ? urlMatch[1] : undefined;

                            items.push({
                                pos: match.index,
                                item: {
                                    id: key,
                                    type: 'text',
                                    label: `KEY: ${key}`,
                                    value: text,
                                    url: url
                                }
                            });
                        }
                    }

                    // 4. Quoted strings (Natural Language)
                    const quotedRegex = /(['"])([A-ZƏÜÖĞIÇŞ][^'"]{3,})\1/g;
                    while ((match = quotedRegex.exec(clean)) !== null) {
                        const text = match[2];
                        const isTechnical = /^[a-z]+[A-Z]/.test(text) || text.includes('/') || text.includes('{');
                        if (isTrueText(text) && !seenValues.has(text) && !isTechnical) {
                            seenValues.add(text);

                            // Look for nearby URL context
                            const context = clean.slice(Math.max(0, match.index - 100), Math.min(clean.length, match.index + 100));
                            const urlMatch = context.match(/(?:id|url|href|path|to|view)\s*[:=]\s*['"]([^'"]+)['"]/i);
                            const url = urlMatch ? urlMatch[1] : undefined;

                            const slug = text.slice(0, 15).toLowerCase().replace(/[^a-z0-9]+/g, '-');
                            items.push({
                                pos: match.index,
                                item: {
                                    id: `lbl-${slug}-${Math.floor(Math.random() * 1000)}`,
                                    type: 'text',
                                    label: text.length > 20 ? text.slice(0, 20) + '...' : text,
                                    value: text,
                                    url: url
                                }
                            });
                        }
                    }

                    // 5. Images
                    const imgRegex = /src\s*=\s*(['"])(.*?)\1/g;
                    while ((match = imgRegex.exec(clean)) !== null) {
                        const src = match[2];
                        if (src.match(/\.(png|jpg|jpeg|svg|webp|gif)/i) || src.startsWith('http')) {
                            items.push({
                                pos: match.index,
                                item: {
                                    id: `img-${Math.floor(Math.random() * 1000)}`,
                                    path: src,
                                    alt: 'Bölmədəki Şəkil',
                                    type: 'local'
                                }
                            });
                        }
                    }

                    items.sort((a, b) => a.pos - b.pos);
                    const sections = items.filter(i => i.item.type === 'text').map(i => i.item);
                    const images = items.filter(i => i.item.path).map(i => i.item);

                    if (sections.length > 0 || images.length > 0) {
                        pagesMap.set(pageId, {
                            id: pageId,
                            title: title,
                            sections: sections,
                            images: images
                        });
                    }
                } catch (fileErr) {
                    console.error(`Failed to scan file ${file}:`, fileErr);
                }
            }

        } catch (err) {
            console.error('Error reading components directory:', err);
        }

        const newContent = Array.from(pagesMap.values());

        // Custom Sort order for popular pages
        const orderWeight = {
            'home': 1, 'about': 2, 'news': 3, 'newspage': 4,
            'events': 5, 'eventspage': 6, 'drivers': 7,
            'driverspage': 8, 'gallery': 9, 'gallerypage': 10,
            'rules': 11, 'rulespage': 12, 'contact': 13, 'contactpage': 14
        };

        newContent.sort((a, b) => (orderWeight[a.id] || 100) - (orderWeight[b.id] || 100));

        await fsPromises.writeFile(SITE_CONTENT_PATH, JSON.stringify(newContent, null, 2));

        // GENERATE SITEMAP (Page-Based Grouping)
        const sitemap = [
            { title: 'DASHBOARD', icon: 'Layout', path: '/' },
            {
                title: 'ANA SƏHİFƏ',
                icon: 'Home',
                children: [
                    { title: 'Ümumi Görünüş', path: '/?page=home', icon: 'Layout' },
                    { title: 'Naviqasiya', path: '/?page=navbar', icon: 'Menu' },
                    { title: 'Giriş Hissəsi', path: '/?page=hero', icon: 'Maximize' },
                    { title: 'Sürüşən Yazı', path: '/?page=marquee', icon: 'Type' },
                    { title: 'Kateqoriya Liderləri', path: '/?page=categoryleaders', icon: 'Star' },
                    { title: 'Sayt Sonu', path: '/?page=footer', icon: 'Anchor' }
                ]
            },
            {
                title: 'HAQQIMIZDA',
                icon: 'Info',
                children: [
                    { title: 'Ümumi Məlumat', path: '/?page=about', icon: 'FileText' }
                ]
            },
            {
                title: 'XƏBƏRLƏR',
                icon: 'FileText',
                children: [
                    { title: 'Xəbər Siyahısı', path: '/?mode=news', icon: 'List' },
                    { title: 'Xəbər Səhifəsi', path: '/?page=newspage', icon: 'Layout' }
                ]
            },
            {
                title: 'TƏDBİRLƏR',
                icon: 'Calendar',
                children: [
                    { title: 'Tədbir Təqvimi', path: '/?mode=events', icon: 'Clock' },
                    { title: 'Tədbir Səhifəsi', path: '/?page=eventspage', icon: 'Layout' }
                ]
            },
            {
                title: 'SÜRÜCÜLƏR',
                icon: 'Trophy',
                children: [
                    { title: 'Sürücü Reytinqi', path: '/?mode=drivers', icon: 'Award' },
                    { title: 'Sürücülər Səhifəsi', path: '/?page=driverspage', icon: 'Layout' }
                ]
            },
            {
                title: 'QALEREYA',
                icon: 'Image',
                children: [
                    { title: 'Video Arxivi', path: '/?mode=videos', icon: 'Video' },
                    { title: 'Foto Arxiv', path: '/?mode=photos', icon: 'Image' },
                    { title: 'Qalereya Səhifəsi', path: '/?page=gallerypage', icon: 'Layout' }
                ]
            },
            {
                title: 'QAYDALAR',
                icon: 'Shield',
                children: [
                    { title: 'Qaydalar Səhifəsi', path: '/?page=rulespage', icon: 'Layout' }
                ]
            },
            {
                title: 'ƏLAQƏ',
                icon: 'Phone',
                children: [
                    { title: 'Əlaqə Səhifəsi', path: '/?page=contactpage', icon: 'Layout' }
                ]
            },
            { title: 'ADMİN HESABLARI', icon: 'Users', path: '/users-management' },
            { title: 'SİSTEM AYARLARI', icon: 'Settings', path: '/frontend-settings' }
        ];

        try {
            await fsPromises.writeFile(ADMIN_SITEMAP_PATH, JSON.stringify(sitemap, null, 2));
            console.log('Sitemap generated successfully.');
        } catch (err) {
            console.error('Failed to write sitemap:', err);
        }

        const stats = {
            total: newContent.length,
            sections: newContent.reduce((acc, p) => acc + p.sections.length, 0),
            images: newContent.reduce((acc, p) => acc + p.images.length, 0)
        };

        console.log(`Extraction complete. Pages: ${stats.total}, Sections: ${stats.sections}, Images: ${stats.images}`);

        // Return structured data with stats
        res.json({
            pages: newContent,
            stats: stats,
            sitemap: sitemap
        });

    } catch (error) {
        console.error('Extraction error:', error);
        res.status(500).json({ error: 'Internal Server Error during extraction' });
    }
});

// API: Get Content
app.get('/api/get-content', async (req, res) => {
    try {
        const data = await getContent('site-content', []);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to read content' });
    }
});

// API: Get Sitemap
app.get('/api/sitemap', async (req, res) => {
    try {
        let sitemap = [];
        try {
            await fsPromises.access(ADMIN_SITEMAP_PATH);
            const data = await fsPromises.readFile(ADMIN_SITEMAP_PATH, 'utf8');
            sitemap = JSON.parse(data);
        } catch {
            // Default sitemap if file doesn't exist
            sitemap = [
                { title: 'Dashboard', icon: 'Layout', path: '/' }
            ];
        }

        // Ensure Admin Management and Settings are always present for the frontend to filter
        const coreLinks = [
            { title: 'Admin Hesabları', icon: 'Users', path: '/users-management' },
            { title: 'Sistem Ayarları', icon: 'Settings', path: '/frontend-settings' }
        ];

        coreLinks.forEach(link => {
            if (!sitemap.find(item => item.path === link.path)) {
                sitemap.push(link);
            }
        });

        res.json(sitemap);
    } catch (error) {
        console.error('Sitemap read error:', error);
        res.status(500).json({ error: 'Failed to read sitemap' });
    }
});

// API: Get All Images
app.get('/api/all-images', (req, res) => {
    try {
        // Simple scan for images in public dir
        const scanDir = (dir, list = []) => {
            if (!fs.existsSync(dir)) return list;
            const files = fs.readdirSync(dir);
            for (const f of files) {
                const full = path.join(dir, f);
                const stat = fs.statSync(full);
                if (stat.isDirectory()) {
                    if (f !== 'node_modules' && f !== '.git') scanDir(full, list);
                } else if (/\.(png|jpe?g|svg|webp|gif)$/i.test(f)) {
                    list.push(full.replace(FRONT_PUBLIC_DIR, ''));
                }
            }
            return list;
        };
        const images = scanDir(FRONT_PUBLIC_DIR);
        res.json({ local: images });
    } catch (e) {
        res.json({ local: [] });
    }
});

app.post('/api/frontend/action', (req, res) => {
    res.json({ status: 'running' }); // Dummy for now
});

const os = require('os');

app.get('/api/frontend/status', (req, res) => {
    // CPU Load (approximate)
    const cpus = os.cpus();
    const load = os.loadavg()[0]; // 1 minute load average
    const cpuPercentage = Math.min(100, Math.round((load / cpus.length) * 100));

    // RAM Usage
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const ramPercentage = Math.round((usedMem / totalMem) * 100);
    const usedGB = (usedMem / (1024 * 1024 * 1024)).toFixed(1);
    const totalGB = (totalMem / (1024 * 1024 * 1024)).toFixed(1);

    // Uptime
    const uptime = os.uptime();
    const days = Math.floor(uptime / (3600 * 24));
    const hours = Math.floor((uptime % (3600 * 24)) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const uptimeStr = `${days}d ${hours}h ${minutes}m`;

    res.json({
        status: 'running',
        port: 5173,
        stats: {
            cpu: cpuPercentage,
            ram: {
                total: parseFloat(totalGB),
                used: parseFloat(usedGB),
                percentage: ramPercentage
            },
            versions: {
                project: 'v1.1.0',
                node: process.version,
                vite: 'v5.1.4'
            },
            uptime: uptimeStr
        }
    });
});

// User management section above


// Final Catch-all for diagnostics
app.use((req, res) => {
    console.warn(`404 - Unmatched Request: ${req.method} ${req.originalUrl || req.url}`);
    res.status(404).json({
        error: `Route not found: ${req.method} ${req.originalUrl || req.url}`,
        suggestion: 'Check the URL or method. Available base: /api/check-setup, /api/login, /api/get-content',
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Admin Backend running at http://0.0.0.0:${PORT}`);
});
