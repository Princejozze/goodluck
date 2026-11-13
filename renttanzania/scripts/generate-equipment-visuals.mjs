import fs from 'fs';
import path from 'path';

const OUT_DIR = path.resolve('public/images/equipment');
fs.mkdirSync(OUT_DIR, { recursive: true });

function wrapRealisticScene({
  filename,
  title,
  brandModel,
  categoryBadge,
  locationText,
  specPill1,
  specPill2,
  skyTop,
  skyBottom,
  groundTop,
  groundBottom,
  accentColor,
  artworkSvg,
}) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <defs>
    <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${skyTop}" />
      <stop offset="65%" stop-color="${skyBottom}" />
      <stop offset="100%" stop-color="${groundTop}" />
    </linearGradient>
    <linearGradient id="groundGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${groundTop}" />
      <stop offset="100%" stop-color="${groundBottom}" />
    </linearGradient>
    <linearGradient id="metalDark" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#3f3f46" />
      <stop offset="50%" stop-color="#27272a" />
      <stop offset="100%" stop-color="#18181b" />
    </linearGradient>
    <linearGradient id="metalLight" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f4f4f5" />
      <stop offset="50%" stop-color="#d4d4d8" />
      <stop offset="100%" stop-color="#a1a1aa" />
    </linearGradient>
    <linearGradient id="chrome" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#e4e4e7" />
      <stop offset="40%" stop-color="#ffffff" />
      <stop offset="60%" stop-color="#a1a1aa" />
      <stop offset="100%" stop-color="#f4f4f5" />
    </linearGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.55" />
      <stop offset="45%" stop-color="#0284c7" stop-opacity="0.35" />
      <stop offset="100%" stop-color="#0f172a" stop-opacity="0.75" />
    </linearGradient>
    <radialGradient id="sunGlow" cx="0.82" cy="0.18" r="0.55">
      <stop offset="0%" stop-color="#fef3c7" stop-opacity="0.65" />
      <stop offset="50%" stop-color="#fde68a" stop-opacity="0.2" />
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="floorShadow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stop-color="#09090b" stop-opacity="0.55" />
      <stop offset="65%" stop-color="#09090b" stop-opacity="0.22" />
      <stop offset="100%" stop-color="#09090b" stop-opacity="0" />
    </radialGradient>
    <filter id="dropShadow" x="-10%" y="-10%" width="125%" height="125%">
      <feDropShadow dx="0" dy="8" stdDeviation="7" flood-color="#09090b" flood-opacity="0.38" />
    </filter>
    <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="12" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Realistic Environment Backdrop -->
  <rect width="800" height="410" fill="url(#skyGrad)" />
  <rect width="800" height="410" fill="url(#sunGlow)" />

  <!-- Architectural Depot / Horizon Silhouette -->
  <path d="M0 390 L0 335 L95 335 L125 310 L260 310 L260 355 L420 355 L445 325 L620 325 L640 355 L800 355 L800 410 Z" fill="#1e293b" opacity="0.16" />
  <line x1="0" y1="390" x2="800" y2="390" stroke="#ffffff" stroke-opacity="0.25" stroke-width="1.5" />

  <!-- Paved Depot / Site Ground Plane -->
  <rect x="0" y="390" width="800" height="210" fill="url(#groundGrad)" />
  <!-- Subtle perspective grid lines on depot floor -->
  <g stroke="#ffffff" stroke-opacity="0.07" stroke-width="1">
    <line x1="0" y1="430" x2="800" y2="430" />
    <line x1="0" y1="480" x2="800" y2="480" />
    <line x1="0" y1="540" x2="800" y2="540" />
    <line x1="150" y1="390" x2="20" y2="600" />
    <line x1="320" y1="390" x2="250" y2="600" />
    <line x1="480" y1="390" x2="550" y2="600" />
    <line x1="650" y1="390" x2="780" y2="600" />
  </g>

  <!-- Ambient Contact Shadow -->
  <ellipse cx="400" cy="455" rx="285" ry="36" fill="url(#floorShadow)" />

  <!-- Primary Realistic Equipment Illustration -->
  <g filter="url(#dropShadow)">
    ${artworkSvg}
  </g>

  <!-- Top Right Spec Plate -->
  <g transform="translate(555, 22)">
    <rect width="223" height="58" rx="10" fill="#0c0a09" fill-opacity="0.78" stroke="#ffffff" stroke-opacity="0.18" />
    <text x="14" y="22" fill="${accentColor}" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="800" letter-spacing="1.2">${categoryBadge.toUpperCase()}</text>
    <text x="14" y="40" fill="#ffffff" font-family="ui-monospace, monospace" font-size="12" font-weight="700">${brandModel}</text>
    <text x="14" y="52" fill="#a8a29e" font-family="system-ui, -apple-system, sans-serif" font-size="9.5">${specPill1} · ${specPill2}</text>
  </g>

  <!-- Bottom Scrim for Contrast -->
  <defs>
    <linearGradient id="bottomScrim" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#09090b" stop-opacity="0" />
      <stop offset="100%" stop-color="#09090b" stop-opacity="0.72" />
    </linearGradient>
  </defs>
  <rect x="0" y="490" width="800" height="110" fill="url(#bottomScrim)" />
</svg>`;

  fs.writeFileSync(path.join(OUT_DIR, filename), svg, 'utf-8');
}

const scenes = [
  // 1. Concrete Mixer 500L
  {
    filename: 'concrete-mixer-500l.svg',
    title: '500L Heavy-Duty Diesel Concrete Mixer & Vibrator',
    brandModel: 'WINGET / JZC-500 DIESEL',
    categoryBadge: 'Construction & Plant',
    locationText: 'Ilemela, Mwanza',
    specPill1: '500L Drum',
    specPill2: '12HP Yanmar Diesel',
    skyTop: '#bae6fd',
    skyBottom: '#f0f9ff',
    groundTop: '#57534e',
    groundBottom: '#292524',
    accentColor: '#f59e0b',
    artworkSvg: `
      <!-- Heavy Frame & Tow Bar -->
      <path d="M150 420 L620 420 L640 400 L170 400 Z" fill="#27272a" />
      <path d="M110 415 L180 415 L180 425 L110 425 Z" fill="#52525b" />
      <!-- Support Pillars -->
      <rect x="255" y="250" width="26" height="170" rx="4" fill="#ea580c" stroke="#9a3412" stroke-width="2" />
      <rect x="475" y="250" width="26" height="170" rx="4" fill="#ea580c" stroke="#9a3412" stroke-width="2" />
      <!-- Diesel Engine Housing (Left) -->
      <rect x="170" y="275" width="95" height="130" rx="8" fill="#f97316" stroke="#c2410c" stroke-width="3" />
      <rect x="184" y="292" width="66" height="45" rx="3" fill="#27272a" />
      <line x1="190" y1="302" x2="244" y2="302" stroke="#71717a" stroke-width="3" />
      <line x1="190" y1="314" x2="244" y2="314" stroke="#71717a" stroke-width="3" />
      <line x1="190" y1="326" x2="244" y2="326" stroke="#71717a" stroke-width="3" />
      <!-- Exhaust Pipe -->
      <path d="M210 275 L210 230 L225 220" fill="none" stroke="#3f3f46" stroke-width="10" stroke-linecap="round" />
      <!-- Tilting Concrete Drum (Center) -->
      <g transform="translate(380, 275) rotate(-18)">
        <ellipse cx="0" cy="0" rx="108" ry="88" fill="#fb923c" stroke="#c2410c" stroke-width="4" />
        <path d="M-85 -52 L85 -52 L115 25 L-115 25 Z" fill="#f97316" stroke="#9a3412" stroke-width="3" />
        <!-- Gear Ring on Drum -->
        <rect x="-109" y="-8" width="218" height="18" fill="#27272a" />
        <!-- Drum Opening -->
        <ellipse cx="0" cy="-65" rx="58" ry="18" fill="#18181b" stroke="#78350f" stroke-width="4" />
      </g>
      <!-- Hand Tilt Wheel (Right) -->
      <circle cx="535" cy="295" r="42" fill="none" stroke="#18181b" stroke-width="10" />
      <line x1="535" y1="253" x2="535" y2="337" stroke="#18181b" stroke-width="6" />
      <line x1="493" y1="295" x2="577" y2="295" stroke="#18181b" stroke-width="6" />
      <!-- Heavy Duty Pneumatic Wheels -->
      <g>
        <circle cx="245" cy="435" r="42" fill="#18181b" stroke="#3f3f46" stroke-width="5" />
        <circle cx="245" cy="435" r="20" fill="#d4d4d8" />
        <circle cx="245" cy="435" r="8" fill="#ea580c" />
        <circle cx="515" cy="435" r="42" fill="#18181b" stroke="#3f3f46" stroke-width="5" />
        <circle cx="515" cy="435" r="20" fill="#d4d4d8" />
        <circle cx="515" cy="435" r="8" fill="#ea580c" />
      </g>
      <!-- Poker Vibrator Hose & Unit -->
      <path d="M565 445 Q640 400 660 445 T710 435" fill="none" stroke="#18181b" stroke-width="10" stroke-linecap="round" />
      <rect x="695" y="425" width="48" height="14" rx="7" fill="url(#chrome)" />
    `,
  },

  // 2. BOMAG Double Drum Vibratory Roller
  {
    filename: 'bomag-roller.svg',
    title: 'BOMAG BW 120 AD-5 Double Drum Vibratory Roller (2.7 Ton)',
    brandModel: 'BOMAG BW 120 AD-5',
    categoryBadge: 'Construction & Plant',
    locationText: 'Dodoma Urban, Dodoma',
    specPill1: '1,200mm Drum Width',
    specPill2: 'Kubota 24.8kW Diesel',
    skyTop: '#dbeafe',
    skyBottom: '#eff6ff',
    groundTop: '#44403c',
    groundBottom: '#1c1917',
    accentColor: '#eab308',
    artworkSvg: `
      <!-- Front Steel Drum -->
      <ellipse cx="235" cy="410" rx="68" ry="68" fill="url(#metalLight)" stroke="#52525b" stroke-width="8" />
      <circle cx="235" cy="410" r="32" fill="#27272a" />
      <circle cx="235" cy="410" r="14" fill="#facc15" />
      <!-- Rear Steel Drum -->
      <ellipse cx="555" cy="410" rx="68" ry="68" fill="url(#metalLight)" stroke="#52525b" stroke-width="8" />
      <circle cx="555" cy="410" r="32" fill="#27272a" />
      <circle cx="555" cy="410" r="14" fill="#facc15" />
      <!-- Articulated Chassis Body -->
      <path d="M195 360 L260 285 L540 285 L595 360 L595 405 L195 405 Z" fill="#facc15" stroke="#ca8a04" stroke-width="3" />
      <rect x="215" y="370" width="90" height="45" rx="6" fill="#ca8a04" />
      <rect x="495" y="370" width="90" height="45" rx="6" fill="#ca8a04" />
      <!-- Engine Grille & Branding -->
      <rect x="265" y="305" width="110" height="55" rx="6" fill="#27272a" />
      <text x="282" y="338" fill="#facc15" font-family="system-ui, sans-serif" font-weight="900" font-size="20">BOMAG</text>
      <!-- Operator Seat & Controls -->
      <rect x="405" y="235" width="52" height="52" rx="8" fill="#18181b" />
      <line x1="370" y1="285" x2="388" y2="235" stroke="#18181b" stroke-width="8" stroke-linecap="round" />
      <ellipse cx="388" cy="232" rx="18" ry="6" fill="#27272a" />
      <!-- ROPS Roll Bar & Amber Beacon -->
      <path d="M465 285 L465 155 L525 155 L525 285" fill="none" stroke="#18181b" stroke-width="14" stroke-linejoin="round" />
      <circle cx="495" cy="140" r="11" fill="#f97316" filter="url(#softGlow)" />
    `,
  },

  // 3. Solar Submersible Borehole Irrigation Kit
  {
    filename: 'solar-irrigation-pump.svg',
    title: 'Grundfos SQFlex Solar Submersible Borehole Irrigation Kit',
    brandModel: 'GRUNDFOS SQFLEX + 1.2kW PV',
    categoryBadge: 'Agriculture & Farming',
    locationText: 'Kilombero, Morogoro',
    specPill1: '120m Max Head',
    specPill2: '9.5 m³/hr Flow',
    skyTop: '#bae6fd',
    skyBottom: '#ecfeff',
    groundTop: '#3f6212',
    groundBottom: '#1a2e05',
    accentColor: '#22c55e',
    artworkSvg: `
      <!-- Solar Array Stand (Left-Center) -->
      <line x1="250" y1="310" x2="250" y2="445" stroke="url(#metalLight)" stroke-width="14" />
      <line x1="190" y1="445" x2="310" y2="445" stroke="#3f3f46" stroke-width="10" stroke-linecap="round" />
      <!-- Tilted Monocrystalline Solar Panels -->
      <g transform="translate(250, 255) rotate(-18)">
        <rect x="-150" y="-75" width="300" height="145" rx="6" fill="#0f172a" stroke="#e2e8f0" stroke-width="6" />
        <!-- Solar Cell Grid -->
        <line x1="-75" y1="-75" x2="-75" y2="70" stroke="#38bdf8" stroke-width="1.5" stroke-opacity="0.5" />
        <line x1="0" y1="-75" x2="0" y2="70" stroke="#38bdf8" stroke-width="1.5" stroke-opacity="0.5" />
        <line x1="75" y1="-75" x2="75" y2="70" stroke="#38bdf8" stroke-width="1.5" stroke-opacity="0.5" />
        <line x1="-150" y1="-25" x2="150" y2="-25" stroke="#38bdf8" stroke-width="1.5" stroke-opacity="0.5" />
        <line x1="-150" y1="25" x2="150" y2="25" stroke="#38bdf8" stroke-width="1.5" stroke-opacity="0.5" />
      </g>
      <!-- Stainless Steel Submersible Pump Cylinder (Vertical Right) -->
      <rect x="465" y="185" width="46" height="260" rx="20" fill="url(#chrome)" stroke="#71717a" stroke-width="2" />
      <rect x="465" y="245" width="46" height="28" fill="#18181b" />
      <rect x="465" y="340" width="46" height="16" fill="#0284c7" />
      <!-- MPPT Controller Box -->
      <rect x="360" y="335" width="76" height="95" rx="8" fill="#f8fafc" stroke="#64748b" stroke-width="3" />
      <rect x="375" y="352" width="46" height="26" rx="3" fill="#0284c7" />
      <circle cx="390" cy="398" r="6" fill="#22c55e" />
      <circle cx="410" cy="398" r="6" fill="#f59e0b" />
      <!-- Coiled Blue Layflat Irrigation Hose -->
      <ellipse cx="615" cy="405" rx="72" ry="48" fill="none" stroke="#0284c7" stroke-width="22" />
      <ellipse cx="615" cy="405" rx="48" ry="30" fill="none" stroke="#0369a1" stroke-width="18" />
    `,
  },

  // 4. Multi-Crop Diesel Maize Sheller & Thresher
  {
    filename: 'maize-sheller.svg',
    title: 'Multi-Crop Diesel Maize Sheller & Paddy Thresher (3.5 Ton/Hr)',
    brandModel: 'AGROTECH TZ-3500 MULTI',
    categoryBadge: 'Agriculture & Farming',
    locationText: 'Mbeya Urban, Mbeya',
    specPill1: '3,500 kg/hr Output',
    specPill2: '18HP Changfa Diesel',
    skyTop: '#fef3c7',
    skyBottom: '#fffbeb',
    groundTop: '#57534e',
    groundBottom: '#292524',
    accentColor: '#16a34a',
    artworkSvg: `
      <!-- Main Thresher Drum & Hopper -->
      <rect x="240" y="250" width="270" height="150" rx="14" fill="#16a34a" stroke="#14532d" stroke-width="4" />
      <!-- Top Grain Feed Hopper -->
      <path d="M265 250 L220 165 L370 165 L345 250 Z" fill="#15803d" stroke="#14532d" stroke-width="3" />
      <!-- Blower Discharge Chute -->
      <path d="M470 250 L545 170 L595 190 L510 280 Z" fill="#eab308" stroke="#ca8a04" stroke-width="3" />
      <!-- Belt Drive Pulley Wheel -->
      <circle cx="385" cy="325" r="52" fill="#dc2626" stroke="#7f1d1d" stroke-width="6" />
      <circle cx="385" cy="325" r="14" fill="#d4d4d8" />
      <!-- Diesel Engine on Front Frame -->
      <rect x="520" y="315" width="95" height="85" rx="6" fill="#27272a" stroke="#52525b" stroke-width="3" />
      <circle cx="565" cy="355" r="28" fill="#dc2626" />
      <!-- Drive Belt -->
      <line x1="385" y1="273" x2="565" y2="327" stroke="#18181b" stroke-width="7" />
      <line x1="385" y1="377" x2="565" y2="383" stroke="#18181b" stroke-width="7" />
      <!-- Tow Chassis & Wheels -->
      <rect x="195" y="400" width="445" height="18" rx="4" fill="#14532d" />
      <circle cx="285" cy="435" r="38" fill="#18181b" stroke="#52525b" stroke-width="5" />
      <circle cx="285" cy="435" r="16" fill="#eab308" />
      <circle cx="545" cy="435" r="38" fill="#18181b" stroke="#52525b" stroke-width="5" />
      <circle cx="545" cy="435" r="16" fill="#eab308" />
    `,
  },

  // 5. Luxury Clear-Span Marquee Event Tent (300 Pax)
  {
    filename: 'marquee-tent-300pax.svg',
    title: 'Luxury Clear-Span Marquee Event Tent (15m x 30m — 300 Pax)',
    brandModel: 'ALU-SPAN 15x30M VIP',
    categoryBadge: 'Events & Hospitality',
    locationText: 'Masaki, Dar es Salaam',
    specPill1: '450 m² Clear-Span',
    specPill2: '850gsm PVC + Chandeliers',
    skyTop: '#1e1b4b',
    skyBottom: '#312e81',
    groundTop: '#14532d',
    groundBottom: '#052e16',
    accentColor: '#fbbf24',
    artworkSvg: `
      <!-- Illuminated Tent Interior Warm Glow -->
      <rect x="135" y="255" width="530" height="175" fill="#fef3c7" fill-opacity="0.9" />
      <!-- Warm Chandeliers Inside Tent -->
      <circle cx="265" cy="295" r="22" fill="#f59e0b" filter="url(#softGlow)" />
      <circle cx="400" cy="290" r="26" fill="#f59e0b" filter="url(#softGlow)" />
      <circle cx="535" cy="295" r="22" fill="#f59e0b" filter="url(#softGlow)" />
      <!-- Clear-Span A-Frame Roof Peak -->
      <polygon points="105,260 400,130 695,260" fill="#f8fafc" stroke="#cbd5e1" stroke-width="4" />
      <line x1="400" y1="130" x2="400" y2="260" stroke="#e2e8f0" stroke-width="3" />
      <line x1="252" y1="195" x2="252" y2="260" stroke="#e2e8f0" stroke-width="2" />
      <line x1="548" y1="195" x2="548" y2="260" stroke="#e2e8f0" stroke-width="2" />
      <!-- Aluminum Structural Columns & French Arched Windows -->
      <rect x="130" y="260" width="14" height="175" fill="url(#metalLight)" />
      <rect x="260" y="260" width="12" height="175" fill="url(#metalLight)" />
      <rect x="394" y="260" width="12" height="175" fill="url(#metalLight)" />
      <rect x="528" y="260" width="12" height="175" fill="url(#metalLight)" />
      <rect x="656" y="260" width="14" height="175" fill="url(#metalLight)" />
      <!-- Draped White Silk Curtains -->
      <path d="M144 260 Q180 340 144 435" fill="#ffffff" opacity="0.85" />
      <path d="M656 260 Q620 340 656 435" fill="#ffffff" opacity="0.85" />
      <!-- VIP Red Carpet Entrance -->
      <polygon points="355,435 445,435 485,495 315,495" fill="#b91c1c" stroke="#fbbf24" stroke-width="2" />
    `,
  },

  // 6. JBL Line Array Concert PA System
  {
    filename: 'jbl-line-array-pa.svg',
    title: 'JBL VTX Line Array Concert PA System (12kW + 32ch Digital Mixer)',
    brandModel: 'JBL VTX A8 + SOUNDcraft Si',
    categoryBadge: 'Events & Hospitality',
    locationText: 'Kinondoni, Dar es Salaam',
    specPill1: '12,000W Peak RMS',
    specPill2: '8 Tops + 4 Dual-18 Subs',
    skyTop: '#09090b',
    skyBottom: '#18181b',
    groundTop: '#27272a',
    groundBottom: '#09090b',
    accentColor: '#f97316',
    artworkSvg: `
      <!-- Left & Right Aluminum Truss Towers -->
      <rect x="165" y="125" width="32" height="320" fill="none" stroke="url(#chrome)" stroke-width="5" />
      <path d="M165 140 L197 170 L165 200 L197 230 L165 260 L197 290 L165 320 L197 350 L165 380" fill="none" stroke="#a1a1aa" stroke-width="3" />
      <rect x="603" y="125" width="32" height="320" fill="none" stroke="url(#chrome)" stroke-width="5" />
      <path d="M603 140 L635 170 L603 200 L635 230 L603 260 L635 290 L603 320 L635 350 L603 380" fill="none" stroke="#a1a1aa" stroke-width="3" />
      <!-- Left Flown Line Array Stack (4 Curved Boxes) -->
      <g transform="translate(215, 145)">
        <rect x="0" y="0" width="92" height="32" rx="4" fill="#18181b" stroke="#52525b" stroke-width="2" />
        <rect x="0" y="35" width="92" height="32" rx="4" fill="#18181b" stroke="#52525b" stroke-width="2" />
        <rect x="2" y="70" width="92" height="32" rx="4" fill="#18181b" stroke="#52525b" stroke-width="2" />
        <rect x="6" y="105" width="92" height="32" rx="4" fill="#18181b" stroke="#52525b" stroke-width="2" />
        <rect x="38" y="10" width="16" height="12" fill="#f97316" />
        <rect x="38" y="45" width="16" height="12" fill="#f97316" />
        <rect x="40" y="80" width="16" height="12" fill="#f97316" />
      </g>
      <!-- Right Flown Line Array Stack -->
      <g transform="translate(493, 145)">
        <rect x="0" y="0" width="92" height="32" rx="4" fill="#18181b" stroke="#52525b" stroke-width="2" />
        <rect x="0" y="35" width="92" height="32" rx="4" fill="#18181b" stroke="#52525b" stroke-width="2" />
        <rect x="-2" y="70" width="92" height="32" rx="4" fill="#18181b" stroke="#52525b" stroke-width="2" />
        <rect x="-6" y="105" width="92" height="32" rx="4" fill="#18181b" stroke="#52525b" stroke-width="2" />
        <rect x="38" y="10" width="16" height="12" fill="#f97316" />
        <rect x="38" y="45" width="16" height="12" fill="#f97316" />
        <rect x="36" y="80" width="16" height="12" fill="#f97316" />
      </g>
      <!-- Dual-18 Ground Subwoofers -->
      <rect x="205" y="360" width="115" height="88" rx="6" fill="#18181b" stroke="#3f3f46" stroke-width="3" />
      <circle cx="240" cy="404" r="24" fill="#09090b" stroke="#27272a" stroke-width="3" />
      <circle cx="288" cy="404" r="24" fill="#09090b" stroke="#27272a" stroke-width="3" />
      <rect x="480" y="360" width="115" height="88" rx="6" fill="#18181b" stroke="#3f3f46" stroke-width="3" />
      <circle cx="515" cy="404" r="24" fill="#09090b" stroke="#27272a" stroke-width="3" />
      <circle cx="563" cy="404" r="24" fill="#09090b" stroke="#27272a" stroke-width="3" />
      <!-- Center Digital Mixing Console in Flight Case -->
      <rect x="340" y="345" width="120" height="75" rx="6" fill="#27272a" stroke="#a1a1aa" stroke-width="3" />
      <rect x="355" y="355" width="42" height="24" rx="2" fill="#38bdf8" />
      <line x1="360" y1="395" x2="360" y2="412" stroke="#f8fafc" stroke-width="3" />
      <line x1="375" y1="390" x2="375" y2="412" stroke="#f8fafc" stroke-width="3" />
      <line x1="390" y1="398" x2="390" y2="412" stroke="#f8fafc" stroke-width="3" />
      <line x1="405" y1="392" x2="405" y2="412" stroke="#f8fafc" stroke-width="3" />
      <line x1="420" y1="396" x2="420" y2="412" stroke="#f97316" stroke-width="3" />
    `,
  },

  // 7. Mobile Cold-Room Catering Chiller Trailer
  {
    filename: 'mobile-catering-chiller.svg',
    title: 'Mobile Cold-Room Walk-In Refrigerated Catering Trailer (12m³)',
    brandModel: 'THERMOKING POLAR-12T',
    categoryBadge: 'Events & Hospitality',
    locationText: 'Stone Town, Zanzibar',
    specPill1: '-5°C to +8°C Digital',
    specPill2: '220V Single-Phase / Gen',
    skyTop: '#bae6fd',
    skyBottom: '#f0f9ff',
    groundTop: '#64748b',
    groundBottom: '#334155',
    accentColor: '#38bdf8',
    artworkSvg: `
      <!-- Insulated White Chiller Box Body -->
      <rect x="195" y="190" width="380" height="220" rx="10" fill="#f8fafc" stroke="#cbd5e1" stroke-width="4" />
      <!-- Stainless Steel Door Lock Rods & Hinges -->
      <line x1="385" y1="195" x2="385" y2="405" stroke="#94a3b8" stroke-width="3" />
      <rect x="215" y="215" width="150" height="175" rx="4" fill="none" stroke="#e2e8f0" stroke-width="2" />
      <rect x="405" y="215" width="150" height="175" rx="4" fill="none" stroke="#e2e8f0" stroke-width="2" />
      <!-- Front ThermoKing Refrigeration Condenser Unit -->
      <rect x="575" y="215" width="62" height="115" rx="6" fill="#0284c7" stroke="#0369a1" stroke-width="3" />
      <circle cx="606" cy="255" r="20" fill="#0f172a" />
      <rect x="588" y="290" width="36" height="22" rx="3" fill="#38bdf8" />
      <!-- Galvanized Drawbar & Hitch -->
      <path d="M575 400 L685 400 L695 385" fill="none" stroke="url(#metalLight)" stroke-width="10" stroke-linecap="round" />
      <line x1="635" y1="400" x2="635" y2="445" stroke="#475569" stroke-width="6" />
      <!-- Twin Axle Trailer Wheels -->
      <circle cx="335" cy="430" r="36" fill="#18181b" stroke="#475569" stroke-width="5" />
      <circle cx="335" cy="430" r="16" fill="#e2e8f0" />
      <circle cx="425" cy="430" r="36" fill="#18181b" stroke="#475569" stroke-width="5" />
      <circle cx="425" cy="430" r="16" fill="#e2e8f0" />
    `,
  },

  // 8. Hino 500 10-Ton Flatbed Truck with Hiab Crane
  {
    filename: 'hino-hiab-crane-truck.svg',
    title: 'Hino 500 Series 10-Ton Flatbed Truck with Palfinger 5T Hiab Crane',
    brandModel: 'HINO 500 + PALFINGER PK11002',
    categoryBadge: 'Transport & Logistics',
    locationText: 'Kurasini, Dar es Salaam',
    specPill1: '10-Ton Payload',
    specPill2: '5-Ton Hydraulic Crane',
    skyTop: '#bae6fd',
    skyBottom: '#f8fafc',
    groundTop: '#475569',
    groundBottom: '#1e293b',
    accentColor: '#f59e0b',
    artworkSvg: `
      <!-- Heavy Truck Chassis Rail -->
      <rect x="115" y="385" width="575" height="22" rx="4" fill="#18181b" />
      <!-- Steel Flatbed Drop-Side Deck -->
      <rect x="115" y="345" width="365" height="40" rx="3" fill="#e2e8f0" stroke="#64748b" stroke-width="3" />
      <line x1="205" y1="345" x2="205" y2="385" stroke="#64748b" stroke-width="3" />
      <line x1="295" y1="345" x2="295" y2="385" stroke="#64748b" stroke-width="3" />
      <line x1="385" y1="345" x2="385" y2="385" stroke="#64748b" stroke-width="3" />
      <!-- Palfinger Knuckle-Boom Hiab Crane (Behind Cab) -->
      <rect x="485" y="265" width="34" height="120" rx="4" fill="#dc2626" stroke="#991b1b" stroke-width="3" />
      <path d="M500 275 L345 165 L215 215" fill="none" stroke="#dc2626" stroke-width="20" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M215 215 L175 240" fill="none" stroke="#facc15" stroke-width="12" stroke-linecap="round" />
      <!-- Crane Hook & Sling -->
      <line x1="175" y1="240" x2="175" y2="310" stroke="#18181b" stroke-width="3" />
      <circle cx="175" cy="316" r="8" fill="#facc15" stroke="#18181b" stroke-width="2" />
      <!-- Hino Forward-Control Cab (Right) -->
      <path d="M525 235 L645 235 L685 305 L685 395 L525 395 Z" fill="#ffffff" stroke="#94a3b8" stroke-width="3" />
      <!-- Windshield & Side Window -->
      <polygon points="545,250 635,250 668,305 545,305" fill="url(#glass)" />
      <rect x="655" y="345" width="30" height="22" rx="4" fill="#fef08a" />
      <!-- Truck Wheels -->
      <circle cx="195" cy="425" r="42" fill="#18181b" stroke="#475569" stroke-width="6" />
      <circle cx="195" cy="425" r="18" fill="#cbd5e1" />
      <circle cx="290" cy="425" r="42" fill="#18181b" stroke="#475569" stroke-width="6" />
      <circle cx="290" cy="425" r="18" fill="#cbd5e1" />
      <circle cx="605" cy="425" r="42" fill="#18181b" stroke="#475569" stroke-width="6" />
      <circle cx="605" cy="425" r="18" fill="#cbd5e1" />
    `,
  },

  // 9. Toyota 3.0-Ton Diesel Forklift
  {
    filename: 'toyota-forklift-3t.svg',
    title: 'Toyota 8FD30 3.0-Ton Diesel Warehouse & Yard Forklift (4.5m Mast)',
    brandModel: 'TOYOTA 8FD30 3.0-TON',
    categoryBadge: 'Transport & Logistics',
    locationText: 'Tanga Port, Tanga',
    specPill1: '3,000 kg Lift',
    specPill2: '4.5m Triplex Mast',
    skyTop: '#fef3c7',
    skyBottom: '#f8fafc',
    groundTop: '#52525b',
    groundBottom: '#27272a',
    accentColor: '#f97316',
    artworkSvg: `
      <!-- Counterweight & Body (Left) -->
      <path d="M210 315 L445 315 L465 415 L195 415 Q185 365 210 315 Z" fill="#ea580c" stroke="#9a3412" stroke-width="3" />
      <text x="245" y="375" fill="#ffffff" font-family="system-ui, sans-serif" font-weight="900" font-size="22">TOYOTA</text>
      <!-- Overhead Guard Cage -->
      <path d="M235 315 L255 185 L425 185 L445 315" fill="none" stroke="#18181b" stroke-width="12" stroke-linejoin="round" />
      <!-- Operator Seat & Steering -->
      <rect x="305" y="255" width="45" height="55" rx="6" fill="#18181b" />
      <line x1="395" y1="315" x2="375" y2="255" stroke="#27272a" stroke-width="8" />
      <!-- 4.5m Vertical Hydraulic Mast & Forks (Right) -->
      <rect x="475" y="115" width="18" height="315" fill="#18181b" />
      <rect x="498" y="130" width="14" height="300" fill="#3f3f46" />
      <!-- Steel Pallet Forks & Pallet Load -->
      <path d="M512 325 L512 415 L645 415" fill="none" stroke="#18181b" stroke-width="12" stroke-linejoin="round" />
      <rect x="525" y="315" width="105" height="90" rx="6" fill="#d97706" stroke="#92400e" stroke-width="3" />
      <!-- Solid Industrial Tires -->
      <circle cx="245" cy="430" r="34" fill="#18181b" stroke="#52525b" stroke-width="5" />
      <circle cx="245" cy="430" r="14" fill="#ea580c" />
      <circle cx="430" cy="425" r="42" fill="#18181b" stroke="#52525b" stroke-width="5" />
      <circle cx="430" cy="425" r="18" fill="#ea580c" />
    `,
  },

  // 10. Mitsubishi Fuso Canter 3.5T Box Cargo Truck
  {
    filename: 'fuso-canter-cargo.svg',
    title: 'Mitsubishi Fuso Canter 3.5-Ton Enclosed Tail-Lift Cargo Truck',
    brandModel: 'FUSO CANTER FE85 BOX',
    categoryBadge: 'Transport & Logistics',
    locationText: 'Arusha Urban, Arusha',
    specPill1: '3,500 kg Payload',
    specPill2: '1,000kg Hydraulic Lift',
    skyTop: '#dbeafe',
    skyBottom: '#f8fafc',
    groundTop: '#475569',
    groundBottom: '#1e293b',
    accentColor: '#38bdf8',
    artworkSvg: `
      <!-- Enclosed Aluminum Box Body -->
      <rect x="145" y="185" width="355" height="210" rx="6" fill="#f8fafc" stroke="#cbd5e1" stroke-width="4" />
      <rect x="145" y="345" width="355" height="24" fill="#0284c7" />
      <text x="175" y="285" fill="#0f172a" font-family="system-ui, sans-serif" font-weight="900" font-size="24" letter-spacing="1">RENTZ LOGISTICS</text>
      <!-- Hydraulic Tail Lift Platform (Rear Left) -->
      <rect x="115" y="315" width="30" height="85" rx="3" fill="#475569" />
      <!-- Fuso Canter Cab (Right) -->
      <path d="M505 240 L615 240 L655 305 L655 395 L505 395 Z" fill="#ffffff" stroke="#94a3b8" stroke-width="3" />
      <polygon points="520,255 605,255 638,305 520,305" fill="url(#glass)" />
      <!-- Wheels -->
      <circle cx="245" cy="425" r="38" fill="#18181b" stroke="#52525b" stroke-width="5" />
      <circle cx="245" cy="425" r="16" fill="#cbd5e1" />
      <circle cx="575" cy="425" r="38" fill="#18181b" stroke="#52525b" stroke-width="5" />
      <circle cx="575" cy="425" r="16" fill="#cbd5e1" />
    `,
  },

  // 11. DJI Inspire 3 8K Cinema Drone Kit
  {
    filename: 'dji-inspire3-cinema-drone.svg',
    title: 'DJI Inspire 3 8K Cinema Drone + Zenmuse X9-8K Air Gimbal Kit',
    brandModel: 'DJI INSPIRE 3 RAW 8K',
    categoryBadge: 'Media & Production',
    locationText: 'Arusha Urban, Arusha',
    specPill1: '8K CinemaDNG / ProRes',
    specPill2: '6x TB51 Batteries + RC Plus',
    skyTop: '#0f172a',
    skyBottom: '#1e293b',
    groundTop: '#27272a',
    groundBottom: '#09090b',
    accentColor: '#38bdf8',
    artworkSvg: `
      <!-- Pelican Hard Flight Case (Bottom Left) -->
      <rect x="135" y="335" width="215" height="110" rx="10" fill="#18181b" stroke="#3f3f46" stroke-width="4" />
      <rect x="165" y="365" width="45" height="22" rx="3" fill="#f59e0b" />
      <!-- DJI Inspire 3 Carbon Fiber Transforming Frame (Center-Right) -->
      <path d="M360 235 L465 215 L570 235 L465 265 Z" fill="url(#metalDark)" stroke="#71717a" stroke-width="3" />
      <!-- Carbon Arms & Landing Skids -->
      <line x1="315" y1="185" x2="365" y2="335" stroke="#52525b" stroke-width="10" stroke-linecap="round" />
      <line x1="615" y1="185" x2="565" y2="335" stroke="#52525b" stroke-width="10" stroke-linecap="round" />
      <!-- Spinning Carbon Propellers -->
      <ellipse cx="315" cy="175" rx="75" ry="10" fill="#e2e8f0" fill-opacity="0.45" />
      <ellipse cx="615" cy="175" rx="75" ry="10" fill="#e2e8f0" fill-opacity="0.45" />
      <!-- Zenmuse X9-8K Full-Frame Gimbal & Lens -->
      <circle cx="465" cy="295" r="34" fill="#18181b" stroke="#a1a1aa" stroke-width="3" />
      <circle cx="465" cy="295" r="18" fill="url(#glass)" stroke="#f59e0b" stroke-width="2" />
      <!-- DJI RC Plus Dual Monitor Controller -->
      <rect x="425" y="375" width="95" height="62" rx="8" fill="#27272a" stroke="#71717a" stroke-width="3" />
      <rect x="437" y="385" width="71" height="42" rx="4" fill="#0284c7" />
    `,
  },

  // 12. Aputure LS 600d Pro Studio Lighting Kit
  {
    filename: 'aputure-600d-lighting.svg',
    title: 'Aputure LS 600d Pro Daylight COB LED 3-Light Studio Kit + C-Stands',
    brandModel: 'APUTURE LS 600d PRO x3',
    categoryBadge: 'Media & Production',
    locationText: 'Mikocheni, Dar es Salaam',
    specPill1: '720W Daylight COB',
    specPill2: 'Light Dome II + V-Mount',
    skyTop: '#18181b',
    skyBottom: '#27272a',
    groundTop: '#3f3f46',
    groundBottom: '#18181b',
    accentColor: '#fbbf24',
    artworkSvg: `
      <!-- Warm Studio Key Light Glow -->
      <circle cx="360" cy="215" r="130" fill="#fef08a" fill-opacity="0.22" filter="url(#softGlow)" />
      <!-- Chrome C-Stand 1 (Center) -->
      <line x1="360" y1="220" x2="360" y2="445" stroke="url(#chrome)" stroke-width="8" />
      <path d="M290 445 L360 420 L430 445" fill="none" stroke="url(#chrome)" stroke-width="8" stroke-linecap="round" />
      <!-- Octagonal Light Dome Softbox -->
      <polygon points="315,135 405,135 440,185 440,245 405,295 315,295 280,245 280,185" fill="#18181b" stroke="#e4e4e7" stroke-width="4" />
      <polygon points="325,150 395,150 424,190 424,240 395,280 325,280 296,240 296,190" fill="#fef9c3" />
      <!-- Aputure 600d Ballast Box on Stand -->
      <rect x="342" y="330" width="36" height="58" rx="4" fill="#27272a" stroke="#ef4444" stroke-width="2" />
      <!-- Second Fresnel COB Light on Right Stand -->
      <line x1="555" y1="245" x2="555" y2="445" stroke="url(#chrome)" stroke-width="7" />
      <path d="M500 445 L555 425 L610 445" fill="none" stroke="url(#chrome)" stroke-width="7" stroke-linecap="round" />
      <rect x="515" y="195" width="82" height="52" rx="6" fill="#27272a" stroke="#ef4444" stroke-width="3" />
      <circle cx="515" cy="221" r="24" fill="#fef08a" filter="url(#softGlow)" />
    `,
  },

  // 13. Epson 7,000-Lumen Laser Projector & Screen
  {
    filename: 'epson-laser-projector.svg',
    title: 'Epson EB-PU1007W 7,000-Lumen WUXGA Laser Projector + 150" Fast-Fold Screen',
    brandModel: 'EPSON EB-PU1007W 7000LM',
    categoryBadge: 'Office & Technology',
    locationText: 'CBD / Posta, Dar es Salaam',
    specPill1: '7,000 ANSI Lumens',
    specPill2: '150" Fast-Fold Screen',
    skyTop: '#1e293b',
    skyBottom: '#334155',
    groundTop: '#475569',
    groundBottom: '#0f172a',
    accentColor: '#38bdf8',
    artworkSvg: `
      <!-- 150-Inch Fast-Fold Projection Screen (Back) -->
      <rect x="215" y="120" width="370" height="210" rx="4" fill="#0f172a" stroke="#18181b" stroke-width="10" />
      <rect x="225" y="130" width="350" height="190" fill="#e0f2fe" />
      <!-- Chart & Presentation Graphic on Screen -->
      <rect x="255" y="235" width="35" height="65" rx="3" fill="#0284c7" />
      <rect x="305" y="205" width="35" height="95" rx="3" fill="#0ea5e9" />
      <rect x="355" y="175" width="35" height="125" rx="3" fill="#f59e0b" />
      <line x1="245" y1="330" x2="245" y2="435" stroke="url(#metalLight)" stroke-width="8" />
      <line x1="555" y1="330" x2="555" y2="435" stroke="url(#metalLight)" stroke-width="8" />
      <!-- Epson High-Lumen White Laser Projector Body (Foreground) -->
      <rect x="295" y="365" width="210" height="82" rx="14" fill="#f8fafc" stroke="#cbd5e1" stroke-width="3" />
      <rect x="315" y="382" width="65" height="48" rx="4" fill="#334155" />
      <!-- Motorized Center Projection Lens -->
      <circle cx="435" cy="406" r="28" fill="#0f172a" stroke="#94a3b8" stroke-width="5" />
      <circle cx="435" cy="406" r="14" fill="#38bdf8" filter="url(#softGlow)" />
    `,
  },

  // 14. Enterprise Pop-Up Conference & Starlink Kit
  {
    filename: 'enterprise-conference-kit.svg',
    title: 'Enterprise Pop-Up Conference Kit (High-Speed Satellite Router + APC 3kVA UPS + 8 Laptops)',
    brandModel: 'DELL PRO + APC 3kVA + SAT',
    categoryBadge: 'Office & Technology',
    locationText: 'Dodoma Urban, Dodoma',
    specPill1: '8x Core i7 Laptops',
    specPill2: '3kVA Pure Sine UPS',
    skyTop: '#f1f5f9',
    skyBottom: '#e2e8f0',
    groundTop: '#334155',
    groundBottom: '#1e293b',
    accentColor: '#0ea5e9',
    artworkSvg: `
      <!-- APC 3kVA Smart-UPS Tower (Left) -->
      <rect x="165" y="235" width="88" height="205" rx="8" fill="#18181b" stroke="#3f3f46" stroke-width="3" />
      <rect x="182" y="260" width="54" height="32" rx="3" fill="#0284c7" />
      <text x="188" y="330" fill="#a1a1aa" font-family="ui-monospace, monospace" font-weight="700" font-size="14">APC 3kVA</text>
      <!-- Phased Array Satellite Dish on Tripod (Right) -->
      <g transform="translate(585, 255) rotate(-15)">
        <rect x="-65" y="-45" width="130" height="90" rx="10" fill="#f8fafc" stroke="#94a3b8" stroke-width="4" />
      </g>
      <line x1="585" y1="295" x2="585" y2="430" stroke="#334155" stroke-width="8" />
      <path d="M540 440 L585 415 L630 440" fill="none" stroke="#334155" stroke-width="7" stroke-linecap="round" />
      <!-- Dell Latitude Pro Laptops (Center) -->
      <rect x="305" y="295" width="175" height="110" rx="6" fill="#1e293b" stroke="#64748b" stroke-width="4" />
      <rect x="315" y="305" width="155" height="90" fill="#0ea5e9" />
      <polygon points="285,405 500,405 520,435 265,435" fill="url(#metalLight)" stroke="#64748b" stroke-width="2" />
    `,
  },

  // 15. Kärcher Commercial High-Pressure Washer
  {
    filename: 'karcher-pressure-washer.svg',
    title: 'Kärcher HD 9/20-4 Classic Commercial High-Pressure Washer (200 Bar)',
    brandModel: 'KÄRCHER HD 9/20-4 200BAR',
    categoryBadge: 'Home & Personal Work',
    locationText: 'Kinondoni, Dar es Salaam',
    specPill1: '200 Bar Pressure',
    specPill2: '900 L/hr Flow + Lance',
    skyTop: '#fef9c3',
    skyBottom: '#f8fafc',
    groundTop: '#57534e',
    groundBottom: '#292524',
    accentColor: '#facc15',
    artworkSvg: `
      <!-- Upright Yellow & Grey Kärcher Body -->
      <path d="M295 165 L395 165 L395 415 L295 415 Z" fill="none" stroke="#27272a" stroke-width="10" stroke-linejoin="round" />
      <rect x="280" y="235" width="135" height="185" rx="14" fill="#facc15" stroke="#ca8a04" stroke-width="4" />
      <rect x="295" y="255" width="105" height="55" rx="6" fill="#27272a" />
      <text x="305" y="288" fill="#facc15" font-family="system-ui, sans-serif" font-weight="900" font-size="17">KÄRCHER</text>
      <!-- Hose Reel & Brass Pump Manifold -->
      <circle cx="348" cy="355" r="32" fill="#27272a" stroke="#52525b" stroke-width="5" />
      <circle cx="348" cy="355" r="12" fill="#ca8a04" />
      <!-- Rear Heavy Wheels -->
      <circle cx="290" cy="425" r="38" fill="#18181b" stroke="#52525b" stroke-width="5" />
      <circle cx="290" cy="425" r="16" fill="#facc15" />
      <!-- Stainless Steel High-Pressure Trigger Lance & Spray -->
      <line x1="435" y1="420" x2="585" y2="235" stroke="url(#chrome)" stroke-width="7" stroke-linecap="round" />
      <line x1="435" y1="420" x2="475" y2="370" stroke="#18181b" stroke-width="14" stroke-linecap="round" />
      <polygon points="585,235 685,155 715,215" fill="#bae6fd" fill-opacity="0.55" />
    `,
  },

  // 16. 6.5m Aluminum Mobile Scaffolding Tower
  {
    filename: 'aluminum-scaffold-tower.svg',
    title: '6.5m Double-Width Aluminum Mobile Scaffolding Tower + Outriggers',
    brandModel: 'BOSS ALU-TOWER 6.5M',
    categoryBadge: 'Home & Personal Work',
    locationText: 'Nyamagana, Mwanza',
    specPill1: '6.5m Working Height',
    specPill2: 'Locking Castor Wheels',
    skyTop: '#dbeafe',
    skyBottom: '#f8fafc',
    groundTop: '#52525b',
    groundBottom: '#27272a',
    accentColor: '#f59e0b',
    artworkSvg: `
      <!-- Vertical Aluminum Tower Uprights -->
      <line x1="295" y1="105" x2="295" y2="435" stroke="url(#chrome)" stroke-width="8" />
      <line x1="495" y1="105" x2="495" y2="435" stroke="url(#chrome)" stroke-width="8" />
      <!-- Horizontal Rungs & Guardrails -->
      <line x1="295" y1="115" x2="495" y2="115" stroke="#ef4444" stroke-width="6" />
      <line x1="295" y1="165" x2="495" y2="165" stroke="url(#chrome)" stroke-width="10" />
      <rect x="295" y="155" width="200" height="12" fill="#d97706" />
      <line x1="295" y1="285" x2="495" y2="285" stroke="url(#chrome)" stroke-width="8" />
      <line x1="295" y1="395" x2="495" y2="395" stroke="url(#chrome)" stroke-width="8" />
      <!-- Diagonal Cross Braces -->
      <line x1="295" y1="165" x2="495" y2="285" stroke="#cbd5e1" stroke-width="4" />
      <line x1="495" y1="165" x2="295" y2="285" stroke="#cbd5e1" stroke-width="4" />
      <line x1="295" y1="285" x2="495" y2="395" stroke="#cbd5e1" stroke-width="4" />
      <line x1="495" y1="285" x2="295" y2="395" stroke="#cbd5e1" stroke-width="4" />
      <!-- Outrigger Stabilizers -->
      <line x1="295" y1="340" x2="215" y2="435" stroke="url(#chrome)" stroke-width="6" />
      <line x1="495" y1="340" x2="575" y2="435" stroke="url(#chrome)" stroke-width="6" />
      <!-- Heavy-Duty Locking Castor Wheels -->
      <circle cx="295" cy="442" r="14" fill="#eab308" stroke="#18181b" stroke-width="4" />
      <circle cx="495" cy="442" r="14" fill="#eab308" stroke="#18181b" stroke-width="4" />
    `,
  },

  // 17. Luxury Velvet Stage Backdrop & Floral Arch
  {
    filename: 'velvet-stage-backdrop.svg',
    title: 'Luxury Velvet Stage Backdrop, Gold Floral Arch & 4x LED Uplights',
    brandModel: 'ROYAL-GALA 6M STAGE KIT',
    categoryBadge: 'Art & Decor',
    locationText: 'Ilala, Dar es Salaam',
    specPill1: '6m x 3m Velvet Drape',
    specPill2: 'Gold Arch + 4x Par LEDs',
    skyTop: '#2e1065',
    skyBottom: '#4c1d95',
    groundTop: '#451a03',
    groundBottom: '#1c1917',
    accentColor: '#fbbf24',
    artworkSvg: `
      <!-- Warm Uplighting Beams -->
      <polygon points="220,425 170,135 270,135" fill="#fbbf24" fill-opacity="0.22" />
      <polygon points="400,425 350,135 450,135" fill="#fbbf24" fill-opacity="0.25" />
      <polygon points="580,425 530,135 630,135" fill="#fbbf24" fill-opacity="0.22" />
      <!-- Pleated Cream Velvet Backdrop Panels -->
      <rect x="165" y="135" width="470" height="290" rx="6" fill="#fef3c7" stroke="#d97706" stroke-width="4" />
      <line x1="245" y1="135" x2="245" y2="425" stroke="#fde68a" stroke-width="4" />
      <line x1="325" y1="135" x2="325" y2="425" stroke="#fde68a" stroke-width="4" />
      <line x1="400" y1="135" x2="400" y2="425" stroke="#fde68a" stroke-width="4" />
      <line x1="475" y1="135" x2="475" y2="425" stroke="#fde68a" stroke-width="4" />
      <line x1="555" y1="135" x2="555" y2="425" stroke="#fde68a" stroke-width="4" />
      <!-- Brushed Gold Geometric Floral Arch -->
      <circle cx="400" cy="295" r="125" fill="none" stroke="#f59e0b" stroke-width="10" />
      <!-- White & Blush Rose Floral Clusters on Arch -->
      <circle cx="305" cy="215" r="24" fill="#ffffff" />
      <circle cx="325" cy="195" r="22" fill="#fecdd3" />
      <circle cx="355" cy="178" r="26" fill="#ffffff" />
      <circle cx="495" cy="215" r="24" fill="#ffffff" />
      <circle cx="475" cy="195" r="22" fill="#fecdd3" />
      <!-- White Tufted Stage Sofa -->
      <rect x="315" y="345" width="170" height="75" rx="14" fill="#ffffff" stroke="#d97706" stroke-width="3" />
      <rect x="295" y="370" width="210" height="55" rx="10" fill="#fffbeb" stroke="#d97706" stroke-width="3" />
    `,
  },

  // 18. Swahili Carved Lounge & Gallery Exhibition Plinths
  {
    filename: 'gallery-exhibition-decor.svg',
    title: 'Swahili Carved Hardwood Lounge Set, Brass Stanchions & 12 Gallery Display Plinths',
    brandModel: 'ZANZIBAR HERITAGE CURATION',
    categoryBadge: 'Art & Decor',
    locationText: 'Stone Town, Zanzibar',
    specPill1: '12 White Museum Plinths',
    specPill2: 'Swahili Teak + Brass',
    skyTop: '#fef3c7',
    skyBottom: '#fffbeb',
    groundTop: '#78350f',
    groundBottom: '#451a03',
    accentColor: '#d97706',
    artworkSvg: `
      <!-- Museum Display Plinths with Sculptural Art -->
      <rect x="175" y="255" width="75" height="175" fill="#ffffff" stroke="#d6d3d1" stroke-width="3" />
      <circle cx="212" cy="215" r="28" fill="#b45309" />
      <rect x="550" y="235" width="75" height="195" fill="#ffffff" stroke="#d6d3d1" stroke-width="3" />
      <polygon points="587,165 615,225 560,225" fill="#18181b" />
      <!-- Swahili Carved Teak Bench (Center) -->
      <rect x="295" y="275" width="210" height="95" rx="8" fill="#78350f" stroke="#451a03" stroke-width="4" />
      <rect x="305" y="345" width="190" height="28" rx="4" fill="#fef3c7" />
      <rect x="295" y="370" width="16" height="65" fill="#451a03" />
      <rect x="489" y="370" width="16" height="65" fill="#451a03" />
      <!-- Brass VIP Stanchions & Velvet Rope -->
      <line x1="255" y1="335" x2="255" y2="445" stroke="#f59e0b" stroke-width="7" />
      <circle cx="255" cy="330" r="9" fill="#fbbf24" />
      <line x1="535" y1="335" x2="535" y2="445" stroke="#f59e0b" stroke-width="7" />
      <circle cx="535" cy="330" r="9" fill="#fbbf24" />
      <path d="M255 350 Q395 415 535 350" fill="none" stroke="#991b1b" stroke-width="8" stroke-linecap="round" />
    `,
  },

  // 19. Leica TS16 Robotic Total Station Surveying Kit
  {
    filename: 'leica-total-station.svg',
    title: 'Leica Viva TS16 1" Robotic Total Station + GNSS RTK Rover Surveying Kit',
    brandModel: 'LEICA VIVA TS16 1" R1000',
    categoryBadge: 'Specialized & Industrial',
    locationText: 'Dodoma Urban, Dodoma',
    specPill1: '1" Angular Accuracy',
    specPill2: '1,000m Prismless + Tripod',
    skyTop: '#bae6fd',
    skyBottom: '#f0f9ff',
    groundTop: '#78716c',
    groundBottom: '#44403c',
    accentColor: '#eab308',
    artworkSvg: `
      <!-- Heavy Aluminum & Yellow Survey Tripod -->
      <line x1="385" y1="265" x2="265" y2="465" stroke="#facc15" stroke-width="12" stroke-linecap="round" />
      <line x1="385" y1="265" x2="385" y2="475" stroke="#facc15" stroke-width="12" stroke-linecap="round" />
      <line x1="385" y1="265" x2="505" y2="465" stroke="#facc15" stroke-width="12" stroke-linecap="round" />
      <!-- Tribrach Base & Leica TS16 Head -->
      <rect x="345" y="245" width="80" height="20" rx="4" fill="#18181b" />
      <rect x="340" y="145" width="90" height="100" rx="12" fill="#eab308" stroke="#ca8a04" stroke-width="3" />
      <!-- Telescope & EDM Objective Lens -->
      <circle cx="385" cy="192" r="28" fill="#18181b" stroke="#52525b" stroke-width="4" />
      <circle cx="385" cy="192" r="14" fill="url(#glass)" />
      <!-- GNSS RTK Rover Pole & Prism (Right) -->
      <line x1="565" y1="115" x2="565" y2="455" stroke="#ef4444" stroke-width="7" />
      <line x1="565" y1="185" x2="565" y2="255" stroke="#ffffff" stroke-width="7" />
      <circle cx="565" cy="110" r="22" fill="#f8fafc" stroke="#64748b" stroke-width="3" />
      <!-- Rugged CS20 Field Controller on Pole -->
      <rect x="572" y="265" width="44" height="32" rx="4" fill="#18181b" stroke="#eab308" stroke-width="2" />
    `,
  },

  // 20. Miller Trailblazer 325 Diesel Engine Welder
  {
    filename: 'miller-diesel-welder.svg',
    title: 'Miller Trailblazer 325 Diesel Engine-Driven Welder/Generator (TIG/MIG/Stick)',
    brandModel: 'MILLER TRAILBLAZER 325',
    categoryBadge: 'Specialized & Industrial',
    locationText: 'Ilemela, Mwanza',
    specPill1: '325A DC Welding',
    specPill2: '12kW Aux Generator',
    skyTop: '#dbeafe',
    skyBottom: '#f1f5f9',
    groundTop: '#475569',
    groundBottom: '#1e293b',
    accentColor: '#0284c7',
    artworkSvg: `
      <!-- Miller Blue Heavy Steel Enclosure -->
      <rect x="205" y="215" width="370" height="195" rx="10" fill="#0369a1" stroke="#075985" stroke-width="4" />
      <rect x="225" y="235" width="145" height="145" rx="6" fill="#0f172a" />
      <!-- Digital Amperage & Voltage Meters -->
      <rect x="242" y="252" width="50" height="26" rx="3" fill="#22c55e" />
      <rect x="302" y="252" width="50" height="26" rx="3" fill="#22c55e" />
      <!-- Engine Louvre Vents & Miller Branding -->
      <text x="395" y="285" fill="#ffffff" font-family="system-ui, sans-serif" font-weight="900" font-size="30" font-style="italic">Miller</text>
      <text x="395" y="312" fill="#bae6fd" font-family="ui-monospace, monospace" font-weight="700" font-size="14">TRAILBLAZER 325</text>
      <!-- Welding Leads & Electrode Stinger -->
      <path d="M265 365 Q180 435 145 395" fill="none" stroke="#18181b" stroke-width="10" stroke-linecap="round" />
      <rect x="125" y="382" width="36" height="14" rx="4" fill="#ef4444" />
      <!-- Trailer Running Gear -->
      <rect x="175" y="410" width="440" height="16" rx="4" fill="#18181b" />
      <circle cx="390" cy="435" r="38" fill="#18181b" stroke="#52525b" stroke-width="5" />
      <circle cx="390" cy="435" r="16" fill="#cbd5e1" />
    `,
  },
];

for (const scene of scenes) {
  wrapRealisticScene(scene);
}

console.log('Generated ' + scenes.length + ' equipment visual plates in ' + OUT_DIR);
