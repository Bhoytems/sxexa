import { api } from './api';

// Shows the "Allow messages?" popup. Accept asks Telegram for permission, then the server sends the welcome message.
// Closing the popup without answering changes nothing, so it is asked again next time.
export function askForMessages(reloadMe, toast) {
  const tg = window.Telegram?.WebApp;
  if (!tg?.showPopup) return;
  tg.showPopup({
    title: 'Allow messages?',
    message: 'Soledge would like to message you: a welcome note now, and a notice when a withdrawal is paid. You can change this later in Profile.',
    buttons: [{ id: 'accept', type: 'default', text: 'Accept' }, { id: 'reject', type: 'default', text: 'Reject' }],
  }, (id) => {
    if (id === 'reject') { api('/api/notify', { allowed: false }).then(reloadMe).catch(() => {}); return; }
    if (id !== 'accept') return;
    const done = (granted) => api('/api/notify', { allowed: !!granted }).then(reloadMe).catch((e) => toast?.(e.message));
    if (tg.requestWriteAccess) tg.requestWriteAccess(done); else done(true);
  });
}
