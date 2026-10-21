'use client';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { askForMessages } from '@/lib/notify';
import Providers from './Providers';
import Trade from './Trade';
import Positions from './Positions';
import Referrals from './Referrals';
import Profile from './Profile';

const TABS = [
  ['Trade', <><polyline points="3 17 9 11 13 15 21 7" /><polyline points="15 7 21 7 21 13" /></>],
  ['Positions', <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" /></>],
  ['Referrals', <><circle cx="9" cy="8" r="3.5" /><path d="M2 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5" /><circle cx="17" cy="9" r="2.5" /><path d="M17 14.5c3 0 5 1.5 5 4.5" /></>],
  ['Profile', <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></>],
];

function Shell() {
  const [tab, setTab] = useState('Trade');
  const [cfg, setCfg] = useState(null);
  const [me, setMe] = useState(null);
  const [msg, setMsg] = useState(null);
  const [fatal, setFatal] = useState(null);
  const toast = useCallback((m) => { setMsg(m); setTimeout(() => setMsg(null), 4000); }, []);
  const reloadMe = useCallback(() => api('/api/me').then(setMe), []);
  useEffect(() => {
    Promise.all([api('/api/config').then(setCfg), reloadMe()]).catch(() => setFatal('Open Soledge from Telegram to sign in.'));
  }, [reloadMe]);

  useEffect(() => { if (me && me.notifyStatus === null) askForMessages(reloadMe, toast); }, [me?.id]); // first open only

  if (fatal) return <div className="screen"><div className="c">{fatal}</div></div>;
  if (!cfg || !me) return <div className="screen"><div className="m">Loading…</div></div>;
  const props = { cfg, me, reloadMe, toast };
  return (
    <>
      {tab === 'Trade' && <Trade {...props} />}
      {tab === 'Positions' && <Positions {...props} />}
      {tab === 'Referrals' && <Referrals {...props} />}
      {tab === 'Profile' && <Profile {...props} />}
      {msg && <div className="toast" role="status">{msg}</div>}
      <nav className="tabs">
        {TABS.map(([name, icon]) => (
          <button key={name} className={tab === name ? 'on' : ''} onClick={() => setTab(name)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icon}</svg>
            {name}
          </button>
        ))}
      </nav>
    </>
  );
}

export default function App() { return <Providers><Shell /></Providers>; }
