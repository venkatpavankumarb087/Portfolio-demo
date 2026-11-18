const select = (id) => document.getElementById(id);

function node(tag, text, className) {
  const el = document.createElement(tag);
  if (text) el.textContent = text;
  if (className) el.className = className;
  return el;
}

function link(label, url, className) {
  const anchor = node('a', label, className);
  anchor.href = url;
  return anchor;
}

function list(items) {
  const ul = node('ul', '', 'tags');
  for (const item of items) ul.append(node('li', item));
  return ul;
}

for (const project of portfolio.projects) {
  const card = node('article', '', 'card');
  const art = node('div', '', 'art ' + (project.art || 'organizer'));
  art.setAttribute('aria-hidden', 'true');
  const motif = node('div', '', 'motif');
  for (let cell = 0; cell < 6; cell++) {
    const tile = node('i');
    tile.style.setProperty('--cell', cell);
    motif.append(tile);
  }
  art.append(motif);
  const body = node('div', '', 'card-body');
  body.append(node('p', project.context, 'label'), node('h3', project.name),
    node('p', project.description), list(project.tags), link(project.label + ' ↗', project.url, 'project-link'));
  card.append(art, body);
  select('projects').append(card);
}

for (const contact of portfolio.contacts) {
  select('links').append(link(contact.label, contact.url, 'button'));
}
for (const [id, title] of [['skills', 'Skills'], ['achievements', 'Achievements']]) {
  if (portfolio[id].length) select(id).append(node('h3', title), list(portfolio[id]));
}
if (portfolio.resume) select('resume').append(link('View résumé ↗', portfolio.resume, 'project-link'));


function bindScrollEffects() {
  const progress = select('reading-progress');
  let pending = false;

  function updateProgress() {
    const distance = document.documentElement.scrollHeight - window.innerHeight;
    const fraction = distance > 0 ? Math.min(1, Math.max(0, window.scrollY / distance)) : 0;
    progress.style.transform = `scaleX(${fraction})`;
    pending = false;
  }

  function queueProgress() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(updateProgress);
  }

  window.addEventListener('scroll', queueProgress, { passive: true });
  window.addEventListener('resize', queueProgress);
  updateProgress();

  if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('entered');
      observer.unobserve(entry.target);
    }
  }, { threshold: .1 });

  document.querySelectorAll('#work > h2, .card, #about > div, #contact').forEach(target => observer.observe(target));
}

function drawSignalGlobe(canvas) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const turn = Math.PI * 2;
  const cursor = { x: 0, y: 0 };
  const drift = { x: 0, y: 0 };
  let width = 0;
  let height = 0;
  let visible = true;
  let frame = 0;
  let lastTime;
  let time = .7;

  function sphere(latitude, longitude) {
    return {
      x: Math.cos(latitude) * Math.cos(longitude),
      y: Math.sin(latitude),
      z: Math.cos(latitude) * Math.sin(longitude)
    };
  }

  const latitudes = Array.from({ length: 15 }, (_, i) => (-7 + i) * Math.PI / 16);
  const longitudes = Array.from({ length: 22 }, (_, i) => i * turn / 22);
  const lines = [
    ...latitudes.map(lat => Array.from({ length: 93 }, (_, i) => sphere(lat, i * turn / 92))),
    ...longitudes.map(lon => Array.from({ length: 49 }, (_, i) => sphere((i / 48 - .5) * Math.PI, lon)))
  ];
  const points = latitudes.flatMap((lat, row) => longitudes.map((lon, column) => ({
    point: sphere(lat, lon),
    signal: (row * 11 + column * 7) % 31 === 0
  })));

  function dot(x, y, radius, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, turn);
    ctx.fill();
  }

  function paint() {
    if (!width || !height) return;
    ctx.clearRect(0, 0, width, height);
    const size = Math.min(width, height);
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = size * .307;
    const yaw = .65 + time * .25 + drift.x * .32;
    const pitch = -.34 + drift.y * .23;
    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);
    const cosP = Math.cos(pitch);
    const sinP = Math.sin(pitch);

    function project(point) {
      const x = point.x * cosY + point.z * sinY;
      const rotatedZ = -point.x * sinY + point.z * cosY;
      const y = point.y * cosP - rotatedZ * sinP;
      const z = point.y * sinP + rotatedZ * cosP;
      const scale = radius * 4 / (4 - z);
      return { x: centerX + x * scale, y: centerY - y * scale, z };
    }

    function trace(path, front) {
      ctx.beginPath();
      let active = false;
      for (const point of path) {
        if ((point.z >= 0) !== front) {
          active = false;
          continue;
        }
        if (active) ctx.lineTo(point.x, point.y);
        else ctx.moveTo(point.x, point.y);
        active = true;
      }
      ctx.stroke();
    }

    function orbit(angle, phase, spread) {
      const x = Math.cos(phase) * radius * spread;
      const y = Math.sin(phase) * radius * .44;
      return {
        x: centerX + x * Math.cos(angle) - y * Math.sin(angle),
        y: centerY + x * Math.sin(angle) + y * Math.cos(angle),
        z: Math.sin(phase)
      };
    }

    const rings = [
      { angle: -.48, phase: 5.2 + time * .88, spread: 1.40 },
      { angle: .56, phase: 1.7 - time * .59, spread: 1.34 }
    ];
    const ringPaths = rings.map(ring => Array.from({ length: 101 }, (_, i) =>
      orbit(ring.angle, i * turn / 100, ring.spread)
    ));
    const mesh = lines.map(line => line.map(project));

    ctx.lineWidth = 1;
    ctx.strokeStyle = '#af92d440';
    for (let i = 0; i < 2; i++) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * (1.17 + i * .26), 0, turn);
      ctx.stroke();
    }

    ctx.strokeStyle = '#ae96d63a';
    ringPaths.forEach(path => trace(path, false));
    ctx.strokeStyle = '#79639544';
    mesh.forEach(path => trace(path, false));

    const shade = ctx.createRadialGradient(centerX - radius * .38, centerY - radius * .52, 0,
      centerX, centerY, radius * 1.04);
    shade.addColorStop(0, '#5e457d88');
    shade.addColorStop(.72, '#251d36b8');
    shade.addColorStop(1, '#19142633');
    ctx.fillStyle = shade;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 1.032, 0, turn);
    ctx.fill();

    ctx.lineWidth = .9;
    ctx.strokeStyle = '#c3ace38b';
    mesh.forEach(path => trace(path, true));

    for (const { point, signal } of points) {
      const p = project(point);
      if (p.z < .08) continue;
      if (signal) {
        const intensity = .7 + Math.sin(time * 2.7 + point.x * 4) * .3;
        dot(p.x, p.y, 5.7, `rgba(80, 233, 132, ${intensity * .24})`);
        dot(p.x, p.y, 2, `rgba(111, 255, 158, ${intensity})`);
      } else {
        dot(p.x, p.y, 1, '#e1caff99');
      }
    }

    ctx.lineWidth = 1.15;
    ctx.strokeStyle = '#65eca07c';
    ringPaths.forEach(path => trace(path, true));
    for (const ring of rings) {
      const marker = orbit(ring.angle, ring.phase, ring.spread);
      const glow = ctx.createRadialGradient(marker.x, marker.y, 0, marker.x, marker.y, 15);
      glow.addColorStop(0, '#6bffaabb');
      glow.addColorStop(1, '#50e98400');
      dot(marker.x, marker.y, 15, glow);
      dot(marker.x, marker.y, 3.2, '#aaffc5');
    }
  }

  function animate(now) {
    frame = 0;
    if (lastTime !== undefined) time += Math.min(now - lastTime, 48) / 1000;
    lastTime = now;
    drift.x += (cursor.x - drift.x) * .05;
    drift.y += (cursor.y - drift.y) * .05;
    paint();
    syncMotion();
  }

  function syncMotion() {
    if (!motion.matches && visible && !document.hidden) {
      if (!frame) frame = requestAnimationFrame(animate);
      return;
    }
    cancelAnimationFrame(frame);
    frame = 0;
    lastTime = undefined;
    if (motion.matches) {
      drift.x = 0;
      drift.y = 0;
      paint();
    }
  }

  function resize() {
    const bounds = canvas.getBoundingClientRect();
    width = bounds.width;
    height = bounds.height;
    const pixels = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * pixels);
    canvas.height = Math.round(height * pixels);
    ctx.setTransform(pixels, 0, 0, pixels, 0, 0);
    paint();
  }

  canvas.addEventListener('pointermove', (event) => {
    if (motion.matches || event.pointerType === 'touch' || !width || !height) return;
    const bounds = canvas.getBoundingClientRect();
    cursor.x = (event.clientX - bounds.left) / width * 2 - 1;
    cursor.y = (event.clientY - bounds.top) / height * 2 - 1;
  }, { passive: true });
  canvas.addEventListener('pointerleave', () => { cursor.x = 0; cursor.y = 0; });
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
  else window.addEventListener('resize', resize);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      syncMotion();
    }).observe(canvas);
  }
  document.addEventListener('visibilitychange', syncMotion);
  motion.addEventListener('change', syncMotion);
  resize();
  syncMotion();
}

bindScrollEffects();
drawSignalGlobe(select('signal'));
