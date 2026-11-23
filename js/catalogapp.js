import { filters, matchingCollections } from "./catalog.js";

const form = document.getElementById("catalogFilters");
const nav = document.getElementById("navCatalog");
for (const [key, options] of Object.entries(filters)) {
  for (const value of options) form.elements[key].add(new Option(value, value));
}

function showResults() {
  const selected = Object.fromEntries(new FormData(form));
  const groups = matchingCollections(selected);
  const count = groups.reduce((sum, group) => sum + group.entries.length, 0);
  const filtered = Object.values(selected).some(Boolean);
  form.querySelector("button").hidden = !filtered;
  document.getElementById("catalogCount").textContent = count ? "找到 " + count + " 個活動" : "沒有符合的活動，試試換一個條件。";
  document.getElementById("catalogResults").innerHTML = groups.map(group =>
    '<details class="catalog-group"' + (count <= 12 ? " open" : "") + '><summary>' + group.title +
    '<small>' + group.entries.length + ' 個活動</small></summary><div class="catalog-list">' +
    group.entries.map(item => '<a href="' + item.route + '"><b>' + item.title + '</b><small>' + item.sub + '</small></a>').join("") +
    '</div></details>').join("");
}

function updateSelection() {
  const params = new URLSearchParams();
  for (const [key, value] of new FormData(form)) if (value) params.set(key, value);
  const hash = "#catalog" + (params.size ? "?" + params : "");
  history.replaceState(history.state, "", hash);
  nav.href = hash;
  showResults();
}
form.addEventListener("change", updateSelection);
form.addEventListener("submit", event => {
  event.preventDefault();
  form.reset();
  updateSelection();
  form.elements.level.focus();
});

export function renderCatalog() {
  const params = new URLSearchParams(location.hash.split("?")[1]);
  for (const [key, options] of Object.entries(filters)) {
    form.elements[key].value = options.includes(params.get(key)) ? params.get(key) : "";
  }
  nav.href = location.hash;
  showResults();
}
