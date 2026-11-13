import React from 'react';

/**
 * EquipmentWatermarkBackground
 * Renders many compact, bold vector emblems of equipment & tools available for hire on RENTZ
 * (excavators, farm tractors, diesel generators, rotary hammer drills, cement mixers, cinema cameras,
 * 4K drones, forklifts, tipper trucks, stage PA subwoofers, scaffolding, and road rollers).
 * Arranged in a dense, crisp diagonal cascade pattern across the page with subtle reduced opacity.
 */
export const EquipmentWatermarkBackground: React.FC = () => {
  // Generate 16 diagonal rows with offset cycling to form clean diagonal tracks
  const rowCount = 16;
  const itemsPerRow = 14;

  return (
    <div
      className="fixed -inset-24 sm:-inset-40 pointer-events-none z-0 overflow-hidden select-none opacity-20"
      aria-hidden="true"
    >
      {/* Tilted container creating a true diagonal arrangement */}
      <div className="w-[140%] h-[140%] -ml-[20%] -mt-[20%] flex flex-col justify-center gap-3 sm:gap-4 transform -rotate-12 origin-center">
        {Array.from({ length: rowCount }).map((_, rowIdx) => {
          // Stagger items by rowIdx to produce clean diagonal lines across rows
          const offset = (rowIdx * 3) % WATERMARK_ITEMS.length;
          const rowItems = Array.from({ length: itemsPerRow }).map((__, colIdx) => {
            const itemIndex = (offset + colIdx) % WATERMARK_ITEMS.length;
            return WATERMARK_ITEMS[itemIndex];
          });

          return (
            <div
              key={`row-${rowIdx}`}
              className={`flex items-center justify-center gap-3 sm:gap-5 flex-nowrap whitespace-nowrap ${
                rowIdx % 2 === 0 ? '-translate-x-8 sm:-translate-x-12' : 'translate-x-8 sm:translate-x-12'
              }`}
            >
              {rowItems.map((item, colIdx) => (
                <div
                  key={`item-${rowIdx}-${colIdx}`}
                  className="flex flex-col items-center justify-center text-center shrink-0 w-16 sm:w-20"
                >
                  {/* Compact Bold Emblem Card */}
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl border-[1.5px] border-amber-700/60 bg-amber-100/40 backdrop-blur-2xs flex items-center justify-center p-1.5 shadow-2xs">
                    <svg
                      viewBox="0 0 48 48"
                      className="w-full h-full text-amber-800"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      {item.svgPaths}
                    </svg>
                  </div>

                  {/* Bold Compact Typography */}
                  <span className="text-[7.5px] sm:text-[8px] font-mono font-black tracking-wider uppercase text-amber-950 mt-1 leading-none drop-shadow-2xs">
                    {item.name}
                  </span>
                  <span className="text-[6.5px] sm:text-[7px] font-mono font-bold tracking-tight text-amber-800/80 leading-tight">
                    {item.category}
                  </span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface WatermarkItem {
  id: string;
  name: string;
  category: string;
  svgPaths: React.ReactNode;
}

const WATERMARK_ITEMS: WatermarkItem[] = [
  {
    id: 'excavator',
    name: 'Excavator',
    category: 'Plant Hire',
    svgPaths: (
      <g stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* Heavy Duty Tracks */}
        <rect x="5" y="33" width="28" height="8" rx="4" />
        <circle cx="11" cy="37" r="1.5" fill="currentColor" />
        <circle cx="19" cy="37" r="1.5" fill="currentColor" />
        <circle cx="27" cy="37" r="1.5" fill="currentColor" />
        {/* Cab */}
        <path d="M9 33V21h12l4 6v6H9z" />
        <path d="M13 23h5v5h-5z" />
        {/* Boom & Arm */}
        <path d="M21 25l10-12 10 8" />
        {/* Bucket */}
        <path d="M41 21l4 6-5 4-3-4z" />
      </g>
    ),
  },
  {
    id: 'tractor',
    name: 'Agri Tractor',
    category: 'Farming',
    svgPaths: (
      <g stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* Big Rear Tire */}
        <circle cx="13" cy="33" r="8" />
        <circle cx="13" cy="33" r="3" fill="currentColor" />
        {/* Front Tire */}
        <circle cx="37" cy="36" r="5" />
        <circle cx="37" cy="36" r="2" fill="currentColor" />
        {/* Engine Chassis */}
        <path d="M21 33V23h16v13" />
        {/* Cab & Exhaust */}
        <path d="M13 25V13h10l2 10" />
        <path d="M33 23V11h2" />
      </g>
    ),
  },
  {
    id: 'generator',
    name: 'Diesel Gen',
    category: 'Power Hire',
    svgPaths: (
      <g stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* Generator Main Enclosure */}
        <rect x="5" y="14" width="38" height="26" rx="3" />
        {/* Crane Lift Hook Ring */}
        <path d="M19 14V8a5 5 0 0 1 10 0v6" />
        {/* Cooling Air Louvers */}
        <path d="M11 22h9M11 27h9M11 32h9" />
        {/* Breaker & Meter Panel */}
        <rect x="25" y="20" width="13" height="14" rx="1.5" />
        <circle cx="29" cy="25" r="1.5" fill="currentColor" />
        <path d="M33 25h2M29 30h6" />
        {/* Anti-vibration Skids */}
        <path d="M9 40v3M39 40v3" />
      </g>
    ),
  },
  {
    id: 'drill',
    name: 'Hammer Drill',
    category: 'Power Tool',
    svgPaths: (
      <g stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* Drill Housing */}
        <path d="M7 17h16l4 4h9v6h-9l-4 2H7V17z" />
        {/* Heavy Chuck & Bit */}
        <rect x="36" y="22" width="4" height="4" />
        <path d="M40 24h6" />
        {/* Ergonomic Grip & Battery Base */}
        <path d="M11 29v11h10V29" />
        <rect x="9" y="40" width="14" height="4" rx="1" />
        <path d="M16 23v4" />
      </g>
    ),
  },
  {
    id: 'mixer',
    name: 'Cement Mixer',
    category: 'Concrete',
    svgPaths: (
      <g stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* Sturdy A-frame Stand */}
        <path d="M11 40L23 23l12 17M7 40h34" />
        <circle cx="9" cy="40" r="3" />
        <circle cx="39" cy="40" r="3" />
        {/* Tilted Mixing Drum */}
        <path d="M15 15l13-9 10 10-6 13-15-2z" />
        <path d="M28 6l7 7" />
        {/* Tilt Wheel */}
        <circle cx="13" cy="23" r="3.5" />
      </g>
    ),
  },
  {
    id: 'camera',
    name: 'Cine Camera',
    category: 'Cinema AV',
    svgPaths: (
      <g stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* Rig Body */}
        <rect x="13" y="15" width="20" height="17" rx="2" />
        {/* Matte Box & Cinema Lens */}
        <path d="M33 19l11-4v16l-11-4z" />
        {/* Top Cine Handle */}
        <path d="M17 15v-4h12v4" />
        {/* Onboard Monitor */}
        <rect x="7" y="17" width="6" height="8" rx="1" />
        {/* Quick Release Base */}
        <path d="M23 32v6M15 44l8-6 8 6" />
      </g>
    ),
  },
  {
    id: 'drone',
    name: '4K Drone',
    category: 'Surveying',
    svgPaths: (
      <g stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* Airframe & 3-Axis Gimbal */}
        <circle cx="24" cy="24" r="5" />
        <circle cx="24" cy="24" r="2" fill="currentColor" />
        {/* Diagonal Arms */}
        <path d="M20 20L11 11M28 20l9-9M20 28l-9 9M28 28l9 9" />
        {/* Quad Propellers */}
        <ellipse cx="10" cy="10" rx="6" ry="2" />
        <ellipse cx="38" cy="10" rx="6" ry="2" />
        <ellipse cx="10" cy="38" rx="6" ry="2" />
        <ellipse cx="38" cy="38" rx="6" ry="2" />
      </g>
    ),
  },
  {
    id: 'forklift',
    name: 'Forklift',
    category: 'Warehouse',
    svgPaths: (
      <g stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* Body Counterweight */}
        <path d="M5 34v-8a4 4 0 0 1 4-4h10l4 6v6H5z" />
        {/* Vertical Mast */}
        <path d="M11 22V9h8v13" />
        <path d="M27 7v27" />
        {/* Heavy Lift Forks */}
        <path d="M27 28h15v4" />
        {/* Solid Tyres */}
        <circle cx="9" cy="36" r="4" />
        <circle cx="25" cy="36" r="4" />
      </g>
    ),
  },
  {
    id: 'truck',
    name: 'Tipper Truck',
    category: 'Haulage',
    svgPaths: (
      <g stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* Commercial Cab */}
        <path d="M29 34V19h9l6 8v7H29z" />
        <path d="M35 21h4l4 6h-8z" />
        {/* Heavy Dump Bed */}
        <path d="M5 17l23-2v17H5V17z" />
        {/* Hauler Wheels */}
        <circle cx="11" cy="36" r="4" />
        <circle cx="19" cy="36" r="4" />
        <circle cx="38" cy="36" r="4" />
      </g>
    ),
  },
  {
    id: 'speaker',
    name: 'PA Subwoofer',
    category: 'Live Sound',
    svgPaths: (
      <g stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* Reinforced Tour Cabinet */}
        <rect x="11" y="8" width="26" height="34" rx="3" />
        {/* Compression Horn */}
        <rect x="17" y="13" width="14" height="6" rx="1" />
        {/* Low Frequency Driver */}
        <circle cx="24" cy="28" r="8" />
        <circle cx="24" cy="28" r="3" fill="currentColor" />
        {/* Bass Reflex Port */}
        <ellipse cx="24" cy="39" rx="4" ry="1" />
      </g>
    ),
  },
  {
    id: 'scaffolding',
    name: 'Scaffolding',
    category: 'Site Access',
    svgPaths: (
      <g stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* Steel Standards */}
        <path d="M11 7v35M37 7v35" />
        {/* Horizontal Ledgers */}
        <path d="M7 13h34M7 25h34M7 37h34" />
        {/* Diagonal X-Braces */}
        <path d="M11 13l26 12M37 13L11 25" />
        <path d="M11 25l26 12M37 25L11 37" />
        {/* Base Jacks */}
        <path d="M9 42h4M35 42h4" />
      </g>
    ),
  },
  {
    id: 'roller',
    name: 'Road Roller',
    category: 'Compactor',
    svgPaths: (
      <g stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* Heavy Compacting Drum */}
        <circle cx="13" cy="32" r="10" />
        <circle cx="13" cy="32" r="3" fill="currentColor" />
        {/* Rear Wheel */}
        <circle cx="36" cy="34" r="6" />
        {/* Articulated Cab */}
        <path d="M17 28h19V21l-6-6h-8l-5 13z" />
        <path d="M21 17h6v4h-6z" />
      </g>
    ),
  },
];
