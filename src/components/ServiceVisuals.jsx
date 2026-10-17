import React from 'react';

/**
 * High-fidelity architectural vector compositions representing luxury property spaces.
 * Engineered with realistic lighting gradients, luxury materials (marble, warm wood, glass),
 * and meticulous attention to detail.
 */

// 1. Residential & Penthouse Living Space
export function PenthouseLivingVisual({ className = "w-full h-full" }) {
  return (
    <svg viewBox="0 0 600 380" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1E293B" />
          <stop offset="60%" stopColor="#334155" />
          <stop offset="100%" stopColor="#FFB566" stopOpacity="0.4" />
        </linearGradient>
        <linearGradient id="floorGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0B1D4A" />
          <stop offset="40%" stopColor="#1E3670" />
          <stop offset="100%" stopColor="#061434" />
        </linearGradient>
        <linearGradient id="marbleSlab" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F8FAFC" />
          <stop offset="50%" stopColor="#E2E8F0" />
          <stop offset="100%" stopColor="#CBD5E1" />
        </linearGradient>
        <linearGradient id="goldAccent" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#FFB566" />
          <stop offset="100%" stopColor="#E89A45" />
        </linearGradient>
        <radialGradient id="lampGlow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#FFE0B8" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#FFE0B8" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Background Skyline through Floor-to-Ceiling Windows */}
      <rect width="600" height="240" fill="url(#skyGrad)" />
      
      {/* City Skyline Silhouettes */}
      <rect x="40" y="110" width="35" height="130" fill="#0F172A" opacity="0.6" />
      <rect x="85" y="80" width="45" height="160" fill="#0F172A" opacity="0.7" />
      <polygon points="107,35 105,80 110,80" fill="#CBD5E1" opacity="0.8" />
      <rect x="140" y="130" width="30" height="110" fill="#0F172A" opacity="0.5" />
      <rect x="180" y="95" width="50" height="145" fill="#0F172A" opacity="0.75" />
      <rect x="360" y="115" width="40" height="125" fill="#0F172A" opacity="0.6" />
      <rect x="410" y="70" width="45" height="170" fill="#0F172A" opacity="0.8" />
      <rect x="465" y="105" width="35" height="135" fill="#0F172A" opacity="0.65" />
      <rect x="510" y="125" width="50" height="115" fill="#0F172A" opacity="0.5" />

      {/* Warm City Window Lights */}
      <circle cx="95" cy="110" r="1.5" fill="#FFB566" opacity="0.8" />
      <circle cx="105" cy="130" r="1.5" fill="#FFB566" opacity="0.9" />
      <circle cx="200" cy="120" r="1.5" fill="#FFB566" opacity="0.8" />
      <circle cx="430" cy="100" r="1.5" fill="#FFB566" opacity="0.9" />
      <circle cx="440" cy="130" r="1.5" fill="#FFB566" opacity="0.7" />

      {/* Black Window Mullions / Clean Glass Panes */}
      <line x1="150" y1="0" x2="150" y2="240" stroke="#0B132B" strokeWidth="4" />
      <line x1="300" y1="0" x2="300" y2="240" stroke="#0B132B" strokeWidth="4" />
      <line x1="450" y1="0" x2="450" y2="240" stroke="#0B132B" strokeWidth="4" />
      <line x1="0" y1="238" x2="600" y2="238" stroke="#0B132B" strokeWidth="6" />

      {/* Pristine Polished Marble Floor with Mirror Reflection */}
      <rect y="240" width="600" height="140" fill="url(#floorGrad)" />
      
      {/* Floor reflection highlights */}
      <polygon points="140,240 160,240 220,380 180,380" fill="#CBD5E1" opacity="0.08" />
      <polygon points="290,240 310,240 370,380 330,380" fill="#CBD5E1" opacity="0.08" />
      <polygon points="440,240 460,240 520,380 480,380" fill="#CBD5E1" opacity="0.08" />

      {/* Designer Brass Floor Lamp with Soft Ambient Glow */}
      <circle cx="510" cy="170" r="70" fill="url(#lampGlow)" />
      <path d="M490 230 Q510 130 510 150" stroke="url(#goldAccent)" strokeWidth="3" fill="none" />
      <ellipse cx="510" cy="155" rx="14" ry="7" fill="url(#goldAccent)" />
      <line x1="490" y1="230" x2="490" y2="340" stroke="url(#goldAccent)" strokeWidth="3" />
      <ellipse cx="490" cy="340" rx="16" ry="4" fill="url(#goldAccent)" />

      {/* Luxury Low-Profile Sofa (Clean, Modern Cream) */}
      <path d="M70 270 C70 255 85 245 105 245 L380 245 C400 245 415 255 415 270 L415 315 L70 315 Z" fill="#F8FAFC" />
      {/* Cushions seam */}
      <line x1="185" y1="245" x2="185" y2="315" stroke="#E2E8F0" strokeWidth="2" />
      <line x1="300" y1="245" x2="300" y2="315" stroke="#E2E8F0" strokeWidth="2" />
      <rect x="65" y="275" width="360" height="35" rx="8" fill="#F1F5F9" />
      
      {/* Marble Coffee Table with Gold Trim */}
      <ellipse cx="280" cy="335" rx="75" ry="22" fill="url(#marbleSlab)" />
      <ellipse cx="280" cy="335" rx="74" ry="21" fill="none" stroke="url(#goldAccent)" strokeWidth="2" />
      <line x1="240" y1="345" x2="240" y2="368" stroke="url(#goldAccent)" strokeWidth="2.5" />
      <line x1="320" y1="345" x2="320" y2="368" stroke="url(#goldAccent)" strokeWidth="2.5" />

      {/* WhiteGlove Pristine Sparkles */}
      <path d="M260 325 L263 318 L266 325 L273 328 L266 331 L263 338 L260 331 L253 328 Z" fill="#FFB566" />
      <path d="M420 225 L422 220 L424 225 L429 227 L424 229 L422 234 L420 229 L415 227 Z" fill="#FFB566" opacity="0.9" />
    </svg>
  );
}

// 2. Airbnb & Hotel-Grade Linen Turnover
export function AirbnbTurnoverVisual({ className = "w-full h-full" }) {
  return (
    <svg viewBox="0 0 600 380" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="wallGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0B1D4A" />
          <stop offset="100%" stopColor="#1E3670" />
        </linearGradient>
        <linearGradient id="headboard" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="100%" stopColor="#1E293B" />
        </linearGradient>
        <linearGradient id="linenShadow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="85%" stopColor="#F8FAFC" />
          <stop offset="100%" stopColor="#E2E8F0" />
        </linearGradient>
        <linearGradient id="goldDuvet" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#FFB566" />
          <stop offset="100%" stopColor="#E89A45" />
        </linearGradient>
      </defs>

      {/* Luxury Navy Bedroom Accent Wall */}
      <rect width="600" height="380" fill="url(#wallGrad)" />

      {/* Architectural Wall Sconces with Glow */}
      <circle cx="100" cy="110" r="40" fill="#FFB566" opacity="0.15" />
      <circle cx="100" cy="110" r="15" fill="#FFE0B8" opacity="0.5" />
      <circle cx="100" cy="110" r="4" fill="#FFFFFF" />
      <rect x="98" y="110" width="4" height="40" fill="#FFB566" />

      <circle cx="500" cy="110" r="40" fill="#FFB566" opacity="0.15" />
      <circle cx="500" cy="110" r="15" fill="#FFE0B8" opacity="0.5" />
      <circle cx="500" cy="110" r="4" fill="#FFFFFF" />
      <rect x="498" y="110" width="4" height="40" fill="#FFB566" />

      {/* Fluted Minimalist Headboard */}
      <rect x="130" y="80" width="340" height="150" rx="16" fill="url(#headboard)" />
      {/* Vertical fluted acoustic slats */}
      {[...Array(16)].map((_, i) => (
        <line key={i} x1={150 + i * 20} y1="80" x2={150 + i * 20} y2="230" stroke="#0F172A" strokeWidth="2" opacity="0.4" />
      ))}

      {/* Pillows: Fluffy, perfectly propped 5-star hotel style */}
      <rect x="160" y="160" width="120" height="60" rx="12" fill="#FFFFFF" />
      <rect x="170" y="150" width="100" height="50" rx="10" fill="#F1F5F9" />
      
      <rect x="320" y="160" width="120" height="60" rx="12" fill="#FFFFFF" />
      <rect x="330" y="150" width="100" height="50" rx="10" fill="#F1F5F9" />

      {/* Immaculate Folded Duvet / White Bedding */}
      <path d="M120 220 C120 205 135 200 160 200 L440 200 C465 200 480 205 480 220 L510 380 L90 380 Z" fill="url(#linenShadow)" />
      
      {/* Luxury Bed Runner in Apricot Gold */}
      <path d="M98 320 L502 320 L510 370 L90 370 Z" fill="url(#goldDuvet)" />
      
      {/* Hospitality Welcome Card & Towel Roll Detail */}
      <rect x="250" y="270" width="100" height="25" rx="6" fill="#FFFFFF" stroke="#E2E8F0" />
      <line x1="265" y1="282" x2="335" y2="282" stroke="#FFB566" strokeWidth="2" />
      
      {/* Cleanliness Sparkle */}
      <path d="M380 240 L382 233 L384 240 L391 242 L384 244 L382 251 L380 244 L373 242 Z" fill="#FFB566" />
    </svg>
  );
}

// 3. Deep Clean Kitchen & Stone Surfaces
export function DeepCleanKitchenVisual({ className = "w-full h-full" }) {
  return (
    <svg viewBox="0 0 600 380" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="tileGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0B1D4A" />
          <stop offset="100%" stopColor="#1E293B" />
        </linearGradient>
        <linearGradient id="quartzGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F8FAFC" />
          <stop offset="40%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#E2E8F0" />
        </linearGradient>
        <linearGradient id="chromeGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="50%" stopColor="#94A3B8" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
      </defs>

      {/* Dark Subway Tile / Backsplash */}
      <rect width="600" height="240" fill="url(#tileGrad)" />
      {/* Tile grout lines */}
      {[...Array(6)].map((_, r) => (
        <line key={r} x1="0" y1={40 * r} x2="600" y2={40 * r} stroke="#334155" strokeWidth="1" opacity="0.4" />
      ))}
      {[...Array(12)].map((_, c) => (
        <line key={c} x1={50 * c} y1="0" x2={50 * c} y2="240" stroke="#334155" strokeWidth="1" opacity="0.4" />
      ))}

      {/* Floating Under-Cabinet Warm LED Light Bar */}
      <rect x="60" y="38" width="480" height="4" fill="#FFB566" opacity="0.9" />
      <polygon points="60,42 540,42 580,180 20,180" fill="#FFE0B8" opacity="0.08" />

      {/* Polished Quartz Island Countertop with Beveled Rim */}
      <path d="M0 200 L600 200 L600 380 L0 380 Z" fill="url(#quartzGrad)" />
      <line x1="0" y1="202" x2="600" y2="202" stroke="#FFB566" strokeWidth="3" opacity="0.8" />

      {/* Polished Chrome Swan-Neck Faucet */}
      <path d="M300 200 L300 110 C300 80 340 80 340 110 L340 135" stroke="url(#chromeGrad)" strokeWidth="10" strokeLinecap="round" fill="none" />
      {/* Faucet Handle */}
      <line x1="285" y1="165" x2="315" y2="165" stroke="url(#chromeGrad)" strokeWidth="5" strokeLinecap="round" />
      <circle cx="340" cy="142" r="3" fill="#38BDF8" opacity="0.9" />

      {/* Stainless Undermount Sink Reflection */}
      <rect x="220" y="240" width="200" height="90" rx="12" fill="#0B132B" opacity="0.9" />
      <rect x="230" y="248" width="180" height="74" rx="8" fill="#1E293B" />
      <circle cx="320" cy="285" r="14" fill="#0F172A" />

      {/* Reflection Beams on Polished Stone */}
      <polygon points="80,205 130,205 160,380 90,380" fill="#FFFFFF" opacity="0.4" />
      <polygon points="440,205 480,205 520,380 460,380" fill="#FFFFFF" opacity="0.4" />

      {/* Sparkles of Spotless Perfection */}
      <path d="M140 230 L143 222 L146 230 L154 233 L146 236 L143 244 L140 236 L132 233 Z" fill="#FFB566" />
      <path d="M480 250 L482 244 L484 250 L490 252 L484 254 L482 260 L480 254 L474 252 Z" fill="#FFB566" />
      <path d="M320 90 L322 84 L324 90 L330 92 L324 94 L322 100 L320 94 L314 92 Z" fill="#38BDF8" />
    </svg>
  );
}

// 4. Commercial & Executive Workspace
export function CommercialOfficeVisual({ className = "w-full h-full" }) {
  return (
    <svg viewBox="0 0 600 380" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="officeSky" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0B1D4A" />
          <stop offset="100%" stopColor="#1E3670" />
        </linearGradient>
        <linearGradient id="glassPane" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#CBD5E1" stopOpacity="0.05" />
        </linearGradient>
      </defs>

      <rect width="600" height="380" fill="url(#officeSky)" />

      {/* Architectural Ceiling Lighting Grid */}
      <rect x="80" y="20" width="440" height="60" rx="8" fill="#1E293B" opacity="0.5" />
      {[...Array(5)].map((_, i) => (
        <rect key={i} x={100 + i * 85} y="35" width="70" height="30" rx="4" fill="#FFFFFF" opacity="0.8" />
      ))}

      {/* Glass Boardroom Partitions (Clean, Streak-free) */}
      <rect x="50" y="90" width="500" height="180" rx="8" fill="url(#glassPane)" stroke="#38BDF8" strokeWidth="1.5" strokeOpacity="0.4" />
      <line x1="210" y1="90" x2="210" y2="270" stroke="#38BDF8" strokeWidth="1.5" strokeOpacity="0.3" />
      <line x1="390" y1="90" x2="390" y2="270" stroke="#38BDF8" strokeWidth="1.5" strokeOpacity="0.3" />

      {/* Frosted Privacy Band (Common in High-End Law/Finance Offices) */}
      <rect x="50" y="160" width="500" height="40" fill="#FFFFFF" opacity="0.08" />

      {/* Modern Executive Conference Table */}
      <ellipse cx="300" cy="280" rx="190" ry="40" fill="#0F172A" />
      <ellipse cx="300" cy="278" rx="188" ry="38" fill="#1E293B" stroke="#FFB566" strokeWidth="1.5" />
      
      {/* High-Gloss Table Floor Reflection */}
      <rect y="295" width="600" height="85" fill="#061434" />
      <polygon points="180,300 240,300 280,380 200,380" fill="#FFB566" opacity="0.07" />
      <polygon points="360,300 420,300 460,380 380,380" fill="#FFB566" opacity="0.07" />

      {/* Sparkles */}
      <path d="M220 130 L222 124 L224 130 L230 132 L224 134 L222 140 L220 134 L214 132 Z" fill="#FFB566" />
      <path d="M380 180 L382 174 L384 180 L390 182 L384 184 L382 190 L380 184 L374 182 Z" fill="#38BDF8" />
    </svg>
  );
}

// 5. Move-In / Move-Out Ready Property
export function MoveInOutVisual({ className = "w-full h-full" }) {
  return (
    <svg viewBox="0 0 600 380" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="roomSun" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0B1D4A" />
          <stop offset="100%" stopColor="#1E3670" />
        </linearGradient>
        <linearGradient id="hardwood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C67B5C" />
          <stop offset="60%" stopColor="#9C5233" />
          <stop offset="100%" stopColor="#5E2B16" />
        </linearGradient>
      </defs>

      {/* Crisp White Freshly Painted Corner */}
      <rect width="600" height="230" fill="url(#roomSun)" />
      
      {/* Corner Wall Perspective */}
      <polygon points="0,0 280,0 280,230 0,210" fill="#1E293B" opacity="0.6" />
      <polygon points="280,0 600,0 600,210 280,230" fill="#0F172A" opacity="0.8" />
      <line x1="280" y1="0" x2="280" y2="230" stroke="#334155" strokeWidth="2" />

      {/* Sunlit French Patio Door */}
      <rect x="340" y="30" width="180" height="180" rx="4" fill="#38BDF8" opacity="0.2" stroke="#FFFFFF" strokeWidth="4" />
      <line x1="430" y1="30" x2="430" y2="210" stroke="#FFFFFF" strokeWidth="3" />
      <line x1="340" y1="120" x2="520" y2="120" stroke="#FFFFFF" strokeWidth="2" />

      {/* Warm Golden Sunlight Beams flooding the room */}
      <polygon points="340,30 520,30 590,380 200,380" fill="#FFE0B8" opacity="0.14" />

      {/* Immaculate Hardwood Floor Planks */}
      <polygon points="0,210 280,230 600,210 600,380 0,380" fill="url(#hardwood)" />
      {[...Array(8)].map((_, i) => (
        <line key={i} x1="0" y1={230 + i * 20} x2="600" y2={230 + i * 20} stroke="#421E0F" strokeWidth="1.5" opacity="0.5" />
      ))}

      {/* Golden Key on Velvet / Ribbon (Symbol of Move-In Readiness) */}
      <circle cx="280" cy="310" r="14" fill="#FFB566" />
      <circle cx="280" cy="310" r="8" fill="#C67B5C" />
      <rect x="290" y="307" width="28" height="6" rx="2" fill="#FFB566" />
      <rect x="310" y="313" width="4" height="6" fill="#FFB566" />
      <rect x="315" y="313" width="3" height="4" fill="#FFB566" />

      <path d="M250 280 L253 273 L256 280 L263 283 L256 286 L253 293 L250 286 L243 283 Z" fill="#FFB566" />
    </svg>
  );
}

// 6. City Landmark Silhouettes (Toronto, Seattle, Guadalajara)
export function CitySilhouette({ city = 'toronto', className = "w-full h-full" }) {
  if (city === 'seattle') {
    return (
      <svg viewBox="0 0 400 240" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <rect width="400" height="240" fill="#0B1D4A" />
        <ellipse cx="200" cy="200" rx="180" ry="60" fill="#1E3670" opacity="0.4" />
        {/* Mount Rainier background peak */}
        <polygon points="280,180 340,90 390,180" fill="#334155" opacity="0.5" />
        <polygon points="325,112 340,90 355,112" fill="#E2E8F0" opacity="0.8" />
        {/* Space Needle */}
        <line x1="160" y1="40" x2="160" y2="190" stroke="#FFB566" strokeWidth="3" />
        <ellipse cx="160" cy="80" rx="35" ry="10" fill="#FFB566" />
        <ellipse cx="160" cy="76" rx="20" ry="6" fill="#0B1D4A" />
        <rect x="145" y="86" width="30" height="8" rx="2" fill="#FFB566" />
        <polygon points="152,94 140,190 148,190" fill="#FFB566" />
        <polygon points="168,94 180,190 172,190" fill="#FFB566" />
        <line x1="160" y1="94" x2="160" y2="190" stroke="#FFB566" strokeWidth="2" />
        {/* City skyline bars */}
        <rect x="40" y="130" width="30" height="60" fill="#1E293B" />
        <rect x="80" y="110" width="35" height="80" fill="#0F172A" />
        <rect x="220" y="100" width="40" height="90" fill="#0F172A" />
        <rect x="270" y="125" width="30" height="65" fill="#1E293B" />
      </svg>
    );
  }

  if (city === 'guadalajara') {
    return (
      <svg viewBox="0 0 400 240" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <rect width="400" height="240" fill="#0B1D4A" />
        <ellipse cx="200" cy="200" rx="180" ry="60" fill="#1E3670" opacity="0.4" />
        {/* Cathedral Twin Neo-Gothic Towers */}
        <rect x="120" y="110" width="40" height="80" fill="#0F172A" />
        <polygon points="140,30 115,110 165,110" fill="#FFB566" opacity="0.9" />
        <line x1="140" y1="20" x2="140" y2="30" stroke="#FFB566" strokeWidth="2" />

        <rect x="240" y="110" width="40" height="80" fill="#0F172A" />
        <polygon points="260,30 235,110 285,110" fill="#FFB566" opacity="0.9" />
        <line x1="260" y1="20" x2="260" y2="30" stroke="#FFB566" strokeWidth="2" />

        {/* Central Facade & Dome */}
        <rect x="160" y="130" width="80" height="60" fill="#1E293B" />
        <path d="M180 130 C180 100 220 100 220 130 Z" fill="#E89A45" />
        <ellipse cx="200" cy="150" rx="14" ry="18" fill="#0B1D4A" />
      </svg>
    );
  }

  // Default: Toronto CN Tower & Waterfront
  return (
    <svg viewBox="0 0 400 240" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect width="400" height="240" fill="#0B1D4A" />
      <ellipse cx="200" cy="200" rx="180" ry="60" fill="#1E3670" opacity="0.4" />
      {/* Toronto CN Tower */}
      <line x1="180" y1="20" x2="180" y2="190" stroke="#FFB566" strokeWidth="3" />
      <polygon points="175,75 185,75 187,90 173,90" fill="#FFB566" />
      <ellipse cx="180" cy="85" rx="22" ry="7" fill="#FFB566" />
      <polygon points="176,92 170,190 175,190" fill="#FFB566" opacity="0.8" />
      <polygon points="184,92 190,190 185,190" fill="#FFB566" opacity="0.8" />
      {/* Surrounding Financial District Skyscraper Blocks */}
      <rect x="50" y="110" width="35" height="80" fill="#1E293B" />
      <rect x="95" y="80" width="40" height="110" fill="#0F172A" />
      <rect x="145" y="125" width="25" height="65" fill="#1E293B" opacity="0.8" />
      <rect x="210" y="95" width="45" height="95" fill="#0F172A" />
      <rect x="265" y="115" width="35" height="75" fill="#1E293B" />
      <rect x="310" y="70" width="40" height="120" fill="#0F172A" />
    </svg>
  );
}
