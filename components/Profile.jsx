'use client';
import LinkWallet from './LinkWallet';
import Admin from './Admin';
import { askForMessages } from '@/lib/notify';

export default function Profile({ me, reloadMe, toast }) {
  return (
    <div className="screen">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, paddingTop: 12 }}>
        {me.photoUrl ? <img className="av" src={me.photoUrl} alt="" width={72} height={72} style={{ width: 72, height: 72 }} /> : <div className="av" style={{ width: 72, height: 72, fontSize: 28 }}>{me.firstName?.[0]}</div>}
        <div style={{ fontSize: 20, fontWeight: 700 }}>{me.firstName}</div>
        <div className="m">{me.username ? `@${me.username} · ` : ''}synced from Telegram</div>
      </div>
      <div className="m">Wallet</div>
      <LinkWallet me={me} reloadMe={reloadMe} toast={toast} />
      {me.notifyStatus !== 'allowed' && (
        <div className="c">
          <div className="m">Messages from Soledge are off, so you will not be told when a withdrawal is paid.</div>
          <button className="sec" style={{ marginTop: 8, width: '100%' }} onClick={() => askForMessages(reloadMe, toast)}>Turn on messages</button>
        </div>
      )}
      {me.isAdmin && <Admin toast={toast} />}
    </div>
  );
}
