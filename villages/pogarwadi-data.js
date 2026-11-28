/* Digital Gav — public village page renderer.
   All village-specific content is read from the approved Supabase page record.
   Design headings and shared portal links remain part of the reusable template. */
(async function () {
  const db = window.digitalGavSupabase;
  const pageRoot = document.querySelector('.village-content');
  if (!db || !pageRoot) return;

  const clean = value => String(value ?? '').trim();
  const lines = value => clean(value).split(/\r?\n/).map(clean).filter(Boolean);
  const hide = (node, shouldHide = true) => { if (node) node.hidden = shouldHide; };
  const text = (node, value) => { if (node) node.textContent = clean(value); };
  const make = (tag, className, value) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value !== undefined) node.textContent = clean(value);
    return node;
  };
  const section = id => document.getElementById(id);
  const setText = (selector, value) => {
    const node = document.querySelector(selector);
    if (node && clean(value)) node.textContent = clean(value);
  };
  const listCards = (container, entries, className = 'info-card') => {
    if (!container) return;
    container.replaceChildren();
    entries.forEach(entry => {
      if (!clean(entry)) return;
      container.append(make('article', className, entry));
    });
    hide(container, !container.children.length);
  };

  try {
    const { data: village, error: villageError } = await db.from('villages')
      .select('id,name,slug,district,taluka,status')
      .eq('slug', 'pogarwadi').eq('status', 'published').maybeSingle();
    if (villageError) throw villageError;
    if (!village) throw new Error('गाव प्रकाशित स्थितीत उपलब्ध नाही.');

    const { data: page, error: pageError } = await db.from('village_pages')
      .select('content,updated_at').eq('village_id', village.id)
      .eq('is_published', true).maybeSingle();
    if (pageError) throw pageError;
    if (!page?.content) throw new Error('प्रकाशित वेबसाइट माहिती उपलब्ध नाही.');

    const c = page.content || {};
    const about = c.about || {};
    const stats = c.statistics || {};
    const facilities = c.facilities || {};
    const gram = c.gramPanchayat || {};
    const education = c.education || {};
    const health = c.health || {};
    const culture = c.cultureTourism || {};
    const pride = c.villagePride || {};
    const contact = c.contact || {};

    // Hero: shared heading/subheading stay fixed; only the image is village-managed.
    const heroImage = document.querySelector('.village-hero > img');
    if (heroImage && clean(c.hero?.image)) heroImage.src = clean(c.hero.image);

    // About and village facts.
    setText('.about-simple-copy > p:not(.about-place)', about.description || about.introduction || c.introduction);
    const facts = [
      ['lgdCode', about.lgdCode || c.location?.lgd_code],
      ['taluka', about.taluka || c.location?.taluka || village.taluka],
      ['district', about.district || c.location?.district || village.district],
      ['area', about.area || stats.area]
    ];
    facts.forEach(([key, value]) => {
      const node = document.querySelector('[data-live-fact="' + key + '"]');
      if (clean(value)) text(node, value); else hide(node?.parentElement);
    });
    const factCard = document.querySelector('.about-village-facts');
    if (factCard) {
      const anyFact = facts.some(([,value]) => clean(value));
      hide(factCard, !anyFact);
    }

    // Statistics: empty values are removed rather than showing template/demo values.
    const statValues = {
      population: stats.population,
      houses: stats.houses,
      literacy_rate: stats.literacy_rate,
      schools: facilities.schools,
      health_centres: facilities.health_centres
    };
    Object.entries(statValues).forEach(([key, value]) => {
      const node = document.querySelector('[data-live-stat="' + key + '"]');
      if (clean(value)) text(node, value); else hide(node?.closest('.village-stat-card'));
    });
    const statWrap = document.querySelector('.village-statistics');
    if (statWrap) hide(statWrap, !statWrap.querySelector('.village-stat-card:not([hidden])'));

    // Gram Panchayat: only fully completed entries are published.
    const gramSection = section('gram-panchayat');
    const primaryGrid = gramSection?.querySelector(':scope > .official-grid');
    const headings = gramSection ? [...gramSection.querySelectorAll('.subsection-heading')] : [];
    const memberGrid = headings[0]?.nextElementSibling;
    const importantGrid = headings[1]?.nextElementSibling;
    const createOfficial = (designation, person) => {
      if (!clean(designation) || !clean(person?.name)) return null;
      const card = make('article');
      card.append(make('span', '', designation), make('h3', '', person.name));
      const phone = clean(person.phone).replace(/[^0-9+]/g, '');
      if (phone) {
        const call = make('a', 'official-call-button', '☎ कॉल करा');
        call.href = 'tel:' + phone;
        card.append(call);
      }
      return card;
    };
    if (primaryGrid) {
      primaryGrid.replaceChildren();
      ['सरपंच','उपसरपंच','ग्रामसेवक','शिपाई'].forEach((role, i) => {
        const card = createOfficial(role, (gram.keyOfficials || [])[i]);
        if (card) primaryGrid.append(card);
      });
      hide(primaryGrid, !primaryGrid.children.length);
    }
    if (memberGrid) {
      memberGrid.replaceChildren();
      (gram.additionalOfficials || []).slice(0,8).forEach(person => {
        const card = createOfficial(person.designation, person);
        if (card) memberGrid.append(card);
      });
      hide(memberGrid, !memberGrid.children.length);
      hide(headings[0], !memberGrid.children.length);
    }
    // Older content may still have a separate officials list.
    if (importantGrid) {
      importantGrid.replaceChildren();
      (gram.otherOfficials || []).forEach(person => {
        const card = createOfficial(person.designation, person);
        if (card) importantGrid.append(card);
      });
      hide(importantGrid, !importantGrid.children.length);
      hide(headings[1], !importantGrid.children.length);
    }
    if (gramSection) hide(gramSection, ![primaryGrid,memberGrid,importantGrid].some(n => n && !n.hidden));

    // Education and health: dashboard stores one item per line.
    const educationSection = section('education');
    const educationGrid = educationSection?.querySelector('.education-grid');
    const schools = lines(education.schoolsText || education.schools?.map?.(x => typeof x === 'string' ? x : x.name).join('\n'));
    listCards(educationGrid, schools, 'info-card school-card');
    if (educationSection) hide(educationSection, !schools.length);

    const healthSection = section('health');
    const healthGrid = healthSection?.querySelector('.health-team-grid') || healthSection?.querySelector('.contact-mini-grid');
    const healthItems = lines(health.servicesText || health.services?.map?.(x => typeof x === 'string' ? x : x.name).join('\n'));
    listCards(healthGrid, healthItems);
    if (healthSection) hide(healthSection, !healthItems.length);

    // Culture, places and village pride.
    const cultureSection = section('culture');
    if (cultureSection) {
      const oldCards = [...cultureSection.querySelectorAll('.legacy-card')];
      oldCards.forEach(card => card.remove());
      const contentBox = make('div', 'dynamic-text-grid');
      const traditions = lines(culture.traditionsText || culture.traditions?.join?.('\n'));
      const places = lines(culture.placesText || culture.places?.join?.('\n'));
      if (traditions.length) {
        const card = make('article', 'legacy-card');
        card.append(make('h3', '', 'संस्कृती आणि परंपरा'));
        traditions.forEach(item => card.append(make('p', '', item)));
        contentBox.append(card);
      }
      if (places.length) {
        const card = make('article', 'legacy-card');
        card.append(make('h3', '', 'मंदिरे व महत्त्वाची ठिकाणे'));
        places.forEach(item => card.append(make('p', '', item)));
        contentBox.append(card);
      }
      const anchor = cultureSection.querySelector('.section-lead');
      if (anchor) anchor.insertAdjacentElement('afterend', contentBox);
      hide(contentBox, !contentBox.children.length);
      hide(cultureSection, !contentBox.children.length);
    }

    const prideSection = section('pride');
    if (prideSection) {
      const grid = prideSection.querySelector('.legacy-grid');
      const people = lines(pride.peopleText || pride.people?.map?.(x => typeof x === 'string' ? x : [x.name,x.contribution].filter(Boolean).join(' — ')).join('\n'));
      listCards(grid, people, 'legacy-card');
      hide(prideSection, !people.length);
    }

    // Contact: only display the card if at least one contact detail is supplied.
    const contactSection = section('contact');
    const contactCard = contactSection?.querySelector('.contact-location-card');
    const contactValues = [contact.name, contact.phone, contact.email, contact.address, contact.mapUrl];
    if (contactCard) {
      const nameNode = contactCard.querySelector('strong');
      const addressNode = contactCard.querySelector('p');
      const mapButton = contactCard.querySelector('a');
      text(nameNode, contact.name || village.name);
      text(addressNode, contact.address);
      if (clean(contact.phone)) {
        const call = make('a', 'contact-map-button', '☎ कॉल करा');
        call.href = 'tel:' + clean(contact.phone).replace(/[^0-9+]/g, '');
        contactCard.append(call);
      }
      if (mapButton) {
        if (clean(contact.mapUrl)) mapButton.href = contact.mapUrl;
        else hide(mapButton);
      }
      hide(contactCard, !contactValues.some(clean));
    }
    if (contactSection) hide(contactSection, !contactValues.some(clean));

    document.documentElement.dataset.villageContent = 'loaded';
  } catch (error) {
    document.documentElement.dataset.villageContent = 'error';
    console.error('Digital Gav: published village content could not be loaded.', error);
    const notice = make('p', 'data-load-notice', 'गावाची प्रकाशित माहिती सध्या लोड होत नाही. कृपया थोड्या वेळाने पुन्हा प्रयत्न करा.');
    pageRoot.prepend(notice);
  }
})();