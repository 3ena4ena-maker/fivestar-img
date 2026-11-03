import React from 'react';
import { MapPin, Shuffle, Move } from 'lucide-react';
import { formatEditorialDate, formatKoreanDate } from '../utils/bookLayoutEngine';
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

export default function BookPageRenderer({
  page,
  members = [],
  bookSettings = {},
  side = 'single', // 'left' | 'right' | 'single'
  onSelectPhoto,
  onCycleVariant,
  onUpdatePhotoPosition,
  isRepositionMode = false,
  onToggleRepositionMode,
  isPrint = false,
}) {
  if (!page) return null;

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

  const renderRunningHeader = (leftLabel, rightLabel) => (
    <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#141413]/12 text-[10px] tracking-[0.2em] uppercase text-[#71706B] font-mono-meta">
      <span>{leftLabel}</span>
      <span>{rightLabel}</span>
    </div>
  );

  const renderRunningFooter = () => (
    <div className="mt-auto pt-2.5 border-t border-[#141413]/10 flex items-center justify-between text-[10px] tracking-[0.18em] text-[#71706B] font-mono-meta">
      <span>{bookSettings.koreanTitle || '각자의 계절, 하나의 시간'}</span>
      <span className="font-semibold text-[#141413]">
        P. {String(page.pageNumber).padStart(2, '0')}
      </span>
    </div>
  );

  // 1. COVER PAGE
  if (page.type === 'cover') {
    const coverImg =
      bookSettings.coverPhotoUrl ||
      page.coverPhoto?.url ||
      'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=1400&q=85';

    const cities = [...new Set(members.map((m) => m.city).filter(Boolean))].join(' · ');

    return (
      <div
        className={`w-full h-full flex flex-col justify-between p-7 sm:p-10 relative select-none ${paperClass} ${spineClass}`}
      >
        <div>
          <div className="flex items-center justify-between text-[10px] tracking-[0.25em] uppercase font-mono-meta text-[#5A5852] pb-3 border-b border-[#141413]">
            <span>{bookSettings.volumeLabel || 'VOL. 01 — 2026 ANNUAL EDITION'}</span>
            <span>ARCHIVE {bookSettings.year || 2026}</span>
          </div>

          <div className="mt-5 sm:mt-6">
            <h1 className="font-editorial-en text-3xl sm:text-4xl lg:text-[40px] font-normal tracking-[0.04em] leading-[1.06] text-[#141413] uppercase">
              {bookSettings.title || 'OUR YEAR, APART YET TOGETHER'}
            </h1>
            <div className="mt-2.5 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-editorial-ko text-base sm:text-lg font-medium text-[#2C2B29] tracking-tight">
                {bookSettings.koreanTitle || '각자의 계절, 하나의 시간'}
              </h2>
              <span className="text-[11px] font-mono-meta tracking-[0.15em] text-[#71706B]">
                {cities || 'GANGNEUNG · SEOUL · BUSAN · JEJU'}
              </span>
            </div>
          </div>
        </div>

        <div className="my-4 flex-1 min-h-0 flex flex-col">
          <div className="relative flex-1 min-h-[200px] overflow-hidden bg-[#E6E4DD] border border-[#141413]/10">
            <img
              src={coverImg}
              alt="Book Cover"
              crossOrigin="anonymous"
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-3 right-3 bg-[#FAF9F6]/90 backdrop-blur-xs px-2.5 py-1 text-[10px] font-mono-meta tracking-widest uppercase text-[#141413]">
              {page.totalPhotos} MOMENTS ARCHIVED
            </div>
          </div>
          <p className="mt-2.5 text-xs text-[#5A5852] font-editorial-ko leading-relaxed line-clamp-2">
            {bookSettings.subtitle}
          </p>
        </div>

        <div className="pt-3 border-t border-[#141413] flex items-center justify-between text-[11px]">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[#2C2B29]">
            <span className="font-mono-meta text-[10px] uppercase tracking-widest text-[#71706B]">
              FAMILY:
            </span>
            {members.map((m, idx) => (
              <span key={m.id} className="font-medium">
                {m.name}({m.city}){idx < members.length - 1 ? ' ·' : ''}
              </span>
            ))}
          </div>
          <span className="font-mono-meta text-[10px] tracking-[0.2em] uppercase text-[#71706B]">
            {bookSettings.publisherName || 'FAMILY PRESS'}
          </span>
        </div>
      </div>
    );
  }

  // 2. PROLOGUE & YEARLY FAMILY INDEX PAGE
  if (page.type === 'prologue') {
    const maxMonthCount = Math.max(1, ...page.monthlyCounts.map((m) => m.count));

    return (
      <div
        className={`w-full h-full flex flex-col p-7 sm:p-10 relative ${paperClass} ${spineClass}`}
      >
        {renderRunningHeader('PROLOGUE & INDEX', `${bookSettings.year || 2026} FAMILY CHRONICLE`)}

        <div className="my-1.5">
          <span className="text-[10px] font-mono-meta uppercase tracking-[0.24em] text-[#8C5A3C]">
            EDITORIAL FOREWORD
          </span>
          <h2 className="mt-1 font-editorial-ko text-xl sm:text-2xl font-medium text-[#141413] leading-snug">
            멀리 떨어져 있어도 같은 계절을 건너는 우리들의 기록
          </h2>
          <p className="mt-2.5 font-editorial-ko text-xs sm:text-[13px] text-[#4A4944] leading-[1.8]">
            {bookSettings.epilogueNote ||
              '각자의 자리에서 보낸 사계절의 사진들이 날짜를 따라 한 권의 책으로 모였습니다.'}
          </p>
        </div>

        <div className="my-4 py-3.5 border-y border-[#141413]/12">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[10px] font-mono-meta uppercase tracking-[0.2em] text-[#71706B]">
              MONTHLY ARCHIVE INDEX (01 — 12)
            </span>
            <span className="text-[11px] font-mono-meta text-[#141413]">
              TOTAL {page.totalPhotos} PHOTOS
            </span>
          </div>
          <div className="grid grid-cols-12 gap-1.5 items-end h-20 pt-2">
            {page.monthlyCounts.map(({ month, count }) => {
              const heightPct =
                count === 0 ? 8 : Math.max(22, Math.round((count / maxMonthCount) * 100));
              return (
                <div key={month} className="flex flex-col items-center gap-1 h-full justify-end">
                  <span className="text-[9px] font-mono-meta text-[#71706B]">
                    {count > 0 ? count : '·'}
                  </span>
                  <div className="w-full bg-[#E6E4DD] h-11 flex items-end overflow-hidden">
                    <div
                      style={{ height: `${heightPct}%` }}
                      className={`w-full transition-all ${
                        count > 0 ? 'bg-[#141413]' : 'bg-[#D5D2C8]'
                      }`}
                    />
                  </div>
                  <span className="text-[9px] font-mono-meta text-[#5A5852]">
                    {String(month).padStart(2, '0')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex-1">
          <div className="text-[10px] font-mono-meta uppercase tracking-[0.2em] text-[#71706B] mb-2">
            FAMILY AUTHORS & CONNECTED CITIES
          </div>
          <div className="divide-y divide-[#141413]/10 border-t border-b border-[#141413]/10">
            {page.memberStats.map((m, idx) => (
              <div key={m.id} className="py-2 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono-meta text-[10px] text-[#71706B]">0{idx + 1}</span>
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: m.color || '#141413' }}
                  />
                  <span className="font-medium text-[#141413]">{m.name}</span>
                  <span className="text-[11px] text-[#71706B]">
                    · {m.city} {m.role && m.role !== m.city ? `(${m.role})` : ''}
                  </span>
                </div>
                <span className="font-mono-meta text-[11px] text-[#2C2B29]">
                  {m.photoCount}장 기록
                </span>
              </div>
            ))}
          </div>
        </div>

        {renderRunningFooter()}
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
        {renderRunningHeader(`CHAPTER ${String(month).padStart(2, '0')}`, monthMeta.seasonKo)}

        <div className="mt-2 mb-4">
          <div className="flex items-baseline justify-between">
            <span className="font-editorial-en text-5xl sm:text-6xl font-light tracking-tight text-[#141413]">
              {String(month).padStart(2, '0')}
            </span>
            <span className="font-editorial-en text-2xl sm:text-3xl italic text-[#5A5852] tracking-wide">
              {monthMeta.en}
            </span>
          </div>
          <h3 className="mt-1.5 font-editorial-ko text-lg sm:text-xl font-medium text-[#141413]">
            {monthMeta.ko}
          </h3>
          {monthLocations?.length > 0 && (
            <p className="mt-1 text-[11px] text-[#71706B] flex items-center gap-1.5">
              <MapPin className="w-3 h-3 text-[#8C5A3C]" />
              <span>{monthLocations.join(' · ')}</span>
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
              <div className="absolute bottom-2.5 left-2.5 bg-[#141413]/75 text-[#FAF9F6] px-2 py-0.5 text-[10px] font-mono-meta">
                HIGHLIGHT · {formatEditorialDate(highlightPhoto.takenAt)}
              </div>
            </div>
          </div>
        )}

        <div className="mt-3 pt-3 border-t border-[#141413]/12 flex items-center justify-between text-xs text-[#5A5852]">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-mono-meta uppercase tracking-wider text-[#71706B]">
              WITH:
            </span>
            {monthMembers?.map((m) => (
              <span
                key={m.id}
                className="px-2 py-0.5 text-[11px] rounded-xs font-medium"
                style={{ backgroundColor: m.badgeBg, color: m.color }}
              >
                {m.name}
              </span>
            ))}
          </div>
          <span className="font-mono-meta text-[11px] text-[#141413]">
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
        {renderRunningHeader('EPILOGUE & COLOPHON', 'END OF VOLUME')}

        <div className="my-auto py-8 text-center max-w-md mx-auto">
          <div className="w-10 h-[1px] bg-[#141413] mx-auto mb-6" />
          <p className="font-editorial-en italic text-2xl sm:text-3xl text-[#141413]">
            “Apart in distance, together in time.”
          </p>
          <p className="mt-4 font-editorial-ko text-sm text-[#4A4944] leading-[1.9]">
            {bookSettings.epilogueNote}
          </p>
          <div className="w-10 h-[1px] bg-[#141413]/30 mx-auto my-6" />

          <div className="space-y-1.5 text-[11px] font-mono-meta text-[#71706B] tracking-wider uppercase">
            <div>PUBLISHED FOR THE {bookSettings.year || 2026} FAMILY ARCHIVE</div>
            <div>PERIOD: {page.dateRange}</div>
            <div>TOTAL ARCHIVED MOMENTS: {page.totalPhotos} PHOTOS</div>
            <div>CITIES CONNECTED: {page.uniqueCities?.join(' · ')}</div>
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

  const isMultiMosaic = photos.length >= 5;

  // Sub-component for 1~4 Photo Pages (Large Editorial Frames + Direct Caption)
  const renderPhotoUnit = (photo, figIndex, options = {}) => {
    const member = getMember(photo.memberId);
    const { compactCaption = false, aspectClass = 'aspect-[4/3]', fillHeight = false } = options;

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
          <div className="absolute top-1.5 left-1.5 bg-[#FAF9F6]/92 backdrop-blur-xs px-1.5 py-0.5 text-[9px] font-mono-meta tracking-wider text-[#141413] pointer-events-none">
            {String(figIndex + 1).padStart(2, '0')} · {formatEditorialDate(photo.takenAt).slice(5)}
          </div>
          {!isRepositionMode && (
            <div
              className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 text-[9px] font-medium rounded-xs shadow-xs pointer-events-none"
              style={{ backgroundColor: member.badgeBg, color: member.color }}
            >
              {member.name} · {member.city}
            </div>
          )}
        </FramePhotoItem>

        <div className={compactCaption ? 'mt-1' : 'mt-2'}>
          <div className="flex items-center justify-between gap-2 text-[10px] text-[#71706B]">
            <span className="font-mono-meta flex items-center gap-1 truncate">
              {photo.location && (
                <>
                  <MapPin className="w-2.5 h-2.5 text-[#8C5A3C] shrink-0" />
                  <span className="truncate text-[#2C2B29] font-medium">{photo.location}</span>
                </>
              )}
            </span>
          </div>
          {photo.caption && (
            <p
              className={`font-editorial-ko text-[#181715] leading-[1.5] ${
                compactCaption ? 'text-[10px] line-clamp-1 mt-0.5' : 'text-xs mt-0.5 line-clamp-2'
              }`}
            >
              {photo.caption}
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      className={`w-full h-full flex flex-col p-5 sm:p-7 relative group/page ${paperClass} ${spineClass}`}
    >
      {/* Top Monthly Chapter & Layout Header */}
      <div className="pb-2 mb-2.5 border-b border-[#141413]">
        <div className="flex items-center justify-between text-[9px] tracking-[0.18em] uppercase text-[#71706B] font-mono-meta">
          <span>
            CHAPTER {String(month).padStart(2, '0')} · {monthMeta?.seasonKo || 'ARCHIVE'}
            {totalChunksInMonth > 1 ? ` (${chunkIndex}/${totalChunksInMonth})` : ''}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-[#8C5A3C] font-semibold">{photos.length} PHOTOS</span>
            {!isPrint && onToggleRepositionMode && (
              <button
                type="button"
                onClick={onToggleRepositionMode}
                title="프레임 안에서 사진을 드래그해 위치를 맞추는 모드를 켜거나 끕니다"
                className={`flex items-center gap-1 px-2 py-0.5 rounded-xs text-[9px] tracking-wider transition-colors cursor-pointer ${
                  isRepositionMode
                    ? 'bg-amber-400 text-[#141413] font-bold'
                    : 'bg-[#141413]/8 hover:bg-[#141413] hover:text-[#FAF9F6] text-[#141413]'
                }`}
              >
                <Move className="w-2.5 h-2.5" />
                <span>{isRepositionMode ? '위치조절 완료' : '사진 위치 이동'}</span>
              </button>
            )}
            {!isPrint && onCycleVariant && (
              <button
                type="button"
                onClick={() => onCycleVariant(page.id)}
                title="이 페이지의 사진 배치 스타일을 다른 레이아웃으로 전환합니다"
                className="flex items-center gap-1 px-2 py-0.5 rounded-xs bg-[#141413]/8 hover:bg-[#141413] hover:text-[#FAF9F6] text-[#141413] text-[9px] tracking-wider transition-colors cursor-pointer"
              >
                <Shuffle className="w-2.5 h-2.5" />
                <span>레이아웃 변환</span>
              </button>
            )}
          </div>
        </div>

        <div className="mt-1 flex items-baseline justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <span className="font-editorial-en text-xl sm:text-2xl font-semibold tracking-tight text-[#141413]">
              {String(month).padStart(2, '0')} {monthMeta?.en}
            </span>
            <span className="font-editorial-ko text-xs sm:text-sm text-[#4A4944] truncate">
              — {monthMeta?.ko}
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
                      const member = getMember(photo.memberId);
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
                          {/* Compact Number + Date Stamp */}
                          <div className="absolute top-1 left-1 bg-[#141413]/75 text-[#FAF9F6] px-1.5 py-0.2 text-[8px] font-mono-meta tracking-tight pointer-events-none">
                            {String(globalIndex + 1).padStart(2, '0')} ·{' '}
                            {formatEditorialDate(photo.takenAt).slice(5)}
                          </div>
                          {/* Compact Family Member + City Pill */}
                          {!isRepositionMode && (
                            <div
                              className="absolute bottom-1 right-1 px-1.5 py-0.2 text-[8px] font-semibold rounded-xs shadow-2xs pointer-events-none"
                              style={{ backgroundColor: member.badgeBg, color: member.color }}
                            >
                              {member.name.split(' ')[0]}·{member.city}
                            </div>
                          )}
                        </FramePhotoItem>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Bottom Magazine Caption & Date Index (Lists all 5..12 photos cleanly in 2 columns) */}
            <div className="pt-2 border-t border-[#141413]/12 grid grid-cols-2 gap-x-3 gap-y-1">
              {photos.map((p, idx) => {
                const m = getMember(p.memberId);
                return (
                  <div
                    key={p.id}
                    onClick={() => onSelectPhoto && onSelectPhoto(p)}
                    className="text-[9.5px] leading-tight text-[#2C2B29] truncate cursor-pointer hover:text-[#8C5A3C]"
                  >
                    <span className="font-mono-meta font-semibold text-[#141413] mr-1">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span className="text-[#71706B] mr-1">
                      [{m.name.split(' ')[0]}·{p.location || m.city}]
                    </span>
                    <span className="font-editorial-ko text-[#181715]">
                      {p.caption || formatKoreanDate(p.takenAt)}
                    </span>
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

      {renderRunningFooter()}
    </div>
  );
}
