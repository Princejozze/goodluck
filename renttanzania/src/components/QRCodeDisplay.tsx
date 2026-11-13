import React from 'react';

interface QRCodeDisplayProps {
  value: string;
  size?: number;
  label?: string;
  subtitle?: string;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  value,
  size = 180,
  label,
  subtitle,
}) => {
  // Deterministic 21x21 QR-like matrix generation from hash
  const generateMatrix = (str: string) => {
    const size = 21;
    const matrix: boolean[][] = Array(size)
      .fill(false)
      .map(() => Array(size).fill(false));

    // Corner positioning patterns (7x7)
    const addFinder = (r: number, c: number) => {
      for (let i = 0; i < 7; i++) {
        for (let j = 0; j < 7; j++) {
          if (
            i === 0 ||
            i === 6 ||
            j === 0 ||
            j === 6 ||
            (i >= 2 && i <= 4 && j >= 2 && j <= 4)
          ) {
            matrix[r + i][c + j] = true;
          }
        }
      }
    };

    addFinder(0, 0); // Top Left
    addFinder(0, 14); // Top Right
    addFinder(14, 0); // Bottom Left

    // Fill timing patterns
    for (let i = 8; i < 13; i++) {
      matrix[6][i] = i % 2 === 0;
      matrix[i][6] = i % 2 === 0;
    }

    // Hash string into data bits
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        // Skip finder areas
        if (
          (r < 8 && c < 8) ||
          (r < 8 && c >= 13) ||
          (r >= 13 && c < 8) ||
          r === 6 ||
          c === 6
        ) {
          continue;
        }
        const pseudo = Math.abs(Math.sin((r * 31 + c * 17 + hash) * 0.1));
        matrix[r][c] = pseudo > 0.48;
      }
    }

    return matrix;
  };

  const matrix = generateMatrix(value);
  const cellSize = size / 21;

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl border border-stone-200 shadow-sm text-center">
      <div className="p-2 bg-white rounded-lg">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
          {matrix.map((row, rIdx) =>
            row.map((filled, cIdx) =>
              filled ? (
                <rect
                  key={`${rIdx}-${cIdx}`}
                  x={cIdx * cellSize}
                  y={rIdx * cellSize}
                  width={cellSize + 0.5}
                  height={cellSize + 0.5}
                  fill="#1c1917"
                />
              ) : null
            )
          )}
        </svg>
      </div>

      <div className="mt-3">
        {label && <p className="text-xs font-bold text-stone-900 tracking-wider font-mono">{label}</p>}
        <p className="text-[11px] text-stone-500 font-mono mt-0.5">{value}</p>
        {subtitle && <p className="text-[11px] text-amber-700 font-medium mt-1">{subtitle}</p>}
      </div>
    </div>
  );
};
