// app.js
require('dotenv').config();

const express = require('express');
const path = require('path');

const fs = require('fs');
const cookieParser = require('cookie-parser');

const app = express();


// IMPORTANT: make 'views' resolvable in serverless
app.set('view engine', 'ejs');
app.set('views', path.join(process.cwd(), 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(process.cwd(), 'public')));

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const ADMIN_PIN = process.env.ADMIN_PIN || '1234';

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function initDB() {
  if (!fs.existsSync(DB_FILE)) {
    const init = { settings: { registrationsClosed: false, activeGame: 1 }, students: [] };
    fs.writeFileSync(DB_FILE, JSON.stringify(init, null, 2));
  }
}
function readDB() { initDB(); return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8')); }
function writeDB(db) { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2)); }
function isAdmin(req) { return req.cookies && req.cookies.admin_ok === '1'; }

// ---------- routes (copy from your current server.js) ----------
app.get('/', (req, res) => {
  const db = readDB();
  res.render('index', {
    closed: db.settings.registrationsClosed,
    activeGame: db.settings.activeGame,
    success: req.query.success || null,
    error: req.query.error || null
  });
});

// Handle registration
let loggedOnce = false; // debug: only log the first time

app.post('/register', (req, res) => {
  const db = readDB();
  const name = (req.body.name || '').trim();
  const activeGame = db.settings.activeGame;

  // ---- robust phone extraction ----
  let phoneRaw =
    (req.body.phone ??
     req.body.phoneNumber ??
     req.body['phone-number'] ??
     '').toString();

  if (!loggedOnce) {
    console.log('[register] body keys:', Object.keys(req.body));
    console.log('[register] raw phone value:', JSON.stringify(phoneRaw));
    loggedOnce = true;
  }

  // normalize: strip everything except digits
  let phone = phoneRaw.trim().replace(/\D/g, '');
  if (phone.length > 10) phone = phone.slice(-10); // keep last 10 digits

  // ---- validation ----
  if (db.settings.registrationsClosed) {
    return res.redirect('/?error=' + encodeURIComponent('Registrations are closed.'));
  }
  if (!activeGame) {
    return res.redirect('/?error=' + encodeURIComponent('No game is open for registration.'));
  }
  if (!name) {
    return res.redirect('/?error=' + encodeURIComponent('Name is required.'));
  }
  if (!/^[0-9]{10}$/.test(phone)) {
    return res.redirect('/?error=' + encodeURIComponent('Enter a valid 10-digit phone number.'));
  }

  // ---- per-game duplicate check ----
  const alreadyInThisGame = db.students.some(
    (s) => s.phone === phone && s.game === activeGame
  );
  if (alreadyInThisGame) {
    return res.redirect(
      '/?error=' + encodeURIComponent(`This phone is already registered for Game ${activeGame}.`)
    );
  }

  // ---- assign turn number ----
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const turnNumber = db.students.filter((s) => s.game === activeGame).length + 1;

  const student = {
    id,
    name,
    phone,  // stored normalized
    game: activeGame,
    turnNumber,
    createdAt: new Date().toISOString(),
  };

  db.students.push(student);
  writeDB(db);

  // ---- render success page ----
  return res.render('registered', { student, activeGame });
});


app.get('/admin', (req, res) => {
  if (!isAdmin(req)) return res.render('admin-login', { error: null });
  const db = readDB();
  const students = [...db.students].sort((a,b)=> new Date(a.createdAt) - new Date(b.createdAt));
  res.render('admin', { students, closed: db.settings.registrationsClosed, activeGame: db.settings.activeGame });
});

app.post('/admin/login', (req, res) => {
  const pin = (req.body.pin || '').trim();
  if (pin === ADMIN_PIN) {
    res.cookie('admin_ok', '1', { httpOnly: true, sameSite: 'lax', path: '/' });
    return res.redirect('/admin');
  }
  return res.status(401).render('admin-login', { error: 'Invalid PIN' });
});

app.post('/admin/toggle', (req, res) => {
  if (!isAdmin(req)) return res.status(401).send('Unauthorized');
  const db = readDB();
  db.settings.registrationsClosed = !db.settings.registrationsClosed;
  writeDB(db);
  return res.redirect('/admin');
});

app.post('/admin/set-game', (req, res) => {
  if (!isAdmin(req)) return res.status(401).send('Unauthorized');
  const buffers = [];
  req.on('data', c => buffers.push(c));
  req.on('end', () => {
    const form = Buffer.concat(buffers).toString('utf8');
    const game = parseInt(new URLSearchParams(form).get('game') || '0', 10);
    if (game >= 1 && game <= 5) {
      const db = readDB();
      db.settings.activeGame = game;
      writeDB(db);
    }
    return res.redirect('/admin');
  });
});

app.get('/admin/export', (req, res) => {
  if (!isAdmin(req)) return res.status(401).send('Unauthorized');
  const db = readDB();
  const sorted = [...db.students].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const rows = [['name', 'phone', 'game', 'turnNumber', 'createdAt']]
    .concat(sorted.map(s => [s.name, s.phone ?? '', s.game ?? '', s.turnNumber ?? '', s.createdAt]));
  const csv = rows.map(r => r.map(v => `"${(v ?? '').toString().replace(/"/g, '""')}"`).join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="students.csv"');
  res.send(csv);
});

app.post('/admin/logout', (req, res) => {
  res.clearCookie('admin_ok', { path: '/' });
  res.redirect('/admin');
});
// ---------------------------------------------------------------

module.exports = app;
