import React, { useState, useRef, useMemo } from 'react';
import {
  BookOpen,
  Download,
  Printer,
  Package,
  Check,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Loader2,
  X,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import BookPageRenderer from './BookPageRenderer';
import { buildPhotobookPages, filterPhotosByPeriod } from '../utils/bookLayoutEngine';

const DEFAULT_PUBLISHED_BOOKS = [
  {
    id: 'book-2026-annual',
    title: '2026년 우리 가족 사계절 사진첩',
    subtitle: '온 가족이 일 년 동안 함께 모은 사계절 추억 기록',
    periodType: 'annual',
    periodLabel: '2026년 연간',
    createdAt: '2026.11.01',
    status: '보관됨',
    bindingType: '양장 하드커버',
  },
  {
    id: 'book-2026-half1',
    title: '2026년 봄·여름 가족 사진첩',
    subtitle: '따뜻한 봄날부터 여름 가족 상봉까지의 순간들',
    periodType: 'half',
    halfYear: 'first',
    periodLabel: '2026년 상반기',
    createdAt: '2026.07.05',
    status: '보관됨',
    bindingType: '소프트커버',
  },
];

export default function FamilyLibraryView({
  photos = [],
  members = [],
  activeMemberId,
  bookSettings = {},
  onUpdateBookSettings,
  onSelectPhoto,
  onSwitchToStudio,
  showToast,
}) {
  const publishedBooks =
    Array.isArray(bookSettings.publishedBooks) && bookSettings.publishedBooks.length > 0
      ? bookSettings.publishedBooks
      : DEFAULT_PUBLISHED_BOOKS;

  const printOrders = Array.isArray(bookSettings.printOrders) ? bookSettings.printOrders : [];

  const [readingBookId, setReadingBookId] = useState(null);
  const [readerPageIndex, setReaderPageIndex] = useState(0);

  const [orderingBook, setOrderingBook] = useState(null);
  const [bindingOption, setBindingOption] = useState('hardcover');
  const [destinations, setDestinations] = useState([
    {
      id: 'lib-dest-1',
      householdLabel: '본가 (부모님 댁)',
      recipientName: '종록 아빠 · 영선 엄마',
      address: '부산 해운대구 본가',
      copies: 1,
    },
  ]);
  const [orderMemo, setOrderMemo] = useState('');

  const [exportingBookId, setExportingBookId] = useState(null);
  const [exportPdfSpec, setExportPdfSpec] = useState('digital-rgb');
  const [pdfProgress, setPdfProgress] = useState(null);
  const pdfContainerRef = useRef(null);

  const activeMember =
    members.find((m) => m.id === activeMemberId) ||
    members[0] || { name: '가족', city: '부산' };

  const totalOrderCopies = useMemo(
    () => destinations.reduce((sum, d) => sum + Math.max(1, Number(d.copies) || 1), 0),
    [destinations]
  );

  const getCompiledBook = (book) => {
    const bookPhotos = filterPhotosByPeriod(photos, {
      periodType: book.periodType || 'annual',
      year: book.year || 2026,
      halfYear: book.halfYear || 'first',
      month: book.month || 5,
      startDate: book.startDate || '',
      endDate: book.endDate || '',
      excludedPhotoIds: book.excludedPhotoIds || [],
    });
    const finalPhotos = bookPhotos.length > 0 ? bookPhotos : photos;
    const customSettings = {
      ...bookSettings,
      periodType: book.periodType || 'annual',
      year: book.year || 2026,
      halfYear: book.halfYear || 'first',
      selectedMonth: book.month || 5,
      startDate: book.startDate || '',
      endDate: book.endDate || '',
      familyTitle: book.title || bookSettings.familyTitle || '박서 오피스 — 우리 가족 사진첩',
      title: book.title || bookSettings.familyTitle || '박서 오피스 — 우리 가족 사진첩',
      koreanTitle: book.koreanTitle !== undefined ? book.koreanTitle : bookSettings.koreanTitle,
      subtitle: book.subtitle !== undefined ? book.subtitle : bookSettings.subtitle,
      coverLayout: book.coverLayout || bookSettings.coverLayout || 'classic-editorial',
      coverBgColor: book.coverBgColor || bookSettings.coverBgColor || '#FBF9F4',
      coverShowPhoto:
        book.coverShowPhoto !== undefined
          ? book.coverShowPhoto
          : bookSettings.coverShowPhoto !== false,
      coverHeaderLeft:
        book.coverHeaderLeft !== undefined ? book.coverHeaderLeft : bookSettings.coverHeaderLeft,
      coverHeaderRight:
        book.coverHeaderRight !== undefined ? book.coverHeaderRight : bookSettings.coverHeaderRight,
      coverPhotoUrl: book.coverPhotoUrl || bookSettings.coverPhotoUrl,
    };
    const pages = buildPhotobookPages(finalPhotos, members, customSettings, {});
    return { pages, finalPhotos, customSettings };
  };

  const readingBookObj = useMemo(() => {
    if (!readingBookId) return null;
    const found = publishedBooks.find((b) => b.id === readingBookId);
    if (!found) return null;
    return { book: found, ...getCompiledBook(found) };
  }, [readingBookId, publishedBooks, photos, members, bookSettings]);

  const exportingBookObj = useMemo(() => {
    if (!exportingBookId) return null;
    const found = publishedBooks.find((b) => b.id === exportingBookId);
    if (!found) return null;
    return { book: found, ...getCompiledBook(found) };
  }, [exportingBookId, publishedBooks, photos, members, bookSettings]);

  const handleStartPdfDownload = async (book, spec = 'digital-rgb') => {
    if (pdfProgress) return;
    const isPressBleed = spec === 'press-bleed';
    setExportPdfSpec(spec);
    setExportingBookId(book.id);

    setTimeout(async () => {
      if (!pdfContainerRef.current) {
        setExportingBookId(null);
        return;
      }
      const sheets = pdfContainerRef.current.querySelectorAll('.library-pdf-sheet');
      if (!sheets.length) {
        setExportingBookId(null);
        return;
      }

      setPdfProgress({ bookId: book.id, spec, current: 0, total: sheets.length });
      try {
        const pdfWidth = isPressBleed ? 216 : 210;
        const pdfHeight = isPressBleed ? 303 : 297;
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: isPressBleed ? [216, 303] : 'a4',
        });

        for (let i = 0; i < sheets.length; i++) {
          setPdfProgress({ bookId: book.id, spec, current: i + 1, total: sheets.length });
          const canvas = await html2canvas(sheets[i], {
            scale: isPressBleed ? 2.5 : 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#FBF9F4',
          });
          const imgData = canvas.toDataURL('image/jpeg', isPressBleed ? 0.96 : 0.92);
          if (i > 0) pdf.addPage(isPressBleed ? [216, 303] : 'a4', 'portrait');
          pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        }

        const specLabel = isPressBleed ? '인쇄용_300DPI' : '열람용_RGB';
        const safeName = `${book.title || '우리가족사진첩'}_${specLabel}.pdf`.replace(/\s+/g, '_');
        pdf.save(safeName);
        if (showToast) {
          showToast(`'${book.title}' PDF 파일이 저장되었습니다.`);
        }
      } catch (err) {
        console.error(err);
        window.print();
      } finally {
        setPdfProgress(null);
        setExportingBookId(null);
      }
    }, 280);
  };

  const handleOpenOrderModal = (book) => {
    setOrderingBook(book);
    setBindingOption('hardcover');
    setDestinations([
      {
        id: `lib-dest-${Date.now()}-1`,
        householdLabel: '본가 (부모님 댁)',
        recipientName: '종록 아빠 · 영선 엄마',
        address: '부산 본가',
        copies: 1,
      },
    ]);
  };

  const handleAddLibDestination = (preset = null) => {
    setDestinations((prev) => [
      ...prev,
      {
        id: `lib-dest-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        householdLabel: preset?.householdLabel || '추가 배송지',
        recipientName: preset?.recipientName || '',
        address: preset?.address || '',
        copies: 1,
      },
    ]);
  };

  const handleUpdateLibDestination = (destId, patch) => {
    setDestinations((prev) =>
      prev.map((d) => (d.id === destId ? { ...d, ...patch } : d))
    );
  };

  const handleRemoveLibDestination = (destId) => {
    setDestinations((prev) => (prev.length > 1 ? prev.filter((d) => d.id !== destId) : prev));
  };

  const handleSubmitPrintOrder = async (e) => {
    e.preventDefault();
    if (!orderingBook) return;

    const unitPrice = bindingOption === 'hardcover' ? 38000 : 24000;
    const bindingName =
      bindingOption === 'hardcover' ? '양장 하드커버' : '소프트커버';

    const summaryRecipient =
      destinations.length > 1
        ? `${destinations[0].householdLabel} 외 ${destinations.length - 1}곳`
        : `${destinations[0]?.householdLabel || ''} ${destinations[0]?.recipientName || activeMember.name}`;
    const summaryAddress = destinations
      .map((d) => `${d.householdLabel}(${d.address || '주소지'} · ${d.copies}권)`)
      .join(' / ');

    const newOrder = {
      id: `order-${Date.now()}`,
      bookId: orderingBook.id,
      bookTitle: orderingBook.title,
      bindingLabel: bindingName,
      quantity: totalOrderCopies,
      totalPrice: unitPrice * totalOrderCopies,
      recipientName: summaryRecipient,
      recipientAddress: summaryAddress,
      destinations,
      orderMemo: orderMemo.trim(),
      orderedBy: activeMember.name,
      orderedAt: new Date().toISOString().slice(0, 10),
      status: '인쇄 접수 완료',
      stepIndex: 0,
      courier: '우체국택배',
      trackingNumber: `6894-2026-${String(Date.now()).slice(-4)}`,
    };

    const nextOrders = [newOrder, ...printOrders];
    if (onUpdateBookSettings) {
      await onUpdateBookSettings({ printOrders: nextOrders });
    }
    if (showToast) {
      showToast(`'${orderingBook.title}' 실물 책자 ${totalOrderCopies}권 주문이 접수되었습니다.`);
    }
    setOrderingBook(null);
  };

  const handleDeleteBook = async (bookId) => {
    const nextBooks = publishedBooks.filter((b) => b.id !== bookId);
    if (onUpdateBookSettings) {
      await onUpdateBookSettings({ publishedBooks: nextBooks });
    }
    if (readingBookId === bookId) setReadingBookId(null);
    if (showToast) {
      showToast('선택한 사진첩이 서재에서 삭제되었습니다.');
    }
  };

  return (
    <div className="pb-12 space-y-8">
      {/* 1. 상단 서재 헤더 */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#B64E2E] tracking-tight">
            완성된 가족 사진첩 ({publishedBooks.length}권)
          </h2>
          <p className="text-sm sm:text-base text-[#8A442B] mt-0.5">
            언제든 크게 펼쳐보거나 PDF로 저장하고 실물 책자로 인쇄할 수 있습니다.
          </p>
        </div>

        <button
          type="button"
          onClick={onSwitchToStudio}
          className="px-5 py-2.5 bg-[#B64E2E] hover:bg-[#B04C2E] text-[#FBF8F3] rounded-full text-sm sm:text-base font-bold flex items-center justify-center gap-2 shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>새 사진첩 만들기 +</span>
        </button>
      </section>

      {/* 2. 펼쳐보기 뷰어 */}
      {readingBookObj && (
        <section className="bg-[#5E3422] text-[#FBF8F3] rounded-3xl p-5 sm:p-8 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-xs sm:text-sm text-[#CFC5A8]">
                {readingBookObj.book.periodLabel}
              </span>
              <h3 className="text-lg sm:text-xl font-bold mt-0.5">
                {readingBookObj.book.title}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setReadingBookId(null)}
              className="px-4 py-2 bg-[#FBF8F3]/15 hover:bg-[#FBF8F3]/25 text-[#FBF8F3] rounded-full text-sm font-bold cursor-pointer"
            >
              닫기
            </button>
          </div>

          <div className="bg-[#4A281A] rounded-2xl p-4 sm:p-8 flex justify-center">
            <div className="w-full max-w-[560px] aspect-[1/1.38] bg-[#FBF8F3] text-[#5E3422] shadow-2xl overflow-hidden">
              <BookPageRenderer
                page={readingBookObj.pages[readerPageIndex] || readingBookObj.pages[0]}
                members={members}
                bookSettings={readingBookObj.customSettings}
                side="single"
                onSelectPhoto={onSelectPhoto}
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 max-w-[560px] mx-auto">
            <button
              type="button"
              disabled={readerPageIndex === 0}
              onClick={() => setReaderPageIndex((p) => Math.max(0, p - 1))}
              className="px-5 py-2.5 bg-[#FBF8F3]/15 disabled:opacity-30 rounded-full text-sm sm:text-base font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
              <span>이전 쪽</span>
            </button>
            <span className="text-sm sm:text-base font-bold text-[#F2EDE3]">
              {readerPageIndex + 1} / {readingBookObj.pages.length}쪽
            </span>
            <button
              type="button"
              disabled={readerPageIndex >= readingBookObj.pages.length - 1}
              onClick={() =>
                setReaderPageIndex((p) => Math.min(readingBookObj.pages.length - 1, p + 1))
              }
              className="px-5 py-2.5 bg-[#FBF8F3]/15 disabled:opacity-30 rounded-full text-sm sm:text-base font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <span>다음 쪽</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </section>
      )}

      {/* 3. 보관된 사진첩 목록 (re_ 스타일 프레임 + 하단 캡션 & 알약 태그) */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10">
        {publishedBooks.map((book) => {
          const { pages, finalPhotos } = getCompiledBook(book);
          const coverImg =
            book.coverPhotoUrl ||
            finalPhotos[0]?.url ||
            bookSettings.coverPhotoUrl ||
            'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=1400&q=85';

          const isExportingThis = pdfProgress && pdfProgress.bookId === book.id;

          return (
            <div key={book.id} className="group flex flex-col justify-between">
              <div>
                {/* 정사각형 오트밀 타일 */}
                <div className="relative aspect-square bg-[#F2EDE3] p-5 sm:p-7 flex items-center justify-center overflow-hidden">
                  <img
                    src={coverImg}
                    alt={book.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                  />

                  {publishedBooks.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleDeleteBook(book.id)}
                      className="absolute top-3.5 right-3.5 p-2 rounded-full bg-[#5E3422]/65 hover:bg-[#B64E2E] text-[#FBF8F3] transition-colors cursor-pointer"
                      title="삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  {/* 하단 펼쳐보기 테라코타 알약 */}
                  <button
                    type="button"
                    onClick={() => {
                      setReadingBookId(book.id);
                      setReaderPageIndex(0);
                      window.scrollTo({ top: 80, behavior: 'smooth' });
                    }}
                    className="absolute bottom-4 left-5 right-5 py-2.5 px-4 rounded-full bg-[#B64E2E] hover:bg-[#B04C2E] text-[#FBF8F3] text-xs sm:text-sm font-bold flex items-center justify-between shadow-xs cursor-pointer"
                  >
                    <span>사진첩 크게 펼쳐보기</span>
                    <span>+</span>
                  </button>
                </div>

                {/* 하단 텍스트 및 알약 태그 */}
                <div className="pt-3.5 space-y-2">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-[#8A442B] leading-snug">
                      {book.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-[#B64E2E] mt-0.5 line-clamp-1">
                      {book.subtitle}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="px-2.5 py-0.5 rounded-full border border-[#B64E2E]/45 text-[11px] sm:text-xs font-medium text-[#8A442B]">
                      {book.periodLabel || '가족 사진첩'}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full border border-[#B64E2E]/45 text-[11px] sm:text-xs font-medium text-[#8A442B]">
                      사진 {finalPhotos.length}장
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full border border-[#B64E2E]/45 text-[11px] sm:text-xs font-medium text-[#8A442B]">
                      {pages.length}쪽
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full border border-[#B64E2E]/45 text-[11px] sm:text-xs font-medium text-[#8A442B]">
                      {book.createdAt || '2026.11'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 하단 보조 알약 버튼 2종 */}
              <div className="grid grid-cols-2 gap-2 pt-4">
                <button
                  type="button"
                  disabled={Boolean(pdfProgress)}
                  onClick={() => handleStartPdfDownload(book, 'digital-rgb')}
                  className="py-2.5 px-3 rounded-full bg-[#F2EDE3] hover:bg-[#E8E1D1] text-[#8A442B] text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isExportingThis && pdfProgress.spec === 'digital-rgb' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>
                        {pdfProgress.current}/{pdfProgress.total}
                      </span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>PDF 저장</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenOrderModal(book)}
                  className="py-2.5 px-3 rounded-full border border-[#B64E2E]/50 hover:bg-[#F2EDE3] text-[#B64E2E] text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Package className="w-4 h-4" />
                  <span>책자 인쇄 신청</span>
                </button>
              </div>
            </div>
          );
        })}
      </section>

      {/* 4. 인쇄 주문 내역 */}
      {printOrders.length > 0 && (
        <section className="bg-[#F2EDE3] rounded-3xl p-5 sm:p-7 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-bold text-[#8A442B]">
              실물 책자 주문 내역 ({printOrders.length}건)
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {printOrders.map((ord) => (
              <div key={ord.id} className="bg-[#FBF8F3] rounded-2xl p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-[#5E3422]">{ord.bookTitle}</span>
                  <span className="px-2.5 py-0.5 rounded-full border border-[#B64E2E]/45 text-xs font-bold text-[#B64E2E]">
                    {ord.status}
                  </span>
                </div>
                <div className="text-xs sm:text-sm text-[#8A442B]">
                  {ord.bindingLabel} · {ord.quantity}권 · {ord.recipientName}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 5. 실물 책자 인쇄 주문 모달 */}
      {orderingBook && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#5E3422]/50 p-0 sm:p-4">
          <div className="bg-[#FBF8F3] rounded-t-3xl sm:rounded-3xl w-full max-w-[480px] p-5 sm:p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 border-b border-[#E6DEC8] pb-3.5">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[#B64E2E]">
                  실물 책자 인쇄 신청
                </h3>
                <p className="text-xs sm:text-sm text-[#8A442B] mt-0.5">
                  {orderingBook.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOrderingBook(null)}
                className="p-1 text-[#A69B80] hover:text-[#5E3422] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPrintOrder} className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setBindingOption('hardcover')}
                  className={`p-3.5 rounded-2xl text-left cursor-pointer transition-colors ${
                    bindingOption === 'hardcover'
                      ? 'bg-[#B64E2E] text-[#FBF8F3]'
                      : 'bg-[#F2EDE3] text-[#5E3422]'
                  }`}
                >
                  <div className="text-xs sm:text-sm font-bold">양장 하드커버</div>
                  <div className="text-[11px] opacity-80 mt-0.5">38,000원 / 권</div>
                </button>
                <button
                  type="button"
                  onClick={() => setBindingOption('softcover')}
                  className={`p-3.5 rounded-2xl text-left cursor-pointer transition-colors ${
                    bindingOption === 'softcover'
                      ? 'bg-[#B64E2E] text-[#FBF8F3]'
                      : 'bg-[#F2EDE3] text-[#5E3422]'
                  }`}
                >
                  <div className="text-xs sm:text-sm font-bold">소프트커버</div>
                  <div className="text-[11px] opacity-80 mt-0.5">24,000원 / 권</div>
                </button>
              </div>

              <div className="bg-[#F2EDE3] rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-bold text-[#8A442B]">
                    배송지 및 수량 (총 {totalOrderCopies}권)
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAddLibDestination()}
                    className="text-xs font-bold text-[#B64E2E] underline cursor-pointer"
                  >
                    + 배송지 추가
                  </button>
                </div>

                {destinations.map((dest, idx) => (
                  <div
                    key={dest.id}
                    className="p-3 rounded-xl bg-[#FBF8F3] space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#8A442B]">
                        배송지 {idx + 1}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateLibDestination(dest.id, {
                              copies: Math.max(1, (dest.copies || 1) - 1),
                            })
                          }
                          className="w-6 h-6 rounded-full bg-[#F2EDE3] text-xs font-bold text-[#5E3422] cursor-pointer"
                        >
                          -
                        </button>
                        <span className="text-xs font-bold text-[#5E3422] px-1">
                          {dest.copies}권
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateLibDestination(dest.id, {
                              copies: Math.min(20, (dest.copies || 1) + 1),
                            })
                          }
                          className="w-6 h-6 rounded-full bg-[#F2EDE3] text-xs font-bold text-[#5E3422] cursor-pointer"
                        >
                          +
                        </button>
                        {destinations.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveLibDestination(dest.id)}
                            className="text-[11px] text-[#A69B80] hover:text-[#B64E2E] ml-1 cursor-pointer"
                          >
                            삭제
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <input
                        type="text"
                        value={dest.householdLabel}
                        onChange={(e) =>
                          handleUpdateLibDestination(dest.id, {
                            householdLabel: e.target.value,
                          })
                        }
                        placeholder="가구 구분 (예: 본가)"
                        className="bg-[#F2EDE3] rounded-lg px-2.5 py-1.5 text-xs text-[#5E3422] focus:outline-none"
                      />
                      <input
                        type="text"
                        value={dest.recipientName}
                        onChange={(e) =>
                          handleUpdateLibDestination(dest.id, {
                            recipientName: e.target.value,
                          })
                        }
                        placeholder="받는 분 성함"
                        className="bg-[#F2EDE3] rounded-lg px-2.5 py-1.5 text-xs text-[#5E3422] focus:outline-none"
                      />
                    </div>
                    <input
                      type="text"
                      value={dest.address}
                      onChange={(e) =>
                        handleUpdateLibDestination(dest.id, {
                          address: e.target.value,
                        })
                      }
                      placeholder="배송 주소지"
                      className="w-full bg-[#F2EDE3] rounded-lg px-2.5 py-1.5 text-xs text-[#5E3422] focus:outline-none"
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between py-2 border-t border-[#E6DEC8]">
                <span className="text-xs sm:text-sm font-medium text-[#8A442B]">총 인쇄 비용</span>
                <span className="text-base sm:text-lg font-bold text-[#B64E2E]">
                  {(
                    (bindingOption === 'hardcover' ? 38000 : 24000) * totalOrderCopies
                  ).toLocaleString()}
                  원
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setOrderingBook(null)}
                  className="flex-1 py-3 rounded-full border border-[#B64E2E]/45 text-xs sm:text-sm font-bold text-[#8A442B] cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-2 py-3 px-4 rounded-full bg-[#B64E2E] hover:bg-[#B04C2E] text-[#FBF8F3] text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>주문 신청하기</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Offscreen PDF Export Container */}
      <div
        ref={pdfContainerRef}
        aria-hidden="true"
        style={{
          position: 'fixed',
          left: '-10000px',
          top: 0,
          width: '794px',
          pointerEvents: 'none',
          zIndex: -1,
        }}
      >
        {exportingBookObj &&
          exportingBookObj.pages.map((pg) => (
            <div
              key={`lib-pdf-${pg.id}`}
              className="library-pdf-sheet"
              style={{ width: '794px', height: '1123px', overflow: 'hidden' }}
            >
              <BookPageRenderer
                page={pg}
                members={members}
                bookSettings={exportingBookObj.customSettings}
                side="single"
                isPrint={true}
                printSpec={exportPdfSpec}
              />
            </div>
          ))}
      </div>
    </div>
  );
}
