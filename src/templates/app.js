document.querySelectorAll("[data-filter-input]").forEach((input) => {
  input.addEventListener("input", (event) => {
    const term = event.target.value.trim().toLowerCase();
    const groupName = event.target.getAttribute("data-filter-input");
    document.querySelectorAll(`[data-filter-group="${groupName}"] .paper-card`).forEach((card) => {
      const haystack = (card.getAttribute("data-search") || "").toLowerCase();
      card.style.display = !term || haystack.includes(term) ? "" : "none";
    });
  });
});
