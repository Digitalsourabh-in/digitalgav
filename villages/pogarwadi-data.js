/* Digital Gav: load verified, published Pogarwadi content from Supabase.
   Draft content is never exposed on the public website. */
(async function () {
  const client = window.digitalGavSupabase;
  const hero = document.querySelector('.village-hero');
  if (!client || !hero) return;

  try {
    const { data: village, error: villageError } = await client
      .from('villages')
      .select('id, name, slug, district, taluka')
      .eq('slug', 'pogarwadi')
      .eq('status', 'published')
      .maybeSingle();

    if (villageError) throw villageError;
    if (!village) return;

    const { data: page, error: pageError } = await client
      .from('village_pages')
      .select('content')
      .eq('village_id', village.id)
      .eq('is_published', true)
      .maybeSingle();

    if (pageError) throw pageError;
    if (!page || !page.content) return;

    const content = page.content;
    const section = document.createElement('section');
    section.className = 'container dg-live-village-data';
    section.setAttribute('aria-label', 'पोगरवाडीची अद्ययावत माहिती');

    const heading = document.createElement('div');
    heading.className = 'dg-live-heading';
    const eyebrow = document.createElement('span');
    eyebrow.textContent = 'SUPABASE PUBLISHED CONTENT';
    const title = document.createElement('h2');
    title.textContent = content.title || village.name || 'पोगरवाडी';
    heading.append(eyebrow, title);
    section.append(heading);

    if (content.subtitle) {
      const subtitle = document.createElement('p');
      subtitle.className = 'dg-live-subtitle';
      subtitle.textContent = content.subtitle;
      section.append(subtitle);
    }
    if (content.introduction) {
      const intro = document.createElement('p');
      intro.className = 'dg-live-intro';
      intro.textContent = content.introduction;
      section.append(intro);
    }

    const facts = [];
    const location = content.location || {};
    const stats = content.statistics || {};
    const facilities = content.facilities || {};
    const addFact = (label, value) => {
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        facts.push([label, String(value)]);
      }
    };
    addFact('लोकसंख्या', stats.population);
    addFact('एकूण घरे', stats.houses);
    addFact('साक्षरता दर', stats.literacy_rate);
    addFact('क्षेत्रफळ', stats.area);
    addFact('शाळा', facilities.schools);
    addFact('आरोग्य केंद्रे', facilities.health_centres);
    addFact('तालुका', location.taluka || village.taluka);
    addFact('जिल्हा', location.district || village.district);
    addFact('LGD कोड', location.lgd_code);

    if (facts.length) {
      const grid = document.createElement('div');
      grid.className = 'dg-live-facts';
      facts.forEach(([label, value]) => {
        const card = document.createElement('article');
        const strong = document.createElement('strong');
        const small = document.createElement('span');
        strong.textContent = value;
        small.textContent = label;
        card.append(strong, small);
        grid.append(card);
      });
      section.append(grid);
    }

    hero.insertAdjacentElement('afterend', section);
  } catch (error) {
    // Keep the existing static page usable if the public Data API is unavailable.
    console.warn('Pogarwadi published content could not be loaded:', error.message);
  }
})();
