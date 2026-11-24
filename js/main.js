// Número de WhatsApp da igreja — formato internacional sem símbolos, ex: 5584999999999
// PENDENTE: Leandro vai enviar o número oficial da igreja.
const WHATSAPP_IGREJA = "";

document.addEventListener("DOMContentLoaded", () => {
  const anoAtual = document.getElementById("anoAtual");
  if (anoAtual) anoAtual.textContent = new Date().getFullYear();

  const formOracao = document.getElementById("formOracao");
  if (formOracao) {
    formOracao.addEventListener("submit", (e) => {
      e.preventDefault();

      const nome = document.getElementById("nomeOracao").value.trim();
      const pedido = document.getElementById("pedidoOracao").value.trim();

      const mensagem = `Olá! Meu nome é ${nome} e gostaria de enviar um pedido de oração:\n\n${pedido}`;
      const mensagemCodificada = encodeURIComponent(mensagem);

      if (!WHATSAPP_IGREJA) {
        alert("O número de WhatsApp da igreja ainda não foi configurado. Fale com a administração do site.");
        return;
      }

      window.open(`https://wa.me/${WHATSAPP_IGREJA}?text=${mensagemCodificada}`, "_blank");
      formOracao.reset();
    });
  }

  initHeroPixelCanvas();
  initMapa();
});

// Mapa interativo (Leaflet) da localização da igreja
function initMapa() {
  const el = document.getElementById("ibjMapa");
  if (!el) return;

  const lat = parseFloat(el.dataset.lat);
  const lon = parseFloat(el.dataset.lon);

  if (typeof L === "undefined") {
    el.innerHTML = `<iframe src="https://www.google.com/maps?q=${lat},${lon}&output=embed" width="100%" height="100%" style="border:0" loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Mapa da Igreja Batista Jardins"></iframe>`;
    return;
  }

  const map = L.map(el, {
    scrollWheelZoom: false,
  }).setView([lat, lon], 16);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(map);

  const icone = L.divIcon({
    className: "ibj-mapa-marcador",
    html: '<i class="fa-solid fa-location-dot"></i>',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -30],
  });

  L.marker([lat, lon], { icon: icone })
    .addTo(map)
    .bindPopup(
      "<strong>Igreja Batista Jardins</strong><br>Rua Sebastião Piau, 90, Cidade Rosas II<br>" +
        '<a href="https://www.google.com/maps/dir/?api=1&destination=' +
        lat + "," + lon +
        '" target="_blank" rel="noopener">Como chegar</a>'
    )
    .openPopup();

  el.addEventListener("click", () => map.scrollWheelZoom.enable());
  el.addEventListener("mouseleave", () => map.scrollWheelZoom.disable());

  new ResizeObserver(() => map.invalidateSize()).observe(el);
}

// Efeito de partículas (pixels) animadas sobre a imagem do hero
function initHeroPixelCanvas() {
  const canvas = document.getElementById("heroPixelCanvas");
  const hero = document.getElementById("topo");
  if (!canvas || !hero) return;

  const ctx = canvas.getContext("2d");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const gap = 6;
  const color = "rgba(255, 255, 255, 0.8)";
  let pixels = [];
  let rafId = null;

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function createPixel(x, y, w, h) {
    const dx = x - w / 2;
    const dy = y - h / 2;
    return {
      x, y,
      size: 0,
      sizeStep: rand(0.12, 0.28),
      maxSize: rand(0.5, 2),
      speed: rand(0.08, 0.4) * 0.03,
      delay: reducedMotion ? 0 : Math.sqrt(dx * dx + dy * dy) * 0.65,
      counter: 0,
      counterStep: rand(1.8, 3.2) + (w + h) * 0.008,
      isShimmer: false,
      isReverse: false,
    };
  }

  function buildPixels() {
    const { width, height } = hero.getBoundingClientRect();
    const w = Math.floor(width);
    const h = Math.floor(height);
    canvas.width = w;
    canvas.height = h;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    pixels = [];
    for (let x = 0; x < w; x += gap) {
      for (let y = 0; y < h; y += gap) {
        pixels.push(createPixel(x, y, w, h));
      }
    }
  }

  function step(p) {
    if (p.counter <= p.delay) {
      p.counter += p.counterStep;
      return;
    }
    if (p.size >= p.maxSize) p.isShimmer = true;

    if (p.isShimmer) {
      if (p.size >= p.maxSize) p.isReverse = true;
      else if (p.size <= 0.5) p.isReverse = false;
      p.size += p.isReverse ? -p.speed : p.speed;
    } else {
      p.size += p.sizeStep;
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = color;
    for (const p of pixels) {
      step(p);
      const offset = 1 - p.size * 0.5;
      ctx.fillRect(p.x + offset, p.y + offset, p.size, p.size);
    }
    rafId = requestAnimationFrame(draw);
  }

  buildPixels();
  draw();

  const resizeObserver = new ResizeObserver(() => {
    cancelAnimationFrame(rafId);
    buildPixels();
    draw();
  });
  resizeObserver.observe(hero);
}

/* ===== MOMENTOS: carrossel coverflow ===== */
(function () {
  const root = document.getElementById('momentos-carousel');
  if (!root) return;
  const frame = root.querySelector('.ibj-cf-frame');
  const cards = Array.from(root.querySelectorAll('.ibj-cf-card'));
  const count = cards.length;
  const rotate = 44, depth = 0.6, falloff = 0.56, fade = 0.1, gap = 0.05;
  const ini = Math.max(0, cards.findIndex(c => c.hasAttribute('data-inicial')));
  let pos = ini, target = ini, width = 0, raf = null, drag = null;

  function paint() {
    if (!width) return;
    const pitch = width * (1 + gap);
    cards.forEach((card, i) => {
      let offset = i - pos;
      offset = ((offset % count) + count) % count;
      if (offset > count / 2) offset -= count;
      const dist = Math.abs(offset);
      const ramp = Math.pow(dist, falloff);
      const tilt = Math.min(rotate * ramp, 82) * Math.sign(offset);
      card.style.transform =
        `translateX(calc(-50% + ${offset * pitch}px)) translateZ(${-depth * width * ramp}px) rotateY(${-tilt}deg)`;
      const edge = Math.min(1, Math.max(0, count / 2 - dist));
      card.style.opacity = String(Math.max(0, 1 - fade * dist) * edge);
      card.style.zIndex = String(100 - Math.round(dist));
      card.style.visibility = dist > 6 ? 'hidden' : 'visible';
    });
  }

  function settle(t) {
    if (raf !== null) cancelAnimationFrame(raf);
    target = t;
    const step = () => {
      const rem = target - pos;
      if (Math.abs(rem) < 0.0004) { pos = target; paint(); raf = null; return; }
      pos += rem * 0.16;
      paint();
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }

  const nudge = by => settle(Math.round(target) + by);

  frame.addEventListener('pointerdown', e => {
    if (raf !== null) { cancelAnimationFrame(raf); raf = null; }
    frame.setPointerCapture(e.pointerId);
    target = pos;
    drag = { id: e.pointerId, x: e.clientX, pos, v: 0, t: performance.now() };
  });
  frame.addEventListener('pointermove', e => {
    if (!drag || drag.id !== e.pointerId) return;
    const pitch = width * (1 + gap);
    if (!pitch) return;
    const now = performance.now(), prev = pos;
    pos = drag.pos - (e.clientX - drag.x) / pitch;
    drag.v = ((pos - prev) / Math.max(now - drag.t, 1)) * 1000;
    drag.t = now;
    paint();
  });
  const end = e => {
    if (!drag || drag.id !== e.pointerId) return;
    const carried = Math.max(-2, Math.min(2, drag.v * 0.18));
    drag = null;
    settle(Math.round(pos + carried));
  };
  frame.addEventListener('pointerup', end);
  frame.addEventListener('pointercancel', end);
  frame.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); nudge(-1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); nudge(1); }
  });

  function measure() { width = cards[0].offsetWidth; paint(); }
  measure();
  new ResizeObserver(measure).observe(frame);
})();
