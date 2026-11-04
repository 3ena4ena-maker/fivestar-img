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
    color: '#111111',
    badgeBg: '#F0EFEA',
  };

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
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className="px-3 py-1 rounded-full border border-[#B64E2E]/45 text-xs font-bold text-[#8A442B] flex items-center gap-1 cursor-pointer"
            >
              <Edit3 className="w-3 h-3" />
              <span>{isEditing ? '닫기' : '수정'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('이 사진을 삭제할까요?')) {
                  onDeletePhoto(photo.id);
                  onClose();
                }
              }}
              className="p-1.5 text-[#A69B80] hover:text-[#B64E2E] cursor-pointer"
              title="삭제"
            >
              <Trash2 className="w-4 h-4" />
            </button>
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
          {/* Photo Viewer */}
          <div className="bg-[#F2EDE3] relative">
            <div className="p-5 sm:p-7 flex items-center justify-center">
              <FramePhotoItem
                photo={photo}
                isRepositionMode={true}
                onUpdatePhotoPosition={onUpdatePhoto}
                className="w-full aspect-square overflow-hidden"
              />
            </div>
            <div className="px-5 py-3 border-t border-[#E6DEC8] flex items-center justify-between text-xs text-[#8A442B]">
              <span>드래그하여 사진첩 내 위치 조절</span>
              <button
                type="button"
                onClick={() => onSetAsCover(photo.url)}
                className={`px-3.5 py-1 rounded-full text-xs font-bold cursor-pointer ${
                  isCurrentCover
                    ? 'bg-[#B64E2E] text-[#FBF8F3]'
                    : 'border border-[#B64E2E]/50 text-[#8A442B]'
                }`}
              >
                {isCurrentCover ? '현재 표지 사진' : '표지 사진으로 지정 +'}
              </button>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {isEditing ? (
              <div className="space-y-3 bg-[#F2EDE3] p-4 rounded-2xl">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-[#8A442B] mb-1">작성자</label>
                    <select
                      value={memberId}
                      onChange={(e) => setMemberId(e.target.value)}
                      className="w-full bg-[#FBF8F3] rounded-xl px-3 py-2 text-xs sm:text-sm font-bold text-[#5E3422]"
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
                    className="w-full bg-[#FBF8F3] rounded-xl px-3 py-2 text-xs sm:text-sm text-[#5E3422]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#8A442B] mb-1">내용</label>
                  <textarea
                    rows={3}
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    className="w-full bg-[#FBF8F3] rounded-xl p-3 text-xs sm:text-sm text-[#5E3422] resize-none"
                  />
                </div>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSaveEdits}
                  className="w-full py-2.5 bg-[#B64E2E] hover:bg-[#B04C2E] text-[#FBF8F3] rounded-full text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>저장하기</span>
                </button>
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
