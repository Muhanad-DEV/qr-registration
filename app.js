function toISODateOnly(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

document.querySelector('#regForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.querySelector('#name').value.trim();
  if (!name) return;

  const btn = document.querySelector('#submitBtn');
  btn.classList.add('loading');

  const now = new Date();
  document.querySelector('#timestamp').value = now.toISOString();
  document.querySelector('#date').value = toISODateOnly(now);

  e.target.submit();

  e.target.reset();
  document.querySelector('#name').focus();

  // show toast and release button after short delay
  const toast = document.querySelector('#toast');
  toast.textContent = 'تم التسجيل بنجاح';
  toast.hidden = false;
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => (toast.hidden = true), 250);
  }, 1500);
  setTimeout(() => btn.classList.remove('loading'), 600);
});


