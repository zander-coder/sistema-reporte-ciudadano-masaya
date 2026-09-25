/* =========================================================
   MASAYA REPORTA — Consulta pública de seguimiento
   ========================================================= */

(function(){
  const resultado = $('#resultado');
  let miniMap = null;

  function renderStepper(reporte){
    const actualIdx = ORDEN_ESTADOS.indexOf(reporte.estado);
    return `<div class="stepper">` + ORDEN_ESTADOS.map((est, idx) => {
      const info = ESTADO_INFO[est];
      const hist = reporte.historial.find(h => h.estado === est);
      const estadoClase = idx < actualIdx ? 'done' : idx === actualIdx ? 'current' : '';
      return `
        <div class="step ${estadoClase}">
          <div class="step-marker">${idx < actualIdx ? '✓' : idx + 1}</div>
          <div class="step-body">
            <h4>${escapeHTML(info.label)}</h4>
            ${hist ? `<time>${formatFecha(hist.fecha)}</time>` : `<p style="color:var(--ink-faint);">Pendiente</p>`}
          </div>
        </div>`;
    }).join('') + `</div>`;
  }

  function renderDetalle(reporte){
    const tInfo = TIPO_INFO[reporte.tipo];
    const eInfo = ESTADO_INFO[reporte.estado];
    resultado.innerHTML = `
      <div class="card" style="margin-bottom:20px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:6px;">
          <div>
            <h2 style="margin-bottom:4px;">${escapeHTML(tInfo.label)}</h2>
            <span class="badge ${eInfo.badge}">${escapeHTML(eInfo.label)}</span>
          </div>
          <span style="color:${tInfo.color};width:30px;height:30px;">${tipoIcono(reporte.tipo)}</span>
        </div>
        <p style="margin:12px 0 0;">${escapeHTML(reporte.descripcion)}</p>
        ${reporte.direccionRef ? `<p style="margin-top:4px;font-size:var(--fs-sm);"><strong>Referencia:</strong> ${escapeHTML(reporte.direccionRef)}</p>` : ''}
        ${reporte.foto ? `<div class="upload-preview" style="margin-top:12px;"><img src="${reporte.foto}" alt="Foto del daño reportado"></div>` : ''}
        <div class="mini-map" id="miniMapaResultado"></div>
      </div>
      <div class="card">
        <h3 style="margin-bottom:20px;">Estado del trámite</h3>
        ${renderStepper(reporte)}
      </div>
    `;

    if (miniMap) { miniMap.remove(); miniMap = null; }
    miniMap = L.map('miniMapaResultado', { zoomControl: false, dragging: false, scrollWheelZoom: false })
      .setView([reporte.lat, reporte.lng], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(miniMap);
    L.marker([reporte.lat, reporte.lng]).addTo(miniMap);
  }

  function renderLista(reportes){
    if (!reportes.length){
      resultado.innerHTML = `<div class="card" style="text-align:center;color:var(--ink-faint);">No encontramos reportes con esos datos.</div>`;
      return;
    }
    resultado.innerHTML = `<div class="card"><h3 style="margin-bottom:16px;">Reportes encontrados</h3>` +
      reportes.map(r => `
        <button class="kanban-card" style="width:100%;text-align:left;margin-bottom:10px;cursor:pointer;" data-codigo="${escapeHTML(r.codigo)}">
          <div class="kc-top">
            <span class="kc-tipo">${escapeHTML(TIPO_INFO[r.tipo].label)}</span>
            <span class="badge ${ESTADO_INFO[r.estado].badge}">${escapeHTML(ESTADO_INFO[r.estado].label)}</span>
          </div>
          <p class="kc-desc">${escapeHTML(r.descripcion)}</p>
          <div class="kc-meta"><span>${escapeHTML(r.codigo)}</span><span>${formatFecha(r.creado)}</span></div>
        </button>
      `).join('') + `</div>`;

    $$('#resultado [data-codigo]').forEach(btn => {
      btn.addEventListener('click', () => buscar({ codigo: btn.dataset.codigo }));
    });
  }

  function buscar({ codigo, telefono }){
    const res = db.reportes.buscar({ codigo, telefono });
    if (Array.isArray(res)) renderLista(res);
    else if (res) renderDetalle(res);
    else resultado.innerHTML = `<div class="card" style="text-align:center;color:var(--ink-faint);">No encontramos ningún reporte con ese código. Revisá que esté bien escrito.</div>`;
  }

  $('#formBuscar').addEventListener('submit', (e) => {
    e.preventDefault();
    const codigo = $('#inputCodigo').value.trim();
    const telefono = $('#inputTelefono').value.trim();
    if (!codigo && !telefono){
      toast('Ingresá un código o un teléfono.', 'error');
      return;
    }
    buscar(codigo ? { codigo } : { telefono });
  });

  const params = new URLSearchParams(location.search);
  const codigoInicial = params.get('codigo');
  if (codigoInicial){
    $('#inputCodigo').value = codigoInicial;
    buscar({ codigo: codigoInicial });
  }
})();
