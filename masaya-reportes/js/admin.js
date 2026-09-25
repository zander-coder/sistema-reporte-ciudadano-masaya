/* =========================================================
   MASAYA REPORTA — Panel administrativo
   ========================================================= */

(function(){

  // ---------- Cerrar sesión ----------
  $('#btnSalir').addEventListener('click', () => {
    db.auth.cerrarSesion();
    window.location.href = 'login.html';
  });

  // ---------- Navegación entre vistas ----------
  let mapaAdminInstance = null;

  $$('.admin-nav button').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.admin-nav button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      $$('.admin-view').forEach(v => v.classList.remove('active'));
      const vista = btn.dataset.vista;
      $('#vista' + vista.charAt(0).toUpperCase() + vista.slice(1)).classList.add('active');

      if (vista === 'kanban') pintarKanban();
      if (vista === 'mapa'){ pintarMapaAdmin(); setTimeout(() => mapaAdminInstance && mapaAdminInstance.invalidateSize(), 50); }
      if (vista === 'stats') pintarStats();
    });
  });

  // ---------- Modal de detalle ----------
  const modalOverlay = $('#modalDetalle');
  const modalContenido = $('#modalContenido');

  function abrirModal(reporte){
    const tInfo = TIPO_INFO[reporte.tipo];
    modalContenido.innerHTML = `
      <button class="icon-btn modal-close" id="btnCerrarModal" aria-label="Cerrar">${ICONS.cerrar}</button>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
        <span style="color:${tInfo.color};width:26px;height:26px;">${tipoIcono(reporte.tipo)}</span>
        <h2 style="margin:0;">${escapeHTML(tInfo.label)}</h2>
      </div>
      <p style="font-family:var(--font-display);font-weight:700;color:var(--ink-faint);font-size:var(--fs-sm);margin-bottom:16px;">${escapeHTML(reporte.codigo)} · ${formatFecha(reporte.creado)}</p>
      ${reporte.foto ? `<div class="upload-preview" style="margin-bottom:16px;"><img src="${reporte.foto}" alt="Foto del daño"></div>` : ''}
      <p>${escapeHTML(reporte.descripcion)}</p>
      ${reporte.direccionRef ? `<p><strong>Referencia:</strong> ${escapeHTML(reporte.direccionRef)}</p>` : ''}
      ${reporte.telefono ? `<p><strong>Teléfono:</strong> ${escapeHTML(reporte.telefono)}</p>` : ''}
      <div class="field">
        <label for="selectEstadoModal">Cambiar estado</label>
        <select id="selectEstadoModal" class="input">
          ${ORDEN_ESTADOS.map(e => `<option value="${e}" ${e === reporte.estado ? 'selected' : ''}>${ESTADO_INFO[e].label}</option>`).join('')}
        </select>
      </div>
      <div style="display:flex;gap:10px;">
        <button class="btn btn-primary" id="btnGuardarEstado" style="flex:1;">Guardar cambios</button>
        <button class="btn btn-danger" id="btnEliminarReporte"><span style="width:18px;height:18px;">${ICONS.papelera}</span></button>
      </div>
    `;
    modalOverlay.classList.remove('hidden');

    $('#btnCerrarModal').addEventListener('click', cerrarModal);
    modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) cerrarModal(); });

    $('#btnGuardarEstado').addEventListener('click', () => {
      const nuevo = $('#selectEstadoModal').value;
      db.reportes.actualizarEstado(reporte.id, nuevo);
      toast('Estado actualizado.', 'ok');
      cerrarModal();
      pintarKanban();
    });

    $('#btnEliminarReporte').addEventListener('click', () => {
      if (confirm('¿Eliminar este reporte? Esta acción no se puede deshacer.')){
        db.reportes.eliminar(reporte.id);
        toast('Reporte eliminado.', 'ok');
        cerrarModal();
        pintarKanban();
      }
    });
  }
  function cerrarModal(){ modalOverlay.classList.add('hidden'); modalContenido.innerHTML = ''; }

  // ---------- Kanban ----------
  function pintarKanban(){
    const board = $('#kanbanBoard');
    const reportes = db.reportes.listar();
    board.innerHTML = ORDEN_ESTADOS.map(estado => {
      const info = ESTADO_INFO[estado];
      const items = reportes.filter(r => r.estado === estado);
      return `
        <div class="kanban-col" data-estado="${estado}">
          <div class="kanban-col-head">
            <h3><span class="col-dot" style="background:${info.color}"></span>${info.label}</h3>
            <span class="count">${items.length}</span>
          </div>
          <div class="kanban-cards" data-estado="${estado}">
            ${items.length ? items.map(r => tarjetaHTML(r)).join('') : `<div class="kanban-empty">Sin reportes</div>`}
          </div>
        </div>
      `;
    }).join('');

    $$('.kanban-card').forEach(card => {
      card.addEventListener('click', () => {
        const r = db.reportes.listar().find(x => x.id === card.dataset.id);
        if (r) abrirModal(r);
      });
      card.addEventListener('dragstart', () => card.classList.add('dragging'));
      card.addEventListener('dragend', () => card.classList.remove('dragging'));
    });

    $$('.kanban-col').forEach(col => {
      col.addEventListener('dragover', (e) => { e.preventDefault(); col.classList.add('drag-over'); });
      col.addEventListener('dragleave', () => col.classList.remove('drag-over'));
      col.addEventListener('drop', (e) => {
        e.preventDefault();
        col.classList.remove('drag-over');
        const dragging = $('.kanban-card.dragging');
        if (!dragging) return;
        const id = dragging.dataset.id;
        const nuevoEstado = col.dataset.estado;
        db.reportes.actualizarEstado(id, nuevoEstado);
        pintarKanban();
      });
    });
  }

  function tarjetaHTML(r){
    const tInfo = TIPO_INFO[r.tipo];
    return `
      <div class="kanban-card" draggable="true" data-id="${r.id}">
        <div class="kc-top">
          <span class="kc-tipo" style="color:${tInfo.color};">${tInfo.label}</span>
          <span class="kc-codigo">${escapeHTML(r.codigo)}</span>
        </div>
        <p class="kc-desc">${escapeHTML(r.descripcion)}</p>
        <div class="kc-meta">
          <span>${escapeHTML(r.direccionRef || 'Sin referencia')}</span>
          <span>${formatFecha(r.creado).split(' · ')[0]}</span>
        </div>
      </div>
    `;
  }

  // ---------- Mapa admin ----------
  function pintarMapaAdmin(){
    if (mapaAdminInstance) return; // ya inicializado, solo cambia estado del contenedor
    mapaAdminInstance = L.map('mapaAdmin').setView([CENTRO_MASAYA.lat, CENTRO_MASAYA.lng], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(mapaAdminInstance);

    db.reportes.listar().forEach(r => {
      const tInfo = TIPO_INFO[r.tipo];
      const marker = L.circleMarker([r.lat, r.lng], {
        radius: 9, color: '#fff', weight: 2, fillColor: tInfo.color, fillOpacity: 1,
      }).addTo(mapaAdminInstance);
      marker.bindPopup(`
        <strong>${escapeHTML(tInfo.label)}</strong><br>
        <span class="badge ${ESTADO_INFO[r.estado].badge}">${escapeHTML(ESTADO_INFO[r.estado].label)}</span><br>
        <small>${escapeHTML(r.codigo)}</small>
      `);
    });
  }

  // ---------- Estadísticas ----------
  function pintarStats(){
    const { total, porTipo, porEstado } = db.reportes.estadisticas();
    const resueltos = porEstado.resuelto || 0;

    $('#statsCards').innerHTML = `
      <div class="card stat-card"><div class="num">${total}</div><div class="lbl">Reportes totales</div></div>
      <div class="card stat-card"><div class="num" style="color:var(--st-recibido)">${porEstado.recibido || 0}</div><div class="lbl">Recibidos</div></div>
      <div class="card stat-card"><div class="num" style="color:var(--st-proceso)">${porEstado.proceso || 0}</div><div class="lbl">En proceso</div></div>
      <div class="card stat-card"><div class="num" style="color:var(--st-resuelto)">${resueltos}</div><div class="lbl">Resueltos</div></div>
    `;

    const maxTipo = Math.max(1, ...Object.values(porTipo));
    $('#chartTipo').innerHTML = Object.entries(porTipo).map(([key, val]) => `
      <div class="bar-row">
        <span class="bar-label">${TIPO_INFO[key].label}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${(val / maxTipo) * 100}%;background:${TIPO_INFO[key].color}"></div></div>
        <span class="bar-value">${val}</span>
      </div>
    `).join('');

    const maxEstado = Math.max(1, ...Object.values(porEstado));
    $('#chartEstado').innerHTML = Object.entries(porEstado).map(([key, val]) => `
      <div class="bar-row">
        <span class="bar-label">${ESTADO_INFO[key].label}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${(val / maxEstado) * 100}%;background:${ESTADO_INFO[key].color}"></div></div>
        <span class="bar-value">${val}</span>
      </div>
    `).join('');
  }

  pintarKanban();
})();
