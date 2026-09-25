/* =========================================================
   MASAYA REPORTA — Utilidades compartidas
   ========================================================= */

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

function escapeHTML(str = ''){
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function formatFecha(iso){
  const d = new Date(iso);
  return d.toLocaleDateString('es-NI', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit' });
}

function generarCodigo(){
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const num = Math.floor(1000 + Math.random() * 9000);
  const l = letras[Math.floor(Math.random() * letras.length)] + letras[Math.floor(Math.random() * letras.length)];
  return `MSY-${l}${num}`;
}

function toast(msg, tipo = 'info'){
  let region = $('#toast-region');
  if (!region){
    region = document.createElement('div');
    region.id = 'toast-region';
    document.body.appendChild(region);
  }
  const el = document.createElement('div');
  el.className = `toast ${tipo === 'ok' ? 'ok' : tipo === 'error' ? 'error' : ''}`;
  el.textContent = msg;
  region.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

const TIPO_INFO = {
  bache:      { label: 'Bache',              color: 'var(--tipo-bache)',     icono: 'bache' },
  luminaria:  { label: 'Luminaria dañada',   color: 'var(--tipo-luminaria)', icono: 'luminaria' },
  fuga:       { label: 'Fuga de agua',       color: 'var(--tipo-fuga)',      icono: 'fuga' },
  otro:       { label: 'Otro daño',          color: 'var(--tipo-otro)',      icono: 'otro' },
};

const ESTADO_INFO = {
  recibido: { label: 'Recibido',    badge: 'badge-recibido', color: 'var(--st-recibido)' },
  revision: { label: 'En revisión', badge: 'badge-revision', color: 'var(--st-revision)' },
  proceso:  { label: 'En proceso',  badge: 'badge-proceso',  color: 'var(--st-proceso)' },
  resuelto: { label: 'Resuelto',    badge: 'badge-resuelto', color: 'var(--st-resuelto)' },
};

const ORDEN_ESTADOS = ['recibido', 'revision', 'proceso', 'resuelto'];
