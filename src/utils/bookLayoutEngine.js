import exifr from 'exifr';

export const MONTH_META = {
  1: { en: '1월', ko: '1월, 새해의 첫 빛', season: 'winter', seasonKo: '겨울' },
  2: { en: '2월', ko: '2월, 겨울 끝자락의 온기', season: 'winter', seasonKo: '겨울' },
  3: { en: '3월', ko: '3월, 남쪽에서 시작된 봄소식', season: 'spring', seasonKo: '봄' },
  4: { en: '4월', ko: '4월, 흩날리는 꽃잎과 안부', season: 'spring', seasonKo: '봄' },
  5: { en: '5월', ko: '5월, 초록이 짙어지는 다정한 날들', season: 'spring', seasonKo: '봄' },
  6: { en: '6월', ko: '6월, 초여름의 바람과 텃밭', season: 'summer', seasonKo: '여름' },
  7: { en: '7월', ko: '7월, 장마 너머 반짝이는 바다', season: 'summer', seasonKo: '여름' },
  8: { en: '8월', ko: '8월, 한여름 우리가 다시 만난 순간', season: 'summer', seasonKo: '여름' },
  9: { en: '9월', ko: '9월, 선선해진 저녁 공기와 노을', season: 'autumn', seasonKo: '가을' },
  10: { en: '10월', ko: '10월, 깊어가는 단풍과 가을 산책', season: 'autumn', seasonKo: '가을' },
  11: { en: '11월', ko: '11월, 은빛 억새와 겨울 준비', season: 'autumn', seasonKo: '가을' },
  12: { en: '12월', ko: '12월, 일 년의 끝에서 돌아보는 우리', season: 'winter', seasonKo: '겨울' },
};

export const DEFAULT_MONTHLY_HIGHLIGHTS = {
  1: '새해의 첫 빛과 따뜻한 가족 인사',
  2: '겨울 끝자락의 온기와 다정한 안부',
  3: '남쪽에서 시작된 설레는 봄소식',
  4: '흩날리는 벚꽃잎과 봄날의 나들이',
  5: '초록이 짙어지는 가정의 달 이야기',
  6: '초여름의 산들바람과 푸른 일상',
  7: '장마 너머 반짝이는 여름 바다',
  8: '한여름 우리가 다시 만난 소중한 순간',
  9: '선선해진 저녁 공기와 노을빛 산책',
  10: '깊어가는 단풍과 가을날의 소풍',
  11: '은빛 억새와 다가오는 겨울 준비',
  12: '일 년의 끝에서 돌아보는 우리의 계절',
};

export const SEASON_LABELS = {
  all: { ko: '사계절 전체', en: '전체' },
  spring: { ko: '봄 (3~5월)', en: '봄' },
  summer: { ko: '여름 (6~8월)', en: '여름' },
  autumn: { ko: '가을 (9~11월)', en: '가을' },
  winter: { ko: '겨울 (12~2월)', en: '겨울' },
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

  // 이중 해상도 이미지 저장 파이프라인:
  // 1) 메인 피드 빠른 스크롤 응답성을 위한 경량 WebP 변환본 생성
  // 2) 추후 책자 인쇄 품질(300dpi 이상) 보장을 위한 업로드 원본 무손실 보관 메타데이터 구성
  const dimensions = await new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const natW = img.naturalWidth || 2400;
      const natH = img.naturalHeight || 1800;
      const maxFeedDim = 1600;
      let targetW = natW;
      let targetH = natH;
      if (natW > maxFeedDim || natH > maxFeedDim) {
        if (natW >= natH) {
          targetW = maxFeedDim;
          targetH = Math.round((natH * maxFeedDim) / natW);
        } else {
          targetH = maxFeedDim;
          targetW = Math.round((natW * maxFeedDim) / natH);
        }
      }

      const estimatedPrintDpi = Math.max(300, Math.round(Math.max(natW, natH) / 6));

      try {
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, targetW, targetH);
        // 피드 노출용 경량 포맷(WebP)으로 자동 변환
        canvas.toBlob(
          (blob) => {
            const webpFile = blob
              ? new File([blob], file.name.replace(/\.[^.]+$/, '.webp'), {
                  type: 'image/webp',
                })
              : file;
            resolve({
              width: natW,
              height: natH,
              feedWidth: targetW,
              feedHeight: targetH,
              estimatedPrintDpi,
              previewUrl: objectUrl,
              optimizedFile: webpFile,
              printOriginalFile: file,
              feedFormat: 'WebP 경량 서빙본',
            });
          },
          'image/webp',
          0.84
        );
      } catch {
        resolve({
          width: natW,
          height: natH,
          feedWidth: targetW,
          feedHeight: targetH,
          estimatedPrintDpi,
          previewUrl: objectUrl,
          optimizedFile: file,
          printOriginalFile: file,
          feedFormat: 'WebP 경량 서빙본',
        });
      }
    };
    img.onerror = () => {
      resolve({
        width: 2400,
        height: 1800,
        feedWidth: 1600,
        feedHeight: 1200,
        estimatedPrintDpi: 300,
        previewUrl: objectUrl,
        optimizedFile: file,
        printOriginalFile: file,
        feedFormat: 'WebP 경량 서빙본',
      });
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

  const uploadedNow = new Date();
  let takenDate = fallbackDate;
  let dateSource = '파일 촬영일 자동 색인';

  const rawExifDate = exifData?.DateTimeOriginal || exifData?.CreateDate || exifData?.ModifyDate;
  if (rawExifDate instanceof Date && !isNaN(rawExifDate.getTime())) {
    takenDate = rawExifDate;
    dateSource = 'EXIF 실제 촬영 일시 자동 색인';
  } else if (filenameDate) {
    takenDate = filenameDate;
    dateSource = '파일명 촬영 일시 자동 색인';
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
    uploadedAt: uploadedNow.toISOString(),
    dateStr: takenDate.toISOString().slice(0, 10),
    uploadedDateStr: uploadedNow.toISOString().slice(0, 10),
    width: dimensions.width,
    height: dimensions.height,
    previewUrl: dimensions.previewUrl,
    optimizedFile: dimensions.optimizedFile || file,
    printOriginalFile: dimensions.printOriginalFile || file,
    dualResolution: {
      feedFormat: 'WebP (메인 피드 고속 스크롤용)',
      printFormat: '원본 무손실 오브젝트 스토리지 분리 보관',
      printDpi: `${dimensions.estimatedPrintDpi} DPI (인쇄 품질 보장)`,
      originalDimensions: `${dimensions.width} × ${dimensions.height}px`,
    },
    exif: {
      camera: cameraModel || '스마트폰 카메라',
      lens: lensDesc || '기본 렌즈',
      iso: exifData?.ISO || null,
      source: dateSource,
    },
  };
}

/**
 * 기간 단위(여행·월간·반기·연간) 및 날짜 색인 기준(실제 촬영일 EXIF 우선 / 등록일 통합)에 따라 사진을 필터링합니다.
 * 가족 여행 후 사진을 뒤늦게 일괄 업로드하는 패턴을 고려하여 EXIF 실제 촬영 일시를 함께 색인합니다.
 */
export function filterPhotosByPeriod(photos = [], periodConfig = {}) {
  const {
    periodType = 'annual', // 'annual' | 'half' | 'month' | 'trip'
    year = 2026,
    halfYear = 'first', // 'first' (1~6월) | 'second' (7~12월)
    month = 4, // 1..12
    startDate = '',
    endDate = '',
    excludedPhotoIds = [],
    dateMatchMode = 'exif-first', // 'exif-first' | 'both' | 'uploaded'
  } = periodConfig;

  const excludedSet = new Set(excludedPhotoIds);

  // 해당 연도 사진이 있는지 확인
  const hasYearMatch = photos.some((p) => {
    const y = new Date(p.takenAt || p.dateStr || '2026-01-01').getFullYear();
    return Number(y) === Number(year);
  });

  const matchesDateCriteria = (isoStr, fallbackMonth) => {
    const dObj = new Date(isoStr || '2026-01-01');
    const pYear = dObj.getFullYear();
    if (periodType !== 'trip' && year && hasYearMatch && Number(pYear) !== Number(year)) {
      return false;
    }
    const m = fallbackMonth || dObj.getMonth() + 1;
    const dStr = (isoStr ? String(isoStr).slice(0, 10) : '').slice(0, 10);

    if (periodType === 'half') {
      return halfYear === 'first' ? m >= 1 && m <= 6 : m >= 7 && m <= 12;
    }
    if (periodType === 'month') {
      return Number(m) === Number(month);
    }
    if (periodType === 'trip') {
      if (startDate && dStr < startDate) return false;
      if (endDate && dStr > endDate) return false;
      return true;
    }
    return true;
  };

  return photos.filter((p) => {
    if (excludedSet.has(p.id)) return false;

    const exifIso = p.takenAt || p.dateStr || '2026-01-01';
    const uploadedIso = p.uploadedAt || p.createdAt || exifIso;

    if (dateMatchMode === 'uploaded') {
      return matchesDateCriteria(uploadedIso, null);
    }
    if (dateMatchMode === 'both') {
      return (
        matchesDateCriteria(exifIso, p.month) || matchesDateCriteria(uploadedIso, null)
      );
    }
    // 기본값 ('exif-first'): EXIF 실제 촬영 일시 기준 매칭
    return matchesDateCriteria(exifIso, p.month);
  });
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
 * Supports specialized editorial layouts for the 4 production period types:
 * - 'trip': 일차별 동선 타임라인, 여행지 타이틀 표지, 베스트 단체컷 전면 배치
 * - 'month': 주차별 일상 하이라이트 편집, 피드 주요 코멘트·댓글 발췌 수록
 * - 'half': 계절감 중심의 챕터 구분, 월별 대표 사진 그리드 레이아웃 적용
 * - 'annual': 연대기형 화보집 구성, 연간 가족 주요 기념일 인덱스 및 총평 수록
 */
export function buildPhotobookPages(photos = [], members = [], bookSettings = {}, pageVariants = {}) {
  const sorted = [...photos].sort((a, b) => new Date(a.takenAt) - new Date(b.takenAt));
  const pages = [];
  const periodType = bookSettings.periodType || 'annual';

  // 전체 업로드된 가족 사진 풀 (기간 필터 외에 올린 사진도 표지로 선택 가능하도록 지원)
  const allUploadedPool = Array.isArray(bookSettings.allUploadedPhotos) && bookSettings.allUploadedPhotos.length > 0
    ? bookSettings.allUploadedPhotos
    : sorted;

  // 베스트 단체컷 / 대표 표지 사진 선정
  const bestGroupPhoto =
    allUploadedPool.find((p) => p.id === bookSettings.bestGroupPhotoId) ||
    allUploadedPool.find((p) => p.url === bookSettings.coverPhotoUrl) ||
    sorted.find((p) => p.isFavorite && p.orientation === 'landscape') ||
    sorted[0] ||
    allUploadedPool[0] ||
    null;

  // 멀티 콜라주 및 3단 스트립 표지용 대표 사진 배열 (사용자가 선택한 표지 사진 순서 우선 + 대표 사진 + 시간순 최대 9장)
  const coverPhotos = (() => {
    const selectedIds = Array.isArray(bookSettings.coverPhotoIds)
      ? bookSettings.coverPhotoIds
      : [];
    const selectedObjs = selectedIds
      .map((id) => allUploadedPool.find((p) => p.id === id))
      .filter(Boolean);
    const sourceList = sorted.length > 0 ? sorted : allUploadedPool;
    if (!sourceList.length && !selectedObjs.length) return [];
    const rest = sourceList.filter(
      (p) =>
        !selectedObjs.some((s) => s.id === p.id) &&
        (!bestGroupPhoto || p.id !== bestGroupPhoto.id)
    );
    const base =
      selectedObjs.length > 0
        ? selectedObjs
        : bestGroupPhoto
        ? [bestGroupPhoto]
        : [];
    return [...base, ...rest].slice(0, 9);
  })();

  // 1. Front Cover Page
  pages.push({
    id: 'page-cover',
    type: 'cover',
    pageNumber: 1,
    coverPhoto: bestGroupPhoto,
    bestGroupPhoto,
    coverPhotos,
    bookSettings,
    members,
    totalPhotos: sorted.length,
  });

  // 2. Prologue & Period-Specific Feature Index Page
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

  // (A) 여행 기간 전용: 일차별 동선 타임라인
  const byDateMap = new Map();
  for (const p of sorted) {
    const dStr = (p.dateStr || (p.takenAt ? p.takenAt.slice(0, 10) : '2026-01-01')).slice(0, 10);
    if (!byDateMap.has(dStr)) byDateMap.set(dStr, []);
    byDateMap.get(dStr).push(p);
  }
  const dayTimeline = Array.from(byDateMap.entries()).map(([dateStr, dayPhotos], idx) => {
    const locs = [...new Set(dayPhotos.map((p) => p.location).filter(Boolean))];
    return {
      dayNumber: idx + 1,
      dateStr,
      formattedDate: formatKoreanDate(dateStr),
      locations: locs.length > 0 ? locs : ['가족 여행지'],
      photoCount: dayPhotos.length,
      highlightPhoto: dayPhotos.find((p) => p.isFavorite) || dayPhotos[0],
      summaryCaption: dayPhotos.find((p) => p.caption)?.caption || '온 가족이 함께 걸으며 남긴 소중한 순간',
      photos: dayPhotos,
    };
  });

  // (B) 월간(해당월) 전용: 주차별 일상 하이라이트 & 피드 주요 코멘트·댓글 발췌
  const weeklyMap = new Map();
  for (const p of sorted) {
    const dObj = new Date(p.takenAt || p.dateStr || '2026-05-01');
    const weekNum = Math.min(5, Math.max(1, Math.ceil(dObj.getDate() / 7)));
    if (!weeklyMap.has(weekNum)) weeklyMap.set(weekNum, []);
    weeklyMap.get(weekNum).push(p);
  }
  const weeklyHighlights = [1, 2, 3, 4, 5]
    .map((w) => {
      const wPhotos = weeklyMap.get(w) || [];
      return {
        weekNumber: w,
        photoCount: wPhotos.length,
        highlightPhoto: wPhotos.find((p) => p.isFavorite) || wPhotos[0] || null,
        headline:
          wPhotos.find((p) => p.caption)?.caption ||
          (wPhotos.length > 0 ? `${w}주차 우리 가족 일상 기록` : '기록 대기 중'),
        photos: wPhotos,
      };
    })
    .filter((w) => w.photoCount > 0);

  const excerptedComments = [];
  for (const p of sorted) {
    const authorMember = members.find((m) => m.id === p.memberId);
    if (Array.isArray(p.comments)) {
      for (const c of p.comments) {
        excerptedComments.push({
          id: c.id || `${p.id}-c`,
          authorName: c.authorName || '가족',
          authorCity: c.authorCity || '',
          text: c.text,
          dateStr: formatEditorialDate(c.createdAt || p.takenAt),
          photoLocation: p.location || '',
        });
      }
    }
    if (p.caption && excerptedComments.length < 8) {
      excerptedComments.push({
        id: `${p.id}-cap`,
        authorName: authorMember?.name || '가족',
        authorCity: authorMember?.city || '',
        text: p.caption,
        dateStr: formatEditorialDate(p.takenAt),
        photoLocation: p.location || '',
      });
    }
  }

  // (C) 반기 전용: 월별 대표 사진 6칸 그리드 레이아웃 & 계절감 챕터
  const halfMonths =
    bookSettings.halfYear === 'second' ? [7, 8, 9, 10, 11, 12] : [1, 2, 3, 4, 5, 6];
  const monthlyRepGrid = halfMonths.map((mNum) => {
    const mPhotos = sorted.filter(
      (p) => (p.month || new Date(p.takenAt).getMonth() + 1) === mNum
    );
    return {
      month: mNum,
      meta: MONTH_META[mNum] || MONTH_META[1],
      photoCount: mPhotos.length,
      repPhoto: mPhotos.find((p) => p.isFavorite) || mPhotos[0] || null,
    };
  });

  // (D) 연간 전용: 연간 가족 주요 기념일 인덱스
  const anniversaryIndex = sorted
    .filter((p) => p.isFavorite || p.caption)
    .slice(0, 6)
    .map((p) => {
      const m = members.find((mem) => mem.id === p.memberId);
      return {
        id: p.id,
        dateStr: formatEditorialDate(p.takenAt),
        month: p.month || new Date(p.takenAt).getMonth() + 1,
        location: p.location || m?.city || '우리 가족',
        title: p.caption || '온 가족이 함께 모인 기념일',
        memberName: m?.name || '가족',
      };
    });

  pages.push({
    id: 'page-prologue',
    type: 'prologue',
    pageNumber: 2,
    bookSettings,
    monthlyCounts,
    memberStats,
    uniqueCities,
    totalPhotos: sorted.length,
    dayTimeline,
    bestGroupPhoto,
    weeklyHighlights,
    excerptedComments: excerptedComments.slice(0, 6),
    monthlyRepGrid,
    anniversaryIndex,
  });

  // 3. Period-Adaptive Chapters & Photo Spreads
  if (periodType === 'trip' && dayTimeline.length > 0) {
    // 여행 기간: 일차별 동선 타임라인 중심 페이지 구성
    dayTimeline.forEach((dayItem) => {
      const dayChunks = chunkMonthPhotos(
        dayItem.photos,
        bookSettings.layoutDensity || 'ten-per-page'
      );
      const dayMemberIds = [...new Set(dayItem.photos.map((p) => p.memberId))];
      const dayMembers = dayMemberIds
        .map((id) => members.find((m) => m.id === id))
        .filter(Boolean);
      const sampleMonth =
        dayItem.photos[0]?.month || new Date(dayItem.dateStr).getMonth() + 1 || 8;
      const meta = MONTH_META[sampleMonth] || MONTH_META[8];

      dayChunks.forEach((chunk, chunkIdx) => {
        const pageId = `page-trip-day-${dayItem.dayNumber}-chunk-${chunkIdx}`;
        const variantOffset = pageVariants[pageId] || 0;
        const layoutTemplate = selectTemplateForChunk(chunk, variantOffset);

        pages.push({
          id: pageId,
          type: 'photo-page',
          pageNumber: pages.length + 1,
          month: sampleMonth,
          monthMeta: meta,
          photos: chunk,
          layoutTemplate,
          variantOffset,
          isFirstChunkOfMonth: chunkIdx === 0,
          chunkIndex: chunkIdx + 1,
          totalChunksInMonth: dayChunks.length,
          monthTotalCount: dayItem.photos.length,
          monthMembers: dayMembers,
          sectionBadge: `일차별 동선 타임라인 · DAY ${dayItem.dayNumber}`,
          sectionHeaderTitle: `제${dayItem.dayNumber}일차 (${dayItem.formattedDate})`,
          sectionSubTitle: `이동 동선: ${dayItem.locations.join(' → ')}`,
        });
      });
    });
  } else if (periodType === 'month' && weeklyHighlights.length > 0) {
    // 월간 (해당월): 주차별 일상 하이라이트 편집 + 피드 주요 코멘트·댓글 발췌 수록
    const targetMonth = bookSettings.selectedMonth || sorted[0]?.month || 5;
    const meta = MONTH_META[targetMonth] || MONTH_META[5];

    weeklyHighlights.forEach((weekItem) => {
      const weekChunks = chunkMonthPhotos(
        weekItem.photos,
        bookSettings.layoutDensity || 'ten-per-page'
      );
      const weekMemberIds = [...new Set(weekItem.photos.map((p) => p.memberId))];
      const weekMembers = weekMemberIds
        .map((id) => members.find((m) => m.id === id))
        .filter(Boolean);

      weekChunks.forEach((chunk, chunkIdx) => {
        const pageId = `page-month-${targetMonth}-week-${weekItem.weekNumber}-chunk-${chunkIdx}`;
        const variantOffset = pageVariants[pageId] || 0;
        const layoutTemplate = selectTemplateForChunk(chunk, variantOffset);

        // 이 페이지 사진들의 댓글 발췌
        const pageComments = [];
        chunk.forEach((p) => {
          if (Array.isArray(p.comments)) {
            p.comments.forEach((c) => {
              pageComments.push({
                authorName: c.authorName || '가족',
                text: c.text,
              });
            });
          }
        });

        pages.push({
          id: pageId,
          type: 'photo-page',
          pageNumber: pages.length + 1,
          month: targetMonth,
          monthMeta: meta,
          photos: chunk,
          layoutTemplate,
          variantOffset,
          isFirstChunkOfMonth: chunkIdx === 0,
          chunkIndex: chunkIdx + 1,
          totalChunksInMonth: weekChunks.length,
          monthTotalCount: weekItem.photos.length,
          monthMembers: weekMembers,
          sectionBadge: `${targetMonth}월 ${weekItem.weekNumber}주차 일상 하이라이트`,
          sectionHeaderTitle: `${targetMonth}월 ${weekItem.weekNumber}주차 가족 이야기`,
          sectionSubTitle: weekItem.headline,
          pageComments: pageComments.slice(0, 3),
        });
      });
    });
  } else {
    // 반기('half') 및 연간('annual'): 월별 & 계절감 챕터 중심 구성
    const byMonth = new Map();
    for (const photo of sorted) {
      const m = photo.month || new Date(photo.takenAt).getMonth() + 1;
      if (!byMonth.has(m)) byMonth.set(m, []);
      byMonth.get(m).push(photo);
    }

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
          sectionBadge:
            periodType === 'half'
              ? `계절 챕터 · ${meta.seasonKo}의 기록 (${monthNum}월)`
              : `연대기 화보 · ${monthNum}월 (${meta.seasonKo})`,
          sectionHeaderTitle: `${monthNum}월`,
          sectionSubTitle:
            bookSettings.monthlyHighlights?.[monthNum]?.trim() ||
            DEFAULT_MONTHLY_HIGHLIGHTS[monthNum] ||
            meta.ko,
        });
      });
    }
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
    anniversaryIndex,
    excerptedComments: excerptedComments.slice(0, 4),
    dateRange:
      sorted.length > 0
        ? `${formatEditorialDate(sorted[0].takenAt)} — ${formatEditorialDate(
            sorted[sorted.length - 1].takenAt
          )}`
        : `${bookSettings.year || 2026}.01.01 — ${bookSettings.year || 2026}.12.31`,
  });

  return pages;
}
