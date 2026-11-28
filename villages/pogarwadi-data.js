/* Digital Gav — published village page renderer.
   The HTML/CSS provide the reusable design. Village-specific information is read
   only from the approved Supabase village_pages record. */
(async function () {
  const db = window.digitalGavSupabase;
  const root = document.querySelector('.village-content');
  if (!db || !root) { console.error('Digital Gav: Supabase client or village page root is missing.'); return; }
  root.style.visibility = 'hidden';
  const clean = value => String(value ?? '').trim();
  const lines = value => clean(value).split(/\r?\n/).map(clean).filter(Boolean);
  const hide = (node, yes = true) => { if (node) node.hidden = yes; };
  const setText = (node, value) => { if (node) node.textContent = clean(value); };
  const make = (tag, className, value) => { const node=document.createElement(tag); if(className)node.className=className; if(value!==undefined)node.textContent=clean(value); return node; };
  const section = id => document.getElementById(id);
  try {
    const slug=decodeURIComponent(location.pathname.split('/').pop()||'').replace(/\.html$/,'');
    const {data:village,error:villageError}=await db.from('villages').select('id,name,slug,district,taluka,status').eq('slug',slug).eq('status','published').maybeSingle();
    if(villageError)throw villageError;
    if(!village)throw new Error('हे गाव प्रकाशित स्थितीत उपलब्ध नाही.');
    const {data:page,error:pageError}=await db.from('village_pages').select('content,updated_at').eq('village_id',village.id).eq('is_published',true).maybeSingle();
    if(pageError)throw pageError;
    if(!page?.content)throw new Error('प्रकाशित वेबसाइट माहिती उपलब्ध नाही.');
    const c=page.content||{},about=c.about||{},stats=c.statistics||{},facilities=c.facilities||{},gram=c.gramPanchayat||{},education=c.education||{},health=c.health||{},culture=c.cultureTourism||{},pride=c.villagePride||{},contact=c.contact||{};
    const hero=document.querySelector('.village-hero'),heroImage=hero?.querySelector(':scope > img');
    if(heroImage&&clean(c.hero?.image)){heroImage.src=clean(c.hero.image);heroImage.alt=village.name+' गावाचे दृश्य';heroImage.hidden=false;hero.style.background='';hide(hero.querySelector('.village-hero-shade'),false);}
    else if(heroImage){heroImage.hidden=true;hero.style.background='linear-gradient(135deg,#0b6b53,#17392f)';hide(hero.querySelector('.village-hero-shade'));}
    const description=clean(about.description||about.introduction||c.introduction),descriptionNode=document.querySelector('.about-simple-copy > p');
    setText(descriptionNode,description);hide(descriptionNode,!description);
    const enteredLgd=clean(about.lgdCode);const resolvedLgd=/^\d+$/.test(enteredLgd)?enteredLgd:clean(c.location?.lgd_code);
    const facts=[['lgdCode',resolvedLgd],['taluka',about.taluka||c.location?.taluka||village.taluka],['district',about.district||c.location?.district||village.district],['area',about.area||stats.area]];
    facts.forEach(([key,value])=>{const node=document.querySelector('[data-live-fact="'+key+'"]');setText(node,value);hide(node?.parentElement,!clean(value));});
    hide(document.querySelector('.about-village-facts'),!facts.some(([,value])=>clean(value)));
    const statValues={population:stats.population,houses:stats.houses,literacy_rate:stats.literacy_rate,schools:facilities.schools,health_centres:facilities.health_centres};
    Object.entries(statValues).forEach(([key,value])=>{const node=document.querySelector('[data-live-stat="'+key+'"]');setText(node,value);hide(node?.closest('.village-stat-card'),!clean(value));});
    const statWrap=document.querySelector('.village-statistics');hide(statWrap,!statWrap?.querySelector('.village-stat-card:not([hidden])'));
    const gramSection=section('gram-panchayat'),primaryGrid=gramSection?.querySelector(':scope > .official-grid'),subheads=gramSection?[...gramSection.querySelectorAll('.subsection-heading')]:[],memberGrid=subheads[0]?.nextElementSibling,legacyGrid=subheads[1]?.nextElementSibling;
    const officialCard=(role,person)=>{if(!clean(role)||!clean(person?.name))return null;const card=make('article');card.append(make('span','',role),make('h3','',person.name));const phone=clean(person.phone).replace(/[^0-9+]/g,'');if(phone){const call=make('a','official-call-button','☎ कॉल करा');call.href='tel:'+phone;card.append(call);}return card;};
    if(primaryGrid){primaryGrid.replaceChildren();['सरपंच','उपसरपंच','ग्रामसेवक','शिपाई / कर्मचारी','पोलीस पाटील'].forEach((role,i)=>{const card=officialCard(role,(gram.keyOfficials||[])[i]);if(card)primaryGrid.append(card);});hide(primaryGrid,!primaryGrid.children.length);}
    if(memberGrid){memberGrid.replaceChildren();(gram.additionalOfficials||[]).slice(0,8).forEach((person,i)=>{const card=officialCard('सदस्य '+(i+1),person);if(card)memberGrid.append(card);});if(subheads[0]){setText(subheads[0],'ग्रामपंचायत सदस्य');subheads[0].hidden=false;}hide(memberGrid,!memberGrid.children.length);}
    if(legacyGrid){legacyGrid.replaceChildren();(gram.otherOfficials||[]).forEach(person=>{const card=officialCard(person.designation,person);if(card)legacyGrid.append(card);});hide(legacyGrid,!legacyGrid.children.length);hide(subheads[1],!legacyGrid.children.length);}
    if(gramSection)hide(gramSection,![primaryGrid,memberGrid,legacyGrid].some(node=>node&&!node.hidden));
    const schools=clean(education.schoolsText||(education.schools||[]).map(item=>typeof item==='string'?item:item.name).join('\n')).split(/\r?\n/).map(clean).filter(Boolean),educationSection=section('education'),educationGrid=educationSection?.querySelector('.education-grid');
    if(educationGrid){educationGrid.replaceChildren();schools.forEach(name=>{const card=make('article','info-card school-card'),title=make('div','school-title');title.append(make('span','school-icon','🏫'),make('h3','',name));card.append(title);educationGrid.append(card);});hide(educationGrid,!schools.length);}
    if(educationSection)hide(educationSection,!schools.length);
    const healthItems=clean(health.servicesText||(health.services||[]).map(item=>typeof item==='string'?item:item.name).join('\n')).split(/\r?\n/).map(clean).filter(Boolean),healthSection=section('health'),healthGrid=healthSection?.querySelector('.health-team-grid')||healthSection?.querySelector('.contact-mini-grid');
    if(healthGrid){healthGrid.replaceChildren();healthItems.forEach(item=>{const card=make('article','feature-card');card.append(make('p','',item));healthGrid.append(card);});hide(healthGrid,!healthItems.length);}
    healthSection?.querySelectorAll('.feature-grid').forEach(grid=>{if(grid!==healthGrid)grid.remove();});if(healthSection)hide(healthSection,!healthItems.length);
    const cultureSection=section('culture');
    if(cultureSection){cultureSection.querySelectorAll('.feature-grid,.photo-placeholder,.combined-subheading,.dynamic-text-grid').forEach(node=>node.remove());const traditions=clean(culture.traditionsText||(culture.traditions||[]).join('\n')).split(/\r?\n/).map(clean).filter(Boolean),places=clean(culture.placesText||(culture.places||[]).join('\n')).split(/\r?\n/).map(clean).filter(Boolean);const addGroup=(title,entries)=>{if(!entries.length)return;cultureSection.append(make('h3','combined-subheading',title));const grid=make('div','feature-grid');entries.forEach(entry=>{const card=make('article','feature-card');card.append(make('h3','',entry));grid.append(card);});cultureSection.append(grid);};addGroup('संस्कृती आणि परंपरा',traditions);addGroup('पर्यटन व प्रेक्षणीय स्थळे',places);hide(cultureSection,!traditions.length&&!places.length);}
    const people=clean(pride.peopleText||(pride.people||[]).map(item=>typeof item==='string'?item:[item.name,item.contribution].filter(Boolean).join(' — ')).join('\n')).split(/\r?\n/).map(clean).filter(Boolean),prideSection=section('pride'),prideGrid=prideSection?.querySelector('.legacy-grid');
    if(prideGrid){prideGrid.replaceChildren();people.forEach(person=>{const card=make('article','legacy-card');card.append(make('h3','',person));prideGrid.append(card);});hide(prideGrid,!people.length);}
    prideSection?.querySelectorAll('.photo-placeholder').forEach(node=>node.remove());if(prideSection)hide(prideSection,!people.length);
    const businesses=clean(c.businessesText||(Array.isArray(c.businesses)?c.businesses.map(item=>typeof item==='string'?item:item.name).join('\n'):'')).split(/\r?\n/).map(clean).filter(Boolean),businessSection=section('business'),businessGrid=businessSection?.querySelector('.business-track')||businessSection?.querySelector('.business-grid');
    if(businessGrid){businessGrid.replaceChildren();businesses.forEach(name=>{const card=make('article','business-slide');card.append(make('div','business-card-body',name));businessGrid.append(card);});hide(businessGrid,!businesses.length);}
    businessSection?.querySelector('.business-counts')?.remove();setText(businessSection?.querySelector('.content-heading'),village.name+' येथील व्यवसाय');setText(businessSection?.querySelector('.section-lead'),'गावातील व्यवसायांची माहिती.');if(businessSection)hide(businessSection,!businesses.length);
    const contactSection=section('contact'),contactCard=contactSection?.querySelector('.contact-location-card'),contactCopy=contactSection?.querySelector('.contact-copy p'),contactValues=[contact.name,contact.phone,contact.email,contact.address,contact.mapUrl];
    setText(contactCopy,village.name+' गावाच्या संपर्क व स्थानाची माहिती.');
    if(contactCard){setText(contactCard.querySelector('strong'),contact.name||village.name);setText(contactCard.querySelector('p'),contact.address);const mapButton=contactCard.querySelector('a');if(mapButton){if(clean(contact.mapUrl))mapButton.href=contact.mapUrl;else hide(mapButton);}if(clean(contact.phone)){const call=make('a','contact-map-button','☎ कॉल करा');call.href='tel:'+clean(contact.phone).replace(/[^0-9+]/g,'');contactCard.append(call);}if(clean(contact.email)){const email=make('a','contact-map-button',contact.email);email.href='mailto:'+clean(contact.email);contactCard.append(email);}hide(contactCard,!contactValues.some(value=>clean(value)));}
    if(contactSection)hide(contactSection,!contactValues.some(value=>clean(value)));
    document.documentElement.dataset.villageContent='loaded';root.style.visibility='visible';
  } catch(error) {
    document.documentElement.dataset.villageContent='error';console.error('Digital Gav: published village content could not be loaded.',error);['about','gram-panchayat','education','health','culture','pride','business','contact'].forEach(id=>hide(section(id)));hide(document.querySelector('.village-statistics'));root.style.visibility='visible';
    const notice=make('p','data-load-notice','गावाची प्रकाशित माहिती सध्या लोड होत नाही. कृपया थोड्या वेळाने पुन्हा प्रयत्न करा.');root.prepend(notice);
  }
})();
