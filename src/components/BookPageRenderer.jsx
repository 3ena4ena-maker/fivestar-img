import React from 'react';
import { MapPin, Camera, Sparkles, MessageSquareQuote, Shuffle } from 'lucide-react';
import { formatEditorialDate, formatKoreanDate } from '../utils/bookLayoutEngine';

export default function BookPageRenderer({
  page,
  members = [],
  bookSettings = {},
  side = 'single', // 'left' | 'right' | 'single'
  onSelectPhoto,
  onCycleVariant,
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

  // Running Header & Footer helper for interior pages
  const renderRunningHeader = (leftLabel, rightLabel) => (
    <div className="flex items-center justify-between pb-2.5 mb-4 border-b border-[#141413]/12 text-[10px] tracking-[0.2em] uppercase text-[#71706B] font-mono-meta">
      <span>{leftLabel}</span>
      <span>{rightLabel}</span>
    </div>
  );

  const renderRunningFooter = () => (
    <div className="mt-auto pt-3 border-t border-[#141413]/10 flex items-center justify-between text-[10px] tracking-[0.18em] text-[#71706B] font-mono-meta">
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
        {/* Top Magazine Issue Header */}
        <div>
          <div className="flex items-center justify-between text-[10px] tracking-[0.25em] uppercase font-mono-meta text-[#5A5852] pb-3 border-b border-[#141413]">
            <span>{bookSettings.volumeLabel || 'VOL. 01 — 2026 ANNUAL EDITION'}</span>
            <span>ARCHIVE {bookSettings.year || 2026}</span>
          </div>

          <div className="mt-5 sm:mt-7">
            <h1 className="font-editorial-en text-3xl sm:text-4xl lg:text-[42px] font-normal tracking-[0.04em] leading-[1.06] text-[#141413] uppercase">
              {bookSettings.title || 'OUR YEAR, APART YET TOGETHER'}
            </h1>
            <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-editorial-ko text-base sm:text-lg font-medium text-[#2C2B29] tracking-tight">
                {bookSettings.koreanTitle || '각자의 계절, 하나의 시간'}
              </h2>
              <span className="text-[11px] font-mono-meta tracking-[0.15em] text-[#71706B]">
                {cities || 'GANGNEUNG · SEOUL · BUSAN · JEJU'}
              </span>
            </div>
          </div>
        </div>

        {/* Center Hero Cover Image */}
        <div className="my-5 flex-1 min-h-0 flex flex-col">
          <div className="relative flex-1 min-h-[210px] overflow-hidden bg-[#E6E4DD] border border-[#141413]/10">
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
          <p className="mt-3 text-xs text-[#5A5852] font-editorial-ko leading-relaxed line-clamp-2">
            {bookSettings.subtitle}
          </p>
        </div>

        {/* Bottom Contributors Bar */}
        <div className="pt-3.5 border-t border-[#141413] flex items-center justify-between text-[11px]">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[#2C2B29]">
            <span className="font-mono-meta text-[10px] uppercase tracking-widest text-[#71706B]">
              CONTRIBUTORS:
            </span>
            {members.map((m, idx) => (
              <span key={m.id} className="font-medium">
                {m.name}
                {idx < members.length - 1 ? ' ·' : ''}
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

        <div className="my-2">
          <span className="text-[10px] font-mono-meta uppercase tracking-[0.24em] text-[#8C5A3C]">
            EDITORIAL FOREWORD
          </span>
          <h2 className="mt-1.5 font-editorial-ko text-xl sm:text-2xl font-medium text-[#141413] leading-snug">
            멀리 떨어져 있어도 같은 계절을 건너는 우리들의 기록
          </h2>
          <p className="mt-3 font-editorial-ko text-xs sm:text-[13px] text-[#4A4944] leading-[1.85]">
            {bookSettings.epilogueNote ||
              '각자의 자리에서 보낸 사계절의 사진들이 날짜를 따라 한 권의 책으로 모였습니다. 평범한 하루의 식탁과 퇴근길의 노을, 오랜만에 마주 앉은 웃음까지 모두가 우리가 함께 만든 일 년입니다.'}
          </p>
        </div>

        {/* 12 Months Distribution Chart */}
        <div className="my-5 py-4 border-y border-[#141413]/12">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-mono-meta uppercase tracking-[0.2em] text-[#71706B]">
              MONTHLY ARCHIVE INDEX (01 — 12)
            </span>
            <span className="text-[11px] font-mono-meta text-[#141413]">
              TOTAL {page.totalPhotos} PHOTOS
            </span>
          </div>
          <div className="grid grid-cols-12 gap-1.5 items-end h-20 pt-3">
            {page.monthlyCounts.map(({ month, count }) => {
              const heightPct = count === 0 ? 8 : Math.max(22, Math.round((count / maxMonthCount) * 100));
              return (
                <div key={month} className="flex flex-col items-center gap-1.5 h-full justify-end">
                  <span className="text-[9px] font-mono-meta text-[#71706B]">
                    {count > 0 ? count : '·'}
                  </span>
                  <div className="w-full bg-[#E6E4DD] h-12 flex items-end overflow-hidden">
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

        {/* Family Contributors Table */}
        <div className="flex-1">
          <div className="text-[10px] font-mono-meta uppercase tracking-[0.2em] text-[#71706B] mb-2.5">
            FAMILY AUTHORS & CITIES
          </div>
          <div className="divide-y divide-[#141413]/10 border-t border-b border-[#141413]/10">
            {page.memberStats.map((m, idx) => (
              <div key={m.id} className="py-2 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono-meta text-[10px] text-[#71706B]">
                    0{idx + 1}
                  </span>
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: m.color || '#141413' }}
                  />
                  <span className="font-medium text-[#141413]">{m.name}</span>
                  <span className="text-[11px] text-[#71706B]">· {m.role || m.city}</span>
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

  // 3. MONTHLY CHAPTER DIVIDER PAGE
  if (page.type === 'month-divider') {
    const { month, monthMeta, photoCount, highlightPhoto, monthMembers, monthLocations } = page;

    return (
      <div
        className={`w-full h-full flex flex-col p-7 sm:p-10 relative ${paperClass} ${spineClass}`}
      >
        {renderRunningHeader(
          `CHAPTER ${String(month).padStart(2, '0')}`,
          monthMeta.seasonKo
        )}

        <div className="mt-2 mb-5">
          <div className="flex items-baseline justify-between">
            <span className="font-editorial-en text-5xl sm:text-6xl font-light tracking-tight text-[#141413]">
              {String(month).padStart(2, '0')}
            </span>
            <span className="font-editorial-en text-2xl sm:text-3xl italic text-[#5A5852] tracking-wide">
              {monthMeta.en}
            </span>
          </div>
          <h3 className="mt-2 font-editorial-ko text-lg sm:text-xl font-medium text-[#141413]">
            {monthMeta.ko}
          </h3>
          {monthLocations?.length > 0 && (
            <p className="mt-1.5 text-[11px] text-[#71706B] flex items-center gap-1.5">
              <MapPin className="w-3 h-3 text-[#8C5A3C]" />
              <span>{monthLocations.join(' · ')}</span>
            </p>
          )}
        </div>

        {/* Highlight Photo Preview in Chapter Opener */}
        {highlightPhoto && (
          <div className="flex-1 min-h-0 flex flex-col my-2">
            <div
              onClick={() => onSelectPhoto && onSelectPhoto(highlightPhoto)}
              className="relative flex-1 min-h-[190px] overflow-hidden bg-[#E6E4DD] cursor-pointer group"
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

        <div className="mt-4 pt-3 border-t border-[#141413]/12 flex items-center justify-between text-xs text-[#5A5852]">
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

  // 5. PHOTO SPREAD PAGE (1, 2, 3, or 4 Photos with Editorial Magazine Templates)
  const { photos = [], layoutTemplate, month, monthMeta } = page;

  // Sub-component to render a photo card with caption, uploader tag, EXIF, and comments
  const renderPhotoUnit = (photo, figIndex, options = {}) => {
    const member = getMember(photo.memberId);
    const {
      compactCaption = false,
      aspectClass = 'aspect-[4/3]',
      fillHeight = false,
      showComments = bookSettings.includeCommentsInBook !== false,
    } = options;

    return (
      <div
        key={photo.id}
        className={`flex flex-col ${fillHeight ? 'h-full min-h-0' : ''}`}
      >
        {/* Image Frame */}
        <div
          onClick={() => onSelectPhoto && onSelectPhoto(photo)}
          className={`relative overflow-hidden bg-[#E6E4DD] border border-[#141413]/8 cursor-pointer group ${
            fillHeight ? 'flex-1 min-h-[130px]' : aspectClass
          }`}
        >
          <img
            src={photo.url}
            alt={photo.caption || '가족 사진'}
            crossOrigin="anonymous"
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
          />
          <div className="absolute top-2 left-2 bg-[#FAF9F6]/90 backdrop-blur-xs px-1.5 py-0.5 text-[9px] font-mono-meta tracking-wider text-[#141413]">
            fig. 0{figIndex + 1} · {formatEditorialDate(photo.takenAt)}
          </div>
          <div
            className="absolute bottom-2 right-2 px-2 py-0.5 text-[10px] font-medium rounded-xs shadow-xs"
            style={{ backgroundColor: member.badgeBg, color: member.color }}
          >
            {member.name}
          </div>
        </div>

        {/* Editorial Caption & Metadata */}
        <div className={compactCaption ? 'mt-1.5' : 'mt-2.5'}>
          <div className="flex items-center justify-between gap-2 text-[10px] text-[#71706B]">
            <span className="font-mono-meta flex items-center gap-1 truncate">
              {photo.location && (
                <>
                  <MapPin className="w-2.5 h-2.5 text-[#8C5A3C] shrink-0" />
                  <span className="truncate text-[#2C2B29] font-medium">{photo.location}</span>
                </>
              )}
            </span>
            {bookSettings.includeExifDetails !== false && photo.exif?.camera && !compactCaption && (
              <span className="font-mono-meta text-[9px] text-[#8E8A80] truncate">
                {photo.exif.camera}
              </span>
            )}
          </div>

          {photo.caption && (
            <p
              className={`font-editorial-ko text-[#181715] leading-[1.65] ${
                compactCaption
                  ? 'text-[11px] line-clamp-2 mt-0.5'
                  : 'text-xs sm:text-[13px] mt-1'
              }`}
            >
              {photo.caption}
            </p>
          )}

          {/* Family Reply Comments inside Book */}
          {showComments && !compactCaption && photo.comments?.length > 0 && (
            <div className="mt-1.5 pl-2.5 border-l-2 border-[#8C5A3C]/35 space-y-1">
              {photo.comments.slice(0, 2).map((c) => {
                const cMember = getMember(c.memberId);
                return (
                  <p key={c.id} className="text-[10px] text-[#5A5852] leading-snug">
                    <span className="font-semibold text-[#2C2B29]">{cMember.name}:</span>{' '}
                    “{c.text}”
                  </p>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      className={`w-full h-full flex flex-col p-6 sm:p-9 relative group/page ${paperClass} ${spineClass}`}
    >
      {/* Top Running Header with Optional Layout Switcher button on hover */}
      <div className="flex items-center justify-between pb-2 mb-3.5 border-b border-[#141413]/12 text-[10px] tracking-[0.2em] uppercase text-[#71706B] font-mono-meta">
        <span>
          {String(month).padStart(2, '0')} — {monthMeta?.en || 'ARCHIVE'}
        </span>
        <div className="flex items-center gap-2">
          {!isPrint && onCycleVariant && (
            <button
              type="button"
              onClick={() => onCycleVariant(page.id)}
              title="이 페이지의 레이아웃 구성을 다른 매거진 스타일로 전환합니다"
              className="opacity-80 hover:opacity-100 flex items-center gap-1 px-2 py-0.5 rounded-xs bg-[#141413]/6 hover:bg-[#141413] hover:text-[#FAF9F6] text-[#141413] text-[9px] tracking-wider transition-colors cursor-pointer"
            >
              <Shuffle className="w-2.5 h-2.5" />
              <span>레이아웃 변환</span>
            </button>
          )}
          <span>{monthMeta?.seasonKo || ''}</span>
        </div>
      </div>

      {/* Main Content Area by Template */}
      <div className="flex-1 min-h-0 flex flex-col justify-center">
        {/* --- 1 PHOTO TEMPLATES --- */}
        {photos.length === 1 && layoutTemplate === 'solo-portrait-editorial' && (
          <div className="grid grid-cols-12 gap-4 items-center h-full">
            <div className="col-span-7 h-full min-h-[260px] flex flex-col">
              {renderPhotoUnit(photos[0], 0, { fillHeight: true, compactCaption: true })}
            </div>
            <div className="col-span-5 flex flex-col justify-center pl-2 border-l border-[#141413]/10">
              <span className="font-mono-meta text-[10px] tracking-[0.2em] text-[#8C5A3C] uppercase">
                {formatKoreanDate(photos[0].takenAt)}
              </span>
              {photos[0].location && (
                <h4 className="mt-1 font-editorial-ko text-sm font-semibold text-[#141413]">
                  {photos[0].location}
                </h4>
              )}
              <p className="mt-3 font-editorial-ko text-xs sm:text-[13px] text-[#2C2B29] leading-[1.85]">
                “{photos[0].caption || '그날의 풍경과 마음을 사진 한 장에 담아 보냅니다.'}”
              </p>
              <div className="mt-4 pt-3 border-t border-[#141413]/10 text-[11px] text-[#71706B]">
                <div>기록한 가족: {getMember(photos[0].memberId).name}</div>
                {photos[0].exif?.camera && (
                  <div className="font-mono-meta text-[10px] mt-0.5">{photos[0].exif.camera}</div>
                )}
              </div>
              {photos[0].comments?.length > 0 && (
                <div className="mt-3 space-y-1.5 bg-[#141413]/[0.03] p-2.5 rounded-xs">
                  {photos[0].comments.map((c) => (
                    <p key={c.id} className="text-[10px] text-[#4A4944]">
                      <strong className="text-[#141413]">{getMember(c.memberId).name}:</strong>{' '}
                      {c.text}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {photos.length === 1 && layoutTemplate !== 'solo-portrait-editorial' && (
          <div className="flex flex-col h-full justify-between">
            <div className="flex-1 min-h-0 flex flex-col">
              {renderPhotoUnit(photos[0], 0, { fillHeight: true })}
            </div>
          </div>
        )}

        {/* --- 2 PHOTOS TEMPLATES --- */}
        {photos.length === 2 && layoutTemplate === 'duo-side-by-side' && (
          <div className="grid grid-cols-2 gap-4 h-full items-stretch">
            {renderPhotoUnit(photos[0], 0, { fillHeight: true })}
            {renderPhotoUnit(photos[1], 1, { fillHeight: true })}
          </div>
        )}

        {photos.length === 2 && layoutTemplate === 'duo-stacked-editorial' && (
          <div className="flex flex-col gap-4 h-full justify-between">
            <div className="flex-1 min-h-0">{renderPhotoUnit(photos[0], 0, { fillHeight: true, compactCaption: true })}</div>
            <div className="flex-1 min-h-0">{renderPhotoUnit(photos[1], 1, { fillHeight: true, compactCaption: true })}</div>
          </div>
        )}

        {photos.length === 2 &&
          layoutTemplate !== 'duo-side-by-side' &&
          layoutTemplate !== 'duo-stacked-editorial' && (
            <div className="grid grid-cols-12 gap-4 h-full items-center">
              <div className="col-span-7 h-full flex flex-col">
                {renderPhotoUnit(photos[0], 0, { fillHeight: true })}
              </div>
              <div className="col-span-5 flex flex-col justify-center">
                {renderPhotoUnit(photos[1], 1, { aspectClass: 'aspect-[4/5]' })}
              </div>
            </div>
          )}

        {/* --- 3 PHOTOS TEMPLATES --- */}
        {photos.length === 3 && layoutTemplate === 'trio-feature-top' && (
          <div className="flex flex-col gap-3.5 h-full">
            <div className="flex-[1.15] min-h-0">
              {renderPhotoUnit(photos[0], 0, { fillHeight: true, compactCaption: true })}
            </div>
            <div className="flex-1 min-h-0 grid grid-cols-2 gap-3.5">
              {renderPhotoUnit(photos[1], 1, { fillHeight: true, compactCaption: true })}
              {renderPhotoUnit(photos[2], 2, { fillHeight: true, compactCaption: true })}
            </div>
          </div>
        )}

        {photos.length === 3 && layoutTemplate !== 'trio-feature-top' && (
          <div className="grid grid-cols-12 gap-3.5 h-full">
            <div className="col-span-7 h-full min-h-0 flex flex-col">
              {renderPhotoUnit(photos[0], 0, { fillHeight: true })}
            </div>
            <div className="col-span-5 h-full min-h-0 flex flex-col gap-3.5 justify-between">
              <div className="flex-1 min-h-0">
                {renderPhotoUnit(photos[1], 1, { fillHeight: true, compactCaption: true })}
              </div>
              <div className="flex-1 min-h-0">
                {renderPhotoUnit(photos[2], 2, { fillHeight: true, compactCaption: true })}
              </div>
            </div>
          </div>
        )}

        {/* --- 4+ PHOTOS TEMPLATES --- */}
        {photos.length >= 4 && (
          <div className="grid grid-cols-2 grid-rows-2 gap-3.5 h-full">
            {photos.slice(0, 4).map((p, idx) => (
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
