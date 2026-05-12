// State
let allDaycares = [];
let filteredDaycares = [];
let currentView = 'grid';
let currentSort = { column: 'name', direction: 'asc' };

// DOM Elements
const searchInput = document.getElementById('search-input');
const viewGridBtn = document.getElementById('view-grid');
const viewListBtn = document.getElementById('view-list');
const townSelect = document.getElementById('town-select');
const tuitionMaxSelect = document.getElementById('tuition-max');
const filterInfants = document.getElementById('filter-infants');
const filterToddlers = document.getElementById('filter-toddlers');
const filterPreschool = document.getElementById('filter-preschool');
const filterFulltime = document.getElementById('filter-fulltime');
const filterParttime = document.getElementById('filter-parttime');
const filterHomebased = document.getElementById('filter-homebased');
const filterSubsidy = document.getElementById('filter-subsidy');
const filterYearround = document.getElementById('filter-yearround');
const filterNowaitlist = document.getElementById('filter-nowaitlist');
const clearFiltersBtn = document.getElementById('clear-filters');
const clearFiltersAltBtn = document.getElementById('clear-filters-alt');
const resultsCount = document.getElementById('results-count');
const daycaresGrid = document.getElementById('daycares-grid');
const noResults = document.getElementById('no-results');
const loading = document.getElementById('loading');
const lastUpdated = document.getElementById('last-updated');
const suggestBtn = document.getElementById('suggest-btn');
const suggestForm = document.getElementById('suggest-form');
const footerSuggest = document.getElementById('footer-suggest');
const modal = document.getElementById('daycare-modal');
const modalBody = document.getElementById('modal-body');
const modalClose = document.querySelector('.modal-close');
const modalBackdrop = document.querySelector('.modal-backdrop');

async function init() {
    try {
        const data = await fetch('data/daycares.json').then(r => r.json());
        allDaycares = data.daycares || [];

        if (data.lastUpdated) {
            lastUpdated.textContent = data.lastUpdated;
        }

        populateTowns();
        applyFilters();
        loading.style.display = 'none';
        setupEventListeners();
    } catch (error) {
        console.error('Failed to load data:', error);
        loading.innerHTML = '<p>Failed to load daycare data. Please try refreshing the page.</p>';
    }
}

function populateTowns() {
    const towns = new Set();
    allDaycares.forEach(d => { if (d.location?.town) towns.add(d.location.town); });
    Array.from(towns).sort().forEach(town => {
        const option = document.createElement('option');
        option.value = town;
        option.textContent = town;
        townSelect.appendChild(option);
    });
}

function setupEventListeners() {
    let searchTimeout;
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(applyFilters, 300);
    });

    [townSelect, tuitionMaxSelect].forEach(el => el.addEventListener('change', applyFilters));

    [filterInfants, filterToddlers, filterPreschool, filterFulltime, filterParttime,
        filterHomebased, filterSubsidy, filterYearround, filterNowaitlist
    ].forEach(el => el.addEventListener('change', applyFilters));

    clearFiltersBtn.addEventListener('click', clearFilters);
    clearFiltersAltBtn?.addEventListener('click', clearFilters);

    suggestBtn.addEventListener('click', (e) => {
        e.preventDefault();
        suggestForm.style.display = suggestForm.style.display === 'none' ? 'block' : 'none';
        if (suggestForm.style.display === 'block') suggestForm.scrollIntoView({ behavior: 'smooth' });
    });

    footerSuggest?.addEventListener('click', (e) => {
        e.preventDefault();
        suggestForm.style.display = 'block';
        suggestForm.scrollIntoView({ behavior: 'smooth' });
    });

    modalClose.addEventListener('click', closeModal);
    modalBackdrop.addEventListener('click', closeModal);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display !== 'none') closeModal();
    });

    viewGridBtn?.addEventListener('click', () => setView('grid'));
    viewListBtn?.addEventListener('click', () => setView('list'));

    document.querySelectorAll('th.sortable').forEach(th => {
        th.addEventListener('click', () => handleSort(th.dataset.sort));
    });

    daycaresGrid.addEventListener('click', (e) => {
        const btn = e.target.closest('.daycare-title-btn');
        if (btn) {
            const d = allDaycares.find(x => x.id === btn.dataset.daycareId);
            if (d) openModal(d);
        }
    });
}

function applyFilters() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const town = townSelect.value;
    const tuitionMax = tuitionMaxSelect.value ? parseInt(tuitionMaxSelect.value) : null;

    filteredDaycares = allDaycares.filter(d => {
        if (searchTerm) {
            const searchable = [d.name, d.organization, d.description, d.location?.town]
                .filter(Boolean).join(' ').toLowerCase();
            if (!searchable.includes(searchTerm)) return false;
        }

        if (town && d.location?.town !== town) return false;

        if (tuitionMax !== null) {
            const monthly = d.tuition?.perMonth || (d.tuition?.perWeek ? d.tuition.perWeek * 4.33 : null);
            if (!monthly || monthly > tuitionMax) return false;
        }

        // Age group filters — daycare must serve children in the selected age range
        if (filterInfants.checked) {
            // Must accept at least some infants (minMonths <= 12)
            if (d.ages?.minMonths == null || d.ages.minMonths > 12) return false;
        }
        if (filterToddlers.checked) {
            // Must accept 1–3yr olds: minMonths <= 36 and maxYears >= 1
            if (d.ages?.minMonths == null || d.ages.minMonths > 36) return false;
            if (d.ages?.maxYears == null || d.ages.maxYears < 1) return false;
        }
        if (filterPreschool.checked) {
            // Must accept 3–5yr olds: maxYears >= 3
            if (d.ages?.maxYears == null || d.ages.maxYears < 3) return false;
        }

        if (filterFulltime.checked && d.schedule !== 'full-time' && d.schedule !== 'both') return false;
        if (filterParttime.checked && d.schedule !== 'part-time' && d.schedule !== 'both') return false;

        if (filterHomebased.checked && !d.homeBased) return false;
        if (filterSubsidy.checked && !d.tuition?.subsidyAccepted) return false;

        if (filterYearround.checked) {
            const closures = (d.summerClosures || '').toLowerCase();
            if (!closures.includes('year-round') && !closures.includes('open year')) return false;
        }

        if (filterNowaitlist.checked && d.waitlist === true) return false;

        return true;
    });

    renderDaycares();
}

function clearFilters() {
    searchInput.value = '';
    townSelect.value = '';
    tuitionMaxSelect.value = '';
    [filterInfants, filterToddlers, filterPreschool, filterFulltime, filterParttime,
        filterHomebased, filterSubsidy, filterYearround, filterNowaitlist
    ].forEach(el => { el.checked = false; });
    applyFilters();
}

function setView(view) {
    if (currentView === view) return;
    currentView = view;
    viewGridBtn.classList.toggle('active', view === 'grid');
    viewListBtn.classList.toggle('active', view === 'list');
    renderDaycares();
}

function renderDaycares() {
    resultsCount.textContent = `${filteredDaycares.length} daycare${filteredDaycares.length !== 1 ? 's' : ''} found`;

    if (filteredDaycares.length === 0) {
        daycaresGrid.innerHTML = '';
        noResults.style.display = 'block';
        return;
    }

    noResults.style.display = 'none';
    document.body.className = currentView === 'list' ? 'view-table' : 'view-grid';
    sortDaycares();

    if (currentView === 'grid') {
        daycaresGrid.innerHTML = filteredDaycares.map(createDaycareCard).join('');
    } else {
        const tbody = document.getElementById('daycares-table-body');
        if (tbody) tbody.innerHTML = filteredDaycares.map(createDaycareRow).join('');
    }
}

function sortDaycares() {
    filteredDaycares.sort((a, b) => {
        let valA, valB;
        switch (currentSort.column) {
            case 'name':
                valA = a.name.toLowerCase(); valB = b.name.toLowerCase(); break;
            case 'tuition':
                valA = a.tuition?.perMonth || (a.tuition?.perWeek ? a.tuition.perWeek * 4.33 : 99999);
                valB = b.tuition?.perMonth || (b.tuition?.perWeek ? b.tuition.perWeek * 4.33 : 99999);
                break;
            case 'ages':
                valA = a.ages?.minMonths || 999; valB = b.ages?.minMonths || 999; break;
            case 'town':
                valA = (a.location?.town || 'z').toLowerCase();
                valB = (b.location?.town || 'z').toLowerCase();
                break;
            default: return 0;
        }
        if (valA < valB) return currentSort.direction === 'asc' ? -1 : 1;
        if (valA > valB) return currentSort.direction === 'asc' ? 1 : -1;
        return 0;
    });
    updateSortHeaders();
}

function updateSortHeaders() {
    document.querySelectorAll('th.sortable').forEach(th => {
        th.classList.remove('sorted-asc', 'sorted-desc');
        if (th.dataset.sort === currentSort.column) {
            th.classList.add(currentSort.direction === 'asc' ? 'sorted-asc' : 'sorted-desc');
        }
    });
}

function handleSort(column) {
    if (currentSort.column === column) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.column = column;
        currentSort.direction = 'asc';
    }
    renderDaycares();
}

function formatAges(ages) {
    if (!ages) return 'Ages TBD';
    const min = ages.minMonths != null
        ? (ages.minMonths < 12 ? `${ages.minMonths}mo` : `${Math.round(ages.minMonths / 12)}yr`)
        : '?';
    const max = ages.maxYears != null ? `${ages.maxYears}yr` : '?';
    return `${min} – ${max}`;
}

function formatTuition(tuition) {
    if (!tuition) return 'Tuition TBD';
    if (tuition.perMonth) return `$${tuition.perMonth.toLocaleString()}/mo`;
    if (tuition.perWeek) return `$${tuition.perWeek}/wk`;
    return 'Tuition TBD';
}

function createDaycareCard(d) {
    const ages = formatAges(d.ages);
    const tuition = formatTuition(d.tuition);
    const location = d.location?.town || 'Location TBD';
    const hours = d.hours?.startTime && d.hours?.endTime
        ? `${d.hours.startTime}–${d.hours.endTime}`
        : null;

    const badges = [];
    if (d.homeBased) badges.push('<span class="badge badge-homebased">Home-based</span>');
    if (d.tuition?.subsidyAccepted) badges.push('<span class="badge badge-subsidy">Subsidy accepted</span>');
    if (d.waitlist) badges.push('<span class="badge badge-waitlist">Waitlist</span>');
    if (d.priorityAffiliation) badges.push(`<span class="badge badge-affiliation">${escapeHtml(d.priorityAffiliation)}</span>`);

    return `
        <article class="daycare-card">
            <div class="daycare-card-header">
                <h3><button class="daycare-title-btn" data-daycare-id="${d.id}">${escapeHtml(d.name)}</button></h3>
                ${d.organization ? `<p class="daycare-organization">${escapeHtml(d.organization)}</p>` : ''}
            </div>
            <div class="daycare-card-body">
                <div class="daycare-meta">
                    <span class="daycare-meta-item"><strong>${ages}</strong></span>
                    <span class="daycare-meta-item"><strong>${tuition}</strong></span>
                    <span class="daycare-meta-item">${escapeHtml(location)}</span>
                    ${hours ? `<span class="daycare-meta-item">${escapeHtml(hours)}</span>` : ''}
                </div>
                ${d.description ? `<p class="daycare-description">${escapeHtml(d.description)}</p>` : ''}
                ${badges.length > 0 ? `<div class="daycare-badges">${badges.join('')}</div>` : ''}
            </div>
            <div class="daycare-card-footer">
                ${d.source?.lastVerified ? `<span class="daycare-verified">Verified ${d.source.lastVerified}</span>` : '<span></span>'}
                ${d.incomplete?.length > 0 ? `<span class="daycare-incomplete">Missing info</span>` : ''}
            </div>
        </article>
    `;
}

function createDaycareRow(d) {
    const tuition = formatTuition(d.tuition);
    const ages = formatAges(d.ages);
    const location = d.location?.town || 'TBD';
    const hours = d.hours?.startTime && d.hours?.endTime
        ? `${d.hours.startTime}–${d.hours.endTime}`
        : 'TBD';
    const schedule = d.schedule ? (d.schedule.charAt(0).toUpperCase() + d.schedule.slice(1)) : 'TBD';

    return `
        <tr onclick="openModalById('${d.id}')">
            <td><strong>${escapeHtml(d.name)}</strong>${d.organization ? `<br><span style="font-size:0.85em;color:var(--text-secondary)">${escapeHtml(d.organization)}</span>` : ''}</td>
            <td>${tuition}</td>
            <td>${ages}</td>
            <td>${escapeHtml(location)}</td>
            <td>${escapeHtml(hours)}</td>
            <td>${escapeHtml(schedule)}</td>
        </tr>
    `;
}

window.openModalById = function (id) {
    const d = allDaycares.find(x => x.id === id);
    if (d) openModal(d);
};

function openModal(d) {
    modalBody.innerHTML = createModalContent(d);
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    modal.style.display = 'none';
    document.body.style.overflow = '';
}

function createModalContent(d) {
    const ages = d.ages
        ? `${d.ages.minMonths != null ? (d.ages.minMonths < 12 ? `${d.ages.minMonths} months` : `${Math.round(d.ages.minMonths / 12)} year${Math.round(d.ages.minMonths / 12) !== 1 ? 's' : ''}`) : '?'} to ${d.ages.maxYears != null ? `${d.ages.maxYears} years` : '?'}`
        : 'Not specified';

    let hoursHtml = '';
    if (d.hours?.startTime && d.hours?.endTime) {
        hoursHtml += `<li><strong>Hours:</strong> ${escapeHtml(d.hours.startTime)} – ${escapeHtml(d.hours.endTime)}</li>`;
    }
    if (d.hours?.daysOfWeek?.length) {
        hoursHtml += `<li><strong>Days:</strong> ${d.hours.daysOfWeek.join(', ')}</li>`;
    }
    if (d.schedule) {
        hoursHtml += `<li><strong>Schedule:</strong> ${d.schedule.charAt(0).toUpperCase() + d.schedule.slice(1)}</li>`;
    }

    let tuitionHtml = '';
    if (d.tuition?.perMonth) tuitionHtml += `<li><strong>Per month:</strong> $${d.tuition.perMonth.toLocaleString()}</li>`;
    if (d.tuition?.perWeek) tuitionHtml += `<li><strong>Per week:</strong> $${d.tuition.perWeek}</li>`;
    if (d.tuition?.enrollmentFee) tuitionHtml += `<li><strong>Enrollment fee:</strong> $${d.tuition.enrollmentFee}</li>`;
    if (d.tuition?.siblingDiscount) tuitionHtml += `<li><strong>Sibling discount:</strong> ${escapeHtml(d.tuition.siblingDiscount)}</li>`;
    if (d.tuition?.subsidyAccepted) tuitionHtml += `<li><strong>Subsidy/vouchers:</strong> Accepted</li>`;
    if (d.tuition?.notes) tuitionHtml += `<li>${escapeHtml(d.tuition.notes)}</li>`;

    let locationHtml = d.location?.town || '';
    if (d.location?.address) locationHtml += ` — ${d.location.address}`;

    const incompleteHtml = d.incomplete?.length > 0
        ? `<div class="modal-incomplete">Some information may be missing: ${d.incomplete.join(', ')}. Please verify directly with the daycare.</div>`
        : '';

    return `
        <div class="modal-header">
            <h2>${escapeHtml(d.name)}</h2>
            ${d.organization ? `<p class="organization">${escapeHtml(d.organization)}</p>` : ''}
        </div>

        ${d.description ? `<div class="modal-section"><p>${escapeHtml(d.description)}</p></div>` : ''}

        <div class="modal-grid">
            <div class="modal-section">
                <h3>Ages</h3>
                <p>${ages}</p>
            </div>
            <div class="modal-section">
                <h3>Location</h3>
                <p>${escapeHtml(locationHtml) || 'Not specified'}</p>
            </div>
        </div>

        ${hoursHtml ? `
        <div class="modal-section">
            <h3>Hours & Schedule</h3>
            <ul>${hoursHtml}</ul>
        </div>` : ''}

        ${tuitionHtml ? `
        <div class="modal-section">
            <h3>Tuition</h3>
            <ul>${tuitionHtml}</ul>
        </div>` : ''}

        ${d.summerClosures ? `
        <div class="modal-section">
            <h3>Summer</h3>
            <p>${escapeHtml(d.summerClosures)}</p>
        </div>` : ''}

        ${d.priorityAffiliation ? `
        <div class="modal-section">
            <h3>Priority Enrollment</h3>
            <p>${escapeHtml(d.priorityAffiliation)}</p>
        </div>` : ''}

        ${d.waitlist ? `
        <div class="modal-section">
            <p><strong>Note:</strong> This daycare currently has a waitlist.</p>
        </div>` : ''}

        ${d.homeBased ? `
        <div class="modal-section">
            <p><strong>Type:</strong> Licensed home-based daycare</p>
        </div>` : ''}

        ${incompleteHtml}

        ${d.source?.url ? `<a href="${d.source.url}" target="_blank" rel="noopener" class="modal-link">Visit Website &rarr;</a>` : ''}

        ${d.source?.lastVerified ? `
        <p style="margin-top:1rem;font-size:0.8rem;color:var(--text-secondary);">
            Last verified: ${d.source.lastVerified}
            ${d.source.sourceList ? ` · Source: ${escapeHtml(d.source.sourceList)}` : ''}
        </p>` : ''}
    `;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', init);
