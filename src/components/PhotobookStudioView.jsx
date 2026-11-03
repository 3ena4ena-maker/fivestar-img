import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  BookOpen,
  FileText,
  LayoutGrid,
  SlidersHorizontal,
  Download,
  Printer,
  Loader2,
  Check,
  Move,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import BookPageRenderer from './BookPageRenderer';

export default function PhotobookStudioView({
  pages = [],
  members = [],
  bookSettings = {},
  onUpdateBookSettings,
  onSelectPhoto,
  onCycleVariant,
  onUpdatePhotoPosition,
}) {
  // 'spread' (2-page) | 'single' (1-page) | 'grid' (all pages overview)
  const [viewType, setViewType] = useState('spread');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRepositionMode, setIsRepositionMode] = useState(false);
  const [showCoverEditor, setShowCoverEditor] = useState(false);
  const [titleInput, setTitleInput] = useState(bookSettings.title || '');
  const [koreanTitleInput, setKoreanTitleInput] = useState(bookSettings.koreanTitle || '');
  const [subtitleInput, setSubtitleInput] = useState(bookSettings.subtitle || '');
  const [epilogueInput, setEpilogueInput] = useState(bookSettings.epilogueNote || '');
  const [pdfProgress, setPdfProgress] = useState(null); // null or { current, total }

  const pdfExportContainerRef = useRef(null);

  useEffect(() => {
    setTitleInput(bookSettings.title || '');
    setKoreanTitleInput(bookSettings.koreanTitle || '');
    setSubtitleInput(bookSettings.subtitle || '');
    setEpilogueInput(bookSettings.epilogueNote || '');
  }, [bookSettings]);

  // Build 2-page spreads for 'spread' mode:
  // Spread 0: Cover alone on right (or Cover + Prologue side-by-side so it's immediately rich!)
  // Let's pair pages [0,1], [2,3], [4,5]... so every spread shows two full pages side by side!
  const spreads = [];
  for (let i = 0; i < pages.length; i += 2) {
    spreads.push({
      left: pages[i],
      right: pages[i + 1] || null,
      spreadIndex: spreads.length,
    });
  }

  const maxIndex = viewType === 'spread' ? Math.max(0, spreads.length - 1) : Math.max(0, pages.length - 1);

  useEffect(() => {
    if (currentIndex > maxIndex) {
      setCurrentIndex(maxIndex);
    }
  }, [maxIndex, currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowRight') {
        setCurrentIndex((prev) => Math.min(maxIndex, prev + 1));
      } else if (e.key === 'ArrowLeft') {
        setCurrentIndex((prev) => Math.max(0, prev - 1));
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [maxIndex]);

  const handleSaveCoverText = async (e) => {
    e.preventDefault();
    await onUpdateBookSettings({
      title: titleInput,
      koreanTitle: koreanTitleInput,
      subtitle: subtitleInput,
      epilogueNote: epilogueInput,
    });
    setShowCoverEditor(false);
  };

  // High-resolution PDF export of all pages
  const handleDownloadPdf = async () => {
    if (!pdfExportContainerRef.current || pdfProgress) return;
    const sheetElements = pdfExportContainerRef.current.querySelectorAll('.pdf-render-sheet');
    if (!sheetElements.length) return;

    setPdfProgress({ current: 0, total: sheetElements.length });

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      for (let i = 0; i < sheetElements.length; i++) {
        setPdfProgress({ current: i + 1, total: sheetElements.length });
        const el = sheetElements[i];
        const canvas = await html2canvas(el, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor:
            bookSettings.paperTheme === 'white'
              ? '#FFFFFF'
              : bookSettings.paperTheme === 'stone'
              ? '#F3F1EC'
              : '#FBF9F4',
        });
        const imgData = canvas.toDataURL('image/jpeg', 0.92);
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
      }

      const fileName = `${bookSettings.year || 2026}_가족포토북_${
        bookSettings.koreanTitle || '사계절기록'
      }.pdf`.replace(/\s+/g, '_');
      pdf.save(fileName);
    } catch (err) {
      console.error('PDF generation failed:', err);
      window.print();
    } finally {
      setPdfProgress(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Studio Control Toolbar */}
      <div className="bg-white border border-[#141413]/12 p-4 flex flex-wrap items-center justify-between gap-4 shadow-xs">
        {/* Left: View Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex border border-[#141413]/15 bg-[#F3F1EC] p-0.5">
            <button
              type="button"
              onClick={() => {
                setViewType('spread');
                setCurrentIndex(0);
              }}
              className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors ${
                viewType === 'spread'
                  ? 'bg-[#141413] text-[#FAF9F6]'
                  : 'text-[#5A5852] hover:text-[#141413]'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>양면 펼침북</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setViewType('single');
                setCurrentIndex(0);
              }}
              className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors ${
                viewType === 'single'
                  ? 'bg-[#141413] text-[#FAF9F6]'
                  : 'text-[#5A5852] hover:text-[#141413]'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>단면 보기</span>
            </button>
            <button
              type="button"
              onClick={() => setViewType('grid')}
              className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors ${
                viewType === 'grid'
                  ? 'bg-[#141413] text-[#FAF9F6]'
                  : 'text-[#5A5852] hover:text-[#141413]'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>전체 {pages.length}p 한눈에</span>
            </button>
          </div>

          {/* Layout Density Selector */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[11px] font-mono-meta text-[#71706B] hidden sm:inline">
              페이지당 사진 수:
            </span>
            <select
              value={bookSettings.layoutDensity || 'ten-per-page'}
              onChange={(e) => onUpdateBookSettings({ layoutDensity: e.target.value })}
              className="bg-[#FAF9F6] border border-[#141413]/15 px-2.5 py-1.5 text-xs font-medium cursor-pointer"
            >
              <option value="ten-per-page">한 페이지 10장 내외 (월별 한눈에 · 기본)</option>
              <option value="six-per-page">한 페이지 6장 내외 (미디엄 앨범형)</option>
              <option value="editorial">한 페이지 1~4장 (여유로운 화보형)</option>
            </select>
          </div>

          {/* Paper Tone Selector */}
          <div className="flex items-center gap-1.5 text-xs">
            <select
              value={bookSettings.paperTheme || 'ivory'}
              onChange={(e) => onUpdateBookSettings({ paperTheme: e.target.value })}
              className="bg-[#FAF9F6] border border-[#141413]/15 px-2.5 py-1.5 text-xs font-medium cursor-pointer"
            >
              <option value="ivory">용지: 웜 아이보리 코튼지</option>
              <option value="white">용지: 순백 갤러리 매거진지</option>
              <option value="stone">용지: 모던 스톤 그레이</option>
            </select>
          </div>

          {/* Monthly Divider Toggle */}
          <label className="inline-flex items-center gap-1.5 text-xs text-[#2C2B29] cursor-pointer select-none px-2 py-1 bg-[#F3F1EC] border border-[#141413]/10">
            <input
              type="checkbox"
              checked={Boolean(bookSettings.includeMonthDividers)}
              onChange={(e) =>
                onUpdateBookSettings({ includeMonthDividers: e.target.checked })
              }
              className="accent-[#141413]"
            />
            <span>월별 표지 간지 추가</span>
          </label>
        </div>

        {/* Right: Reposition Mode, Cover Editor & PDF / Print Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsRepositionMode((prev) => !prev)}
            className={`px-3 py-1.5 border text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
              isRepositionMode
                ? 'bg-amber-400 text-[#141413] border-amber-500 shadow-xs'
                : 'bg-[#FAF9F6] text-[#141413] border-[#141413]/25 hover:border-[#141413]'
            }`}
          >
            <Move className="w-3.5 h-3.5" />
            <span>{isRepositionMode ? '사진 위치 조절 완료' : '사진 위치·크기 조절'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCoverEditor(!showCoverEditor)}
            className="px-3 py-1.5 border border-[#141413]/20 hover:border-[#141413] text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors bg-[#FAF9F6]"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>표지·문구 편집</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-1.5 border border-[#141413]/20 hover:border-[#141413] text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors bg-white"
            title="브라우저 인쇄 대화상자에서 고해상도 PDF 저장 또는 프린터 인쇄"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">인쇄 / 북 프린트</span>
          </button>

          <button
            type="button"
            disabled={ Boolean(pdfProgress) }
            onClick={handleDownloadPdf}
            className="px-4 py-1.5 bg-[#141413] text-[#FAF9F6] hover:bg-[#2C2B29] text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-60"
          >
            {pdfProgress ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>
                  PDF 조판 중 ({pdfProgress.current}/{pdfProgress.total}p)...
                </span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>포토북 PDF 다운로드</span>
              </>
            )}
          </button>
        </div>
      </div>

      {isRepositionMode && (
        <div className="bg-[#141413] text-[#FAF9F6] px-4 py-2.5 text-xs flex flex-wrap items-center justify-between gap-2 border border-amber-400/50">
          <div className="flex items-center gap-2">
            <Move className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>사진 위치 조절 모드 활성화됨:</strong> 포토북 페이지의 어떤 사진이든 마우스나 손가락으로 <strong>드래그하여 프레임 내 위치를 이동</strong>하고, 사진 하단의 <strong>+ / - 버튼으로 확대·축소</strong>하세요. (놓는 즉시 자동 저장됩니다)
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsRepositionMode(false)}
            className="px-3 py-1 bg-amber-400 text-[#141413] font-bold text-xs rounded-xs cursor-pointer"
          >
            위치 조절 마치기
          </button>
        </div>
      )}

      {/* Collapsible Book Cover & Epilogue Editor */}
      {showCoverEditor && (
        <form
          onSubmit={handleSaveCoverText}
          className="bg-[#F3F1EC] border border-[#141413]/15 p-5 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-[#141413]/10 pb-2">
            <span className="text-xs font-semibold text-[#141413]">
              포토북 표지 타이틀 & 에필로그 문구 커스텀
            </span>
            <span className="text-[11px] text-[#71706B]">
              표지 사진은 어떤 사진이든 클릭 후 ‘포토북 표지로 설정’을 누르면 변경됩니다
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-mono-meta text-[#5A5852] mb-1">
                영문 메인 타이틀 (Cover Header)
              </label>
              <input
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                className="w-full bg-white border border-[#141413]/15 px-3 py-1.5 text-xs font-editorial-en"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono-meta text-[#5A5852] mb-1">
                한국어 책 제목
              </label>
              <input
                type="text"
                value={koreanTitleInput}
                onChange={(e) => setKoreanTitleInput(e.target.value)}
                className="w-full bg-white border border-[#141413]/15 px-3 py-1.5 text-xs font-editorial-ko"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono-meta text-[#5A5852] mb-1">
                부제 (Subtitle)
              </label>
              <input
                type="text"
                value={subtitleInput}
                onChange={(e) => setSubtitleInput(e.target.value)}
                className="w-full bg-white border border-[#141413]/15 px-3 py-1.5 text-xs font-editorial-ko"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-mono-meta text-[#5A5852] mb-1">
              프롤로그 · 에필로그 가족 헌사 문구
            </label>
            <textarea
              rows={2}
              value={epilogueInput}
              onChange={(e) => setEpilogueInput(e.target.value)}
              className="w-full bg-white border border-[#141413]/15 p-2.5 text-xs font-editorial-ko"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCoverEditor(false)}
              className="px-3 py-1.5 text-xs text-[#5A5852] cursor-pointer"
            >
              닫기
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-[#141413] text-[#FAF9F6] text-xs font-medium flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>포토북에 반영하기</span>
            </button>
          </div>
        </form>
      )}

      {/* VIEW MODE 1: 2-PAGE SPREAD FLIPBOOK */}
      {viewType === 'spread' && spreads[currentIndex] && (
        <div className="flex flex-col items-center">
          {/* Book Stage */}
          <div className="w-full max-w-6xl mx-auto relative flex items-center justify-center py-2">
            {/* Previous Spread Button */}
            <button
              type="button"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              className="hidden xl:flex absolute -left-14 z-10 w-10 h-10 rounded-full bg-white border border-[#141413]/15 items-center justify-center text-[#141413] hover:bg-[#141413] hover:text-[#FAF9F6] disabled:opacity-25 transition-all cursor-pointer shadow-sm"
              title="이전 페이지 (←)"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Open 2-Page Spread Container */}
            <div className="w-full grid grid-cols-1 lg:grid-cols-2 book-spread-shadow bg-[#E6E4DD] border border-[#141413]/15 overflow-hidden">
              {/* Left Page */}
              <div className="aspect-[1/1.36] w-full border-b lg:border-b-0 lg:border-r border-[#141413]/12 overflow-hidden">
                <BookPageRenderer
                  page={spreads[currentIndex].left}
                  members={members}
                  bookSettings={bookSettings}
                  side="left"
                  onSelectPhoto={onSelectPhoto}
                  onCycleVariant={onCycleVariant}
                  onUpdatePhotoPosition={onUpdatePhotoPosition}
                  isRepositionMode={isRepositionMode}
                  onToggleRepositionMode={() => setIsRepositionMode((p) => !p)}
                />
              </div>

              {/* Right Page */}
              <div className="aspect-[1/1.36] w-full overflow-hidden">
                {spreads[currentIndex].right ? (
                  <BookPageRenderer
                    page={spreads[currentIndex].right}
                    members={members}
                    bookSettings={bookSettings}
                    side="right"
                    onSelectPhoto={onSelectPhoto}
                    onCycleVariant={onCycleVariant}
                    onUpdatePhotoPosition={onUpdatePhotoPosition}
                    isRepositionMode={isRepositionMode}
                    onToggleRepositionMode={() => setIsRepositionMode((p) => !p)}
                  />
                ) : (
                  <div className="w-full h-full paper-ivory book-spine-right flex flex-col items-center justify-center p-10 text-center">
                    <span className="font-mono-meta text-[10px] tracking-[0.25em] text-[#8E8A80] uppercase">
                      END OF SPREAD · FIVESTAR FAMILY PRESS
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Next Spread Button */}
            <button
              type="button"
              disabled={currentIndex >= maxIndex}
              onClick={() => setCurrentIndex((prev) => Math.min(maxIndex, prev + 1))}
              className="hidden xl:flex absolute -right-14 z-10 w-10 h-10 rounded-full bg-white border border-[#141413]/15 items-center justify-center text-[#141413] hover:bg-[#141413] hover:text-[#FAF9F6] disabled:opacity-25 transition-all cursor-pointer shadow-sm"
              title="다음 페이지 (→)"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Spread Pagination Bar & Page Thumbnails Strip */}
          <div className="mt-5 flex flex-col items-center gap-3 w-full max-w-4xl">
            <div className="flex items-center gap-4">
              <button
                type="button"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                className="px-3.5 py-1.5 bg-white border border-[#141413]/15 text-xs font-medium flex items-center gap-1 disabled:opacity-35 hover:bg-[#141413] hover:text-[#FAF9F6] transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>이전 펼침면</span>
              </button>

              <span className="font-mono-meta text-xs text-[#2C2B29]">
                SPREAD <strong>{currentIndex + 1}</strong> / {spreads.length} (P.{' '}
                {spreads[currentIndex].left.pageNumber}
                {spreads[currentIndex].right
                  ? `–${spreads[currentIndex].right.pageNumber}`
                  : ''}{' '}
                of {pages.length})
              </span>

              <button
                type="button"
                disabled={currentIndex >= maxIndex}
                onClick={() => setCurrentIndex((prev) => Math.min(maxIndex, prev + 1))}
                className="px-3.5 py-1.5 bg-white border border-[#141413]/15 text-xs font-medium flex items-center gap-1 disabled:opacity-35 hover:bg-[#141413] hover:text-[#FAF9F6] transition-colors cursor-pointer"
              >
                <span>다음 펼침면</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Spread Navigator Dots */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
              {spreads.map((sp, idx) => {
                const active = idx === currentIndex;
                const label =
                  idx === 0
                    ? '표지·서문'
                    : sp.left.month
                    ? `${sp.left.month}월`
                    : `P.${sp.left.pageNumber}`;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={`px-2.5 py-1 text-[11px] font-mono-meta border transition-all cursor-pointer ${
                      active
                        ? 'bg-[#141413] text-[#FAF9F6] border-[#141413]'
                        : 'bg-white text-[#5A5852] border-[#141413]/12 hover:border-[#141413]/40'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: SINGLE PAGE VIEW */}
      {viewType === 'single' && pages[currentIndex] && (
        <div className="flex flex-col items-center">
          <div className="w-full max-w-2xl aspect-[1/1.38] book-spread-shadow border border-[#141413]/15 overflow-hidden">
            <BookPageRenderer
              page={pages[currentIndex]}
              members={members}
              bookSettings={bookSettings}
              side="single"
              onSelectPhoto={onSelectPhoto}
              onCycleVariant={onCycleVariant}
              onUpdatePhotoPosition={onUpdatePhotoPosition}
              isRepositionMode={isRepositionMode}
              onToggleRepositionMode={() => setIsRepositionMode((p) => !p)}
            />
          </div>

          <div className="mt-5 flex items-center gap-4">
            <button
              type="button"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              className="px-4 py-1.5 bg-white border border-[#141413]/15 text-xs font-medium disabled:opacity-35 cursor-pointer"
            >
              ← 이전 페이지
            </button>
            <span className="font-mono-meta text-xs">
              PAGE <strong>{currentIndex + 1}</strong> / {pages.length}
            </span>
            <button
              type="button"
              disabled={currentIndex >= pages.length - 1}
              onClick={() => setCurrentIndex((prev) => Math.min(pages.length - 1, prev + 1))}
              className="px-4 py-1.5 bg-white border border-[#141413]/15 text-xs font-medium disabled:opacity-35 cursor-pointer"
            >
              다음 페이지 →
            </button>
          </div>
        </div>
      )}

      {/* VIEW MODE 3: ALL PAGES OVERVIEW GRID */}
      {viewType === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {pages.map((pg, idx) => (
            <div key={pg.id} className="flex flex-col">
              <div className="mb-1.5 flex items-center justify-between text-[11px] font-mono-meta text-[#71706B]">
                <span>
                  PAGE {String(pg.pageNumber).padStart(2, '0')} ·{' '}
                  {pg.type === 'cover'
                    ? '표지 (COVER)'
                    : pg.type === 'prologue'
                    ? '프롤로그 (INDEX)'
                    : pg.type === 'month-divider'
                    ? `${pg.month}월 간지`
                    : pg.type === 'colophon'
                    ? '에필로그 (COLOPHON)'
                    : `${pg.month}월 화보 (${pg.photos?.length || 0}장)`}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setViewType('spread');
                    setCurrentIndex(Math.floor(idx / 2));
                  }}
                  className="text-[#8C5A3C] hover:underline cursor-pointer"
                >
                  펼침뷰로 열기 →
                </button>
              </div>
              <div className="aspect-[1/1.38] border border-[#141413]/15 shadow-md overflow-hidden">
                <BookPageRenderer
                  page={pg}
                  members={members}
                  bookSettings={bookSettings}
                  side="single"
                  onSelectPhoto={onSelectPhoto}
                  onCycleVariant={onCycleVariant}
                  onUpdatePhotoPosition={onUpdatePhotoPosition}
                  isRepositionMode={isRepositionMode}
                  onToggleRepositionMode={() => setIsRepositionMode((p) => !p)}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hidden Offscreen High-Res Sheets for PDF Generation */}
      <div
        ref={pdfExportContainerRef}
        className="fixed -left-[9999px] top-0 pointer-events-none"
        aria-hidden="true"
      >
        {pages.map((pg) => (
          <div
            key={`pdf-${pg.id}`}
            className="pdf-render-sheet"
            style={{ width: '794px', height: '1123px' }}
          >
            <BookPageRenderer
              page={pg}
              members={members}
              bookSettings={bookSettings}
              side="single"
              isPrint={true}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
