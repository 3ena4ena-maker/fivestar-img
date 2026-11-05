import React, { useRef, useState, useEffect } from 'react';
import { MapPin, Shuffle, Move } from 'lucide-react';
import {
  formatEditorialDate,
  formatKoreanDate,
  DEFAULT_MONTHLY_HIGHLIGHTS,
} from '../utils/bookLayoutEngine';
import FramePhotoItem from './FramePhotoItem';

/**
 * Splits an array of photos (length 5..12) into rows of photos according to the chosen template
 * so that every row is 100% filled with zero empty cells, even when each month has a different photo count!
 */
function buildAdaptiveRows(photos, layoutTemplate) {
  const n = photos.length;
  const sliceByCounts = (counts) => {
    const rows = [];
    let idx = 0;
    for (const c of counts) {
      if (idx >= n) break;
      rows.push(photos.slice(idx, idx + c).map((p, i) => ({ photo: p, globalIndex: idx + i })));
      idx += c;
    }
    if (idx < n) {
      rows.push(photos.slice(idx).map((p, i) => ({ photo: p, globalIndex: idx + i })));
    }
    return rows;
  };

  if (layoutTemplate === 'tiered-rows') {
    const map = {
      1: [1],
      2: [1, 1],
      3: [2, 1],
      4: [1, 3],
      5: [3, 2],
      6: [3, 1, 2],
      7: [3, 2, 2],
      8: [3, 2, 3],
      9: [4, 2, 3],
      10: [4, 2, 4],
      11: [4, 3, 4],
      12: [4, 4, 4],
    };
    return sliceByCounts(map[n] || [4, 3, 3]);
  }

  if (layoutTemplate === 'uniform-contact') {
    const map = {
      1: [1],
      2: [2],
      3: [3],
      4: [2, 2],
      5: [3, 2],
      6: [3, 3],
      7: [4, 3],
      8: [4, 4],
      9: [3, 3, 3],
      10: [5, 5],
      11: [4, 4, 3],
      12: [4, 4, 4],
    };
    return sliceByCounts(map[n] || [4, 4, 2]);
  }

  // Default: 'bento-mosaic' (Featured lead row + balanced mosaic rows)
  const map = {
    1: [1],
    2: [2],
    3: [1, 2],
    4: [2, 2],
    5: [2, 3],
    6: [2, 4],
    7: [3, 4],
    8: [2, 3, 3],
    9: [2, 3, 4],
    10: [3, 3, 4],
    11: [3, 4, 4],
    12: [4, 4, 4],
  };
  return sliceByCounts(map[n] || [3, 3, 4]);
}

const BASE_PAGE_WIDTH = 460;
const BASE_PAGE_HEIGHT = 634.8; // 460 * 1.38

export default function BookPageRenderer(props) {
  const outerRef = useRef(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;

    const updateScale = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w > 10 && h > 10) {
        const nextScale = Math.min(w / BASE_PAGE_WIDTH, h / BASE_PAGE_HEIGHT);
        setScale(nextScale);
      } else if (w > 10) {
        setScale(w / BASE_PAGE_WIDTH);
      }
    };

    updateScale();
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(updateScale);
      observer.observe(el);
      return () => observer.disconnect();
    }
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  if (!props.page) return null;

  return (
    <div ref={outerRef} className="w-full h-full relative overflow-hidden">
      <div
        style={{
          width: `${BASE_PAGE_WIDTH}px`,
          height: `${BASE_PAGE_HEIGHT}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        <BookPageCanvas {...props} />
      </div>
    </div>
  );
}

function BookPageCanvas({
  page,
  members = [],
  bookSettings = {},
  side = 'single', // 'left' | 'right' | 'single'
  onSelectPhoto,
  onCycleVariant,
  onUpdatePhotoPosition,
  onUpdateMonthlyHighlight,
  isRepositionMode = false,
  onToggleRepositionMode,
  isPrint = false,
  printSpec = 'digital-rgb', // 'digital-rgb' (스마트기기 열람용 RGB) | 'press-bleed' (인쇄 공정용 300DPI · 재단 여백 포함)
}) {
  if (!page) return null;

  const isPressBleed = printSpec === 'press-bleed';

  const paperClass =
    bookSettings.paperTheme === 'white'
      ? 'paper-white'
      : bookSettings.paperTheme === 'stone'
      ? 'paper-stone'
      : 'paper-ivory';

  const spineClass =
    !isPrint && side === 'left'
      ? 'book-spine-left'
      : !isPrint && side === 'right'
      ? 'book-spine-right'
      : '';

  const getMember = (memberId) =>
    members.find((m) => m.id === memberId) || {
      name: '가족',
      city: '',
      color: '#3B5249',
      badgeBg: '#E6EFEA',
    };

  const renderPressCropMarks = () => {
    if (!isPressBleed) return null;
    return (
      <div className="pointer-events-none absolute inset-0 z-30">
        {/* 3mm 재단 여백(Bleed) 가이드라인 */}
        <div className="absolute inset-3 border border-dashed border-cyan-600/45" />
        {/* 사방 모서리 재단선 (Crop Marks) */}
        <div className="absolute top-1.5 left-1.5 w-4 h-4 border-t-2 border-l-2 border-[#141413]" />
        <div className="absolute top-1.5 right-1.5 w-4 h-4 border-t-2 border-r-2 border-[#141413]" />
        <div className="absolute bottom-1.5 left-1.5 w-4 h-4 border-b-2 border-l-2 border-[#141413]" />
        <div className="absolute bottom-1.5 right-1.5 w-4 h-4 border-b-2 border-r-2 border-[#141413]" />
        {/* 상단 인쇄 공정 스탬프 */}
        <div className="absolute top-0.5 left-1/2 -translate-x-1/2 bg-[#141413] text-white px-2 py-0.2 text-[8px] font-mono-meta tracking-wider">
          인쇄 공정용 원본 (300DPI · 3mm 재단 여백 포함 · P.{page.pageNumber})
        </div>
      </div>
    );
  };

  const fontScales = bookSettings.fontScales || {};
  const scaleStyle = (key, basePx, extraStyle = {}) => {
    const s = Number(fontScales[key]) || 1;
    if (s === 1) return extraStyle;
    return {
      ...extraStyle,
      fontSize: `${Math.round(basePx * s * 10) / 10}px`,
      lineHeight: 1.35,
    };
  };

  const renderRunningHeader = (
    leftLabel,
    rightLabel,
    leftKey = null,
    rightKey = null
  ) => (
    <div className="flex items-start justify-between gap-2 pb-2 mb-3 border-b border-[#141413]/12 text-[11px] tracking-wider text-[#71706B] font-medium">
      <span
        style={leftKey ? scaleStyle(leftKey, 11) : undefined}
        className="whitespace-pre-line"
      >
        {leftLabel}
      </span>
      <span
        style={rightKey ? scaleStyle(rightKey, 11) : undefined}
        className="whitespace-pre-line text-right"
      >
        {rightLabel}
      </span>
    </div>
  );

  const renderRunningFooter = () => (
    <>
      {renderPressCropMarks()}
      <div className="mt-auto pt-2.5 border-t border-[#141413]/10 flex items-center justify-between text-[11px] text-[#71706B]">
        <span>{bookSettings.familyTitle || bookSettings.koreanTitle || '박서 오피스 — 우리 가족 사진첩'}</span>
        <span className="font-bold text-[#141413]">
          {page.pageNumber}쪽
        </span>
      </div>
    </>
  );

  // 1. COVER PAGE (8 Diverse Editorial & Classic Cover Layouts + Custom Background Color + Photo On/Off + Editable Header)
  if (page.type === 'cover') {
    const periodType = bookSettings.periodType || 'annual';
    const coverLayout = bookSettings.coverLayout || 'magz-editorial';
    const coverBgColor = bookSettings.coverBgColor || '#FBF8F3';
    const coverShowPhoto = bookSettings.coverShowPhoto !== false;

    const isDarkBg = (() => {
      const hex = (coverBgColor || '#FBF8F3').replace('#', '');
      if (hex.length !== 6) return false;
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.48;
    })();

    const textPrimary = isDarkBg ? '#FBF8F3' : '#1E1B18';
    const textSecondary = isDarkBg ? 'rgba(251,248,243,0.76)' : '#5A534A';
    const textMuted = isDarkBg ? 'rgba(251,248,243,0.55)' : '#7D756B';
    const borderRule = isDarkBg ? 'rgba(251,248,243,0.24)' : 'rgba(30,27,24,0.18)';
    const borderStrong = isDarkBg ? 'rgba(251,248,243,0.65)' : '#1E1B18';

    const coverImg =
      bookSettings.coverPhotoUrl ||
      page.bestGroupPhoto?.url ||
      page.coverPhoto?.url ||
      'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=1400&q=85';

    const matchedCoverPhoto =
      (bookSettings.coverPhotoUrl &&
        Array.isArray(page.coverPhotos) &&
        page.coverPhotos.find((p) => p.url === bookSettings.coverPhotoUrl)) ||
      page.bestGroupPhoto ||
      page.coverPhoto ||
      null;

    const coverPhotoObj = {
      ...(matchedCoverPhoto || {}),
      id: matchedCoverPhoto?.id || '__cover_photo__',
      url: coverImg,
      caption: matchedCoverPhoto?.caption || '우리 가족 표지 사진',
      cropX:
        typeof bookSettings.coverCropX === 'number'
          ? bookSettings.coverCropX
          : typeof matchedCoverPhoto?.cropX === 'number'
          ? matchedCoverPhoto.cropX
          : 50,
      cropY:
        typeof bookSettings.coverCropY === 'number'
          ? bookSettings.coverCropY
          : typeof matchedCoverPhoto?.cropY === 'number'
          ? matchedCoverPhoto.cropY
          : 50,
      cropZoom:
        typeof bookSettings.coverCropZoom === 'number'
          ? bookSettings.coverCropZoom
          : typeof matchedCoverPhoto?.cropZoom === 'number'
          ? matchedCoverPhoto.cropZoom
          : 1,
    };

    const renderMainCoverPhoto = (frameClass = 'w-full h-full', children = null) => (
      <FramePhotoItem
        photo={coverPhotoObj}
        className={frameClass}
        isRepositionMode={isRepositionMode}
        isPrint={isPrint}
        onSelectPhoto={onSelectPhoto}
        onUpdatePhotoPosition={onUpdatePhotoPosition}
      >
        {children}
      </FramePhotoItem>
    );

    // 멀티 콜라주 및 3단 스트립용 사진 객체 배열 구성
    const rawPhotoObjects =
      Array.isArray(page.coverPhotos) && page.coverPhotos.length > 0
        ? page.coverPhotos
        : [coverPhotoObj];
    const orderedPhotoObjects = [
      coverPhotoObj,
      ...rawPhotoObjects.filter((p) => p && p.url !== coverImg),
    ];
    const getCollagePhotos = (count) => {
      const result = [];
      for (let i = 0; i < count; i++) {
        const base = orderedPhotoObjects[i % orderedPhotoObjects.length] || coverPhotoObj;
        result.push(i === 0 ? coverPhotoObj : base);
      }
      return result;
    };

    const cities = [...new Set(members.map((m) => m.city).filter(Boolean))].join(' · ');
    const memberNames = members.map((m) => m.name).join(' · ');
    const displayFamilyTitle =
      periodType === 'trip' && bookSettings.tripDestinationTitle
        ? bookSettings.tripDestinationTitle
        : bookSettings.familyTitle ||
          (bookSettings.title && !bookSettings.title.includes('OUR YEAR')
            ? bookSettings.title
            : '박서 오피스 — 우리 가족 사진첩');

    const defaultLeftLabel =
      periodType === 'trip'
        ? `TRAVEL EDITION · ${bookSettings.startDate || ''} — ${bookSettings.endDate || ''}`
        : periodType === 'month'
        ? `${bookSettings.year || 2026}. ${String(bookSettings.selectedMonth || 5).padStart(2, '0')} · MONTHLY ISSUE`
        : periodType === 'half'
        ? `${bookSettings.year || 2026} ${bookSettings.halfYear === 'second' ? 'AUTUMN — WINTER' : 'SPRING — SUMMER'}`
        : `${bookSettings.year || 2026} FAMILY ARCHIVE`;

    const defaultRightLabel =
      periodType === 'trip'
        ? '우리 가족 여행의 기록'
        : periodType === 'month'
        ? '이달의 가족 일상'
        : periodType === 'half'
        ? '반기 가족 사진첩'
        : '우리 가족 사계절 기록';

    const topLeftText =
      bookSettings.coverHeaderLeft !== undefined
        ? bookSettings.coverHeaderLeft
        : defaultLeftLabel;
    const topRightText =
      bookSettings.coverHeaderRight !== undefined
        ? bookSettings.coverHeaderRight
        : defaultRightLabel;

    const displayKoreanTitle = bookSettings.koreanTitle || '각자의 계절, 하나의 시간';
    const displaySubtitle =
      bookSettings.subtitle !== undefined
        ? bookSettings.subtitle
        : '온 가족이 함께 모으는 소중한 일상 기록';
    const yearNumber = bookSettings.year || 2026;

    // =========================================================================
    // [스타일 0] 직접 만든 표지 올리기 (내 기기 표지 이미지 전체 캔버스 + 드래그 크기·위치 조절)
    // =========================================================================
    if (coverLayout === 'custom-upload') {
      const showOverlayText = Boolean(bookSettings.customCoverShowText);
      return (
        <div
          style={{ backgroundColor: coverBgColor, color: textPrimary }}
          className={`w-full h-full relative overflow-hidden select-none ${spineClass}`}
        >
          <div className="w-full h-full">
            {renderMainCoverPhoto(
              'w-full h-full',
              showOverlayText ? (
                <div className="absolute inset-0 flex flex-col justify-between p-6 sm:p-8 pointer-events-none bg-gradient-to-b from-black/35 via-transparent to-black/55 text-[#FAF9F6]">
                  <div className="flex items-start justify-between text-[9px] tracking-[0.18em] uppercase text-white/85 gap-2">
                    <span
                      style={scaleStyle('coverHeaderLeft', 9)}
                      className="whitespace-pre-line max-w-[50%]"
                    >
                      {topLeftText}
                    </span>
                    <span
                      style={scaleStyle('coverHeaderRight', 9)}
                      className="whitespace-pre-line max-w-[48%] text-right"
                    >
                      {topRightText}
                    </span>
                  </div>
                  <div>
                    <h1
                      style={scaleStyle('coverTitle', 32)}
                      className="font-serif-kr text-2xl sm:text-3xl font-bold tracking-tight leading-snug drop-shadow-sm whitespace-pre-line"
                    >
                      {displayFamilyTitle}
                    </h1>
                    {displayKoreanTitle && (
                      <p
                        style={scaleStyle('coverKoreanTitle', 15)}
                        className="mt-1 font-serif-kr text-sm sm:text-base font-medium text-white/95 whitespace-pre-line"
                      >
                        {displayKoreanTitle}
                      </p>
                    )}
                    {displaySubtitle && (
                      <p
                        style={scaleStyle('coverSubtitle', 11)}
                        className="mt-1.5 text-[11px] text-white/80 whitespace-pre-line"
                      >
                        {displaySubtitle}
                      </p>
                    )}
                  </div>
                </div>
              ) : null
            )}
          </div>
        </div>
      );
    }

    // =========================================================================
    // [스타일 1] 빅 세리프 매거진형 (MAGZ 스타일 — 초대형 마스트헤드 + 중앙 사진 + 하단 사각 배지)
    // =========================================================================
    if (coverLayout === 'magz-editorial') {
      return (
        <div
          style={{ backgroundColor: coverBgColor, color: textPrimary }}
          className={`w-full h-full flex flex-col justify-between px-6 sm:px-8 py-6 sm:py-7 relative select-none ${spineClass}`}
        >
          {/* 상단 빅 마스트헤드 타이틀 */}
          <div>
            <div
              style={{ color: textMuted }}
              className="flex items-start justify-between text-[9px] tracking-[0.18em] uppercase mb-1 gap-2"
            >
              <span
                style={scaleStyle('coverHeaderLeft', 9)}
                className="whitespace-pre-line max-w-[50%]"
              >
                {topLeftText}
              </span>
              <span
                style={scaleStyle('coverHeaderRight', 9)}
                className="whitespace-pre-line max-w-[48%] text-right"
              >
                {topRightText}
              </span>
            </div>
            <h1
              style={scaleStyle('coverTitle', 36)}
              className="font-editorial-en text-3xl sm:text-[42px] font-black tracking-tight leading-[0.98] uppercase break-keep whitespace-pre-line"
            >
              {displayFamilyTitle}
            </h1>
            <p
              style={{ color: textSecondary }}
              className="mt-1.5 font-editorial-en italic text-xs sm:text-sm font-medium tracking-tight whitespace-pre-line"
            >
              <span style={scaleStyle('coverSubTitle', 13)}>{displayKoreanTitle}</span>
              {displaySubtitle ? (
                <span style={scaleStyle('coverDesc', 13)}> — {displaySubtitle}</span>
              ) : null}
            </p>
          </div>

          {/* 중앙 대형 화보 프레임 */}
          <div className="my-3.5 flex-1 min-h-0 flex flex-col">
            <div className="w-full h-full overflow-hidden relative shadow-xs">
              {renderMainCoverPhoto('w-full h-full')}
            </div>
          </div>

          {renderPressCropMarks()}

          {/* 하단 중앙 사각 테두리 배지 (MAGZ 레퍼런스 하단 박스) */}
          <div className="pt-1 flex justify-center">
            <div
              style={{ borderColor: borderStrong, color: textPrimary }}
              className="border px-5 py-1.5 text-[9px] sm:text-[10px] tracking-[0.16em] uppercase font-semibold text-center truncate max-w-full"
            >
              {yearNumber} FAMILY EDITION · {cities || 'OUR FAMILY'} · {page.totalPhotos} PHOTOS
            </div>
          </div>
        </div>
      );
    }

    // =========================================================================
    // [스타일 2] 라이프스타일 이슈형 (LIFESTYLE 스타일 — 상단 세리프 + 3단 칼럼 + 하단 화보 + 바코드)
    // =========================================================================
    if (coverLayout === 'lifestyle-journal') {
      return (
        <div
          style={{ backgroundColor: coverBgColor, color: textPrimary }}
          className={`w-full h-full flex flex-col justify-between px-6 sm:px-8 py-6 sm:py-7 relative select-none ${spineClass}`}
        >
          {/* 상단 LIFESTYLE 매거진 헤더 & 3단 요약 칼럼 */}
          <div>
            <h1
              style={scaleStyle('coverTitle', 32)}
              className="font-editorial-en text-2xl sm:text-4xl font-bold tracking-[0.08em] uppercase text-center leading-tight whitespace-pre-line"
            >
              {displayFamilyTitle}
            </h1>
            <p
              style={scaleStyle('coverSubTitle', 11, { color: textSecondary })}
              className="text-[10px] sm:text-[11px] tracking-[0.14em] uppercase text-center mt-1 font-editorial-ko whitespace-pre-line"
            >
              {displayKoreanTitle}
            </p>

            {/* 이슈 바 */}
            <div
              style={{ borderColor: borderStrong, color: textSecondary }}
              className="mt-2.5 py-1 border-y flex items-center justify-between text-[9px] tracking-[0.12em] uppercase font-semibold"
            >
              <span
                style={scaleStyle('coverHeaderLeft', 9)}
                className="whitespace-pre-line max-w-[55%]"
              >
                {topLeftText}
              </span>
              <span className="shrink-0">ISSUE NO. 01 | {yearNumber}</span>
            </div>

            {/* 3단 미니 에디토리얼 칼럼 */}
            <div
              style={{ borderColor: borderRule }}
              className="grid grid-cols-3 divide-x border-b py-2 text-center text-[9px] leading-snug"
            >
              <div style={{ borderColor: borderRule }} className="px-1.5">
                <div className="font-bold uppercase tracking-wider text-[8px]">OUR CITIES</div>
                <div style={{ color: textSecondary }} className="mt-0.5 truncate">
                  {cities || '부산 · 서울 · 대전'}
                </div>
              </div>
              <div style={{ borderColor: borderRule }} className="px-1.5">
                <div className="font-bold uppercase tracking-wider text-[8px]">EDITION</div>
                <div
                  style={scaleStyle('coverHeaderRight', 9, { color: textSecondary })}
                  className="mt-0.5 whitespace-pre-line"
                >
                  {topRightText}
                </div>
              </div>
              <div style={{ borderColor: borderRule }} className="px-1.5">
                <div className="font-bold uppercase tracking-wider text-[8px]">ARCHIVE</div>
                <div style={{ color: textSecondary }} className="mt-0.5 truncate">
                  가족 {members.length}명 · {page.totalPhotos}장
                </div>
              </div>
            </div>
          </div>

          {/* 하단 대형 화보 영역 + 우측 하단 매거진 바코드 태그 */}
          <div className="mt-3 flex-1 min-h-0 relative overflow-hidden">
            {renderMainCoverPhoto(
              'w-full h-full',
              <div className="pointer-events-none absolute bottom-2.5 right-2.5 bg-white/95 text-[#141413] px-2.5 py-1 shadow-xs flex flex-col items-center z-10">
                <div className="flex items-center gap-[1.5px] h-3.5">
                  {[2, 1, 3, 1, 2, 1, 1, 3, 2, 1, 2, 1].map((w, i) => (
                    <span
                      key={i}
                      style={{ width: `${w}px` }}
                      className="h-full bg-[#141413] inline-block"
                    />
                  ))}
                </div>
                <span className="text-[7px] font-mono-meta tracking-widest mt-0.5">
                  {yearNumber}-FAM-01
                </span>
              </div>
            )}
          </div>

          {renderPressCropMarks()}
        </div>
      );
    }

    // =========================================================================
    // [스타일 3] 3단 스트립 매거진형 (STAY GREEN 스타일 — 세리프 헤더 + 3분할 사진 + 하단 배너)
    // =========================================================================
    if (coverLayout === 'stay-green-trio') {
      const trioPhotos = getCollagePhotos(3);
      const bannerBg = isDarkBg ? 'rgba(251,248,243,0.14)' : '#5E644F';
      return (
        <div
          style={{ backgroundColor: coverBgColor, color: textPrimary }}
          className={`w-full h-full flex flex-col justify-between px-6 sm:px-8 py-6 sm:py-7 relative select-none ${spineClass}`}
        >
          {/* 상단 STAY GREEN 스타일 타이틀 & 리드 문구 */}
          <div className="text-center">
            <h1
              style={scaleStyle('coverTitle', 28)}
              className="font-editorial-en text-2xl sm:text-3xl font-bold tracking-[0.06em] uppercase leading-tight whitespace-pre-line"
            >
              {displayFamilyTitle}
            </h1>
            <div
              style={{ backgroundColor: borderStrong }}
              className="w-full h-[1px] my-2"
            />
            <p
              style={scaleStyle('coverSubTitle', 13)}
              className="font-editorial-ko text-xs sm:text-sm font-semibold leading-snug px-2 whitespace-pre-line"
            >
              {displayKoreanTitle}
            </p>
            <p
              style={scaleStyle('coverDesc', 11, { color: textSecondary })}
              className="font-editorial-ko text-[10px] sm:text-xs mt-1 px-3 whitespace-pre-line"
            >
              {displaySubtitle}
            </p>
          </div>

          {/* 중단 세로 3단 스트립 사진 (3장 나란히) */}
          <div className="my-3 flex-1 min-h-0">
            <div className="w-full h-full grid grid-cols-3 gap-2">
              {trioPhotos.map((pObj, idx) => (
                <FramePhotoItem
                  key={`${pObj.id || 'trio'}-${idx}`}
                  photo={pObj}
                  className="w-full h-full"
                  isRepositionMode={isRepositionMode}
                  isPrint={isPrint}
                  onSelectPhoto={onSelectPhoto}
                  onUpdatePhotoPosition={onUpdatePhotoPosition}
                />
              ))}
            </div>
          </div>

          {renderPressCropMarks()}

          {/* 하단 컬러 배너 박스 (STAY GREEN 하단 올리브 배너 감성) */}
          <div
            style={{ backgroundColor: bannerBg, color: '#FBF8F3' }}
            className="p-3 sm:p-3.5 flex items-center gap-3"
          >
            <div className="w-11 h-11 border border-[#FBF8F3]/40 flex flex-col items-center justify-center text-[8px] font-mono-meta leading-tight shrink-0 text-center">
              <span>FAM</span>
              <strong className="text-[10px]">{yearNumber}</strong>
              <span>BOOK</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[9px] tracking-[0.14em] uppercase font-semibold truncate">
                {topLeftText} · {cities || 'FAMILY ARCHIVE'}
              </div>
              <div className="grid grid-cols-4 gap-1 mt-1.5 text-center">
                {[
                  { label: '가족', val: `${members.length}명` },
                  { label: '수록', val: `${page.totalPhotos}장` },
                  { label: '연도', val: `${yearNumber}` },
                  { label: '보관', val: '영구소장' },
                ].map((b) => (
                  <div
                    key={b.label}
                    className="border border-[#FBF8F3]/30 rounded py-0.5 px-1 text-[8px] leading-tight"
                  >
                    <div className="opacity-75">{b.label}</div>
                    <div className="font-bold">{b.val}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // =========================================================================
    // [스타일 4] 풀 프레임형 (Full Photo Cover — 표지 전체 전면 사진 + 상하단 타이포그래피)
    // =========================================================================
    if (coverLayout === 'full-bleed') {
      return (
        <div
          style={{ backgroundColor: coverBgColor, color: '#FBF8F3' }}
          className={`w-full h-full relative overflow-hidden select-none ${spineClass}`}
        >
          {renderMainCoverPhoto(
            'w-full h-full',
            <>
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/55 via-black/10 to-black/75" />

              {/* 상단 여백 메타 바 */}
              <div className="pointer-events-none absolute top-6 sm:top-8 inset-x-6 sm:inset-x-9 z-10 flex items-start justify-between text-[10px] tracking-[0.16em] uppercase pb-2.5 border-b border-white/30 text-[#FBF8F3]">
                <span
                  style={scaleStyle('coverHeaderLeft', 10)}
                  className="whitespace-pre-line max-w-[48%]"
                >
                  {topLeftText}
                </span>
                <span
                  style={scaleStyle('coverHeaderRight', 10)}
                  className="whitespace-pre-line max-w-[48%] text-right"
                >
                  {topRightText}
                </span>
              </div>

              {/* 하단 여백 메인 타이틀 */}
              <div className="pointer-events-none absolute bottom-8 sm:bottom-10 inset-x-6 sm:inset-x-9 z-10 space-y-2 text-[#FBF8F3]">
                <p
                  style={scaleStyle('coverSubTitle', 13)}
                  className="text-xs sm:text-sm font-editorial-ko opacity-90 whitespace-pre-line"
                >
                  {displayKoreanTitle}
                </p>
                <h1
                  style={scaleStyle('coverTitle', 28)}
                  className="font-editorial-ko text-2xl sm:text-3xl font-bold tracking-tight leading-snug whitespace-pre-line"
                >
                  {displayFamilyTitle}
                </h1>
                {displaySubtitle && (
                  <p
                    style={scaleStyle('coverDesc', 12)}
                    className="text-xs opacity-80 font-editorial-ko whitespace-pre-line"
                  >
                    {displaySubtitle}
                  </p>
                )}
                <div className="pt-3 mt-2 border-t border-white/25 flex items-center justify-between text-[10px] opacity-80">
                  <span className="truncate pr-2">{memberNames}</span>
                  <span className="shrink-0 font-mono-meta">{yearNumber}</span>
                </div>
              </div>
            </>
          )}

          {renderPressCropMarks()}
        </div>
      );
    }

    // =========================================================================
    // [스타일 5] 폴라로이드 / 액자 프레임형 (Polaroid / Framed Cover)
    // =========================================================================
    if (coverLayout === 'polaroid-frame') {
      return (
        <div
          style={{ backgroundColor: coverBgColor, color: textPrimary }}
          className={`w-full h-full flex flex-col justify-between p-6 sm:p-8 relative select-none ${spineClass}`}
        >
          {/* 상단 라벨 */}
          <div
            style={{ color: textSecondary }}
            className="flex items-start justify-between text-[10px] tracking-[0.16em] uppercase"
          >
            <span
              style={scaleStyle('coverHeaderLeft', 10)}
              className="whitespace-pre-line max-w-[48%]"
            >
              {topLeftText}
            </span>
            <span
              style={scaleStyle('coverHeaderRight', 10)}
              className="whitespace-pre-line max-w-[48%] text-right"
            >
              {topRightText}
            </span>
          </div>

          {/* 중앙 폴라로이드 액자 카드 */}
          <div className="my-auto py-2 flex items-center justify-center">
            <div className="w-[86%] bg-[#FFFEFA] text-[#2B211B] p-3.5 sm:p-4 pb-5 sm:pb-6 shadow-md border border-black/8 space-y-3.5">
              <div className="w-full aspect-[4/3] overflow-hidden bg-[#F2EDE3] relative">
                {renderMainCoverPhoto('w-full h-full')}
              </div>

              {/* 폴라로이드 하단 손글씨/명조 감성 캡션 */}
              <div className="px-1 flex items-end justify-between gap-2">
                <div className="min-w-0">
                  <h1
                    style={scaleStyle('coverTitle', 17)}
                    className="font-editorial-ko text-base sm:text-lg font-bold text-[#2B211B] leading-snug whitespace-pre-line"
                  >
                    {displayFamilyTitle}
                  </h1>
                  <p
                    style={scaleStyle('coverSubTitle', 12)}
                    className="font-editorial-ko italic text-xs text-[#7A685D] mt-0.5 whitespace-pre-line"
                  >
                    {displayKoreanTitle}
                  </p>
                </div>
                <span className="font-editorial-en italic text-xs text-[#8A442B] shrink-0">
                  {yearNumber}
                </span>
              </div>
            </div>
          </div>

          {renderPressCropMarks()}

          {/* 하단 가족 이름 */}
          <div
            style={{ color: textSecondary }}
            className="text-center text-[10px] tracking-wider truncate"
          >
            {memberNames}
          </div>
        </div>
      );
    }

    // =========================================================================
    // [스타일 6] 타이포그래피 중심형 (Typography Cover — 인물 사진 없이 단색 배경 + 큰 타이포)
    // =========================================================================
    if (coverLayout === 'typography-cover') {
      return (
        <div
          style={{ backgroundColor: coverBgColor, color: textPrimary }}
          className={`w-full h-full p-6 sm:p-8 flex flex-col justify-between relative select-none ${spineClass}`}
        >
          <div
            style={{ borderColor: borderRule, color: textSecondary }}
            className="flex items-start justify-between text-[10px] tracking-[0.18em] uppercase pb-3 border-b"
          >
            <span
              style={scaleStyle('coverHeaderLeft', 10)}
              className="whitespace-pre-line max-w-[48%]"
            >
              {topLeftText}
            </span>
            <span
              style={scaleStyle('coverHeaderRight', 10)}
              className="whitespace-pre-line max-w-[48%] text-right"
            >
              {topRightText}
            </span>
          </div>

          {/* 중앙 큼직한 타이포그래피 중심 영역 */}
          <div className="my-auto py-6 flex flex-col items-center text-center space-y-4 px-2">
            <span
              style={{ color: textSecondary }}
              className="font-editorial-en text-xs sm:text-sm tracking-[0.28em] uppercase font-semibold"
            >
              FAMILY MOMENTS {yearNumber}
            </span>

            <h1
              style={scaleStyle('coverTitle', 30)}
              className="font-editorial-ko text-2xl sm:text-4xl font-bold tracking-tight leading-snug break-keep whitespace-pre-line"
            >
              {displayFamilyTitle}
            </h1>

            <div
              style={{ backgroundColor: borderStrong }}
              className="w-12 h-[1.5px] my-1"
            />

            <p
              style={scaleStyle('coverSubTitle', 15)}
              className="font-editorial-ko text-sm sm:text-base font-medium whitespace-pre-line"
            >
              {displayKoreanTitle}
            </p>

            {displaySubtitle && (
              <p
                style={scaleStyle('coverDesc', 12, { color: textSecondary })}
                className="font-editorial-ko text-xs max-w-[240px] leading-relaxed whitespace-pre-line"
              >
                {displaySubtitle}
              </p>
            )}
          </div>

          {renderPressCropMarks()}

          {/* 하단 작은 크기 가족 구성원 이름 및 도시 */}
          <div
            style={{ borderColor: borderRule, color: textSecondary }}
            className="pt-3 border-t text-center space-y-1"
          >
            <div className="text-[10px] font-medium tracking-wide truncate">
              {memberNames}
            </div>
            <div
              style={{ color: textMuted }}
              className="text-[9px] tracking-[0.2em] uppercase"
            >
              {cities || 'FAMILY ARCHIVE'} · {page.totalPhotos} PHOTOS
            </div>
          </div>
        </div>
      );
    }

    // =========================================================================
    // [스타일 7] 멀티 콜라주형 (Multi-Photo Collage Cover — 3x3 또는 2x2 정방형 그리드)
    // =========================================================================
    if (coverLayout === 'multi-collage') {
      const selectedCount = Array.isArray(bookSettings.coverPhotoIds)
        ? bookSettings.coverPhotoIds.length
        : 0;
      const useNineGrid =
        selectedCount > 4 || (selectedCount === 0 && orderedPhotoObjects.length >= 6);
      const cellCount = useNineGrid ? 9 : 4;
      const collagePhotos = getCollagePhotos(cellCount);

      return (
        <div
          style={{ backgroundColor: coverBgColor, color: textPrimary }}
          className={`w-full h-full flex flex-col justify-between p-6 sm:p-8 relative select-none ${spineClass}`}
        >
          {/* 상단 타이틀 */}
          <div>
            <div
              style={{ borderColor: borderRule, color: textSecondary }}
              className="flex items-start justify-between text-[10px] tracking-[0.14em] uppercase pb-2 border-b"
            >
              <span
                style={scaleStyle('coverHeaderLeft', 10)}
                className="whitespace-pre-line max-w-[48%]"
              >
                {topLeftText}
              </span>
              <span
                style={scaleStyle('coverHeaderRight', 10)}
                className="whitespace-pre-line max-w-[48%] text-right"
              >
                {topRightText}
              </span>
            </div>
            <div className="mt-3 flex items-baseline justify-between gap-2">
              <h1
                style={scaleStyle('coverTitle', 22)}
                className="font-editorial-ko text-lg sm:text-2xl font-bold tracking-tight whitespace-pre-line"
              >
                {displayFamilyTitle}
              </h1>
              <span className="font-editorial-en text-sm sm:text-base font-bold shrink-0">
                {yearNumber}
              </span>
            </div>
            <p
              style={scaleStyle('coverSubTitle', 12, { color: textSecondary })}
              className="text-xs font-editorial-ko mt-0.5 whitespace-pre-line"
            >
              {displayKoreanTitle}
            </p>
          </div>

          {/* 중앙 정방형 2x2 또는 3x3 멀티 콜라주 그리드 */}
          <div className="my-3 flex-1 min-h-0 flex items-center justify-center">
            <div
              className={`w-full aspect-square max-h-full grid ${
                useNineGrid ? 'grid-cols-3 gap-1.5' : 'grid-cols-2 gap-2'
              }`}
            >
              {collagePhotos.map((pObj, idx) => (
                <FramePhotoItem
                  key={`${pObj.id || 'col'}-${idx}`}
                  photo={pObj}
                  className="w-full h-full"
                  isRepositionMode={isRepositionMode}
                  isPrint={isPrint}
                  onSelectPhoto={onSelectPhoto}
                  onUpdatePhotoPosition={onUpdatePhotoPosition}
                />
              ))}
            </div>
          </div>

          {renderPressCropMarks()}

          {/* 하단 요약 */}
          <div
            style={{ borderColor: borderRule, color: textSecondary }}
            className="pt-2.5 border-t flex items-center justify-between text-[10px]"
          >
            <span className="truncate pr-2">{memberNames}</span>
            <span className="shrink-0 font-mono-meta">{page.totalPhotos} MOMENTS</span>
          </div>
        </div>
      );
    }

    // 디자인 2 (기존 호환): 아치 갤러리 (Arch Poster)
    if (coverLayout === 'arch-poster') {
      return (
        <div
          style={{ backgroundColor: coverBgColor, color: textPrimary }}
          className={`w-full h-full flex flex-col justify-between p-6 sm:p-8 relative select-none ${spineClass}`}
        >
          <div className="text-center space-y-1">
            <div
              style={{ color: textSecondary, borderColor: borderRule }}
              className="flex items-center justify-between text-[10px] tracking-[0.14em] uppercase pb-2.5 border-b"
            >
              <span className="truncate max-w-[48%] text-left">{topLeftText}</span>
              <span className="truncate max-w-[48%] text-right">{topRightText}</span>
            </div>
            <div className="pt-3">
              <h1 className="font-editorial-ko text-xl sm:text-2xl font-bold tracking-tight leading-snug">
                {displayFamilyTitle}
              </h1>
              <p
                style={{ color: textSecondary }}
                className="mt-1 font-editorial-ko text-xs sm:text-sm"
              >
                {displayKoreanTitle}
              </p>
            </div>
          </div>

          <div className="my-3 flex-1 min-h-0 flex flex-col items-center justify-center">
            <div
              style={{ borderColor: borderRule }}
              className="w-[82%] h-full max-h-[290px] rounded-t-full overflow-hidden border relative shadow-xs"
            >
              {renderMainCoverPhoto('w-full h-full')}
            </div>
          </div>

          {renderPressCropMarks()}

          <div
            style={{ borderColor: borderRule, color: textSecondary }}
            className="pt-2.5 border-t flex items-center justify-between text-[10px] tracking-wide"
          >
            <span className="truncate">{cities || '서울 · 부산 · 대전'}</span>
            <span className="shrink-0">{page.totalPhotos} PHOTOS</span>
          </div>
        </div>
      );
    }

    // 디자인 3 (기존 호환): 스위스 그리드 (Swiss Grid)
    if (coverLayout === 'swiss-grid') {
      return (
        <div
          style={{ backgroundColor: coverBgColor, color: textPrimary }}
          className={`w-full h-full flex flex-col justify-between p-6 sm:p-8 relative select-none ${spineClass}`}
        >
          <div
            style={{ borderColor: borderStrong }}
            className="grid grid-cols-12 border-t-2 border-b py-2 text-[10px] tracking-wider font-medium"
          >
            <div className="col-span-6 truncate pr-2">{topLeftText}</div>
            <div
              style={{ color: textSecondary }}
              className="col-span-6 text-right truncate pl-2"
            >
              {topRightText}
            </div>
          </div>

          <div
            style={{ borderColor: borderRule }}
            className="grid grid-cols-12 gap-3 py-4 border-b items-end"
          >
            <div className="col-span-4">
              <div className="font-mono-meta text-2xl sm:text-3xl font-bold tracking-tighter leading-none">
                {yearNumber}
              </div>
              <div
                style={{ color: textMuted }}
                className="text-[9px] uppercase tracking-widest mt-1"
              >
                ARCHIVE NO. 01
              </div>
            </div>
            <div className="col-span-8 text-right">
              <h1 className="font-editorial-ko text-lg sm:text-2xl font-bold tracking-tight leading-snug">
                {displayFamilyTitle}
              </h1>
              <p
                style={{ color: textSecondary }}
                className="text-xs mt-1 font-editorial-ko"
              >
                {displayKoreanTitle}
              </p>
            </div>
          </div>

          <div className="my-3 flex-1 min-h-0 flex flex-col">
            <div className="flex-1 min-h-[180px] grid grid-cols-12 gap-3">
              <div
                style={{ color: textSecondary }}
                className="col-span-4 flex flex-col justify-between text-[10px] leading-relaxed py-1"
              >
                <p className="font-editorial-ko line-clamp-4">{displaySubtitle}</p>
                <div className="space-y-0.5 pt-2">
                  <div
                    style={{ color: textMuted }}
                    className="text-[9px] uppercase tracking-wider"
                  >
                    CITIES
                  </div>
                  <div className="font-medium text-[10px]">
                    {cities || '서울 · 부산 · 대전'}
                  </div>
                </div>
              </div>
              <div
                style={{ borderColor: borderRule }}
                className="col-span-8 h-full overflow-hidden border relative"
              >
                {renderMainCoverPhoto('w-full h-full')}
              </div>
            </div>
          </div>

          {renderPressCropMarks()}

          <div
            style={{ borderColor: borderStrong, color: textSecondary }}
            className="pt-2.5 border-t flex items-center justify-between text-[10px]"
          >
            <span className="truncate">
              {members.map((m) => m.name).join(' · ')}
            </span>
            <span className="font-mono-meta shrink-0">P. {page.totalPhotos}</span>
          </div>
        </div>
      );
    }

    // 디자인 4 (기존 호환): 북클로드 단행본 (Minimal Book)
    if (coverLayout === 'minimal-book') {
      return (
        <div
          style={{ backgroundColor: coverBgColor, color: textPrimary }}
          className={`w-full h-full p-5 sm:p-7 relative select-none ${spineClass}`}
        >
          <div
            style={{ borderColor: borderStrong }}
            className="w-full h-full border p-5 sm:p-6 flex flex-col justify-between"
          >
            <div
              style={{ color: textSecondary }}
              className="flex items-center justify-between text-[10px] tracking-[0.14em] uppercase"
            >
              <span className="truncate max-w-[48%]">{topLeftText}</span>
              <span className="truncate max-w-[48%] text-right">{topRightText}</span>
            </div>

            <div className="my-auto py-4 flex flex-col items-center text-center space-y-4">
              <div className="space-y-1.5">
                <h1 className="font-editorial-ko text-xl sm:text-2xl font-bold tracking-tight leading-snug">
                  {displayFamilyTitle}
                </h1>
                <p
                  style={{ color: textSecondary }}
                  className="font-editorial-ko text-xs sm:text-sm"
                >
                  {displayKoreanTitle}
                </p>
              </div>

              <div
                style={{ borderColor: borderRule }}
                className="w-[74%] aspect-[4/3] overflow-hidden border p-1.5"
              >
                {renderMainCoverPhoto('w-full h-full')}
              </div>

              {displaySubtitle && (
                <p
                  style={{ color: textSecondary }}
                  className="text-[11px] font-editorial-ko max-w-[220px] leading-relaxed"
                >
                  {displaySubtitle}
                </p>
              )}
            </div>

            {renderPressCropMarks()}

            <div
              style={{ color: textMuted }}
              className="text-center text-[10px] tracking-[0.16em] uppercase"
            >
              {cities || 'FAMILY EDITION'}
            </div>
          </div>
        </div>
      );
    }

    // 디자인 8 (기본): 클래식 화보집형 (Classic Editorial)
    return (
      <div
        style={{ backgroundColor: coverBgColor, color: textPrimary }}
        className={`w-full h-full flex flex-col justify-between p-6 sm:p-9 relative select-none ${spineClass}`}
      >
        <div>
          <div
            style={{ borderColor: borderStrong, color: textSecondary }}
            className="flex items-start justify-between gap-2 text-[10px] tracking-[0.08em] font-medium pb-2.5 border-b"
          >
            <span
              style={scaleStyle('coverHeaderLeft', 10)}
              className="whitespace-pre-line"
            >
              {topLeftText}
            </span>
            <span
              style={scaleStyle('coverHeaderRight', 10)}
              className="whitespace-pre-line text-right shrink-0"
            >
              {topRightText}
            </span>
          </div>

          <div className="mt-4 sm:mt-5">
            <h1
              style={scaleStyle('coverTitle', 26)}
              className="font-editorial-ko text-2xl sm:text-3xl font-bold tracking-tight leading-snug whitespace-pre-line"
            >
              {displayFamilyTitle}
            </h1>
            <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
              <h2
                style={scaleStyle('coverSubTitle', 15, { color: textSecondary })}
                className="font-editorial-ko text-sm sm:text-base font-medium tracking-tight whitespace-pre-line"
              >
                {displayKoreanTitle}
              </h2>
              <span
                style={{ color: textMuted }}
                className="text-[11px] font-medium"
              >
                {cities || '서울 · 부산 · 대전'}
              </span>
            </div>
          </div>
        </div>

        <div className="my-4 flex-1 min-h-0 flex flex-col">
          <div
            style={{ borderColor: borderRule }}
            className="relative flex-1 min-h-[190px] overflow-hidden border"
          >
            {renderMainCoverPhoto('w-full h-full')}
          </div>
          {displaySubtitle && (
            <p
              style={scaleStyle('coverDesc', 12, { color: textSecondary })}
              className="mt-2.5 text-xs font-editorial-ko leading-relaxed whitespace-pre-line"
            >
              {displaySubtitle}
            </p>
          )}
        </div>

        {renderPressCropMarks()}
        <div
          style={{ borderColor: borderStrong, color: textSecondary }}
          className="pt-2.5 border-t flex items-center justify-between text-[11px]"
        >
          <div className="truncate pr-2">
            {members.map((m) => m.name).join(' · ')}
          </div>
          <span
            style={{ color: textMuted }}
            className="text-[10px] font-medium shrink-0"
          >
            {yearNumber} EDITION
          </span>
        </div>
      </div>
    );
  }

  // 2. PROLOGUE & PERIOD-SPECIFIC FEATURE PAGE (여행·월간·반기·연간 맞춤 구성)
  if (page.type === 'prologue') {
    const periodType = bookSettings.periodType || 'annual';

    // (2-A) 여행 기간: 일차별 동선 타임라인 & 베스트 단체컷
    if (periodType === 'trip') {
      return (
        <div
          className={`w-full h-full flex flex-col p-7 sm:p-10 relative ${paperClass} ${spineClass}`}
        >
          {renderRunningHeader(
            '여행 기간 화보집 · 일차별 동선 타임라인',
            `${bookSettings.startDate || ''} ~ ${bookSettings.endDate || ''}`
          )}

          <div className="my-1">
            <span className="text-xs font-bold text-[#8C5A3C]">
              여행지 타이틀 & 일차별 동선 타임라인
            </span>
            <h2 className="mt-1 font-editorial-ko text-xl sm:text-2xl font-bold text-[#141413] leading-snug">
              {bookSettings.tripDestinationTitle ||
                '온 가족이 함께 떠난 특별한 여행의 발자취'}
            </h2>
            <p className="mt-1.5 font-editorial-ko text-xs sm:text-sm text-[#4A4944] leading-relaxed">
              시작일부터 종료일까지 일차별 이동 동선과 베스트 가족 단체컷을 한눈에 정리했습니다.
            </p>
          </div>

          {/* 일차별 동선 타임라인 리스트 */}
          <div className="my-3 flex-1 min-h-0 overflow-y-auto space-y-2.5 pr-1">
            <div className="text-xs font-bold text-[#141413] pb-1 border-b border-[#141413]/15 flex items-center justify-between">
              <span>일차별 동선 타임라인 (총 {page.dayTimeline?.length || 1}일 일정)</span>
              <span className="text-[#8C5A3C]">총 {page.totalPhotos}장 수록</span>
            </div>
            {(page.dayTimeline || []).map((day) => (
              <div
                key={day.dayNumber}
                className="p-2.5 rounded-lg bg-[#FAF9F6] border border-[#141413]/15 flex items-center gap-3"
              >
                <div className="w-14 h-14 rounded-md overflow-hidden bg-[#E6E4DD] shrink-0 border border-[#141413]/10">
                  {day.highlightPhoto && (
                    <img
                      src={day.highlightPhoto.url}
                      alt=""
                      crossOrigin="anonymous"
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded-xs bg-[#141413] text-amber-300 text-[10px] font-bold">
                      제{day.dayNumber}일차 · {day.formattedDate}
                    </span>
                    <span className="text-[11px] font-bold text-[#8C5A3C]">
                      사진 {day.photoCount}장
                    </span>
                  </div>
                  <div className="mt-1 text-xs font-bold text-[#141413] truncate">
                    동선: {day.locations.join(' → ')}
                  </div>
                  <p className="text-[11px] text-[#5A5852] truncate">{day.summaryCaption}</p>
                </div>
              </div>
            ))}
          </div>

          {renderRunningFooter()}
        </div>
      );
    }

    // (2-B) 월간 (해당월): 주차별 일상 하이라이트 편집 & 피드 주요 코멘트·댓글 발췌 수록
    if (periodType === 'month') {
      const targetMonth = bookSettings.selectedMonth || 5;
      return (
        <div
          className={`w-full h-full flex flex-col p-7 sm:p-10 relative ${paperClass} ${spineClass}`}
        >
          {renderRunningHeader(
            `${bookSettings.year || 2026}년 ${targetMonth}월호 · 주차별 하이라이트 & 댓글 발췌`,
            `월간 가족 성장·일상 기록`
          )}

          <div className="my-1">
            <span className="text-xs font-bold text-[#8C5A3C]">
              월간 가족 화보집 · 주차별 일상 하이라이트
            </span>
            <h2 className="mt-1 font-editorial-ko text-xl sm:text-2xl font-bold text-[#141413] leading-snug">
              {bookSettings.year || 2026}년 {targetMonth}월, 우리 가족 한 달간의 이야기
            </h2>
          </div>

          {/* 주차별 일상 하이라이트 */}
          <div className="my-3 py-2.5 border-y border-[#141413]/15 space-y-2">
            <div className="text-xs font-bold text-[#141413] flex items-center justify-between">
              <span>주차별 일상 하이라이트 편집 ({targetMonth}월 1주차 ~ 마지막 주차)</span>
              <span className="text-[#8C5A3C]">총 {page.totalPhotos}장</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(page.weeklyHighlights || []).map((wk) => (
                <div
                  key={wk.weekNumber}
                  className="p-2 rounded-lg bg-[#FAF9F6] border border-[#141413]/12 flex items-center gap-2.5"
                >
                  {wk.highlightPhoto && (
                    <img
                      src={wk.highlightPhoto.url}
                      alt=""
                      crossOrigin="anonymous"
                      className="w-11 h-11 rounded-xs object-cover shrink-0"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-[#141413]">
                      {targetMonth}월 {wk.weekNumber}주차 ({wk.photoCount}장)
                    </div>
                    <div className="text-[11px] text-[#5A5852] truncate">{wk.headline}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 피드 주요 코멘트·댓글 발췌 수록 */}
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="text-xs font-bold text-[#8C5A3C] mb-2">
              💬 이달의 피드 주요 코멘트 · 가족 댓글 발췌 수록
            </div>
            <div className="space-y-1.5 overflow-y-auto pr-1">
              {(page.excerptedComments || []).map((c) => (
                <div
                  key={c.id}
                  className="p-2 rounded-lg bg-[#F9EFE6]/70 border border-[#8C5A3C]/20 text-xs"
                >
                  <div className="flex items-center justify-between text-[11px] font-bold text-[#8C5A3C]">
                    <span>
                      {c.authorName} {c.authorCity ? `(${c.authorCity})` : ''}
                    </span>
                    <span className="text-[#71706B]">{c.dateStr}</span>
                  </div>
                  <p className="mt-0.5 font-editorial-ko text-[#141413] line-clamp-1">
                    “{c.text}”
                  </p>
                </div>
              ))}
            </div>
          </div>

          {renderRunningFooter()}
        </div>
      );
    }

    // (2-C) 반기 (상반기 1~6월 / 하반기 7~12월): 계절감 중심 챕터 구분 & 월별 대표 사진 6칸 그리드 레이아웃
    if (periodType === 'half') {
      const isSecond = bookSettings.halfYear === 'second';
      return (
        <div
          className={`w-full h-full flex flex-col p-7 sm:p-10 relative ${paperClass} ${spineClass}`}
        >
          {renderRunningHeader(
            `${bookSettings.year || 2026}년 ${
              isSecond ? '하반기(7~12월)' : '상반기(1~6월)'
            } 결산 화보집`,
            '계절감 챕터 & 월별 대표 사진 그리드'
          )}

          <div className="my-1">
            <span className="text-xs font-bold text-[#8C5A3C]">
              계절감 중심의 챕터 구분 · 월별 대표 사진 그리드 레이아웃
            </span>
            <h2 className="mt-1 font-editorial-ko text-xl sm:text-2xl font-bold text-[#141413] leading-snug">
              {isSecond
                ? '한여름 바다부터 깊어가는 가을·겨울까지, 하반기 6개월의 기록'
                : '새해 첫 빛과 따스한 봄꽃, 초여름 바람까지 상반기 6개월의 기록'}
            </h2>
          </div>

          {/* 계절 챕터 배지 */}
          <div className="my-2 grid grid-cols-2 gap-2">
            <div className="p-2.5 rounded-lg bg-[#F9EFE6] border border-[#8C5A3C]/25 text-xs">
              <div className="font-bold text-[#8C5A3C]">
                {isSecond ? 'CHAPTER 01 · 여름 챕터 (7~8월)' : 'CHAPTER 01 · 겨울·초봄 챕터 (1~3월)'}
              </div>
              <div className="text-[11px] text-[#4A4944] mt-0.5">
                {isSecond
                  ? '장마 너머 반짝이는 바다와 여름 휴가'
                  : '새해 인사와 남쪽에서 시작된 봄소식'}
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-[#F3F1EC] border border-[#141413]/15 text-xs">
              <div className="font-bold text-[#141413]">
                {isSecond
                  ? 'CHAPTER 02 · 가을·겨울 챕터 (9~12월)'
                  : 'CHAPTER 02 · 봄·초여름 챕터 (4~6월)'}
              </div>
              <div className="text-[11px] text-[#4A4944] mt-0.5">
                {isSecond
                  ? '깊어가는 단풍 산책과 연말 가족 모임'
                  : '흩날리는 벚꽃과 초록이 짙어지는 날들'}
              </div>
            </div>
          </div>

          {/* 월별 대표 사진 6칸 그리드 레이아웃 */}
          <div className="flex-1 min-h-0 flex flex-col my-1">
            <div className="text-xs font-bold text-[#141413] mb-1.5 flex items-center justify-between">
              <span>월별 대표 사진 그리드 레이아웃 ({isSecond ? '7월 ~ 12월' : '1월 ~ 6월'})</span>
              <span className="text-[#8C5A3C]">총 {page.totalPhotos}장 수록</span>
            </div>
            <div className="flex-1 min-h-0 grid grid-cols-3 grid-rows-2 gap-2">
              {(page.monthlyRepGrid || []).map((item) => (
                <div
                  key={item.month}
                  className="relative rounded-md overflow-hidden bg-[#E6E4DD] border border-[#141413]/12 flex flex-col"
                >
                  {item.repPhoto ? (
                    <img
                      src={item.repPhoto.url}
                      alt=""
                      crossOrigin="anonymous"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[11px] text-[#71706B]">
                      {item.month}월
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/45 to-transparent p-1.5 text-white flex items-center justify-between text-[10px]">
                    <span className="font-bold">
                      {item.month}월 ({item.meta?.seasonKo})
                    </span>
                    <span className="text-amber-300 font-bold">{item.photoCount}장</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {renderRunningFooter()}
        </div>
      );
    }

    // (2-D) 연간 (특정 연도 전체 1년): 1월~12월 하이라이트 글귀 목차(1열) 및 참여 가족 명단
    const monthlyHighlights = bookSettings.monthlyHighlights || {};
    const tocHeaderLeft =
      bookSettings.tocHeaderLeft !== undefined
        ? bookSettings.tocHeaderLeft
        : '우리 가족 사진첩 목차 · 1월~12월 하이라이트';
    const tocHeaderRight =
      bookSettings.tocHeaderRight !== undefined
        ? bookSettings.tocHeaderRight
        : `${bookSettings.year || 2026}년 연간 가족사`;
    const tocSubTitle =
      bookSettings.tocSubTitle !== undefined
        ? bookSettings.tocSubTitle
        : '연간 가족사 화보집 · 사계절 목차';
    const tocTitle =
      bookSettings.tocTitle !== undefined
        ? bookSettings.tocTitle
        : '멀리 떨어져 있어도 같은 계절을 건너는 우리들의 기록';
    const tocDescription =
      bookSettings.annualReviewNote !== undefined
        ? bookSettings.annualReviewNote
        : bookSettings.epilogueNote ||
          '각자의 도시에서 매달 사진과 안부를 나누며 함께 걸어온 2026년 우리 가족의 사계절 기록입니다.';

    return (
      <div
        className={`w-full h-full flex flex-col justify-between p-6 relative overflow-hidden ${paperClass} ${spineClass}`}
      >
        <div className="shrink-0">
          {renderRunningHeader(
            tocHeaderLeft,
            tocHeaderRight,
            'tocHeaderLeft',
            'tocHeaderRight'
          )}

          <div className="mb-1">
            {tocSubTitle && (
              <span
                style={scaleStyle('tocSubTitle', 10.5)}
                className="text-[10.5px] font-bold text-[#8C5A3C] whitespace-pre-line block leading-tight"
              >
                {tocSubTitle}
              </span>
            )}
            {tocTitle && (
              <h2
                style={scaleStyle('tocTitle', 18)}
                className="mt-0.5 font-editorial-ko text-lg font-bold text-[#141413] leading-snug whitespace-pre-line"
              >
                {tocTitle}
              </h2>
            )}
            {tocDescription && (
              <p
                style={scaleStyle('tocDesc', 11)}
                className="mt-0.5 font-editorial-ko text-[11px] text-[#4A4944] leading-snug whitespace-pre-line"
              >
                {tocDescription}
              </p>
            )}
          </div>
        </div>

        {/* 1월 ~ 12월 하이라이트 글귀 목차 (1열 구성 · 화면 높이에 자동 맞춤) */}
        <div className="my-1 py-1.5 border-y border-[#141413]/12 flex-1 min-h-0 overflow-hidden flex flex-col">
          <div className="shrink-0 flex items-center justify-between mb-1">
            <span className="text-[10.5px] font-bold text-[#8C5A3C]">
              1월 ~ 12월 이달의 하이라이트
            </span>
            {!isPrint && onUpdateMonthlyHighlight && (
              <span className="text-[9.5px] text-[#8A442B]">
                글귀를 눌러 바로 수정할 수 있습니다
              </span>
            )}
          </div>

          <div className="flex-1 min-h-0 grid grid-rows-12 divide-y divide-[#141413]/8">
            {Array.from({ length: 12 }, (_, idx) => idx + 1).map((m) => {
              const phrase =
                monthlyHighlights[m] !== undefined
                  ? monthlyHighlights[m]
                  : DEFAULT_MONTHLY_HIGHLIGHTS[m];

              return (
                <div
                  key={m}
                  className="flex items-center gap-2.5 min-h-0 overflow-hidden"
                >
                  <span className="font-mono-meta text-[10.5px] font-bold text-[#B64E2E] shrink-0 w-8">
                    {String(m).padStart(2, '0')}월
                  </span>
                  {!isPrint && onUpdateMonthlyHighlight ? (
                    <input
                      type="text"
                      value={phrase}
                      onChange={(e) => onUpdateMonthlyHighlight(m, e.target.value)}
                      placeholder={`${m}월 하이라이트 글귀 입력`}
                      style={scaleStyle('tocHighlights', 11)}
                      className="w-full bg-transparent font-editorial-ko text-[11px] text-[#141413] focus:outline-none focus:bg-[#F2EDE3]/70 px-1 rounded-xs leading-tight truncate"
                    />
                  ) : (
                    <span
                      style={scaleStyle('tocHighlights', 11)}
                      className="font-editorial-ko text-[11px] text-[#141413] truncate leading-tight"
                    >
                      {phrase || DEFAULT_MONTHLY_HIGHLIGHTS[m]}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 참여 가족 명단 (하단 고정 영역 · 하이라이트와 절대 겹치지 않음) */}
        <div className="shrink-0 pt-1">
          <div className="text-[10.5px] font-bold text-[#5A5852] mb-1">
            참여 가족 명단
          </div>
          <div className="grid grid-cols-3 gap-x-3 gap-y-0.5 border-t border-[#141413]/10 pt-1">
            {page.memberStats.map((m, idx) => (
              <div key={m.id} className="flex items-center gap-1 text-[11px] truncate">
                <span className="font-bold text-[10px] text-[#8C5A3C] shrink-0">
                  {idx + 1}
                </span>
                <span className="font-bold text-[#141413] truncate">{m.name}</span>
                {m.city && (
                  <span className="text-[10px] text-[#5A5852] truncate">({m.city})</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="shrink-0">
          {renderRunningFooter()}
        </div>
      </div>
    );
  }

  // 3. MONTHLY CHAPTER DIVIDER PAGE (Optional)
  if (page.type === 'month-divider') {
    const { month, monthMeta, photoCount, highlightPhoto, monthMembers, monthLocations } = page;

    return (
      <div
        className={`w-full h-full flex flex-col p-7 sm:p-10 relative ${paperClass} ${spineClass}`}
      >
        {renderRunningHeader(`${month}월의 가족 이야기`, `${monthMeta.seasonKo} 계절 기록`)}

        <div className="mt-2 mb-4">
          <div className="flex items-baseline justify-between">
            <span className="font-editorial-ko text-4xl sm:text-5xl font-bold tracking-tight text-[#141413]">
              {month}월
            </span>
            <span className="font-editorial-ko text-lg sm:text-xl font-semibold text-[#8C5A3C]">
              {monthMeta.seasonKo}의 추억
            </span>
          </div>
          <h3 className="mt-1.5 font-editorial-ko text-lg sm:text-xl font-medium text-[#141413]">
            {monthMeta.ko}
          </h3>
          {monthLocations?.length > 0 && (
            <p className="mt-1 text-xs text-[#5A5852] flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#8C5A3C]" />
              <span>함께한 장소: {monthLocations.join(' · ')}</span>
            </p>
          )}
        </div>

        {highlightPhoto && (
          <div className="flex-1 min-h-0 flex flex-col my-2">
            <div
              onClick={() => onSelectPhoto && onSelectPhoto(highlightPhoto)}
              className="relative flex-1 min-h-[180px] overflow-hidden bg-[#E6E4DD] cursor-pointer group"
            >
              <img
                src={highlightPhoto.url}
                alt={highlightPhoto.caption}
                crossOrigin="anonymous"
                className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
              />
              <div className="absolute bottom-2.5 left-2.5 bg-[#141413]/80 text-[#FAF9F6] px-2.5 py-1 text-xs font-medium">
                이달의 대표 사진 · {formatEditorialDate(highlightPhoto.takenAt)}
              </div>
            </div>
          </div>
        )}

        <div className="mt-3 pt-3 border-t border-[#141413]/12 flex items-center justify-between text-xs text-[#5A5852]">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-[#71706B]">
              참여 가족:
            </span>
            {monthMembers?.map((m) => (
              <span
                key={m.id}
                className="px-2 py-0.5 text-xs rounded-xs font-semibold"
                style={{ backgroundColor: m.badgeBg, color: m.color }}
              >
                {m.name}
              </span>
            ))}
          </div>
          <span className="font-bold text-xs text-[#141413]">
            총 {photoCount}장의 추억
          </span>
        </div>

        {renderRunningFooter()}
      </div>
    );
  }

  // 4. COLOPHON / EPILOGUE PAGE
  if (page.type === 'colophon') {
    return (
      <div
        className={`w-full h-full flex flex-col justify-between p-7 sm:p-10 relative ${paperClass} ${spineClass}`}
      >
        {renderRunningHeader('맺음말 및 발간 기록', '사진첩 마지막 쪽')}

        <div className="my-auto py-8 text-center max-w-md mx-auto">
          <div className="w-10 h-[1px] bg-[#141413] mx-auto mb-6" />
          <p className="font-editorial-ko text-xl sm:text-2xl font-bold text-[#141413] leading-snug">
            “몸은 멀리 떨어져 있어도,<br />마음과 시간은 늘 하나입니다.”
          </p>
          <p className="mt-4 font-editorial-ko text-sm text-[#4A4944] leading-[1.9]">
            {bookSettings.epilogueNote}
          </p>
          <div className="w-10 h-[1px] bg-[#141413]/30 mx-auto my-6" />

          <div className="space-y-1.5 text-xs text-[#5A5852] font-medium">
            <div>발간 이름: {bookSettings.familyTitle || '박서 오피스 — 우리 가족 사진첩'}</div>
            <div>수록 기간: {page.dateRange}</div>
            <div>전체 수록 사진: 총 {page.totalPhotos}장</div>
            <div>연결된 가족 도시: {page.uniqueCities?.join(' · ')}</div>
          </div>
        </div>

        {renderRunningFooter()}
      </div>
    );
  }

  // 5. PHOTO SPREAD PAGE (Supports 1 to 12+ Photos per Page with Adaptive Monthly Mosaic!)
  const {
    photos = [],
    layoutTemplate,
    month,
    monthMeta,
    chunkIndex = 1,
    totalChunksInMonth = 1,
  } = page;

  const isMultiMosaic =
    bookSettings.layoutDensity !== 'editorial' || photos.length >= 5;

  // Sub-component for 1~4 Photo Pages (Large Editorial Frames + Number / Uploader / Location)
  const renderPhotoUnit = (photo, figIndex, options = {}) => {
    const member = getMember(photo.memberId);
    const { compactCaption = false, aspectClass = 'aspect-[4/3]', fillHeight = false } = options;
    const uploaderName = photo.memberName || member.name || '가족';
    const locationText = photo.location || member.city || '';

    return (
      <div key={photo.id} className={`flex flex-col ${fillHeight ? 'h-full min-h-0' : ''}`}>
        <FramePhotoItem
          photo={photo}
          isRepositionMode={isRepositionMode}
          isPrint={isPrint}
          onSelectPhoto={onSelectPhoto}
          onUpdatePhotoPosition={onUpdatePhotoPosition}
          className={`border border-[#141413]/8 ${
            fillHeight ? 'flex-1 min-h-[110px]' : aspectClass
          }`}
        >
          <span className="absolute bottom-1.5 right-2 text-white text-[11px] font-mono-meta font-bold tracking-wider drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)] pointer-events-none">
            {String(figIndex + 1).padStart(2, '0')}
          </span>
        </FramePhotoItem>

        <div className={compactCaption ? 'mt-1' : 'mt-1.5'}>
          <div className="flex items-center gap-1.5 text-[10px] text-[#2C2B29] truncate">
            <span className="font-mono-meta font-bold text-[#141413]">
              {String(figIndex + 1).padStart(2, '0')}
            </span>
            <span className="font-medium text-[#141413]">{uploaderName}</span>
            {locationText && (
              <>
                <span className="text-[#8C5A3C]">·</span>
                <span className="text-[#5A5852] truncate">{locationText}</span>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className={`w-full h-full flex flex-col p-5 sm:p-7 relative group/page ${paperClass} ${spineClass}`}
    >
      {/* Top Monthly / Period Chapter & Layout Header */}
      <div className="pb-2 mb-2.5 border-b border-[#141413]">
        <div className="flex items-center justify-between text-[11px] font-medium text-[#71706B]">
          <span>
            {page.sectionBadge ||
              `${month}월의 가족 추억 · ${monthMeta?.seasonKo || '사계절'}`}
            {totalChunksInMonth > 1 ? ` (${chunkIndex}/${totalChunksInMonth}쪽)` : ''}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-[#8C5A3C] font-bold">사진 {photos.length}장</span>
            {!isPrint && onToggleRepositionMode && (
              <button
                type="button"
                onClick={onToggleRepositionMode}
                title="프레임 안에서 사진을 드래그해 위치를 맞추는 모드를 켜거나 끕니다"
                className={`flex items-center gap-1 px-2.5 py-0.5 rounded-xs text-[10px] transition-colors cursor-pointer ${
                  isRepositionMode
                    ? 'bg-amber-400 text-[#141413] font-bold'
                    : 'bg-[#141413]/8 hover:bg-[#141413] hover:text-[#FAF9F6] text-[#141413]'
                }`}
              >
                <Move className="w-3 h-3" />
                <span>{isRepositionMode ? '위치조절 완료' : '사진 위치 이동'}</span>
              </button>
            )}
            {!isPrint && onCycleVariant && (
              <button
                type="button"
                onClick={() => onCycleVariant(page.id)}
                title="이 페이지의 사진 배치 모양을 다른 구성으로 바꿉니다"
                className="flex items-center gap-1 px-2.5 py-0.5 rounded-xs bg-[#141413]/8 hover:bg-[#141413] hover:text-[#FAF9F6] text-[#141413] text-[10px] transition-colors cursor-pointer"
              >
                <Shuffle className="w-3 h-3" />
                <span>배치 모양 바꾸기</span>
              </button>
            )}
          </div>
        </div>

        <div className="mt-1 flex items-baseline justify-between gap-2">
          <div className="flex items-baseline gap-2 min-w-0">
            <span className="font-editorial-ko text-xl sm:text-2xl font-bold tracking-tight text-[#141413] shrink-0">
              {page.sectionHeaderTitle || `${month}월`}
            </span>
            <span className="font-editorial-ko text-xs sm:text-sm text-[#4A4944] truncate">
              — {page.sectionSubTitle || monthMeta?.ko}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 flex flex-col justify-between">
        {/* === CASE A: 5 TO 12 PHOTOS ON A SINGLE PAGE (ADAPTIVE BENTO MOSAIC + FOOTNOTE INDEX) === */}
        {isMultiMosaic && (
          <div className="flex-1 min-h-0 flex flex-col gap-2.5">
            {/* Adaptive Multi-Row Photo Mosaic (Fills 100% of every row for any photo count 5..12) */}
            <div className="flex-1 min-h-0 flex flex-col gap-1.5">
              {buildAdaptiveRows(photos, layoutTemplate).map((row, rowIdx) => {
                // Give the first row slightly taller weight in bento-mosaic mode when it has 2-3 featured photos
                const isLeadRow =
                  layoutTemplate === 'bento-mosaic' && rowIdx === 0 && row.length <= 3;

                return (
                  <div
                    key={rowIdx}
                    className={`flex gap-1.5 min-h-0 ${
                      isLeadRow ? 'flex-[1.25]' : 'flex-1'
                    }`}
                  >
                    {row.map(({ photo, globalIndex }, cellIdx) => {
                      const isFeaturedCell =
                        layoutTemplate === 'bento-mosaic' &&
                        rowIdx === 0 &&
                        cellIdx === 0 &&
                        row.length <= 3;

                      return (
                        <FramePhotoItem
                          key={photo.id}
                          photo={photo}
                          isRepositionMode={isRepositionMode}
                          isPrint={isPrint}
                          onSelectPhoto={onSelectPhoto}
                          onUpdatePhotoPosition={onUpdatePhotoPosition}
                          className={`border border-[#141413]/10 ${
                            isFeaturedCell ? 'flex-[1.45]' : 'flex-1'
                          }`}
                        >
                          {/* 사진 오른쪽 아래에 박스 없이 숫자만 표시 */}
                          <span className="absolute bottom-1 right-1.5 text-white text-[10px] font-mono-meta font-bold tracking-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)] pointer-events-none">
                            {String(globalIndex + 1).padStart(2, '0')}
                          </span>
                        </FramePhotoItem>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* 사진 아래 목록: 번호 · 올린 사람 · 위치만 표시 */}
            <div className="pt-2 border-t border-[#141413]/12 grid grid-cols-2 gap-x-3 gap-y-1">
              {photos.map((p, idx) => {
                const m = getMember(p.memberId);
                const uploaderName = (p.memberName || m.name || '가족').split(' ')[0];
                const locationText = p.location || m.city || '';

                return (
                  <div
                    key={p.id}
                    onClick={() => onSelectPhoto && onSelectPhoto(p)}
                    className="text-[10px] leading-tight text-[#2C2B29] truncate cursor-pointer hover:text-[#8C5A3C] flex items-center gap-1.5"
                  >
                    <span className="font-mono-meta font-bold text-[#141413] shrink-0">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span className="font-medium text-[#141413] shrink-0">
                      {uploaderName}
                    </span>
                    {locationText && (
                      <>
                        <span className="text-[#8C5A3C] shrink-0">·</span>
                        <span className="text-[#5A5852] truncate">{locationText}</span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* === CASE B: 1 TO 4 PHOTOS ON A PAGE === */}
        {!isMultiMosaic && photos.length === 1 && (
          <div className="flex-1 min-h-0 flex flex-col">
            {renderPhotoUnit(photos[0], 0, { fillHeight: true })}
          </div>
        )}

        {!isMultiMosaic && photos.length === 2 && (
          <div className="grid grid-cols-2 gap-3.5 h-full items-stretch">
            {renderPhotoUnit(photos[0], 0, { fillHeight: true })}
            {renderPhotoUnit(photos[1], 1, { fillHeight: true })}
          </div>
        )}

        {!isMultiMosaic && photos.length === 3 && (
          <div className="grid grid-cols-12 gap-3 h-full">
            <div className="col-span-7 h-full min-h-0 flex flex-col">
              {renderPhotoUnit(photos[0], 0, { fillHeight: true })}
            </div>
            <div className="col-span-5 h-full min-h-0 flex flex-col gap-3 justify-between">
              <div className="flex-1 min-h-0">
                {renderPhotoUnit(photos[1], 1, { fillHeight: true, compactCaption: true })}
              </div>
              <div className="flex-1 min-h-0">
                {renderPhotoUnit(photos[2], 2, { fillHeight: true, compactCaption: true })}
              </div>
            </div>
          </div>
        )}

        {!isMultiMosaic && photos.length === 4 && (
          <div className="grid grid-cols-2 grid-rows-2 gap-3 h-full">
            {photos.map((p, idx) => (
              <div key={p.id} className="min-h-0 flex flex-col">
                {renderPhotoUnit(p, idx, { fillHeight: true, compactCaption: true })}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 월간 화보집 전용: 피드 주요 코멘트·댓글 발췌 수록 바 */}
      {page.pageComments && page.pageComments.length > 0 && (
        <div className="mt-2 px-2.5 py-1.5 rounded-md bg-[#F9EFE6]/85 border border-[#8C5A3C]/20 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-[#2C2B29]">
          <span className="font-bold text-[#8C5A3C]">💬 피드 댓글 발췌:</span>
          {page.pageComments.map((c, idx) => (
            <span key={idx} className="truncate">
              <strong>{c.authorName}</strong> “{c.text}”
            </span>
          ))}
        </div>
      )}

      {renderRunningFooter()}
    </div>
  );
}
