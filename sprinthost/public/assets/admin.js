(() => {
  const forms = document.querySelectorAll('[data-cover-form]');

  for (const form of forms) {
    const input = form.querySelector('[data-cover-input]');
    const trigger = form.querySelector('[data-cover-trigger]');
    const status = form.querySelector('[data-cover-status]');
    if (!(input instanceof HTMLInputElement) || !(trigger instanceof HTMLButtonElement)) {
      continue;
    }

    trigger.addEventListener('click', () => input.click());
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) {
        return;
      }
      trigger.disabled = true;
      trigger.classList.add('is-busy');
      if (status) {
        status.textContent = `Загружается ${file.name}`;
      }
      form.requestSubmit();
    });
  }
})();
