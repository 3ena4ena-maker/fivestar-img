import React from 'react';
import {
  MapPin,
  Camera,
  Star,
  MessageSquare,
  Upload,
  Calendar,
  BookOpen,
} from 'lucide-react';
import {
  MONTH_META,
  SEASON_LABELS,
  formatKoreanDate,
  formatEditorialDate,
} from '../utils/bookLayoutEngine';
import FramePhotoItem from './FramePhotoItem';

export default function TimelineArchiveView({
  photos = [],
  members = [],
  selectedSeason,
  onSelectSeason,
  selectedMonth,
  onSelectMonth,
  selectedMemberId,
  onSelectMemberId,
  onSelectPhoto,
  onToggleFavorite,
  onUpdatePhotoPosition,
  onOpenUpload,
  onSwitchToBookView,
}) {
  const getMember = (memberId) =>
    members.find((m) => m.id === memberId) || {
      name: '가족',
      city: '',
      color: '#3B5249',
      badgeBg: '#E6EFEA',
    };

  // Filter photos
  const filteredPhotos = photos.filter((p) => {
    if (selectedSeason !== 'all' && p.season !== selectedSeason) return false;
    if (selectedMonth !== 'all' && Number(p.month) !== Number(selectedMonth)) return false;
    if (selectedMemberId !== 'all' && p.memberId !== selectedMemberId) return false;
    return true;
  });

  // Group filtered photos by Month ascending
  const groupedByMonth = new Map();
  for (const p of filteredPhotos) {
    const m = p.month || new Date(p.takenAt).getMonth() + 1;
    if (!groupedByMonth.has(m)) groupedByMonth.set(m, []);
    groupedByMonth.get(m).push(p);
  }

  // Monthly photo counts for the 1..12 filter strip
  const monthCounts = {};
  for (let m = 1; m <= 12; m++) {
    monthCounts[m] = photos.filter((p) => Number(p.month) === m).length;
  }

  return (
    <div className="space-y-8">
      {/* Editorial Filter Console */}
      <div className="bg-white border border-[#141413]/12 p-5 space-y-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#141413]/10">
          {/* Season Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-mono-meta uppercase tracking-[0.2em] text-[#71706B] mr-2">
              SEASON:
            </span>
            {Object.entries(SEASON_LABELS).map(([key, label]) => {
              const active = selectedSeason === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    onSelectSeason(key);
                    onSelectMonth('all');
                  }}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#141413] text-[#FAF9F6]'
                      : 'bg-[#F3F1EC] text-[#5A5852] hover:text-[#141413]'
                  }`}
                >
                  {label.ko}
                </button>
              );
            })}
          </div>

          {/* Family Member Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-mono-meta uppercase tracking-[0.2em] text-[#71706B] mr-1">
              FAMILY:
            </span>
            <button
              type="button"
              onClick={() => onSelectMemberId('all')}
              className={`px-3 py-1 text-xs font-medium border transition-colors cursor-pointer ${
                selectedMemberId === 'all'
                  ? 'bg-[#141413] text-[#FAF9F6] border-[#141413]'
                  : 'bg-[#FAF9F6] text-[#5A5852] border-[#141413]/12 hover:border-[#141413]/40'
              }`}
            >
              전체 가족 ({photos.length})
            </button>
            {members.map((m) => {
              const active = selectedMemberId === m.id;
              const count = photos.filter((p) => p.memberId === m.id).length;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onSelectMemberId(active ? 'all' : m.id)}
                  className={`px-2.5 py-1 text-xs font-medium border flex items-center gap-1.5 transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#141413] text-[#FAF9F6] border-[#141413]'
                      : 'bg-[#FAF9F6] text-[#2C2B29] border-[#141413]/12 hover:border-[#141413]/40'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: active ? '#FAF9F6' : m.color }}
                  />
                  <span>{m.name}</span>
                  <span className="font-mono-meta text-[10px] opacity-70">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 12 Months Ribbon */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => onSelectMonth('all')}
            className={`px-3 py-1.5 text-xs font-mono-meta shrink-0 border transition-colors cursor-pointer ${
              selectedMonth === 'all'
                ? 'bg-[#141413] text-[#FAF9F6] border-[#141413]'
                : 'bg-[#FAF9F6] text-[#5A5852] border-[#141413]/12'
            }`}
          >
            ALL MONTHS
          </button>
          {Array.from({ length: 12 }, (_, idx) => {
            const m = idx + 1;
            const count = monthCounts[m] || 0;
            const active = Number(selectedMonth) === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => {
                  onSelectMonth(active ? 'all' : m);
                  onSelectSeason('all');
                }}
                className={`px-3 py-1.5 text-xs font-mono-meta shrink-0 border flex items-center gap-1.5 transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#141413] text-[#FAF9F6] border-[#141413]'
                    : count > 0
                    ? 'bg-white text-[#141413] border-[#141413]/15 hover:border-[#141413]'
                    : 'bg-[#F3F1EC]/60 text-[#8E8A80] border-transparent'
                }`}
              >
                <span>{String(m).padStart(2, '0')}월</span>
                <span
                  className={`text-[10px] px-1 rounded-xs ${
                    active
                      ? 'bg-white/20 text-white'
                      : count > 0
                      ? 'bg-[#F3F1EC] text-[#5A5852]'
                      : 'opacity-40'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Empty State */}
      {filteredPhotos.length === 0 && (
        <div className="bg-white border border-[#141413]/12 p-14 text-center space-y-4">
          <p className="font-editorial-ko text-lg text-[#141413]">
            선택한 조건에 해당하는 가족 사진이 아직 없습니다.
          </p>
          <p className="text-xs text-[#71706B]">
            스마트폰이나 PC에 저장된 사진을 올리면 촬영 날짜(EXIF)를 자동 인식해 월별 화보집으로 정리해 드립니다.
          </p>
          <button
            type="button"
            onClick={onOpenUpload}
            className="px-5 py-2.5 bg-[#141413] text-[#FAF9F6] text-xs font-medium inline-flex items-center gap-2 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>첫 번째 가족 사진 올리기</span>
          </button>
        </div>
      )}

      {/* Monthly Chronological Chapters */}
      <div className="space-y-14">
        {Array.from(groupedByMonth.entries()).map(([monthNum, monthPhotos]) => {
          const meta = MONTH_META[monthNum] || MONTH_META[1];

          return (
            <section key={monthNum} className="space-y-6">
              {/* Chapter Header */}
              <div className="flex flex-col sm:flex-row sm:items-end justify-between pb-4 border-b border-[#141413]">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono-meta text-xs uppercase tracking-[0.25em] text-[#8C5A3C]">
                      CHAPTER {String(monthNum).padStart(2, '0')} · {meta.seasonKo}
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-3">
                    <h2 className="font-editorial-en text-3xl sm:text-4xl font-normal tracking-tight text-[#141413]">
                      {meta.en}
                    </h2>
                    <span className="font-editorial-ko text-base sm:text-lg text-[#4A4944]">
                      — {meta.ko}
                    </span>
                  </div>
                </div>

                <div className="mt-2 sm:mt-0 flex items-center gap-3">
                  <span className="font-mono-meta text-xs text-[#71706B]">
                    {monthPhotos.length} MOMENTS ARCHIVED
                  </span>
                  <button
                    type="button"
                    onClick={onSwitchToBookView}
                    className="text-xs font-medium text-[#141413] hover:text-[#8C5A3C] flex items-center gap-1 underline underline-offset-4 cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>포토북 페이지로 보기</span>
                  </button>
                </div>
              </div>

              {/* Editorial Magazine Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                {monthPhotos.map((photo, idx) => {
                  const member = getMember(photo.memberId);
                  // Create an asymmetric editorial rhythm: featured / first photo takes 7 cols, next 5 cols, or 4-4-4 cols
                  const colSpanClass =
                    monthPhotos.length === 1
                      ? 'md:col-span-8'
                      : monthPhotos.length === 2
                      ? idx === 0
                        ? 'md:col-span-7'
                        : 'md:col-span-5'
                      : idx % 3 === 0
                      ? 'md:col-span-6'
                      : 'md:col-span-3';

                  return (
                    <article
                      key={photo.id}
                      className={`${colSpanClass} bg-white border border-[#141413]/10 hover:border-[#141413]/35 transition-all flex flex-col group shadow-2xs`}
                    >
                      {/* Photo Frame with Interactive Drag Repositioning */}
                      <FramePhotoItem
                        photo={photo}
                        onSelectPhoto={onSelectPhoto}
                        onUpdatePhotoPosition={onUpdatePhotoPosition}
                        className={
                          photo.orientation === 'portrait'
                            ? 'aspect-[4/5]'
                            : photo.orientation === 'square'
                            ? 'aspect-square'
                            : 'aspect-[4/3]'
                        }
                      >
                        {/* Top Left EXIF Date Stamp */}
                        <div className="absolute top-3 left-3 bg-[#FAF9F6]/92 backdrop-blur-xs px-2.5 py-1 text-[10px] font-mono-meta tracking-wider text-[#141413] shadow-2xs pointer-events-none">
                          {formatEditorialDate(photo.takenAt)}
                        </div>

                        {/* Bottom Uploader Badge */}
                        <div
                          className="absolute bottom-3 left-3 px-2.5 py-0.5 text-[11px] font-medium rounded-xs shadow-xs pointer-events-none"
                          style={{ backgroundColor: member.badgeBg, color: member.color }}
                        >
                          {member.name} · {member.city}
                        </div>
                      </FramePhotoItem>

                      {/* Card Body */}
                      <div
                        onClick={() => onSelectPhoto(photo)}
                        className="p-4 flex-1 flex flex-col justify-between cursor-pointer space-y-3"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 text-[11px] text-[#71706B]">
                            <span className="flex items-center gap-1 font-medium text-[#2C2B29] truncate">
                              {photo.location ? (
                                <>
                                  <MapPin className="w-3 h-3 text-[#8C5A3C] shrink-0" />
                                  <span className="truncate">{photo.location}</span>
                                </>
                              ) : (
                                <span className="text-[#8E8A80]">장소 미지정</span>
                              )}
                            </span>
                            {photo.exif?.camera && (
                              <span className="font-mono-meta text-[10px] text-[#8E8A80] truncate">
                                {photo.exif.camera}
                              </span>
                            )}
                          </div>

                          <p className="mt-2 font-editorial-ko text-xs sm:text-[13px] text-[#141413] leading-[1.75] line-clamp-3">
                            {photo.caption || '클릭하여 그날의 이야기를 덧붙여보세요.'}
                          </p>
                        </div>

                        {/* Comments Footer */}
                        <div className="pt-2.5 border-t border-[#141413]/8 flex items-center justify-between text-[11px] text-[#71706B]">
                          <span className="font-mono-meta text-[10px]">
                            {formatKoreanDate(photo.takenAt)}
                          </span>
                          <span className="flex items-center gap-1 text-[#5A5852] group-hover:text-[#141413]">
                            <MessageSquare className="w-3 h-3" />
                            <span>
                              {photo.comments?.length > 0
                                ? `가족 코멘트 ${photo.comments.length}`
                                : '코멘트 남기기'}
                            </span>
                          </span>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
