import { useRef, useState } from 'react';
import { Camera, ImagePlus } from 'lucide-react';
import { useProfile } from '../hooks/useProfile';
import { setProfileImage } from '../lib/media';
import { cropImage } from './ImageCropper';
import { showToast } from './Toast';
import { errorMessage } from '../lib/backend';
import { tr } from '../i18n';

/** A person's picture, or their initial */
export function Avatar({ url, name, size = 36 }: { url?: string | null; name: string; size?: number }) {
  const initial = name.replace(/^(Rev(\.|erend)?|Pastor|Shepherd|Very|Most|Evang\.?|Sister|Brother|Bro\.?|Sis\.?)\s+/gi, '').trim()[0]?.toUpperCase() ?? '·';
  return url
    ? <img src={url} alt="" width={size} height={size} loading="lazy" className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />
    : <span className="rounded-full inline-flex items-center justify-center font-bold shrink-0" aria-hidden
            style={{ width: size, height: size, fontSize: size * 0.42, backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-primary)' }}>{initial}</span>;
}

/** Banner and photo at the top of the profile, each changeable with one tap */
export function ProfileMedia() {
  const { profile, save, signedIn } = useProfile();
  const avatarInput = useRef<HTMLInputElement>(null);
  const bannerInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<'avatar' | 'banner' | null>(null);

  const change = async (kind: 'avatar' | 'banner', file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast(tr('Choose a photo')); return; }
    const cropped = await cropImage(file, kind === 'avatar' ? { aspect: 1, round: true } : { aspect: 3 });
    if (!cropped) return;
    setBusy(kind);
    try {
      const url = await setProfileImage(kind, cropped, kind === 'avatar' ? profile.avatarUrl : profile.bannerUrl);
      await save(kind === 'avatar' ? { avatarUrl: url } : { bannerUrl: url });
      showToast(kind === 'avatar' ? tr('Photo updated') : tr('Banner updated'));
    } catch (e) {
      showToast(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const btn = 'absolute w-9 h-9 rounded-full flex items-center justify-center shadow';
  return (
    <div className="relative mb-12">
      <div className="relative w-full aspect-[3/1] rounded-2xl overflow-hidden"
           style={{ background: profile.bannerUrl ? undefined : 'var(--color-bg-card-hover)' }}>
        {profile.bannerUrl && <img src={profile.bannerUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />}
        {signedIn && (
          <button onClick={() => bannerInput.current?.click()} disabled={busy !== null} aria-label={tr('Change banner')}
                  className={`${btn} right-2 bottom-2`} style={{ backgroundColor: 'rgba(0,0,0,0.55)', color: '#fff' }}>
            <ImagePlus size={17} className={busy === 'banner' ? 'animate-pulse' : ''} />
          </button>
        )}
      </div>
      <div className="absolute left-4 -bottom-10">
        <div className="rounded-full p-1" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
          <Avatar url={profile.avatarUrl} name={profile.displayName || '·'} size={84} />
        </div>
        {signedIn && (
          <button onClick={() => avatarInput.current?.click()} disabled={busy !== null} aria-label={tr('Change photo')}
                  className={`${btn} -right-1 bottom-0`} style={{ backgroundColor: 'var(--color-text-primary)', color: 'var(--color-bg-primary)' }}>
            <Camera size={16} className={busy === 'avatar' ? 'animate-pulse' : ''} />
          </button>
        )}
      </div>
      <input ref={avatarInput} type="file" accept="image/*" className="hidden" onChange={e => { change('avatar', e.target.files?.[0]); e.target.value = ''; }} />
      <input ref={bannerInput} type="file" accept="image/*" className="hidden" onChange={e => { change('banner', e.target.files?.[0]); e.target.value = ''; }} />
    </div>
  );
}
