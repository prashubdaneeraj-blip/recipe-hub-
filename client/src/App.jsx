import { useEffect, useState } from 'react';
import { Routes, Route, Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api, getUser, setSession, logout } from './api.js';

const CATS = ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Dessert', 'Drinks', 'Other'];
const fallback = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="260"><rect width="100%" height="100%" fill="%23E4ECDD"/><text x="50%" y="58%" text-anchor="middle" font-size="64">🍲</text></svg>';

export default function App() {
  const [user, setUser] = useState(getUser());
  const nav = useNavigate();
  const out = () => { logout(); setUser(null); nav('/'); };
  return (
    <>
      <header className="bar">
        <Link to="/" className="logo">Recipe Hub</Link>
        <nav>
          {user ? (<>
            <Link to="/?mine=1">My recipes</Link>
            <Link to="/new" className="btn">Add recipe</Link>
            <button className="link" onClick={out}>Log out ({user.name})</button>
          </>) : (<>
            <Link to="/login">Log in</Link>
            <Link to="/register" className="btn">Sign up</Link>
          </>)}
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/recipe/:id" element={<Detail user={user} />} />
          <Route path="/new" element={<Form user={user} />} />
          <Route path="/edit/:id" element={<Form user={user} />} />
          <Route path="/login" element={<Auth mode="login" onAuth={setUser} />} />
          <Route path="/register" element={<Auth mode="register" onAuth={setUser} />} />
        </Routes>
      </main>
    </>
  );
}

function Home() {
  const [sp] = useSearchParams();
  const mine = sp.get('mine');
  const [list, setList] = useState(null);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');
  const [err, setErr] = useState('');
  useEffect(() => {
    const t = setTimeout(() => {
      api(`/recipes?q=${encodeURIComponent(q)}&category=${cat}${mine ? '&mine=1' : ''}`).then(setList).catch((e) => setErr(e.message));
    }, 250);
    return () => clearTimeout(t);
  }, [q, cat, mine]);
  return (<>
    <section className="hero">
      <h1>{mine ? 'Your recipes' : 'What are we cooking today?'}</h1>
      <input className="search" placeholder="Search by dish or ingredient" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="chips">
        {['All', ...CATS].map((c) => <button key={c} className={c === cat ? 'chip on' : 'chip'} onClick={() => setCat(c)}>{c}</button>)}
      </div>
    </section>
    {err && <p className="error">{err}</p>}
    {list && !list.length && <p className="empty">No recipes found. {mine ? <Link to="/new">Add your first recipe</Link> : 'Try another search.'}</p>}
    <div className="grid">
      {(list || []).map((r) => (
        <Link key={r._id} to={`/recipe/${r._id}`} className="card">
          <img src={r.image || fallback} alt="" onError={(e) => (e.target.src = fallback)} />
          <div><h3>{r.title}</h3>
            <p className="meta">{r.category}, {r.cookTime} min, by {r.author?.name || 'unknown'}</p>
            <p className="meta">♥ {r.likes.length}</p></div>
        </Link>))}
    </div>
  </>);
}

function Detail({ user }) {
  const { id } = useParams();
  const nav = useNavigate();
  const [r, setR] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { api('/recipes/' + id).then(setR).catch((e) => setErr(e.message)); }, [id]);
  if (err) return <p className="error">{err}</p>;
  if (!r) return <p className="empty">Loading…</p>;
  const owner = user && r.author?._id === user.id;
  const liked = user && r.likes.includes(user.id);
  const like = () => api(`/recipes/${id}/like`, 'POST').then((d) => setR({ ...r, likes: d.likes })).catch((e) => setErr(e.message));
  const del = async () => { if (confirm('Delete this recipe?')) { await api('/recipes/' + id, 'DELETE'); nav('/'); } };
  return (
    <article className="detail">
      <img src={r.image || fallback} alt="" onError={(e) => (e.target.src = fallback)} />
      <h1>{r.title}</h1>
      <p className="meta">{r.category}, {r.cookTime} min, serves {r.servings}, by {r.author?.name}</p>
      <p>{r.description}</p>
      <div className="actions">
        <button className="btn" onClick={user ? like : () => nav('/login')}>{liked ? '♥ Liked' : '♡ Like'} ({r.likes.length})</button>
        {owner && <><Link className="btn ghost" to={`/edit/${id}`}>Edit</Link><button className="btn danger" onClick={del}>Delete</button></>}
      </div>
      <div className="cols">
        <div><h2>Ingredients</h2><ul>{r.ingredients.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
        <div><h2>Method</h2><ol>{r.steps.map((x, i) => <li key={i}>{x}</li>)}</ol></div>
      </div>
    </article>
  );
}

function Form({ user }) {
  const { id } = useParams();
  const nav = useNavigate();
  const [f, setF] = useState({ title: '', description: '', image: '', category: 'Dinner', cookTime: 30, servings: 2, ingredients: '', steps: '' });
  const [err, setErr] = useState('');
  useEffect(() => {
    if (id) api('/recipes/' + id).then((r) => setF({ ...r, ingredients: r.ingredients.join('\n'), steps: r.steps.join('\n') })).catch((e) => setErr(e.message));
  }, [id]);
  if (!user) return <p className="empty">Please <Link to="/login">log in</Link> to add recipes.</p>;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const lines = (s) => s.split('\n').map((x) => x.trim()).filter(Boolean);
  const submit = async (e) => {
    e.preventDefault();
    try {
      const body = { ...f, cookTime: +f.cookTime, servings: +f.servings, ingredients: lines(f.ingredients), steps: lines(f.steps) };
      const r = id ? await api('/recipes/' + id, 'PUT', body) : await api('/recipes', 'POST', body);
      nav('/recipe/' + r._id);
    } catch (e2) { setErr(e2.message); }
  };
  return (
    <form className="form" onSubmit={submit}>
      <h1>{id ? 'Edit recipe' : 'Add a recipe'}</h1>
      {err && <p className="error">{err}</p>}
      <label>Title<input required value={f.title} onChange={set('title')} /></label>
      <label>Short description<textarea rows="2" value={f.description} onChange={set('description')} /></label>
      <label>Photo link (optional)<input value={f.image} onChange={set('image')} placeholder="https://…" /></label>
      <div className="row">
        <label>Category<select value={f.category} onChange={set('category')}>{CATS.map((c) => <option key={c}>{c}</option>)}</select></label>
        <label>Cook time (min)<input type="number" min="1" value={f.cookTime} onChange={set('cookTime')} /></label>
        <label>Servings<input type="number" min="1" value={f.servings} onChange={set('servings')} /></label>
      </div>
      <label>Ingredients (one per line)<textarea rows="6" value={f.ingredients} onChange={set('ingredients')} /></label>
      <label>Method steps (one per line)<textarea rows="8" value={f.steps} onChange={set('steps')} /></label>
      <button className="btn">{id ? 'Save changes' : 'Publish recipe'}</button>
    </form>
  );
}

function Auth({ mode, onAuth }) {
  const nav = useNavigate();
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    try { const d = await api('/auth/' + mode, 'POST', f); setSession(d); onAuth(d.user); nav('/'); }
    catch (e2) { setErr(e2.message); }
  };
  return (
    <form className="form small" onSubmit={submit}>
      <h1>{mode === 'login' ? 'Log in' : 'Create your account'}</h1>
      {err && <p className="error">{err}</p>}
      {mode === 'register' && <label>Name<input required value={f.name} onChange={set('name')} /></label>}
      <label>Email<input type="email" required value={f.email} onChange={set('email')} /></label>
      <label>Password<input type="password" required minLength="6" value={f.password} onChange={set('password')} /></label>
      <button className="btn">{mode === 'login' ? 'Log in' : 'Sign up'}</button>
    </form>
  );
}
