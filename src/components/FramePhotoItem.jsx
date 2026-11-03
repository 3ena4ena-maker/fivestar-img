import React, { useState, useRef, useEffect } from 'react';
import { Move, ZoomIn, ZoomOut, RotateCcw, Check } from 'lucide-react';

export function getPhotoFrameStyle(photo, override = null) {
  const cropX = override?.cropX ?? (typeof photo?.cropX === 'number' ? photo.cropX : 50);
  const cropY = override?.cropY ?? (typeof photo?.cropY === 'number' ? photo.cropY : 50);
  const rawZoom = override?.cropZoom ?? (typeof photo?.cropZoom === 'number' ? photo.cropZoom : 1);
  const isMoved = Math.abs(cropX - 50) > 0.5 || Math.abs(cropY - 50) > 0.5;
  const effectiveZoom = Math.max(rawZoom, isMoved ? 1.18 : 1);
  const shiftFactor = (effectiveZoom - 1) * 0.78;
  const tx = ((50 - cropX) * shiftFactor).toFixed(2);
  const ty = ((50 - cropY) * shiftFactor).toFixed(2);

  return {
    objectPosition: `${cropX.toFixed(1)}% ${cropY.toFixed(1)}%`,
    transform:
      effectiveZoom > 1.001
        ? `translate(${tx}%, ${ty}%) scale(${effectiveZoom.toFixed(3)})`
        : undefined,
    transformOrigin: 'center center',
  };
}

export default function FramePhotoItem({
  photo,
  className = '',
  isRepositionMode = false,
  isPrint = false,
  onSelectPhoto,
  onUpdatePhotoPosition,
  children,
}) {
  const containerRef = useRef(null);
  const [localEditing, setLocalEditing] = useState(false);
  const [dragging, setDragging] = useState(false);

  const [pos, setPos] = useState({
    cropX: typeof photo?.cropX === 'number' ? photo.cropX : 50,
    cropY: typeof photo?.cropY === 'number' ? photo.cropY : 50,
    cropZoom: typeof photo?.cropZoom === 'number' ? photo.cropZoom : 1,
  });

  const dragStartRef = useRef(null);

  useEffect(() => {
    if (!dragging) {
      setPos({
        cropX: typeof photo?.cropX === 'number' ? photo.cropX : 50,
        cropY: typeof photo?.cropY === 'number' ? photo.cropY : 50,
        cropZoom: typeof photo?.cropZoom === 'number' ? photo.cropZoom : 1,
      });
    }
  }, [photo?.id, photo?.cropX, photo?.cropY, photo?.cropZoom, dragging]);

  const activeEdit = !isPrint && (isRepositionMode || localEditing);

  const clamp = (val, min, max) => Math.min(max, Math.max(min, val));

  const savePosition = (nextPos) => {
    if (onUpdatePhotoPosition && photo?.id) {
      onUpdatePhotoPosition(photo.id, {
        cropX: Number(nextPos.cropX.toFixed(1)),
        cropY: Number(nextPos.cropY.toFixed(1)),
        cropZoom: Number(nextPos.cropZoom.toFixed(2)),
      });
    }
  };

  const handlePointerDown = (e) => {
    if (!activeEdit) return;
    // Ignore clicks on control buttons inside overlay
    if (e.target.closest('[data-crop-control="true"]')) return;

    e.preventDefault();
    e.stopPropagation();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    setDragging(true);
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      width: Math.max(80, rect.width),
      height: Math.max(80, rect.height),
      startX: pos.cropX,
      startY: pos.cropY,
      startZoom: pos.cropZoom,
    };

    if (e.currentTarget.setPointerCapture) {
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  const handlePointerMove = (e) => {
    if (!dragging || !dragStartRef.current) return;
    e.preventDefault();
    e.stopPropagation();

    const { clientX, clientY, width, height, startX, startY, startZoom } = dragStartRef.current;
    const dx = e.clientX - clientX;
    const dy = e.clientY - clientY;

    // Sensitivity scales inversely with zoom so dragging feels 1:1 with finger/cursor
    const sensitivity = 115 / Math.max(1, startZoom * 0.85);
    const nextX = clamp(startX - (dx / width) * sensitivity, 0, 100);
    const nextY = clamp(startY - (dy / height) * sensitivity, 0, 100);

    setPos((prev) => ({
      ...prev,
      cropX: nextX,
      cropY: nextY,
    }));
  };

  const handlePointerUp = (e) => {
    if (!dragging) return;
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    dragStartRef.current = null;
    savePosition(pos);
  };

  const handleZoomDelta = (e, delta) => {
    e.preventDefault();
    e.stopPropagation();
    const nextZoom = clamp(Number((pos.cropZoom + delta).toFixed(2)), 1, 2.5);
    const nextPos = { ...pos, cropZoom: nextZoom };
    setPos(nextPos);
    savePosition(nextPos);
  };

  const handleReset = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const resetPos = { cropX: 50, cropY: 50, cropZoom: 1 };
    setPos(resetPos);
    savePosition(resetPos);
  };

  const imgStyle = getPhotoFrameStyle(photo, pos);

  return (
    <div
      ref={containerRef}
      onClick={(e) => {
        if (activeEdit) {
          e.stopPropagation();
          return;
        }
        if (onSelectPhoto) onSelectPhoto(photo);
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={`relative overflow-hidden bg-[#E6E4DD] select-none ${
        activeEdit
          ? dragging
            ? 'cursor-grabbing ring-2 ring-amber-400'
            : 'cursor-grab ring-1 ring-[#141413]/40'
          : 'cursor-pointer group'
      } ${className}`}
    >
      <img
        src={photo.url}
        alt={photo.caption || '가족 사진'}
        crossOrigin="anonymous"
        draggable={false}
        style={imgStyle}
        className={`w-full h-full object-cover pointer-events-none ${
          !activeEdit && !dragging
            ? 'group-hover:scale-[1.03] transition-transform duration-500'
            : ''
        }`}
      />

      {/* Normal Children Overlays (Date Stamp, Member Badge) */}
      {children}

      {/* Quick Hover Button to Enter Position Adjust Mode on this Photo */}
      {!isPrint && !activeEdit && onUpdatePhotoPosition && (
        <button
          type="button"
          data-crop-control="true"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setLocalEditing(true);
          }}
          title="프레임 안에서 사진을 드래그하여 위치를 조절합니다"
          className="opacity-0 group-hover:opacity-100 absolute top-1 right-1 z-10 bg-[#141413]/80 hover:bg-[#141413] text-[#FAF9F6] px-1.5 py-0.5 rounded-xs text-[8.5px] font-medium flex items-center gap-0.5 transition-opacity cursor-pointer shadow-xs"
        >
          <Move className="w-2.5 h-2.5 text-amber-300" />
          <span>위치조절</span>
        </button>
      )}

      {/* Active Repositioning Controls Overlay */}
      {activeEdit && (
        <div
          data-crop-control="true"
          onClick={(e) => e.stopPropagation()}
          className="absolute inset-x-1 bottom-1 z-20 flex items-center justify-between gap-1 bg-[#141413]/85 backdrop-blur-xs text-[#FAF9F6] px-1.5 py-1 rounded-xs text-[9px] shadow-md"
        >
          <span className="flex items-center gap-1 truncate text-amber-300 font-medium">
            <Move className="w-2.5 h-2.5 shrink-0" />
            <span className="truncate">드래그 이동</span>
          </span>

          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onClick={(e) => handleZoomDelta(e, -0.15)}
              title="축소"
              className="p-0.5 hover:bg-white/20 rounded-xs cursor-pointer"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <span className="font-mono-meta text-[8px] px-0.5">
              {Math.round(pos.cropZoom * 100)}%
            </span>
            <button
              type="button"
              onClick={(e) => handleZoomDelta(e, 0.15)}
              title="확대"
              className="p-0.5 hover:bg-white/20 rounded-xs cursor-pointer"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={handleReset}
              title="위치 초기화"
              className="p-0.5 hover:bg-white/20 rounded-xs cursor-pointer text-white/80 hover:text-white"
            >
              <RotateCcw className="w-2.5 h-2.5" />
            </button>
            {localEditing && !isRepositionMode && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setLocalEditing(false);
                }}
                title="위치 조절 완료"
                className="ml-0.5 px-1.5 py-0.2 bg-amber-400 text-[#141413] font-bold rounded-xs flex items-center gap-0.5 cursor-pointer"
              >
                <Check className="w-2.5 h-2.5" />
                <span>완료</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
