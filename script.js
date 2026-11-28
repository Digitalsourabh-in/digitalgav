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

// Load published village information from Supabase when public access is configured.
// The existing HTML cards remain visible as a fallback if the API is unavailable
// or there are no published records yet.
async function loadPublishedVillageData() {
  const client = window.digitalGavSupabase;
  if (!client) return;

  try {
    const { data: villages, error: villagesError } = await client
      .from('villages')
      .select('id, name, slug, district, taluka, status')
      .eq('status', 'published');

    if (villagesError) throw villagesError;
    if (!villages || villages.length === 0) return;

    const villageIds = villages.map((village) => village.id);
    const { data: pages, error: pagesError } = await client
      .from('village_pages')
      .select('village_id, content')
      .eq('is_published', true)
      .in('village_id', villageIds);

    if (pagesError) throw pagesError;

    const publishedPageByVillageId = new Map(
      (pages || []).map((page) => [page.village_id, page.content || {}])
    );

    villages.forEach((village) => {
      const pageContent = publishedPageByVillageId.get(village.id);
      if (!pageContent) return;

      const slug = (village.slug || '').toLowerCase();
      const card = document.querySelector(`.village-card[data-name*="${slug}"]`);
      if (!card) return; // Do not create links to village pages that do not exist yet.

      const title = card.querySelector('h3');
      const description = card.querySelector('.card-body p');
      const link = card.querySelector('.village-card-link');
      if (title && (pageContent.title || village.name)) {
        title.textContent = pageContent.title || village.name;
      }
      if (description && pageContent.introduction) {
        description.textContent = pageContent.introduction;
      }
      if (link) {
        link.href = `villages/${slug}.html`;
        link.textContent = 'गावाची माहिती पहा ↗';
      }
      card.dataset.live = 'true';
    });
  } catch (error) {
    // Keep the static village cards working if Supabase is not yet accessible.
    console.warn('Digital Gav could not load published village data:', error.message);
  }
}

loadPublishedVillageData();

// Automatically update copyright year
document.getElementById('year').textContent = new Date().getFullYear();
