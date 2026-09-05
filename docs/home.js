const features = {
  clocks: { label: 'Your world, together.', caption: 'Your local time, your saved cities, and the difference between them.', alt: 'Hourfolk world clocks', light: 'clocks-light.png', dark: 'clocks-dark.png' },
  plan: { label: 'Make the next moment clear.', caption: 'A city, a time, and a clear answer about what it means for you.', alt: 'Hourfolk natural-language planner', light: 'plan-light.png', dark: 'plan-dark.png' },
  reminders: { label: 'A heads-up, on your terms.', caption: 'Choose multiple early alerts. The at-time reminder stays included.', alt: 'Hourfolk reminder composer', light: 'reminders-light.png', dark: 'reminders-dark.png' },
};
const tabs = [...document.querySelectorAll('[data-feature]')];
const themeButtons = [...document.querySelectorAll('[data-theme]')];
let activeFeature = 'clocks';
let activeTheme = 'light';
function renderPreview() {
  const feature = features[activeFeature];
  const image = document.querySelector('#product-image');
  image.src = 'assets/' + feature[activeTheme];
  image.alt = feature.alt + ' in ' + activeTheme + ' mode';
  document.querySelector('#preview-label').textContent = feature.label;
  document.querySelector('#preview-caption').textContent = feature.caption;
  document.querySelector('#product-panel').setAttribute('aria-labelledby', 'tab-' + activeFeature);
  tabs.forEach(tab => {
    const selected = tab.dataset.feature === activeFeature;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
  });
  themeButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.theme === activeTheme)));
}
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => { activeFeature = tab.dataset.feature; renderPreview(); });
  tab.addEventListener('keydown', event => {
    let target;
    if (['ArrowDown', 'ArrowRight'].includes(event.key)) target = tabs[(index + 1) % tabs.length];
    if (['ArrowUp', 'ArrowLeft'].includes(event.key)) target = tabs[(index - 1 + tabs.length) % tabs.length];
    if (event.key === 'Home') target = tabs[0];
    if (event.key === 'End') target = tabs[tabs.length - 1];
    if (target) { event.preventDefault(); target.click(); target.focus(); }
  });
});
themeButtons.forEach(button => button.addEventListener('click', () => { activeTheme = button.dataset.theme; renderPreview(); }));
const dialog = document.querySelector('.video-dialog');
const videoContainer = document.querySelector('#video-container');
document.querySelectorAll('[data-video]').forEach(button => button.addEventListener('click', () => {
  const frame = document.createElement('iframe');
  frame.src = 'https://www.youtube-nocookie.com/embed/8ZpMvoMOPVA?autoplay=1';
  frame.title = 'Hourfolk — Time zones, made human';
  frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
  frame.allowFullscreen = true;
  videoContainer.replaceChildren(frame);
  dialog.showModal();
}));
document.querySelector('.close-video').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => videoContainer.replaceChildren());
dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } });
