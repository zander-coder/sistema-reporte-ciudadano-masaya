/* =========================================================
   MASAYA REPORTA — Mapa público de reportes
   ========================================================= */

(function(){
  const map = L.map('mapaPublico', { zoomControl: false }).setView([CENTRO_MASAYA.lat, CENTRO_MASAYA.lng], 14);
  L.control.zoom({ position: 'bottomright' }).addTo(map);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; colaboradores de OpenStreetMap',
    maxZoom: 19,
  }).addTo(map);

  let markersLayer = L.layerGroup().addTo(map);
  const filtroTipos = new Set(Object.keys(TIPO_INFO));
  const filtroEstados = new Set(Object.keys(ESTADO_INFO));

  function pinDivIcon(colorVar, svg){
    return L.divIcon({
      className: '',
      html: `<div style="
        width:32px;height:32px;border-radius:50% 50% 50% 0;
        background:${colorVar};transform:rotate(-45deg);
        display:flex;align-items:center;justify-content:center;
        box-shadow:0 3px 8px rgba(0,0,0,.35); border:2px solid #fff;">
        <div style="transform:rotate(45deg);width:16px;height:16px;color:#fff;">${svg}</div>
      </div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -30],
    });
  }

  function pintarMapa(){
    markersLayer.clearLayers();
    const reportes = db.reportes.listar().filter(r => filtroTipos.has(r.tipo) && filtroEstados.has(r.estado));
    reportes.forEach(r => {
      const tInfo = TIPO_INFO[r.tipo];
      const eInfo = ESTADO_INFO[r.estado];
      const marker = L.marker([r.lat, r.lng], { icon: pinDivIcon(tInfo.color, tipoIcono(r.tipo)) });
      marker.bindPopup(`
        <div style="font-family:'Inter',sans-serif;min-width:200px;">
          <strong style="font-family:'Manrope',sans-serif;">${escapeHTML(tInfo.label)}</strong>
          <div style="margin:4px 0;"><span class="badge ${eInfo.badge}">${escapeHTML(eInfo.label)}</span></div>
          <div style="font-size:12px;color:#5B6B70;margin-bottom:6px;">${escapeHTML(r.direccionRef || '')}</div>
          <a href="seguimiento.html?codigo=${encodeURIComponent(r.codigo)}" style="font-size:12px;font-weight:700;">Ver seguimiento →</a>
        </div>
      `);
      markersLayer.addLayer(marker);
    });
  }

  function renderFiltros(){
    const contTipo = $('#filtrosTipo');
    contTipo.innerHTML = Object.entries(TIPO_INFO).map(([key, info]) => `
      <button class="chip" data-grupo="tipo" data-valor="${key}" aria-pressed="true">
        <span class="dot" style="background:${info.color}"></span>${info.label}
      </button>
    `).join('');

    const contEstado = $('#filtrosEstado');
    contEstado.innerHTML = Object.entries(ESTADO_INFO).map(([key, info]) => `
      <button class="chip" data-grupo="estado" data-valor="${key}" aria-pressed="true">
        <span class="dot" style="background:${info.color}"></span>${info.label}
      </button>
    `).join('');

    $$('.chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const grupo = chip.dataset.grupo;
        const valor = chip.dataset.valor;
        const set = grupo === 'tipo' ? filtroTipos : filtroEstados;
        const activo = chip.getAttribute('aria-pressed') === 'true';
        if (activo){ set.delete(valor); chip.setAttribute('aria-pressed', 'false'); }
        else { set.add(valor); chip.setAttribute('aria-pressed', 'true'); }
        pintarMapa();
      });
    });
  }

  function renderLeyenda(){
    $('#leyenda').innerHTML = `<strong style="font-size:12px;margin-bottom:2px;">Tipo de daño</strong>` +
      Object.values(TIPO_INFO).map(info => `
        <div class="leyenda-item"><span class="leyenda-punto" style="background:${info.color}"></span>${info.label}</div>
      `).join('');
  }

  renderFiltros();
  renderLeyenda();
  pintarMapa();
})();
