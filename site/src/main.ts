for (const button of document.querySelectorAll<HTMLButtonElement>("[data-copy]")) {
  button.addEventListener("click", async () => {
    await navigator.clipboard.writeText(button.dataset.copy ?? "");
    button.textContent = "copied";
    setTimeout(() => (button.textContent = "copy"), 1400);
  });
}
