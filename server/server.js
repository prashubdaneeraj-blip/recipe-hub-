import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const User = mongoose.model('User', new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
}));
const Recipe = mongoose.model('Recipe', new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  image: { type: String, default: '' },
  category: { type: String, default: 'Other' },
  cookTime: { type: Number, default: 30 },
  servings: { type: Number, default: 2 },
  ingredients: [String],
  steps: [String],
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true }));

const app = express();
app.use(cors(), express.json());
const sign = (u) => jwt.sign({ id: u._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
const wrap = (fn) => (req, res) => fn(req, res).catch((e) => res.status(500).json({ message: e.message }));
const uid = (req) => jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), process.env.JWT_SECRET).id;
const auth = (req, res, next) => {
  try { req.userId = uid(req); next(); } catch { res.status(401).json({ message: 'Please log in first.' }); }
};
const optAuth = (req, _res, next) => { try { req.userId = uid(req); } catch {} next(); };
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

app.post('/api/auth/register', wrap(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || (password || '').length < 6) return res.status(400).json({ message: 'Enter a name, email and a password of 6+ characters.' });
  if (await User.findOne({ email: email.toLowerCase() })) return res.status(400).json({ message: 'That email is already registered.' });
  const u = await User.create({ name, email, password: await bcrypt.hash(password, 10) });
  res.json({ token: sign(u), user: { id: u._id, name: u.name } });
}));
app.post('/api/auth/login', wrap(async (req, res) => {
  const u = await User.findOne({ email: (req.body.email || '').toLowerCase() });
  if (!u || !(await bcrypt.compare(req.body.password || '', u.password))) return res.status(400).json({ message: 'Email or password is incorrect.' });
  res.json({ token: sign(u), user: { id: u._id, name: u.name } });
}));

app.get('/api/recipes', optAuth, wrap(async (req, res) => {
  const { q, category, mine } = req.query, f = {};
  if (q) { const re = new RegExp(esc(q), 'i'); f.$or = [{ title: re }, { ingredients: re }]; }
  if (category && category !== 'All') f.category = category;
  if (mine) f.author = req.userId || null;
  res.json(await Recipe.find(f).sort('-createdAt').populate('author', 'name'));
}));
app.get('/api/recipes/:id', wrap(async (req, res) => {
  const r = await Recipe.findById(req.params.id).populate('author', 'name');
  r ? res.json(r) : res.status(404).json({ message: 'Recipe not found.' });
}));
const pick = (b) => ({ title: b.title, description: b.description, image: b.image, category: b.category, cookTime: b.cookTime, servings: b.servings, ingredients: b.ingredients, steps: b.steps });
app.post('/api/recipes', auth, wrap(async (req, res) => {
  if (!req.body.title) return res.status(400).json({ message: 'Give your recipe a title.' });
  res.json(await Recipe.create({ ...pick(req.body), author: req.userId }));
}));
app.put('/api/recipes/:id', auth, wrap(async (req, res) => {
  const r = await Recipe.findById(req.params.id);
  if (!r) return res.status(404).json({ message: 'Recipe not found.' });
  if (String(r.author) !== req.userId) return res.status(403).json({ message: 'You can only edit your own recipes.' });
  Object.assign(r, pick(req.body)); res.json(await r.save());
}));
app.delete('/api/recipes/:id', auth, wrap(async (req, res) => {
  const r = await Recipe.findById(req.params.id);
  if (!r) return res.status(404).json({ message: 'Recipe not found.' });
  if (String(r.author) !== req.userId) return res.status(403).json({ message: 'You can only delete your own recipes.' });
  await r.deleteOne(); res.json({ ok: true });
}));
app.post('/api/recipes/:id/like', auth, wrap(async (req, res) => {
  const r = await Recipe.findById(req.params.id);
  if (!r) return res.status(404).json({ message: 'Recipe not found.' });
  const i = r.likes.findIndex((x) => String(x) === req.userId);
  i >= 0 ? r.likes.splice(i, 1) : r.likes.push(req.userId);
  await r.save(); res.json({ likes: r.likes });
}));

const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '../client/dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^\/(?!api).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

mongoose.connect(process.env.MONGO_URI).then(() => {
  app.listen(process.env.PORT || 5000, () => console.log('API running on port', process.env.PORT || 5000));
}).catch((e) => { console.error('MongoDB connection failed:', e.message); process.exit(1); });
