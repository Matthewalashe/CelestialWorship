import { cropImage } from '../components/ImageCropper';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Plus, BookOpen, Link2, FileText, Headphones, Video, ExternalLink } from 'lucide-react';
import { usePageTitle } from '../hooks/usePageTitle';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { listArticles, ARTICLE_KINDS, type Article } from '../lib/community';
import { listLibrary, addLibraryItem, LIBRARY_KINDS, type LibraryItem, type LibraryKind } from '../lib/library';
import { ArticleRow, isShepherd, SERIF_STACK } from '../components/ArticleParts';
import { Sheet } from '../components/Dialog';
import { SignInPrompt } from '../components/CommunityStates';
import { showToast } from '../components/Toast';
import { errorMessage } from '../lib/backend';
import { tr } from '../i18n';

/**
 * The Library: everything people write and share, articles and commentaries by shepherds,
 * books (uploaded or linked) and links to resources outside CelestialWorship.
 */

type Tab = 'articles' | 'books' | 'resources';
const LANGS = { en: 'English', yo: 'Yorùbá', egun: 'Egun', fr: 'Français', other: 'Other' } as const;

function KindIcon({ k }: { k: LibraryKind }) {
  const size = 18;
  return k === 'audio' ? <Headphones size={size} /> : k === 'video' ? <Video size={size} /> : k === 'link' ? <Link2 size={size} /> : k === 'sermon' || k === 'study' ? <FileText size={size} /> : <BookOpen size={size} />;
}

function ItemRow({ item }: { item: LibraryItem }) {
  return (
    <a href={item.url} target="_blank" rel="noopener noreferrer nofollow" className="flex gap-4 py-4">
      {item.cover_url
        ? <img src={item.cover_url} alt="" loading="lazy" className="w-14 h-20 rounded-md object-cover shrink-0" />
        : <span className="w-14 h-20 rounded-md flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-muted)' }}><KindIcon k={item.kind} /></span>}
      <span className="flex-1 min-w-0">
        <span className="block font-bold leading-snug" style={{ color: 'var(--color-text-primary)', fontFamily: SERIF_STACK }}>{tr(item.title)}</span>
        <span className="block text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{item.author_name}</span>
        {item.description && <span className="block text-sm mt-1 line-clamp-2" style={{ color: 'var(--color-text-secondary)' }}>{tr(item.description)}</span>}
        <span className="flex items-center gap-1 text-[11px] mt-1.5" style={{ color: 'var(--color-text-muted)' }}>
          {tr(LIBRARY_KINDS[item.kind])} · {tr(LANGS[item.language])} {item.storage_path ? tr('· Read in the browser') : <>· <ExternalLink size={10} /> {new URL(item.url).hostname.replace(/^www\./, '')}</>}
        </span>
      </span>
    </a>
  );
}

function AddItem({ onClose, onDone, initialKind }: { onClose: () => void; onDone: () => void; initialKind: LibraryKind }) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [kind, setKind] = useState<LibraryKind>(initialKind);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState([profile.churchTitle, profile.displayName].filter(Boolean).join(' '));
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState<LibraryItem['language']>('en');
  const [link, setLink] = useState('');
  const [file, setFile] = useState<File | undefined>();
  const [cover, setCover] = useState<File | undefined>();
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  const isBook = kind === 'book' || kind === 'booklet' || kind === 'study';
  const field = 'w-full rounded-xl px-3 py-2.5 text-sm border outline-none';
  const fieldStyle = { backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' };

  const send = async () => {
    setBusy(true);
    try {
      const status = await addLibraryItem({ kind, title, author, description, language, link, file, cover });
      showToast(status === 'published' ? tr('Added to the library') : tr('Sent, a moderator will add it to the library'));
      onDone(); onClose();
    } catch (e) {
      showToast(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet label={tr('Add to the library')} onClose={onClose}>
      {!user ? <SignInPrompt message={tr('Sign in to share a book or a resource.')} /> : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{tr('What is it')}<select value={kind} onChange={e => setKind(e.target.value as LibraryKind)} className={`${field} mt-1`} style={fieldStyle}>
                {(Object.keys(LIBRARY_KINDS) as LibraryKind[]).map(k => <option key={k} value={k}>{tr(LIBRARY_KINDS[k])}</option>)}
              </select>
            </label>
            <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{tr('Language')}<select value={language} onChange={e => setLanguage(e.target.value as LibraryItem['language'])} className={`${field} mt-1`} style={fieldStyle}>
                {(Object.keys(LANGS) as (keyof typeof LANGS)[]).map(l => <option key={l} value={l}>{tr(LANGS[l])}</option>)}
              </select>
            </label>
          </div>
          <label className="block text-xs" style={{ color: 'var(--color-text-muted)' }}>{tr('Title')}<input value={title} onChange={e => setTitle(e.target.value)} maxLength={200} className={`${field} mt-1`} style={fieldStyle} />
          </label>
          <label className="block text-xs" style={{ color: 'var(--color-text-muted)' }}>{tr('Author')}<input value={author} onChange={e => setAuthor(e.target.value)} maxLength={120} className={`${field} mt-1`} style={fieldStyle} />
          </label>
          <label className="block text-xs" style={{ color: 'var(--color-text-muted)' }}>{tr('About it (optional)')}<textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} maxLength={2000} className={`${field} mt-1`} style={fieldStyle} />
          </label>
          {isBook && (
            <div className="flex gap-2">
              <button onClick={() => fileInput.current?.click()} className="flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 border-dashed" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}>
                {file ? file.name : tr('Upload the book (PDF or EPUB)')}
              </button>
              <button onClick={() => coverInput.current?.click()} className="px-3 rounded-xl text-sm border" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>{cover ? tr('Cover ✓') : tr('Cover')}</button>
              <input ref={fileInput} type="file" accept="application/pdf,application/epub+zip" className="hidden" onChange={e => setFile(e.target.files?.[0])} />
              <input ref={coverInput} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void cropImage(f, { aspect: 2 / 3 }).then(c => { if (c) setCover(c); }); }} />
            </div>
          )}
          {!file && (
            <label className="block text-xs" style={{ color: 'var(--color-text-muted)' }}>{isBook ? tr('Or a link to where it can be read or bought') : tr('Link')}
              <input value={link} onChange={e => setLink(e.target.value)} inputMode="url" placeholder="https://…" className={`${field} mt-1`} style={fieldStyle} />
            </label>
          )}
          <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{tr('Share only what you wrote or have the right to share.')}{' '}{isShepherd(profile) && profile.verificationStatus === 'verified' ? tr('As a verified shepherd it is added straight away.') : tr('A moderator checks it before it appears.')}
          </p>
          <button onClick={send} disabled={busy || title.trim().length < 3 || author.trim().length < 2 || (!file && !link.trim())}
                  className="btn-primary w-full py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50">{busy ? tr('Adding…') : tr('Add to the library')}</button>
        </div>
      )}
    </Sheet>
  );
}

export default function Library() {
  usePageTitle('library', 'Library');
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'articles';
  const [search, setSearch] = useState('');
  const [articles, setArticles] = useState<Article[] | null>([]);
  const [items, setItems] = useState<LibraryItem[] | null>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'articles') setArticles(await listArticles({ search }));
      else setItems(await listLibrary({ kind: tab, search }));
    } catch {
      if (tab === 'articles') setArticles(null); else setItems(null);
    } finally {
      setLoading(false);
    }
  }, [tab, search]);
  useEffect(() => { const t = setTimeout(load, search ? 300 : 0); return () => clearTimeout(t); }, [load, search]);

  const tabs: [Tab, string][] = [['articles', 'Articles & commentaries'], ['books', 'Books'], ['resources', 'Resources']];
  const list = tab === 'articles' ? articles : items;

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto pb-24">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold font-[Outfit]" style={{ color: 'var(--color-text-primary)' }}>{tr('Library')}</h1>
        {tab === 'articles'
          ? <Link to="/articles/write" className="px-4 py-2 rounded-full text-sm font-semibold inline-flex items-center gap-1.5 border" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}><Plus size={15} />{' '}{tr('Write')}</Link>
          : <button onClick={() => setAdding(true)} className="px-4 py-2 rounded-full text-sm font-semibold inline-flex items-center gap-1.5 border" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}><Plus size={15} />{' '}{tr('Add')}</button>}
      </div>
      <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>{tr('Teaching, commentaries, books and resources for the Church.')}</p>

      <div className="flex gap-1 mt-4 border-b overflow-x-auto hide-scrollbar" style={{ borderColor: 'var(--color-border)' }} role="tablist">
        {tabs.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setParams({ tab: id }, { replace: true })} className="px-3 py-2 text-sm font-semibold -mb-px border-b-2 whitespace-nowrap"
                  style={tab === id ? { borderColor: 'var(--color-text-primary)', color: 'var(--color-text-primary)' } : { borderColor: 'transparent', color: 'var(--color-text-muted)' }}>{label}</button>
        ))}
      </div>

      <label className="relative block mt-3">
        <span className="sr-only">{tr('Search the library')}</span>
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={tr('Search titles')} className="w-full rounded-full pl-9 pr-3 py-2 text-sm outline-none"
               style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-primary)' }} />
      </label>
      {tab === 'articles' && (
        <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
          {Object.values(ARTICLE_KINDS).join(' · ')}: <Link to="/articles" className="underline">{tr('browse by kind')}</Link>
        </p>
      )}

      {loading ? <p className="text-center py-10 animate-pulse" style={{ color: 'var(--color-text-muted)' }}>{tr('Loading…')}</p>
        : list === null ? <p className="text-center py-10 text-sm" style={{ color: 'var(--color-text-muted)' }}>{tr('The library opens when the church’s online service is set up.')}</p>
        : list.length === 0 ? <p className="text-center py-10 text-sm" style={{ color: 'var(--color-text-muted)' }}>{tr('Nothing here yet.')}</p>
        : (
          <ul className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {tab === 'articles'
              ? (list as Article[]).map(a => <li key={a.id} style={{ borderColor: 'var(--color-border)' }}><ArticleRow a={a} /></li>)
              : (list as LibraryItem[]).map(i => <li key={i.id} style={{ borderColor: 'var(--color-border)' }}><ItemRow item={i} /></li>)}
          </ul>
        )}

      {adding && <AddItem onClose={() => setAdding(false)} onDone={load} initialKind={tab === 'books' ? 'book' : 'link'} />}
    </div>
  );
}
