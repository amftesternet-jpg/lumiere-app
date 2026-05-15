// ═══════════════════════════════════════════════════
// LUMIÈRE — Supabase Integration
// Replace the localStorage DB class in lumiere-app.html
// with this complete Supabase implementation
//
// SETUP:
// 1. Create Supabase project at supabase.com
// 2. Run schema.sql in SQL Editor
// 3. Replace SUPABASE_URL and SUPABASE_ANON_KEY below
// 4. Add <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
//    before your app script
// ═══════════════════════════════════════════════════

// ── CONFIG (replace with your project values) ──
const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co'
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY'

const _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ── AUTH (replaces localStorage fake auth) ──
async function doSignup() {
  const name = v('su-name').trim(), email = v('su-email').trim(), pw = v('su-pw')
  clearAuthAlerts()
  if (!name || !email || !pw) return showAlert('auth-error', 'Please fill in all fields.')
  if (pw.length < 6) return showAlert('auth-error', 'Password must be at least 6 characters.')
  setLoading('btn-signup', true)

  const { data, error } = await _supabase.auth.signUp({
    email,
    password: pw,
    options: { data: { full_name: name } }
  })
  setLoading('btn-signup', false)

  if (error) return showAlert('auth-error', error.message)
  if (data.user && !data.session) {
    showAlert('auth-success', 'Check your email to confirm your account!')
    return
  }
  currentUser = { id: data.user.id, email: data.user.email, name }
  closeModal('modal-auth')
  onLogin(currentUser)
}

async function doLogin() {
  const email = v('li-email').trim(), pw = v('li-pw')
  clearAuthAlerts()
  if (!email || !pw) return showAlert('auth-error', 'Please fill in all fields.')
  setLoading('btn-login', true)

  const { data, error } = await _supabase.auth.signInWithPassword({ email, password: pw })
  setLoading('btn-login', false)

  if (error) return showAlert('auth-error', error.message)
  currentUser = {
    id: data.user.id,
    email: data.user.email,
    name: data.user.user_metadata?.full_name || email.split('@')[0]
  }
  closeModal('modal-auth')
  onLogin(currentUser)
}

async function doLogout() {
  if (!confirm('Log out of Lumière?')) return
  await _supabase.auth.signOut()
  currentUser = null
  stopPoll()
  document.getElementById('nav-user').classList.remove('show')
  document.getElementById('nav-cta').style.display = ''
  showPage('home')
  toast('Logged out successfully')
}

// Listen for auth state changes (handles email confirmation, page refresh)
_supabase.auth.onAuthStateChange((event, session) => {
  if (session?.user && !currentUser) {
    currentUser = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.user_metadata?.full_name || session.user.email.split('@')[0]
    }
    updateNavUser(currentUser)
  } else if (!session && currentUser) {
    currentUser = null
    document.getElementById('nav-user').classList.remove('show')
    document.getElementById('nav-cta').style.display = ''
  }
})

// ── EVENTS (replaces DB.getEvents, DB.saveEvent, etc.) ──
async function doCreateEvent() {
  const name = v('cr-name').trim()
  if (!name) return showAlert('create-error', 'Event name is required.')
  const type = v('cr-type'), date = v('cr-date'), loc = v('cr-loc').trim()
  setLoading('btn-create', true)

  const slug = randStr(10)
  const { data: ev, error } = await _supabase.from('events').insert({
    slug,
    name,
    type,
    date: date || null,
    location: loc || null,
    emoji: { wedding:'💍', birthday:'🎉', party:'🥂', corporate:'🏢', other:'🎊' }[type] || '🎊',
    owner_id: currentUser.id,
    tier: 'free'
  }).select().single()

  setLoading('btn-create', false)
  if (error) return showAlert('create-error', error.message)

  closeModal('modal-create')
  toast('🎉 Event created! QR code is ready.', 'success')
  openEvent(ev)
}

async function loadDashboard() {
  const grid = document.getElementById('events-grid')
  if (!currentUser) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-emoji">🔐</div><div class="empty-title">Sign in to see your events</div><button class="btn btn-gold btn-xl" onclick="openModal('modal-auth')">Sign In</button></div>`
    return
  }

  const { data: events, error } = await _supabase
    .from('events')
    .select('*')
    .eq('owner_id', currentUser.id)
    .order('created_at', { ascending: false })

  if (error || !events) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-title">Error loading events</div><div class="empty-sub">${error?.message}</div></div>`
    return
  }
  if (!events.length) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-emoji">📸</div><div class="empty-title">No events yet</div><div class="empty-sub">Create your first event</div><button class="btn btn-gold btn-xl" onclick="openModal('modal-create')" style="margin-top:1rem">Create First Event →</button></div>`
    return
  }

  // Get photo counts for all events
  const slugs = events.map(e => e.slug)
  const { data: counts } = await _supabase
    .from('photos')
    .select('event_slug, id')
    .in('event_slug', slugs)

  const photoCount = {}
  const guestCount = {}
  ;(counts || []).forEach(p => {
    photoCount[p.event_slug] = (photoCount[p.event_slug] || 0) + 1
  })

  grid.innerHTML = events.map(ev => {
    const photos = photoCount[ev.slug] || 0
    const dateFmt = ev.date ? fmtDate(ev.date) : ''
    return `<div class="ev-card" onclick='openEvent(${JSON.stringify(ev).replace(/'/g,"&#39;")})'>
      <div class="ev-card-cover" style="position:relative">
        <span style="position:relative;z-index:1">${ev.emoji || '🎊'}</span>
        ${photos > 0 ? `<div class="ev-photo-count">📸 ${photos}</div>` : ''}
      </div>
      <div class="ev-card-body">
        <div class="ev-card-type">${(ev.type || 'event').toUpperCase()}</div>
        <div class="ev-card-name">${esc(ev.name)}</div>
        <div class="ev-card-date">${dateFmt}${ev.location ? ' · ' + esc(ev.location) : ''}</div>
        <div class="ev-card-stats">
          <div class="ev-card-stat"><strong>${photos}</strong>Photos</div>
          <div class="ev-card-stat"><strong>${ev.tier === 'free' ? 'Free' : ev.tier === 'pro' ? 'Pro' : 'Elite'}</strong>Plan</div>
        </div>
      </div>
    </div>`
  }).join('')
}

async function refreshGallery() {
  if (!currentEvent) return
  const { data: photos } = await _supabase
    .from('photos')
    .select('*')
    .eq('event_slug', currentEvent.slug)
    .order('created_at', { ascending: false })

  if (!photos) return
  const guestNames = [...new Set(photos.map(p => p.guest_name).filter(Boolean))]
  document.getElementById('stat-photos').textContent = photos.length
  document.getElementById('stat-guests').textContent = guestNames.length
  renderPhotoGrid(photos)
}

// ── REALTIME (replaces 4-second polling) ──
let realtimeChannel = null
function startRealtime() {
  stopRealtime()
  if (!currentEvent) return
  realtimeChannel = _supabase
    .channel('photos:' + currentEvent.slug)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'photos',
      filter: `event_slug=eq.${currentEvent.slug}`
    }, (payload) => {
      toast('📸 New photo added!', 'success')
      refreshGallery()
    })
    .subscribe()
}
function stopRealtime() {
  if (realtimeChannel) {
    _supabase.removeChannel(realtimeChannel)
    realtimeChannel = null
  }
}

// Also do guest page realtime
let guestRealtimeChannel = null
function startGuestRealtime(slug) {
  if (guestRealtimeChannel) _supabase.removeChannel(guestRealtimeChannel)
  guestRealtimeChannel = _supabase
    .channel('guest-photos:' + slug)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'photos',
      filter: `event_slug=eq.${slug}`
    }, () => renderGuestGallery(slug))
    .subscribe()
}

// ── UPLOAD (real Supabase Storage) ──
async function uploadFiles(files, isGuest) {
  const slug = isGuest ? window._guestSlug : currentEvent?.slug
  if (!slug) return
  const guestName = isGuest
    ? (document.getElementById('g-name-input')?.value.trim() || 'Guest')
    : (currentUser?.name || 'Host')

  const progWrap = document.getElementById(isGuest ? 'g-prog-wrap' : 'up-prog-wrap')
  const bar = document.getElementById(isGuest ? 'g-bar' : 'up-bar')
  const txt = document.getElementById(isGuest ? 'g-text' : 'up-text')
  progWrap.classList.add('show')
  let done = 0

  for (const file of files) {
    if (file.size > 20 * 1024 * 1024) { toast('File too large (max 20MB)', 'error'); continue }
    txt.textContent = `Uploading ${file.name}… (${done + 1}/${files.length})`

    try {
      // Compress if needed
      let pFile = file
      if (file.size > 400 * 1024 && typeof compressImage === 'function') {
        try { pFile = await compressImage(file) } catch (e) {}
      }

      // Upload to Supabase Storage
      const path = `${slug}/${Date.now()}_${pFile.name.replace(/[^a-z0-9.]/gi, '_')}`
      const { data: storageData, error: storageErr } = await _supabase.storage
        .from('event-photos')
        .upload(path, pFile, { cacheControl: '3600', upsert: false })

      if (storageErr) throw new Error(storageErr.message)

      // Get public URL
      const { data: { publicUrl } } = _supabase.storage.from('event-photos').getPublicUrl(path)

      // Insert record into photos table
      const { error: dbErr } = await _supabase.from('photos').insert({
        event_slug: slug,
        guest_name: guestName,
        storage_path: path,
        url: publicUrl,
        mime_type: pFile.type,
        file_size: pFile.size
      })

      if (dbErr) throw new Error(dbErr.message)

      done++
      bar.style.width = `${(done / files.length) * 100}%`

      // Gallery updates via realtime subscription (no need to manually refresh)
      if (!isGuest) refreshGallery()  // Still refresh for host view
    } catch (e) {
      toast('Upload failed: ' + e.message, 'error')
    }
  }

  progWrap.classList.remove('show')
  bar.style.width = '0%'
  txt.textContent = ''
  if (done) toast(`✅ ${done} photo${done === 1 ? '' : 's'} uploaded!`, 'success')
}

// ── GUEST PAGE (real data) ──
async function loadGuestPage(slug) {
  window._guestSlug = slug
  const { data: ev, error } = await _supabase
    .from('events')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error || !ev) {
    document.getElementById('g-name').textContent = 'Event not found'
    document.getElementById('g-date').textContent = 'This link may be invalid.'
    return
  }

  document.getElementById('g-emoji').textContent = ev.emoji || '🎊'
  document.getElementById('g-name').textContent = ev.name
  const dateFmt = ev.date ? fmtDate(ev.date, true) : ''
  document.getElementById('g-date').textContent = [dateFmt, ev.location].filter(Boolean).join(' · ')

  await renderGuestGallery(slug)
  startGuestRealtime(slug)
}

async function renderGuestGallery(slug) {
  const { data: photos } = await _supabase
    .from('photos')
    .select('*')
    .eq('event_slug', slug)
    .order('created_at', { ascending: false })

  const gallery = document.getElementById('guest-gallery')
  if (!gallery) return
  gallery.innerHTML = (photos || []).length
    ? photos.map(p => `
      <div class="guest-photo" onclick="openLB('${p.url.replace(/'/g, "\\'")}')">
        <img src="${p.url}?width=300&quality=75" alt="${esc(p.guest_name || '')}" loading="lazy">
        ${p.guest_name ? `<div class="guest-photo-name">${esc(p.guest_name)}</div>` : ''}
      </div>`).join('')
    : '<div style="grid-column:1/-1;text-align:center;padding:2rem;color:var(--color-text-secondary);font-size:.85rem">No photos yet — be the first! 📸</div>'
}

// ── DELETE ──
async function delPhoto(id) {
  if (!currentEvent || !confirm('Delete this photo?')) return
  const { error } = await _supabase.from('photos').delete().eq('id', id)
  if (error) { toast('Delete failed: ' + error.message, 'error'); return }
  refreshGallery()
  toast('Photo deleted')
}

// ── STRIPE CHECKOUT ──
async function upgradeTier(tier) {
  if (!currentEvent || !currentUser) return
  toast('Redirecting to checkout…')
  try {
    const { data: { session: { access_token } } } = await _supabase.auth.getSession()
    const res = await fetch(`${SUPABASE_URL}/functions/v1/create-checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${access_token}` },
      body: JSON.stringify({ event_slug: currentEvent.slug, tier })
    })
    const { url, error } = await res.json()
    if (error) throw new Error(error)
    window.location.href = url
  } catch (e) {
    toast('Checkout error: ' + e.message, 'error')
  }
}

// ── EMAIL INVITE ──
async function sendEmailInvite(toEmail, qrDataUrl) {
  if (!currentEvent) return
  const { data: { session: { access_token } } } = await _supabase.auth.getSession()
  const res = await fetch(`${SUPABASE_URL}/functions/v1/send-invite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${access_token}` },
    body: JSON.stringify({
      to: toEmail,
      event_name: currentEvent.name,
      event_date: currentEvent.date ? fmtDate(currentEvent.date, true) : '',
      event_location: currentEvent.location || '',
      guest_link: guestUrl(currentEvent.slug),
      qr_data_url: qrDataUrl
    })
  })
  const { sent, error } = await res.json()
  if (error) { toast('Email failed: ' + error, 'error'); return }
  toast('Invitation sent! ✉️', 'success')
}

// ── INIT ──
async function initApp() {
  const { data: { session } } = await _supabase.auth.getSession()
  if (session?.user) {
    currentUser = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.user_metadata?.full_name || session.user.email.split('@')[0]
    }
    updateNavUser(currentUser)
  }
  checkRoute()
}
