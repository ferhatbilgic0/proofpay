'use client';
import { useState } from 'react';

const MAX_BYTES = 3 * 1024 * 1024;

export default function DeliveryForm({ busy, onSubmit }) {
  const [text, setText] = useState('');
  const [links, setLinks] = useState('');
  const [image, setImage] = useState(null);
  const [error, setError] = useState('');

  function pickImage(e) {
    const file = e.target.files?.[0];
    setError('');
    if (!file) return setImage(null);
    if (file.size > MAX_BYTES) {
      e.target.value = '';
      return setError('Choose an image under 3 MB.');
    }
    const reader = new FileReader();
    reader.onload = () => setImage({ name: file.name, dataUrl: reader.result });
    reader.readAsDataURL(file);
  }

  function submit(e) {
    e.preventDefault();
    if (!text.trim() && !links.trim() && !image) return setError('Add notes, a link or an image.');
    onSubmit({ text, links: links.split('\n').map((l) => l.trim()).filter(Boolean), image });
  }

  return (
    <form onSubmit={submit} className="stack">
      <div>
        <label htmlFor="d-text">What are you delivering?</label>
        <textarea id="d-text" value={text} onChange={(e) => setText(e.target.value)}
          placeholder="List what is included and how it meets each criterion. The reviewer only sees what you write and attach." />
      </div>
      <div>
        <label htmlFor="d-links">Links, one per line</label>
        <textarea id="d-links" style={{ minHeight: 60 }} value={links} onChange={(e) => setLinks(e.target.value)} placeholder="https://" />
        <p className="small muted" style={{ margin: '4px 0 0' }}>The reviewer can&rsquo;t open links, so describe what each one contains.</p>
      </div>
      <div>
        <label htmlFor="d-image">Preview image (optional)</label>
        <input id="d-image" type="file" accept="image/png,image/jpeg,image/webp" onChange={pickImage} />
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      <div>
        <button className="btn-primary" disabled={busy}>{busy ? 'Reviewing your delivery…' : 'Submit for review'}</button>
      </div>
    </form>
  );
}
