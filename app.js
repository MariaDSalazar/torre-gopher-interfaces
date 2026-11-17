'use strict';
// Torre Gopher · juego breve de repaso de interfaces en Go (semanas 11 y 12 de POO).
// La torre tiene 12 bloques; cada uno esconde una pregunta. Si se responde bien, el bloque sale y sube a la cima;
// si se falla, la torre pierde un soporte y se tambalea; sin soportes, se derrumba y se reconstruye.
// Las respuestas no están en la página: se guarda su huella SHA-256 y la explicación va cifrada (datos.js).

const J = window.JUEGO;
const CLAVE = 'torre-gopher-interfaces-v1';
const SOPORTES = 3;
const Q = Object.fromEntries(J.preguntas.map(q => [q.id, q]));
const TOTAL = J.preguntas.length;
let E = null, ocupado = false;

/* ---------------- estado guardado ---------------- */
// fuera: bloques ya respondidos en esta ronda (en orden) · primer: acierto o fallo de la primera respuesta de cada bloque
const nuevo = (nombre = '', apellido = '') => ({ nombre, apellido, fuera: [], soportes: SOPORTES, primer: {}, rondas: 1, completo: false });
function cargar() {
  try { return { ...nuevo(), ...JSON.parse(localStorage.getItem(CLAVE)) }; } catch { return nuevo(); }
}
const guardar = () => localStorage.setItem(CLAVE, JSON.stringify(E));
const aciertosPrimer = () => J.preguntas.filter(q => E.primer[q.id] === true).length;

/* ---------------- utilidades ---------------- */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const KW = /^(type|struct|interface|func|var|return|package|import|for|range|if|else|switch|case|default|map|nil|true|false)$/;
const TIPO = /^(string|int|bool|float64|error|any)$/;
function resaltar(src) {
  return src.replace(/(\/\/[^\n]*)|("(?:[^"\\]|\\.)*")|([A-Za-z_]\w*)|(\d+(?:\.\d+)?)|([\s\S])/g, (m, c, s, w, num) => {
    if (c) return `<span class="c">${esc(c)}</span>`;
    if (s) return `<span class="s">${esc(s)}</span>`;
    if (w) return KW.test(w) ? `<span class="k">${w}</span>` : TIPO.test(w) ? `<span class="t">${w}</span>` : w;
    if (num) return `<span class="n">${num}</span>`;
    return esc(m);
  });
}
const PARTICULAS = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'e']);
function nombreBonito(s) {
  return s.trim().replace(/\s+/g, ' ').toLowerCase().split(' ')
    .map((p, i) => i > 0 && PARTICULAS.has(p) ? p : p.replace(/(^|['-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase()))
    .join(' ');
}
const abrirCon = async (dato, ...partes) => Cifra.abrir(await Cifra.llave(...partes), dato);
const ESCUDO = ic('<path d="M12 3 4.5 6v5.5c0 4.4 3.1 8.2 7.5 9.5 4.4-1.3 7.5-5.1 7.5-9.5V6z" fill="currentColor"/>');
const MASCOTA = { casco: true, ojos: 'arriba', cejas: 'decidido' };
function confeti() {
  const c = document.createElement('div'); c.className = 'confeti';
  const colores = ['#EAAA00', '#FFFFFF', '#910048', '#6AD7E5', '#1E9E5A'];
  c.innerHTML = Array.from({ length: 70 }, () => `<i style="left:${Math.random() * 100}%;background:${colores[Math.floor(Math.random() * colores.length)]};animation-duration:${2 + Math.random() * 2.5}s;animation-delay:${Math.random() * .8}s"></i>`).join('');
  document.body.appendChild(c);
  setTimeout(() => c.remove(), 5000);
}

function pintar(html, clase = '') {
  const quien = E && E.nombre ? `<div class="jugador"><b>${esc(E.nombre)} ${esc(E.apellido)}</b>${E.completo ? 'Torre completa' : `${E.fuera.length} de ${TOTAL} bloques`}</div>` : '';
  document.body.innerHTML = `<header class="top"><div class="logo">${gopherSvg(MASCOTA)}<span>Torre <b>Gopher</b></span></div><div class="der">${quien}</div></header>
    <main id="app" class="${clase}">${html}</main>
    <dialog id="dlg" aria-labelledby="dlg-titulo"><div class="dlg-cuerpo" id="dlgc"></div><div class="dlg-pie" id="dlgpie"></div></dialog>`;
  window.scrollTo({ top: 0 });
}
function abrirDlg(html, pie) {
  $('#dlgc').innerHTML = html;
  $('#dlgpie').innerHTML = pie;
  const d = $('#dlg');
  if (!d.open) d.showModal();
  $('#dlgc').scrollTop = 0;
}
const cerrarDlg = () => { const d = $('#dlg'); if (d && d.open) d.close(); };

/* ---------------- inicio ---------------- */
function inicio() {
  const chips = J.temas.map(c => `<span class="chip oscuro">${esc(c)}</span>`).join('');
  const registro = E.nombre
    ? `<h2>Hola de nuevo, ${esc(E.nombre)}</h2><p class="suave">${E.completo ? 'Ya completaste la torre.' : `Llevas ${E.fuera.length} de ${TOTAL} bloques.`}</p>
       <div class="fila-btn"><button class="btn grande" id="seguir">${E.completo ? `${ICONO.trofeo} Ver mi certificado` : `Seguir construyendo ${ICONO.sig}`}</button></div>
       <div class="fila-btn"><button class="btn sec" id="otro">Soy otra persona / empezar de nuevo</button></div>`
    : `<h2>Registro</h2><p class="suave">Escribe tu nombre y tu apellido: aparecerán en tu certificado.</p>
       <label for="nom">Nombre</label><input type="text" id="nom" autocomplete="given-name" maxlength="30">
       <label for="ape">Apellido</label><input type="text" id="ape" autocomplete="family-name" maxlength="30">
       <p class="aviso" id="aviso"></p>
       <button class="btn grande" id="empezar">Empezar ${ICONO.sig}</button>`;
  pintar(`<section class="portada">${gopherSvg({ casco: true, ojos: 'arriba', boca: 'abierta', cejas: 'decidido' })}
      <h1>Torre <b>Gopher</b></h1>
      <p>Interfaces en Go · repaso de las semanas 11 y 12</p>
      <div class="chips-niveles">${chips}</div></section>
    <div class="card">${registro}</div>
    <div class="card"><h2>${ICONO.ayuda} Cómo se juega</h2>
      <p>La torre tiene <b>${TOTAL} bloques</b> y cada uno esconde una pregunta sobre interfaces. Toca un bloque para sacarlo.</p>
      <p>Si respondes bien, el bloque sale y <b>sube a la cima</b>. Si fallas, la torre se tambalea y pierde un <b>soporte</b>. Con ${SOPORTES} fallos la torre se derrumba y se vuelve a armar: las preguntas son las mismas.</p>
      <p>Cuando todos los bloques estén en la cima, la torre queda completa y recibes tu <b>certificado</b>. Tu progreso se guarda en este dispositivo.</p></div>`);
  if (E.nombre) {
    $('#seguir').onclick = E.completo ? certificado : juego;
    $('#otro').onclick = () => { if (confirm('Se borrará el progreso guardado en este dispositivo. ¿Continuar?')) { E = nuevo(); guardar(); inicio(); } };
    return;
  }
  const valido = s => /^[\p{L}][\p{L}' -]{1,29}$/u.test(s.trim());
  const empezar = () => {
    const n = $('#nom').value, a = $('#ape').value;
    if (!valido(n) || !valido(a)) { $('#aviso').textContent = 'Escribe tu nombre y tu apellido (solo letras).'; return; }
    E = nuevo(nombreBonito(n), nombreBonito(a));
    guardar();
    juego();
  };
  $('#empezar').onclick = empezar;
  ['#nom', '#ape'].forEach(s => $(s).addEventListener('keydown', e => { if (e.key === 'Enter') empezar(); }));
}

/* ---------------- la torre ---------------- */
// 4 pisos de 3 bloques (el orden de J.orden, de abajo hacia arriba). Un piso vacío desaparece y lo de arriba baja.
const pisos = () => [0, 1, 2, 3].map(p => J.orden.slice(p * 3, p * 3 + 3));
function inclinacion() {
  let s = 0;
  pisos().forEach(ids => {
    const quedan = ids.map((id, i) => E.fuera.includes(id) ? null : i - 1).filter(x => x !== null);
    if (quedan.length && quedan.length < 3) s += quedan.reduce((a, b) => a + b, 0) / quedan.length;
  });
  return Math.max(-5, Math.min(5, s * 1.6));
}
function bloqueHTML(id, i, cruzado) {
  const q = Q[id];
  return `<button class="bloque${cruzado ? ' cruzado' : ''}${E.fuera.includes(id) ? ' hueco' : ''}" data-id="${id}" style="--i:${i}"
    aria-label="Bloque de ${esc(q.tema)}" ${E.fuera.includes(id) ? 'tabindex="-1" aria-hidden="true"' : ''}><span>${esc(q.tema)}</span></button>`;
}
function cimaHTML() {
  const filas = [];
  for (let k = 0; k < E.fuera.length; k += 3) filas.push(E.fuera.slice(k, k + 3));
  return filas.map((f, n) => `<div class="piso cima${n % 2 ? ' cruzado' : ''}">${f.map(id => `<div class="bloque puesto" data-id="${id}">${ICONO.bien}<span>${esc(Q[id].tema)}</span></div>`).join('')}</div>`).reverse().join('');
}
function torreHTML() {
  const base = pisos().map((ids, p) => ids.every(id => E.fuera.includes(id)) ? ''
    : `<div class="piso${p % 2 ? ' cruzado' : ''}">${ids.map((id, i) => bloqueHTML(id, i, p % 2)).join('')}</div>`).reverse().join('');
  return `<div class="gopher-cima">${gopherSvg(E.completo ? { casco: true, ojos: 'feliz', boca: 'abierta' } : MASCOTA)}</div>${cimaHTML()}${base}`;
}
function soportesHTML() {
  return Array.from({ length: SOPORTES }, (_, i) => `<span class="soporte${i < E.soportes ? '' : ' roto'}">${ESCUDO}</span>`).join('');
}
function juego() {
  pintar(`<div class="tablero-torre">
      <div class="escena"><div class="torre" id="torre" style="--incl:${inclinacion()}deg">${torreHTML()}</div><div class="mesa"></div></div>
      <aside class="card panel-torre">
        <h2>${ICONO.trofeo} Tu torre</h2>
        <div class="dato"><b>${E.fuera.length}</b><span>de ${TOTAL} bloques en la cima</span></div>
        <div class="progreso claro"><i style="width:${Math.round(E.fuera.length / TOTAL * 100)}%"></i></div>
        <div class="dato"><span class="soportes">${soportesHTML()}</span><span>soportes</span></div>
        <p class="suave">Toca un bloque de la torre para responder su pregunta. ${E.rondas > 1 ? `Ronda ${E.rondas}.` : ''}</p>
        ${E.completo ? `<div class="fila-btn"><button class="btn grande" id="cert">${ICONO.trofeo} Ver mi certificado</button></div>` : ''}
        <div class="fila-btn"><button class="btn sec" id="ini">Inicio</button>${E.completo ? `<button class="btn sec" id="inf">${ICONO.informe} Informe</button>` : ''}</div>
      </aside></div>`, 'pantalla-torre');
  $$('.bloque:not(.hueco):not(.puesto)').forEach(b => { b.onclick = () => pregunta(b.dataset.id); });
  $('#ini').onclick = inicio;
  if (E.completo) { $('#cert').onclick = certificado; $('#inf').onclick = informe; }
}

/* ---------------- una pregunta ---------------- */
function pregunta(id) {
  if (ocupado || E.completo) return;
  const q = Q[id], codigo = q.codigo ? `<pre class="go">${resaltar(q.codigo)}</pre>` : '';
  const mono = q.cod || q.codigo;
  abrirDlg(`<span class="chip">${esc(q.tema)}</span>
      <h3 class="pregunta" id="dlg-titulo">${q.enunciado}</h3>${codigo}
      <div class="opciones">${q.opciones.map((o, i) => `<button class="op${mono ? ' cod' : ''}" data-i="${i}">${esc(o)}</button>`).join('')}</div>
      <div id="retro"></div>`,
    `<button class="btn sec" id="volver">Elegir otro bloque</button>`);
  $('#volver').onclick = cerrarDlg;
  $$('#dlg .op').forEach(b => { b.onclick = () => responder(q, b); });
  $$('#dlg .op')[0].focus();
}
async function responder(q, boton) {
  if (ocupado) return;
  ocupado = true;
  const texto = q.opciones[+boton.dataset.i];
  const bien = (await Cifra.huella(J.sal, q.id, texto)) === q.h;
  if (!(q.id in E.primer)) E.primer[q.id] = bien;
  if (bien) {
    const r = await abrirCon(q.x, J.sal, q.id, texto);
    $$('#dlg .op').forEach(b => { b.disabled = true; });
    boton.classList.add('ok');
    const term = r.real && r.tipo ? `<div class="terminal${r.tipo === 'error' ? ' mal' : ''}"><div class="term-cab">${ICONO.terminal}<span>${r.tipo === 'error' ? 'Go responde:' : 'Go imprime:'}</span></div><pre>${esc(r.real)}</pre></div>` : '';
    $('#retro').innerHTML = `<div class="retro ok">${gopherSvg({ casco: true, ojos: 'feliz', boca: 'abierta' })}<div><h3>¡Correcto!</h3><p>${r.por}</p></div></div>${term}`;
    $('#dlgpie').innerHTML = `<button class="btn grande" id="sacar">Sacar el bloque y subirlo a la cima ${ICONO.sig}</button>`;
    $('#sacar').onclick = () => { cerrarDlg(); sacar(q.id); };
    $('#sacar').focus();
    guardar();
    ocupado = false;
    return;
  }
  boton.classList.add('no'); boton.disabled = true;
  E.soportes = Math.max(0, E.soportes - 1);
  guardar();
  $('#retro').innerHTML = `<div class="retro no">${gopherSvg({ casco: true, ojos: 'x', boca: 'abierta' })}<div><h3>No es correcto</h3>
      <p><b>Pista:</b> ${q.pista}</p><p>${E.soportes ? `La torre se tambalea: te ${E.soportes === 1 ? 'queda 1 soporte' : `quedan ${E.soportes} soportes`}.` : 'La torre ya no tiene soportes.'}</p></div></div>`;
  $$('.soporte').forEach((s, i) => s.classList.toggle('roto', i >= E.soportes));
  const t = $('#torre'); t.classList.remove('tambalea'); void t.offsetWidth; t.classList.add('tambalea');
  if (!E.soportes) {
    $$('#dlg .op').forEach(b => { b.disabled = true; });
    $('#dlgpie').innerHTML = `<button class="btn grande" id="caer">Continuar</button>`;
    $('#caer').onclick = () => { cerrarDlg(); derrumbe(); };
  }
  ocupado = false;
}

/* ---------------- sacar un bloque: vuela a la cima ---------------- */
function sacar(id) {
  ocupado = true;
  const b = $(`.bloque[data-id="${id}"]`), r = b.getBoundingClientRect(), torre = $('#torre').getBoundingClientRect();
  const vuela = b.cloneNode(true);
  vuela.classList.add('vuela'); vuela.removeAttribute('data-id');
  Object.assign(vuela.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
  document.body.appendChild(vuela);
  b.classList.add('saliendo');
  requestAnimationFrame(() => {
    vuela.style.transform = `translate(${torre.left + torre.width / 2 - r.left - r.width / 2}px, ${torre.top - r.top - 20}px) rotate(${b.classList.contains('cruzado') ? 0 : 0}deg)`;
  });
  setTimeout(() => {
    vuela.remove();
    E.fuera.push(id);
    if (E.fuera.length === TOTAL) E.completo = true;
    guardar();
    juego();
    ocupado = false;
    const nuevoBloque = $(`.bloque.puesto[data-id="${id}"]`);
    if (nuevoBloque) nuevoBloque.classList.add('llega');
    if (E.completo) completa();
  }, 700);
}

/* ---------------- derrumbe y torre completa ---------------- */
function derrumbe() {
  ocupado = true;
  $$('#torre .bloque, #torre .gopher-cima').forEach(b => {
    b.style.setProperty('--dx', `${(Math.random() * 2 - 1) * 240}px`);
    b.style.setProperty('--rot', `${(Math.random() * 2 - 1) * 200}deg`);
    b.style.setProperty('--retraso', `${Math.random() * .35}s`);
    b.classList.add('derrumbado');
  });
  setTimeout(() => {
    ocupado = false;
    abrirDlg(`<div class="retro no">${gopherSvg({ casco: true, ojos: 'x', boca: 'abierta' })}<div><h3 id="dlg-titulo">¡Se derrumbó la torre!</h3>
        <p>Subiste ${E.fuera.length} de ${TOTAL} bloques antes de la caída. Vuelve a construirla: las preguntas son las mismas y ya viste las pistas.</p></div></div>`,
      `<button class="btn grande" id="rearmar">Reconstruir la torre ${ICONO.sig}</button>`);
    $('#rearmar').onclick = () => { E.fuera = []; E.soportes = SOPORTES; E.rondas++; guardar(); cerrarDlg(); juego(); };
  }, 1700);
}
function completa() {
  confeti();
  abrirDlg(`<div class="retro ok">${gopherSvg({ casco: true, ojos: 'feliz', boca: 'abierta' })}<div><h3 id="dlg-titulo">¡Torre completa!</h3>
      <p>Subiste los ${TOTAL} bloques a la cima. Acertaste ${aciertosPrimer()} de ${TOTAL} al primer intento.</p></div></div>`,
    `<button class="btn sec" id="dinf">${ICONO.informe} Ver mi informe</button><button class="btn grande" id="dcert">${ICONO.trofeo} Ver mi certificado</button>`);
  $('#dinf').onclick = () => { cerrarDlg(); informe(); };
  $('#dcert').onclick = () => { cerrarDlg(); certificado(); };
}

/* ---------------- informe ---------------- */
const nivelTema = p => p >= 80 ? 'Lo domina' : p >= 50 ? 'En proceso' : 'Debe repasarlo';
function porTema() {
  return J.temas.map(t => {
    const qs = J.preguntas.filter(q => q.tema === t), bien = qs.filter(q => E.primer[q.id] === true).length;
    return { tema: t, bien, total: qs.length, p: Math.round(bien / qs.length * 100) };
  });
}
function informe() {
  if (!E.completo) { juego(); return; }
  const temas = porTema(), a = aciertosPrimer(), p = Math.round(a / TOTAL * 100);
  pintar(`<div class="card"><h2>${ICONO.informe} Informe</h2>
      <p><b>${esc(E.nombre)} ${esc(E.apellido)}</b> · ${a} de ${TOTAL} bloques acertados al primer intento (${p} %) · ${E.rondas} ${E.rondas === 1 ? 'ronda' : 'rondas'}</p>
      <div class="temas">${temas.map(x => `<div class="tema"><b>${esc(x.tema)}</b><div class="barra"><i class="${x.p >= 80 ? '' : x.p >= 50 ? 'medio' : 'bajo'}" style="width:${x.p}%"></i></div>
        <span>${x.bien}/${x.total}</span><small>${nivelTema(x.p)}</small></div>`).join('')}</div>
      <div class="fila-btn no-imprimir"><button class="btn grande" id="cert">${ICONO.trofeo} Ver mi certificado</button></div>
      <div class="fila-btn no-imprimir"><button class="btn sec" id="copiar">${ICONO.copiar} Copiar el informe</button>
        <button class="btn sec" id="imprimir">${ICONO.imprimir} Imprimir</button><button class="btn sec" id="torreb">Ver la torre</button></div>
      <p class="aviso" id="aviso"></p></div>`);
  $('#cert').onclick = certificado;
  $('#torreb').onclick = juego;
  $('#imprimir').onclick = () => window.print();
  $('#copiar').onclick = async () => {
    const txt = `Torre Gopher · ${E.nombre} ${E.apellido}\n${a} de ${TOTAL} al primer intento (${p} %) · ${E.rondas} ronda(s)\n` +
      temas.map(x => `${x.tema}: ${x.bien}/${x.total} · ${nivelTema(x.p)}`).join('\n');
    try { await navigator.clipboard.writeText(txt); $('#aviso').style.color = 'var(--bien)'; $('#aviso').textContent = 'Informe copiado.'; }
    catch { $('#aviso').textContent = 'No se pudo copiar; usa «Imprimir».'; }
  };
}

/* ---------------- certificado ---------------- */
function rango(p) { return p >= 90 ? 'Arquitecto de interfaces' : p >= 75 ? 'Constructor experto' : p >= 50 ? 'Constructor avanzado' : 'Aprendiz constructor'; }
function codigo(texto) {
  let h = 0x811c9dc5;
  for (const ch of texto) { h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
  const s = h.toString(36).toUpperCase().padStart(8, '0').slice(-8);
  return s.slice(0, 4) + '-' + s.slice(4);
}
function caja(x, a, b, w, h, r) { x.beginPath(); if (x.roundRect) x.roundRect(a, b, w, h, r); else x.rect(a, b, w, h); }
const cargarImg = src => new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = src; });
async function dibujarCertificado() {
  try { await Promise.all([document.fonts.load('800 60px Poppins'), document.fonts.load('600 30px Poppins'), document.fonts.load('400 28px Poppins')]); } catch { /* fuente del sistema */ }
  const W = 1600, H = 1131, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  const AZUL = '#002C71', DORADO = '#EAAA00', MAG = '#910048', GRIS = '#4a5461';
  x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
  x.fillStyle = '#fbf7ec'; x.fillRect(60, 60, W - 120, H - 120);
  x.strokeStyle = DORADO; x.lineWidth = 16; x.strokeRect(28, 28, W - 56, H - 56);
  x.strokeStyle = AZUL; x.lineWidth = 3; x.strokeRect(60, 60, W - 120, H - 120);
  x.fillStyle = DORADO;
  [[60, 60, 1, 1], [W - 60, 60, -1, 1], [60, H - 60, 1, -1], [W - 60, H - 60, -1, -1]].forEach(([a, b, sx, sy]) => {
    x.beginPath(); x.moveTo(a, b); x.lineTo(a + 84 * sx, b); x.lineTo(a, b + 84 * sy); x.closePath(); x.fill();
  });
  x.textAlign = 'left'; x.font = '800 50px Poppins, sans-serif';
  x.fillStyle = AZUL; x.fillText('Torre', 130, 150);
  x.fillStyle = DORADO; x.fillText('Gopher', 130, 206);
  // pequeña torre de bloques junto al título
  for (let f = 0; f < 4; f++) for (let k = 0; k < 3; k++) {
    x.fillStyle = (f + k) % 2 ? DORADO : '#d79a00'; caja(x, 340 + k * 40, 196 - f * 26, 36, 22, 4); x.fill();
  }
  try {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 136" width="240" height="272">${gopher({ casco: true, ojos: 'feliz', boca: 'abierta' })}</svg>`;
    x.drawImage(await cargarImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)), W - 300, 80, 190, 215);
  } catch { /* sin mascota */ }
  const centro = (txt, y, fuente, color) => { x.font = fuente; x.fillStyle = color; x.textAlign = 'center'; x.fillText(txt, W / 2, y); };
  centro('CERTIFICADO DE COMPLETADO', 320, '800 62px Poppins, sans-serif', AZUL);
  x.fillStyle = DORADO; x.fillRect(W / 2 - 160, 342, 320, 6);
  centro('Se otorga a', 410, '400 30px Poppins, sans-serif', GRIS);
  const nombre = `${E.nombre} ${E.apellido}`;
  let tam = 78; x.font = `800 ${tam}px Poppins, sans-serif`;
  while (x.measureText(nombre).width > W - 360 && tam > 40) { tam -= 4; x.font = `800 ${tam}px Poppins, sans-serif`; }
  centro(nombre, 498, `800 ${tam}px Poppins, sans-serif`, MAG);
  x.strokeStyle = DORADO; x.lineWidth = 3; x.beginPath(); x.moveTo(W / 2 - 420, 528); x.lineTo(W / 2 + 420, 528); x.stroke();
  centro(`por completar la torre de ${TOTAL} bloques de interfaces en Go`, 588, '600 30px Poppins, sans-serif', AZUL);
  centro('Programación Orientada a Objetos · semanas 11 y 12', 630, '400 24px Poppins, sans-serif', GRIS);
  const a = aciertosPrimer(), p = Math.round(a / TOTAL * 100);
  [[`${a} de ${TOTAL}`, 'al primer intento'], [`${p} %`, 'de logro'], [rango(p), 'nivel alcanzado']].forEach(([v, et], i) => {
    const cxx = W / 2 + (i - 1) * 420, y = 668;
    x.fillStyle = i === 2 ? '#fdf2f7' : '#eef3fb'; x.strokeStyle = i === 2 ? MAG : AZUL; x.lineWidth = 2;
    caja(x, cxx - 190, y, 380, 104, 18); x.fill(); x.stroke();
    x.textAlign = 'center'; x.fillStyle = i === 2 ? MAG : AZUL;
    let t = 40; x.font = `800 ${t}px Poppins, sans-serif`;
    while (x.measureText(v).width > 350 && t > 22) { t -= 2; x.font = `800 ${t}px Poppins, sans-serif`; }
    x.fillText(v, cxx, y + 56);
    x.font = '400 20px Poppins, sans-serif'; x.fillStyle = GRIS; x.fillText(et, cxx, y + 88);
  });
  x.font = '600 17px Poppins, sans-serif';
  porTema().forEach((tm, i) => {
    const col = i % 3, fil = Math.floor(i / 3), px = 150 + col * 440, y = 810 + fil * 40;
    x.textAlign = 'left'; x.fillStyle = AZUL; x.fillText(tm.tema, px, y);
    x.fillStyle = '#e8edf4'; x.fillRect(px, y + 9, 330, 9);
    x.fillStyle = tm.p >= 80 ? '#1E9E5A' : tm.p >= 50 ? DORADO : '#C62839'; x.fillRect(px, y + 9, 330 * tm.p / 100, 9);
    x.fillStyle = GRIS; x.textAlign = 'right'; x.fillText(`${tm.bien}/${tm.total}`, px + 386, y + 18);
  });
  const fecha = new Date().toLocaleDateString('es-EC', { day: 'numeric', month: 'long', year: 'numeric' });
  x.textAlign = 'left'; x.fillStyle = GRIS; x.font = '400 22px Poppins, sans-serif';
  x.strokeStyle = DORADO; x.lineWidth = 2; x.beginPath(); x.moveTo(130, 945); x.lineTo(W - 130, 945); x.stroke();
  x.fillText(fecha.charAt(0).toUpperCase() + fecha.slice(1), 130, 990);
  x.font = '400 18px Poppins, sans-serif'; x.fillText('Fecha', 130, 1016);
  x.textAlign = 'right'; x.fillStyle = AZUL; x.font = '600 24px "JetBrains Mono", Consolas, monospace';
  x.fillText(codigo(`${nombre}|${a}|${fecha}`), W - 130, 990);
  x.fillStyle = GRIS; x.font = '400 18px Poppins, sans-serif'; x.fillText('Código de verificación', W - 130, 1016);
  return c;
}
async function certificado() {
  if (!E.completo) { juego(); return; }
  pintar(`<div class="card centro"><h2 style="justify-content:center">${ICONO.trofeo} Tu certificado</h2>
      <p class="suave" id="gen">Generando…</p><div id="certzona"></div></div>`);
  const url = (await dibujarCertificado()).toDataURL('image/png');
  const archivo = `Certificado-Torre-Gopher-${E.nombre}-${E.apellido}.png`.replace(/\s+/g, '-');
  $('#certzona').innerHTML = `<img class="cert" src="${url}" alt="Certificado de ${esc(E.nombre)} ${esc(E.apellido)}">
    <div class="fila-btn"><a class="btn grande" id="descargar" href="${url}" download="${esc(archivo)}">${ICONO.descargar} Descargar certificado</a></div>
    <p class="suave">En el celular también puedes mantener presionada la imagen para guardarla.</p>
    <div class="fila-btn"><button class="btn sec" id="inf">${ICONO.informe} Ver mi informe</button><button class="btn sec" id="torreb">Ver la torre</button></div>`;
  $('#gen').remove();
  $('#torreb').onclick = juego;
  $('#inf').onclick = informe;
  confeti();
}

/* ---------------- arranque ---------------- */
function arrancar() {
  E = cargar();
  if (E.fuera.some(id => !Q[id])) E = nuevo(E.nombre, E.apellido);   // datos de otra versión
  inicio();
}
Promise.all([document.fonts.load('15px "JetBrains Mono"'), document.fonts.load('700 16px Poppins'), document.fonts.load('400 15px Poppins')])
  .catch(() => null).then(arrancar);
