/* =========================================================
   MASAYA REPORTA — Formulario de nuevo reporte
   ========================================================= */

(function(){
  // ---- Selector de tipo de daño ----
  const tipoGrid = $('#tipoGrid');
  tipoGrid.innerHTML = Object.entries(TIPO_INFO).map(([key, info], i) => `
    <label class="tipo-opcion" style="position:relative;">
      <input type="radio" name="tipo" value="${key}" ${i === 0 ? 'checked' : ''}>
      <span style="color:${info.color}">${tipoIcono(key)}</span>
      <span>${info.label}</span>
    </label>
  `).join('');

  // ---- Foto ----
  const inputFoto = $('#inputFoto');
  const previewBox = $('#previewBox');
  const previewImg = $('#previewImg');
  let fotoArchivo = null;

  inputFoto.addEventListener('change', () => {
    const file = inputFoto.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024){
      toast('La foto supera los 5MB. Elegí una más liviana.', 'error');
      inputFoto.value = '';
      return;
    }
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)){
      toast('La foto debe ser JPG, PNG o WEBP.', 'error');
      inputFoto.value = '';
      return;
    }
    fotoArchivo = file; // se envía tal cual al backend (multipart/form-data)
    const reader = new FileReader();
    reader.onload = (e) => {
      previewImg.src = e.target.result; // solo para la vista previa local
      previewBox.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  });

  // ---- Mini mapa: marcar ubicación ----
  const map = L.map('miniMapa').setView([CENTRO_MASAYA.lat, CENTRO_MASAYA.lng], 14);
  capaBase(map);

  let marker = null;
  let ubicacion = null;
  const coordsTexto = $('#coordsTexto');

  function setUbicacion(lat, lng){
    ubicacion = { lat, lng };
    if (marker) map.removeLayer(marker);
    marker = L.marker([lat, lng]).addTo(map);
    coordsTexto.textContent = `Ubicación marcada: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }

  map.on('click', (e) => setUbicacion(e.latlng.lat, e.latlng.lng));

  $('#btnGps').addEventListener('click', () => {
    if (!navigator.geolocation){
      toast('Tu navegador no soporta geolocalización.', 'error');
      return;
    }
    toast('Buscando tu ubicación…');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUbicacion(pos.coords.latitude, pos.coords.longitude);
        map.setView([pos.coords.latitude, pos.coords.longitude], 16);
        toast('Ubicación detectada.', 'ok');
      },
      () => toast('No se pudo obtener tu ubicación. Marcá el punto en el mapa.', 'error')
    );
  });

  // ---- Envío del formulario ----
  $('#formReporte').addEventListener('submit', async (e) => {
    e.preventDefault();
    const tipo = $('input[name="tipo"]:checked').value;
    const descripcion = $('#descripcion').value.trim();

    if (!descripcion){
      toast('Describí brevemente el daño.', 'error');
      return;
    }
    if (!ubicacion){
      toast('Marcá la ubicación del daño en el mapa.', 'error');
      return;
    }

    const boton = e.target.querySelector('button[type="submit"]');
    boton.disabled = true;
    boton.textContent = 'Enviando…';
    try {
      const nuevo = await api.reportes.crear({
        tipo,
        descripcion,
        direccionRef: $('#direccionRef').value.trim(),
        telefono: $('#telefono').value.trim(),
        lat: ubicacion.lat,
        lng: ubicacion.lng,
        foto: fotoArchivo,
      });
      window.location.href = `confirmacion.html?codigo=${encodeURIComponent(nuevo.codigo)}`;
    } catch (err){
      toast(err.paraUsuario ? err.paraUsuario() : 'No se pudo enviar el reporte.', 'error');
      boton.disabled = false;
      boton.textContent = 'Enviar reporte';
    }
  });
})();
