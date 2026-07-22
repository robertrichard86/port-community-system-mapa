/**
 * ============================================================
 * PCS GLOBAL MAP — Application Logic
 * Port Community Systems Interactive Dashboard
 * 
 * Author: Robert Richard das Neves Correia dos Santos
 * Institution: CILIP · CENEP
 * ============================================================
 */

(function () {
  'use strict';

  // ── Configuration ──────────────────────────────────────────
  const CONFIG = {
    dataPath: 'data/pcs_locations.json',
    map: {
      center: [20, 10],
      zoom: 2.5,
      minZoom: 2,
      maxZoom: 18,
      zoomSnap: 0.5,
      zoomDelta: 0.5,
    },
    tiles: {
      dark: {
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · <a href="https://carto.com/">CARTO</a>',
      },
      satellite: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: '&copy; <a href="https://www.esri.com/">Esri</a> · Maxar · Earthstar',
      },
    },
    regionColors: {
      europe: '#22d3ee',
      asia: '#a78bfa',
      americas: '#34d399',
      'middle-east': '#fbbf24',
      africa: '#fb923c',
      oceania: '#f472b6',
    },
    regionNames: {
      europe: 'Europa',
      asia: 'Ásia',
      americas: 'Américas',
      'middle-east': 'Oriente Médio',
      africa: 'África',
      oceania: 'Oceania',
    },
    flyToDuration: 1.5,
    flyToZoom: 8,
  };

  // ── State ──────────────────────────────────────────────────
  const state = {
    pcsData: [],
    filteredData: [],
    map: null,
    markers: {},
    activeRegion: 'all',
    searchQuery: '',
    activePcsId: null,
    tileLayer: null,
    currentTile: 'dark',
    sidebarCollapsed: false,
  };

  // ── DOM References ─────────────────────────────────────────
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const dom = {
    loadingOverlay: $('#loadingOverlay'),
    sidebar: $('#sidebar'),
    sidebarToggle: $('#sidebarToggle'),
    searchInput: $('#searchInput'),
    regionFilters: $('#regionFilters'),
    pcsList: $('#pcsList'),
    pcsCount: $('#pcsCount'),
    map: $('#map'),
    detailPanel: $('#detailPanel'),
    detailName: $('#detailName'),
    detailLocation: $('#detailLocation'),
    detailBody: $('#detailBody'),
    detailClose: $('#detailClose'),
    statTotal: $('#statTotal'),
    statCountries: $('#statCountries'),
    statIpcsa: $('#statIpcsa'),
    statsTotal: $('#statsTotal'),
    statsCountries: $('#statsCountries'),
    statsRegions: $('#statsRegions'),
    statsIpcsa: $('#statsIpcsa'),
    viewMap: $('#viewMap'),
    viewSatellite: $('#viewSatellite'),
    mobileMenuBtn: $('#mobileMenuBtn'),
  };

  // ── Initialize ─────────────────────────────────────────────
  async function init() {
    try {
      await loadData();
      initMap();
      renderMarkers();
      renderSidebar();
      updateStats();
      bindEvents();
      hideLoading();
    } catch (err) {
      console.error('Initialization error:', err);
      dom.loadingOverlay.innerHTML = `
        <div style="text-align:center; color:#ef4444;">
          <p style="font-size:18px; font-weight:600; margin-bottom:8px;">Erro ao carregar dados</p>
          <p style="font-size:13px; color:#94a3b8;">${err.message}</p>
        </div>
      `;
    }
  }

  // ── Data Loading ───────────────────────────────────────────
  async function loadData() {
    const response = await fetch(CONFIG.dataPath);
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    const json = await response.json();
    state.pcsData = json.pcs_systems || [];
    state.filteredData = [...state.pcsData];
  }

  // ── Map Initialization ─────────────────────────────────────
  function initMap() {
    state.map = L.map('map', {
      center: CONFIG.map.center,
      zoom: CONFIG.map.zoom,
      minZoom: CONFIG.map.minZoom,
      maxZoom: CONFIG.map.maxZoom,
      zoomSnap: CONFIG.map.zoomSnap,
      zoomDelta: CONFIG.map.zoomDelta,
      zoomControl: false,
      attributionControl: true,
      worldCopyJump: true,
    });

    // Zoom Control (top-right)
    L.control.zoom({ position: 'topright' }).addTo(state.map);

    // Default tile layer
    setTileLayer('dark');
  }

  function setTileLayer(type) {
    if (state.tileLayer) {
      state.map.removeLayer(state.tileLayer);
    }
    const tileConfig = CONFIG.tiles[type];
    state.tileLayer = L.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(state.map);
    state.currentTile = type;
  }

  // ── Marker Creation ────────────────────────────────────────
  function createMarkerIcon(pcs) {
    const color = CONFIG.regionColors[pcs.region] || '#22d3ee';
    return L.divIcon({
      className: `pcs-marker marker-${pcs.region}`,
      html: `
        <div class="pcs-marker-pulse" style="background: ${color}33;"></div>
        <div class="pcs-marker-dot" style="background: ${color}; box-shadow: 0 0 12px ${color}80, 0 2px 6px rgba(0,0,0,0.3);"></div>
      `,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
      popupAnchor: [0, -12],
    });
  }

  function renderMarkers() {
    // Clear existing markers
    Object.values(state.markers).forEach((m) => {
      state.map.removeLayer(m);
    });
    state.markers = {};

    state.filteredData.forEach((pcs) => {
      const marker = L.marker([pcs.lat, pcs.lng], {
        icon: createMarkerIcon(pcs),
        title: pcs.name,
      });

      marker.bindPopup(createPopupContent(pcs), {
        maxWidth: 320,
        minWidth: 260,
        className: 'pcs-popup',
        closeButton: true,
      });

      marker.on('click', () => {
        selectPcs(pcs.id);
      });

      marker.addTo(state.map);
      state.markers[pcs.id] = marker;
    });
  }

  function createPopupContent(pcs) {
    const regionName = CONFIG.regionNames[pcs.region] || pcs.region;
    const color = CONFIG.regionColors[pcs.region] || '#22d3ee';

    return `
      <div class="popup-content">
        <div class="popup-header">
          <div class="popup-icon" style="background: linear-gradient(135deg, ${color}, ${color}99);">
            ${pcs.flag || '⚓'}
          </div>
          <div>
            <div class="popup-title">${pcs.name}</div>
            <div class="popup-subtitle">${pcs.port_city}, ${pcs.country}</div>
          </div>
        </div>
        <div class="popup-body">
          <div class="popup-row">
            <svg class="popup-row-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" /></svg>
            <span class="popup-row-label">Região:</span>
            <span class="popup-row-value">${regionName}</span>
          </div>
          <div class="popup-row">
            <svg class="popup-row-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" /></svg>
            <span class="popup-row-label">IPCSA:</span>
            <span class="popup-row-value">${pcs.ipcsa_member ? '✅ Membro' : '—'}</span>
          </div>
          <div class="popup-row">
            <svg class="popup-row-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" /></svg>
            <span class="popup-row-label">Coord.:</span>
            <span class="popup-row-value" style="font-family: var(--font-mono); font-size: 11px;">${pcs.lat.toFixed(4)}°, ${pcs.lng.toFixed(4)}°</span>
          </div>
          <p style="font-size: 12px; color: #94a3b8; margin-top: 8px; line-height: 1.5;">${pcs.description}</p>
          ${pcs.website ? `
            <a href="${pcs.website}" target="_blank" rel="noopener noreferrer" class="popup-link">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
              Visitar Website
            </a>
          ` : ''}
        </div>
      </div>
    `;
  }

  // ── Sidebar Rendering ──────────────────────────────────────
  function renderSidebar() {
    dom.pcsList.innerHTML = '';
    dom.pcsCount.textContent = state.filteredData.length;

    if (state.filteredData.length === 0) {
      dom.pcsList.innerHTML = `
        <div class="no-results">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <p>Nenhum PCS encontrado para <strong>"${state.searchQuery}"</strong></p>
        </div>
      `;
      return;
    }

    const fragment = document.createDocumentFragment();

    state.filteredData.forEach((pcs, index) => {
      const card = document.createElement('div');
      card.className = `pcs-card animate-slide-in-right ${pcs.id === state.activePcsId ? 'active' : ''}`;
      card.style.animationDelay = `${Math.min(index * 30, 300)}ms`;
      card.dataset.id = pcs.id;

      card.innerHTML = `
        <div class="pcs-card-icon">${pcs.flag || '⚓'}</div>
        <div class="pcs-card-info">
          <div class="pcs-card-name">${highlightMatch(pcs.name, state.searchQuery)}</div>
          <div class="pcs-card-location">${highlightMatch(pcs.port_city, state.searchQuery)}</div>
          <div class="pcs-card-country">
            <span>${highlightMatch(pcs.country, state.searchQuery)}</span>
            ${pcs.ipcsa_member ? '<span style="color: #22d3ee; margin-left: 4px;">· IPCSA</span>' : ''}
          </div>
        </div>
      `;

      card.addEventListener('click', () => {
        selectPcs(pcs.id);
        flyToPcs(pcs);
      });

      fragment.appendChild(card);
    });

    dom.pcsList.appendChild(fragment);
  }

  function highlightMatch(text, query) {
    if (!query) return text;
    const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
    return text.replace(regex, '<mark style="background:rgba(34,211,238,0.25);color:#67e8f9;padding:0 1px;border-radius:2px;">$1</mark>');
  }

  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // ── PCS Selection ──────────────────────────────────────────
  function selectPcs(id) {
    state.activePcsId = id;
    const pcs = state.pcsData.find((p) => p.id === id);
    if (!pcs) return;

    // Update sidebar card active states
    $$('.pcs-card').forEach((el) => {
      el.classList.toggle('active', el.dataset.id === id);
    });

    // Open detail panel
    openDetailPanel(pcs);

    // Open popup on map
    const marker = state.markers[id];
    if (marker) {
      marker.openPopup();
    }
  }

  function flyToPcs(pcs) {
    state.map.flyTo([pcs.lat, pcs.lng], CONFIG.flyToZoom, {
      duration: CONFIG.flyToDuration,
    });
  }

  // ── Detail Panel ───────────────────────────────────────────
  function openDetailPanel(pcs) {
    const regionName = CONFIG.regionNames[pcs.region] || pcs.region;
    const color = CONFIG.regionColors[pcs.region] || '#22d3ee';

    dom.detailName.textContent = pcs.name;
    dom.detailLocation.textContent = `${pcs.port_city}, ${pcs.country}`;

    dom.detailBody.innerHTML = `
      <div class="detail-section animate-fade-in">
        <div style="
          width: 100%;
          height: 120px;
          background: linear-gradient(135deg, ${color}15, ${color}05);
          border: 1px solid ${color}30;
          border-radius: var(--radius-lg);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 48px;
          margin-bottom: var(--space-lg);
        ">${pcs.flag || '⚓'}</div>
      </div>

      <div class="detail-section animate-fade-in" style="animation-delay: 80ms;">
        <div class="detail-section-title">Informações Gerais</div>
        <div class="detail-info-grid">
          <div class="detail-info-item">
            <div class="detail-info-label">País</div>
            <div class="detail-info-value">${pcs.country}</div>
          </div>
          <div class="detail-info-item">
            <div class="detail-info-label">Região</div>
            <div class="detail-info-value" style="color: ${color};">${regionName}</div>
          </div>
          <div class="detail-info-item">
            <div class="detail-info-label">Porto / Cidade</div>
            <div class="detail-info-value">${pcs.port_city}</div>
          </div>
          <div class="detail-info-item">
            <div class="detail-info-label">Membro IPCSA</div>
            <div class="detail-info-value">${pcs.ipcsa_member ? '✅ Sim' : '❌ Não'}</div>
          </div>
        </div>
      </div>

      <div class="detail-section animate-fade-in" style="animation-delay: 160ms;">
        <div class="detail-section-title">Descrição</div>
        <p style="font-size: 13px; color: var(--slate-300); line-height: 1.7;">${pcs.description}</p>
      </div>

      <div class="detail-section animate-fade-in" style="animation-delay: 240ms;">
        <div class="detail-section-title">Coordenadas Geográficas</div>
        <div class="detail-info-grid">
          <div class="detail-info-item">
            <div class="detail-info-label">Latitude</div>
            <div class="detail-info-value" style="font-family: var(--font-mono); font-size: 12px;">${pcs.lat.toFixed(4)}°</div>
          </div>
          <div class="detail-info-item">
            <div class="detail-info-label">Longitude</div>
            <div class="detail-info-value" style="font-family: var(--font-mono); font-size: 12px;">${pcs.lng.toFixed(4)}°</div>
          </div>
        </div>
      </div>

      ${pcs.website ? `
        <div class="detail-section animate-fade-in" style="animation-delay: 320ms;">
          <div class="detail-section-title">Links</div>
          <a href="${pcs.website}" target="_blank" rel="noopener noreferrer" class="popup-link" style="display:inline-flex; width:auto;">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:14px; height:14px;"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
            Website Oficial
          </a>
        </div>
      ` : ''}
    `;

    dom.detailPanel.classList.add('open');
  }

  function closeDetailPanel() {
    dom.detailPanel.classList.remove('open');
    state.activePcsId = null;
    $$('.pcs-card').forEach((el) => el.classList.remove('active'));
  }

  // ── Filtering ──────────────────────────────────────────────
  function filterData() {
    const query = state.searchQuery.toLowerCase().trim();
    const region = state.activeRegion;

    state.filteredData = state.pcsData.filter((pcs) => {
      // Region filter
      if (region !== 'all' && pcs.region !== region) return false;

      // Search filter
      if (query) {
        const searchFields = [
          pcs.name,
          pcs.port_city,
          pcs.country,
          pcs.description,
        ].map((f) => (f || '').toLowerCase());

        return searchFields.some((field) => field.includes(query));
      }

      return true;
    });

    renderMarkers();
    renderSidebar();
    updateFilteredStats();
  }

  // ── Stats ──────────────────────────────────────────────────
  function updateStats() {
    const total = state.pcsData.length;
    const countries = new Set(state.pcsData.map((p) => p.country)).size;
    const regions = new Set(state.pcsData.map((p) => p.region)).size;
    const ipcsa = state.pcsData.filter((p) => p.ipcsa_member).length;

    animateCounter(dom.statTotal, total);
    animateCounter(dom.statCountries, countries);
    animateCounter(dom.statIpcsa, ipcsa);
    animateCounter(dom.statsTotal, total);
    animateCounter(dom.statsCountries, countries);
    animateCounter(dom.statsRegions, regions);
    animateCounter(dom.statsIpcsa, ipcsa);
  }

  function updateFilteredStats() {
    const total = state.filteredData.length;
    const countries = new Set(state.filteredData.map((p) => p.country)).size;
    const regions = new Set(state.filteredData.map((p) => p.region)).size;
    const ipcsa = state.filteredData.filter((p) => p.ipcsa_member).length;

    dom.statsTotal.textContent = total;
    dom.statsCountries.textContent = countries;
    dom.statsRegions.textContent = regions;
    dom.statsIpcsa.textContent = ipcsa;
  }

  function animateCounter(element, target) {
    const duration = 1200;
    const start = performance.now();
    const from = 0;

    function update(timestamp) {
      const elapsed = timestamp - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(from + (target - from) * ease);
      element.textContent = current;

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }

    requestAnimationFrame(update);
  }

  // ── Loading ────────────────────────────────────────────────
  function hideLoading() {
    setTimeout(() => {
      dom.loadingOverlay.classList.add('fade-out');
      setTimeout(() => {
        dom.loadingOverlay.style.display = 'none';
      }, 400);
    }, 800);
  }

  // ── Event Binding ──────────────────────────────────────────
  function bindEvents() {
    // Search
    dom.searchInput.addEventListener('input', debounce((e) => {
      state.searchQuery = e.target.value;
      filterData();
    }, 200));

    // Region Filters
    dom.regionFilters.addEventListener('click', (e) => {
      const chip = e.target.closest('.filter-chip');
      if (!chip) return;

      const region = chip.dataset.region;
      state.activeRegion = region;

      $$('.filter-chip').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');

      filterData();

      // Fly to region if not "all"
      if (region !== 'all') {
        fitToRegion(region);
      } else {
        state.map.flyTo(CONFIG.map.center, CONFIG.map.zoom, { duration: 1 });
      }
    });

    // Sidebar Toggle
    dom.sidebarToggle.addEventListener('click', toggleSidebar);

    // Detail Panel Close
    dom.detailClose.addEventListener('click', closeDetailPanel);

    // View Toggle (dark / satellite)
    dom.viewMap.addEventListener('click', () => {
      setTileLayer('dark');
      dom.viewMap.classList.add('active');
      dom.viewSatellite.classList.remove('active');
    });

    dom.viewSatellite.addEventListener('click', () => {
      setTileLayer('satellite');
      dom.viewSatellite.classList.add('active');
      dom.viewMap.classList.remove('active');
    });

    // Mobile Menu
    dom.mobileMenuBtn.addEventListener('click', () => {
      dom.sidebar.classList.toggle('open');
    });

    // Close sidebar on map click (mobile)
    state.map.on('click', () => {
      if (window.innerWidth <= 1024) {
        dom.sidebar.classList.remove('open');
      }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Escape closes detail panel
      if (e.key === 'Escape') {
        closeDetailPanel();
        dom.sidebar.classList.remove('open');
      }
      // Ctrl+K focuses search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        dom.searchInput.focus();
      }
    });
  }

  // ── Sidebar Toggle ─────────────────────────────────────────
  function toggleSidebar() {
    state.sidebarCollapsed = !state.sidebarCollapsed;
    dom.sidebar.classList.toggle('collapsed', state.sidebarCollapsed);
    // Invalidate map size after transition
    setTimeout(() => {
      state.map.invalidateSize();
    }, 300);
  }

  // ── Fly to Region ──────────────────────────────────────────
  function fitToRegion(region) {
    const regionPcs = state.filteredData.filter((p) => p.region === region);
    if (regionPcs.length === 0) return;

    const bounds = L.latLngBounds(regionPcs.map((p) => [p.lat, p.lng]));
    state.map.flyToBounds(bounds, {
      padding: [60, 60],
      duration: CONFIG.flyToDuration,
      maxZoom: 6,
    });
  }

  // ── Utilities ──────────────────────────────────────────────
  function debounce(fn, delay) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  // ── Boot ───────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', init);
})();
