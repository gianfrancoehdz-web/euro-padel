(function () {
  'use strict';
  if (window.EuroPadelPrivacy) return;
  const KEY = 'europadel_privacy_v1', VERSION = 1, DAYS = 180;
  let memory = null, lastFocus = null, dialog, banner, status, timer;
  function valid(value) {
    return value && value.version === VERSION && value.necessary === true &&
      typeof value.media === 'boolean' && Number.isFinite(value.savedAt) &&
      Number.isFinite(value.expiresAt) && value.savedAt <= Date.now() &&
      value.expiresAt > Date.now() && value.expiresAt - value.savedAt === DAYS * 86400000;
  }
  function read() {
    if (valid(memory)) return memory;
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
      return valid(saved) ? saved : null;
    } catch (_) { return valid(memory) ? memory : null; }
  }
  function allowed() { return read()?.media === true; }
  function mediaUrl(value) {
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:' || url.username || url.password ||
          !['www.youtube.com', 'www.youtube-nocookie.com'].includes(url.hostname) ||
          !/^\/embed\/[A-Za-z0-9_-]+$/.test(url.pathname)) return null;
      url.hostname = 'www.youtube-nocookie.com';
      return url.href;
    } catch (_) { return null; }
  }
  function syncMedia() {
    document.querySelectorAll('iframe[data-ep-media-src]').forEach(frame => {
      const url = mediaUrl(frame.getAttribute('data-ep-media-src'));
      let placeholder = frame.parentElement.querySelector('.ep-media-consent');
      if (allowed() && url) {
        if (frame.getAttribute('src') !== url) frame.setAttribute('src', url);
        if (placeholder) placeholder.remove();
      } else {
        if (frame.hasAttribute('src')) frame.removeAttribute('src');
        if (!placeholder && url) {
          placeholder = document.createElement('div');
          placeholder.className = 'ep-media-consent';
          const message = document.createElement('p');
          message.textContent = 'This video is hosted by YouTube. Allow external media to load it.';
          const button = document.createElement('button');
          button.type = 'button'; button.textContent = 'Choose privacy settings';
          button.addEventListener('click', open);
          placeholder.append(message, button); frame.parentElement.appendChild(placeholder);
        }
      }
    });
  }
  function refresh() {
    if (!banner) return;
    const value = read();
    banner.hidden = !!value;
    document.getElementById('ep-media-choice').checked = value?.media === true;
    syncMedia();
    clearTimeout(timer);
    if (value) timer = setTimeout(refresh, Math.min(value.expiresAt - Date.now() + 10, 2147483647));
  }
  function save(media) {
    const now = Date.now();
    const value = {version:VERSION, necessary:true, media:media === true,
      savedAt:now, expiresAt:now + DAYS * 86400000};
    memory = value;
    let persisted = true;
    try { localStorage.setItem(KEY, JSON.stringify(value)); } catch (_) { persisted = false; }
    if (dialog?.open) close();
    refresh();
    if (status) status.textContent = persisted ? 'Privacy preferences saved. You can change them at any time.'
      : 'Your browser could not save these preferences. They apply to this page only.';
    window.dispatchEvent(new CustomEvent('europadel:privacy', {detail:value}));
    return value;
  }
  function close() {
    dialog.close();
    if (lastFocus?.isConnected) lastFocus.focus();
  }
  function open() {
    if (!dialog) return;
    lastFocus = document.activeElement;
    document.getElementById('ep-media-choice').checked = allowed();
    if (!dialog.open) dialog.showModal();
    document.getElementById('ep-privacy-close').focus();
  }
  function init() {
    const root = document.createElement('div');
    root.id = 'ep-privacy';
    root.innerHTML = `
      <aside id="ep-cookie-banner" class="ep-cookie-banner" aria-labelledby="ep-cookie-title" hidden>
        <div class="ep-cookie-copy"><h2 id="ep-cookie-title">Your privacy, your choice</h2>
        <p>Essential storage keeps your basket and privacy choices. Optional YouTube videos stay off unless you allow them. No advertising or analytics trackers.</p>
        <p class="ep-privacy-links"><a href="./Cookies.dc.html">Cookies & storage</a><a href="./Privacy.dc.html">Privacy notice</a></p></div>
        <div class="ep-cookie-actions"><button type="button" data-privacy="reject">Reject optional</button><button type="button" data-privacy="accept">Accept optional</button><button type="button" data-privacy="open">Configure</button></div>
      </aside>
      <nav class="ep-privacy-footer" aria-label="Legal and privacy"><strong>Customer information</strong><div><a href="./Terms.dc.html">Terms & conditions</a><a href="./Returns.dc.html">Returns & product issues</a><a href="./Privacy.dc.html">Privacy notice</a><a href="./Cookies.dc.html">Cookies & storage</a><button type="button" data-privacy="open">Cookie preferences</button></div></nav>
      <p id="ep-privacy-status" class="ep-sr-only" role="status" aria-live="polite"></p>
      <dialog id="ep-privacy-dialog" aria-labelledby="ep-privacy-heading" aria-describedby="ep-privacy-description">
        <div class="ep-dialog-heading"><h2 id="ep-privacy-heading">Privacy preferences</h2><button type="button" id="ep-privacy-close" aria-label="Close privacy preferences">✕</button></div>
        <p id="ep-privacy-description">Choose what you allow. Refusing optional content does not prevent shopping or payment.</p>
        <section class="ep-privacy-category"><h3>Essential storage <span>Always on</span></h3><p>Keeps your basket, recovers checkout attempts and remembers this choice. It is not used for advertising.</p></section>
        <section class="ep-privacy-category"><label for="ep-media-choice"><strong>External media</strong><input type="checkbox" id="ep-media-choice"></label><p>Allows YouTube videos where present. YouTube may receive your IP address and device information and use its own storage. Videos load only on pages where they are opened.</p><a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">YouTube / Google privacy policy</a></section>
        <p>No analytics or advertising categories are active. Choices last up to 180 days on this browser. <a href="./Cookies.dc.html">Read the storage details</a>.</p>
        <div class="ep-cookie-actions"><button type="button" data-privacy="reject">Reject optional</button><button type="button" data-privacy="accept">Accept optional</button><button type="button" id="ep-privacy-save">Save choices</button></div>
      </dialog>`;
    document.body.appendChild(root);
    const legalFooter = root.querySelector('.ep-privacy-footer');
    const maintenance = document.createElement('aside');
    maintenance.className = 'ep-maintenance';
    maintenance.setAttribute('aria-label', 'Store maintenance');
    maintenance.innerHTML = '<strong>Online ordering is temporarily paused.</strong><span>We are updating the store. Please come back later. For existing orders, <a href="mailto:europadel@yahoo.com">contact customer service</a>.</span>';
    function placePageInformation() {
      document.querySelectorAll('.ep-privacy-footer').forEach(node => {if (node !== legalFooter) node.remove();});
      document.querySelectorAll('.ep-maintenance').forEach(node => {if (node !== maintenance) node.remove();});
      const host = document.querySelector('#dc-root .sc-host > div') || document.body;
      const footer = host.querySelector('footer') || host;
      if (legalFooter.parentElement !== footer) footer.appendChild(legalFooter);
      if (window.EuroPadelConfig?.maintenance === true && maintenance.parentElement !== host) host.prepend(maintenance);
    }
    placePageInformation();
    if (document.body.classList.contains('ep-legal')) {
      const main = document.querySelector('main');
      const headings = Array.from(main.querySelectorAll('h2'));
      const contents = document.createElement('nav');
      contents.className = 'ep-legal-contents';
      contents.setAttribute('aria-label', 'On this page');
      const title = document.createElement('strong'); title.textContent = 'On this page'; contents.append(title);
      headings.forEach((heading, index) => {
        if (!heading.id) heading.id = 'section-' + (index + 1);
        const link = document.createElement('a'); link.href = '#' + heading.id; link.textContent = heading.textContent; contents.append(link);
      });
      if (headings.length) main.insertBefore(contents, headings[0]);
      main.querySelectorAll('table').forEach(table => {
        table.setAttribute('role', 'table');
        const labels = Array.from(table.querySelectorAll('th')).map(cell => cell.textContent);
        table.querySelectorAll('tr').forEach(row => {
          row.setAttribute('role', 'row');
          row.querySelectorAll('td').forEach((cell, index) => {
            cell.setAttribute('role', 'cell');
            cell.setAttribute('data-label', labels[index] || '');
          });
        });
      });
    }
    banner = document.getElementById('ep-cookie-banner');
    dialog = document.getElementById('ep-privacy-dialog');
    status = document.getElementById('ep-privacy-status');
    root.querySelectorAll('[data-privacy]').forEach(button => button.addEventListener('click', () => {
      const action = button.dataset.privacy;
      if (action === 'open') open(); else save(action === 'accept');
    }));
    document.getElementById('ep-privacy-close').addEventListener('click', close);
    legalFooter.querySelector('button').addEventListener('click', open);
    document.getElementById('ep-privacy-save').addEventListener('click', () => save(document.getElementById('ep-media-choice').checked));
    dialog.addEventListener('cancel', event => {event.preventDefault(); close();});
    document.querySelectorAll('[data-open-privacy]').forEach(button => button.addEventListener('click', open));
    window.addEventListener('storage', event => {if (event.key === KEY || event.key === null) {memory = null; refresh();}});
    document.addEventListener('visibilitychange', refresh);
    new MutationObserver(() => {placePageInformation(); syncMedia();}).observe(document.body, {subtree:true,childList:true,attributes:true,attributeFilter:['data-ep-media-src']});
    refresh();
  }
  window.EuroPadelPrivacy = Object.freeze({KEY, VERSION, read, save, open, allowsMedia:allowed});
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();
