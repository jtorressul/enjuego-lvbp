const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const TEAMS = {
  CAR: { name: "Leones del Caracas", nick: "LEONES", color: "#e11d48", logo: "CAR.png" },
  MAG: { name: "Navegantes del Magallanes", nick: "MAGALLANES", color: "#2563eb", logo: "MAG.png" },
  LAG: { name: "Tiburones de La Guaira", nick: "TIBURONES", color: "#0284c7", logo: "LAG.png" },
  LAR: { name: "Cardenales de Lara", nick: "CARDENALES", color: "#dc2626", logo: "LAR.png" },
  ZUL: { name: "Águilas del Zulia", nick: "ÁGUILAS", color: "#f59e0b", logo: "ZUL.png" },
  ARA: { name: "Tigres de Aragua", nick: "TIGRES", color: "#475569", logo: "ARA.png" },
  ANZ: { name: "Caribes de Anzoátegui", nick: "CARIBES", color: "#ea580c", logo: "ANZ.png" },
  MAR: { name: "Bravos de Margarita", nick: "BRAVOS", color: "#0d9488", logo: "MAR.png" },
};

async function generateMatchupCard(awayCode, homeCode, outPath) {
  const away = TEAMS[awayCode];
  const home = TEAMS[homeCode];
  if (!away || !home) return;

  const awayLogoPath = path.join(__dirname, '../public/logos/clean', away.logo);
  const homeLogoPath = path.join(__dirname, '../public/logos/clean', home.logo);
  const brandLogoPath = path.join(__dirname, '../public/logo.png');

  // Resize logos
  const awayLogoBuffer = await sharp(awayLogoPath).resize(260, 260, { fit: 'inside' }).toBuffer();
  const homeLogoBuffer = await sharp(homeLogoPath).resize(260, 260, { fit: 'inside' }).toBuffer();
  const brandLogoBuffer = await sharp(brandLogoPath).resize(180, 56, { fit: 'inside' }).toBuffer();

  const svgOverlay = `
  <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <!-- Background Gradients -->
      <radialGradient id="bgGrad" cx="50%" cy="40%" r="70%">
        <stop offset="0%" stop-color="#141c2e"/>
        <stop offset="60%" stop-color="#0a0f1d"/>
        <stop offset="100%" stop-color="#05070e"/>
      </radialGradient>
      
      <!-- Away glow -->
      <radialGradient id="awayGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${away.color}" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="${away.color}" stop-opacity="0"/>
      </radialGradient>

      <!-- Home glow -->
      <radialGradient id="homeGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${home.color}" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="${home.color}" stop-opacity="0"/>
      </radialGradient>

      <!-- Gold gradient for VS badge -->
      <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#fbbf24"/>
        <stop offset="100%" stop-color="#d97706"/>
      </linearGradient>

      <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#000000" flood-opacity="0.6"/>
      </filter>
    </defs>

    <!-- Background Base -->
    <rect width="1200" height="630" fill="url(#bgGrad)"/>

    <!-- Subtle team halos -->
    <circle cx="280" cy="300" r="220" fill="url(#awayGlow)"/>
    <circle cx="920" cy="300" r="220" fill="url(#homeGlow)"/>

    <!-- Top Navigation Header -->
    <rect x="0" y="0" width="1200" height="84" fill="#0b1120" fill-opacity="0.8"/>
    <line x1="0" y1="84" x2="1200" y2="84" stroke="#1e293b" stroke-width="2"/>

    <!-- Top Badge -->
    <g transform="translate(600, 42)">
      <rect x="-180" y="-18" width="360" height="36" rx="18" fill="#1e293b" stroke="#334155" stroke-width="1.5"/>
      <circle cx="-150" cy="0" r="5" fill="#ef4444"/>
      <text x="-135" y="5" font-family="sans-serif" font-size="13" font-weight="900" fill="#f8fafc" letter-spacing="2">LVBP EN VIVO · JUEGO DE HOY</text>
    </g>

    <!-- Team Names & Details -->
    <!-- Away Team Text -->
    <text x="280" y="480" font-family="sans-serif" font-size="34" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="1">
      ${away.nick}
    </text>
    <text x="280" y="515" font-family="sans-serif" font-size="16" font-weight="700" fill="#94a3b8" text-anchor="middle">
      ${away.name}
    </text>

    <!-- VS Medallion -->
    <g transform="translate(600, 300)" filter="url(#shadow)">
      <circle cx="0" cy="0" r="46" fill="#0f172a" stroke="url(#goldGrad)" stroke-width="3"/>
      <text x="0" y="11" font-family="sans-serif" font-size="28" font-weight="900" fill="url(#goldGrad)" text-anchor="middle" font-style="italic">VS</text>
    </g>

    <!-- Home Team Text -->
    <text x="920" y="480" font-family="sans-serif" font-size="34" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="1">
      ${home.nick}
    </text>
    <text x="920" y="515" font-family="sans-serif" font-size="16" font-weight="700" fill="#94a3b8" text-anchor="middle">
      ${home.name}
    </text>

    <!-- Bottom Footer Bar -->
    <rect x="0" y="560" width="1200" height="70" fill="#060913" fill-opacity="0.95"/>
    <line x1="0" y1="560" x2="1200" y2="560" stroke="#1e293b" stroke-width="1.5"/>

    <text x="60" y="602" font-family="sans-serif" font-size="15" font-weight="800" fill="#cbd5e1">
      📺 Transmisión Oficial · Marcador Jugada a Jugada · Pizarra en Tiempo Real
    </text>
    <text x="1140" y="602" font-family="sans-serif" font-size="16" font-weight="900" fill="#f59e0b" text-anchor="end" letter-spacing="0.5">
      enjuego.online
    </text>
  </svg>
  `;

  // Composite background SVG with logos
  await sharp(Buffer.from(svgOverlay))
    .composite([
      { input: brandLogoBuffer, top: 16, left: 50 },
      { input: awayLogoBuffer, top: 170, left: 150 },
      { input: homeLogoBuffer, top: 170, left: 790 },
    ])
    .png({ quality: 90 })
    .toFile(outPath);

  console.log(`Generated: ${outPath}`);
}

async function generateAll() {
  const dir = path.join(__dirname, '../public/og/matchups');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const teamKeys = Object.keys(TEAMS);
  let count = 0;
  for (const away of teamKeys) {
    for (const home of teamKeys) {
      if (away === home) continue;
      const file = path.join(dir, `${away}-${home}.png`);
      await generateMatchupCard(away, home, file);
      count++;
    }
  }

  // Also generate generic default LVBP poster
  const defaultPath = path.join(__dirname, '../public/og/lvbp-default.png');
  await generateMatchupCard('CAR', 'MAG', defaultPath); // Default classic matchup poster
  console.log(`Total generated: ${count} matchups + default!`);
}

generateAll().catch(console.error);
