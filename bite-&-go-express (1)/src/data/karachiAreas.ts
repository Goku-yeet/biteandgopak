export interface DeliveryZone {
  name: string;
  distanceKm: number;
  highlight?: boolean;
  lat: number;
  lng: number;
}

export const BITE_AND_GO_BRANCH_LOCATION = {
  name: 'Bite & Go Express (Main Branch)',
  address: 'Shop 4, Five Star Chowrangi, Block I, North Nazimabad, Karachi, Sindh 74700',
  landmark: 'Five Star Chowrangi, North Nazimabad, Karachi',
  lat: 24.9372,
  lng: 67.0402,
  phone: '+92 300 1234567',
};

export const KARACHI_DELIVERY_AREAS: DeliveryZone[] = [
  // --- PRIMARY LOCAL & FREE DELIVERY ZONES (North Nazimabad Central Hub) ---
  { name: 'North Nazimabad - Block I (Five Star Chowrangi)', distanceKm: 0.5, highlight: true, lat: 24.9372, lng: 67.0402 },
  { name: 'North Nazimabad - Blocks A, B, C & D (KDA Officers)', distanceKm: 1.2, highlight: true, lat: 24.9310, lng: 67.0360 },
  { name: 'North Nazimabad - Blocks E, F, G & H (Five Star Chowrangi)', distanceKm: 1.6, highlight: true, lat: 24.9350, lng: 67.0410 },
  { name: 'North Nazimabad - Blocks J, K, L, M & N (Hyderi Market)', distanceKm: 2.2, highlight: true, lat: 24.9450, lng: 67.0360 },
  { name: 'North Nazimabad - Blocks P, Q, R, S, T, U & W', distanceKm: 2.8, highlight: true, lat: 24.9410, lng: 67.0300 },
  
  // --- IMMEDIATE ADJACENT NEIGHBORHOODS ---
  { name: 'Buffer Zone - Sectors 15-A1, 15-A2 & 15-B', distanceKm: 3.1, highlight: true, lat: 24.9580, lng: 67.0650 },
  { name: 'Buffer Zone - Sector 16-A, 16-B & KDA Flats', distanceKm: 3.5, highlight: true, lat: 24.9620, lng: 67.0710 },
  { name: 'Shadman Town & Sakhi Hassan Chowrangi', distanceKm: 3.6, highlight: true, lat: 24.9530, lng: 67.0580 },
  { name: 'Nagan Chowrangi, Anda Mor & UP More', distanceKm: 4.1, highlight: true, lat: 24.9700, lng: 67.0680 },
  { name: 'Nazimabad - Blocks 1, 2, 3, 4 & 5 (Inquiry Office)', distanceKm: 3.9, highlight: true, lat: 24.9150, lng: 67.0280 },
  { name: 'Paposh Nagar & Abbasi Shaheed Hospital Area', distanceKm: 3.2, highlight: true, lat: 24.9330, lng: 67.0250 },
  { name: 'Federal B Area - Blocks 1 to 7 (Water Pump & Yaseenabad)', distanceKm: 4.7, highlight: true, lat: 24.9250, lng: 67.0680 },
  { name: 'Federal B Area - Blocks 8 to 14 (Samanabad & Ancholi)', distanceKm: 5.1, highlight: true, lat: 24.9320, lng: 67.0740 },
  { name: 'Federal B Area - Blocks 15 to 22 (Dastagir, Mansoora & Azizabad)', distanceKm: 5.6, highlight: true, lat: 24.9380, lng: 67.0780 },
  { name: 'Karimabad, Gulberg Chowrangi & Tahir Villa', distanceKm: 5.4, highlight: true, lat: 24.9220, lng: 67.0550 },
  { name: 'Liaquatabad - Dak Khana, Super Market & Teen Hatti', distanceKm: 5.9, lat: 24.9080, lng: 67.0390 },

  // --- NORTH KARACHI, NEW KARACHI & SURJANI TOWN ---
  { name: 'North Karachi - Sectors 5, 7, 8 & Power House Chowrangi', distanceKm: 5.7, highlight: true, lat: 24.9850, lng: 67.0620 },
  { name: 'North Karachi - Sectors 2, 3, 9, 11-A, 11-B & 4K Chowrangi', distanceKm: 6.8, highlight: true, lat: 24.9910, lng: 67.0720 },
  { name: 'New Karachi - Industrial Area, Godhra & Sectors 4, 5', distanceKm: 7.6, lat: 24.9920, lng: 67.0500 },
  { name: 'Surjani Town - Sectors 4, 7, 10 & KDA Flats', distanceKm: 9.5, highlight: true, lat: 25.0150, lng: 67.0650 },
  { name: 'Surjani Town - Sectors 5, 8, 11 & Khuda Ki Basti', distanceKm: 11.2, lat: 25.0280, lng: 67.0580 },
  { name: 'Manghopir Road & Hub Dam Link', distanceKm: 12.0, lat: 25.0190, lng: 67.0250 },

  // --- GULSHAN, JOHAR & SCHEME 33 ---
  { name: 'Gulshan-e-Iqbal - Blocks 1 to 7 (Civic Centre & Disco Bakery)', distanceKm: 7.2, highlight: true, lat: 24.9180, lng: 67.0890 },
  { name: 'Gulshan-e-Iqbal - Blocks 10 to 14 (NIPA Chowrangi & Moti Mahal)', distanceKm: 8.2, highlight: true, lat: 24.9150, lng: 67.0950 },
  { name: 'Gulshan-e-Iqbal - Blocks 15 to 19 (Hassan Square & Expo Centre)', distanceKm: 8.8, lat: 24.9100, lng: 67.0990 },
  { name: 'University Road - NED University & KU Silver Jubilee Gate', distanceKm: 9.4, lat: 24.9350, lng: 67.1150 },
  { name: 'Gulistan-e-Johar - Blocks 1 to 10 (Kamran Chowrangi)', distanceKm: 10.9, highlight: true, lat: 24.9280, lng: 67.1350 },
  { name: 'Gulistan-e-Johar - Blocks 11 to 20 (Perfume Chowk & Munawar)', distanceKm: 12.2, lat: 24.9180, lng: 67.1420 },
  { name: 'Scheme 33 - Safoora Chowrangi, Kiran Hospital & Memon Medical', distanceKm: 10.5, highlight: true, lat: 24.9490, lng: 67.1280 },
  { name: 'Scheme 33 - Gulshan-e-Kaneez Fatima & Al-Azhar Garden', distanceKm: 11.8, lat: 24.9650, lng: 67.1350 },
  { name: 'Gulshan-e-Maymar - Sectors Q, R, S, T, U, V, W, X, Y & Z', distanceKm: 13.8, highlight: true, lat: 25.0120, lng: 67.1210 },

  // --- ORANGI & BALDIA TOWN ---
  { name: 'Orangi Town - Chishti Nagar, Qatar Hospital & Islam Chowk', distanceKm: 6.5, highlight: true, lat: 24.9450, lng: 67.0120 },
  { name: 'Orangi Town - Banaras Chowk, Sector 5 & Mansoor Nagar', distanceKm: 7.2, lat: 24.9420, lng: 67.0010 },
  { name: 'Baldia Town - Saeedabad, Naval Colony & Hub River Road', distanceKm: 11.5, lat: 24.9100, lng: 66.9750 },
  { name: 'SITE Area - Metroville & Siemens Chowrangi', distanceKm: 8.2, lat: 24.9080, lng: 67.0050 },

  // --- CENTRAL, SOUTH & DOWNTOWN KARACHI ---
  { name: 'Bahadurabad, Dhoraji Colony & CP Berar Society', distanceKm: 11.5, highlight: true, lat: 24.8820, lng: 67.0710 },
  { name: 'PECHS (Blocks 2, 3, 6), Tariq Road & Khalid Bin Waleed', distanceKm: 12.4, highlight: true, lat: 24.8720, lng: 67.0650 },
  { name: 'Sindhi Muslim Society (SMCHS) & Shahrah-e-Faisal', distanceKm: 13.2, lat: 24.8650, lng: 67.0700 },
  { name: 'Garden East, Garden West & Soldier Bazaar', distanceKm: 8.8, lat: 24.8850, lng: 67.0280 },
  { name: 'Saddar, Empress Market & Burns Road Food Street', distanceKm: 13.5, lat: 24.8600, lng: 67.0250 },
  { name: 'Defence View, Akhtar Colony & Kashmir Colony', distanceKm: 14.5, lat: 24.8450, lng: 67.0780 },
  { name: 'Manzoor Colony, Mehmoodabad & Baloch Colony', distanceKm: 14.0, lat: 24.8520, lng: 67.0850 },

  // --- COASTAL & SOUTH DISTRICT (CLIFTON & DHA) ---
  { name: 'Clifton - Blocks 1 to 5 (Boat Basin, Bilawal House & Schon Circle)', distanceKm: 16.5, highlight: true, lat: 24.8250, lng: 67.0300 },
  { name: 'Clifton - Blocks 6 to 9 (Sea View, Dolmen Mall & Do Darya)', distanceKm: 17.8, highlight: true, lat: 24.8050, lng: 67.0420 },
  { name: 'DHA Karachi - Phase 1, Phase 2 & Phase 2 Extension', distanceKm: 15.5, highlight: true, lat: 24.8350, lng: 67.0680 },
  { name: 'DHA Karachi - Phase 4, Phase 5 & Commercial Broadway', distanceKm: 17.2, highlight: true, lat: 24.8150, lng: 67.0600 },
  { name: 'DHA Karachi - Phase 6, Phase 7 & Khayaban-e-Shahbaz / Bukhari', distanceKm: 18.5, highlight: true, lat: 24.7980, lng: 67.0650 },
  { name: 'DHA Karachi - Phase 8 (Emaar Crescent Bay & Creek Vistas)', distanceKm: 20.5, lat: 24.7780, lng: 67.0850 },

  // --- AIRPORT, MALIR & KORANGI ---
  { name: 'Malir Cantt - Check Post 1, Check Post 2, 5 & Falcon Complex', distanceKm: 15.8, highlight: true, lat: 24.9120, lng: 67.1950 },
  { name: 'Model Colony, Jinnah Airport & Airport Road', distanceKm: 16.2, lat: 24.9050, lng: 67.1850 },
  { name: 'Shah Faisal Colony & Drigh Road Station', distanceKm: 13.8, lat: 24.8850, lng: 67.1450 },
  { name: 'Korangi - Korangi No. 1 to 6 & Crossing', distanceKm: 18.5, lat: 24.8350, lng: 67.1250 },
  { name: 'Landhi - Babar Market, Landhi Industrial & Dawood Chowrangi', distanceKm: 21.0, lat: 24.8450, lng: 67.1850 },
  { name: 'Other Karachi Neighborhood', distanceKm: 5.0, lat: 24.9300, lng: 67.0500 },
];

import type { StoreSettings } from '../types';

/**
 * Haversine Formula: Computes precise great-circle distance between two GPS coordinates in kilometers.
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (lat1 === lat2 && lon1 === lon2) return 0;
  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Math.max(0.3, Math.round(d * 10) / 10);
}

/**
 * Calculates exact Haversine distance from Bite & Go Central Hub (Block I, North Nazimabad).
 */
export function calculateDistanceToBranchKm(lat: number, lng: number): number {
  return calculateHaversineDistanceKm(
    BITE_AND_GO_BRANCH_LOCATION.lat,
    BITE_AND_GO_BRANCH_LOCATION.lng,
    lat,
    lng
  );
}

export function calculateDeliveryFeeFromDistance(
  distanceKm: number,
  settings?: StoreSettings | null,
  areaName?: string
): number {
  // If a custom area delivery fee is configured in manager settings, prioritize it
  if (areaName && settings?.customAreaDeliveryFees && typeof settings.customAreaDeliveryFees[areaName] === 'number') {
    return Math.max(0, Math.round(Number(settings.customAreaDeliveryFees[areaName])));
  }

  const rawBase = settings?.baseDeliveryFee !== undefined ? settings.baseDeliveryFee : (settings?.deliveryFee ?? 100);
  const baseFee = Number.isFinite(Number(rawBase)) ? Math.max(0, Number(rawBase)) : 100;
  const rawRate = settings?.deliveryRatePerKm !== undefined ? settings.deliveryRatePerKm : 20;
  const perKmRate = Number.isFinite(Number(rawRate)) ? Math.max(0, Number(rawRate)) : 20;
  const safeDistance = Number.isFinite(Number(distanceKm)) ? Math.max(0, Number(distanceKm)) : 3.5;

  return Math.round(baseFee + safeDistance * perKmRate);
}

export function findBestMatchingKarachiZone(areaName: string): DeliveryZone {
  if (!areaName || !areaName.trim()) {
    const defaultZone = KARACHI_DELIVERY_AREAS[0];
    const distanceKm = calculateDistanceToBranchKm(defaultZone.lat, defaultZone.lng);
    return { ...defaultZone, distanceKm };
  }
  const cleanInput = areaName.trim().toLowerCase();

  // 1. Exact match
  const exact = KARACHI_DELIVERY_AREAS.find((z) => z.name.toLowerCase() === cleanInput);
  if (exact) {
    return { ...exact, distanceKm: calculateDistanceToBranchKm(exact.lat, exact.lng) };
  }

  // 2. Bidirectional contains match
  const contains = KARACHI_DELIVERY_AREAS.find(
    (z) => z.name.toLowerCase().includes(cleanInput) || cleanInput.includes(z.name.toLowerCase())
  );
  if (contains) {
    return { ...contains, distanceKm: calculateDistanceToBranchKm(contains.lat, contains.lng) };
  }

  // 3. Keyword matching for primary hubs
  let matchedZone = KARACHI_DELIVERY_AREAS[1];
  if (cleanInput.includes('north nazimabad') || cleanInput.includes('nazimabad') || cleanInput.includes('hyderi')) {
    if (cleanInput.includes('block i') || cleanInput.includes('block-i')) matchedZone = KARACHI_DELIVERY_AREAS[0];
    else if (cleanInput.includes('block a') || cleanInput.includes('block b') || cleanInput.includes('kda')) matchedZone = KARACHI_DELIVERY_AREAS[1];
    else if (cleanInput.includes('five star') || cleanInput.includes('block e') || cleanInput.includes('block f')) matchedZone = KARACHI_DELIVERY_AREAS[2];
    else matchedZone = KARACHI_DELIVERY_AREAS[1];
  } else if (cleanInput.includes('buffer zone') || cleanInput.includes('bufferzone')) {
    matchedZone = KARACHI_DELIVERY_AREAS[5];
  } else if (cleanInput.includes('shadman') || cleanInput.includes('sakhi hassan')) {
    matchedZone = KARACHI_DELIVERY_AREAS[7];
  } else if (cleanInput.includes('federal b') || cleanInput.includes('fb area') || cleanInput.includes('water pump') || cleanInput.includes('ancholi')) {
    matchedZone = KARACHI_DELIVERY_AREAS[11];
  } else if (cleanInput.includes('gulshan') || cleanInput.includes('nipa')) {
    matchedZone = KARACHI_DELIVERY_AREAS[18];
  } else if (cleanInput.includes('johar')) {
    matchedZone = KARACHI_DELIVERY_AREAS[22];
  } else if (cleanInput.includes('clifton')) {
    matchedZone = KARACHI_DELIVERY_AREAS[30];
  } else if (cleanInput.includes('dha') || cleanInput.includes('defence')) {
    matchedZone = KARACHI_DELIVERY_AREAS[32];
  } else {
    // Fallback default zone near branch
    return {
      name: areaName,
      distanceKm: 3.5,
      lat: BITE_AND_GO_BRANCH_LOCATION.lat,
      lng: BITE_AND_GO_BRANCH_LOCATION.lng,
    };
  }

  return {
    ...matchedZone,
    distanceKm: calculateDistanceToBranchKm(matchedZone.lat, matchedZone.lng),
  };
}

export function isAreaWithin10KmRadius(areaName: string): boolean {
  const zone = findBestMatchingKarachiZone(areaName);
  return zone.distanceKm <= 10.0;
}

export function getAreasWithin10KmRadius(): DeliveryZone[] {
  return KARACHI_DELIVERY_AREAS.filter((z) => z.distanceKm <= 10.0);
}

export function checkKarachiFreeDeliveryEligibility(params: {
  areaName?: string;
  distanceKm?: number;
  coordinates?: { lat: number; lng: number };
  subtotal: number;
  settings?: StoreSettings | null;
  orderType?: 'delivery' | 'pickup' | string;
}): {
  isFree: boolean;
  reason: string;
  distanceKm: number;
  calculatedFee: number;
  effectiveFee: number;
} {
  const { areaName = '', subtotal, settings, orderType = 'delivery' } = params;

  if (orderType === 'pickup') {
    return {
      isFree: true,
      reason: 'Self-Pickup (No Delivery Fee)',
      distanceKm: 0,
      calculatedFee: 0,
      effectiveFee: 0,
    };
  }

  const zone = findBestMatchingKarachiZone(areaName);
  
  // Calculate precise distance: If custom coordinates are passed, use Haversine; otherwise zone's Haversine distance
  let distanceKm: number;
  if (params.coordinates && typeof params.coordinates.lat === 'number' && typeof params.coordinates.lng === 'number') {
    distanceKm = calculateDistanceToBranchKm(params.coordinates.lat, params.coordinates.lng);
  } else if (typeof params.distanceKm === 'number' && params.distanceKm > 0) {
    distanceKm = params.distanceKm;
  } else {
    distanceKm = calculateDistanceToBranchKm(zone.lat, zone.lng);
  }

  const calculatedFee = calculateDeliveryFeeFromDistance(distanceKm, settings, areaName);
  const mode = settings?.freeDeliveryMode || 'threshold_or_selected_areas';

  if (mode === 'all_areas') {
    return {
      isFree: true,
      reason: 'Complimentary Express Delivery on All Orders',
      distanceKm,
      calculatedFee,
      effectiveFee: 0,
    };
  }

  // 1. Check free delivery area list with bidirectional match
  const areaLower = areaName.toLowerCase().trim();
  const freeAreasList = settings?.freeDeliveryAreas || [
    'North Nazimabad',
    'Buffer Zone',
    'Shadman Town',
  ];

  const isFreeArea = freeAreasList.some((fa) => {
    const fLower = fa.toLowerCase().trim();
    if (!areaLower || !fLower) return false;
    if (areaLower.includes(fLower) || fLower.includes(areaLower)) return true;

    // Check shared key tokens (e.g. "north nazimabad" or "buffer zone")
    const keywords = ['north nazimabad', 'buffer zone', 'shadman', 'sakhi hassan', 'hyderi'];
    return keywords.some((kw) => areaLower.includes(kw) && fLower.includes(kw));
  });

  // 2. Check free radius (e.g. 3.5 km around main kitchen branch)
  const freeRadiusKm = settings?.freeDeliveryRadiusKm ?? 3.5;
  const isFreeRadius = freeRadiusKm > 0 && distanceKm <= freeRadiusKm;

  // 3. Check order subtotal threshold (e.g. Rs. 1,800)
  const freeThreshold = settings?.freeDeliveryThreshold ?? 1800;
  const isFreeThreshold = subtotal >= freeThreshold;

  let isFree = false;
  let reason = '';

  if (mode === 'threshold_only') {
    isFree = isFreeThreshold;
    reason = isFree ? `Cart exceeds Rs. ${freeThreshold.toLocaleString()} Free Delivery Threshold` : '';
  } else if (mode === 'selected_areas_only') {
    isFree = isFreeArea || isFreeRadius;
    reason = isFreeArea
      ? 'North Nazimabad & Local Express Zone'
      : isFreeRadius
      ? `Within ${freeRadiusKm}km Free Local Radius`
      : '';
  } else {
    // default 'threshold_or_selected_areas'
    if (isFreeArea) {
      isFree = true;
      reason = 'North Nazimabad Local Free Delivery Zone';
    } else if (isFreeRadius) {
      isFree = true;
      reason = `Within ${freeRadiusKm}km Free Local Kitchen Radius`;
    } else if (isFreeThreshold) {
      isFree = true;
      reason = `Cart over Rs. ${freeThreshold.toLocaleString()} Free Delivery Goal`;
    }
  }

  return {
    isFree,
    reason,
    distanceKm,
    calculatedFee,
    effectiveFee: isFree ? 0 : calculatedFee,
  };
}

export function getAreaCoordinates(areaName: string): { lat: number; lng: number } {
  if (!areaName || !areaName.trim()) {
    return { lat: BITE_AND_GO_BRANCH_LOCATION.lat, lng: BITE_AND_GO_BRANCH_LOCATION.lng };
  }

  const query = areaName.toLowerCase().trim();

  // 1. Exact match
  const exact = KARACHI_DELIVERY_AREAS.find((a) => a.name.toLowerCase() === query);
  if (exact) return { lat: exact.lat, lng: exact.lng };

  // 2. Clean query without punctuation and common suffixes
  const cleanQ = query
    .replace(/karachi|pakistan|sindh/gi, '')
    .replace(/[,\-_()\/]/g, ' ')
    .trim();

  // 3. Substring match
  const sub = KARACHI_DELIVERY_AREAS.find((a) => {
    const aClean = a.name.toLowerCase().replace(/[,\-_()\/]/g, ' ');
    return aClean.includes(cleanQ) || cleanQ.includes(aClean);
  });
  if (sub) return { lat: sub.lat, lng: sub.lng };

  // 4. Word-token matching
  const words = cleanQ.split(/\s+/).filter((w) => w.length >= 3);
  let bestMatch: DeliveryZone | null = null;
  let bestScore = 0;

  for (const zone of KARACHI_DELIVERY_AREAS) {
    const zLower = zone.name.toLowerCase();
    let score = 0;
    for (const w of words) {
      if (zLower.includes(w)) score += 2;
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = zone;
    }
  }

  if (bestMatch && bestScore >= 2) {
    return { lat: bestMatch.lat, lng: bestMatch.lng };
  }

  // 5. Common Karachi locality dictionary fallback
  const fallbackDict: Record<string, { lat: number; lng: number }> = {
    dha: { lat: 24.8150, lng: 67.0600 },
    defence: { lat: 24.8150, lng: 67.0600 },
    clifton: { lat: 24.8250, lng: 67.0300 },
    gulshan: { lat: 24.9180, lng: 67.0890 },
    johar: { lat: 24.9280, lng: 67.1350 },
    'scheme 33': { lat: 24.9490, lng: 67.1280 },
    'buffer zone': { lat: 24.9580, lng: 67.0650 },
    'north karachi': { lat: 24.9850, lng: 67.0620 },
    'new karachi': { lat: 24.9920, lng: 67.0500 },
    surjani: { lat: 25.0150, lng: 67.0650 },
    'fb area': { lat: 24.9250, lng: 67.0680 },
    'federal b': { lat: 24.9250, lng: 67.0680 },
    nazimabad: { lat: 24.9150, lng: 67.0280 },
    pechs: { lat: 24.8720, lng: 67.0650 },
    bahadurabad: { lat: 24.8820, lng: 67.0710 },
    saddar: { lat: 24.8600, lng: 67.0250 },
    malir: { lat: 24.9120, lng: 67.1950 },
    korangi: { lat: 24.8350, lng: 67.1250 },
    landhi: { lat: 24.8450, lng: 67.1850 },
    shadman: { lat: 24.9530, lng: 67.0580 },
    hyderi: { lat: 24.9450, lng: 67.0360 },
  };

  for (const [key, coords] of Object.entries(fallbackDict)) {
    if (query.includes(key)) {
      return coords;
    }
  }

  // Fallback to central North Nazimabad Block-I coordinates
  return { lat: BITE_AND_GO_BRANCH_LOCATION.lat, lng: BITE_AND_GO_BRANCH_LOCATION.lng };
}

export function buildGoogleMapsNavUrl(
  destLat?: number,
  destLng?: number,
  destAddress?: string,
  includeBranchOrigin: boolean = false
): string {
  let destinationStr = '';

  if (destAddress && destAddress.trim()) {
    let clean = destAddress
      .replace(/\(Branch Location\)/gi, '')
      .replace(/\(Five Star Chowrangi\)/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Prevent Google Maps from snapping generic "Block I" to unindexed local businesses
    if (clean.toLowerCase().includes('block i') && !clean.toLowerCase().includes('five star') && !clean.toLowerCase().includes('chowrangi')) {
      clean = clean.replace(/block\s*i/gi, 'Block I (Near Five Star Chowrangi)');
    }

    destinationStr = clean.toLowerCase().includes('karachi')
      ? clean
      : `${clean}, Karachi, Pakistan`;
  } else if (
    destLat !== undefined &&
    destLng !== undefined &&
    !(Math.abs(destLat - BITE_AND_GO_BRANCH_LOCATION.lat) < 0.0001 && Math.abs(destLng - BITE_AND_GO_BRANCH_LOCATION.lng) < 0.0001)
  ) {
    destinationStr = `${destLat},${destLng}`;
  } else {
    destinationStr = 'Five Star Chowrangi, North Nazimabad, Karachi, Pakistan';
  }

  // If kitchen branch origin is explicitly requested (e.g. for kitchen route preview)
  if (includeBranchOrigin) {
    const originStr = 'Five Star Chowrangi, North Nazimabad, Karachi, Pakistan';
    return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(originStr)}&destination=${encodeURIComponent(destinationStr)}&travelmode=driving`;
  }

  // Turn-by-Turn Navigation for Rider:
  // By omitting origin, Google Maps defaults to "Your location" (driver's live GPS).
  // This avoids origin misidentification and lets the driver navigate instantly.
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destinationStr)}&travelmode=driving`;
}

export function buildGoogleMapsSearchUrl(address: string, area?: string): string {
  const cleanAddr = (address || '').replace(/\(Branch Location\)/gi, '').trim();
  const cleanArea = (area || '').replace(/\(Branch Location\)/gi, '').trim();
  let query = `${cleanAddr}${cleanArea ? `, ${cleanArea}` : ''}`;
  if (query.toLowerCase().includes('block i') && !query.toLowerCase().includes('five star')) {
    query = query.replace(/block\s*i/gi, 'Block I (Near Five Star Chowrangi)');
  }
  if (!query.toLowerCase().includes('karachi')) {
    query += ', Karachi';
  }
  if (!query.toLowerCase().includes('pakistan')) {
    query += ', Pakistan';
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function generateOrderMapsLinks(order: {
  id: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  area: string;
  total: number;
  payment: { method: string };
  customerNotes?: string;
  coordinates?: { lat: number; lng: number };
}) {
  const coords = order.coordinates || (order.area ? getAreaCoordinates(order.area) : getAreaCoordinates(''));

  // Clean customer delivery address & area
  const rawAddress = (order.deliveryAddress || '').replace(/\(Branch Location\)/gi, '').trim();
  const rawArea = (order.area || '').replace(/\(Branch Location\)/gi, '').trim();

  const addressParts: string[] = [];

  if (rawAddress && !rawAddress.toLowerCase().includes('store pickup') && !rawAddress.toLowerCase().includes('takeaway')) {
    addressParts.push(rawAddress);
  }

  if (rawArea) {
    // Clean zone name (e.g. "North Nazimabad - Block I" -> "North Nazimabad Block I")
    const cleanArea = rawArea.replace(/\([^)]*\)/g, '').replace(/[-–]/g, ' ').replace(/\s+/g, ' ').trim();
    const areaLower = cleanArea.toLowerCase();
    const addressLower = (rawAddress || '').toLowerCase();

    // Avoid duplicate tokens if address already contains the area name
    const hasOverlap = areaLower.split(' ').some((word) => word.length > 4 && addressLower.includes(word));
    if (!hasOverlap) {
      addressParts.push(cleanArea);
    }
  }

  if (addressParts.length === 0) {
    addressParts.push('North Nazimabad');
  }

  // Anchor Block I with Five Star Chowrangi to guarantee exact landmark pinning
  let fullAddr = addressParts.join(', ');
  if (fullAddr.toLowerCase().includes('block i') && !fullAddr.toLowerCase().includes('five star') && !fullAddr.toLowerCase().includes('chowrangi')) {
    fullAddr = fullAddr.replace(/block\s*i/gi, 'Block I (Near Five Star Chowrangi)');
  }

  if (!fullAddr.toLowerCase().includes('karachi')) {
    fullAddr += ', Karachi';
  }
  if (!fullAddr.toLowerCase().includes('pakistan')) {
    fullAddr += ', Pakistan';
  }

  const destinationAddress = fullAddr;

  // Turn-by-turn navigation starting from Driver's live GPS ("Your location") to the Customer destination
  const navUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destinationAddress)}&travelmode=driving`;

  // Kitchen dispatch route from restaurant branch to customer
  const kitchenOriginStr = 'Five Star Chowrangi, North Nazimabad, Karachi, Pakistan';
  const kitchenNavUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(kitchenOriginStr)}&destination=${encodeURIComponent(destinationAddress)}&travelmode=driving`;

  // Place search link as backup
  const searchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destinationAddress)}`;

  // Formatted driver ticket message for 1-click WhatsApp copy/sharing
  const driverWhatsAppText = [
    `🛵 *BITE & GO DELIVERY TICKET*`,
    `📦 *Order ID:* ${order.id}`,
    `👤 *Customer:* ${order.customerName} (${order.customerPhone})`,
    `📍 *Delivery Address:* ${order.deliveryAddress || 'Address on file'}`,
    `🏙️ *Area:* ${order.area || 'Karachi'}`,
    `💰 *Bill Amount:* Rs. ${order.total.toLocaleString()} [${(order.payment?.method || 'COD').toUpperCase()}]`,
    order.customerNotes ? `📝 *Note:* "${order.customerNotes}"` : '',
    ``,
    `🗺️ *Open Turn-by-Turn Route in Google Maps:*`,
    navUrl,
  ]
    .filter(Boolean)
    .join('\n');

  return {
    navUrl,
    kitchenNavUrl,
    searchUrl,
    driverWhatsAppText,
    coords,
    destinationAddress,
  };
}
