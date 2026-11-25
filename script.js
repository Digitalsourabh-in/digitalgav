// Mobile navigation
const menuToggle = document.getElementById('menuToggle');
const navLinks = document.getElementById('navLinks');

menuToggle.addEventListener('click', () => {
  const isOpen = navLinks.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(isOpen));
  menuToggle.setAttribute('aria-label', isOpen ? 'मेनू बंद करा' : 'मेनू उघडा');
});

navLinks.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
  });
});

// Simple village search
const searchInput = document.getElementById('villageSearch');
const villageCards = document.querySelectorAll('.village-card');
const noResults = document.getElementById('noResults');

searchInput.addEventListener('input', (event) => {
  const query = event.target.value.trim().toLocaleLowerCase('mr');
  let visibleCount = 0;

  villageCards.forEach((card) => {
    const matches = card.dataset.name.toLocaleLowerCase('mr').includes(query);
    card.hidden = !matches;
    if (matches) visibleCount += 1;
  });

  noResults.hidden = visibleCount !== 0;
});

// Automatically update copyright year
document.getElementById('year').textContent = new Date().getFullYear();
