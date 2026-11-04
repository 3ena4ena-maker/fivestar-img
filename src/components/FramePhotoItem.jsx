import React, { useState, useRef, useEffect } from 'react';
import {
  Move,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Check,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

export function getPhotoFrameStyle(photo, override = null) {
  const cropX = override?.cropX ?? (typeof photo?.cropX === 'number' ? photo.cropX : 50);
  const cropY = override?.cropY ?? (typeof photo?.cropY === 'number' ? photo.cropY : 50);
  const rawZoom = override?.cropZoom ?? (typeof photo?.cropZoom === 'number' ? photo.cropZoom : 1);

  const dxFromCenter = 50 - cropX; // -50 .. +50
  const dyFromCenter = 50 - cropY; // -50 .. +50
  const isMoved = Math.abs(dxFromCenter) > 0.2 || Math.abs(dyFromCenter) > 0.2;

  // 상하좌우 이동 시 프레임 가장자리 빈 공간이 보이지 않도록 이동량에 비례한 최소 배율 자동 확보
  const maxPan = Math.max(Math.abs(dxFromCenter), Math.abs(dyFromCenter)); // 0 .. 50
  const minZoomForPan = 1 + (maxPan / 50) * 0.75;
  const effectiveZoom = Math.max(rawZoom, isMoved ? minZoomForPan : 1);

  // 실제 화면 이동 비율 (-35% ~ +35%)
  const tx = (dxFromCenter * 0.68) / effectiveZoom;
  const ty = (dyFromCenter * 0.68) / effectiveZoom;

  return {
    objectPosition: `${cropX.toFixed(1)}% ${cropY.toFixed(1)}%`,
    transform:
      effectiveZoom > 1.001 || isMoved
        ? `scale(${effectiveZoom.toFixed(3)}) translate(${tx.toFixed(2)}%, ${ty.toFixed(2)}%)`
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

  const latestPosRef = useRef(pos);
  const dragStartRef = useRef(null);

  useEffect(() => {
    if (!dragging) {
      const synced = {
        cropX: typeof photo?.cropX === 'number' ? photo.cropX : 50,
        cropY: typeof photo?.cropY === 'number' ? photo.cropY : 50,
        cropZoom: typeof photo?.cropZoom === 'number' ? photo.cropZoom : 1,
      };
      setPos(synced);
      latestPosRef.current = synced;
    }
  }, [photo?.id, photo?.cropX, photo?.cropY, photo?.cropZoom, dragging]);

  const activeEdit = !isPrint && (isRepositionMode || localEditing);

  const clamp = (val, min, max) => Math.min(max, Math.max(min, val));

  const savePosition = (nextPos) => {
    latestPosRef.current = nextPos;
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
      startX: latestPosRef.current.cropX,
      startY: latestPosRef.current.cropY,
      startZoom: latestPosRef.current.cropZoom,
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

    const { clientX, clientY, width, height, startX, startY } = dragStartRef.current;
    const dx = e.clientX - clientX;
    const dy = e.clientY - clientY;

    const sensitivity = 100;
    const nextX = clamp(startX - (dx / width) * sensitivity, 0, 100);
    const nextY = clamp(startY - (dy / height) * sensitivity, 0, 100);

    const updated = {
      ...latestPosRef.current,
      cropX: nextX,
      cropY: nextY,
    };
    latestPosRef.current = updated;
    setPos(updated);
  };

  const handlePointerUp = (e) => {
    if (!dragging) return;
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    dragStartRef.current = null;
    savePosition(latestPosRef.current);
  };

  const handleNudge = (e, deltaX, deltaY) => {
    e.preventDefault();
    e.stopPropagation();
    const cur = latestPosRef.current;
    const nextPos = {
      ...cur,
      cropX: clamp(Number((cur.cropX + deltaX).toFixed(1)), 0, 100),
      cropY: clamp(Number((cur.cropY + deltaY).toFixed(1)), 0, 100),
    };
    setPos(nextPos);
    savePosition(nextPos);
  };

  const handleZoomDelta = (e, delta) => {
    e.preventDefault();
    e.stopPropagation();
    const cur = latestPosRef.current;
    const nextZoom = clamp(Number((cur.cropZoom + delta).toFixed(2)), 1, 3.0);
    const nextPos = { ...cur, cropZoom: nextZoom };
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
      className={`relative overflow-hidden bg-[#E6DEC8] select-none ${
        activeEdit
          ? dragging
            ? 'cursor-grabbing ring-2 ring-[#B64E2E] touch-none'
            : 'cursor-grab ring-2 ring-[#B64E2E]/70 touch-none'
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
            ? 'group-hover:scale-[1.02] transition-transform duration-500'
            : ''
        }`}
      />

      {/* Normal Children Overlays */}
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
          title="사진 확대·축소 및 상하좌우 위치 조절"
          className="opacity-0 group-hover:opacity-100 absolute top-2 right-2 z-10 bg-[#B64E2E] hover:bg-[#B04C2E] text-[#FBF8F3] px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 transition-opacity cursor-pointer shadow-sm"
        >
          <Move className="w-3 h-3" />
          <span>위치 조절</span>
        </button>
      )}

      {/* Active Repositioning Controls Overlay (드래그 + 상하좌우 화살표 + 확대/축소) */}
      {activeEdit && (
        <div
          data-crop-control="true"
          onClick={(e) => e.stopPropagation()}
          className="absolute inset-x-1.5 bottom-1.5 z-20 flex flex-wrap items-center justify-between gap-1 bg-[#5E3422]/90 backdrop-blur-xs text-[#FBF8F3] px-2 py-1.5 rounded-xl text-[10px] shadow-lg"
        >
          {/* 좌우·상하 이동 버튼 */}
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={(e) => handleNudge(e, -8, 0)}
              title="오른쪽으로 이동 (왼쪽 보기)"
              className="p-1 hover:bg-white/20 rounded cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => handleNudge(e, 0, -8)}
              title="아래로 이동 (위쪽 보기)"
              className="p-1 hover:bg-white/20 rounded cursor-pointer"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => handleNudge(e, 0, 8)}
              title="위로 이동 (아래쪽 보기)"
              className="p-1 hover:bg-white/20 rounded cursor-pointer"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => handleNudge(e, 8, 0)}
              title="왼쪽으로 이동 (오른쪽 보기)"
              className="p-1 hover:bg-white/20 rounded cursor-pointer"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 확대 / 축소 / 초기화 버튼 */}
          <div className="flex items-center gap-1 ml-auto">
            <button
              type="button"
              onClick={(e) => handleZoomDelta(e, -0.15)}
              title="축소"
              className="p-1 hover:bg-white/20 rounded cursor-pointer"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono-meta text-[9px] font-bold px-0.5">
              {Math.round(pos.cropZoom * 100)}%
            </span>
            <button
              type="button"
              onClick={(e) => handleZoomDelta(e, 0.15)}
              title="확대"
              className="p-1 hover:bg-white/20 rounded cursor-pointer"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleReset}
              title="위치 초기화"
              className="p-1 hover:bg-white/20 rounded cursor-pointer text-[#CFC5A8] hover:text-white"
            >
              <RotateCcw className="w-3 h-3" />
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
                className="ml-0.5 px-2 py-0.5 bg-[#B64E2E] text-[#FBF8F3] font-bold rounded-full flex items-center gap-0.5 cursor-pointer"
              >
                <Check className="w-3 h-3" />
                <span>완료</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
