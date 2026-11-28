(() => {
  const client = window.digitalGavSupabase;
  const $ = (id) => document.getElementById(id);
  const loginPanel = $('loginPanel'), dashboardPanel = $('dashboardPanel'), accessDenied = $('accessDenied');
  const loginMessage = $('loginMessage'), saveMessage = $('saveMessage');
  let currentUser = null, assignedVillage = null, existingPageId = null, originalContent = {};

  if (!client) { loginMessage.textContent = 'सिस्टम सुरू झाले नाही. पेज refresh करा.'; loginMessage.classList.add('error'); return; }
  const showMessage = (el, message, error=false) => { el.textContent=message; el.classList.toggle('error',error); };
  const clone = (obj) => JSON.parse(JSON.stringify(obj || {}));
  const getPath = (obj,path) => path.split('.').reduce((v,k)=>v == null ? undefined : v[k],obj);
  function setPath(obj,path,value) {
    const keys=path.split('.'); let target=obj;
    keys.forEach((key,index)=>{
      const next=keys[index+1];
      if(index===keys.length-1){ target[key]=value; return; }
      if(target[key] == null) target[key]=(/^\d+$/.test(next) ? [] : {});
      target=target[key];
    });
  }
  function showLogin() {
    loginPanel.hidden=false; dashboardPanel.hidden=true; accessDenied.hidden=true;
    $('logoutButton').hidden=true; $('accountEmail').textContent='';
  }
  function formValue(content,path) {
    const value=getPath(content,path);
    if(value !== undefined && value !== null) return Array.isArray(value) ? value.join('\n') : String(value);
    return '';
  }
  function setEditorValues(content) {
    document.querySelectorAll('[data-path]').forEach(input=>{ input.value=formValue(content,input.dataset.path); });
    const oldStats=content.statistics || {};
    const oldFacilities=content.facilities || {};
    if(!getPath(content,'statistics.population') && oldStats.population != null) $('[data-path="statistics.population"]').value=oldStats.population;
    if(!getPath(content,'statistics.houses') && oldStats.houses != null) $('[data-path="statistics.houses"]').value=oldStats.houses;
    if(!getPath(content,'statistics.literacy_rate') && oldStats.literacy_rate != null) $('[data-path="statistics.literacy_rate"]').value=oldStats.literacy_rate;
    if(!getPath(content,'facilities.schools') && oldFacilities.schools != null) $('[data-path="facilities.schools"]').value=oldFacilities.schools;
    if(!getPath(content,'facilities.health_centres') && oldFacilities.health_centres != null) $('[data-path="facilities.health_centres"]').value=oldFacilities.health_centres;
    if(!getPath(content,'about.introduction')) $('[data-path="about.introduction"]').value=content.introduction || '';
    if(!getPath(content,'about.history')) $('[data-path="about.history"]').value=content.history || '';
  }
  async function loadDashboard(user) {
    currentUser=user;
    const {data:profile,error:profileError}=await client.from('profiles').select('id,full_name,role,village_id,can_publish').eq('id',user.id).single();
    if(profileError || !profile || profile.role!=='village_admin' || !profile.village_id) {
      loginPanel.hidden=true; dashboardPanel.hidden=true; accessDenied.hidden=false;
      $('logoutButton').hidden=false; $('accountEmail').textContent=user.email || ''; return;
    }
    const {data:village,error:villageError}=await client.from('villages').select('id,name,slug,district,taluka,status').eq('id',profile.village_id).single();
    if(villageError || !village) throw new Error('आपल्या गावाची माहिती मिळाली नाही. Admin शी संपर्क साधा.');
    assignedVillage=village;
    $('villageHeading').textContent=village.name+' — व्यवस्थापन';
    $('villageMeta').textContent=[village.taluka,village.district].filter(Boolean).join(' · ');
    $('draftBadge').textContent=village.status==='published'?'Published':'Draft';
    $('publicPageLink').href='villages/'+village.slug+'.html';
    $('accountEmail').textContent=user.email || profile.full_name || '';
    $('logoutButton').hidden=false; loginPanel.hidden=true; accessDenied.hidden=true; dashboardPanel.hidden=false;
    const {data:page,error:pageError}=await client.from('village_pages').select('id,content,is_published').eq('village_id',village.id).maybeSingle();
    if(pageError) throw pageError;
    existingPageId=page ? page.id : null;
    originalContent=clone(page ? page.content : {});
    setEditorValues(originalContent);
    $('draftBadge').textContent=page && page.is_published?'प्रकाशित':'Draft';
  }

  $('loginForm').addEventListener('submit',async event=>{
    event.preventDefault(); showMessage(loginMessage,'लॉगिन तपासत आहे...');
    const {data,error}=await client.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});
    if(error){showMessage(loginMessage,'लॉगिन झाले नाही: '+error.message,true);return;}
    $('password').value='';
    try{await loadDashboard(data.user);}catch(err){showMessage(loginMessage,err.message || 'Dashboard लोड झाले नाही.',true);}
  });
  $('logoutButton').addEventListener('click',async()=>{await client.auth.signOut();currentUser=null;assignedVillage=null;existingPageId=null;originalContent={};showLogin();});
  $('villageForm').addEventListener('submit',async event=>{
    event.preventDefault(); if(!currentUser || !assignedVillage) return;
    const buttons=$('villageForm').querySelectorAll('button[type="submit"]'); buttons.forEach(b=>b.disabled=true);
    showMessage(saveMessage,'माहिती सेव्ह करत आहे...');
    const content=clone(originalContent);
    document.querySelectorAll('[data-path]').forEach(input=>setPath(content,input.dataset.path,input.value.trim()));
    // Keep legacy fields in sync so the existing public page can continue reading its current keys.
    content.title=content.hero?.title || content.title || assignedVillage.name+' गाव';
    content.subtitle=content.hero?.subtitle || content.subtitle || '';
    content.introduction=content.about?.introduction || '';
    content.history=content.about?.history || '';
    content.statistics=content.statistics || {};
    content.statistics.population=content.statistics.population ?? '';
    content.statistics.houses=content.statistics.houses ?? '';
    content.statistics.literacy_rate=content.statistics.literacy_rate ?? '';
    content.statistics.area=content.about?.area || content.statistics.area || '';
    content.facilities=content.facilities || {};
    content.facilities.schools=content.facilities.schools ?? '';
    content.facilities.health_centres=content.facilities.health_centres ?? '';
    const payload={village_id:assignedVillage.id,content,is_published:false,updated_by:currentUser.id,updated_at:new Date().toISOString()};
    let result=existingPageId
      ? await client.from('village_pages').update(payload).eq('id',existingPageId).select('id,content').single()
      : await client.from('village_pages').insert(payload).select('id,content').single();
    buttons.forEach(b=>b.disabled=false);
    if(result.error){showMessage(saveMessage,'सेव्ह करताना त्रुटी: '+result.error.message,true);return;}
    existingPageId=result.data.id; originalContent=clone(result.data.content);
    $('draftBadge').textContent='Draft';
    showMessage(saveMessage,'माहिती Draft म्हणून यशस्वीरित्या सेव्ह झाली.');
  });
  client.auth.getSession().then(({data:{session}})=>{
    if(session) loadDashboard(session.user).catch(err=>showMessage(loginMessage,err.message || 'Dashboard लोड झाले नाही.',true));
    else showLogin();
  });
})();