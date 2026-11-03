import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  MapPin,
  Camera,
  Star,
  BookImage,
  MessageSquare,
  Send,
  Trash2,
  Check,
  Edit3,
} from 'lucide-react';
import { formatKoreanDate, MONTH_META } from '../utils/bookLayoutEngine';
import FramePhotoItem from './FramePhotoItem';

export default function PhotoDetailModal({
  photo,
  onClose,
  members = [],
  activeMemberId,
  bookSettings = {},
  onUpdatePhoto,
  onDeletePhoto,
  onAddComment,
  onDeleteComment,
  onSetAsCover,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [dateStr, setDateStr] = useState('');
  const [location, setLocation] = useState('');
  const [caption, setCaption] = useState('');
  const [memberId, setMemberId] = useState('');
  const [commentText, setCommentText] = useState('');
  const [commentAuthorId, setCommentAuthorId] = useState(activeMemberId || members[0]?.id);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (photo) {
      setDateStr(photo.dateStr || photo.takenAt?.slice(0, 10) || '');
      setLocation(photo.location || '');
      setCaption(photo.caption || '');
      setMemberId(photo.memberId || members[0]?.id || '');
      setCommentAuthorId(activeMemberId || members[0]?.id);
      setIsEditing(false);
    }
  }, [photo, activeMemberId, members]);

  if (!photo) return null;

  const uploader = members.find((m) => m.id === photo.memberId) || {
    name: '가족',
    city: '',
    color: '#3B5249',
    badgeBg: '#E6EFEA',
  };

  const monthMeta = MONTH_META[photo.month] || MONTH_META[1];
  const isCurrentCover = bookSettings.coverPhotoUrl === photo.url;

  const handleSaveEdits = async () => {
    setSaving(true);
    try {
      await onUpdatePhoto(photo.id, {
        dateStr,
        location,
        caption,
        memberId,
      });
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleFavorite = async () => {
    await onUpdatePhoto(photo.id, { isFavorite: !photo.isFavorite });
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    await onAddComment(photo.id, commentAuthorId, commentText.trim());
    setCommentText('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#141413]/70 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto">
      <div className="bg-[#FAF9F6] border border-[#141413]/20 w-full max-w-5xl max-h-[92vh] grid grid-cols-1 lg:grid-cols-12 overflow-hidden shadow-2xl">
        {/* Left: Interactive Frame Position Adjuster & High-Res Viewer */}
        <div className="lg:col-span-7 bg-[#141413] flex flex-col justify-between relative min-h-[340px] lg:min-h-[540px]">
          <div className="px-5 py-2.5 bg-white/5 border-b border-white/10 flex items-center justify-between text-[11px] text-amber-300">
            <span>✋ 아래 사진을 마우스로 드래그하면 포토북 프레임 내 사진 위치가 바로 조절·저장됩니다</span>
          </div>
          <div className="flex-1 flex items-center justify-center p-4 sm:p-8 overflow-hidden">
            <FramePhotoItem
              photo={photo}
              isRepositionMode={true}
              onUpdatePhotoPosition={onUpdatePhoto}
              className="w-full max-w-xl aspect-[4/3] shadow-2xl border border-white/25"
            />
          </div>

          {/* Bottom Image Action Bar */}
          <div className="px-5 py-3 bg-[#141413] border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs text-[#FAF9F6]/80">
            <div className="flex items-center gap-3 font-mono-meta text-[11px]">
              <span>
                {photo.month}월 ({monthMeta.en})
              </span>
              {photo.exif?.camera && (
                <span>
                  · {photo.exif.camera} {photo.exif.lens ? `(${photo.exif.lens})` : ''}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleFavorite}
                className={`px-2.5 py-1 text-[11px] flex items-center gap-1 border transition-colors cursor-pointer ${
                  photo.isFavorite
                    ? 'bg-amber-400/20 border-amber-400 text-amber-300'
                    : 'border-white/20 text-white/80 hover:border-white'
                }`}
              >
                <Star
                  className={`w-3.5 h-3.5 ${
                    photo.isFavorite ? 'fill-amber-400 text-amber-400' : ''
                  }`}
                />
                <span>{photo.isFavorite ? '메인 화보 지정됨' : '메인 화보 지정'}</span>
              </button>

              <button
                type="button"
                onClick={() => onSetAsCover(photo.url)}
                className={`px-2.5 py-1 text-[11px] flex items-center gap-1 border transition-colors cursor-pointer ${
                  isCurrentCover
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                    : 'border-white/20 text-white/80 hover:border-white'
                }`}
              >
                <BookImage className="w-3.5 h-3.5" />
                <span>{isCurrentCover ? '현재 포토북 표지' : '포토북 표지로 설정'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right: Editorial Story, Metadata Editor & Family Comments */}
        <div className="lg:col-span-5 flex flex-col max-h-[92vh] bg-[#FAF9F6]">
          {/* Header */}
          <div className="px-6 py-4 border-b border-[#141413]/12 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="px-2.5 py-0.5 text-xs font-medium rounded-xs"
                style={{ backgroundColor: uploader.badgeBg, color: uploader.color }}
              >
                {uploader.name}
              </span>
              <span className="text-[11px] text-[#71706B]">{uploader.role || uploader.city}</span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className="p-1.5 text-[#5A5852] hover:text-[#141413] text-xs flex items-center gap-1 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{isEditing ? '편집 닫기' : '수정'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('이 사진을 가족 아카이브에서 삭제할까요?')) {
                    onDeletePhoto(photo.id);
                    onClose();
                  }
                }}
                className="p-1.5 text-[#71706B] hover:text-red-600 cursor-pointer"
                title="사진 삭제"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-[#71706B] hover:text-[#141413] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Story Content or Edit Form */}
          <div className="p-6 overflow-y-auto flex-1 space-y-6">
            {isEditing ? (
              <div className="space-y-3 bg-[#F3F1EC] p-4 border border-[#141413]/12">
                <div>
                  <label className="block text-[10px] font-mono-meta text-[#5A5852] mb-1">
                    올린 가족 구성원
                  </label>
                  <select
                    value={memberId}
                    onChange={(e) => setMemberId(e.target.value)}
                    className="w-full bg-white border border-[#141413]/15 px-2.5 py-1.5 text-xs"
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.city})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-mono-meta text-[#5A5852] mb-1">
                    촬영 날짜 (변경 시 포토북 페이지 순서가 자동 재정렬됩니다)
                  </label>
                  <input
                    type="date"
                    value={dateStr}
                    onChange={(e) => setDateStr(e.target.value)}
                    className="w-full bg-white border border-[#141413]/15 px-2.5 py-1.5 text-xs font-mono-meta"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono-meta text-[#5A5852] mb-1">
                    촬영 장소
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-white border border-[#141413]/15 px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono-meta text-[#5A5852] mb-1">
                    한 줄 일기 / 사진 기록
                  </label>
                  <textarea
                    rows={3}
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    className="w-full bg-white border border-[#141413]/15 p-2.5 text-xs font-editorial-ko"
                  />
                </div>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSaveEdits}
                  className="w-full py-2 bg-[#141413] text-[#FAF9F6] text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>변경 사항 저장</span>
                </button>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-3 text-xs text-[#71706B] font-mono-meta">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#8C5A3C]" />
                    {formatKoreanDate(photo.takenAt)}
                  </span>
                  {photo.location && (
                    <span className="flex items-center gap-1 text-[#2C2B29] font-sans font-medium">
                      <MapPin className="w-3.5 h-3.5 text-[#8C5A3C]" />
                      {photo.location}
                    </span>
                  )}
                </div>

                <p className="mt-4 font-editorial-ko text-base text-[#141413] leading-[1.85]">
                  “{photo.caption || '기록된 코멘트가 없습니다. 우측 상단 수정 버튼을 눌러 그날의 이야기를 남겨보세요.'}”
                </p>

                <div className="mt-4 pt-3 border-t border-[#141413]/10 flex flex-wrap gap-3 text-[11px] font-mono-meta text-[#71706B]">
                  <span>비율: {photo.orientation?.toUpperCase()}</span>
                  {photo.exif?.source && <span>· 인식: {photo.exif.source}</span>}
                </div>
              </div>
            )}

            {/* Family Comments Section */}
            <div className="pt-4 border-t border-[#141413]/12">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-semibold text-[#141413] flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-[#8C5A3C]" />
                  <span>가족들의 한마디 ({photo.comments?.length || 0})</span>
                </h4>
                <span className="text-[10px] text-[#71706B]">포토북 페이지에 함께 인쇄됩니다</span>
              </div>

              <div className="space-y-2.5">
                {(!photo.comments || photo.comments.length === 0) && (
                  <p className="text-xs text-[#71706B] py-3 text-center bg-[#F3F1EC]/60">
                    아직 남겨진 가족 코멘트가 없습니다. 첫 번째 답글을 남겨보세요!
                  </p>
                )}

                {photo.comments?.map((c) => {
                  const author = members.find((m) => m.id === c.memberId) || {
                    name: '가족',
                    color: '#141413',
                    badgeBg: '#E6E4DD',
                  };
                  return (
                    <div
                      key={c.id}
                      className="p-3 bg-[#F3F1EC] border border-[#141413]/8 text-xs flex items-start justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className="px-1.5 py-0.5 text-[10px] font-medium rounded-xs"
                            style={{ backgroundColor: author.badgeBg, color: author.color }}
                          >
                            {author.name}
                          </span>
                          <span className="text-[10px] font-mono-meta text-[#71706B]">
                            {formatKoreanDate(c.createdAt)}
                          </span>
                        </div>
                        <p className="mt-1.5 font-editorial-ko text-[#181715] leading-relaxed">
                          {c.text}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onDeleteComment(photo.id, c.id)}
                        className="text-[#8E8A80] hover:text-red-600 p-1 cursor-pointer"
                        title="코멘트 삭제"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Add Comment Input Bar */}
          <form
            onSubmit={handleCommentSubmit}
            className="p-4 border-t border-[#141413]/12 bg-[#F3F1EC] space-y-2"
          >
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#5A5852]">작성자:</span>
              <select
                value={commentAuthorId}
                onChange={(e) => setCommentAuthorId(e.target.value)}
                className="bg-white border border-[#141413]/15 px-2 py-1 text-xs font-medium"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="사진에 따뜻한 한마디를 남겨주세요..."
                className="flex-1 bg-white border border-[#141413]/15 px-3 py-2 text-xs focus:outline-none focus:border-[#141413]"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-[#141413] text-[#FAF9F6] text-xs font-medium flex items-center gap-1.5 hover:bg-[#2C2B29] cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>남기기</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
