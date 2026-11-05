import React, { useState, useEffect } from 'react';
import {
  X,
  Trash2,
  Check,
  Edit3,
} from 'lucide-react';
import { formatKoreanDate } from '../utils/bookLayoutEngine';
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
  const [draftCropX, setDraftCropX] = useState(50);
  const [draftCropY, setDraftCropY] = useState(50);
  const [draftCropZoom, setDraftCropZoom] = useState(1);
  const [commentText, setCommentText] = useState('');
  const [commentAuthorId, setCommentAuthorId] = useState(activeMemberId || members[0]?.id);
  const [saving, setSaving] = useState(false);

  const resetDraftFromPhoto = (p) => {
    if (!p) return;
    setDateStr(p.dateStr || p.takenAt?.slice(0, 10) || '');
    setLocation(p.location || '');
    setCaption(p.caption || '');
    setMemberId(p.memberId || members[0]?.id || '');
    setDraftCropX(typeof p.cropX === 'number' ? p.cropX : 50);
    setDraftCropY(typeof p.cropY === 'number' ? p.cropY : 50);
    setDraftCropZoom(typeof p.cropZoom === 'number' ? p.cropZoom : 1);
  };

  useEffect(() => {
    if (photo) {
      resetDraftFromPhoto(photo);
      setCommentAuthorId(activeMemberId || members[0]?.id);
      setIsEditing(false);
    }
  }, [photo?.id, activeMemberId]);

  if (!photo) return null;

  const uploader = members.find((m) => m.id === photo.memberId) || {
    name: '가족',
    city: '',
    color: '#111111',
    badgeBg: '#F0EFEA',
  };

  const isCurrentCover = bookSettings.coverPhotoUrl === photo.url;
  const payerMemberId = bookSettings.payerMemberId || 'member-first';
  const isRepresentative = activeMemberId === payerMemberId;
  const isOwnPhoto = photo.memberId === activeMemberId;
  const canManagePhoto = isRepresentative || isOwnPhoto;

  const handleDraftPositionChange = (_id, patch) => {
    if (typeof patch.cropX === 'number') setDraftCropX(patch.cropX);
    if (typeof patch.cropY === 'number') setDraftCropY(patch.cropY);
    if (typeof patch.cropZoom === 'number') setDraftCropZoom(patch.cropZoom);
  };

  const handleCancelEdits = () => {
    resetDraftFromPhoto(photo);
    setIsEditing(false);
  };

  const handleSaveEdits = async () => {
    setSaving(true);
    try {
      await onUpdatePhoto(photo.id, {
        dateStr,
        location,
        caption,
        memberId,
        cropX: draftCropX,
        cropY: draftCropY,
        cropZoom: draftCropZoom,
      });
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    await onAddComment(photo.id, commentAuthorId, commentText.trim());
    setCommentText('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#5E3422]/65 p-0 sm:p-4">
      <div className="bg-[#FBF8F3] rounded-t-3xl sm:rounded-3xl w-full max-w-[520px] max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Top Header */}
        <div className="px-5 py-4 border-b border-[#E6DEC8] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm sm:text-base font-bold text-[#8A442B]">{uploader.name}</span>
            {uploader.city && (
              <span className="text-xs sm:text-sm text-[#A69B80]">· {uploader.city}</span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {canManagePhoto && (
              <>
                {isEditing ? (
                  <>
                    <button
                      type="button"
                      onClick={handleCancelEdits}
                      className="px-3 py-1 rounded-full border border-[#B64E2E]/45 text-xs font-bold text-[#8A442B] cursor-pointer"
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={handleSaveEdits}
                      className="px-3.5 py-1 rounded-full bg-[#B64E2E] hover:bg-[#A3573E] text-[#FBF8F3] text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{saving ? '저장 중...' : '완료'}</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      resetDraftFromPhoto(photo);
                      setIsEditing(true);
                    }}
                    className="px-3 py-1 rounded-full border border-[#B64E2E]/45 text-xs font-bold text-[#8A442B] hover:border-[#B64E2E] flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>수정</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('이 사진을 삭제할까요?')) {
                      onDeletePhoto(photo.id);
                      onClose();
                    }
                  }}
                  className="px-3 py-1 rounded-full border border-[#B64E2E]/45 text-xs font-bold text-[#B64E2E] hover:bg-[#B64E2E] hover:text-[#FBF8F3] flex items-center gap-1 cursor-pointer transition-colors"
                  title="사진 삭제"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>삭제</span>
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-[#A69B80] hover:text-[#5E3422] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1">
          {/* Photo Viewer (기본은 감상 전용 · [수정] 버튼을 눌러야 확대/축소·이동 가능) */}
          <div className="bg-[#F2EDE3] relative">
            <div className="p-5 sm:p-7 flex items-center justify-center">
              <FramePhotoItem
                photo={
                  isEditing
                    ? {
                        ...photo,
                        cropX: draftCropX,
                        cropY: draftCropY,
                        cropZoom: draftCropZoom,
                      }
                    : photo
                }
                isRepositionMode={isEditing}
                onUpdatePhotoPosition={isEditing ? handleDraftPositionChange : undefined}
                className="w-full aspect-square overflow-hidden"
              />
            </div>
            {(isEditing || isRepresentative) && (
              <div className="px-5 py-3 border-t border-[#E6DEC8] flex flex-wrap items-center justify-between gap-2 text-xs text-[#8A442B]">
                <span>
                  {isEditing
                    ? '두 손가락으로 늘렸다 줄여 확대·축소하거나 드래그 후 [완료]를 눌러주세요'
                    : '위치·크기 조절은 상단 [수정] 버튼을 눌러주세요'}
                </span>
                {isRepresentative && (
                  <button
                    type="button"
                    onClick={() => onSetAsCover(photo.url)}
                    className={`px-3.5 py-1 rounded-full text-xs font-bold cursor-pointer shrink-0 ${
                      isCurrentCover
                        ? 'bg-[#B64E2E] text-[#FBF8F3]'
                        : 'border border-[#B64E2E]/50 text-[#8A442B]'
                    }`}
                  >
                    {isCurrentCover ? '현재 표지 사진' : '표지 사진으로 지정 +'}
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="p-5 space-y-4">
            {isEditing ? (
              <div className="space-y-3 bg-[#F2EDE3] p-4 rounded-2xl">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-[#8A442B] mb-1">작성자</label>
                    <select
                      value={memberId}
                      disabled={!isRepresentative}
                      onChange={(e) => setMemberId(e.target.value)}
                      className="w-full bg-[#FBF8F3] rounded-xl px-3 py-2 text-xs sm:text-sm font-bold text-[#5E3422] disabled:opacity-70"
                    >
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#8A442B] mb-1">촬영일</label>
                    <input
                      type="date"
                      value={dateStr}
                      onChange={(e) => setDateStr(e.target.value)}
                      className="w-full bg-[#FBF8F3] rounded-xl px-3 py-2 text-xs sm:text-sm text-[#5E3422]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#8A442B] mb-1">촬영 장소</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="촬영 장소 입력"
                    className="w-full bg-[#FBF8F3] rounded-xl px-3 py-2 text-xs sm:text-sm text-[#5E3422]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#8A442B] mb-1">내용</label>
                  <textarea
                    rows={3}
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="사진에 담긴 이야기를 적어주세요"
                    className="w-full bg-[#FBF8F3] rounded-xl p-3 text-xs sm:text-sm text-[#5E3422] resize-none"
                  />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCancelEdits}
                    className="px-5 py-2.5 rounded-full border border-[#B64E2E]/45 text-xs sm:text-sm font-bold text-[#8A442B] hover:bg-[#FBF8F3] cursor-pointer"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleSaveEdits}
                    className="flex-1 py-2.5 bg-[#B64E2E] hover:bg-[#B04C2E] text-[#FBF8F3] rounded-full text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{saving ? '저장 중...' : '완료 (수정한 내용 저장)'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="px-2.5 py-0.5 rounded-full border border-[#B64E2E]/45 text-xs font-medium text-[#8A442B]">
                    {formatKoreanDate(photo.takenAt)}
                  </span>
                  {photo.location && (
                    <span className="px-2.5 py-0.5 rounded-full border border-[#B64E2E]/45 text-xs font-medium text-[#8A442B]">
                      {photo.location}
                    </span>
                  )}
                </div>
                {photo.caption && (
                  <p className="pt-1 text-sm sm:text-base font-medium text-[#5E3422] leading-relaxed">
                    {photo.caption}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
