const APP_URL = "https://seu-dominio-do-backend.com";

function configureAppLinks() {
  document.querySelectorAll("[data-app-link]").forEach((link) => {
    link.href = APP_URL;
  });
}

function configureMenu() {
  const toggle = document.querySelector(".menu-toggle");
  const navigation = document.querySelector(".nav");
  if (!toggle || !navigation) return;

  toggle.addEventListener("click", () => {
    const isOpen = navigation.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  navigation.addEventListener("click", (event) => {
    if (event.target instanceof HTMLAnchorElement) {
      navigation.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    }
  });
}

function configureYear() {
  const year = document.querySelector("#year");
  if (year) year.textContent = String(new Date().getFullYear());
}

configureAppLinks();
configureMenu();
configureYear();
