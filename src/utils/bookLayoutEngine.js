import exifr from 'exifr';

export const MONTH_META = {
  1: { en: 'JANUARY', ko: '1월, 새해의 첫 빛', season: 'winter', seasonKo: '겨울 (WINTER)' },
  2: { en: 'FEBRUARY', ko: '2월, 겨울 끝자락의 온기', season: 'winter', seasonKo: '겨울 (WINTER)' },
  3: { en: 'MARCH', ko: '3월, 남쪽에서 시작된 봄소식', season: 'spring', seasonKo: '봄 (SPRING)' },
  4: { en: 'APRIL', ko: '4월, 흩날리는 꽃잎과 안부', season: 'spring', seasonKo: '봄 (SPRING)' },
  5: { en: 'MAY', ko: '5월, 초록이 짙어지는 다정한 날들', season: 'spring', seasonKo: '봄 (SPRING)' },
  6: { en: 'JUNE', ko: '6월, 초여름의 바람과 텃밭', season: 'summer', seasonKo: '여름 (SUMMER)' },
  7: { en: 'JULY', ko: '7월, 장마 너머 반짝이는 바다', season: 'summer', seasonKo: '여름 (SUMMER)' },
  8: { en: 'AUGUST', ko: '8월, 한여름 우리가 다시 만난 순간', season: 'summer', seasonKo: '여름 (SUMMER)' },
  9: { en: 'SEPTEMBER', ko: '9월, 선선해진 저녁 공기와 노을', season: 'autumn', seasonKo: '가을 (AUTUMN)' },
  10: { en: 'OCTOBER', ko: '10월, 깊어가는 단풍과 가을 산책', season: 'autumn', seasonKo: '가을 (AUTUMN)' },
  11: { en: 'NOVEMBER', ko: '11월, 은빛 억새와 겨울 준비', season: 'autumn', seasonKo: '가을 (AUTUMN)' },
  12: { en: 'DECEMBER', ko: '12월, 일 년의 끝에서 돌아보는 우리', season: 'winter', seasonKo: '겨울 (WINTER)' },
};

export const SEASON_LABELS = {
  all: { ko: '사계절 전체', en: 'ALL SEASONS' },
  spring: { ko: '봄 (3–5월)', en: 'SPRING' },
  summer: { ko: '여름 (6–8월)', en: 'SUMMER' },
  autumn: { ko: '가을 (9–11월)', en: 'AUTUMN' },
  winter: { ko: '겨울 (12–2월)', en: 'WINTER' },
};

export function formatKoreanDate(isoOrDateStr) {
  if (!isoOrDateStr) return '';
  const d = new Date(isoOrDateStr);
  if (isNaN(d.getTime())) return isoOrDateStr;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  const wk = weekdays[d.getDay()];
  return `${year}. ${month}. ${day} (${wk})`;
}

export function formatEditorialDate(isoOrDateStr) {
  if (!isoOrDateStr) return '';
  const d = new Date(isoOrDateStr);
  if (isNaN(d.getTime())) return isoOrDateStr;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
}

/**
 * Extracts EXIF metadata (DateTimeOriginal, Camera model, Lens, ISO, Image dimensions)
 * from a browser File object before uploading.
 */
export async function extractPhotoMetadata(file) {
  const fallbackDate = file.lastModified ? new Date(file.lastModified) : new Date();

  // Check if filename contains YYYYMMDD pattern (e.g., 20260514_123000.jpg or KakaoTalk_20260514_...)
  let filenameDate = null;
  const match = file.name.match(/(20\d{2})[-_.]?(0[1-9]|1[0-2])[-_.]?(0[1-9]|[12]\d|3[01])/);
  if (match) {
    const parsed = new Date(`${match[1]}-${match[2]}-${match[3]}T12:00:00`);
    if (!isNaN(parsed.getTime())) filenameDate = parsed;
  }

  // Get image natural dimensions & create optimized print-grade file if very large
  const dimensions = await new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const natW = img.naturalWidth || 1200;
      const natH = img.naturalHeight || 900;
      const maxDim = 1800;
      let targetW = natW;
      let targetH = natH;
      if (natW > maxDim || natH > maxDim) {
        if (natW >= natH) {
          targetW = maxDim;
          targetH = Math.round((natH * maxDim) / natW);
        } else {
          targetH = maxDim;
          targetW = Math.round((natW * maxDim) / natH);
        }
      }

      try {
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, targetW, targetH);
        canvas.toBlob(
          (blob) => {
            const optimizedFile = blob
              ? new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
                  type: 'image/jpeg',
                })
              : file;
            resolve({
              width: natW,
              height: natH,
              previewUrl: objectUrl,
              optimizedFile,
            });
          },
          'image/jpeg',
          0.86
        );
      } catch {
        resolve({
          width: natW,
          height: natH,
          previewUrl: objectUrl,
          optimizedFile: file,
        });
      }
    };
    img.onerror = () => {
      resolve({ width: 1200, height: 900, previewUrl: objectUrl, optimizedFile: file });
    };
    img.src = objectUrl;
  });

  let exifData = null;
  try {
    exifData = await exifr.parse(file, {
      pick: [
        'DateTimeOriginal',
        'CreateDate',
        'ModifyDate',
        'Make',
        'Model',
        'LensModel',
        'FocalLength',
        'FNumber',
        'ISO',
        'ExposureTime',
      ],
    });
  } catch {
    // ignore exif parse failure on unsupported formats
  }

  let takenDate = fallbackDate;
  let dateSource = '파일 수정일 자동 인식';

  const rawExifDate = exifData?.DateTimeOriginal || exifData?.CreateDate || exifData?.ModifyDate;
  if (rawExifDate instanceof Date && !isNaN(rawExifDate.getTime())) {
    takenDate = rawExifDate;
    dateSource = 'EXIF 촬영일 자동 추출';
  } else if (filenameDate) {
    takenDate = filenameDate;
    dateSource = '파일명 날짜 자동 추출';
  }

  const cameraModel = [exifData?.Make, exifData?.Model]
    .filter(Boolean)
    .join(' ')
    .replace(/\b(\w+)\s+\1\b/i, '$1')
    .trim();

  const lensDesc = exifData?.FocalLength
    ? `${Math.round(exifData.FocalLength)}mm${exifData.FNumber ? ` f/${exifData.FNumber}` : ''}`
    : exifData?.LensModel || '';

  return {
    takenAt: takenDate.toISOString(),
    dateStr: takenDate.toISOString().slice(0, 10),
    width: dimensions.width,
    height: dimensions.height,
    previewUrl: dimensions.previewUrl,
    optimizedFile: dimensions.optimizedFile || file,
    exif: {
      camera: cameraModel || 'Smart Mobile Camera',
      lens: lensDesc || 'Standard Lens',
      iso: exifData?.ISO || null,
      source: dateSource,
    },
  };
}

/**
 * Determines the best magazine template for a group of 1..12 photos
 */
function selectTemplateForChunk(chunk, variantOffset = 0) {
  const count = chunk.length;
  if (count === 1) {
    const p = chunk[0];
    const styles =
      p.orientation === 'portrait'
        ? ['solo-portrait-editorial', 'solo-full-caption']
        : ['solo-landscape-hero', 'solo-portrait-editorial'];
    return styles[variantOffset % styles.length];
  }
  if (count === 2) {
    const styles = ['duo-asymmetric', 'duo-side-by-side', 'duo-stacked-editorial'];
    return styles[variantOffset % styles.length];
  }
  if (count === 3) {
    const styles = ['trio-feature-left', 'trio-feature-top', 'trio-columns'];
    return styles[variantOffset % styles.length];
  }
  if (count === 4) {
    const styles = ['quartet-grid', 'quartet-hero-top'];
    return styles[variantOffset % styles.length];
  }
  // For 5 to 12 photos: cycle between 'bento-mosaic' (featured hero + grid), 'tiered-rows' (balanced horizontal rows), and 'uniform-contact' (clean architectural contact sheet)
  const multiStyles = ['bento-mosaic', 'tiered-rows', 'uniform-contact'];
  return multiStyles[variantOffset % multiStyles.length];
}

/**
 * Groups chronologically sorted photos into smart chunks per month.
 * Default ('ten-per-page' / 'balanced' / 'compact'): fits up to 10-12 photos on a SINGLE monthly page,
 * or splits evenly into ~8-10 photo pages if a month has more than 12 photos!
 */
function chunkMonthPhotos(monthPhotos, density = 'ten-per-page') {
  const total = monthPhotos.length;
  if (total === 0) return [];

  if (density === 'editorial') {
    // 1 to 4 photos per page
    const maxPerPage = 4;
    if (total <= maxPerPage) return [monthPhotos];
    const pageCount = Math.ceil(total / maxPerPage);
    const baseSize = Math.floor(total / pageCount);
    const remainder = total % pageCount;
    const chunks = [];
    let cursor = 0;
    for (let p = 0; p < pageCount; p++) {
      const size = baseSize + (p < remainder ? 1 : 0);
      chunks.push(monthPhotos.slice(cursor, cursor + size));
      cursor += size;
    }
    return chunks;
  }

  if (density === 'six-per-page') {
    const maxPerPage = 6;
    if (total <= maxPerPage) return [monthPhotos];
    const pageCount = Math.ceil(total / maxPerPage);
    const baseSize = Math.floor(total / pageCount);
    const remainder = total % pageCount;
    const chunks = [];
    let cursor = 0;
    for (let p = 0; p < pageCount; p++) {
      const size = baseSize + (p < remainder ? 1 : 0);
      chunks.push(monthPhotos.slice(cursor, cursor + size));
      cursor += size;
    }
    return chunks;
  }

  // Default ('ten-per-page' / 'balanced' / 'compact'):
  // Up to 12 photos fit on a single page (~10 photos standard).
  // If a month has > 12 photos, split into balanced pages of ~9-10 photos each!
  const maxPerPage = 11;
  if (total <= 12) {
    return [monthPhotos];
  }

  const pageCount = Math.ceil(total / 10);
  const baseSize = Math.floor(total / pageCount);
  const remainder = total % pageCount;
  const chunks = [];
  let cursor = 0;
  for (let p = 0; p < pageCount; p++) {
    const size = Math.min(maxPerPage, baseSize + (p < remainder ? 1 : 0));
    chunks.push(monthPhotos.slice(cursor, cursor + size));
    cursor += size;
  }
  if (cursor < total) {
    chunks.push(monthPhotos.slice(cursor));
  }
  return chunks;
}

/**
 * Builds the entire structured list of Photobook Pages ready for Flipbook Spread Viewer & PDF Print!
 */
export function buildPhotobookPages(photos = [], members = [], bookSettings = {}, pageVariants = {}) {
  const sorted = [...photos].sort((a, b) => new Date(a.takenAt) - new Date(b.takenAt));
  const pages = [];

  // 1. Front Cover Page
  const coverPhoto =
    sorted.find((p) => p.url === bookSettings.coverPhotoUrl) ||
    sorted.find((p) => p.isFavorite && p.orientation === 'landscape') ||
    sorted[0] ||
    null;

  pages.push({
    id: 'page-cover',
    type: 'cover',
    pageNumber: 1,
    coverPhoto,
    bookSettings,
    members,
    totalPhotos: sorted.length,
  });

  // 2. Prologue & Yearly Family Index Page
  const monthlyCounts = Array.from({ length: 12 }, (_, idx) => {
    const m = idx + 1;
    return {
      month: m,
      count: sorted.filter((p) => (p.month || new Date(p.takenAt).getMonth() + 1) === m).length,
    };
  });

  const memberStats = members.map((m) => ({
    ...m,
    photoCount: sorted.filter((p) => p.memberId === m.id).length,
  }));

  const uniqueCities = [...new Set(members.map((m) => m.city).filter(Boolean))];

  pages.push({
    id: 'page-prologue',
    type: 'prologue',
    pageNumber: 2,
    bookSettings,
    monthlyCounts,
    memberStats,
    uniqueCities,
    totalPhotos: sorted.length,
  });

  // Group photos by Month (1..12)
  const byMonth = new Map();
  for (const photo of sorted) {
    const m = photo.month || new Date(photo.takenAt).getMonth() + 1;
    if (!byMonth.has(m)) byMonth.set(m, []);
    byMonth.get(m).push(photo);
  }

  // 3. Monthly Chapters & Photo Spreads
  for (const [monthNum, monthPhotos] of byMonth.entries()) {
    const meta = MONTH_META[monthNum] || MONTH_META[1];
    const chunks = chunkMonthPhotos(monthPhotos, bookSettings.layoutDensity || 'ten-per-page');
    const monthMemberIds = [...new Set(monthPhotos.map((p) => p.memberId))];
    const monthMembers = monthMemberIds
      .map((id) => members.find((m) => m.id === id))
      .filter(Boolean);
    const monthLocations = [
      ...new Set(monthPhotos.map((p) => p.location).filter(Boolean)),
    ];

    if (bookSettings.includeMonthDividers === true) {
      // Create an editorial Monthly Chapter Opener page
      pages.push({
        id: `page-month-${monthNum}-divider`,
        type: 'month-divider',
        pageNumber: pages.length + 1,
        month: monthNum,
        monthMeta: meta,
        photoCount: monthPhotos.length,
        highlightPhoto: monthPhotos.find((p) => p.isFavorite) || monthPhotos[0],
        monthMembers,
        monthLocations,
      });
    }

    chunks.forEach((chunk, chunkIdx) => {
      const pageId = `page-month-${monthNum}-chunk-${chunkIdx}`;
      const variantOffset = pageVariants[pageId] || 0;
      const layoutTemplate = selectTemplateForChunk(chunk, variantOffset);

      pages.push({
        id: pageId,
        type: 'photo-page',
        pageNumber: pages.length + 1,
        month: monthNum,
        monthMeta: meta,
        photos: chunk,
        layoutTemplate,
        variantOffset,
        isFirstChunkOfMonth: chunkIdx === 0,
        chunkIndex: chunkIdx + 1,
        totalChunksInMonth: chunks.length,
        monthTotalCount: monthPhotos.length,
        monthMembers,
      });
    });
  }

  // 4. Epilogue & Colophon Page
  pages.push({
    id: 'page-colophon',
    type: 'colophon',
    pageNumber: pages.length + 1,
    bookSettings,
    members,
    totalPhotos: sorted.length,
    uniqueCities,
    dateRange:
      sorted.length > 0
        ? `${formatEditorialDate(sorted[0].takenAt)} — ${formatEditorialDate(
            sorted[sorted.length - 1].takenAt
          )}`
        : `${bookSettings.year || 2026}.01.01 — ${bookSettings.year || 2026}.12.31`,
  });

  return pages;
}
