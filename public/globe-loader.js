// ===== Globe Loader =====
// 200×200 monochrome spinning globe with real country outlines + whirl effect.
// Uses a lightweight land-mass path dataset rendered via orthographic projection.
// No external deps, pure SVG + requestAnimationFrame.

(function () {
  'use strict';

  // Compact land polygons (lon, lat coords) — simplified continents.
  // Each array is [ [lon,lat], [lon,lat], ... ] forming a closed polygon.
  // Coords cover all major landmasses at ~2-3° precision — plenty for a 200px globe.
  const LAND = [
    // North America mainland
    [[-168,66],[-156,71],[-128,70],[-95,80],[-75,78],[-60,72],[-55,60],[-70,46],[-80,26],[-97,18],[-106,23],[-117,32],[-125,40],[-130,55],[-142,60],[-168,66]],
    // Greenland
    [[-73,78],[-57,83],[-30,83],[-20,76],[-42,60],[-52,64],[-73,78]],
    // South America
    [[-81,12],[-60,12],[-50,0],[-35,-8],[-38,-23],[-55,-35],[-70,-55],[-75,-50],[-72,-30],[-80,-10],[-81,12]],
    // Africa
    [[-17,21],[-5,36],[12,37],[33,32],[43,12],[51,12],[40,-15],[20,-35],[18,-34],[9,-2],[-8,5],[-17,15],[-17,21]],
    // Europe
    [[-10,36],[2,43],[12,45],[20,40],[29,41],[41,47],[60,65],[30,70],[5,60],[-5,50],[-10,48],[-10,36]],
    // Asia mainland
    [[30,70],[60,72],[100,78],[140,72],[160,68],[175,65],[170,60],[140,55],[135,35],[120,22],[105,10],[95,16],[78,8],[68,23],[55,27],[45,12],[43,25],[35,35],[40,42],[30,45],[30,70]],
    // India subcontinent lobe
    [[68,23],[78,8],[80,10],[88,21],[92,22],[88,27],[77,32],[68,23]],
    // Indonesia / SE Asia islands (blob)
    [[95,5],[110,-2],[125,-5],[138,-5],[135,5],[120,10],[100,8],[95,5]],
    // Australia
    [[113,-22],[130,-12],[142,-10],[153,-25],[146,-38],[130,-33],[115,-35],[113,-22]],
    // Antarctica (ring — drawn as one band)
    [[-180,-72],[-120,-75],[-60,-78],[0,-72],[60,-68],[120,-72],[180,-72],[180,-90],[-180,-90],[-180,-72]],
    // Madagascar
    [[43,-12],[50,-15],[50,-25],[44,-25],[43,-12]],
    // Japan
    [[130,32],[140,36],[145,42],[140,45],[132,35],[130,32]],
    // UK
    [[-6,50],[0,52],[1,58],[-5,58],[-6,50]],
    // New Zealand
    [[166,-46],[174,-40],[178,-38],[170,-44],[166,-46]],
  ];

  const DEG = Math.PI / 180;

  // Orthographic projection: lon/lat → x/y (or null if on far side)
  function project(lon, lat, rot, cx, cy, r) {
    const λ = (lon - rot) * DEG;
    const φ = lat * DEG;
    const cosφ = Math.cos(φ);
    const x = cosφ * Math.sin(λ);
    const y = Math.sin(φ);
    const z = cosφ * Math.cos(λ);
    if (z < 0) return null; // far side
    return [cx + x * r, cy - y * r, z];
  }

  // Build SVG path string for a polygon at given rotation. Breaks into sub-paths
  // when points flip to the far side (so outlines don't smear across the globe).
  function polyPath(poly, rot, cx, cy, r) {
    let d = '';
    let pen = false;
    for (const [lon, lat] of poly) {
      const p = project(lon, lat, rot, cx, cy, r);
      if (!p) { pen = false; continue; }
      d += (pen ? 'L' : 'M') + p[0].toFixed(2) + ' ' + p[1].toFixed(2) + ' ';
      pen = true;
    }
    return d;
  }

  // Render one frame of land paths as a single concatenated path string.
  function renderLand(rot, cx, cy, r) {
    let d = '';
    for (const poly of LAND) {
      d += polyPath(poly, rot, cx, cy, r);
    }
    return d;
  }

  // Create a loader element. Returns the HTMLElement.
  // opts.size (default 200), opts.caption (optional text below)
  function createGlobeLoader(opts = {}) {
    const size = opts.size || 200;
    const cx = size / 2, cy = size / 2;
    const r = size * 0.36; // globe radius
    const whirlR = size * 0.48; // outer whirl radius

    const wrap = document.createElement('div');
    wrap.className = 'globe-loader';
    wrap.setAttribute('role', 'status');
    wrap.setAttribute('aria-label', opts.ariaLabel || 'Loading');

    // SVG
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    svg.setAttribute('class', 'globe-loader-svg');

    svg.innerHTML = `
      <defs>
        <radialGradient id="gl-shade" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="rgba(0,0,0,0)"/>
          <stop offset="75%" stop-color="rgba(0,0,0,0.06)"/>
          <stop offset="100%" stop-color="rgba(0,0,0,0.14)"/>
        </radialGradient>
        <clipPath id="gl-clip-${size}">
          <circle cx="${cx}" cy="${cy}" r="${r}"/>
        </clipPath>
      </defs>

      <!-- Whirl orbits (rotate counter to globe) -->
      <g class="gl-whirl">
        <circle cx="${cx}" cy="${cy}" r="${whirlR}" class="gl-orbit gl-orbit-1"/>
        <circle cx="${cx}" cy="${cy}" r="${whirlR - 6}" class="gl-orbit gl-orbit-2"/>
        <circle cx="${cx}" cy="${cy}" r="${whirlR + 2}" class="gl-orbit gl-orbit-3"/>
        <!-- Orbiting particle -->
        <circle cx="${cx + whirlR}" cy="${cy}" r="2.4" class="gl-particle gl-particle-a"/>
        <circle cx="${cx - whirlR}" cy="${cy}" r="1.6" class="gl-particle gl-particle-b"/>
      </g>

      <!-- Globe sphere -->
      <circle cx="${cx}" cy="${cy}" r="${r}" class="gl-sphere"/>

      <!-- Graticule (lat/lon grid) inside globe -->
      <g clip-path="url(#gl-clip-${size})" class="gl-graticule">
        ${buildGraticule(cx, cy, r)}
      </g>

      <!-- Land paths -->
      <g clip-path="url(#gl-clip-${size})">
        <path class="gl-land" d=""/>
      </g>

      <!-- Shading overlay for depth -->
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#gl-shade)" pointer-events="none"/>

      <!-- Outline on top -->
      <circle cx="${cx}" cy="${cy}" r="${r}" class="gl-rim"/>
    `;

    wrap.appendChild(svg);

    if (opts.caption) {
      const cap = document.createElement('div');
      cap.className = 'globe-loader-caption';
      cap.textContent = opts.caption;
      wrap.appendChild(cap);
    }

    // Animate rotation
    const landEl = svg.querySelector('.gl-land');
    let rot = 0;
    let last = performance.now();
    let rafId = 0;
    const speed = opts.speed || 36; // deg/sec

    // Respect reduced motion
    const prm = window.matchMedia('(prefers-reduced-motion: reduce)');

    function frame(now) {
      const dt = (now - last) / 1000;
      last = now;
      if (!prm.matches) rot = (rot + speed * dt) % 360;
      landEl.setAttribute('d', renderLand(rot, cx, cy, r));
      rafId = requestAnimationFrame(frame);
    }
    rafId = requestAnimationFrame(frame);

    // Destroy hook
    wrap.destroy = () => { cancelAnimationFrame(rafId); };

    // Render first frame immediately
    landEl.setAttribute('d', renderLand(0, cx, cy, r));

    return wrap;
  }

  // Build static graticule (meridians + parallels) as path strings.
  // Because it's static and inside a circle clip, it doesn't need to re-render.
  function buildGraticule(cx, cy, r) {
    let out = '';
    // Parallels (horizontal ellipses) at lat -60, -30, 0, 30, 60
    for (const lat of [-60, -30, 0, 30, 60]) {
      const ry = r * Math.cos((90 - Math.abs(lat)) * DEG);
      const yOff = r * Math.sin(lat * DEG);
      out += `<ellipse cx="${cx}" cy="${cy - yOff}" rx="${r}" ry="${Math.max(ry, 0.5)}" class="gl-lat"/>`;
    }
    // Meridians — drawn as static vertical ellipses at various rx (we skip because
    // meridians rotate with globe; drawing static ones gives that "etched sphere"
    // look without extra animation cost).
    for (const rx of [r, r * 0.82, r * 0.55, r * 0.22]) {
      out += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${r}" class="gl-lon"/>`;
    }
    return out;
  }

  // ===== Full-screen loader overlay (for app boot / continent switch) =====
  let overlayEl = null;
  function showOverlay(caption) {
    if (overlayEl) {
      const capEl = overlayEl.querySelector('.globe-loader-caption');
      if (capEl) capEl.textContent = caption || '';
      overlayEl.classList.add('visible');
      return;
    }
    overlayEl = document.createElement('div');
    overlayEl.className = 'globe-overlay';
    const loader = createGlobeLoader({ size: 200, caption: caption || 'Loading world news' });
    overlayEl.appendChild(loader);
    document.body.appendChild(overlayEl);
    requestAnimationFrame(() => overlayEl.classList.add('visible'));
  }

  function hideOverlay() {
    if (!overlayEl) return;
    overlayEl.classList.remove('visible');
    setTimeout(() => {
      if (overlayEl && !overlayEl.classList.contains('visible')) {
        overlayEl.remove();
        overlayEl = null;
      }
    }, 400);
  }

  // ===== Inline loader for news container =====
  function buildInlineLoader(caption) {
    const wrap = document.createElement('div');
    wrap.className = 'globe-inline-loader';
    const loader = createGlobeLoader({ size: 200, caption: caption || 'Fetching latest articles' });
    wrap.appendChild(loader);
    return wrap;
  }

  // Expose
  window.GlobeLoader = {
    create: createGlobeLoader,
    showOverlay,
    hideOverlay,
    buildInlineLoader,
    buildInlineHTML: (caption) => {
      // Returns an HTML string placeholder; replaced with live loader after insertion.
      const id = 'gl-' + Math.random().toString(36).slice(2, 9);
      queueMicrotask(() => {
        const host = document.getElementById(id);
        if (host) host.replaceWith(buildInlineLoader(caption));
      });
      return `<div id="${id}"></div>`;
    },
  };
})();
