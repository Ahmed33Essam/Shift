// ========== DARK MODE ==========
function toggleDarkMode() {
  var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  setDarkMode(!isDark);
}

function setDarkMode(dark) {
  if (dark) {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('shift_theme', 'dark');
    document.getElementById('darkToggleBtn').textContent = '☀️';
  } else {
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('shift_theme', 'light');
    document.getElementById('darkToggleBtn').textContent = '🌙';
  }
}

// Apply saved theme immediately on load
(function() {
  var saved = localStorage.getItem('shift_theme');
  var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (saved === 'dark' || (!saved && prefersDark)) {
    document.documentElement.setAttribute('data-theme', 'dark');
    // Button icon set after DOM ready
    document.addEventListener('DOMContentLoaded', function() {
      var btn = document.getElementById('darkToggleBtn');
      if (btn) btn.textContent = '☀️';
    });
  }
})();

// ========== MULTI SELECT SPECS ==========
function toggleSpecDropdown() {
  var dd = document.getElementById('specDropdown');
  if (dd) dd.classList.toggle('hidden');
  // Add checkboxes listeners
  var checkboxes = dd ? dd.querySelectorAll('input[type=checkbox]') : [];
  checkboxes.forEach(function(cb) {
    cb.onchange = updateSpecChosen;
  });
}

function updateSpecChosen() {
  var dd = document.getElementById('specDropdown');
  if (!dd) return;
  var checked = Array.from(dd.querySelectorAll('input:checked')).map(function(c){ return c.value; });
  var chosen = document.getElementById('specChosen');
  var text = document.getElementById('specChosenText');
  // Clear existing tags
  chosen.querySelectorAll('.spec-chosen-tag').forEach(function(el){ el.remove(); });
  if (checked.length === 0) {
    text.style.display = '';
    text.textContent = 'اختر التخصصات...';
  } else {
    text.style.display = 'none';
    checked.forEach(function(val) {
      var tag = document.createElement('span');
      tag.className = 'spec-chosen-tag';
      tag.textContent = val;
      chosen.insertBefore(tag, chosen.querySelector('i'));
    });
  }
  document.getElementById('specData').value = JSON.stringify(checked);
}

function getSelectedSpecs() {
  var dd = document.getElementById('specDropdown');
  if (!dd) return [];
  return Array.from(dd.querySelectorAll('input:checked')).map(function(c){ return c.value; });
}

// Close dropdowns on outside click
document.addEventListener('click', function(e) {
  var box = document.getElementById('specSelectBox');
  if (box && !box.contains(e.target)) {
    var dd = document.getElementById('specDropdown');
    if (dd) dd.classList.add('hidden');
  }
  var editBox = document.getElementById('editSpecSelectBox');
  if (editBox && !editBox.contains(e.target)) {
    var edd = document.getElementById('editSpecDropdown');
    if (edd) edd.classList.add('hidden');
  }
});

function toggleEditSpecDropdown() {
  var dd = document.getElementById('editSpecDropdown');
  if (dd) dd.classList.toggle('hidden');
  var checkboxes = dd ? dd.querySelectorAll('input[type=checkbox]') : [];
  checkboxes.forEach(function(cb) { cb.onchange = updateEditSpecChosen; });
}

function updateEditSpecChosen() {
  var dd = document.getElementById('editSpecDropdown');
  if (!dd) return;
  var checked = Array.from(dd.querySelectorAll('input:checked')).map(function(c){ return c.value; });
  var chosen = document.getElementById('editSpecChosen');
  var text = document.getElementById('editSpecChosenText');
  chosen.querySelectorAll('.spec-chosen-tag').forEach(function(el){ el.remove(); });
  if (checked.length === 0) {
    text.style.display = '';
    text.textContent = 'اختر التخصصات...';
  } else {
    text.style.display = 'none';
    checked.forEach(function(val) {
      var tag = document.createElement('span');
      tag.className = 'spec-chosen-tag';
      tag.textContent = val;
      chosen.insertBefore(tag, chosen.querySelector('i'));
    });
  }
}

function getEditSelectedSpecs() {
  var dd = document.getElementById('editSpecDropdown');
  if (!dd) return [];
  return Array.from(dd.querySelectorAll('input:checked')).map(function(c){ return c.value; });
}

function setEditSpecsFromArray(arr) {
  var dd = document.getElementById('editSpecDropdown');
  if (!dd) return;
  dd.querySelectorAll('input[type=checkbox]').forEach(function(cb) {
    cb.checked = arr && arr.includes(cb.value);
    cb.onchange = updateEditSpecChosen;
  });
  updateEditSpecChosen();
}

// ========== CERT IMAGE UPLOAD ==========
var certImageFiles = [];

function handleCertImages(event) {
  var files = Array.from(event.target.files);
  if (!files.length) return;
  files.forEach(function(file) {
    var idx = certImageFiles.length;
    certImageFiles.push(file);
    var reader = new FileReader();
    reader.onload = function(e) {
      var wrap = document.createElement('div');
      wrap.className = 'cert-thumb-wrap';
      var img = document.createElement('img');
      img.className = 'cert-thumb';
      img.src = e.target.result;
      img.title = file.name;
      var btn = document.createElement('button');
      btn.className = 'cert-thumb-remove';
      btn.textContent = '×';
      btn.onclick = (function(i, w) {
        return function() { certImageFiles[i] = null; w.remove(); };
      })(idx, wrap);
      wrap.appendChild(img);
      wrap.appendChild(btn);
      document.getElementById('certPreviewGrid').appendChild(wrap);
    };
    reader.readAsDataURL(file);
  });
  // Reset input so same files can be selected again
  event.target.value = '';
}

function removeCertImage(idx, el) {
  certImageFiles[idx] = null;
  if (el) el.remove();
}

// Upload cert images to Supabase Storage and return URLs
async function uploadCertImages(userId) {
  var urls = [];
  var files = certImageFiles.filter(function(f) { return f !== null; });
  for (var i = 0; i < files.length; i++) {
    var file = files[i];
    var ext = file.name.split('.').pop();
    var path = userId + '/' + Date.now() + '_' + i + '.' + ext;
    var { data, error } = await sb.storage.from('certificates').upload(path, file, { upsert: true });
    if (!error) {
      var { data: urlData } = sb.storage.from('certificates').getPublicUrl(path);
      urls.push(urlData.publicUrl);
    } else {
      console.error('Upload error:', error);
    }
  }
  return urls;
}

// Load and display existing certificates in profile modal
async function loadCertificates() {
  var urls = currentProfile ? (currentProfile.certificates_urls || []) : [];
  var grid = document.getElementById('existingCertsGrid');
  if (!grid) return;
  grid.innerHTML = '';
  urls.forEach(function(url, i) {
    var wrap = document.createElement('div');
    wrap.className = 'cert-thumb-wrap';
    var img = document.createElement('img');
    img.className = 'cert-thumb';
    img.src = url;
    img.style.cursor = 'pointer';
    img.onclick = function() { window.open(url, '_blank'); };
    var btn = document.createElement('button');
    btn.className = 'cert-thumb-remove';
    btn.textContent = '×';
    btn.onclick = function() { deleteCertificate(url, wrap); };
    wrap.appendChild(img);
    wrap.appendChild(btn);
    grid.appendChild(wrap);
  });
}

async function deleteCertificate(url, el) {
  var path = url.split('/certificates/')[1];
  if (path) {
    await sb.storage.from('certificates').remove([decodeURIComponent(path)]);
  }
  var urls = (currentProfile ? (currentProfile.certificates_urls || []) : []).filter(function(u) { return u !== url; });
  await sb.from('nurses').update({ certificates_urls: urls }).eq('id', currentUser.id);
  if (currentProfile) currentProfile.certificates_urls = urls;
  if (el) el.remove();
}

// Handle new cert images in edit modal
var editCertFiles = [];
function handleEditCertImages(event) {
  var files = Array.from(event.target.files);
  if (!files.length) return;
  files.forEach(function(file) {
    var idx = editCertFiles.length;
    editCertFiles.push(file);
    var reader = new FileReader();
    reader.onload = function(e) {
      var wrap = document.createElement('div');
      wrap.className = 'cert-thumb-wrap';
      var img = document.createElement('img');
      img.className = 'cert-thumb';
      img.src = e.target.result;
      img.title = file.name;
      var btn = document.createElement('button');
      btn.className = 'cert-thumb-remove';
      btn.textContent = '×';
      btn.onclick = (function(i, w) {
        return function() { editCertFiles[i] = null; w.remove(); };
      })(idx, wrap);
      wrap.appendChild(img);
      wrap.appendChild(btn);
      document.getElementById('editCertPreviewGrid').appendChild(wrap);
    };
    reader.readAsDataURL(file);
  });
  event.target.value = '';
}

// ========== CHAR COUNT ==========
function updateCharCount(input, counterId, max) {
  var el = document.getElementById(counterId);
  if (!el) return;
  var len = input.value.length;
  el.textContent = len + ' / ' + max;
  el.className = 'char-count';
  if (len >= max) el.classList.add('danger');
  else if (len >= max * 0.8) el.classList.add('warn');
}

// ========== AVATAR ==========
var newAvatarFile = null;
var regNurseAvatarFile = null;
var regHospAvatarFile = null;

// Generic handler for registration avatar preview
function handleRegAvatarPreview(event, previewId, fileVar) {
  var file = event.target.files[0];
  if (!file) return;
  // Store in the right variable
  if (fileVar === 'regNurseAvatarFile') regNurseAvatarFile = file;
  else if (fileVar === 'regHospAvatarFile') regHospAvatarFile = file;

  var reader = new FileReader();
  reader.onload = function(e) {
    var img = new Image();
    img.onload = function() {
      var canvas = document.createElement('canvas');
      canvas.width = 200; canvas.height = 200;
      var ctx = canvas.getContext('2d');
      var s = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width-s)/2, (img.height-s)/2, s, s, 0, 0, 200, 200);
      var url = canvas.toDataURL('image/jpeg', 0.92);
      var el = document.getElementById(previewId);
      if (el) el.innerHTML = '<img src="' + url + '" style="width:72px;height:72px;border-radius:50%;object-fit:cover;border:3px solid var(--accent);display:block">';
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
  event.target.value = '';
}

function handleAvatarPreview(event) {
  var file = event.target.files[0];
  if (!file) return;
  newAvatarFile = file;
  // Show preview using canvas resize for accurate preview
  var reader = new FileReader();
  reader.onload = function(e) {
    var img = new Image();
    img.onload = function() {
      var canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 200;
      var ctx = canvas.getContext('2d');
      var srcSize = Math.min(img.width, img.height);
      var srcX = (img.width - srcSize) / 2;
      var srcY = (img.height - srcSize) / 2;
      ctx.drawImage(img, srcX, srcY, srcSize, srcSize, 0, 0, 200, 200);
      renderAvatarPreview('profileAvatarPreview', canvas.toDataURL('image/jpeg', 0.92), 80);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
  event.target.value = '';
}

function renderAvatarPreview(containerId, url, size) {
  var el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = '';
  if (url) {
    var img = document.createElement('img');
    img.src = url;
    img.style.cssText = 'width:' + size + 'px;height:' + size + 'px;border-radius:50%;object-fit:cover;border:3px solid var(--accent);display:block';
    el.appendChild(img);
  } else {
    var initials = (currentProfile && (currentProfile.full_name || currentProfile.hospital_name))
      ? (currentProfile.full_name || currentProfile.hospital_name).substring(0, 1)
      : '؟';
    el.innerHTML = '<div style="width:' + size + 'px;height:' + size + 'px;border-radius:50%;background:var(--primary);display:flex;align-items:center;justify-content:center;color:white;font-size:' + (size/2.5) + 'px;font-weight:700;border:3px solid var(--accent)">' + initials + '</div>';
  }
}

function renderNavAvatar(url, name) {
  var wrap = document.getElementById('navAvatarWrap');
  if (!wrap) return;
  if (url) {
    wrap.innerHTML = '<img src="' + url + '" class="avatar-circle" title="' + (name||'') + '">';
  } else {
    var initial = name ? name.substring(0, 1) : '؟';
    wrap.innerHTML = '<div class="avatar-placeholder">' + initial + '</div>';
  }
}

// Resize image using Canvas before upload for crisp quality
function resizeImageToBlob(file, size) {
  return new Promise(function(resolve) {
    var reader = new FileReader();
    reader.onload = function(e) {
      var img = new Image();
      img.onload = function() {
        var canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        var ctx = canvas.getContext('2d');

        // Crop to square from center
        var srcSize = Math.min(img.width, img.height);
        var srcX = (img.width - srcSize) / 2;
        var srcY = (img.height - srcSize) / 2;

        ctx.drawImage(img, srcX, srcY, srcSize, srcSize, 0, 0, size, size);
        canvas.toBlob(function(blob) { resolve(blob); }, 'image/jpeg', 0.92);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

async function uploadAvatar(userId) {
  if (!newAvatarFile) return null;
  // Resize to 400x400 for crisp display at any size
  var blob = await resizeImageToBlob(newAvatarFile, 400);
  var path = userId + '/avatar.jpg';
  var result = await sb.storage.from('avatars').upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
  if (result.error) { console.error('Avatar upload error:', result.error); return null; }
  var pub = sb.storage.from('avatars').getPublicUrl(path);
  return pub.data.publicUrl + '?t=' + Date.now();
}

// ========== SUPABASE INIT ==========
const SUPABASE_URL = 'https://otagjeommzhawgllsexa.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90YWdqZW9tbXpoYXdnbGxzZXhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNjU1MjMsImV4cCI6MjA4Nzk0MTUyM30.X0ahXjFSt0BwxZA_q-ix-9343XepRLt7FZUHKGfXx9I';
// supabase client
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'implicit',
  }
});

// ========== STATE ==========
var currentUser = null;
var currentProfile = null;
var currentRole = null;
var selectedJobId = null;
var authMode = 'register';
var selectedRole = 'nurse';
var tags = { spec: [], cert: [], benefits: [], editSpec: [] };

// ========== NAVIGATION ==========
function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
}

function showAuthPage(mode, role) {
  authMode = mode;
  selectedRole = role || 'nurse';
  showPage('auth');
  updateAuthUI();
}

function updateAuthUI() {
  const isLogin = authMode === 'login';
  document.getElementById('registerForm').classList.toggle('hidden', isLogin);
  document.getElementById('loginForm').classList.toggle('hidden', !isLogin);
  document.getElementById('roleTabs').classList.toggle('hidden', isLogin);
  document.getElementById('authTitle').textContent = isLogin ? 'تسجيل الدخول' : 'إنشاء حساب جديد';
  document.getElementById('authSubtitle').textContent = isLogin ? 'أهلاً بك في Shift' : 'انضم إلى منصة التمريض الأولى';
  document.getElementById('authSwitch').innerHTML = isLogin
    ? 'مش عندك حساب؟ <a onclick="switchAuthMode(\'register\')">سجّل الآن</a>'
    : 'عندك حساب؟ <a onclick="switchAuthMode(\'login\')">سجّل دخول</a>';
  if (!isLogin) setRole(selectedRole);
}

function switchAuthMode(mode) {
  authMode = mode;
  clearAlert('alertBox');
  updateAuthUI();
}

function setRole(role) {
  selectedRole = role;
  document.getElementById('tab-nurse').classList.toggle('active', role === 'nurse');
  document.getElementById('tab-hospital').classList.toggle('active', role === 'hospital');
  document.getElementById('nurseFields').classList.toggle('hidden', role !== 'nurse');
  document.getElementById('hospitalFields').classList.toggle('hidden', role !== 'hospital');
}

function switchTab(dashboard, tab, btn) {
  const prefix = dashboard + '-tab-';
  document.querySelectorAll(`#page-${dashboard} .tab-btn`).forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll(`[id^="${prefix}"]`).forEach(el => el.classList.add('hidden'));
  document.getElementById(prefix + tab).classList.remove('hidden');

  if (dashboard === 'nurse' && tab === 'myapps') loadMyApplications();
  if (dashboard === 'hospital' && tab === 'applications') loadHospitalApplications();
  if (dashboard === 'hospital' && tab === 'completed') loadCompletedJobs();
}

// ========== ALERTS ==========
function showAlert(containerId, msg, type = 'error') {
  document.getElementById(containerId).innerHTML = `<div class="alert alert-${type}">${msg}</div>`;
}
function clearAlert(id) { document.getElementById(id).innerHTML = ''; }

// ========== TAGS ==========
function addTag(event, type) {
  if (event.key === 'Enter') {
    event.preventDefault();
    const input = document.getElementById(type + 'Input');
    const val = input.value.trim();
    if (!val) return;
    if (!tags[type]) tags[type] = [];
    tags[type].push(val);
    renderTags(type);
    input.value = '';
    updateTagsData(type);
  }
}

function renderTags(type) {
  const container = document.getElementById(type + 'Container');
  const input = document.getElementById(type + 'Input');
  const tagEls = container.querySelectorAll('.tag-item');
  tagEls.forEach(el => el.remove());
  tags[type].forEach((tag, i) => {
    const el = document.createElement('div');
    el.className = 'tag-item';
    el.innerHTML = `${tag} <span class="tag-remove" onclick="removeTag('${type}', ${i})">×</span>`;
    container.insertBefore(el, input);
  });
}

function removeTag(type, i) {
  tags[type].splice(i, 1);
  renderTags(type);
  updateTagsData(type);
}

function updateTagsData(type) {
  const hiddenInput = document.getElementById(type + 'Data');
  if (hiddenInput) hiddenInput.value = JSON.stringify(tags[type]);
}

function setTagsFromArray(type, arr) {
  tags[type] = arr || [];
  renderTags(type);
  updateTagsData(type);
}

// ========== AUTH ==========
async function handleRegister(e) {
  if (e && e.preventDefault) e.preventDefault();
  console.log('handleRegister called, role:', selectedRole);
  clearAlert('alertBox');
  const email = document.getElementById('regEmail').value;
  const pass = document.getElementById('regPass').value;
  const passConfirm = document.getElementById('regPassConfirm').value;

  if (!email || !pass) return showAlert('alertBox', 'البريد وكلمة المرور مطلوبين');
  if (pass !== passConfirm) return showAlert('alertBox', 'كلمة المرور مش متطابقة');
  if (pass.length < 6) return showAlert('alertBox', 'كلمة المرور لازم تكون 6 حروف على الأقل');

  const btn = document.getElementById('registerBtn');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner" style="width:18px;height:18px;border-width:2px"></div> جاري التسجيل...';

  // Save form data in case email confirmation is needed
  var pendingData;
  if (selectedRole === 'nurse') {
    pendingData = {
      role: 'nurse', email,
      avatarFile: regNurseAvatarFile || null,
      full_name: document.getElementById('nurseName').value || email.split('@')[0],
      phone: document.getElementById('nursePhone').value,
      city: document.getElementById('nurseCity').value,
      years_experience: parseInt(document.getElementById('nurseExp').value) || 0,
      bio: document.getElementById('nurseBio').value,
      specializations: getSelectedSpecs(),
    };
  } else {
    pendingData = {
      role: 'hospital', email,
      avatarFile: regHospAvatarFile || null,
      hospital_name: document.getElementById('hospitalName').value || email.split('@')[0],
      facility_type: document.getElementById('facilityType').value || 'مستشفى',
      phone: document.getElementById('hospitalPhone').value,
      city: document.getElementById('hospitalCity').value,
      address: document.getElementById('hospitalAddress').value,
      description: document.getElementById('hospitalDesc').value,
    };
  }

  try {
    const { data, error } = await sb.auth.signUp({ email, password: pass });
    if (error) throw error;

    const userId = data.user.id;
    console.log('SignUp success, userId:', userId, 'session:', data.session ? 'YES' : 'NO (email confirmation required)');

    // Upload avatar immediately after signup (while we have the file)
    var avatarFile = pendingData.role === 'nurse' ? regNurseAvatarFile : regHospAvatarFile;
    if (avatarFile) {
      try {
        var blob = await resizeImageToBlob(avatarFile, 400);
        var path = userId + '/avatar.jpg';
        var upResult = await sb.storage.from('avatars').upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
        if (!upResult.error) {
          var pub = sb.storage.from('avatars').getPublicUrl(path);
          pendingData.avatar_url = pub.data.publicUrl + '?t=' + Date.now();
        }
      } catch(avErr) { console.warn('Avatar upload failed:', avErr); }
    }
    delete pendingData.avatarFile; // can't serialize File to localStorage
    localStorage.setItem('shift_pending_reg', JSON.stringify(pendingData));

    // Try to save profile via RPC (SECURITY DEFINER bypasses RLS)
    try {
      await completePendingRegistration(userId, pendingData);
      localStorage.removeItem('shift_pending_reg');
      console.log('Profile saved successfully');
    } catch(rpcErr) {
      console.warn('RPC failed, keeping data in localStorage:', rpcErr.message);
    }

    // If session exists (email confirmation disabled) - go to dashboard directly
    if (data.session) {
      currentUser = data.user;
      await loadUserProfile();
      goToDashboard();
    } else {
      // Email confirmation required
      showAlert('alertBox', '✅ تم إنشاء الحساب! تفقد بريدك الإلكتروني وادوس على رابط التأكيد ثم سجّل دخول.', 'success');
    }

  } catch (err) {
    console.error('Register error:', err);
    showAlert('alertBox', 'حصل خطأ: ' + (err.message || JSON.stringify(err)));
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-user-plus"></i> إنشاء الحساب';
  }
}

async function handleLogin(e) {
  if (e && e.preventDefault) e.preventDefault();
  console.log('handleLogin called');
  clearAlert('alertBox');
  const email = document.getElementById('loginEmail').value;
  const pass = document.getElementById('loginPass').value;
  if (!email || !pass) return showAlert('alertBox', 'البريد وكلمة المرور مطلوبين');

  const btn = document.getElementById('loginBtn');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner" style="width:18px;height:18px;border-width:2px"></div> جاري الدخول...';

  try {
    const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
    if (error) throw error;
    currentUser = data.user;
    await loadUserProfile();
    goToDashboard();
  } catch (err) {
    console.error('Login error:', err);
    var msg = 'البريد أو كلمة المرور غلط';
    if (err.message && err.message.includes('Email not confirmed')) {
      msg = '⚠️ لسه متأكدتش البريد الإلكتروني - تفقد إيميلك وادوس على رابط التأكيد';
    }
    showAlert('alertBox', msg);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> تسجيل الدخول';
  }
}

async function loadUserProfile() {
  try {
    const { data: profile, error: pErr } = await sb.from('profiles').select('*').eq('id', currentUser.id).maybeSingle();
    console.log('profile loaded:', profile, 'error:', pErr);
    if (!profile) {
      console.warn('No profile found for user', currentUser.id);
      return;
    }
    currentProfile = profile;
    currentRole = profile.role;

    if (currentRole === 'nurse') {
      const { data: nurse } = await sb.from('nurses').select('*').eq('id', currentUser.id).maybeSingle();
      console.log('nurse loaded:', nurse);
      if (nurse) currentProfile = { ...profile, ...nurse };
    } else if (currentRole === 'hospital') {
      const { data: hospital } = await sb.from('hospitals').select('*').eq('id', currentUser.id).maybeSingle();
      console.log('hospital loaded:', hospital);
      if (hospital) currentProfile = { ...profile, ...hospital };
    }
    console.log('currentRole:', currentRole, 'currentProfile:', currentProfile);
  } catch(err) {
    console.error('loadUserProfile error:', err);
  }
}

function goToDashboard() {
  document.getElementById('navGuest').style.display = 'none';
  var navUser = document.getElementById('navUser');
  navUser.style.display = 'flex';
  if (currentRole === 'nurse') {
    var name = (currentProfile && currentProfile.full_name) ? currentProfile.full_name : 'ممرض';
    document.getElementById('navUserName').textContent = name;
    document.getElementById('nurseWelcomeName').textContent = name;
    renderNavAvatar(currentProfile && currentProfile.avatar_url, name);
    showPage('nurse');
    loadNurseStats();
    loadJobs();
  } else if (currentRole === 'hospital') {
    var hname = (currentProfile && currentProfile.hospital_name) ? currentProfile.hospital_name : 'منشأة';
    document.getElementById('navUserName').textContent = hname;
    document.getElementById('hospitalWelcomeName').textContent = hname;
    renderNavAvatar(currentProfile && currentProfile.avatar_url, hname);
    showPage('hospital');
    loadHospitalStats();
    loadHospitalJobs();
  }
}

async function logout() {
  await sb.auth.signOut();
  currentUser = null;
  currentProfile = null;
  currentRole = null;
  document.getElementById('navGuest').style.display = 'flex';
  document.getElementById('navUser').style.display = 'none';
  showPage('landing');
}

// ========== NURSE - JOBS ==========
async function loadJobs() {
  document.getElementById('jobsList').innerHTML = '<div class="loading"><div class="spinner"></div> جاري التحميل...</div>';

  const city = document.getElementById('filterCity').value;
  const shift = document.getElementById('filterShift').value;
  const spec = document.getElementById('filterSpec').value;

  let query = sb.from('job_postings')
    .select(`*, hospitals(hospital_name, city, logo_url, avatar_url, facility_type)`)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  const salary = document.getElementById('filterSalary').value;
  if (city) query = query.eq('city', city);
  if (shift) query = query.eq('shift_type', shift);
  if (spec) query = query.eq('specialization', spec);
  if (salary) query = query.gte('salary_min', parseInt(salary));

  const { data: jobs, error } = await query;

  document.getElementById('totalJobsCount').textContent = jobs?.length || 0;

  if (error || !jobs?.length) {
    document.getElementById('jobsList').innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔍</div>
        <h3>مفيش وظائف متاحة دلوقتي</h3>
        <p>حاول تغير الفلاتر أو رجّع تاني بعد شوية</p>
      </div>`;
    return;
  }

  // Get applied jobs
  const { data: myApps } = await sb.from('applications')
    .select('job_id').eq('nurse_id', currentUser.id);
  const appliedIds = new Set(myApps?.map(a => a.job_id) || []);

  // Fetch accepted counts for all jobs at once
  const jobIds = jobs.map(j => j.id);
  var acceptedMap = {};
  if (jobIds.length > 0) {
    const { data: acceptedApps } = await sb.from('applications')
      .select('job_id')
      .in('job_id', jobIds)
      .eq('status', 'accepted');
    (acceptedApps || []).forEach(function(a) {
      acceptedMap[a.job_id] = (acceptedMap[a.job_id] || 0) + 1;
    });
  }

  document.getElementById('jobsList').innerHTML = `<div class="jobs-grid">${jobs.map(job => renderJobCard(job, appliedIds, acceptedMap)).join('')}</div>`;
}


function remainingBadge(job, acceptedMap) {
  if (!job.nurses_needed) return '';
  var accepted = (acceptedMap && acceptedMap[job.id]) || 0;
  var remaining = Math.max(0, job.nurses_needed - accepted);
  var color = remaining === 0 ? '#ef4444' : remaining <= 2 ? '#f59e0b' : 'var(--accent)';
  return '<div class="job-meta-item" style="color:' + color + ';font-weight:700"><i class="fas fa-users"></i>' + (remaining === 0 ? 'اكتملت' : remaining + ' متبقي من ' + job.nurses_needed) + '</div>';
}
function renderJobCard(job, appliedIds, acceptedMap) {
  const applied = appliedIds?.has(job.id);
  const hospital = job.hospitals;
  const initials = hospital?.hospital_name?.substring(0, 2) || '🏥';
  const benefits = job.benefits || [];
  const facilityAvatarHtml = (hospital && hospital.avatar_url)
    ? `<img src="${hospital.avatar_url}" style="width:46px;height:46px;border-radius:12px;object-fit:cover;border:2px solid var(--border);flex-shrink:0">`
    : `<div class="hospital-avatar">${initials}</div>`;

  return `
    <div class="job-card" onclick="openJobDetail('${job.id}')" style="cursor:pointer">
      <div class="job-card-header">
        <div class="hospital-info">
          ${facilityAvatarHtml}
          <div>
            <div class="hospital-name">${hospital?.hospital_name || 'منشأة طبية'}</div>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
              ${hospital?.facility_type ? `<span style="font-size:11px;background:var(--accent-light);color:var(--primary);padding:2px 8px;border-radius:20px;font-weight:700">${hospital.facility_type}</span>` : ''}
              <div class="hospital-city"><i class="fas fa-map-marker-alt"></i> ${job.city || hospital?.city || '-'}</div>
            </div>
          </div>
        </div>
        ${job.shift_type ? `<div class="job-badge">${job.shift_type}</div>` : ''}
      </div>
      <div class="job-title">${job.title}</div>
      <div class="job-meta">
        ${job.specialization ? `<div class="job-meta-item"><i class="fas fa-stethoscope"></i>${job.specialization}</div>` : ''}
        ${remainingBadge(job, acceptedMap)}
      </div>
      ${(job.salary_min || job.salary_max) ? `
      <div class="salary-range">
        <span class="salary-label">💰 الراتب</span>
        <span class="salary-amount">${job.salary_min?.toLocaleString() || '?'} - ${job.salary_max?.toLocaleString() || '?'} جنيه</span>
      </div>` : ''}
      ${benefits.length ? `
      <div class="benefits-list">
        ${benefits.slice(0, 3).map(b => `<span class="benefit-tag">✓ ${b}</span>`).join('')}
        ${benefits.length > 3 ? `<span class="benefit-tag">+${benefits.length - 3}</span>` : ''}
      </div>` : ''}
      <button class="btn ${applied ? 'btn-ghost' : 'btn-primary'} w-full" 
        ${applied ? 'disabled' : `onclick="event.stopPropagation();openApplyModal('${job.id}', '${job.title}', '${hospital?.hospital_name}')"`}>
        ${applied ? '<i class="fas fa-check"></i> تم التقديم' : '<i class="fas fa-paper-plane"></i> تقدّم الآن'}
      </button>
    </div>`;
}

async function loadNurseStats() {
  const { data: apps } = await sb.from('applications').select('status').eq('nurse_id', currentUser.id);
  if (apps) {
    document.getElementById('myAppsCount').textContent = apps.length;
    document.getElementById('pendingAppsCount').textContent = apps.filter(a => a.status === 'pending').length;
    document.getElementById('acceptedAppsCount').textContent = apps.filter(a => a.status === 'accepted').length;
  }
}

// ========== NURSE - MY APPLICATIONS ==========
async function loadMyApplications() {
  document.getElementById('myApplicationsList').innerHTML = '<div class="loading"><div class="spinner"></div> جاري التحميل...</div>';

  const { data: apps, error } = await sb.from('applications')
    .select(`*, job_postings(title, city, shift_type, hospitals(hospital_name, avatar_url, facility_type))`)
    .eq('nurse_id', currentUser.id)
    .order('created_at', { ascending: false });

  if (!apps?.length) {
    document.getElementById('myApplicationsList').innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <h3>مفيش طلبات لسه</h3>
        <p>ابدأ بالتقديم على الوظائف المناسبة ليك</p>
      </div>`;
    return;
  }

  const statusMap = { pending: 'قيد المراجعة', reviewed: 'تمت المراجعة', accepted: 'تم القبول', rejected: 'مرفوض' };
  const statusClass = { pending: 'status-pending', reviewed: 'status-reviewed', accepted: 'status-accepted', rejected: 'status-rejected' };

  document.getElementById('myApplicationsList').innerHTML = apps.map(app => `
    <div class="application-item">
      ${(app.job_postings?.hospitals?.avatar_url)
        ? `<img src="${app.job_postings.hospitals.avatar_url}" style="width:46px;height:46px;border-radius:12px;object-fit:cover;border:2px solid var(--border);flex-shrink:0">`
        : `<div class="nurse-avatar">🏥</div>`}
      <div class="application-info">
        <div class="application-name">${app.job_postings?.title || 'وظيفة'}</div>
        <div class="application-meta" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
          ${app.job_postings?.hospitals?.facility_type ? `<span style="font-size:11px;background:var(--accent-light);color:var(--primary);padding:1px 7px;border-radius:20px;font-weight:700">${app.job_postings.hospitals.facility_type}</span>` : ''}
          ${app.job_postings?.hospitals?.hospital_name || ''}
          ${app.job_postings?.city ? '• ' + app.job_postings.city : ''}
          ${app.job_postings?.shift_type ? '• ' + app.job_postings.shift_type : ''}
        </div>
        <div class="application-meta" style="margin-top:4px;font-size:12px;opacity:0.7">
          ${new Date(app.created_at).toLocaleDateString('ar-EG')}
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
        <div class="status-badge ${statusClass[app.status]}">${statusMap[app.status]}</div>
        ${(app.status === 'pending' || app.status === 'reviewed') ? `
        <button onclick="withdrawApplication('${app.id}')" title="سحب الطلب"
          style="background:none;border:1.5px solid #ef4444;color:#ef4444;border-radius:8px;padding:4px 10px;cursor:pointer;font-size:12px;font-family:inherit;font-weight:600;transition:all 0.2s"
          onmouseover="this.style.background='#fef2f2'" onmouseout="this.style.background='none'">
          <i class="fas fa-times"></i> سحب
        </button>` : ''}
      </div>
    </div>
  `).join('');
}


async function withdrawApplication(appId) {
  if (!confirm('هل تريد سحب هذا الطلب؟')) return;
  var { error } = await sb.from('applications').delete().eq('id', appId).eq('nurse_id', currentUser.id);
  if (error) { alert('حصل خطأ أثناء سحب الطلب'); return; }
  loadMyApplications();
  loadJobs(); // refresh remaining counter
}

// ========== HOSPITAL - JOBS ==========
async function loadHospitalJobs() {
  document.getElementById('hospitalJobsList').innerHTML = '<div class="loading"><div class="spinner"></div> جاري التحميل...</div>';

  const { data: jobs } = await sb.from('job_postings')
    .select(`*, applications(id)`)
    .eq('hospital_id', currentUser.id)
    .eq('is_completed', false)
    .order('created_at', { ascending: false });

  document.getElementById('myJobsCount').textContent = jobs?.length || 0;

  if (!jobs?.length) {
    document.getElementById('hospitalJobsList').innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <h3>مفيش وظائف منشورة لسه</h3>
        <p>اضغط "إضافة وظيفة" لنشر أول طلب توظيف</p>
      </div>`;
    return;
  }

  document.getElementById('hospitalJobsList').innerHTML = `<div class="jobs-grid">${jobs.map(job => `
    <div class="job-card">
      <div class="job-card-header">
        <div>
          <div class="job-title" style="margin-bottom:4px">${job.title}</div>
          <div class="hospital-city"><i class="fas fa-map-marker-alt"></i> ${job.city || '-'}</div>
        </div>
        <div class="flex gap-3">
          ${job.shift_type ? `<div class="job-badge">${job.shift_type}</div>` : ''}
          <div class="job-badge" style="background:#dbeafe;color:#1d4ed8">${job.applications?.length || 0} طلب</div>
        </div>
      </div>
      <div class="job-meta">
        ${job.specialization ? `<div class="job-meta-item"><i class="fas fa-stethoscope"></i>${job.specialization}</div>` : ''}
        ${job.nurses_needed ? `<div class="job-meta-item"><i class="fas fa-users"></i>${job.nurses_needed} ممرض</div>` : ''}
      </div>
      ${(job.salary_min || job.salary_max) ? `
      <div class="salary-range">
        <span class="salary-label">💰 الراتب</span>
        <span class="salary-amount">${job.salary_min?.toLocaleString() || '?'} - ${job.salary_max?.toLocaleString() || '?'} جنيه</span>
      </div>` : ''}
      <div class="flex gap-3 mt-4">
        <button class="btn btn-outline btn-sm" style="flex:1" onclick="viewJobApplications('${job.id}', '${job.title}')">
          <i class="fas fa-users"></i> الطلبات (${job.applications?.length || 0})
        </button>
        <button class="btn btn-ou        <button class="btn btn-outline btn-sm" onclick="loadAndEditJob('${job.id}')" title="تعديل">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn btn-danger btn-sm" onclick="deleteJob('${job.id}')" title="حذف">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
  `).join('')}</div>`;
}

async function deleteJob(jobId) {
  if (!confirm('هل أنت متأكد من حذف هذه الوظيفة؟')) return;
  await sb.from('job_postings').delete().eq('id', jobId);
  loadHospitalJobs();
  loadHospitalStats();
}

async function loadCompletedJobs() {
  document.getElementById('hospitalCompletedList').innerHTML = '<div class="loading"><div class="spinner"></div> جاري التحميل...</div>';

  const { data: jobs } = await sb.from('job_postings')
    .select('*, applications(id, status, nurses(full_name, city, avatar_url))')
    .eq('hospital_id', currentUser.id)
    .eq('is_completed', true)
    .order('completed_at', { ascending: false });

  if (!jobs?.length) {
    document.getElementById('hospitalCompletedList').innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🏆</div>
        <h3>مفيش وظائف مكتملة بعد</h3>
        <p>لما تقبل العدد المطلوب من الممرضين في أي وظيفة هتنتقل هنا تلقائياً</p>
      </div>`;
    return;
  }

  document.getElementById('hospitalCompletedList').innerHTML = `<div class="jobs-grid">${jobs.map(function(job) {
    var acceptedNurses = (job.applications || []).filter(function(a) { return a.status === 'accepted'; });
    var completedDate = job.completed_at ? new Date(job.completed_at).toLocaleDateString('ar-EG') : '';
    return `
      <div class="job-card" style="border:2px solid var(--accent);position:relative;overflow:hidden">
        <div style="position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,var(--accent),var(--primary))"></div>
        <div class="job-card-header">
          <div>
            <div class="job-title" style="margin-bottom:4px">${job.title}</div>
            <div class="hospital-city"><i class="fas fa-map-marker-alt"></i> ${job.city || '-'}</div>
          </div>
          <div>
            <div class="job-badge" style="background:#d1fae5;color:#065f46">
              <i class="fas fa-check-circle"></i> مكتملة
            </div>
          </div>
        </div>
        <div class="job-meta">
          ${job.specialization ? `<div class="job-meta-item"><i class="fas fa-stethoscope"></i>${job.specialization}</div>` : ''}
          <div class="job-meta-item"><i class="fas fa-users"></i>${acceptedNurses.length} / ${job.nurses_needed || 1} ممرض</div>
          ${completedDate ? `<div class="job-meta-item"><i class="fas fa-calendar-check"></i>اكتملت ${completedDate}</div>` : ''}
        </div>
        ${acceptedNurses.length ? `
        <div style="margin-top:12px;border-top:1px solid var(--border);padding-top:12px">
          <div style="font-size:12px;font-weight:700;color:var(--text-muted);margin-bottom:8px">الممرضون المقبولون:</div>
          <div style="display:flex;flex-direction:column;gap:6px">
            ${acceptedNurses.map(function(a) {
              var n = a.nurses;
              var nurseAvHtml = (n && n.avatar_url)
                ? `<img src="${n.avatar_url}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;border:2px solid var(--border);flex-shrink:0">`
                : `<div class="nurse-avatar" style="width:28px;height:28px;font-size:12px">${n?.full_name?.substring(0,1) || '؟'}</div>`;
              return `<div style="display:flex;align-items:center;gap:8px;font-size:13px">
                ${nurseAvHtml}
                <span style="font-weight:600">${n?.full_name || 'ممرض'}</span>
                ${n?.city ? `<span style="color:var(--text-muted)">• ${n.city}</span>` : ''}
              </div>`;
            }).join('')}
          </div>
        </div>` : ''}
        ${(job.salary_min || job.salary_max) ? `
        <div class="salary-range" style="margin-top:12px">
          <span class="salary-label">💰 الراتب</span>
          <span class="salary-amount">${(job.salary_min||0).toLocaleString()} - ${(job.salary_max||0).toLocaleString()} جنيه</span>
        </div>` : ''}
      </div>`;
  }).join('')}</div>`;
}

async function loadHospitalStats() {
  const { data: jobs } = await sb.from('job_postings').select('id').eq('hospital_id', currentUser.id);
  const jobIds = jobs?.map(j => j.id) || [];

  document.getElementById('myJobsCount').textContent = jobIds.length;

  if (!jobIds.length) {
    document.getElementById('totalAppsCount').textContent = 0;
    document.getElementById('pendingCount').textContent = 0;
    document.getElementById('acceptedCount').textContent = 0;
    return;
  }

  const { data: apps } = await sb.from('applications').select('status').in('job_id', jobIds);
  document.getElementById('totalAppsCount').textContent = apps?.length || 0;
  document.getElementById('pendingCount').textContent = apps?.filter(a => a.status === 'pending').length || 0;
  document.getElementById('acceptedCount').textContent = apps?.filter(a => a.status === 'accepted').length || 0;
}

async function loadHospitalApplications() {
  document.getElementById('hospitalApplicationsList').innerHTML = '<div class="loading"><div class="spinner"></div> جاري التحميل...</div>';

  // Get active (non-completed) jobs with their applications
  const { data: jobs } = await sb.from('job_postings')
    .select('id, title, nurses_needed, city, shift_type')
    .eq('hospital_id', currentUser.id)
    .eq('is_completed', false)
    .order('created_at', { ascending: false });

  if (!jobs?.length) {
    document.getElementById('hospitalApplicationsList').innerHTML = `<div class="empty-state"><div class="empty-state-icon">📥</div><h3>مفيش وظائف نشطة لسه</h3></div>`;
    return;
  }

  const jobIds = jobs.map(j => j.id);
  const { data: apps } = await sb.from('applications')
    .select(`*, nurses(full_name, city, years_experience, specializations, bio, phone, certificates_urls, avatar_url)`)
    .in('job_id', jobIds)
    .order('created_at', { ascending: false });

  window._apps = apps || [];

  const statusClass = { pending: 'status-pending', reviewed: 'status-reviewed', accepted: 'status-accepted', rejected: 'status-rejected' };
  const statusMap = { pending: 'قيد المراجعة', reviewed: 'تمت المراجعة', accepted: 'تم القبول', rejected: 'مرفوض' };

  // Group apps by job
  var html = '';
  var hasAnyApps = false;

  jobs.forEach(function(job) {
    var jobApps = (apps || []).filter(function(a) { return a.job_id === job.id; });
    var acceptedCount = jobApps.filter(function(a) { return a.status === 'accepted'; }).length;
    var needed = job.nurses_needed || 1;

    hasAnyApps = hasAnyApps || jobApps.length > 0;

    html += `
      <div style="margin-bottom:24px">
        <div style="background:var(--primary);color:white;border-radius:var(--radius) var(--radius) 0 0;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
          <div>
            <div style="font-weight:700;font-size:15px">${job.title}</div>
            <div style="font-size:12px;opacity:0.85;margin-top:2px">
              ${job.city ? `<span><i class="fas fa-map-marker-alt"></i> ${job.city}</span>` : ''}
              ${job.shift_type ? `<span style="margin-right:10px"><i class="fas fa-clock"></i> ${job.shift_type}</span>` : ''}
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <div style="background:rgba(255,255,255,0.2);padding:4px 12px;border-radius:100px;font-size:12px;font-weight:700">
              <i class="fas fa-users"></i> ${acceptedCount} / ${needed} مقبول
            </div>
            <div style="background:rgba(255,255,255,0.2);padding:4px 12px;border-radius:100px;font-size:12px">
              ${jobApps.length} طلب
            </div>
          </div>
        </div>
        <div style="border:2px solid var(--border);border-top:none;border-radius:0 0 var(--radius) var(--radius);overflow:hidden">
          ${jobApps.length === 0 ? `
            <div style="padding:20px;text-align:center;color:var(--text-muted);font-size:14px">
              <i class="fas fa-inbox" style="font-size:24px;margin-bottom:8px;display:block;opacity:0.4"></i>
              مفيش طلبات على هذه الوظيفة بعد
            </div>` :
            jobApps.map(function(app) {
              var nurse = app.nurses;
              return `
                <div class="application-item" onclick="viewApplicant('${app.id}')" style="cursor:pointer;border-radius:0;border-bottom:1px solid var(--border)">
                  ${nurse && nurse.avatar_url
                    ? `<img src="${nurse.avatar_url}" style="width:46px;height:46px;border-radius:12px;object-fit:cover;border:2px solid var(--border);flex-shrink:0">`
                    : `<div class="nurse-avatar">${nurse?.full_name?.substring(0,1) || '؟'}</div>`}
                  <div class="application-info">
                    <div class="application-name">${nurse?.full_name || 'ممرض'}</div>
                    <div class="application-meta">
                      ${nurse?.city || ''} ${nurse?.years_experience ? '• ' + nurse.years_experience + ' سنة خبرة' : ''}
                      ${nurse?.specializations?.length ? '• ' + nurse.specializations.slice(0,2).join('، ') : ''}
                    </div>
                    <div class="application-meta" style="margin-top:2px;font-size:12px;opacity:0.7">
                      ${new Date(app.created_at).toLocaleDateString('ar-EG')}
                    </div>
                  </div>
                  <div class="status-badge ${statusClass[app.status]}">${statusMap[app.status]}</div>
                </div>`;
            }).join('')
          }
        </div>
      </div>`;
  });

  if (!hasAnyApps) {
    document.getElementById('hospitalApplicationsList').innerHTML = `<div class="empty-state"><div class="empty-state-icon">📥</div><h3>مفيش طلبات واردة لسه</h3></div>`;
    return;
  }

  document.getElementById('hospitalApplicationsList').innerHTML = html;
}

function viewApplicant(appId) {
  const app = window._apps?.find(a => a.id === appId);
  if (!app) return;
  const nurse = app.nurses;

  const certUrls = (nurse && nurse.certificates_urls && nurse.certificates_urls.length)
    ? nurse.certificates_urls : [];

  const avatarHtml = (nurse && nurse.avatar_url)
    ? `<img src="${nurse.avatar_url}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:3px solid rgba(255,255,255,0.5);margin:0 auto 16px;display:block">`
    : `<div class="profile-avatar-large">${nurse?.full_name?.substring(0,1) || '؟'}</div>`;

  document.getElementById('appDetailBody').innerHTML = `
    <div class="profile-hero" style="border-radius:var(--radius);margin-bottom:20px">
      ${avatarHtml}
      <div class="profile-name">${nurse?.full_name || 'ممرض'}</div>
      <div class="profile-meta">
        ${nurse?.city ? `<span><i class="fas fa-map-marker-alt"></i> ${nurse.city}</span>` : ''}
        ${nurse?.years_experience ? `<span><i class="fas fa-clock"></i> ${nurse.years_experience} سنة خبرة</span>` : ''}
        ${nurse?.phone ? `<span><i class="fas fa-phone"></i> ${nurse.phone}</span>` : ''}
      </div>
    </div>

    ${nurse?.specializations?.length ? `
    <div style="margin-bottom:16px">
      <div style="font-size:13px;color:var(--text-muted);font-weight:700;margin-bottom:8px;display:flex;align-items:center;gap:6px">
        <i class="fas fa-stethoscope"></i> التخصصات
      </div>
      <div class="benefits-list">${nurse.specializations.map(s => `<span class="benefit-tag">${s}</span>`).join('')}</div>
    </div>` : ''}

    ${nurse?.bio ? `
    <div style="background:var(--bg);border-radius:var(--radius-sm);padding:14px;margin-bottom:16px">
      <div style="font-size:13px;font-weight:700;color:var(--text-muted);margin-bottom:6px;display:flex;align-items:center;gap:6px">
        <i class="fas fa-user"></i> نبذة عن الممرض
      </div>
      <div style="font-size:14px;line-height:1.7;color:var(--text)">${nurse.bio}</div>
    </div>` : ''}

    ${certUrls.length ? `
    <div style="margin-bottom:16px">
      <div style="font-size:13px;color:var(--text-muted);font-weight:700;margin-bottom:10px;display:flex;align-items:center;gap:6px">
        <i class="fas fa-certificate" style="color:var(--accent)"></i> الشهادات والاعتمادات
        <span style="background:var(--accent);color:white;font-size:11px;padding:2px 8px;border-radius:100px">${certUrls.length}</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:10px">
        ${certUrls.map((url, i) => `
          <div onclick="window.open('${url}','_blank')" style="cursor:pointer;border-radius:10px;overflow:hidden;border:2px solid var(--border);transition:all 0.2s;aspect-ratio:1" 
               onmouseover="this.style.borderColor='var(--accent)';this.style.transform='scale(1.03)'"
               onmouseout="this.style.borderColor='var(--border)';this.style.transform='scale(1)'">
            <img src="${url}" style="width:100%;height:100%;object-fit:cover" title="شهادة ${i+1}">
          </div>`).join('')}
      </div>
      <div style="font-size:12px;color:var(--text-muted);margin-top:8px;text-align:center">
        <i class="fas fa-search-plus"></i> اضغط على أي صورة لعرضها بالكامل
      </div>
    </div>` : `
    <div style="background:var(--bg);border-radius:var(--radius-sm);padding:12px 16px;margin-bottom:16px;font-size:13px;color:var(--text-muted);display:flex;align-items:center;gap:8px">
      <i class="fas fa-certificate"></i> لم يرفع هذا الممرض صور شهادات بعد
    </div>`}

    ${app.cover_note ? `
    <div style="background:var(--bg);border-radius:var(--radius-sm);padding:14px">
      <div style="font-size:13px;font-weight:700;color:var(--text-muted);margin-bottom:6px;display:flex;align-items:center;gap:6px">
        <i class="fas fa-comment-alt"></i> رسالة المتقدم
      </div>
      <div style="font-size:14px;line-height:1.7">${app.cover_note}</div>
    </div>` : ''}


    <div style="border-top:1px solid var(--border);margin-top:20px;padding-top:16px;text-align:center">
      <button onclick="downloadNurseCV('${app.nurse_id}')" style="background:none;border:1.5px solid #ef4444;color:#ef4444;padding:10px 28px;border-radius:8px;cursor:pointer;font-family:inherit;font-size:13px;font-weight:600;display:inline-flex;align-items:center;gap:8px">
        <i class="fas fa-file-pdf"></i> تحميل السيرة الذاتية PDF
      </button>
    </div>
  `;


  document.getElementById('appDetailFooter').innerHTML = `
    <div style="display:flex;justify-content:center;gap:10px;width:100%">
      <button class="btn btn-danger btn-sm" onclick="updateAppStatus('${app.id}', 'rejected')">
        <i class="fas fa-times"></i> رفض
      </button>
      <button class="btn btn-outline btn-sm" onclick="updateAppStatus('${app.id}', 'reviewed')">
        <i class="fas fa-eye"></i> تمت المراجعة
      </button>
      <button class="btn btn-primary btn-sm" onclick="updateAppStatus('${app.id}', 'accepted')">
        <i class="fas fa-check"></i> قبول
      </button>
    </div>`;

  openModal('appDetailModal');
}

async function viewJobApplications(jobId, jobTitle) {
  // Switch to applications tab and filter
  const appsTab = document.querySelector('#page-hospital .tab-btn:nth-child(2)');
  switchTab('hospital', 'applications', appsTab);
  await loadHospitalApplications();
}

async function updateAppStatus(appId, status) {
  await sb.from('applications').update({ status, updated_at: new Date() }).eq('id', appId);
  closeModal('appDetailModal');

  // Check if job is now completed (accepted count >= nurses_needed)
  const app = window._apps?.find(function(a) { return a.id === appId; });
  if (app && status === 'accepted') {
    await checkAndCompleteJob(app.job_id);
  }

  await loadHospitalApplications();
  await loadHospitalStats();
}

async function checkAndCompleteJob(jobId) {
  // Get job details
  const { data: job } = await sb.from('job_postings')
    .select('nurses_needed, is_completed, title')
    .eq('id', jobId)
    .single();

  if (!job || job.is_completed) return;

  // Count accepted applications
  const { count } = await sb.from('applications')
    .select('id', { count: 'exact', head: true })
    .eq('job_id', jobId)
    .eq('status', 'accepted');

  var needed = job.nurses_needed || 1;
  if (count >= needed) {
    // Mark job as completed
    await sb.from('job_postings').update({
      is_completed: true,
      is_active: false,
      completed_at: new Date().toISOString()
    }).eq('id', jobId);

    // Show notification
    var toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:var(--accent);color:white;padding:12px 24px;border-radius:100px;font-weight:700;font-size:14px;z-index:9999;box-shadow:0 4px 20px rgba(0,184,148,0.4);animation:fadeIn 0.3s ease';
    toast.innerHTML = '<i class="fas fa-check-circle"></i> تم اكتمال وظيفة "' + job.title + '" وتم نقلها للوظائف المكتملة';
    document.body.appendChild(toast);
    setTimeout(function() { toast.remove(); }, 4000);

    loadHospitalJobs();
  }
}

// ========== ADD JOB ==========
function openJobModal() {
  tags.benefits = [];
  renderTags('benefits');
  document.getElementById('jobForm').reset();
  clearAlert('jobModalAlert');
  // Auto-fill city from facility profile
  var city = (currentProfile && currentProfile.city) ? currentProfile.city : '';
  document.getElementById('jobCity').value = city;
  document.getElementById('jobCityDisplay').textContent = city || 'غير محدد';
  openModal('jobModal');
}

async function handleAddJob(e) {
  e.preventDefault();
  clearAlert('jobModalAlert');

  const title = document.getElementById('jobTitle').value;
  const desc = document.getElementById('jobDesc').value;
  const salMin = parseInt(document.getElementById('jobSalaryMin').value);
  const salMax = parseInt(document.getElementById('jobSalaryMax').value);

  if (!title || !desc) return showAlert('jobModalAlert', 'عنوان الوظيفة والوصف مطلوبين');
  if (!salMin || !salMax) return showAlert('jobModalAlert', 'الراتب مطلوب');

  const { error } = await sb.from('job_postings').insert({
    hospital_id: currentUser.id,
    title,
    description: desc,
    specialization: document.getElementById('jobSpec').value || null,
    city: document.getElementById('jobCity').value || null,
    shift_type: document.getElementById('jobShift').value || null,
    nurses_needed: parseInt(document.getElementById('jobNursesNeeded').value) || 1,
    salary_min: salMin,
    salary_max: salMax,
    benefits: tags.benefits,
    requirements: document.getElementById('jobReqs').value || null,
  });

  if (error) return showAlert('jobModalAlert', 'حصل خطأ أثناء نشر الوظيفة');

  closeModal('jobModal');
  await loadHospitalJobs();
  await loadHospitalStats();
  var t2 = document.createElement('div');
  t2.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:var(--accent);color:white;padding:10px 22px;border-radius:100px;font-weight:700;font-size:13px;z-index:9999;box-shadow:0 4px 20px rgba(0,184,148,0.4)';
  t2.innerHTML = '<i class="fas fa-check-circle"></i> تم نشر الوظيفة';
  document.body.appendChild(t2);
  setTimeout(function() { t2.remove(); }, 2500);
}

// ========== APPLY ==========
function openApplyModal(jobId, jobTitle, hospitalName) {
  selectedJobId = jobId;
  document.getElementById('applyJobInfo').innerHTML = `
    <div style="font-weight:700;font-size:16px;color:var(--primary);margin-bottom:6px">${jobTitle}</div>
    <div style="color:var(--text-muted);font-size:14px"><i class="fas fa-hospital"></i> ${hospitalName}</div>`;
  document.getElementById('coverNote').value = '';
  clearAlert('applyModalAlert');
  openModal('applyModal');
}

async function handleApply() {
  clearAlert('applyModalAlert');
  if (!selectedJobId) return;

  const btn = document.getElementById('applyBtn');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner" style="width:16px;height:16px;border-width:2px"></div>';

  const { error } = await sb.from('applications').insert({
    job_id: selectedJobId,
    nurse_id: currentUser.id,
    cover_note: document.getElementById('coverNote').value || null,
    status: 'pending',
  });

  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-paper-plane"></i> أرسل الطلب';

  if (error) {
    if (error.code === '23505') return showAlert('applyModalAlert', 'لقد تقدمت على هذه الوظيفة من قبل', 'error');
    return showAlert('applyModalAlert', 'حصل خطأ، حاول تاني');
  }

  closeModal('applyModal');
  loadJobs();
  loadNurseStats();
}

// ========== PROFILE ==========
function showProfileModal() {
  if (!currentProfile) return;
  document.getElementById('editNurseName').value = currentProfile.full_name || '';
  updateCharCount(document.getElementById('editNurseName'), 'editNurseNameCount', 30);
  document.getElementById('editNursePhone').value = currentProfile.phone || '';
  document.getElementById('editNurseCity').value = currentProfile.city || '';
  document.getElementById('editNurseExp').value = currentProfile.years_experience || '';
  document.getElementById('editNurseBio').value = currentProfile.bio || '';
  setEditSpecsFromArray(currentProfile.specializations || []);
  editCertFiles = [];
  newAvatarFile = null;
  document.getElementById('editCertPreviewGrid').innerHTML = '';
  loadCertificates();
  // Load avatar preview
  renderAvatarPreview('profileAvatarPreview', currentProfile.avatar_url || null, 80);
  clearAlert('profileModalAlert');
  openModal('profileModal');
}

async function handleUpdateProfile(e) {
  if (e && e.preventDefault) e.preventDefault();
  clearAlert('profileModalAlert');

  if (!currentUser) {
    showAlert('profileModalAlert', 'يجب تسجيل الدخول أولاً');
    return;
  }

  var saveBtn = document.querySelector('#profileModal .btn-primary');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.innerHTML = '<div class="spinner" style="width:16px;height:16px;border-width:2px;display:inline-block"></div> جاري الحفظ...'; }

  try {
    // Upload new cert images
    var existingUrls = (currentProfile && currentProfile.certificates_urls) ? currentProfile.certificates_urls : [];
    var newFiles = editCertFiles.filter(function(f) { return f !== null; });
    var newUrls = [];

    for (var i = 0; i < newFiles.length; i++) {
      var file = newFiles[i];
      var ext = file.name.split('.').pop();
      var filePath = currentUser.id + '/' + Date.now() + '_' + i + '.' + ext;
      var upResult = await sb.storage.from('certificates').upload(filePath, file, { upsert: true });
      if (!upResult.error) {
        var pubResult = sb.storage.from('certificates').getPublicUrl(filePath);
        newUrls.push(pubResult.data.publicUrl);
      } else {
        console.warn('Upload error for file', file.name, upResult.error);
      }
    }

    var allCertUrls = existingUrls.concat(newUrls);

    // Upload avatar if changed
    var avatarUrl = (currentProfile && currentProfile.avatar_url) ? currentProfile.avatar_url : null;
    if (newAvatarFile) {
      var uploadedUrl = await uploadAvatar(currentUser.id);
      if (uploadedUrl) avatarUrl = uploadedUrl;
    }

    var updateData = {
      full_name: document.getElementById('editNurseName').value || '',
      phone: document.getElementById('editNursePhone').value || '',
      city: document.getElementById('editNurseCity').value || '',
      years_experience: parseInt(document.getElementById('editNurseExp').value) || 0,
      bio: document.getElementById('editNurseBio').value || '',
      specializations: getEditSelectedSpecs(),
      certificates_urls: allCertUrls,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    };

    console.log('Saving profile:', updateData);

    var result = await sb.from('nurses').update(updateData).eq('id', currentUser.id).select();
    console.log('Save result:', result);

    if (result.error) {
      showAlert('profileModalAlert', 'حصل خطأ: ' + result.error.message);
      return;
    }

    editCertFiles = [];
    newAvatarFile = null;
    document.getElementById('editCertPreviewGrid').innerHTML = '';
    await loadUserProfile();
    var newName = (currentProfile && currentProfile.full_name) ? currentProfile.full_name : 'ممرض';
    document.getElementById('nurseWelcomeName').textContent = newName;
    document.getElementById('navUserName').textContent = newName;
    renderNavAvatar(currentProfile && currentProfile.avatar_url, newName);
    showAlert('profileModalAlert', '✅ تم الحفظ بنجاح', 'success');
    setTimeout(function() { closeModal('profileModal'); }, 1000);

  } catch(err) {
    console.error('handleUpdateProfile error:', err);
    showAlert('profileModalAlert', 'حصل خطأ غير متوقع: ' + err.message);
  } finally {
    if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = '<i class="fas fa-save"></i> حفظ التغييرات'; }
  }
}

// ========== FACILITY PROFILE ==========
var newFacilityAvatarFile = null;

function handleFacilityAvatarPreview(event) {
  var file = event.target.files[0];
  if (!file) return;
  newFacilityAvatarFile = file;
  var reader = new FileReader();
  reader.onload = function(e) {
    var img = new Image();
    img.onload = function() {
      var canvas = document.createElement('canvas');
      canvas.width = 200; canvas.height = 200;
      var ctx = canvas.getContext('2d');
      var srcSize = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width-srcSize)/2, (img.height-srcSize)/2, srcSize, srcSize, 0, 0, 200, 200);
      var previewUrl = canvas.toDataURL('image/jpeg', 0.92);
      renderFacilityAvatar(previewUrl);
      // Update header preview
      var nameEl = document.getElementById('facilityNameDisplay');
      if (nameEl) {
        var img2 = document.createElement('img');
        img2.src = previewUrl;
        img2.style.cssText = 'width:80px;height:80px;border-radius:50%;object-fit:cover;border:3px solid rgba(255,255,255,0.5)';
        document.getElementById('facilityAvatarPreview').innerHTML = '';
        document.getElementById('facilityAvatarPreview').appendChild(img2);
      }
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
  event.target.value = '';
}

function renderFacilityAvatar(url) {
  var el = document.getElementById('facilityAvatarPreview');
  if (!el) return;
  el.innerHTML = '';
  if (url) {
    var img = document.createElement('img');
    img.src = url;
    img.style.cssText = 'width:80px;height:80px;border-radius:50%;object-fit:cover;border:3px solid rgba(255,255,255,0.5);display:block';
    el.appendChild(img);
  } else {
    var name = (currentProfile && currentProfile.hospital_name) ? currentProfile.hospital_name : '؟';
    el.innerHTML = '<div style="width:80px;height:80px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;color:white;font-size:32px;font-weight:700;border:3px solid rgba(255,255,255,0.4)">' + name.substring(0,1) + '</div>';
  }
}

function showFacilityProfileModal() {
  if (!currentProfile || currentRole !== 'hospital') return;
  var name = currentProfile.hospital_name || '';
  var type = currentProfile.facility_type || 'مستشفى';
  document.getElementById('facilityModalTitle').textContent = 'ملف ' + type;
  document.getElementById('facilityNameDisplay').textContent = name;
  document.getElementById('facilityTypeDisplay').textContent = type + (currentProfile.city ? ' • ' + currentProfile.city : '');
  document.getElementById('editFacilityName').value = name;
  updateCharCount(document.getElementById('editFacilityName'), 'editFacilityNameCount', 40);
  document.getElementById('editFacilityType').value = type;
  document.getElementById('editFacilityPhone').value = currentProfile.phone || '';

  document.getElementById('editFacilityCity').value = currentProfile.city || '';
  document.getElementById('editFacilityAddress').value = currentProfile.address || '';
  document.getElementById('editFacilityDesc').value = currentProfile.description || '';
  newFacilityAvatarFile = null;
  renderFacilityAvatar(currentProfile.avatar_url || null);
  clearAlert('facilityModalAlert');
  openModal('facilityProfileModal');
}

async function handleUpdateFacilityProfile() {
  clearAlert('facilityModalAlert');
  if (!currentUser) return;

  var saveBtn = document.querySelector('#facilityProfileModal .btn-primary');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.innerHTML = '<div class="spinner" style="width:16px;height:16px;border-width:2px;display:inline-block"></div> جاري الحفظ...'; }

  try {
    // Upload avatar if changed
    var avatarUrl = (currentProfile && currentProfile.avatar_url) ? currentProfile.avatar_url : null;
    if (newFacilityAvatarFile) {
      var ext = newFacilityAvatarFile.name.split('.').pop();
      var blob = await resizeImageToBlob(newFacilityAvatarFile, 400);
      var path = currentUser.id + '/avatar.jpg';
      var upResult = await sb.storage.from('avatars').upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
      if (!upResult.error) {
        var pub = sb.storage.from('avatars').getPublicUrl(path);
        avatarUrl = pub.data.publicUrl + '?t=' + Date.now();
      }
    }

    var newName = document.getElementById('editFacilityName').value || '';
    var newType = document.getElementById('editFacilityType').value || 'مستشفى';

    var result = await sb.from('hospitals').update({
      hospital_name: newName,
      facility_type: newType,
      phone: document.getElementById('editFacilityPhone').value || '',
      city: document.getElementById('editFacilityCity').value || '',
      address: document.getElementById('editFacilityAddress').value || '',
      description: document.getElementById('editFacilityDesc').value || '',
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    }).eq('id', currentUser.id).select();

    if (result.error) {
      showAlert('facilityModalAlert', 'حصل خطأ: ' + result.error.message);
      return;
    }

    newFacilityAvatarFile = null;
    await loadUserProfile();
    var displayName = (currentProfile && currentProfile.hospital_name) ? currentProfile.hospital_name : newName;
    document.getElementById('hospitalWelcomeName').textContent = displayName;
    document.getElementById('navUserName').textContent = displayName;
    renderNavAvatar(currentProfile && currentProfile.avatar_url, displayName);
    showAlert('facilityModalAlert', '✅ تم الحفظ بنجاح', 'success');
    setTimeout(function() { closeModal('facilityProfileModal'); }, 1000);

  } catch(err) {
    console.error('handleUpdateFacilityProfile error:', err);
    showAlert('facilityModalAlert', 'حصل خطأ: ' + err.message);
  } finally {
    if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = '<i class="fas fa-save"></i> حفظ التغييرات'; }
  }
}

// ========== MODALS ==========
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// Close on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
});

// ========== INIT ==========
(async () => {
  // Check if returning from email confirmation link
  const hash = window.location.hash;
  if (hash && hash.includes('access_token')) {
    // Wait for supabase to process the token
    await new Promise(r => setTimeout(r, 1000));
  }

  const { data: { session } } = await sb.auth.getSession();
  if (session && session.user) {
    currentUser = session.user;

    // Check if profile exists - if not, complete from localStorage
    const { data: profile } = await sb.from('profiles').select('id').eq('id', currentUser.id).maybeSingle();
    if (!profile) {
      const pending = JSON.parse(localStorage.getItem('shift_pending_reg') || 'null');
      if (pending && pending.email === currentUser.email) {
        try {
          await completePendingRegistration(currentUser.id, pending);
          localStorage.removeItem('shift_pending_reg');
          console.log('Profile completed after email confirmation');
        } catch(e) {
          console.error('Failed to complete pending registration:', e);
        }
      }
    }

    await loadUserProfile();
    if (currentRole) goToDashboard();
  }
})();

async function completePendingRegistration(userId, pending) {
  try {
    const { error } = await sb.rpc('create_user_profile', {
      p_user_id: userId,
      p_email: pending.email,
      p_role: pending.role,
      p_full_name: pending.full_name || null,
      p_phone: pending.phone || null,
      p_city: pending.city || null,
      p_years_experience: pending.years_experience || 0,
      p_bio: pending.bio || null,
      p_specializations: pending.specializations || null,
      p_hospital_name: pending.hospital_name || null,
      p_facility_type: pending.facility_type || 'مستشفى',
      p_address: pending.address || null,
      p_description: pending.description || null,
    });
    if (error) throw error;

    // Save avatar_url if present
    if (pending.avatar_url) {
      var table = pending.role === 'nurse' ? 'nurses' : 'hospitals';
      await sb.from(table).update({ avatar_url: pending.avatar_url }).eq('id', userId);
    }
    console.log('Profile created via RPC OK');
  } catch(e) {
    console.error('completePendingRegistration error:', e);
    throw e;
  }
}

// ========== ARABIC → ENGLISH TRANSLATION ==========

// Medical specializations dictionary
var AR_EN_SPECS = {
  // Departments
  'طوارئ': 'Emergency Medicine', 'العناية المركزة': 'Intensive Care Unit (ICU)',
  'ICU': 'Intensive Care Unit (ICU)', 'أطفال': 'Pediatrics', 'طب الأطفال': 'Pediatrics',
  'نساء وتوليد': 'Obstetrics & Gynecology', 'توليد': 'Obstetrics', 'نساء': 'Gynecology',
  'جراحة': 'Surgery', 'الجراحة العامة': 'General Surgery', 'جراحة عامة': 'General Surgery',
  'باطنة': 'Internal Medicine', 'الباطنة': 'Internal Medicine', 'طب باطني': 'Internal Medicine',
  'كلى': 'Nephrology', 'قلب': 'Cardiology', 'أمراض القلب': 'Cardiology',
  'عظام': 'Orthopedics', 'أعصاب': 'Neurology', 'طب نفسي': 'Psychiatry',
  'عيون': 'Ophthalmology', 'أنف وأذن وحنجرة': 'ENT', 'جلدية': 'Dermatology',
  'أورام': 'Oncology', 'سرطان': 'Oncology', 'غسيل كلى': 'Hemodialysis',
  'حضانة': 'Neonatal ICU (NICU)', 'حديثي الولادة': 'Neonatal Care',
  'عمليات': 'Operating Room (OR)', 'غرفة العمليات': 'Operating Room (OR)',
  'طوارئ أطفال': 'Pediatric Emergency', 'قسم الحوادث': 'Accident & Emergency',
  'العلاج الطبيعي': 'Physical Therapy', 'تأهيل': 'Rehabilitation',
  'مسالك بولية': 'Urology', 'صدر': 'Pulmonology', 'أمراض الصدر': 'Pulmonology',
  'سكر': 'Diabetology', 'السكري': 'Diabetology', 'غدد صماء': 'Endocrinology',
  'روماتيزم': 'Rheumatology', 'دم': 'Hematology', 'أمراض الدم': 'Hematology',
  'هضمية': 'Gastroenterology', 'الجهاز الهضمي': 'Gastroenterology',
  'تخدير': 'Anesthesiology', 'مناظير': 'Endoscopy', 'أشعة': 'Radiology',
  'مختبر': 'Laboratory', 'صيدلة': 'Pharmacy',
};

// Egyptian cities / regions
var AR_EN_CITIES = {
  'القاهرة': 'Cairo', 'الجيزة': 'Giza', 'الإسكندرية': 'Alexandria',
  'الإسماعيلية': 'Ismailia', 'السويس': 'Suez', 'بورسعيد': 'Port Said',
  'المنصورة': 'Mansoura', 'الزقازيق': 'Zagazig', 'طنطا': 'Tanta',
  'دمياط': 'Damietta', 'كفر الشيخ': 'Kafr El-Sheikh', 'شبين الكوم': 'Shibin El-Kom',
  'بني سويف': 'Beni Suef', 'الفيوم': 'Fayoum', 'أسيوط': 'Asyut',
  'سوهاج': 'Sohag', 'قنا': 'Qena', 'أسوان': 'Aswan', 'الأقصر': 'Luxor',
  'المنيا': 'Minya', 'مرسى مطروح': 'Marsa Matrouh', 'الغردقة': 'Hurghada',
  'شرم الشيخ': 'Sharm El-Sheikh', 'العريش': 'Arish', 'الوادي الجديد': 'New Valley',
  'أبو ظبي': 'Abu Dhabi', 'دبي': 'Dubai', 'الرياض': 'Riyadh',
  'جدة': 'Jeddah', 'الكويت': 'Kuwait City', 'الدوحة': 'Doha',
  'مسقط': 'Muscat', 'المنامة': 'Manama', 'بيروت': 'Beirut',
  'عمان': 'Amman', 'بغداد': 'Baghdad', 'الخرطوم': 'Khartoum',
};

function translateSpec(s) {
  return AR_EN_SPECS[s.trim()] || s;
}

function translateCity(c) {
  if (!c) return c;
  return AR_EN_CITIES[c.trim()] || c;
}

// Translate bio/free text using Claude API
async function translateTextWithAI(arabicText) {
  if (!arabicText || !arabicText.trim()) return arabicText;
  // Check if already mostly English (less than 20% Arabic chars)
  var arabicChars = (arabicText.match(/[\u0600-\u06FF]/g) || []).length;
  if (arabicChars < arabicText.length * 0.2) return arabicText;

  try {
    var resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 400,
        messages: [{
          role: 'user',
          content: 'Translate the following Arabic text to professional English suitable for a nursing CV. Return ONLY the translated text, no explanations:\n\n' + arabicText
        }]
      })
    });
    var data = await resp.json();
    if (data.content && data.content[0] && data.content[0].text) {
      return data.content[0].text.trim();
    }
  } catch(e) {}
  return arabicText; // fallback to original if API fails
}

// Translate all CV data fields
async function translateCvData(p) {
  var translated = Object.assign({}, p);
  // Specs - use dictionary
  if (translated.specializations && translated.specializations.length) {
    translated.specializations = translated.specializations.map(translateSpec);
  }
  // City - use dictionary
  if (translated.city) {
    translated.city = translateCity(translated.city);
  }
  // Name - transliterate Arabic to English
  if (translated.full_name) {
    var arabicInName = (translated.full_name.match(/[؀-ۿ]/g) || []).length;
    if (arabicInName > 0) {
      translated.full_name = await translateNameToEnglish(translated.full_name);
    }
  }
  // Bio - use AI if Arabic
  if (translated.bio) {
    translated.bio = await translateTextWithAI(translated.bio);
  }
  return translated;
}

// ========== CV GENERATOR (HTML → Print/Save as PDF) ==========
var selectedCvType = null;

function openCvFlow() {
  if (!currentProfile) return;
  selectedCvType = null;
  var btn = document.getElementById('cvDownloadBtn');
  var atsCard = document.getElementById('cvTypeATS');
  var visCard = document.getElementById('cvTypeVisual');
  if (atsCard) { atsCard.style.borderColor = 'var(--border)'; atsCard.style.background = ''; }
  if (visCard) { visCard.style.borderColor = 'var(--border)'; visCard.style.background = ''; }
  if (btn) { btn.disabled = true; btn.style.opacity = '0.5'; }

  if (!currentProfile.cv_extra_filled) {
    if (currentProfile.education_degree)     document.getElementById('cvEduDegree').value      = currentProfile.education_degree;
    if (currentProfile.education_institution) document.getElementById('cvEduInstitution').value = currentProfile.education_institution;
    if (currentProfile.education_year)       document.getElementById('cvEduYear').value         = currentProfile.education_year;
    if (currentProfile.linkedin_url)         document.getElementById('cvLinkedin').value        = currentProfile.linkedin_url;
    openModal('cvExtraModal');
  } else {
    openModal('cvModal');
  }
}

var workExpCounter = 0;

function addWorkExpRow() {
  workExpCounter++;
  var n = workExpCounter;
  var list = document.getElementById('workExpList');
  var row = document.createElement('div');
  row.id = 'wexp_' + n;
  row.style.cssText = 'background:var(--bg);border-radius:10px;padding:12px 14px;border:1px solid var(--border);position:relative';
  row.innerHTML =
    '<button type="button" onclick="this.parentElement.remove()" ' +
    'style="position:absolute;top:8px;left:10px;background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:14px;line-height:1" ' +
    'title="\u062d\u0630\u0641">\u2715</button>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:8px">' +
    '  <div class="form-group" style="margin:0">' +
    '    <label style="font-size:12px">\u0627\u0633\u0645 \u0627\u0644\u0645\u0643\u0627\u0646 <span style="color:#ef4444">*</span></label>' +
    '    <input type="text" name="workplace" placeholder="\u0645\u062b\u0627\u0644: \u0645\u0633\u062a\u0634\u0641\u0649 \u0627\u0644\u0645\u0646\u064a\u0627 \u0627\u0644\u062c\u0627\u0645\u0639\u064a" style="font-size:13px;padding:8px 10px" />' +
    '  </div>' +
    '  <div class="form-group" style="margin:0">' +
    '    <label style="font-size:12px">\u0627\u0644\u0645\u0633\u0645\u0649 \u0627\u0644\u0648\u0638\u064a\u0641\u064a</label>' +
    '    <input type="text" name="jobtitle" placeholder="Registered Nurse" style="font-size:13px;padding:8px 10px" />' +
    '  </div>' +
    '</div>' +
    '<div class="form-group" style="margin:0">' +
    '  <label style="font-size:12px">\u0639\u062f\u062f \u0633\u0646\u0648\u0627\u062a \u0627\u0644\u0639\u0645\u0644 <span style="color:#ef4444">*</span></label>' +
    '  <input type="number" name="years" placeholder="2" min="0.5" max="40" step="0.5" style="font-size:13px;padding:8px 10px;width:120px" />' +
    '</div>';
  list.appendChild(row);
}


async function saveCvExtra() {
  var degree      = document.getElementById('cvEduDegree').value.trim();
  var institution = document.getElementById('cvEduInstitution').value.trim();
  var year        = document.getElementById('cvEduYear').value.trim();
  var linkedin    = document.getElementById('cvLinkedin').value.trim();

  if (!degree || !institution) {
    showAlert('cvExtraAlert', 'الدرجة العلمية والجامعة مطلوبين', 'error');
    return;
  }

  // Collect work experience rows
  var workRows = document.querySelectorAll('#workExpList > div');
  var workExps = [];
  for (var i = 0; i < workRows.length; i++) {
    var workplace = workRows[i].querySelector('[name="workplace"]').value.trim();
    var jobtitle  = workRows[i].querySelector('[name="jobtitle"]').value.trim() || 'Registered Nurse';
    var years     = parseFloat(workRows[i].querySelector('[name="years"]').value) || 0;
    if (workplace && years > 0) {
      workExps.push({ nurse_id: currentUser.id, workplace_name: workplace, job_title: jobtitle, years_worked: years });
    }
  }

  // Save nurse profile
  var { error } = await sb.from('nurses').update({
    education_degree: degree,
    education_institution: institution,
    education_year: year,
    linkedin_url: linkedin,
    cv_extra_filled: true
  }).eq('id', currentUser.id);

  if (error) { showAlert('cvExtraAlert', 'حصل خطأ: ' + error.message, 'error'); return; }

  // Save work experiences (delete old then insert new)
  if (workExps.length > 0) {
    await sb.from('work_experiences').delete().eq('nurse_id', currentUser.id);
    var { error: weErr } = await sb.from('work_experiences').insert(workExps);
    if (weErr) { showAlert('cvExtraAlert', 'حصل خطأ في حفظ الخبرات: ' + weErr.message, 'error'); return; }
  }

  currentProfile.education_degree      = degree;
  currentProfile.education_institution = institution;
  currentProfile.education_year        = year;
  currentProfile.linkedin_url          = linkedin;
  currentProfile.cv_extra_filled       = true;

  closeModal('cvExtraModal');
  clearAlert('cvExtraAlert');
  openModal('cvModal');
}

function skipCvExtra() {
  closeModal('cvExtraModal');
  openModal('cvModal');
}

function selectCvType(type) {
  selectedCvType = type;
  var atsCard = document.getElementById('cvTypeATS');
  var visCard  = document.getElementById('cvTypeVisual');
  var btn      = document.getElementById('cvDownloadBtn');
  if (type === 'ats') {
    atsCard.style.borderColor = '#0a3d62'; atsCard.style.background = '#f0f7ff';
    visCard.style.borderColor  = 'var(--border)'; visCard.style.background  = '';
  } else {
    visCard.style.borderColor  = '#00b894'; visCard.style.background  = '#f0fdf9';
    atsCard.style.borderColor = 'var(--border)'; atsCard.style.background = '';
  }
  btn.disabled = false; btn.style.opacity = '1';
}

async function downloadCV() {
  if (!currentProfile || !selectedCvType) return;
  var btn = document.getElementById('cvDownloadBtn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ جاري التحضير...'; }
  var email = currentUser ? (currentUser.email || '') : '';
  var type = selectedCvType;
  var translated = await translateCvData(currentProfile);
  // Fetch work experiences
  var { data: workExps } = await sb.from('work_experiences').select('*').eq('nurse_id', currentUser.id).order('years_worked', { ascending: false });
  translated._workExps = workExps || [];
  var avatarB64 = null;
  if (type === 'visual' && currentProfile.avatar_url) {
    avatarB64 = await fetchImageAsBase64(currentProfile.avatar_url);
  }
  printCV(translated, email, type, avatarB64);
  closeModal('cvModal');
  selectedCvType = null;
  if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-download"></i> تحميل PDF'; }
}

// Dedicated name transliteration - returns only the English name
async function translateNameToEnglish(arabicName) {
  try {
    var resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 50,
        system: 'You are a name transliterator. Convert Arabic names to English romanization. Respond with ONLY the transliterated name, nothing else.',
        messages: [{ role: 'user', content: arabicName }]
      })
    });
    var data = await resp.json();
    if (data.content && data.content[0] && data.content[0].text) {
      return data.content[0].text.trim();
    }
  } catch(e) {}
  return arabicName;
}

// Helper: fetch image as base64 for print window
async function fetchImageAsBase64(url) {
  if (!url) return null;
  try {
    var resp = await fetch(url);
    var blob = await resp.blob();
    return new Promise(function(resolve) {
      var reader = new FileReader();
      reader.onloadend = function() { resolve(reader.result); };
      reader.onerror  = function() { resolve(null); };
      reader.readAsDataURL(blob);
    });
  } catch(e) { return null; }
}

// Core: open a print window with clean CV HTML
function printCV(p, email, type, avatarBase64) {
  var name        = p.full_name        || '';
  var phone       = p.phone            || '';
  var city        = p.city             || '';
  var linkedin    = p.linkedin_url     || '';
  var exp         = p.years_experience || 0;
  var specs       = p.specializations  || [];
  var certs       = p.certifications   || [];
  var degree      = p.education_degree      || 'Bachelor of Science in Nursing';
  var institution = p.education_institution || '';
  var gradYear    = p.education_year        || '';
  var bio         = p.bio || '';
  var expFrom     = new Date().getFullYear() - exp;

  var summary = bio
    ? bio
    : 'Results-oriented registered nurse with ' + exp + ' year' + (exp !== 1 ? 's' : '') + ' of progressive clinical experience'
      + (specs.length ? ', specializing in ' + specs.join(', ') : '')
      + '. Proven ability to deliver compassionate, high-quality patient-centered care while maintaining strict adherence to clinical protocols and interdisciplinary team collaboration.';

  var contactItems = [];
  if (city)     contactItems.push(city);
  if (email)    contactItems.push('<a href="mailto:' + email + '">' + email + '</a>');
  if (phone)    contactItems.push(phone);
  if (linkedin) contactItems.push('<a href="https://' + linkedin.replace('https://','') + '">' + linkedin + '</a>');

  var specsLine = specs.length ? specs.join(' | ') : '';
  var titleLine = 'Registered Nurse' + (specsLine ? ' | ' + specsLine : '');

  var certHtml = '';
  if (certs.length) {
    certHtml = '<h2>CERTIFICATIONS</h2><ul>' + certs.map(function(c){ return '<li>' + c + '</li>'; }).join('') + '</ul>';
  }

  // Work experiences from DB
  var workExps = p._workExps || [];

  // Build experience bullets - use real work history if available, else generic
  var expBullets = [
    'Provide comprehensive nursing care including patient assessment, care planning, and implementation of evidence-based interventions.',
    'Administer medications and treatments in accordance with physician orders and clinical protocols.',
    'Collaborate with multidisciplinary teams to ensure optimal patient outcomes and continuity of care.',
    'Maintain accurate and thorough clinical documentation in compliance with regulatory standards.',
  ];
  if (specs.length) expBullets.push('Apply specialized expertise in ' + specs.join(', ') + ' to address complex patient needs.');

  // Build work experience HTML blocks
  var workExpHtml = '';
  if (workExps.length > 0) {
    workExpHtml = workExps.map(function(we) {
      var yr = we.years_worked;
      var endYear = new Date().getFullYear();
      var startYear = Math.round(endYear - yr);
      return [
        '<div style="margin-bottom:10px">',
        '<div class="job-header">',
        '<span class="job-title">' + (we.job_title || 'Registered Nurse') + '</span>',
        '<span class="job-date">' + startYear + ' – ' + endYear + '</span>',
        '</div>',
        '<div class="job-company">' + we.workplace_name + '</div>',
        '</div>',
      ].join('');
    }).join('');
  } else {
    // fallback generic
    workExpHtml = [
      '<div class="job-header"><span class="job-title">Registered Nurse</span><span class="job-date">' + expFrom + ' – Present</span></div>',
      '<div class="job-company">' + (city ? 'Clinical Facility, ' + city : 'Clinical Practice') + '</div>',
    ].join('');
  }

  // Visual variant work exp HTML
  var workExpVisHtml = '';
  if (workExps.length > 0) {
    workExpVisHtml = workExps.map(function(we) {
      var yr = we.years_worked;
      var endYear = new Date().getFullYear();
      var startYear = Math.round(endYear - yr);
      return [
        '<div class="exp-row"><span class="exp-jobtitle">' + (we.job_title || 'Registered Nurse') + '</span>',
        '<span class="exp-date">' + startYear + ' &ndash; ' + endYear + '</span></div>',
        '<div class="exp-company">' + we.workplace_name + '</div>',
      ].join('');
    }).join('<div style="margin-bottom:8px"></div>');
  } else {
    workExpVisHtml = [
      '<div class="exp-row"><span class="exp-jobtitle">Registered Nurse</span><span class="exp-date">' + expFrom + ' &ndash; Present</span></div>',
      '<div class="exp-company">' + (city ? 'Clinical Facility &mdash; ' + city : 'Clinical Practice') + '</div>',
    ].join('');
  }

  var skillLines = [
    'Patient Assessment & Care Planning, Medication Administration, Wound Care Management',
    'Emergency Response, Infection Control & Prevention, Clinical Documentation',
  ];
  if (specs.length) skillLines.push('Specializations: ' + specs.join(', '));

  var atsStyles = '\
    body { font-family: "Times New Roman", Times, serif; font-size: 11pt; color: #000; margin: 0; padding: 0; }\
    .page { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 18mm 18mm 12mm; box-sizing: border-box; }\
    .name { font-size: 22pt; font-weight: 900; text-align: center; letter-spacing: 1px; margin-bottom: 4px; text-transform: uppercase; }\
    .title { font-size: 11pt; font-weight: bold; text-align: center; margin-bottom: 4px; color: #222; }\
    .contact { text-align: center; font-size: 9.5pt; color: #333; margin-bottom: 6px; }\
    .contact a { color: #333; text-decoration: none; }\
    hr.thick { border: none; border-top: 1.2px solid #000; margin: 6px 0 10px; }\
    h2 { font-size: 12pt; font-weight: 900; text-transform: uppercase; margin: 14px 0 0; letter-spacing: 0.5px; }\
    hr.thin { border: none; border-top: 0.5px solid #000; margin: 3px 0 8px; }\
    p { margin: 0 0 8px; line-height: 1.45; }\
    .job-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 2px; }\
    .job-title { font-weight: bold; font-size: 11.5pt; }\
    .job-date { font-size: 9.5pt; color: #444; }\
    .job-company { font-size: 9.5pt; color: #333; margin-bottom: 6px; }\
    ul { margin: 4px 0 8px 18px; padding: 0; }\
    li { margin-bottom: 3px; line-height: 1.4; }\
    .edu-header { display: flex; justify-content: space-between; align-items: baseline; }\
    .footer-note { text-align: center; font-size: 7.5pt; color: #aaa; margin-top: 20px; }\
    @media print { @page { size: A4; margin: 0; } body { -webkit-print-color-adjust: exact; } }\
  ';

  var visualStyles = '\
    * { box-sizing: border-box; margin: 0; padding: 0; }\
    body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #222; }\
    .page { width: 210mm; min-height: 297mm; display: flex; }\
    .sidebar { width: 68mm; background: #0a3d62; color: #fff; padding: 0 14px 20px; display: flex; flex-direction: column; }\
    .sidebar-accent { height: 5px; background: #00b894; margin: 0 -14px 0; }\
    .avatar-wrap { text-align: center; margin: 22px 0 10px; }\
    .avatar-circle { width: 72px; height: 72px; border-radius: 50%; background: #fff; border: 2.5px solid #00b894; display: inline-flex; align-items: center; justify-content: center; font-size: 28pt; font-weight: 900; color: #0a3d62; line-height: 1; overflow: hidden; } .avatar-circle img { width: 72px; height: 72px; object-fit: cover; border-radius: 50%; display: block; }\
    .s-name { font-size: 12pt; font-weight: bold; text-align: center; color: #fff; margin-bottom: 3px; line-height: 1.2; }\
    .s-role { font-size: 7.5pt; color: #00b894; text-align: center; letter-spacing: 0.5px; margin-bottom: 16px; }\
    .s-section { font-size: 7.5pt; font-weight: bold; color: #00b894; text-transform: uppercase; letter-spacing: 0.5px; margin: 12px 0 4px; border-bottom: 0.5px solid #00b894; padding-bottom: 3px; }\
    .s-text { font-size: 8pt; color: #d2e4f2; line-height: 1.5; margin-bottom: 2px; word-break: break-all; }\
    .s-text a { color: #d2e4f2; text-decoration: none; }\
    .exp-num { font-size: 30pt; font-weight: 900; color: #fff; line-height: 1; }\
    .exp-sub { font-size: 8pt; color: #aac8dc; }\
    .spec-tag { display: inline-block; background: #004b37; color: #00dc9a; font-size: 7.5pt; border-radius: 3px; padding: 2px 6px; margin: 2px 2px 2px 0; }\
    .shift-brand { margin-top: auto; padding-top: 20px; text-align: center; font-size: 11pt; font-weight: 900; color: #00b894; }\
    .shift-url { font-size: 7pt; color: #507890; text-align: center; }\
    .main { flex: 1; padding: 20px 16px 16px 18px; }\
    .m-section { margin-bottom: 14px; }\
    .m-title-row { display: flex; align-items: center; gap: 7px; margin-bottom: 4px; }\
    .m-bar { width: 3px; height: 18px; background: #00b894; flex-shrink: 0; }\
    .m-title { font-size: 11pt; font-weight: bold; color: #0a3d62; }\
    .m-divider { border: none; border-top: 0.3px solid #dce6ec; margin-bottom: 8px; }\
    .m-body { font-size: 9.5pt; color: #444; line-height: 1.45; }\
    .exp-row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 2px; }\
    .exp-jobtitle { font-size: 10.5pt; font-weight: bold; color: #0a3d62; }\
    .exp-date { font-size: 9pt; color: #666; }\
    .exp-company { font-size: 9pt; color: #666; margin-bottom: 6px; }\
    ul.m-ul { margin: 0 0 0 14px; padding: 0; }\
    ul.m-ul li { font-size: 9pt; color: #333; margin-bottom: 3px; line-height: 1.4; }\
    .skills-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3px 10px; }\
    .skill-item { font-size: 9pt; color: #333; display: flex; align-items: center; gap: 5px; }\
    .skill-dot { width: 5px; height: 5px; border-radius: 50%; background: #00b894; flex-shrink: 0; }\
    .lang-row { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }\
    .lang-name { font-size: 9pt; color: #444; min-width: 120px; }\
    .lang-bar-bg { flex: 1; height: 5px; background: #d5f5ec; border-radius: 3px; overflow: hidden; }\
    .lang-bar-fill { height: 100%; background: #00b894; border-radius: 3px; }\
    .date-stamp { text-align: right; font-size: 7pt; color: #bbb; margin-bottom: 6px; }\
    @media print { @page { size: A4; margin: 0; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }\
  ';

  var atsHtml = '\
    <div class="page">\
      <div class="name">' + name + '</div>\
      <div class="title">' + titleLine + '</div>\
      <div class="contact">' + contactItems.join(' &nbsp;|&nbsp; ') + '</div>\
      <hr class="thick">\
      <h2>PROFESSIONAL SUMMARY</h2><hr class="thin">\
      <p>' + summary + '</p>\
      <h2>WORK EXPERIENCE</h2><hr class="thin">\n      ' + workExpHtml + '<ul>' + expBullets.map(function(b){ return '<li>' + b + '</li>'; }).join('') + '</ul>\n      <h2>EDUCATION</h2><hr class="thin">\
      <div class="edu-header"><span class="job-title">' + degree + '</span>' + (gradYear ? '<span class="job-date">Graduated: ' + gradYear + '</span>' : '') + '</div>\
      <div class="job-company">' + institution + '</div>\
      <h2>SKILLS</h2><hr class="thin">\
      <ul>' + skillLines.map(function(s){ return '<li>' + s + '</li>'; }).join('') + '</ul>\
      ' + certHtml + '\
      <h2>LANGUAGES</h2><hr class="thin">\
      <ul><li>Arabic &mdash; Native Proficiency</li><li>English &mdash; Professional Working Proficiency</li></ul>\
      <div class="footer-note">Generated via Shift Platform &nbsp;&bull;&nbsp; ' + new Date().toLocaleDateString('en-GB') + '</div>\
    </div>\
  ';

  var specTagsHtml = specs.map(function(s){ return '<span class="spec-tag">' + s + '</span>'; }).join('');
  var skillsGridHtml = ['Patient Assessment','Medication Administration','Clinical Documentation','Wound Care Management','Emergency Response','Infection Control','Team Collaboration','Patient Education']
    .map(function(s){ return '<div class="skill-item"><span class="skill-dot"></span>' + s + '</div>'; }).join('');
  var certsHtml = certs.length ? '<div class="s-section">CERTIFICATIONS</div>' + certs.map(function(c){ return '<div class="s-text">• ' + c + '</div>'; }).join('') : '';

  var avatarHtmlForCV = avatarBase64
    ? '<img src="' + avatarBase64 + '" style="width:72px;height:72px;object-fit:cover;border-radius:50%;display:block;" alt="">'
    : '<span>' + name.charAt(0).toUpperCase() + '</span>';

  var specTagsHtml = specs.map(function(s){ return '<span class="spec-tag">' + s + '</span>'; }).join('');
  var certsSideHtml = certs.length
    ? '<div class="s-section">CERTIFICATIONS</div>' + certs.map(function(c){ return '<div class="s-text">• ' + c + '</div>'; }).join('')
    : '';
  var expBulletsVis = [
    'Provide comprehensive nursing care including patient assessment, care planning, and implementation of evidence-based interventions.',
    'Administer medications and treatments in accordance with physician orders and clinical protocols.',
    'Collaborate with multidisciplinary teams to ensure optimal patient outcomes and continuity of care.',
    'Maintain accurate and thorough clinical documentation in compliance with regulatory standards.',
  ];
  if (specs.length) expBulletsVis.push('Apply specialized expertise in ' + specs.join(', ') + ' to address complex patient needs.');
  var skillsGridVis = ['Patient Assessment','Medication Administration','Clinical Documentation','Wound Care Management','Emergency Response','Infection Control','Team Collaboration','Patient Education']
    .map(function(s){ return '<div class="skill-item"><span class="skill-dot"></span>' + s + '</div>'; }).join('');

  var visualHtml = [
    '<div class="page">',
    '  <div class="sidebar">',
    '    <div class="sidebar-accent"></div>',
    '    <div class="avatar-wrap"><div class="avatar-circle">' + avatarHtmlForCV + '</div></div>',
    '    <div class="s-name">' + name + '</div>',
    '    <div class="s-role">REGISTERED NURSE</div>',
    '    <div class="s-section">CONTACT</div>',
    (phone    ? '<div class="s-text">' + phone    + '</div>' : ''),
    (email    ? '<div class="s-text"><a href="mailto:' + email + '">' + email + '</a></div>' : ''),
    (city     ? '<div class="s-text">' + city     + '</div>' : ''),
    (linkedin ? '<div class="s-text"><a href="https://' + linkedin.replace('https://','') + '">' + linkedin + '</a></div>' : ''),
    '    <div class="s-section">EXPERIENCE</div>',
    '    <div class="exp-num">' + exp + '</div>',
    '    <div class="exp-sub">years of nursing</div>',
    (specs.length ? '<div class="s-section">SPECIALIZATIONS</div>' + specTagsHtml : ''),
    certsSideHtml,
    '    <div class="s-section">EDUCATION</div>',
    '    <div class="s-text" style="font-weight:bold;color:#fff">' + degree + '</div>',
    (institution ? '<div class="s-text">' + institution + '</div>' : ''),
    (gradYear    ? '<div class="s-text" style="color:#aac8dc">Graduated: ' + gradYear + '</div>' : ''),
    '    <div class="shift-brand">Shift.</div>',
    '    <div class="shift-url">shift.vercel.app</div>',
    '  </div>',
    '  <div class="main">',
    '    <div class="date-stamp">' + new Date().toLocaleDateString('en-GB') + '</div>',
    '    <div class="m-section">',
    '      <div class="m-title-row"><div class="m-bar"></div><div class="m-title">PROFESSIONAL SUMMARY</div></div>',
    '      <hr class="m-divider">',
    '      <div class="m-body">' + summary + '</div>',
    '    </div>',
    '    <div class="m-section">',
    '      <div class="m-title-row"><div class="m-bar"></div><div class="m-title">WORK EXPERIENCE</div></div>',
    '      <hr class="m-divider">',
    '      ' + workExpVisHtml + '<ul class="m-ul">' + expBulletsVis.map(function(b){ return '<li>' + b + '</li>'; }).join('') + '</ul>\\n    </div>',
    '<div class="m-section">',
    '      <div class="m-title-row"><div class="m-bar"></div><div class="m-title">CORE COMPETENCIES</div></div>',
    '      <hr class="m-divider">',
    '      <div class="skills-grid">' + skillsGridVis + '</div>',
    '    </div>',
    '    <div class="m-section">',
    '      <div class="m-title-row"><div class="m-bar"></div><div class="m-title">LANGUAGES</div></div>',
    '      <hr class="m-divider">',
    '      <div class="lang-row"><span class="lang-name">Arabic &mdash; Native</span><div class="lang-bar-bg"><div class="lang-bar-fill" style="width:100%"></div></div></div>',
    '      <div class="lang-row"><span class="lang-name">English &mdash; Professional</span><div class="lang-bar-bg"><div class="lang-bar-fill" style="width:72%"></div></div></div>',
    '    </div>',
    '  </div>',
    '</div>',
  ].join('\n');

  var chosenStyles = type === 'visual' ? visualStyles : atsStyles;
  var chosenHtml   = type === 'visual' ? visualHtml   : atsHtml;

  var win = window.open('', '_blank', 'width=900,height=700');
  win.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>CV - ' + name + '</title><style>' + chosenStyles + '</style></head><body>' + chosenHtml + '</body></html>');
  win.document.close();
  win.focus();
  setTimeout(function() { win.print(); }, 600);
}

async function downloadNurseCV(nurseId) {
  var btn = event && event.target;
  if (btn) { btn.disabled = true; btn.textContent = '⏳ جاري التحضير...'; }
  var { data, error } = await sb.from('nurses').select('*').eq('id', nurseId).single();
  if (error || !data) { alert('تعذر تحميل بيانات الممرض'); if(btn){btn.disabled=false;} return; }
  var translated = await translateCvData(data);
  var { data: workExps } = await sb.from('work_experiences').select('*').eq('nurse_id', nurseId).order('years_worked', { ascending: false });
  translated._workExps = workExps || [];
  printCV(translated, '', 'ats', null);
  if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-file-pdf"></i> تحميل السيرة الذاتية PDF'; }
}

// ========== JOB DETAIL (Nurse View) ==========
async function openJobDetail(jobId) {
  openModal('jobDetailModal');
  document.getElementById('jobDetailBody').innerHTML = '<div class="loading"><div class="spinner"></div> جاري التحميل...</div>';
  document.getElementById('jobDetailFooter').innerHTML = '';

  const { data: job, error } = await sb
    .from('job_postings')
    .select('*, hospitals(hospital_name, facility_type, city, address, description, avatar_url, phone)')
    .eq('id', jobId)
    .single();

  if (error || !job) {
    document.getElementById('jobDetailBody').innerHTML = '<div class="empty-state"><p>تعذّر تحميل بيانات الوظيفة</p></div>';
    return;
  }

  const h = job.hospitals || {};
  const benefits = job.benefits || [];
  const initials = h.hospital_name?.substring(0, 2) || '🏥';
  const hospitalAvatar = h.avatar_url
    ? `<img src="${h.avatar_url}" style="width:52px;height:52px;border-radius:12px;object-fit:cover;border:2px solid var(--border)">`
    : `<div class="hospital-avatar" style="width:52px;height:52px;font-size:18px">${initials}</div>`;

  // Check if nurse already applied
  var alreadyApplied = false;
  if (currentUser) {
    const { data: app } = await sb.from('applications').select('id').eq('job_id', jobId).eq('nurse_id', currentUser.id).maybeSingle();
    alreadyApplied = !!app;
  }

  // Count accepted so far
  const { data: accepted } = await sb.from('applications').select('id').eq('job_id', jobId).eq('status', 'accepted');
  const acceptedCount = accepted?.length || 0;
  const needed = job.nurses_needed || 1;
  const remaining = Math.max(0, needed - acceptedCount);
  const progressPct = Math.min(100, Math.round((acceptedCount / needed) * 100));

  document.getElementById('jobDetailBody').innerHTML = `
    <!-- Hospital Card -->
    <div class="profile-hero" style="border-radius:var(--radius);margin-bottom:16px;padding:16px 20px">
      <div style="display:flex;align-items:center;gap:14px">
        ${hospitalAvatar}
        <div>
          <div style="font-size:17px;font-weight:800;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,0.2)">${h.hospital_name || 'منشأة طبية'}</div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:4px">
            ${h.facility_type ? `<span style="font-size:11px;background:var(--accent-light);color:var(--primary);padding:2px 8px;border-radius:20px;font-weight:700">${h.facility_type}</span>` : ''}
            ${h.city ? `<span style="font-size:12px;color:var(--text-muted)"><i class="fas fa-map-marker-alt"></i> ${h.city}</span>` : ''}
            ${h.phone ? `<span style="font-size:12px;color:var(--text-muted)"><i class="fas fa-phone"></i> ${h.phone}</span>` : ''}
          </div>
        </div>
      </div>
      ${h.description ? `<div style="margin-top:10px;font-size:13px;color:var(--text-muted);line-height:1.6;border-top:1px solid var(--border);padding-top:10px">${h.description}</div>` : ''}
    </div>

    <!-- Job Title & Badge -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
      <div style="font-size:18px;font-weight:800;color:var(--text)">${job.title}</div>
      ${job.shift_type ? `<div class="job-badge">${job.shift_type}</div>` : ''}
    </div>

    <!-- Meta -->
    <div class="job-meta" style="margin-bottom:12px">
      ${job.specialization ? `<div class="job-meta-item"><i class="fas fa-stethoscope"></i>${job.specialization}</div>` : ''}
      ${job.city ? `<div class="job-meta-item"><i class="fas fa-map-marker-alt"></i>${job.city}</div>` : ''}
    </div>

    <!-- Progress bar -->
    <div style="background:var(--bg);border-radius:var(--radius-sm);padding:12px 14px;margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <span style="font-size:12px;font-weight:700;color:var(--text-muted)"><i class="fas fa-users"></i> الممرضون المطلوبون</span>
        <span style="font-size:13px;font-weight:800;color:${remaining === 0 ? '#ef4444' : 'var(--accent)'}">
          ${remaining === 0 ? 'اكتملت' : remaining + ' متبقي من ' + needed}
        </span>
      </div>
      <div style="background:var(--border);border-radius:4px;height:6px;overflow:hidden">
        <div style="width:${progressPct}%;height:100%;background:${progressPct >= 100 ? '#ef4444' : 'var(--accent)'};border-radius:4px;transition:width 0.4s"></div>
      </div>
    </div>

    <!-- Salary -->
    ${(job.salary_min || job.salary_max) ? `
    <div class="salary-range" style="margin-bottom:12px">
      <span class="salary-label">💰 الراتب</span>
      <span class="salary-amount">${job.salary_min?.toLocaleString() || '?'} - ${job.salary_max?.toLocaleString() || '?'} جنيه</span>
    </div>` : ''}

    <!-- Description -->
    ${job.description ? `
    <div style="background:var(--bg);border-radius:var(--radius-sm);padding:14px;margin-bottom:12px">
      <div style="font-size:13px;font-weight:700;color:var(--text-muted);margin-bottom:6px"><i class="fas fa-info-circle"></i> وصف الوظيفة</div>
      <div style="font-size:13px;line-height:1.7">${job.description}</div>
    </div>` : ''}

    <!-- Requirements -->
    ${job.requirements ? `
    <div style="background:var(--bg);border-radius:var(--radius-sm);padding:14px;margin-bottom:12px">
      <div style="font-size:13px;font-weight:700;color:var(--text-muted);margin-bottom:6px"><i class="fas fa-clipboard-list"></i> المتطلبات</div>
      <div style="font-size:13px;line-height:1.7">${job.requirements}</div>
    </div>` : ''}

    <!-- Benefits -->
    ${benefits.length ? `
    <div style="margin-bottom:8px">
      <div style="font-size:13px;font-weight:700;color:var(--text-muted);margin-bottom:8px"><i class="fas fa-gift"></i> المزايا</div>
      <div class="benefits-list">${benefits.map(b => `<span class="benefit-tag">✓ ${b}</span>`).join('')}</div>
    </div>` : ''}
  `;

  document.getElementById('jobDetailFooter').innerHTML = `
    <div style="display:flex;gap:10px;width:100%;justify-content:center">
      <button class="btn btn-ghost btn-sm" onclick="closeModal('jobDetailModal')">إغلاق</button>
      <button class="btn ${alreadyApplied ? 'btn-ghost' : 'btn-primary'} btn-sm" style="flex:1;max-width:240px"
        ${alreadyApplied || remaining === 0 ? 'disabled' : `onclick="closeModal('jobDetailModal');openApplyModal('${job.id}','${job.title.replace(/'/g,"\\'")}','${(h.hospital_name||'').replace(/'/g,"\\'")}')"`}>
        ${alreadyApplied ? '<i class="fas fa-check"></i> سبق التقديم' : remaining === 0 ? 'اكتملت الوظيفة' : '<i class="fas fa-paper-plane"></i> تقدّم الآن'}
      </button>
    </div>
  `;
}

// ========== EDIT JOB (Hospital View) ==========
var editingJobId = null;

function openEditJob(jobId, job) {
  editingJobId = jobId;
  document.getElementById('editJobTitle').value  = job.title        || '';
  document.getElementById('editJobDesc').value   = job.description  || '';
  document.getElementById('editJobSpec').value   = job.specialization|| '';
  document.getElementById('editJobShift').value  = job.shift_type   || '';
  document.getElementById('editJobSalMin').value = job.salary_min   || '';
  document.getElementById('editJobSalMax').value = job.salary_max   || '';
  document.getElementById('editJobNeeded').value = job.nurses_needed|| 1;
  document.getElementById('editJobReqs').value   = job.requirements || '';
  clearAlert('editJobAlert');
  openModal('editJobModal');
}

async function saveEditJob(e) {
  if (e) e.preventDefault();
  var title  = document.getElementById('editJobTitle').value.trim();
  var desc   = document.getElementById('editJobDesc').value.trim();
  var salMin = parseInt(document.getElementById('editJobSalMin').value);
  var salMax = parseInt(document.getElementById('editJobSalMax').value);
  if (!title || !desc)           return showAlert('editJobAlert', 'عنوان الوظيفة والوصف مطلوبين', 'error');
  if (!salMin || !salMax)        return showAlert('editJobAlert', 'الراتب مطلوب', 'error');
  if (salMin > salMax)           return showAlert('editJobAlert', 'الحد الأدنى للراتب أكبر من الأعلى', 'error');

  var { error } = await sb.from('job_postings').update({
    title,
    description: desc,
    specialization: document.getElementById('editJobSpec').value  || null,
    shift_type:     document.getElementById('editJobShift').value || null,
    salary_min:     salMin,
    salary_max:     salMax,
    nurses_needed:  parseInt(document.getElementById('editJobNeeded').value) || 1,
    requirements:   document.getElementById('editJobReqs').value  || null,
  }).eq('id', editingJobId);

  if (error) return showAlert('editJobAlert', 'حصل خطأ: ' + error.message, 'error');

  editingJobId = null;
  closeModal('editJobModal');
  await loadHospitalJobs();
  loadHospitalStats();
  // show toast
  var t = document.createElement('div');
  t.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:var(--accent);color:white;padding:10px 22px;border-radius:100px;font-weight:700;font-size:13px;z-index:9999;box-shadow:0 4px 20px rgba(0,184,148,0.4)';
  t.innerHTML = '<i class="fas fa-check-circle"></i> تم حفظ التعديلات';
  document.body.appendChild(t);
  setTimeout(function() { t.remove(); }, 2500);
}

// Load job then open edit modal
async function loadAndEditJob(jobId) {
  var { data: job, error } = await sb.from('job_postings').select('*').eq('id', jobId).single();
  if (error || !job) { alert('تعذّر تحميل بيانات الوظيفة'); return; }
  openEditJob(jobId, job);
}
