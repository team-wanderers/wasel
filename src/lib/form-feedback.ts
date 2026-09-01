export function focusInvalidField(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return;

  window.requestAnimationFrame(() => {
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.focus({ preventScroll: true });
  });
}
