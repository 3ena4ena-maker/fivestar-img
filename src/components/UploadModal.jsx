import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Trash2,
  Loader2,
} from 'lucide-react';
import { extractPhotoMetadata } from '../utils/bookLayoutEngine';

export default function UploadModal({
  isOpen,
  onClose,
  members = [],
  activeMemberId,
  onUploadSuccess,
}) {
  const activeMember =
    members.find((m) => m.id === activeMemberId) ||
    members[0] || { id: 'member-first', name: '가족', city: '' };
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
            file: meta.optimizedFile || file,
            previewUrl: meta.previewUrl,
            dateStr: meta.dateStr,
            takenAt: meta.takenAt,
            uploadedAt: meta.uploadedAt || new Date().toISOString(),
            width: meta.width,
            height: meta.height,
            exif: meta.exif,
            dualResolution: meta.dualResolution,
            location: batchLocation || '',
            caption: '',
            isFavorite: false,
          };
        })
      );
      setItems((prev) => [...prev, ...parsedItems]);
    } catch (err) {
      console.error(err);
      setErrorMsg('사진을 불러오는 중 문제가 발생했습니다.');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (items.length === 0) return;

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const formData = new FormData();
      const metadataPayload = items.map((item) => ({
        takenAt: item.takenAt,
        uploadedAt: item.uploadedAt || new Date().toISOString(),
        dateStr: item.dateStr,
        memberId: activeMember.id,
        location: item.location.trim() || batchLocation.trim(),
        caption: item.caption.trim(),
        width: item.width,
        height: item.height,
        exif: item.exif,
        dualResolution: item.dualResolution,
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#5E3422]/55 p-0 sm:p-4">
      <div className="bg-[#FBF8F3] rounded-t-3xl sm:rounded-3xl w-full max-w-[480px] max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E6DEC8] flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-[#B64E2E]">사진 올리기</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[#A69B80] hover:text-[#5E3422] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* 사진 선택 영역 */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFilesSelected(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            className="border border-dashed border-[#B64E2E]/40 hover:border-[#B64E2E] rounded-2xl bg-[#F2EDE3] p-6 text-center cursor-pointer transition-colors"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleFilesSelected(e.target.files)}
              className="hidden"
            />
            <div className="w-10 h-10 rounded-full bg-[#B64E2E] flex items-center justify-center mx-auto text-[#FBF8F3]">
              {isParsing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
            </div>
            <p className="mt-2.5 text-sm font-bold text-[#8A442B]">
              사진첩에서 사진 선택하기 (여러 장 가능)
            </p>
            <p className="mt-0.5 text-xs text-[#A69B80]">
              찍은 날짜가 자동으로 기록됩니다
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 bg-[#F4E5DF] rounded-xl text-[#B64E2E] text-xs font-medium">
              {errorMsg}
            </div>
          )}

          {/* 선택된 사진 목록 */}
          {items.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#8A442B]">
                  선택된 사진 ({items.length}장)
                </span>
                <input
                  type="text"
                  value={batchLocation}
                  onChange={(e) => setBatchLocation(e.target.value)}
                  placeholder="장소 입력 (선택)"
                  className="bg-[#F2EDE3] rounded-full px-3 py-1 text-xs text-[#5E3422] w-36 focus:outline-none"
                />
              </div>

              <div className="space-y-2.5">
                {items.map((item) => (
                  <div
                    key={item.tempId}
                    className="flex gap-3 bg-[#F2EDE3] p-3 rounded-2xl items-start"
                  >
                    <img
                      src={item.previewUrl}
                      alt=""
                      className="w-20 h-20 rounded-xl object-cover bg-[#E8E1D1] shrink-0"
                    />
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="date"
                          value={item.dateStr}
                          onChange={(e) =>
                            updateItem(item.tempId, { dateStr: e.target.value })
                          }
                          className="bg-[#FBF8F3] rounded-lg px-2 py-1 text-[11px] font-medium text-[#5E3422]"
                        />
                        <button
                          type="button"
                          onClick={() => removeItem(item.tempId)}
                          className="p-1 text-[#A69B80] hover:text-[#B64E2E] cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <textarea
                        rows={2}
                        value={item.caption}
                        onChange={(e) =>
                          updateItem(item.tempId, { caption: e.target.value })
                        }
                        placeholder="사진에 대한 짧은 이야기를 적어주세요"
                        className="w-full bg-[#FBF8F3] rounded-xl p-2 text-xs text-[#5E3422] focus:outline-none resize-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[#E6DEC8] bg-[#FBF8F3] flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-full border border-[#B64E2E]/45 text-xs sm:text-sm font-bold text-[#8A442B] cursor-pointer"
          >
            취소
          </button>
          <button
            type="button"
            disabled={items.length === 0 || isSubmitting}
            onClick={handleSubmit}
            className="flex-2 py-2.5 px-4 rounded-full bg-[#B64E2E] hover:bg-[#B04C2E] text-[#FBF8F3] text-xs sm:text-sm font-bold disabled:opacity-40 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>올리는 중...</span>
              </>
            ) : (
              <span>게시하기 ({items.length}장) +</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
