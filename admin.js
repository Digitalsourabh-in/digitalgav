(() => {
  const client = window.digitalGavSupabase;
  const $ = (id) => document.getElementById(id);
  const loginPanel = $('loginPanel');
  const dashboardPanel = $('dashboardPanel');
  const accessDenied = $('accessDenied');
  const loginMessage = $('loginMessage');
  const saveMessage = $('saveMessage');
  let currentUser = null;
  let assignedVillage = null;
  let existingPageId = null;

  if (!client) {
    loginMessage.textContent = 'सिस्टम सुरू झाले नाही. पेज refresh करा.';
    loginMessage.classList.add('error');
    return;
  }

  function showMessage(element, message, isError = false) {
    element.textContent = message;
    element.classList.toggle('error', isError);
  }

  function showLogin() {
    loginPanel.hidden = false;
    dashboardPanel.hidden = true;
    accessDenied.hidden = true;
    $('logoutButton').hidden = true;
    $('accountEmail').textContent = '';
  }

  async function loadDashboard(user) {
    currentUser = user;
    const { data: profile, error: profileError } = await client
      .from('profiles')
      .select('id, full_name, role, village_id, can_publish')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'village_admin' || !profile.village_id) {
      loginPanel.hidden = true;
      dashboardPanel.hidden = true;
      accessDenied.hidden = false;
      $('logoutButton').hidden = false;
      $('accountEmail').textContent = user.email || '';
      return;
    }

    const { data: village, error: villageError } = await client
      .from('villages')
      .select('id, name, slug, district, taluka, status')
      .eq('id', profile.village_id)
      .single();

    if (villageError || !village) {
      throw new Error('आपल्या गावाची माहिती मिळाली नाही. Admin शी संपर्क साधा.');
    }

    assignedVillage = village;
    $('villageHeading').textContent = village.name + ' — व्यवस्थापन';
    $('villageMeta').textContent = [village.taluka, village.district].filter(Boolean).join(' · ');
    $('draftBadge').textContent = village.status === 'published' ? 'Published' : 'Draft';
    $('publicPageLink').href = 'villages/' + village.slug + '.html';
    $('accountEmail').textContent = user.email || profile.full_name || '';
    $('logoutButton').hidden = false;
    loginPanel.hidden = true;
    accessDenied.hidden = true;
    dashboardPanel.hidden = false;

    const { data: page, error: pageError } = await client
      .from('village_pages')
      .select('id, content, is_published')
      .eq('village_id', village.id)
      .maybeSingle();

    if (pageError) throw pageError;
    if (page) {
      existingPageId = page.id;
      const content = page.content || {};
      $('pageTitle').value = content.title || '';
      $('tagline').value = content.tagline || '';
      $('introduction').value = content.introduction || '';
      $('population').value = content.population || '';
      $('houses').value = content.houses || '';
      $('schools').value = content.schools || '';
      $('health').value = content.health || '';
      $('literacy').value = content.literacy || '';
      $('area').value = content.area || '';
      $('contactName').value = content.contactName || '';
      $('contactPhone').value = content.contactPhone || '';
      $('draftBadge').textContent = page.is_published ? 'Published' : 'Draft';
    }
  }

  $('loginForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    showMessage(loginMessage, 'लॉगिन तपासत आहे...');
    const { data, error } = await client.auth.signInWithPassword({
      email: $('email').value.trim(),
      password: $('password').value
    });
    if (error) {
      showMessage(loginMessage, 'लॉगिन झाले नाही: ' + error.message, true);
      return;
    }
    $('password').value = '';
    try {
      await loadDashboard(data.user);
    } catch (dashboardError) {
      showMessage(loginMessage, dashboardError.message || 'Dashboard लोड झाले नाही.', true);
    }
  });

  $('logoutButton').addEventListener('click', async () => {
    await client.auth.signOut();
    currentUser = null;
    assignedVillage = null;
    existingPageId = null;
    showLogin();
  });

  $('villageForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!currentUser || !assignedVillage) return;
    const submitButtons = $('villageForm').querySelectorAll('button[type="submit"]');
    submitButtons.forEach((button) => button.disabled = true);
    showMessage(saveMessage, 'माहिती सेव्ह करत आहे...');

    const content = {
      title: $('pageTitle').value.trim(),
      tagline: $('tagline').value.trim(),
      introduction: $('introduction').value.trim(),
      population: $('population').value.trim(),
      houses: $('houses').value.trim(),
      schools: $('schools').value.trim(),
      health: $('health').value.trim(),
      literacy: $('literacy').value.trim(),
      area: $('area').value.trim(),
      contactName: $('contactName').value.trim(),
      contactPhone: $('contactPhone').value.trim()
    };

    const payload = {
      village_id: assignedVillage.id,
      content,
      is_published: false,
      updated_by: currentUser.id,
      updated_at: new Date().toISOString()
    };

    let result;
    if (existingPageId) {
      result = await client.from('village_pages').update(payload).eq('id', existingPageId).select('id').single();
    } else {
      result = await client.from('village_pages').insert(payload).select('id').single();
    }

    submitButtons.forEach((button) => button.disabled = false);
    if (result.error) {
      showMessage(saveMessage, 'सेव्ह करताना त्रुटी: ' + result.error.message, true);
      return;
    }
    existingPageId = result.data.id;
    showMessage(saveMessage, 'माहिती Draft म्हणून यशस्वीरित्या सेव्ह झाली.');
    $('draftBadge').textContent = 'Draft';
  });

  client.auth.getSession().then(({ data: { session } }) => {
    if (session) {
      loadDashboard(session.user).catch((error) => {
        showMessage(loginMessage, error.message || 'Dashboard लोड झाले नाही.', true);
      });
    } else {
      showLogin();
    }
  });;
})();
