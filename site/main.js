// Fill in once the Chrome Web Store listing is live; every install button uses it.
const STORE_URL = ''

for (const link of document.querySelectorAll('[data-store-link]')) {
  if (STORE_URL) {
    link.href = STORE_URL
  } else {
    // Without a listing yet, keep the button inert instead of jumping to the top.
    link.addEventListener('click', (event) => event.preventDefault())
  }
}
