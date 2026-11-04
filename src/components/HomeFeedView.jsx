import React, { useState, useRef, useMemo } from 'react';
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
} from 'lucide-react';
import {
  extractPhotoMetadata,
  formatKoreanDate,
} from '../utils/bookLayoutEngine';
import FramePhotoItem from './FramePhotoItem';

export default function HomeFeedView({
  photos = [],
  members = [],
  activeMemberId,
  selectedMemberId = 'all',
  onSelectMemberId,
  selectedSeason = 'all',
  selectedMonth = 'all',
  onSelectPhoto,
  onUpdatePhotoPosition,
  onUploadSuccess,
}) {
  // 기본 보기 방식: 'grid' (사진 모아보기)
  const [displayMode, setDisplayMode] = useState('grid');
  const [sortOrder] = useState('newest');

  const [slideIndices, setSlideIndices] = useState({});
  const touchStartXRef = useRef({});

  // 상단 간편 업로드 영역 상태
  const [showComposer, setShowComposer] = useState(false);
  const [postText, setPostText] = useState('');
  const [postLocation, setPostLocation] = useState('');
  const [draftFiles, setDraftFiles] = useState([]);
  const [isParsingFiles, setIsParsingFiles] = useState(false);
  const [isUploadingPost, setIsUploadingPost] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  const getMember = (memberId) =>
    members.find((m) => m.id === memberId) ||
    members[0] || {
      id: 'member-first',
      name: '가족',
      city: '부산',
      color: '#B64E2E',
      badgeBg: '#F2EDE3',
      avatar: '가',
    };

  const currentWriter = getMember(activeMemberId);

  const filteredPhotos = useMemo(() => {
    const list = photos.filter((p) => {
      if (selectedMemberId !== 'all') {
        const isAuthor = p.memberId === selectedMemberId;
        const isTagged =
          Array.isArray(p.taggedMemberIds) && p.taggedMemberIds.includes(selectedMemberId);
        if (!isAuthor && !isTagged) return false;
      }
      if (selectedSeason !== 'all' && p.season !== selectedSeason) return false;
      if (selectedMonth !== 'all' && Number(p.month) !== Number(selectedMonth)) return false;
      return true;
    });

    return list.sort((a, b) => {
      const tA = new Date(a.takenAt).getTime();
      const tB = new Date(b.takenAt).getTime();
      return sortOrder === 'newest' ? tB - tA : tA - tB;
    });
  }, [photos, selectedMemberId, selectedSeason, selectedMonth, sortOrder]);

  const feedPosts = useMemo(() => {
    const groups = [];
    const groupMap = new Map();

    for (const photo of filteredPhotos) {
      const groupKey = photo.postGroupId
        ? `group-${photo.postGroupId}`
        : `auto-${photo.memberId}-${photo.season || photo.month || photo.dateStr}`;

      const maxSlides = photo.postGroupId ? 10 : 3;

      if (groupMap.has(groupKey)) {
        const existingGroup = groupMap.get(groupKey);
        if (existingGroup.slides.length < maxSlides) {
          existingGroup.slides.push(photo);
          continue;
        }
      }

      const newGroup = {
        postId: photo.postGroupId || photo.id,
        leadPhoto: photo,
        slides: [photo],
      };
      groups.push(newGroup);
      groupMap.set(groupKey, newGroup);
    }

    return groups;
  }, [filteredPhotos]);

  const handleSelectInlineFiles = async (fileList) => {
    const files = Array.from(fileList || []).filter((f) => f.type.startsWith('image/'));
    if (files.length === 0) return;

    setShowComposer(true);
    setIsParsingFiles(true);
    setUploadError('');
    try {
      const parsed = await Promise.all(
        files.map(async (file) => {
          const meta = await extractPhotoMetadata(file);
          return {
            tempId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            file: meta.optimizedFile || file,
            previewUrl: meta.previewUrl,
            dateStr: meta.dateStr,
            takenAt: meta.takenAt,
            width: meta.width,
            height: meta.height,
            exif: meta.exif,
          };
        })
      );
      setDraftFiles((prev) => [...prev, ...parsed]);
    } catch (err) {
      console.error(err);
      setUploadError('사진을 불러오는 중 문제가 생겼습니다. 다시 시도해 주세요.');
    } finally {
      setIsParsingFiles(false);
    }
  };

  const handleRemoveDraftFile = (tempId) => {
    setDraftFiles((prev) => prev.filter((item) => item.tempId !== tempId));
  };

  const handleInlinePostSubmit = async (e) => {
    e.preventDefault();
    if (draftFiles.length === 0) {
      fileInputRef.current?.click();
      return;
    }

    setIsUploadingPost(true);
    setUploadError('');
    try {
      const formData = new FormData();
      const writerId = activeMemberId || members[0]?.id;
      const writerObj = getMember(writerId);
      const sharedPostGroupId = `post-${Date.now()}`;

      const metadataPayload = draftFiles.map((item) => ({
        takenAt: item.takenAt,
        dateStr: item.dateStr,
        memberId: writerId,
        location: postLocation.trim() || writerObj.city || '',
        caption: postText.trim(),
        width: item.width,
        height: item.height,
        exif: item.exif,
        isFavorite: false,
        taggedMemberIds: [],
        postGroupId: sharedPostGroupId,
      }));

      draftFiles.forEach((item) => {
        formData.append('files', item.file);
      });
      formData.append('metadata', JSON.stringify(metadataPayload));

      const res = await fetch('/api/photos', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error('업로드 실패');
      }
      const data = await res.json();
      setDraftFiles([]);
      setPostText('');
      setPostLocation('');
      setShowComposer(false);
      if (onUploadSuccess) {
        onUploadSuccess(data.allPhotos, data.photos);
      }
    } catch (err) {
      setUploadError('사진을 올리는 중 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setIsUploadingPost(false);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* =====================================================================
          1. 상단 컨트롤 바 (re_ View + 필 버튼 스타일 · 테두리 박스 제로)
      ====================================================================== */}
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setDisplayMode('grid')}
            className={`px-4 py-2 sm:px-5 sm:py-2 rounded-full text-sm sm:text-base font-medium transition-all cursor-pointer ${
              displayMode === 'grid'
                ? 'bg-[#B64E2E] text-[#FBF8F3]'
                : 'border border-[#B64E2E]/45 text-[#8A442B] hover:border-[#B64E2E]'
            }`}
          >
            사진 모아보기 ({filteredPhotos.length})
          </button>

          <button
            type="button"
            onClick={() => setDisplayMode('feed')}
            className={`px-4 py-2 sm:px-5 sm:py-2 rounded-full text-sm sm:text-base font-medium transition-all cursor-pointer ${
              displayMode === 'feed'
                ? 'bg-[#B64E2E] text-[#FBF8F3]'
                : 'border border-[#B64E2E]/45 text-[#8A442B] hover:border-[#B64E2E]'
            }`}
          >
            글과 함께 보기
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setShowComposer((prev) => !prev);
              if (!showComposer) {
                setTimeout(() => fileInputRef.current?.click(), 80);
              }
            }}
            className="px-4 py-2 sm:px-5 sm:py-2 rounded-full border border-[#B64E2E]/55 text-[#8A442B] hover:bg-[#B64E2E] hover:text-[#FBF8F3] hover:border-[#B64E2E] transition-colors text-sm sm:text-base font-medium flex items-center gap-2 cursor-pointer"
          >
            <span>{currentWriter.name} 사진 올리기 +</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => handleSelectInlineFiles(e.target.files)}
            className="hidden"
          />
        </div>
      </section>

      {/* 간편 사진·소식 올리기 영역 */}
      {(showComposer || draftFiles.length > 0 || isParsingFiles) && (
        <section className="bg-[#F2EDE3] p-5 sm:p-7 space-y-4">
          <form onSubmit={handleInlinePostSubmit} className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-base sm:text-lg font-medium text-[#5E3422]">
                {currentWriter.name}
                {currentWriter.city && (
                  <span className="text-[#A3573E] ml-2 text-sm">
                    / {currentWriter.city}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-1.5 rounded-full border border-[#B64E2E]/50 text-sm font-medium text-[#8A442B] hover:border-[#B64E2E] cursor-pointer"
                >
                  사진 추가 +
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowComposer(false);
                    setDraftFiles([]);
                    setPostText('');
                  }}
                  className="p-1.5 text-[#A3573E] hover:text-[#B64E2E] cursor-pointer"
                  aria-label="닫기"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {isParsingFiles && (
              <div className="text-sm text-[#8A442B] flex items-center gap-2 py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>사진을 불러오는 중입니다...</span>
              </div>
            )}

            {draftFiles.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-3">
                {draftFiles.map((item) => (
                  <div
                    key={item.tempId}
                    className="relative aspect-square bg-[#E6DEC8] overflow-hidden"
                  >
                    <img
                      src={item.previewUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveDraftFile(item.tempId)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-[#5E3422]/80 text-[#FBF8F3] flex items-center justify-center cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <textarea
                rows={2}
                value={postText}
                onChange={(e) => setPostText(e.target.value)}
                placeholder="사진에 담고 싶은 짧은 이야기를 적어주세요..."
                className="md:col-span-2 w-full bg-[#FBF8F3] px-4 py-3 text-base text-[#5E3422] placeholder:text-[#A69B80] focus:outline-none resize-none"
              />
              <input
                type="text"
                value={postLocation}
                onChange={(e) => setPostLocation(e.target.value)}
                placeholder={`촬영 장소 (기본: ${currentWriter.city})`}
                className="w-full bg-[#FBF8F3] px-4 py-3 text-base text-[#5E3422] placeholder:text-[#A69B80] focus:outline-none"
              />
            </div>

            {uploadError && (
              <div className="text-sm text-[#B64E2E] font-medium">{uploadError}</div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isUploadingPost || isParsingFiles}
                className="w-full sm:w-auto px-7 py-2.5 bg-[#B64E2E] hover:bg-[#A3573E] text-[#FBF8F3] rounded-full text-base font-medium cursor-pointer disabled:opacity-50"
              >
                {isUploadingPost
                  ? '올리는 중...'
                  : draftFiles.length > 0
                  ? `사진 ${draftFiles.length}장 올리기 +`
                  : '사진 선택 후 올리기 +'}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* =====================================================================
          2. 메인 사진 모아보기 (re_ 갤러리 스타일: 웜 오트 프레임 + 하단 테라코타 캡션 & 필 태그)
      ====================================================================== */}
      {filteredPhotos.length === 0 ? (
        <div className="py-20 text-center space-y-4">
          <p className="text-base sm:text-lg text-[#8A442B]">
            등록된 사진이 없습니다.
          </p>
          {selectedMemberId !== 'all' && (
            <button
              type="button"
              onClick={() => onSelectMemberId && onSelectMemberId('all')}
              className="px-6 py-2.5 bg-[#B64E2E] text-[#FBF8F3] rounded-full text-sm sm:text-base font-medium cursor-pointer"
            >
              전체 가족 사진 보기
            </button>
          )}
        </div>
      ) : displayMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-10">
          {filteredPhotos.map((photo) => {
            const author = getMember(photo.memberId);
            return (
              <div
                key={photo.id}
                onClick={() => onSelectPhoto && onSelectPhoto(photo)}
                className="group cursor-pointer flex flex-col"
              >
                {/* 정사각형 사진 프레임 */}
                <div className="relative aspect-square w-full bg-[#F2EDE3] overflow-hidden">
                  <img
                    src={photo.url}
                    alt={photo.caption || ''}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                  />
                  {/* 호버 시 나타나는 테라코타 필 버튼 (re_ Add to cart + 스타일) */}
                  <div className="hidden sm:flex absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="w-full px-4 py-1.5 rounded-full bg-[#B64E2E] text-[#FBF8F3] text-xs font-medium flex items-center justify-between">
                      <span>크게 보기</span>
                      <span>+</span>
                    </span>
                  </div>
                </div>

                {/* 사진 하단 텍스트 & 필 태그 (re_ 색감: #8A442B / #B64E2E) */}
                <div className="pt-2.5 space-y-1.5">
                  <div className="text-sm sm:text-base font-medium text-[#8A442B] leading-snug truncate">
                    {photo.location || photo.caption || `${author.name}의 일상`}
                  </div>
                  <div className="text-xs sm:text-sm text-[#B64E2E]">
                    {formatKoreanDate(photo.takenAt)}
                  </div>
                  <div className="pt-1 flex flex-wrap gap-1.5">
                    <span className="px-2.5 py-0.5 rounded-full border border-[#B64E2E]/40 text-[#8A442B] text-[11px] sm:text-xs">
                      {author.name}
                    </span>
                    {author.city && (
                      <span className="px-2.5 py-0.5 rounded-full border border-[#B64E2E]/40 text-[#8A442B] text-[11px] sm:text-xs">
                        {author.city}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* 글과 함께 보기 (테두리 박스 없이 크림 배경 위에 얹힌 에디토리얼 레이아웃) */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-12 items-start">
          {feedPosts.map((postGroup) => {
            const { postId, slides } = postGroup;
            const currentSlideIdx = Math.min(
              slides.length - 1,
              slideIndices[postId] || 0
            );
            const activePhoto = slides[currentSlideIdx] || slides[0];
            const author = getMember(activePhoto.memberId);

            return (
              <article key={postId} className="space-y-3">
                {/* 1. 고화질 사진 슬라이드 */}
                <div
                  className="bg-[#F2EDE3] relative select-none"
                  onTouchStart={(e) => {
                    touchStartXRef.current[postId] = e.touches?.[0]?.clientX ?? null;
                  }}
                  onTouchEnd={(e) => {
                    const startX = touchStartXRef.current[postId];
                    const endX = e.changedTouches?.[0]?.clientX ?? null;
                    if (startX === null || endX === null || slides.length <= 1) return;
                    const diff = startX - endX;
                    if (Math.abs(diff) > 40) {
                      setSlideIndices((prev) => ({
                        ...prev,
                        [postId]:
                          diff > 0
                            ? Math.min(slides.length - 1, currentSlideIdx + 1)
                            : Math.max(0, currentSlideIdx - 1),
                      }));
                    }
                  }}
                >
                  <FramePhotoItem
                    photo={activePhoto}
                    isRepositionMode={false}
                    onSelectPhoto={onSelectPhoto}
                    onUpdatePhotoPosition={onUpdatePhotoPosition}
                    className="w-full aspect-[4/3]"
                  />

                  {slides.length > 1 && (
                    <>
                      <div className="absolute top-3.5 right-3.5 bg-[#B64E2E] text-[#FBF8F3] px-3 py-1 rounded-full text-xs font-medium">
                        {currentSlideIdx + 1} / {slides.length}
                      </div>

                      <button
                        type="button"
                        disabled={currentSlideIdx === 0}
                        onClick={() =>
                          setSlideIndices((prev) => ({
                            ...prev,
                            [postId]: Math.max(0, currentSlideIdx - 1),
                          }))
                        }
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-[#FBF8F3]/85 text-[#8A442B] disabled:opacity-0 flex items-center justify-center cursor-pointer transition-opacity"
                        aria-label="이전 사진"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>

                      <button
                        type="button"
                        disabled={currentSlideIdx >= slides.length - 1}
                        onClick={() =>
                          setSlideIndices((prev) => ({
                            ...prev,
                            [postId]: Math.min(slides.length - 1, currentSlideIdx + 1),
                          }))
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-[#FBF8F3]/85 text-[#8A442B] disabled:opacity-0 flex items-center justify-center cursor-pointer transition-opacity"
                        aria-label="다음 사진"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>

                {/* 2. 작성자·날짜·본문 (re_ 하단 캡션 & 필 태그 스타일) */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-base sm:text-lg font-medium text-[#8A442B]">
                      {author.name}
                      <span className="text-sm text-[#B64E2E] ml-2">
                        {formatKoreanDate(activePhoto.takenAt)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectPhoto && onSelectPhoto(activePhoto)}
                      className="px-3.5 py-1 rounded-full border border-[#B64E2E]/45 text-xs sm:text-sm text-[#8A442B] hover:border-[#B64E2E] cursor-pointer"
                    >
                      크게 보기 +
                    </button>
                  </div>

                  {activePhoto.caption && (
                    <p className="text-base sm:text-lg text-[#5E3422] leading-relaxed whitespace-pre-line">
                      {activePhoto.caption}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    <span className="px-3 py-0.5 rounded-full border border-[#B64E2E]/40 text-[#8A442B] text-xs">
                      {author.name}
                    </span>
                    {author.city && (
                      <span className="px-3 py-0.5 rounded-full border border-[#B64E2E]/40 text-[#8A442B] text-xs">
                        {author.city}
                      </span>
                    )}
                    {activePhoto.location && (
                      <span className="px-3 py-0.5 rounded-full border border-[#B64E2E]/40 text-[#8A442B] text-xs">
                        {activePhoto.location}
                      </span>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
