// js/pages/jobs.js
import { appStore } from '../store.js';
import { renderHeader, renderFooter, setupHeaderEvents } from '../components.js';
import { supabase } from '../supabase.js';

// ── Session helper ────────────────────────────────────────────────────────────
function getSession() {
  try { return JSON.parse(localStorage.getItem('al_session')) || null; }
  catch { return null; }
}

// ── Page init ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('app-header').innerHTML = renderHeader('jobs');
  document.getElementById('app-footer').innerHTML = renderFooter();
  setupHeaderEvents();

  // Initial render
  await renderJobs();

  // Filter listeners
  document.getElementById('jobs-search-input')?.addEventListener('input', renderJobs);
  document.getElementById('jobs-type-filter')?.addEventListener('change', renderJobs);

  // Post Job modal
  const postModal   = document.getElementById('post-job-modal');
  const postForm    = document.getElementById('post-job-form');
  const loginNotice = document.getElementById('post-login-notice');

  document.getElementById('open-post-job-modal-btn')?.addEventListener('click', () => {
    const session = getSession();

    // Show form or login notice based on session
    if (session) {
      postForm.classList.remove('hidden');
      loginNotice.classList.add('hidden');
    } else {
      postForm.classList.add('hidden');
      loginNotice.classList.remove('hidden');
    }
    postModal.classList.remove('hidden');
  });

  document.getElementById('close-post-job-modal-btn')?.addEventListener('click', () => {
    postModal.classList.add('hidden');
    resetPostForm();
  });

  // Job detail modal close (backdrop)
  document.getElementById('job-detail-modal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
      e.currentTarget.classList.add('hidden');
    }
  });

  // Post Job form submit
  if (postForm) {
    postForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const session = getSession();
      if (!session) {
        appStore.showToast('Please sign in to post a job.', 'error');
        return;
      }

      const errEl   = document.getElementById('job-form-error');
      const submitBtn = document.getElementById('job-submit-btn');
      errEl.classList.add('hidden');

      const title      = document.getElementById('job-title-input').value.trim();
      const company    = document.getElementById('job-company-input').value.trim();
      const location   = document.getElementById('job-location-input').value.trim();
      const jobType    = document.getElementById('job-type-input').value;
      const salary     = document.getElementById('job-salary-input').value.trim();
      const applyLink  = document.getElementById('job-url-input').value.trim();
      const deadline   = document.getElementById('job-deadline-input').value.trim();
      const reqsStr    = document.getElementById('job-reqs-input').value;
      const description = document.getElementById('job-desc-input').value.trim();

      if (!title)      { showFormError(errEl, 'Job title is required.'); return; }
      if (!company)    { showFormError(errEl, 'Company name is required.'); return; }
      if (!location)   { showFormError(errEl, 'Location is required.'); return; }
      if (!applyLink)  { showFormError(errEl, 'Application URL is required.'); return; }
      if (!description){ showFormError(errEl, 'Job description is required.'); return; }

      const requirements = reqsStr.split(',').map((r) => r.trim()).filter(Boolean);

      submitBtn.disabled    = true;
      submitBtn.textContent = 'Submitting…';

      const { error } = await supabase
        .from('jobs')
        .insert({
          title,
          company,
          description,
          apply_link:   applyLink,
          posted_by_id: session.id,
          location,
          job_type:     jobType,
          salary:       salary || null,
          deadline:     deadline || null,
          requirements,
          is_active:    false,   // pending admin approval
        });

      if (error) {
        showFormError(errEl, 'Failed to submit: ' + error.message);
        submitBtn.disabled    = false;
        submitBtn.textContent = 'Submit for Admin Approval';
        return;
      }

      appStore.showToast('Job submitted! It will appear after admin approval.', 'success');
      postForm.reset();
      postModal.classList.add('hidden');

      submitBtn.disabled    = false;
      submitBtn.textContent = 'Submit for Admin Approval';
    });
  }
});

// ── Render jobs grid ──────────────────────────────────────────────────────────
async function renderJobs() {
  const container = document.getElementById('jobs-grid');
  if (!container) return;

  const query      = document.getElementById('jobs-search-input')?.value.toLowerCase() || '';
  const typeFilter = document.getElementById('jobs-type-filter')?.value || '';

  // Fetch only admin-approved jobs
  let dbQuery = supabase
    .from('jobs')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (typeFilter) dbQuery = dbQuery.eq('job_type', typeFilter);

  const { data: jobs, error } = await dbQuery;

  if (error) {
    container.innerHTML = `
      <div class="col-span-full text-center text-xs text-red-500 py-8">
        Failed to load jobs: ${error.message}
      </div>`;
    return;
  }

  // Client-side search filter
  const filtered = (jobs || []).filter((job) => {
    if (!query) return true;
    return [job.title, job.company, job.location || '']
      .join(' ').toLowerCase().includes(query);
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="col-span-full text-center py-16 bg-white dark:bg-gray-900 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800 p-8 space-y-4">
        <div class="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
          <span class="material-symbols-outlined text-3xl">work_off</span>
        </div>
        <div class="space-y-1">
          <h3 class="text-base font-bold text-gray-900 dark:text-white font-headline">No Active Jobs Found</h3>
          <p class="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto font-medium">
            ${query ? 'Try adjusting your search or filters.' : 'Be the first to post a new job vacancy!'}
          </p>
        </div>
      </div>`;
    return;
  }

  container.innerHTML = filtered.map((job) => {
    const reqs      = Array.isArray(job.requirements) ? job.requirements : [];
    const jobType   = job.job_type || 'Full-time';
    const location  = job.location || 'Bangladesh';
    const salary    = job.salary   || 'Negotiable';
    const deadline  = job.deadline || 'Open';
    const postedDate = new Date(job.created_at).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    });

    return `
      <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-4">
        <div class="space-y-3">
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-start gap-3 min-w-0">
              <!-- Company initial avatar -->
              <div class="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-extrabold text-lg flex-shrink-0 border border-emerald-100 dark:border-emerald-900/50">
                ${job.company.charAt(0).toUpperCase()}
              </div>
              <div class="min-w-0">
                <span class="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold uppercase">
                  ${jobType}
                </span>
                <h3 class="text-base font-bold text-gray-900 dark:text-white font-headline mt-1 line-clamp-1">${job.title}</h3>
                <p class="text-xs font-semibold text-gray-600 dark:text-gray-300 truncate">${job.company} · ${location}</p>
              </div>
            </div>

            <!-- 3-dot menu -->
            <div class="relative flex-shrink-0">
              <button class="job-3dot-btn p-1.5 rounded-xl text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                data-id="${job.id}">
                <span class="material-symbols-outlined text-lg">more_vert</span>
              </button>
              <div id="job-menu-${job.id}" class="job-menu-dropdown hidden absolute right-0 top-9 z-30 w-48 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xl py-1.5 text-xs font-semibold">
                <button class="view-job-btn w-full flex items-center gap-2.5 px-3.5 py-2 text-gray-700 dark:text-gray-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-600"
                  data-id="${job.id}">
                  <span class="material-symbols-outlined text-base">info</span> View Details
                </button>
                <a href="${job.apply_link}" target="_blank" rel="noopener noreferrer"
                  class="flex items-center gap-2.5 px-3.5 py-2 text-gray-700 dark:text-gray-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-600">
                  <span class="material-symbols-outlined text-base">open_in_new</span> Apply Externally
                </a>
                <button class="share-job-btn w-full flex items-center gap-2.5 px-3.5 py-2 text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600"
                  data-id="${job.id}">
                  <span class="material-symbols-outlined text-base">share</span> Share Job
                </button>
              </div>
            </div>
          </div>

          <p class="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">${job.description}</p>

          <!-- Requirements tags -->
          ${reqs.length ? `
            <div class="flex flex-wrap gap-1">
              ${reqs.slice(0, 4).map((r) => `
                <span class="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-[10px] text-gray-600 dark:text-gray-300">• ${r}</span>
              `).join('')}
              ${reqs.length > 4 ? `<span class="text-[10px] text-gray-400">+${reqs.length - 4} more</span>` : ''}
            </div>
          ` : ''}
        </div>

        <div class="border-t border-gray-100 dark:border-gray-800 pt-4 flex items-center justify-between gap-3 flex-wrap">
          <div class="space-y-0.5">
            <div class="text-xs font-bold text-gray-900 dark:text-white">${salary}</div>
            <div class="text-[10px] text-gray-400 flex items-center gap-1">
              <span class="material-symbols-outlined text-xs">schedule</span>
              Deadline: ${deadline}
            </div>
            <div class="text-[10px] text-gray-400">Posted: ${postedDate}</div>
          </div>
          <button class="view-job-btn px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition-all text-xs flex items-center gap-1"
            data-id="${job.id}">
            <span class="material-symbols-outlined text-sm">visibility</span>
            View Details
          </button>
        </div>
      </div>`;
  }).join('');

  // ── Event listeners ───────────────────────────────────────────────────────

  // 3-dot toggle
  document.querySelectorAll('.job-3dot-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id   = btn.getAttribute('data-id');
      const menu = document.getElementById(`job-menu-${id}`);
      document.querySelectorAll('.job-menu-dropdown').forEach((m) => { if (m !== menu) m.classList.add('hidden'); });
      menu?.classList.toggle('hidden');
    });
  });

  // Close dropdowns on outside click
  document.addEventListener('click', () => {
    document.querySelectorAll('.job-menu-dropdown').forEach((m) => m.classList.add('hidden'));
  });

  // View details
  document.querySelectorAll('.view-job-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id  = btn.getAttribute('data-id');
      const job = filtered.find((j) => String(j.id) === String(id));
      if (job) openJobDetail(job);
    });
  });

  // Share
  document.querySelectorAll('.share-job-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id  = btn.getAttribute('data-id');
      const url = `${window.location.origin}/jobs.html?jobId=${id}`;
      navigator.clipboard.writeText(url)
        .then(() => appStore.showToast('Job link copied!', 'success'))
        .catch(() => appStore.showToast('Link: ' + url, 'info'));
    });
  });
}

// ── Job detail modal ──────────────────────────────────────────────────────────
function openJobDetail(job) {
  const modal     = document.getElementById('job-detail-modal');
  const container = document.getElementById('job-detail-content');
  const reqs      = Array.isArray(job.requirements) ? job.requirements : [];
  const jobType   = job.job_type  || 'Full-time';
  const location  = job.location  || 'Bangladesh';
  const salary    = job.salary    || 'Negotiable';
  const deadline  = job.deadline  || 'Open';

  container.innerHTML = `
    <div class="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
      <div class="flex flex-wrap items-center gap-2">
        <span class="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 text-xs font-bold uppercase">${jobType}</span>
        <span class="text-xs text-gray-400">Deadline: ${deadline}</span>
      </div>
      <button id="close-job-modal-btn" class="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 flex-shrink-0">
        <span class="material-symbols-outlined text-xl">close</span>
      </button>
    </div>

    <div class="flex items-start gap-4">
      <div class="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 font-extrabold text-2xl border border-emerald-100 dark:border-emerald-900/50 flex-shrink-0">
        ${job.company.charAt(0).toUpperCase()}
      </div>
      <div class="min-w-0">
        <h2 class="text-xl font-bold text-gray-900 dark:text-white font-headline break-words">${job.title}</h2>
        <p class="text-sm font-bold text-emerald-600 dark:text-emerald-400">${job.company}</p>
        <p class="text-xs text-gray-500">${location} · ${salary}</p>
      </div>
    </div>

    <div class="space-y-2 text-xs">
      <h4 class="font-bold text-gray-900 dark:text-white uppercase tracking-wider text-[11px]">Job Description</h4>
      <p class="text-gray-600 dark:text-gray-300 leading-relaxed">${job.description}</p>
    </div>

    ${reqs.length ? `
      <div class="space-y-2 text-xs">
        <h4 class="font-bold text-gray-900 dark:text-white uppercase tracking-wider text-[11px]">Requirements</h4>
        <ul class="space-y-1 text-gray-600 dark:text-gray-300">
          ${reqs.map((r) => `<li class="flex items-start gap-2"><span class="text-emerald-500 flex-shrink-0">•</span>${r}</li>`).join('')}
        </ul>
      </div>
    ` : ''}

    <div class="pt-4 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
      <div class="text-xs text-gray-400">
        Posted: ${new Date(job.created_at).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })}
      </div>
      <a href="${job.apply_link}" target="_blank" rel="noopener noreferrer"
        class="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-2">
        Apply Now
        <span class="material-symbols-outlined text-sm">open_in_new</span>
      </a>
    </div>
  `;

  modal.classList.remove('hidden');
  document.getElementById('close-job-modal-btn')?.addEventListener('click', () => {
    modal.classList.add('hidden');
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function showFormError(el, msg) {
  el.textContent = msg;
  el.classList.remove('hidden');
}

function resetPostForm() {
  document.getElementById('post-job-form')?.reset();
  document.getElementById('job-form-error')?.classList.add('hidden');
  const submitBtn = document.getElementById('job-submit-btn');
  if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Submit for Admin Approval'; }
}