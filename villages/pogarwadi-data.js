/* Digital Gav: apply only approved/published Pogarwadi content to the existing page sections.
   The permanent hero heading/subheading and section headings remain part of the website design. */
(async function () {
  const client = window.digitalGavSupabase;
  if (!client) return;

  const putText = (selector, value) => {
    if (value === undefined || value === null || String(value).trim() === '') return;
    document.querySelectorAll(selector).forEach(node => { node.textContent = String(value); });
  };

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
    const about = content.about || {};
    const stats = content.statistics || {};
    const facilities = content.facilities || {};
    const location = content.location || {};

    const description = about.description || about.introduction || content.introduction;
    putText('.about-simple-copy > p:not(.about-place)', description);
    putText('[data-live-fact="lgdCode"]', about.lgdCode || location.lgd_code);
    putText('[data-live-fact="taluka"]', about.taluka || location.taluka || village.taluka);
    putText('[data-live-fact="district"]', about.district || location.district || village.district);
    putText('[data-live-fact="area"]', about.area || stats.area);

    putText('[data-live-stat="population"]', stats.population);
    putText('[data-live-stat="houses"]', stats.houses);
    putText('[data-live-stat="literacy_rate"]', stats.literacy_rate);
    putText('[data-live-stat="schools"]', facilities.schools);
    putText('[data-live-stat="health_centres"]', facilities.health_centres);
  } catch (error) {
    // Static page defaults remain visible if Supabase is temporarily unavailable.
    console.warn('Pogarwadi published content could not be loaded:', error.message);
  }
})();
