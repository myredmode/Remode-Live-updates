// REDMODE Admin - Apparel Industry Color System & Presets
// Separation of Base Colors, Customer-Facing Premium Names, HEX values, and Internal SKU Codes

export interface ColorSuggestion {
  name: string;
  hex: string;
  code: string;
}

export interface BaseColorMeta {
  id: string;
  name: string;
  sampleHex: string;
  suggestions: ColorSuggestion[];
}

export const MULTI_COLOR_GRADIENT =
  'conic-gradient(from 0deg, #ef4444, #f59e0b, #10b981, #3b82f6, #8b5cf6, #ec4899, #ef4444)';

export const isMultiColorName = (name?: string, baseColor?: string): boolean => {
  const n = (name || '').toLowerCase();
  const b = (baseColor || '').toLowerCase();
  return n.includes('multi') || b.includes('multi');
};

export const BASE_COLORS: BaseColorMeta[] = [
  {
    id: 'multi',
    name: 'Multi Color',
    sampleHex: '#EC4899',
    suggestions: [
      { name: 'Multi Color', hex: '#EC4899', code: 'MC' },
      { name: 'Floral Multi', hex: '#F43F5E', code: 'FM' },
      { name: 'Printed Multi', hex: '#8B5CF6', code: 'PM' },
      { name: 'Festive Multi', hex: '#D97706', code: 'FSM' },
      { name: 'Pastel Multi', hex: '#F472B6', code: 'PSM' },
      { name: 'Tie-Dye Multi', hex: '#6366F1', code: 'TDM' },
      { name: 'Ethnic Multi', hex: '#E11D48', code: 'EM' },
      { name: 'Abstract Multi', hex: '#10B981', code: 'AM' },
    ],
  },
  {
    id: 'green',
    name: 'Green',
    sampleHex: '#556B2F',
    suggestions: [
      { name: 'Sage Green', hex: '#82976F', code: 'SG' },
      { name: 'Olive Green', hex: '#556B2F', code: 'OG' },
      { name: 'Moss Green', hex: '#8A9A5B', code: 'MG' },
      { name: 'Forest Green', hex: '#228B22', code: 'FG' },
      { name: 'Jade Green', hex: '#00A86B', code: 'JG' },
      { name: 'Pine Green', hex: '#01796F', code: 'PG' },
      { name: 'Olive Mist', hex: '#9E9764', code: 'OM' },
      { name: 'Eucalyptus', hex: '#5F8575', code: 'EU' },
      { name: 'Pistachio Mint', hex: '#93C572', code: 'PM' },
      { name: 'Emerald Green', hex: '#50C878', code: 'EG' },
      { name: 'Bottle Green', hex: '#006A4E', code: 'BG' },
      { name: 'Army Green', hex: '#4B5320', code: 'AG' },
      { name: 'Seafoam Green', hex: '#9FE2BF', code: 'SF' },
      { name: 'Clover Green', hex: '#3EA055', code: 'CG' },
    ],
  },
  {
    id: 'pink',
    name: 'Pink',
    sampleHex: '#F4C2C2',
    suggestions: [
      { name: 'Dusty Rose', hex: '#DCAE96', code: 'DR' },
      { name: 'Blush Pink', hex: '#DE5D83', code: 'BP' },
      { name: 'Rose Mist', hex: '#C48793', code: 'RM' },
      { name: 'Powder Pink', hex: '#FFD1DC', code: 'PP' },
      { name: 'Soft Blush', hex: '#F8C8DC', code: 'SB' },
      { name: 'Baby Pink', hex: '#F4C2C2', code: 'BP' },
      { name: 'Salmon Pink', hex: '#FF91A4', code: 'SP' },
      { name: 'Carnation Pink', hex: '#FFA6C9', code: 'CP' },
      { name: 'Coral Rose', hex: '#F88379', code: 'CR' },
      { name: 'Flamingo Pink', hex: '#FC8EAC', code: 'FP' },
      { name: 'Mauve Pink', hex: '#D8A0B0', code: 'MP' },
      { name: 'Rosewood', hex: '#65000B', code: 'RW' },
    ],
  },
  {
    id: 'white',
    name: 'White',
    sampleHex: '#FFFFFF',
    suggestions: [
      { name: 'Ivory White', hex: '#FFFFF0', code: 'IW' },
      { name: 'Pearl White', hex: '#F8F6F0', code: 'PW' },
      { name: 'Cloud White', hex: '#F5F5F5', code: 'CW' },
      { name: 'Snow White', hex: '#FFFAFA', code: 'SW' },
      { name: 'Soft Ivory', hex: '#FAF6E9', code: 'SI' },
      { name: 'Chalk White', hex: '#F6F6F4', code: 'CH' },
      { name: 'Off White', hex: '#F8F9FA', code: 'OW' },
      { name: 'Vanilla Cream', hex: '#FDFBF7', code: 'VC' },
      { name: 'Alabaster', hex: '#EDEAE0', code: 'AL' },
      { name: 'Opal White', hex: '#F0ECE1', code: 'OP' },
    ],
  },
  {
    id: 'black',
    name: 'Black',
    sampleHex: '#1A1A1A',
    suggestions: [
      { name: 'Jet Black', hex: '#1C1C1C', code: 'JB' },
      { name: 'Onyx Black', hex: '#0F0F0F', code: 'OB' },
      { name: 'Midnight Black', hex: '#121212', code: 'MB' },
      { name: 'Obsidian', hex: '#0B0B0B', code: 'OBS' },
      { name: 'Noir', hex: '#181818', code: 'NO' },
      { name: 'Charcoal Black', hex: '#262626', code: 'CB' },
      { name: 'Ebony', hex: '#1A1A1A', code: 'EB' },
      { name: 'Raven Black', hex: '#141414', code: 'RB' },
    ],
  },
  {
    id: 'blue',
    name: 'Blue',
    sampleHex: '#1E3A8A',
    suggestions: [
      { name: 'Powder Blue', hex: '#B0E0E6', code: 'PB' },
      { name: 'Midnight Blue', hex: '#191970', code: 'MB' },
      { name: 'Ocean Blue', hex: '#0077BE', code: 'OB' },
      { name: 'Azure Blue', hex: '#007FFF', code: 'AB' },
      { name: 'Royal Blue', hex: '#4169E1', code: 'RB' },
      { name: 'Navy Blue', hex: '#000080', code: 'NB' },
      { name: 'Sky Blue', hex: '#87CEEB', code: 'SB' },
      { name: 'Cobalt Blue', hex: '#0047AB', code: 'CB' },
      { name: 'Steel Blue', hex: '#4682B4', code: 'STB' },
      { name: 'Denim Blue', hex: '#1560BD', code: 'DB' },
      { name: 'Ice Blue', hex: '#D4F1F4', code: 'IB' },
      { name: 'Indigo Blue', hex: '#3F51B5', code: 'IN' },
    ],
  },
  {
    id: 'brown',
    name: 'Brown',
    sampleHex: '#5C4033',
    suggestions: [
      { name: 'Mocha', hex: '#4A3B32', code: 'MO' },
      { name: 'Cocoa', hex: '#4A2E18', code: 'CC' },
      { name: 'Walnut', hex: '#5C4033', code: 'WN' },
      { name: 'Espresso', hex: '#362B28', code: 'ES' },
      { name: 'Chocolate Brown', hex: '#3D1C02', code: 'CB' },
      { name: 'Caramel Brown', hex: '#AF6E4D', code: 'CR' },
      { name: 'Coffee Brown', hex: '#6F4E37', code: 'CF' },
      { name: 'Chestnut', hex: '#954535', code: 'CN' },
      { name: 'Cinnamon', hex: '#D2691E', code: 'CM' },
      { name: 'Tawny Brown', hex: '#CD5700', code: 'TB' },
    ],
  },
  {
    id: 'beige',
    name: 'Beige',
    sampleHex: '#E6D7B9',
    suggestions: [
      { name: 'Warm Beige', hex: '#E8DCC4', code: 'WB' },
      { name: 'Sand Beige', hex: '#E6D7B9', code: 'SB' },
      { name: 'Oatmeal', hex: '#D8CBB5', code: 'OT' },
      { name: 'Biscuit', hex: '#E3DAC9', code: 'BS' },
      { name: 'Camel', hex: '#C19A6B', code: 'CM' },
      { name: 'Khaki', hex: '#C3B091', code: 'KH' },
      { name: 'Desert Sand', hex: '#EDC9AF', code: 'DS' },
      { name: 'Ecru', hex: '#C2B280', code: 'EC' },
      { name: 'Mushroom', hex: '#BA9E88', code: 'MR' },
    ],
  },
  {
    id: 'yellow',
    name: 'Yellow',
    sampleHex: '#E1AD01',
    suggestions: [
      { name: 'Mustard Yellow', hex: '#E1AD01', code: 'MY' },
      { name: 'Marigold', hex: '#EAA221', code: 'MG' },
      { name: 'Sunshine Yellow', hex: '#FFDA29', code: 'SY' },
      { name: 'Honey Gold', hex: '#D4AF37', code: 'HG' },
      { name: 'Amber Glow', hex: '#FFBF00', code: 'AG' },
      { name: 'Lemon Chiffon', hex: '#FFFACD', code: 'LC' },
      { name: 'Ochre Yellow', hex: '#CC7722', code: 'OC' },
      { name: 'Buttercup', hex: '#F3E5AB', code: 'BC' },
    ],
  },
  {
    id: 'red',
    name: 'Red',
    sampleHex: '#DC2626',
    suggestions: [
      { name: 'Ruby Red', hex: '#E0115F', code: 'RR' },
      { name: 'Crimson Red', hex: '#990000', code: 'CR' },
      { name: 'Scarlet Red', hex: '#FF2400', code: 'SR' },
      { name: 'Cherry Red', hex: '#D2042D', code: 'CH' },
      { name: 'Brick Red', hex: '#CB4154', code: 'BR' },
      { name: 'Chili Red', hex: '#C21807', code: 'CL' },
      { name: 'Garnet', hex: '#733635', code: 'GN' },
    ],
  },
  {
    id: 'maroon',
    name: 'Maroon',
    sampleHex: '#722F37',
    suggestions: [
      { name: 'Wine Red', hex: '#722F37', code: 'WR' },
      { name: 'Burgundy', hex: '#800020', code: 'BG' },
      { name: 'Deep Maroon', hex: '#4B0014', code: 'DM' },
      { name: 'Bordeaux', hex: '#5C0120', code: 'BD' },
      { name: 'Oxblood', hex: '#4A0404', code: 'OX' },
      { name: 'Plum Maroon', hex: '#5E1914', code: 'PM' },
    ],
  },
  {
    id: 'purple',
    name: 'Purple',
    sampleHex: '#9333EA',
    suggestions: [
      { name: 'Lavender Mist', hex: '#E6E6FA', code: 'LM' },
      { name: 'Lilac Dream', hex: '#C8A2C8', code: 'LL' },
      { name: 'Deep Violet', hex: '#4B0082', code: 'DV' },
      { name: 'Plum Purple', hex: '#8E4585', code: 'PL' },
      { name: 'Mauve', hex: '#E0B0FF', code: 'MV' },
      { name: 'Orchid Purple', hex: '#DA70D6', code: 'OR' },
      { name: 'Mulberry', hex: '#C54B8C', code: 'MB' },
    ],
  },
  {
    id: 'grey',
    name: 'Grey',
    sampleHex: '#708090',
    suggestions: [
      { name: 'Slate Grey', hex: '#708090', code: 'SG' },
      { name: 'Charcoal Grey', hex: '#36454F', code: 'CG' },
      { name: 'Silver Grey', hex: '#C0C0C0', code: 'SV' },
      { name: 'Ash Grey', hex: '#B2BEB5', code: 'AG' },
      { name: 'Dove Grey', hex: '#6D6552', code: 'DG' },
      { name: 'Smoke Grey', hex: '#738276', code: 'SM' },
      { name: 'Heather Grey', hex: '#9E9E9E', code: 'HG' },
    ],
  },
  {
    id: 'orange',
    name: 'Orange',
    sampleHex: '#EA580C',
    suggestions: [
      { name: 'Rust Terracotta', hex: '#B7410E', code: 'RT' },
      { name: 'Burnt Orange', hex: '#CC5500', code: 'BO' },
      { name: 'Peach Coral', hex: '#FF7F50', code: 'PC' },
      { name: 'Tangerine', hex: '#F28500', code: 'TG' },
      { name: 'Copper Sunset', hex: '#B87333', code: 'CS' },
      { name: 'Amber Rust', hex: '#A75D27', code: 'AR' },
    ],
  },
  {
    id: 'cream',
    name: 'Cream',
    sampleHex: '#FFFDD0',
    suggestions: [
      { name: 'Almond Cream', hex: '#EFDECD', code: 'AC' },
      { name: 'Butter Cream', hex: '#FFFDD0', code: 'BC' },
      { name: 'Vanilla Cream', hex: '#FDFBF7', code: 'VC' },
      { name: 'Warm Ivory', hex: '#FAF0E6', code: 'WI' },
      { name: 'Linen Cream', hex: '#FAF0E6', code: 'LC' },
    ],
  },
  {
    id: 'navy',
    name: 'Navy',
    sampleHex: '#000080',
    suggestions: [
      { name: 'Navy Blue', hex: '#000080', code: 'NB' },
      { name: 'Midnight Navy', hex: '#1B263B', code: 'MN' },
      { name: 'Deep Sea Navy', hex: '#0D1B2A', code: 'DS' },
      { name: 'Regal Navy', hex: '#1E293B', code: 'RN' },
    ],
  },
  {
    id: 'teal',
    name: 'Teal',
    sampleHex: '#008080',
    suggestions: [
      { name: 'Teal Emerald', hex: '#008080', code: 'TE' },
      { name: 'Deep Teal', hex: '#005F5F', code: 'DT' },
      { name: 'Peacock Teal', hex: '#004953', code: 'PT' },
      { name: 'Ocean Teal', hex: '#01796F', code: 'OT' },
    ],
  },
];

// Quick presets requested explicitly in Requirement 15
export const QUICK_FANCY_PRESETS: ColorSuggestion[] = [
  { name: 'Multi Color', hex: '#EC4899', code: 'MC' },
  { name: 'Ivory White', hex: '#FFFFF0', code: 'IW' },
  { name: 'Pearl White', hex: '#F8F6F0', code: 'PW' },
  { name: 'Jet Black', hex: '#1C1C1C', code: 'JB' },
  { name: 'Onyx Black', hex: '#0F0F0F', code: 'OB' },
  { name: 'Sage Green', hex: '#82976F', code: 'SG' },
  { name: 'Olive Green', hex: '#556B2F', code: 'OG' },
  { name: 'Dusty Rose', hex: '#DCAE96', code: 'DR' },
  { name: 'Baby Pink', hex: '#F4C2C2', code: 'BP' },
  { name: 'Lavender Mist', hex: '#E6E6FA', code: 'LM' },
  { name: 'Powder Blue', hex: '#B0E0E6', code: 'PB' },
  { name: 'Midnight Blue', hex: '#191970', code: 'MB' },
  { name: 'Wine Red', hex: '#722F37', code: 'WR' },
  { name: 'Burgundy', hex: '#800020', code: 'BG' },
  { name: 'Mustard Yellow', hex: '#E1AD01', code: 'MY' },
  { name: 'Mocha', hex: '#4A3B32', code: 'MO' },
  { name: 'Cocoa', hex: '#4A2E18', code: 'CC' },
  { name: 'Charcoal', hex: '#36454F', code: 'CG' },
  { name: 'Navy Blue', hex: '#000080', code: 'NB' },
  { name: 'Rust Terracotta', hex: '#B7410E', code: 'RT' },
  { name: 'Teal Emerald', hex: '#008080', code: 'TE' },
];

// Calculate automatic SKU code from any color name
export const getAutoColorCode = (colorName: string): string => {
  const clean = colorName.trim();
  if (!clean) return 'CL';

  // Check preset matches
  const match = QUICK_FANCY_PRESETS.find(
    (p) => p.name.toLowerCase() === clean.toLowerCase()
  );
  if (match) return match.code;

  // Check in base colors suggestions
  for (const b of BASE_COLORS) {
    const sugMatch = b.suggestions.find(
      (s) => s.name.toLowerCase() === clean.toLowerCase()
    );
    if (sugMatch) return sugMatch.code;
  }

  // Split into words (e.g. "Sage Green" -> "SG", "Olive Mist" -> "OM")
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
};

// Strict HEX validation: #RGB or #RRGGBB (Requirement 12)
export const isValidHex = (hex: string): boolean => {
  if (!hex || typeof hex !== 'string') return false;
  const clean = hex.trim();
  return /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/.test(clean);
};

// Client-side image dominant color extractor using Canvas (Requirement 14)
export const extractDominantColorFromImage = (
  imageUrl: string
): Promise<{ hex: string; baseColorName: string; suggestedNames: string[] }> => {
  return new Promise((resolve, reject) => {
    if (!imageUrl) {
      return reject(new Error('No image URL provided'));
    }

    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = imageUrl;

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas 2D context unavailable'));

        // Sample center crop (avoids white borders or background)
        const size = 64;
        canvas.width = size;
        canvas.height = size;
        ctx.drawImage(img, 0, 0, size, size);

        const imgData = ctx.getImageData(0, 0, size, size).data;
        let rTotal = 0;
        let gTotal = 0;
        let bTotal = 0;
        let count = 0;

        for (let i = 0; i < imgData.length; i += 16) {
          const r = imgData[i];
          const g = imgData[i + 1];
          const b = imgData[i + 2];
          const a = imgData[i + 3];

          // Skip completely transparent or near pure white/black background pixels
          if (a < 128) continue;
          if (r > 250 && g > 250 && b > 250) continue;
          if (r < 10 && g < 10 && b < 10) continue;

          rTotal += r;
          gTotal += g;
          bTotal += b;
          count++;
        }

        if (count === 0) {
          // Fallback if image was all white/black
          rTotal = imgData[0] || 120;
          gTotal = imgData[1] || 140;
          bTotal = imgData[2] || 120;
          count = 1;
        }

        const avgR = Math.round(rTotal / count);
        const avgG = Math.round(gTotal / count);
        const avgB = Math.round(bTotal / count);

        const hex = `#${((1 << 24) + (avgR << 16) + (avgG << 8) + avgB)
          .toString(16)
          .slice(1)
          .toUpperCase()}`;

        // Find nearest base color by RGB distance
        let closestBase = BASE_COLORS[0];
        let minDistance = Infinity;

        BASE_COLORS.forEach((base) => {
          const bHex = base.sampleHex.replace('#', '');
          const bR = parseInt(bHex.substring(0, 2), 16);
          const bG = parseInt(bHex.substring(2, 4), 16);
          const bB = parseInt(bHex.substring(4, 6), 16);

          // Euclidean color distance
          const dist = Math.sqrt(
            Math.pow(avgR - bR, 2) + Math.pow(avgG - bG, 2) + Math.pow(avgB - bB, 2)
          );

          if (dist < minDistance) {
            minDistance = dist;
            closestBase = base;
          }
        });

        const suggestedNames = closestBase.suggestions.slice(0, 5).map((s) => s.name);

        resolve({
          hex,
          baseColorName: closestBase.name,
          suggestedNames,
        });
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = (err) => {
      reject(err);
    };
  });
};
