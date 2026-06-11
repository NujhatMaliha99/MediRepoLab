const API_BASE = 'http://127.0.0.1:4000/api';

const state = {
  token: localStorage.getItem('medrepro_admin_token') || '',
  user: JSON.parse(localStorage.getItem('medrepro_admin_user') || 'null'),
  status: '',
  requests: [],
};

const els = {
  loginPanel: document.getElementById('loginPanel'),
  adminPanel: document.getElementById('adminPanel'),
  loginForm: document.getElementById('loginForm'),
  email: document.getElementById('email'),
  password: document.getElementById('password'),
  loginError: document.getElementById('loginError'),
  adminName: document.getElementById('adminName'),
  logoutButton: document.getElementById('logoutButton'),
  refreshButton: document.getElementById('refreshButton'),
  requests: document.getElementById('requests'),
  notice: document.getElementById('notice'),
  viewSubtitle: document.getElementById('viewSubtitle'),
  totalCount: document.getElementById('totalCount'),
  pendingCount: document.getElementById('pendingCount'),
  approvedCount: document.getElementById('approvedCount'),
  deniedCount: document.getElementById('deniedCount'),
  navItems: Array.from(document.querySelectorAll('.nav-item')),
};

const apiFetch = async (path, options = {}) => {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Request failed');
  return data;
};

const formatDate = value => (
  value ? new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }) : 'No date'
);

const showNotice = message => {
  els.notice.textContent = message;
  els.notice.classList.toggle('hidden', !message);
};

const setAuthenticated = isAuthenticated => {
  els.loginPanel.classList.toggle('hidden', isAuthenticated);
  els.adminPanel.classList.toggle('hidden', !isAuthenticated);
  if (state.user) els.adminName.textContent = state.user.name || 'Admin';
};

const updateStats = () => {
  els.totalCount.textContent = state.requests.length;
  els.pendingCount.textContent = state.requests.filter(item => item.status === 'pending').length;
  els.approvedCount.textContent = state.requests.filter(item => item.status === 'approved').length;
  els.deniedCount.textContent = state.requests.filter(item => item.status === 'denied').length;
};

const renderRequests = () => {
  updateStats();

  if (!state.requests.length) {
    els.requests.innerHTML = '<div class="notice">No review requests found for this filter.</div>';
    return;
  }

  els.requests.innerHTML = state.requests.map(request => `
    <article class="request-card" data-id="${request._id}">
      <div class="request-header">
        <div>
          <div class="badges">
            <span class="badge ${request.status}">${request.status}</span>
            <span class="badge">${request.targetType || 'experiment'} review</span>
            <span class="badge">${request.project?.title || 'Project'}</span>
          </div>
          <div class="request-title">${request.targetType === 'project' ? request.project?.title || 'Project' : request.experiment?.name || 'Experiment'}</div>
          <div class="meta">
            ${request.targetType === 'project' ? 'Full project workspace' : request.experiment?.modelName || 'Model pending'} |
            ${request.project?.cancerType || 'Research area'} |
            Requested by ${request.requester?.name || 'Researcher'} on ${formatDate(request.createdAt)}
          </div>
        </div>
        ${request.status === 'pending' ? `
          <div class="request-actions">
            <button class="approve" data-action="approved" data-id="${request._id}">Approve</button>
            <button class="danger" data-action="denied" data-id="${request._id}">Deny</button>
          </div>
        ` : ''}
      </div>
      <p class="message">${request.message || 'No request message provided.'}</p>
      ${request.decisionNote ? `<p class="message"><strong>Decision note:</strong> ${request.decisionNote}</p>` : ''}
    </article>
  `).join('');
};

const fetchRequests = async () => {
  showNotice('Loading research review requests...');
  try {
    const query = state.status ? `?status=${state.status}` : '';
    state.requests = await apiFetch(`/review-requests${query}`);
    showNotice('');
    els.viewSubtitle.textContent = 'Approve or deny submitted research experiments and projects.';
    renderRequests();
  } catch (error) {
    showNotice(error.message);
    if (error.message.toLowerCase().includes('not authorized')) logout();
  }
};

const login = async event => {
  event.preventDefault();
  els.loginError.textContent = '';

  try {
    const user = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: els.email.value,
        password: els.password.value,
      }),
    });

    if (user.role !== 'admin') {
      throw new Error('This portal is only for admin accounts.');
    }

    state.token = user.token;
    state.user = user;
    localStorage.setItem('medrepro_admin_token', user.token);
    localStorage.setItem('medrepro_admin_user', JSON.stringify(user));
    setAuthenticated(true);
    fetchRequests();
  } catch (error) {
    els.loginError.textContent = error.message;
  }
};

const logout = () => {
  state.token = '';
  state.user = null;
  state.requests = [];
  localStorage.removeItem('medrepro_admin_token');
  localStorage.removeItem('medrepro_admin_user');
  setAuthenticated(false);
};

const decide = async (id, decision) => {
  const defaultNote = decision === 'approved'
    ? 'Approved for research documentation.'
    : 'Denied pending stronger research documentation.';
  const decisionNote = window.prompt('Decision note', defaultNote);
  if (decisionNote === null) return;

  showNotice(`Saving ${decision} decision...`);
  try {
    await apiFetch(`/review-requests/${id}/decision`, {
      method: 'PATCH',
      body: JSON.stringify({ decision, decisionNote }),
    });
    await fetchRequests();
  } catch (error) {
    showNotice(error.message);
  }
};

els.loginForm.addEventListener('submit', login);
els.logoutButton.addEventListener('click', logout);
els.refreshButton.addEventListener('click', fetchRequests);

els.navItems.forEach(item => {
  item.addEventListener('click', () => {
    state.status = item.dataset.status || '';
    els.navItems.forEach(nav => nav.classList.toggle('active', nav === item));
    fetchRequests();
  });
});

els.requests.addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  decide(button.dataset.id, button.dataset.action);
});

if (state.token && state.user?.role === 'admin') {
  setAuthenticated(true);
  fetchRequests();
} else {
  setAuthenticated(false);
}
