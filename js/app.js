/**
 * ============================================================
 * PCS GLOBAL MAP — Application Logic (v2.0)
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
    statusColors: {
      operational: '#22c55e',
      implementing: '#f59e0b',
      pilot: '#3b82f6',
      discontinued: '#ef4444',
    },
    statusNames: {
      operational: 'Operacional',
      implementing: 'Em implantação',
      pilot: 'Projeto piloto',
      discontinued: 'Descontinuado',
    },
    typeNames: {
      pcs: 'Port Community System',
      single_window: 'Single Window',
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
    markerClusterGroup: null,
    activeRegion: 'all',
    activeType: 'all',
    activeStatus: 'all',
    searchQuery: '',
    activePcsId: null,
    tileLayer: null,
    currentTile: 'dark',
    sidebarCollapsed: false,
    dataLoaded: false,
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
    typeFilters: $('#typeFilters'),
    statusFilters: $('#statusFilters'),
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
    exportCsv: $('#exportCsv'),
    exportJson: $('#exportJson'),
  };

  // ── Initialize ─────────────────────────────────────────────
  async function init() {
    try {
      await loadData();
      validateCoordinates();
      initMap();
      renderMarkers();
      renderSidebar();
      updateStats();
      bindEvents();
      hideLoading();
      state.dataLoaded = true;
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

  // ── Coordinate Validation ─────────────────────────────────
  function validateCoordinates() {
    state.pcsData.forEach((pcs) => {
      pcs._coordWarning = false;
      if (typeof pcs.lat !== 'number' || typeof pcs.lng !== 'number') {
        console.warn(`[COORD] ${pcs.name}: lat/lng não numérico`);
        pcs._coordWarning = true;
        return;
      }
      if (pcs.lat < -90 || pcs.lat > 90) {
        console.warn(`[COORD] ${pcs.name}: latitude ${pcs.lat} fora do intervalo [-90, 90]`);
        pcs._coordWarning = true;
      }
      if (pcs.lng < -180 || pcs.lng > 180) {
        console.warn(`[COORD] ${pcs.name}: longitude ${pcs.lng} fora do intervalo [-180, 180]`);
        pcs._coordWarning = true;
      }
    });
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

    // Invalidate size after initial layout settles
    setTimeout(() => {
      state.map.invalidateSize();
    }, 200);
  }

  function setTileLayer(type) {
    if (state.tileLayer) {
      state.map.removeLayer(state.tileLayer);
    }
    const tileConfig = CONFIG.tiles[type];
    const opts = {
      attribution: tileConfig.attribution,
      maxZoom: 19,
    };
    // Only CARTO tiles use subdomains
    if (type === 'dark') {
      opts.subdomains = 'abcd';
    }
    state.tileLayer = L.tileLayer(tileConfig.url, opts).addTo(state.map);
    state.currentTile = type;
  }

  // ── Marker Creation ────────────────────────────────────────
  function createMarkerIcon(pcs) {
    const color = CONFIG.regionColors[pcs.region] || '#22d3ee';
    const statusColor = CONFIG.statusColors[pcs.status] || '#22c55e';
    const isLocal = pcs.scope === 'local';

    return L.divIcon({
      className: `pcs-marker marker-${pcs.region}`,
      html: `
        <div class="pcs-marker-pulse" style="background: ${color}33;"></div>
        <div class="pcs-marker-dot" style="background: ${color}; box-shadow: 0 0 12px ${color}80, 0 2px 6px rgba(0,0,0,0.3); border-color: ${statusColor};" data-status="${pcs.status}"></div>
        ${pcs._coordWarning ? '<div class="pcs-marker-warning">⚠</div>' : ''}
      `,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
      popupAnchor: [0, -12],
    });
  }

  function renderMarkers() {
    // Remove existing cluster group
    if (state.markerClusterGroup) {
      state.map.removeLayer(state.markerClusterGroup);
    }

    state.markers = {};

    // Create marker cluster group
    state.markerClusterGroup = L.markerClusterGroup({
      maxClusterRadius: 45,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      iconCreateFunction: function (cluster) {
        const count = cluster.getChildCount();
        let size = 'small';
        if (count > 10) size = 'medium';
        if (count > 25) size = 'large';
        return L.divIcon({
          html: `<div class="cluster-inner">${count}</div>`,
          className: `pcs-cluster pcs-cluster-${size}`,
          iconSize: L.point(40, 40),
        });
      },
    });

    state.filteredData.forEach((pcs) => {
      // Skip entries with invalid coordinates
      if (pcs._coordWarning) return;

      const marker = L.marker([pcs.lat, pcs.lng], {
        icon: createMarkerIcon(pcs),
        title: pcs.name,
      });

      marker.bindPopup(createPopupContent(pcs), {
        maxWidth: 340,
        minWidth: 280,
        className: 'pcs-popup',
        closeButton: true,
      });

      marker.on('click', () => {
        selectPcs(pcs.id);
      });

      state.markerClusterGroup.addLayer(marker);
      state.markers[pcs.id] = marker;
    });

    state.map.addLayer(state.markerClusterGroup);
  }

  function createPopupContent(pcs) {
    const regionName = CONFIG.regionNames[pcs.region] || pcs.region;
    const color = CONFIG.regionColors[pcs.region] || '#22d3ee';
    const statusColor = CONFIG.statusColors[pcs.status] || '#22c55e';
    const statusName = CONFIG.statusNames[pcs.status] || pcs.status || '—';
    const typeName = CONFIG.typeNames[pcs.type] || pcs.type || '—';
    const typeIcon = pcs.type === 'single_window' ? '🏛️' : '⚓';

    const fieldOrNull = (label, value) => {
      if (!value || value === 'null') return `
        <div class="popup-row">
          <span class="popup-row-label">${label}:</span>
          <span class="popup-row-value popup-null">N/D</span>
        </div>`;
      return `
        <div class="popup-row">
          <span class="popup-row-label">${label}:</span>
          <span class="popup-row-value">${value}</span>
        </div>`;
    };

    return `
      <div class="popup-content">
        <div class="popup-header">
          <div class="popup-icon" style="background: linear-gradient(135deg, ${color}, ${color}99);">
            ${pcs.flag || '⚓'}
          </div>
          <div>
            <div class="popup-title">${escapeHtml(pcs.name)}</div>
            <div class="popup-subtitle">${escapeHtml(pcs.port_city)}, ${escapeHtml(pcs.country)}</div>
          </div>
        </div>
        <div class="popup-badges">
          <span class="popup-badge" style="background:${statusColor}20;color:${statusColor};border-color:${statusColor}40;">
            <span class="popup-badge-dot" style="background:${statusColor};"></span> ${statusName}
          </span>
          <span class="popup-badge popup-badge-type">
            ${typeIcon} ${typeName}
          </span>
          ${pcs.ipcsa_member ? '<span class="popup-badge popup-badge-ipcsa">✦ IPCSA</span>' : ''}
        </div>
        <div class="popup-body">
          ${fieldOrNull('Região', regionName)}
          ${fieldOrNull('Operador', pcs.operator)}
          ${fieldOrNull('Fundação', pcs.year_founded)}
          ${fieldOrNull('Geração', pcs.pcs_generation ? pcs.pcs_generation + ' Geração' : null)}
          ${fieldOrNull('Escopo', pcs.scope === 'national' ? '🌐 Nacional' : '📍 Local/Portuário')}
          <div class="popup-row">
            <span class="popup-row-label">Coord.:</span>
            <span class="popup-row-value" style="font-family: var(--font-mono); font-size: 11px;">
              ${pcs.lat.toFixed(4)}°, ${pcs.lng.toFixed(4)}°
            </span>
          </div>
          <p class="popup-description">${escapeHtml(pcs.description)}</p>
          <div class="popup-footer">
            ${pcs.website ? `
              <a href="${pcs.website}" target="_blank" rel="noopener noreferrer" class="popup-link">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
                Visitar Website
              </a>
            ` : '<span class="popup-no-link">Link não disponível</span>'}
            <span class="popup-source">${pcs.data_source || 'IPCSA'} · ${pcs.last_verified || '—'}</span>
          </div>
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
          <p>Nenhum sistema encontrado para <strong>"${escapeHtml(state.searchQuery)}"</strong></p>
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

      const statusColor = CONFIG.statusColors[pcs.status] || '#22c55e';
      const typeIcon = pcs.type === 'single_window' ? '🏛️' : '⚓';

      card.innerHTML = `
        <div class="pcs-card-icon">${pcs.flag || '⚓'}</div>
        <div class="pcs-card-info">
          <div class="pcs-card-name">${highlightMatch(pcs.name, state.searchQuery)}</div>
          <div class="pcs-card-location">${highlightMatch(pcs.port_city, state.searchQuery)}</div>
          <div class="pcs-card-meta">
            <span>${highlightMatch(pcs.country, state.searchQuery)}</span>
            <span class="pcs-card-status" style="color:${statusColor};">●</span>
            <span class="pcs-card-type">${typeIcon}</span>
            ${pcs.ipcsa_member ? '<span style="color: #22d3ee;">IPCSA</span>' : ''}
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
    if (!query || !text) return escapeHtml(text || '');
    const escaped = escapeHtml(text);
    const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
    return escaped.replace(regex, '<mark style="background:rgba(34,211,238,0.25);color:#67e8f9;padding:0 1px;border-radius:2px;">$1</mark>');
  }

  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
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
      // Bring marker to top of cluster if needed
      state.markerClusterGroup.zoomToShowLayer(marker, () => {
        marker.openPopup();
      });
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
    const statusColor = CONFIG.statusColors[pcs.status] || '#22c55e';
    const statusName = CONFIG.statusNames[pcs.status] || pcs.status || '—';
    const typeName = CONFIG.typeNames[pcs.type] || pcs.type || '—';
    const typeIcon = pcs.type === 'single_window' ? '🏛️' : '⚓';

    dom.detailName.textContent = pcs.name;
    dom.detailLocation.textContent = `${pcs.port_city}, ${pcs.country}`;

    const infoField = (label, value) => {
      const display = (value && value !== 'null') ? value : '<span class="detail-null">N/D</span>';
      return `
        <div class="detail-info-item">
          <div class="detail-info-label">${label}</div>
          <div class="detail-info-value">${display}</div>
        </div>`;
    };

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
          position: relative;
        ">
          ${pcs.flag || '⚓'}
          <div style="position:absolute;bottom:8px;right:10px;display:flex;gap:6px;">
            <span class="popup-badge" style="background:${statusColor}20;color:${statusColor};border-color:${statusColor}40;font-size:10px;">
              <span class="popup-badge-dot" style="background:${statusColor};"></span> ${statusName}
            </span>
            <span class="popup-badge popup-badge-type" style="font-size:10px;">${typeIcon} ${typeName}</span>
          </div>
        </div>
      </div>

      <div class="detail-section animate-fade-in" style="animation-delay: 80ms;">
        <div class="detail-section-title">Informações Gerais</div>
        <div class="detail-info-grid">
          ${infoField('País', pcs.country)}
          ${infoField('Região', `<span style="color:${color};">${regionName}</span>`)}
          ${infoField('Porto / Cidade', pcs.port_city)}
          ${infoField('Membro IPCSA', pcs.ipcsa_member ? '✅ Sim' : '❌ Não')}
          ${infoField('Operador', pcs.operator)}
          ${infoField('Ano de Fundação', pcs.year_founded)}
          ${infoField('Geração PCS', pcs.pcs_generation ? pcs.pcs_generation + ' Geração' : null)}
          ${infoField('Escopo', pcs.scope === 'national' ? '🌐 Nacional' : '📍 Local/Portuário')}
        </div>
      </div>

      <div class="detail-section animate-fade-in" style="animation-delay: 160ms;">
        <div class="detail-section-title">Descrição</div>
        <p style="font-size: 13px; color: var(--slate-300); line-height: 1.7;">${escapeHtml(pcs.description)}</p>
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
        ${pcs._coordWarning ? '<p style="font-size:11px;color:#f59e0b;margin-top:8px;">⚠ Coordenada pode estar imprecisa</p>' : ''}
      </div>

      <div class="detail-section animate-fade-in" style="animation-delay: 320ms;">
        <div class="detail-section-title">Links e Fonte</div>
        ${pcs.website ? `
          <a href="${pcs.website}" target="_blank" rel="noopener noreferrer" class="popup-link" style="display:inline-flex; width:auto; margin-bottom: 8px;">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:14px; height:14px;"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
            Website Oficial
          </a>
        ` : '<p style="font-size:12px;color:var(--slate-500);">Link não disponível</p>'}
        <p style="font-size:11px;color:var(--slate-500);margin-top:4px;">
          Fonte: ${pcs.data_source || 'IPCSA Directory'} · Verificado: ${pcs.last_verified || '—'}
        </p>
      </div>
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
    const type = state.activeType;
    const status = state.activeStatus;

    state.filteredData = state.pcsData.filter((pcs) => {
      // Region filter
      if (region !== 'all' && pcs.region !== region) return false;

      // Type filter
      if (type !== 'all' && pcs.type !== type) return false;

      // Status filter
      if (status !== 'all' && pcs.status !== status) return false;

      // Search filter
      if (query) {
        const searchFields = [
          pcs.name,
          pcs.port_city,
          pcs.country,
          pcs.description,
          pcs.operator,
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

    // Remove skeleton class from all stat elements
    $$('.skeleton-text').forEach((el) => el.classList.remove('skeleton-text'));

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

    // Update both top bar and floating stats
    dom.statTotal.textContent = total;
    dom.statCountries.textContent = countries;
    dom.statIpcsa.textContent = ipcsa;
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

  // ── Export Functions ────────────────────────────────────────
  function exportCsv() {
    const data = state.filteredData;
    if (data.length === 0) return;

    const headers = ['Nome', 'Porto/Cidade', 'País', 'Região', 'Tipo', 'Status', 'Operador', 'Ano', 'Geração', 'Escopo', 'IPCSA', 'Latitude', 'Longitude', 'Website', 'Descrição'];
    const rows = data.map((pcs) => [
      pcs.name,
      pcs.port_city,
      pcs.country,
      CONFIG.regionNames[pcs.region] || pcs.region,
      pcs.type === 'pcs' ? 'PCS' : 'Single Window',
      CONFIG.statusNames[pcs.status] || pcs.status,
      pcs.operator || '',
      pcs.year_founded || '',
      pcs.pcs_generation || '',
      pcs.scope === 'national' ? 'Nacional' : 'Local',
      pcs.ipcsa_member ? 'Sim' : 'Não',
      pcs.lat,
      pcs.lng,
      pcs.website || '',
      pcs.description,
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    downloadFile(csv, 'pcs_global_data.csv', 'text/csv;charset=utf-8;');
  }

  function exportJson() {
    const data = state.filteredData;
    if (data.length === 0) return;

    const cleanData = data.map((pcs) => {
      const { _coordWarning, ...rest } = pcs;
      return rest;
    });

    const json = JSON.stringify({ exported_at: new Date().toISOString(), total: cleanData.length, systems: cleanData }, null, 2);
    downloadFile(json, 'pcs_global_data.json', 'application/json');
  }

  function downloadFile(content, filename, mimeType) {
    const blob = new Blob(['\uFEFF' + content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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

      dom.regionFilters.querySelectorAll('.filter-chip').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');

      filterData();

      // Fly to region if not "all"
      if (region !== 'all') {
        fitToRegion(region);
      } else {
        state.map.flyTo(CONFIG.map.center, CONFIG.map.zoom, { duration: 1 });
      }
    });

    // Type Filters
    dom.typeFilters.addEventListener('click', (e) => {
      const chip = e.target.closest('.filter-chip');
      if (!chip) return;

      state.activeType = chip.dataset.type;
      dom.typeFilters.querySelectorAll('.filter-chip').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      filterData();
    });

    // Status Filters
    dom.statusFilters.addEventListener('click', (e) => {
      const chip = e.target.closest('.filter-chip');
      if (!chip) return;

      state.activeStatus = chip.dataset.status;
      dom.statusFilters.querySelectorAll('.filter-chip').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      filterData();
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

    // Export Buttons
    dom.exportCsv.addEventListener('click', exportCsv);
    dom.exportJson.addEventListener('click', exportJson);

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

    // Window resize → invalidate map size
    window.addEventListener('resize', debounce(() => {
      state.map.invalidateSize();
    }, 150));

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
