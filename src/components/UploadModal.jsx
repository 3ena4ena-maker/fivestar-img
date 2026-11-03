import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Calendar,
  MapPin,
  Camera,
  Star,
  Sparkles,
  CheckCircle2,
  Trash2,
  Loader2,
} from 'lucide-react';
import { extractPhotoMetadata, MONTH_META } from '../utils/bookLayoutEngine';

export default function UploadModal({
  isOpen,
  onClose,
  members = [],
  activeMemberId,
  onUploadSuccess,
}) {
  const [selectedMemberId, setSelectedMemberId] = useState(
    activeMemberId || members[0]?.id || 'member-first'
  );
  const [items, setItems] = useState([]);
  const [batchLocation, setBatchLocation] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFilesSelected = async (fileList) => {
    const files = Array.from(fileList || []).filter((f) => f.type.startsWith('image/'));
    if (files.length === 0) return;

    setIsParsing(true);
    setErrorMsg('');

    try {
      const parsedItems = await Promise.all(
        files.map(async (file) => {
          const meta = await extractPhotoMetadata(file);
          return {
            tempId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            file,
            previewUrl: meta.previewUrl,
            dateStr: meta.dateStr,
            takenAt: meta.takenAt,
            width: meta.width,
            height: meta.height,
            exif: meta.exif,
            location: batchLocation || '',
            caption: '',
            isFavorite: false,
          };
        })
      );
      setItems((prev) => [...prev, ...parsedItems]);
    } catch (err) {
      console.error(err);
      setErrorMsg('사진 메타데이터를 읽는 중 문제가 발생했습니다.');
    } finally {
      setIsParsing(false);
    }
  };

  const updateItem = (tempId, patch) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.tempId !== tempId) return item;
        const updated = { ...item, ...patch };
        if (patch.dateStr) {
          updated.takenAt = `${patch.dateStr}T12:00:00.000Z`;
        }
        return updated;
      })
    );
  };

  const removeItem = (tempId) => {
    setItems((prev) => prev.filter((i) => i.tempId !== tempId));
  };

  const applyBatchLocation = () => {
    if (!batchLocation.trim()) return;
    setItems((prev) => prev.map((item) => ({ ...item, location: batchLocation.trim() })));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (items.length === 0) return;

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const formData = new FormData();
      const metadataPayload = items.map((item) => ({
        takenAt: item.takenAt,
        dateStr: item.dateStr,
        memberId: selectedMemberId,
        location: item.location.trim(),
        caption: item.caption.trim(),
        width: item.width,
        height: item.height,
        exif: item.exif,
        isFavorite: item.isFavorite,
      }));

      items.forEach((item) => {
        formData.append('files', item.file);
      });
      formData.append('metadata', JSON.stringify(metadataPayload));

      const res = await fetch('/api/photos', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || '업로드 실패');
      }

      const data = await res.json();
      setItems([]);
      onUploadSuccess(data.allPhotos, data.photos);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || '사진 업로드 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#141413]/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-[#FAF9F6] border border-[#141413]/15 w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-[#141413]/12 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono-meta uppercase tracking-[0.22em] text-[#8C5A3C]">
              ARCHIVE NEW MOMENTS · EXIF AUTO-SORT
            </span>
            <h2 className="mt-0.5 font-editorial-ko text-xl font-semibold text-[#141413]">
              가족 추억 사진 올리기
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#71706B] hover:text-[#141413] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Step 1: Select Family Member & Batch Location */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-[#F3F1EC] p-4 border border-[#141413]/10">
            <div className="md:col-span-7">
              <label className="block text-[11px] font-mono-meta uppercase tracking-wider text-[#5A5852] mb-2">
                1. 누가 올리는 사진인가요? (가족 구성원 태그)
              </label>
              <div className="flex flex-wrap gap-2">
                {members.map((m) => {
                  const active = selectedMemberId === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedMemberId(m.id)}
                      className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 border transition-all cursor-pointer ${
                        active
                          ? 'bg-[#141413] text-[#FAF9F6] border-[#141413] shadow-xs'
                          : 'bg-[#FAF9F6] text-[#2C2B29] border-[#141413]/15 hover:border-[#141413]/40'
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: active ? '#FAF9F6' : m.color }}
                      />
                      <span>{m.name}</span>
                      <span className="text-[10px] opacity-70">({m.city})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="md:col-span-5">
              <label className="block text-[11px] font-mono-meta uppercase tracking-wider text-[#5A5852] mb-2">
                2. 촬영 장소 일괄 입력 (선택)
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={batchLocation}
                  onChange={(e) => setBatchLocation(e.target.value)}
                  placeholder="예: 강릉 본가 마당, 제주 협재해변"
                  className="flex-1 bg-[#FAF9F6] border border-[#141413]/15 px-3 py-1.5 text-xs focus:outline-none focus:border-[#141413]"
                />
                {items.length > 0 && (
                  <button
                    type="button"
                    onClick={applyBatchLocation}
                    className="px-3 py-1.5 bg-[#141413]/10 hover:bg-[#141413] hover:text-[#FAF9F6] text-xs font-medium transition-colors cursor-pointer shrink-0"
                  >
                    전체 적용
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Step 2: Dropzone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFilesSelected(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[#141413]/25 hover:border-[#141413] bg-[#FFFFFF] p-7 text-center cursor-pointer transition-all group"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleFilesSelected(e.target.files)}
              className="hidden"
            />
            <div className="w-11 h-11 rounded-full bg-[#F3F1EC] group-hover:bg-[#141413] group-hover:text-[#FAF9F6] flex items-center justify-center mx-auto transition-colors">
              {isParsing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Upload className="w-5 h-5" />
              )}
            </div>
            <p className="mt-3 font-editorial-ko text-sm font-medium text-[#141413]">
              클릭하거나 사진을 이곳으로 끌어다 놓으세요 (여러 장 동시 업로드 가능)
            </p>
            <p className="mt-1 text-xs text-[#71706B]">
              사진의 <strong className="text-[#141413]">EXIF 촬영 날짜·카메라 정보·가로세로 비율</strong>을 자동으로 읽어 해당 월의 포토북 페이지에 자동 배치합니다.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs">
              {errorMsg}
            </div>
          )}

          {/* Step 3: Preview & Per-photo EXIF Date / Story Editor */}
          {items.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#141413]/12 pb-2">
                <span className="text-xs font-semibold text-[#141413]">
                  업로드 대기 중인 사진 ({items.length}장) — 날짜순 자동 배치 미리보기
                </span>
                <span className="text-[11px] text-[#71706B]">
                  ★ 하이라이트 지정 시 포토북 단독/메인 화보로 우선 배치됩니다
                </span>
              </div>

              <div className="space-y-3">
                {items.map((item) => {
                  const monthNum = new Date(item.takenAt).getMonth() + 1 || 1;
                  const mMeta = MONTH_META[monthNum] || MONTH_META[1];

                  return (
                    <div
                      key={item.tempId}
                      className="grid grid-cols-1 sm:grid-cols-12 gap-4 bg-white p-4 border border-[#141413]/12 items-start"
                    >
                      {/* Thumbnail */}
                      <div className="sm:col-span-3 relative aspect-[4/3] bg-[#F3F1EC] overflow-hidden border border-[#141413]/10">
                        <img
                          src={item.previewUrl}
                          alt="preview"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-1.5 left-1.5 bg-[#141413]/80 text-[#FAF9F6] px-1.5 py-0.5 text-[9px] font-mono-meta">
                          {item.width}×{item.height}
                        </span>
                      </div>

                      {/* Metadata & Inputs */}
                      <div className="sm:col-span-9 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#E6EFEA] text-[#3B5249] text-[10px] font-medium">
                              <CheckCircle2 className="w-3 h-3" />
                              {item.exif.source}
                            </span>
                            <span className="text-[11px] font-mono-meta text-[#8C5A3C] font-medium">
                              → {monthNum}월 챕터 ({mMeta.en}) 자동 배정
                            </span>
                            {item.exif?.camera && (
                              <span className="text-[10px] font-mono-meta text-[#71706B] flex items-center gap-1">
                                <Camera className="w-3 h-3" />
                                {item.exif.camera}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                updateItem(item.tempId, { isFavorite: !item.isFavorite })
                              }
                              className={`px-2.5 py-1 text-[11px] flex items-center gap-1 border transition-colors cursor-pointer ${
                                item.isFavorite
                                  ? 'bg-[#141413] text-[#FAF9F6] border-[#141413]'
                                  : 'bg-[#FAF9F6] text-[#5A5852] border-[#141413]/15'
                              }`}
                            >
                              <Star
                                className={`w-3 h-3 ${item.isFavorite ? 'fill-amber-400 text-amber-400' : ''}`}
                              />
                              <span>메인 화보</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => removeItem(item.tempId)}
                              className="p-1.5 text-[#71706B] hover:text-red-600 transition-colors cursor-pointer"
                              title="목록에서 제거"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[10px] font-mono-meta text-[#71706B] mb-1">
                              촬영 날짜 (자동 인식됨 · 수정 가능)
                            </label>
                            <div className="relative">
                              <input
                                type="date"
                                value={item.dateStr}
                                onChange={(e) =>
                                  updateItem(item.tempId, { dateStr: e.target.value })
                                }
                                className="w-full bg-[#FAF9F6] border border-[#141413]/15 px-2.5 py-1.5 text-xs font-mono-meta focus:outline-none focus:border-[#141413]"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[10px] font-mono-meta text-[#71706B] mb-1">
                              촬영 장소
                            </label>
                            <input
                              type="text"
                              value={item.location}
                              onChange={(e) =>
                                updateItem(item.tempId, { location: e.target.value })
                              }
                              placeholder="예: 강릉 경포해변, 서울 연남동"
                              className="w-full bg-[#FAF9F6] border border-[#141413]/15 px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#141413]"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-mono-meta text-[#71706B] mb-1">
                            포토북에 수록될 한 줄 일기 / 코멘트
                          </label>
                          <textarea
                            rows={2}
                            value={item.caption}
                            onChange={(e) =>
                              updateItem(item.tempId, { caption: e.target.value })
                            }
                            placeholder="그날의 분위기나 가족들에게 전하고 싶은 짧은 이야기를 적어주세요..."
                            className="w-full bg-[#FAF9F6] border border-[#141413]/15 p-2.5 text-xs font-editorial-ko focus:outline-none focus:border-[#141413]"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#141413]/12 bg-[#F3F1EC] flex items-center justify-between">
          <span className="text-xs text-[#5A5852]">
            {items.length > 0
              ? `총 ${items.length}장의 사진이 촬영일 순으로 포토북에 자동 레이아웃됩니다.`
              : '사진을 선택하면 촬영 날짜(EXIF)가 자동으로 인식됩니다.'}
          </span>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[#5A5852] hover:text-[#141413] cursor-pointer"
            >
              취소
            </button>
            <button
              type="button"
              disabled={items.length === 0 || isSubmitting}
              onClick={handleSubmit}
              className="px-5 py-2.5 bg-[#141413] text-[#FAF9F6] text-xs font-medium tracking-wide hover:bg-[#2C2B29] disabled:opacity-40 flex items-center gap-2 cursor-pointer transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>포토북 레이아웃 생성 중...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>아카이브 및 포토북에 등록하기 ({items.length}장)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
