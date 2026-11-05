import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Download,
  Printer,
  Loader2,
  Check,
  Move,
  SlidersHorizontal,
  X,
  ImagePlus,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import BookPageRenderer from './BookPageRenderer';
import {
  buildPhotobookPages,
  filterPhotosByPeriod,
  DEFAULT_MONTHLY_HIGHLIGHTS,
} from '../utils/bookLayoutEngine';

const COVER_LAYOUT_OPTIONS = [
  {
    id: 'magz-editorial',
    label: '빅 매거진형 (MAGZ)',
    desc: '초대형 세리프 타이틀 · 하단 사각 배지',
    tag: '매거진',
  },
  {
    id: 'lifestyle-journal',
    label: '라이프스타일 이슈형',
    desc: '상단 3단 칼럼 요약 · 하단 화보 · 바코드',
    tag: '매거진',
  },
  {
    id: 'stay-green-trio',
    label: '3단 스트립 매거진형',
    desc: '세로 3분할 사진 스트립 · 하단 컬러 배너',
    tag: '3장 수록',
  },
  {
    id: 'full-bleed',
    label: '풀 프레임형 (Full Photo)',
    desc: '표지 전체를 가족 대표 사진으로 가득 채움',
    tag: '인기 1위',
  },
  {
    id: 'polaroid-frame',
    label: '폴라로이드 / 액자형',
    desc: '배경색 위 중앙 폴라로이드 액자와 손글씨 감성',
    tag: '감성 액자',
  },
  {
    id: 'typography-cover',
    label: '타이포그래피 중심형',
    desc: '사진 없이 단색 배경과 큼직한 타이포 디자인',
    tag: '타이포 전용',
  },
  {
    id: 'multi-collage',
    label: '멀티 콜라주형 (2×2·3×3)',
    desc: '정방형 칸에 대표 순간 4~9장을 한눈에 모음',
    tag: '다중 사진',
  },
  {
    id: 'classic-editorial',
    label: '클래식 화보집형',
    desc: '단정한 상단 헤더와 중앙 화보 프레임',
    tag: '단행본',
  },
  {
    id: 'custom-upload',
    label: '직접 만든 표지 올리기 +',
    desc: '내 기기에서 표지 사진 등록 · 드래그 크기 조절',
    tag: '직접 등록',
  },
];

const COVER_BG_COLORS = [
  { label: '크림 아이보리', hex: '#FBF8F3' },
  { label: '웜 오트밀', hex: '#CFC5A8' },
  { label: '토프 스톤', hex: '#A69B80' },
  { label: '올리브 엄버', hex: '#7E7763' },
  { label: '오커 모스', hex: '#806E43' },
  { label: '웜 슬레이트', hex: '#757166' },
  { label: '더스티 로즈', hex: '#B87B72' },
  { label: '테라코타 러스트', hex: '#B64E2E' },
  { label: '코랄 테라코타', hex: '#CD6E50' },
  { label: '시나몬 클레이', hex: '#A3573E' },
  { label: '딥 포레스트 그린', hex: '#2F3E35' },
  { label: '딥 네이비', hex: '#233042' },
];

const PERIOD_PRODUCTS = [
  {
    id: 'trip',
    categoryLabel: '여행',
    title: '여행 사진첩',
    dateMethod: '시작일 ~ 종료일 선택',
    designFeatures: '일차별 타임라인 · 여행지 표지 · 단체컷 배치',
    scenarioPresets: [
      { label: '가족 여행', title: '2026 온 가족 여행 기록' },
      { label: '명절 고향 방문', title: '2026 명절 부산 본가 가족 상봉' },
      { label: '기념일 여행', title: '부모님 기념 가족 여행 화보집' },
    ],
    designPrice: 19000,
  },
  {
    id: 'month',
    categoryLabel: '월간',
    title: '월간 사진첩',
    dateMethod: '연도 · 월 선택 (1개월)',
    designFeatures: '주차별 일상 하이라이트 · 가족 댓글 수록',
    scenarioPresets: [
      { label: '아이 성장 기록', title: '우리 아이 이달의 성장 일기' },
      { label: '이달의 가족 일상', title: '온 가족이 함께한 한 달의 기록' },
    ],
    designPrice: 15000,
  },
  {
    id: 'half',
    categoryLabel: '반기',
    title: '반기 결산 사진첩',
    dateMethod: '상반기(1~6월) / 하반기(7~12월)',
    designFeatures: '계절 챕터 구분 · 월별 대표 사진 그리드',
    scenarioPresets: [
      { label: '상·하반기 결산', title: '2026 반기 우리 가족 사진첩' },
      { label: '학기별 성장 기록', title: '2026 학기별 우리 아이 성장 기록' },
    ],
    designPrice: 29000,
  },
  {
    id: 'annual',
    categoryLabel: '연간',
    title: '연간 가족 사진첩',
    dateMethod: '연도 전체 (1~12월)',
    designFeatures: '연대기 화보집 · 연간 목차 및 가족 총평 수록',
    scenarioPresets: [
      { label: '연말 가족 선물', title: '2026 우리 가족 사계절 사진첩' },
      { label: '연간 가족사', title: '2026년 우리 가족 일 년의 기록' },
    ],
    designPrice: 45000,
  },
];

export default function PhotobookStudioView({
  photos = [],
  members = [],
  activeMemberId,
  bookSettings = {},
  pageVariants = {},
  onUpdateBookSettings,
  onSelectPhoto,
  onCycleVariant,
  onUpdatePhotoPosition,
  onPublishBookToLibrary,
}) {
  const [viewType, setViewType] = useState('single');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRepositionMode, setIsRepositionMode] = useState(false);
  const [showCoverPhotoPicker, setShowCoverPhotoPicker] = useState(false);
  const [showCoverEditor, setShowCoverEditor] = useState(true);
  const [showPhotoSelector, setShowPhotoSelector] = useState(false);
  // 모바일 전용: 01 / 02 / 03 섹션 열기·닫기 아코디언 상태 (웹 lg 이상에서는 항상 모두 펼쳐짐)
  const [mobileOpenSection, setMobileOpenSection] = useState(null);

  const [periodType, setPeriodType] = useState('annual');
  const [selectedYear, setSelectedYear] = useState(bookSettings.year || 2026);
  const [halfYear, setHalfYear] = useState('first');
  const [selectedMonth, setSelectedMonth] = useState(5);
  const [tripStartDate, setTripStartDate] = useState('2026-05-01');
  const [tripEndDate, setTripEndDate] = useState('2026-08-31');
  const [tripDestinationTitle, setTripDestinationTitle] = useState(
    '2026 여름 부산·남해 가족 여행'
  );
  const [bestGroupPhotoId, setBestGroupPhotoId] = useState('');
  const [tocHeaderLeft, setTocHeaderLeft] = useState(
    bookSettings.tocHeaderLeft !== undefined
      ? bookSettings.tocHeaderLeft
      : '우리 가족 사진첩 목차 · 1월~12월 하이라이트'
  );
  const [tocHeaderRight, setTocHeaderRight] = useState(
    bookSettings.tocHeaderRight !== undefined
      ? bookSettings.tocHeaderRight
      : '2026년 연간 가족사'
  );
  const [tocSubTitle, setTocSubTitle] = useState(
    bookSettings.tocSubTitle !== undefined
      ? bookSettings.tocSubTitle
      : '연간 가족사 화보집 · 사계절 목차'
  );
  const [tocTitle, setTocTitle] = useState(
    bookSettings.tocTitle !== undefined
      ? bookSettings.tocTitle
      : '멀리 떨어져 있어도 같은 계절을 건너는 우리들의 기록'
  );
  const [annualReviewNote, setAnnualReviewNote] = useState(
    bookSettings.annualReviewNote !== undefined
      ? bookSettings.annualReviewNote
      : '각자의 도시에서 매달 사진과 안부를 나누며 함께 걸어온 2026년 우리 가족의 사계절 기록입니다.'
  );
  const [customBookTitle, setCustomBookTitle] = useState('');
  const [designerNote, setDesignerNote] = useState(
    '부모님이 보시기 편하도록 사진과 날짜·글씨를 시원하고 깔끔하게 배치해 주세요.'
  );

  const [excludedPhotoIds, setExcludedPhotoIds] = useState([]);
  const [dateMatchMode, setDateMatchMode] = useState('exif-first');
  const [pdfRenderSpec, setPdfRenderSpec] = useState('digital-rgb');

  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [packageOption, setPackageOption] = useState('pdf-and-print');
  const [podBindingType, setPodBindingType] = useState('hardcover');
  const [paymentChoice, setPaymentChoice] = useState('등록된 대표 카드 결제');
  const [destinations, setDestinations] = useState([
    {
      id: 'dest-1',
      householdLabel: '본가 (부모님 댁)',
      recipientName: '종록 아빠 · 영선 엄마',
      address: '부산 해운대구 본가',
      copies: 1,
    },
    {
      id: 'dest-2',
      householdLabel: '형제·자녀 가구',
      recipientName: '첫째 수영 · 첫째 사우 샘',
      address: '서울 마포구 자택',
      copies: 1,
    },
  ]);

  const [familyTitleInput, setFamilyTitleInput] = useState(
    bookSettings.familyTitle || bookSettings.title || '박서 오피스 — 우리 가족 사진첩'
  );
  const [koreanTitleInput, setKoreanTitleInput] = useState(
    bookSettings.koreanTitle || '각자의 계절, 하나의 시간'
  );
  const [subtitleInput, setSubtitleInput] = useState(
    bookSettings.subtitle || '온 가족이 함께 모으는 소중한 일상 기록'
  );
  const [epilogueInput, setEpilogueInput] = useState(bookSettings.epilogueNote || '');

  // 표지 디자인 8종 · 배경색 · 사진 유무 · 상단 좌/우 문구 상태
  const [coverLayout, setCoverLayout] = useState(
    bookSettings.coverLayout || 'magz-editorial'
  );
  const [coverBgColor, setCoverBgColor] = useState(
    bookSettings.coverBgColor || '#FBF8F3'
  );
  const [coverShowPhoto, setCoverShowPhoto] = useState(
    bookSettings.coverShowPhoto !== false
  );
  const [customCoverShowText, setCustomCoverShowText] = useState(
    Boolean(bookSettings.customCoverShowText)
  );
  const [coverHeaderLeftInput, setCoverHeaderLeftInput] = useState(
    bookSettings.coverHeaderLeft !== undefined
      ? bookSettings.coverHeaderLeft
      : '2026 FAMILY ARCHIVE'
  );
  const [coverHeaderRightInput, setCoverHeaderRightInput] = useState(
    bookSettings.coverHeaderRight !== undefined
      ? bookSettings.coverHeaderRight
      : '우리 가족 사계절 기록'
  );
  const [customCoverPhotoUrl, setCustomCoverPhotoUrl] = useState(
    bookSettings.coverPhotoUrl || ''
  );
  const [coverCropX, setCoverCropX] = useState(
    typeof bookSettings.coverCropX === 'number' ? bookSettings.coverCropX : 50
  );
  const [coverCropY, setCoverCropY] = useState(
    typeof bookSettings.coverCropY === 'number' ? bookSettings.coverCropY : 50
  );
  const [coverCropZoom, setCoverCropZoom] = useState(
    typeof bookSettings.coverCropZoom === 'number' ? bookSettings.coverCropZoom : 1
  );
  const [monthlyHighlights, setMonthlyHighlights] = useState(() => ({
    ...DEFAULT_MONTHLY_HIGHLIGHTS,
    ...(bookSettings.monthlyHighlights || {}),
  }));
  const [fontScales, setFontScales] = useState(() => ({
    ...(bookSettings.fontScales || {}),
  }));
  const coverPhotoInputRef = useRef(null);

  const [pdfProgress, setPdfProgress] = useState(null);

  const pdfExportContainerRef = useRef(null);

  useEffect(() => {
    setFamilyTitleInput(
      bookSettings.familyTitle || bookSettings.title || '박서 오피스 — 우리 가족 사진첩'
    );
    setKoreanTitleInput(bookSettings.koreanTitle || '각자의 계절, 하나의 시간');
    setSubtitleInput(
      bookSettings.subtitle !== undefined
        ? bookSettings.subtitle
        : '온 가족이 함께 모으는 소중한 일상 기록'
    );
    setEpilogueInput(bookSettings.epilogueNote || '');
    if (bookSettings.coverLayout) setCoverLayout(bookSettings.coverLayout);
    if (bookSettings.coverBgColor) setCoverBgColor(bookSettings.coverBgColor);
    if (bookSettings.coverShowPhoto !== undefined) {
      setCoverShowPhoto(bookSettings.coverShowPhoto !== false);
    }
    if (bookSettings.customCoverShowText !== undefined) {
      setCustomCoverShowText(Boolean(bookSettings.customCoverShowText));
    }
    if (bookSettings.coverHeaderLeft !== undefined) {
      setCoverHeaderLeftInput(bookSettings.coverHeaderLeft);
    }
    if (bookSettings.coverHeaderRight !== undefined) {
      setCoverHeaderRightInput(bookSettings.coverHeaderRight);
    }
    if (bookSettings.coverPhotoUrl !== undefined) {
      setCustomCoverPhotoUrl(bookSettings.coverPhotoUrl);
    }
    if (typeof bookSettings.coverCropX === 'number') {
      setCoverCropX(bookSettings.coverCropX);
    }
    if (typeof bookSettings.coverCropY === 'number') {
      setCoverCropY(bookSettings.coverCropY);
    }
    if (typeof bookSettings.coverCropZoom === 'number') {
      setCoverCropZoom(bookSettings.coverCropZoom);
    }
    if (bookSettings.monthlyHighlights) {
      setMonthlyHighlights((prev) => ({
        ...prev,
        ...bookSettings.monthlyHighlights,
      }));
    }
    if (bookSettings.tocHeaderLeft !== undefined) setTocHeaderLeft(bookSettings.tocHeaderLeft);
    if (bookSettings.tocHeaderRight !== undefined) setTocHeaderRight(bookSettings.tocHeaderRight);
    if (bookSettings.tocSubTitle !== undefined) setTocSubTitle(bookSettings.tocSubTitle);
    if (bookSettings.tocTitle !== undefined) setTocTitle(bookSettings.tocTitle);
    if (bookSettings.annualReviewNote !== undefined) {
      setAnnualReviewNote(bookSettings.annualReviewNote);
    }
    if (bookSettings.fontScales) {
      setFontScales((prev) => ({
        ...prev,
        ...bookSettings.fontScales,
      }));
    }
  }, [bookSettings]);

  const handleCoverFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSide = 1400;
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        setCustomCoverPhotoUrl(dataUrl);
        setCoverCropX(50);
        setCoverCropY(50);
        setCoverCropZoom(1);
        setCoverShowPhoto(true);
        setCurrentIndex(0);
        setShowCoverPhotoPicker(false);
        setIsRepositionMode(true);
        if (onUpdateBookSettings) {
          onUpdateBookSettings({
            coverPhotoUrl: dataUrl,
            coverCropX: 50,
            coverCropY: 50,
            coverCropZoom: 1,
          });
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const selectedProduct =
    PERIOD_PRODUCTS.find((p) => p.id === periodType) || PERIOD_PRODUCTS[3];

  const periodCandidatePhotos = useMemo(() => {
    return filterPhotosByPeriod(photos, {
      periodType,
      year: selectedYear,
      halfYear,
      month: selectedMonth,
      startDate: tripStartDate,
      endDate: tripEndDate,
      excludedPhotoIds: [],
      dateMatchMode,
    });
  }, [
    photos,
    periodType,
    selectedYear,
    halfYear,
    selectedMonth,
    tripStartDate,
    tripEndDate,
    dateMatchMode,
  ]);

  const curatedPhotos = useMemo(() => {
    const ex = new Set(excludedPhotoIds);
    return periodCandidatePhotos.filter((p) => !ex.has(p.id));
  }, [periodCandidatePhotos, excludedPhotoIds]);

  const currentPeriodLabel = useMemo(() => {
    if (periodType === 'half') {
      return halfYear === 'first'
        ? `${selectedYear}년 상반기 (1~6월)`
        : `${selectedYear}년 하반기 (7~12월)`;
    }
    if (periodType === 'month') {
      return `${selectedYear}년 ${selectedMonth}월`;
    }
    if (periodType === 'trip') {
      return `${tripStartDate || '시작일'} ~ ${tripEndDate || '종료일'}`;
    }
    return `${selectedYear}년 전체`;
  }, [periodType, selectedYear, halfYear, selectedMonth, tripStartDate, tripEndDate]);

  const studioBookSettings = useMemo(() => {
    const titleOverride = customBookTitle.trim()
      ? customBookTitle.trim()
      : periodType === 'trip' && tripDestinationTitle.trim()
      ? tripDestinationTitle.trim()
      : familyTitleInput.trim() || bookSettings.familyTitle || '박서 오피스 — 우리 가족 사진첩';
    return {
      ...bookSettings,
      periodType,
      year: selectedYear,
      halfYear,
      selectedMonth,
      startDate: tripStartDate,
      endDate: tripEndDate,
      tripDestinationTitle: tripDestinationTitle.trim(),
      bestGroupPhotoId,
      tocHeaderLeft,
      tocHeaderRight,
      tocSubTitle,
      tocTitle,
      annualReviewNote,
      familyTitle: titleOverride,
      title: titleOverride,
      koreanTitle: koreanTitleInput,
      subtitle: subtitleInput,
      coverLayout,
      coverBgColor,
      coverShowPhoto,
      customCoverShowText,
      coverHeaderLeft: coverHeaderLeftInput,
      coverHeaderRight: coverHeaderRightInput,
      coverPhotoUrl: customCoverPhotoUrl || bookSettings.coverPhotoUrl,
      coverCropX,
      coverCropY,
      coverCropZoom,
      monthlyHighlights,
      fontScales,
    };
  }, [
    bookSettings,
    customBookTitle,
    familyTitleInput,
    koreanTitleInput,
    subtitleInput,
    coverLayout,
    coverBgColor,
    coverShowPhoto,
    customCoverShowText,
    coverHeaderLeftInput,
    coverHeaderRightInput,
    customCoverPhotoUrl,
    coverCropX,
    coverCropY,
    coverCropZoom,
    monthlyHighlights,
    fontScales,
    periodType,
    selectedYear,
    halfYear,
    selectedMonth,
    tripStartDate,
    tripEndDate,
    tripDestinationTitle,
    bestGroupPhotoId,
    tocHeaderLeft,
    tocHeaderRight,
    tocSubTitle,
    tocTitle,
    annualReviewNote,
  ]);

  const pages = useMemo(() => {
    return buildPhotobookPages(curatedPhotos, members, studioBookSettings, pageVariants);
  }, [curatedPhotos, members, studioBookSettings, pageVariants]);

  const maxIndex = Math.max(0, pages.length - 1);

  useEffect(() => {
    if (currentIndex > maxIndex) {
      setCurrentIndex(maxIndex);
    }
  }, [maxIndex, currentIndex]);

  const handleStudioUpdatePhotoPosition = (photoId, patch) => {
    const isCoverPage = currentIndex === 0 || photoId === '__cover_photo__';
    if (isCoverPage) {
      if (typeof patch.cropX === 'number') setCoverCropX(patch.cropX);
      if (typeof patch.cropY === 'number') setCoverCropY(patch.cropY);
      if (typeof patch.cropZoom === 'number') setCoverCropZoom(patch.cropZoom);
      if (onUpdateBookSettings) {
        onUpdateBookSettings({
          coverCropX: typeof patch.cropX === 'number' ? patch.cropX : coverCropX,
          coverCropY: typeof patch.cropY === 'number' ? patch.cropY : coverCropY,
          coverCropZoom: typeof patch.cropZoom === 'number' ? patch.cropZoom : coverCropZoom,
        });
      }
    }
    if (photoId && photoId !== '__cover_photo__' && onUpdatePhotoPosition) {
      onUpdatePhotoPosition(photoId, patch);
    }
  };

  // 상단 리모컨 바에서 확대/축소 · 상하좌우 이동 버튼 클릭 시 실행
  const handleToolbarAdjustPosition = (
    deltaX = 0,
    deltaY = 0,
    deltaZoom = 0,
    isReset = false,
    directZoom = null
  ) => {
    const clamp = (val, min, max) => Math.min(max, Math.max(min, val));
    const currentPage = pages[currentIndex];
    if (!currentPage) return;

    if (currentPage.type === 'cover') {
      const nextX = isReset ? 50 : clamp(Number((coverCropX + deltaX).toFixed(1)), 0, 100);
      const nextY = isReset ? 50 : clamp(Number((coverCropY + deltaY).toFixed(1)), 0, 100);
      const nextZoom = isReset
        ? 1
        : typeof directZoom === 'number'
        ? clamp(Number(directZoom.toFixed(2)), 0.4, 3.0)
        : clamp(Number((coverCropZoom + deltaZoom).toFixed(2)), 0.4, 3.0);

      const targetId =
        currentPage.bestGroupPhoto?.id || currentPage.coverPhoto?.id || '__cover_photo__';
      handleStudioUpdatePhotoPosition(targetId, {
        cropX: nextX,
        cropY: nextY,
        cropZoom: nextZoom,
      });
      return;
    }

    // 내지 페이지의 대표 사진(또는 수록 사진들) 위치 조절
    const pagePhotos =
      currentPage.photos ||
      (currentPage.bestGroupPhoto ? [currentPage.bestGroupPhoto] : []) ||
      [];
    if (pagePhotos.length > 0) {
      const target = pagePhotos[0];
      const curX = typeof target.cropX === 'number' ? target.cropX : 50;
      const curY = typeof target.cropY === 'number' ? target.cropY : 50;
      const curZ = typeof target.cropZoom === 'number' ? target.cropZoom : 1;
      handleStudioUpdatePhotoPosition(target.id, {
        cropX: isReset ? 50 : clamp(Number((curX + deltaX).toFixed(1)), 0, 100),
        cropY: isReset ? 50 : clamp(Number((curY + deltaY).toFixed(1)), 0, 100),
        cropZoom: isReset
          ? 1
          : typeof directZoom === 'number'
          ? clamp(Number(directZoom.toFixed(2)), 0.4, 3.0)
          : clamp(Number((curZ + deltaZoom).toFixed(2)), 0.4, 3.0),
      });
    }
  };

  const togglePhotoInclusion = (photoId) => {
    setExcludedPhotoIds((prev) =>
      prev.includes(photoId) ? prev.filter((id) => id !== photoId) : [...prev, photoId]
    );
  };

  const handleUpdateMonthlyHighlight = (month, value) => {
    setMonthlyHighlights((prev) => {
      const next = { ...prev, [month]: value };
      if (onUpdateBookSettings) {
        onUpdateBookSettings({ monthlyHighlights: next });
      }
      return next;
    });
  };

  const handleAdjustFontScale = (key, delta, targetPageIndex = null, isReset = false) => {
    setFontScales((prev) => {
      const current = Number(prev[key]) || 1;
      const nextVal = isReset
        ? 1
        : Math.min(1.6, Math.max(0.7, Math.round((current + delta) * 10) / 10));
      const next = { ...prev, [key]: nextVal };
      if (onUpdateBookSettings) {
        onUpdateBookSettings({ fontScales: next });
      }
      return next;
    });
    if (typeof targetPageIndex === 'number' && viewType === 'single') {
      setCurrentIndex(targetPageIndex);
    }
  };

  const renderFontScaleControl = (key, targetPageIndex = null) => {
    const scale = Number(fontScales[key]) || 1;
    return (
      <span className="inline-flex items-center gap-0.5 shrink-0">
        <button
          type="button"
          onClick={() => handleAdjustFontScale(key, -0.1, targetPageIndex, false)}
          title="글씨 작게"
          className="px-1.5 py-0.2 rounded bg-[#FBF8F3] hover:bg-[#B64E2E] hover:text-[#FBF8F3] text-[10px] font-bold text-[#8A442B] cursor-pointer transition-colors"
        >
          가-
        </button>
        {scale !== 1 && (
          <button
            type="button"
            onClick={() => handleAdjustFontScale(key, 0, targetPageIndex, true)}
            title="기본 크기로 초기화"
            className="px-1 text-[9px] font-mono-meta font-bold text-[#B64E2E] cursor-pointer"
          >
            {Math.round(scale * 100)}%
          </button>
        )}
        <button
          type="button"
          onClick={() => handleAdjustFontScale(key, 0.1, targetPageIndex, false)}
          title="글씨 크게"
          className="px-1.5 py-0.2 rounded bg-[#FBF8F3] hover:bg-[#B64E2E] hover:text-[#FBF8F3] text-[10px] font-bold text-[#8A442B] cursor-pointer transition-colors"
        >
          가+
        </button>
      </span>
    );
  };

  const handleSaveCoverText = async (e) => {
    e.preventDefault();
    await onUpdateBookSettings({
      familyTitle: familyTitleInput.trim() || '박서 오피스 — 우리 가족 사진첩',
      title: familyTitleInput.trim() || '박서 오피스 — 우리 가족 사진첩',
      koreanTitle: koreanTitleInput.trim(),
      subtitle: subtitleInput.trim(),
      epilogueNote: epilogueInput.trim(),
      coverLayout,
      coverBgColor,
      coverShowPhoto,
      coverHeaderLeft: coverHeaderLeftInput,
      coverHeaderRight: coverHeaderRightInput,
      coverPhotoUrl: customCoverPhotoUrl || bookSettings.coverPhotoUrl,
      coverCropX,
      coverCropY,
      coverCropZoom,
      monthlyHighlights,
      tocHeaderLeft,
      tocHeaderRight,
      tocSubTitle,
      tocTitle,
      annualReviewNote,
      fontScales,
    });
    setShowCoverEditor(false);
  };

  const totalPodCopies = useMemo(
    () => destinations.reduce((sum, d) => sum + Math.max(1, Number(d.copies) || 1), 0),
    [destinations]
  );
  const designFee = selectedProduct.designPrice;
  const printUnitFee = podBindingType === 'hardcover' ? 38000 : 24000;
  const totalCheckoutPrice =
    packageOption === 'pdf-and-print'
      ? designFee + printUnitFee * totalPodCopies
      : designFee;

  const handleAddDestination = (preset = null) => {
    setDestinations((prev) => [
      ...prev,
      {
        id: `dest-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        householdLabel: preset?.householdLabel || '추가 배송지',
        recipientName: preset?.recipientName || '',
        address: preset?.address || '',
        copies: 1,
      },
    ]);
  };

  const handleUpdateDestination = (destId, patch) => {
    setDestinations((prev) =>
      prev.map((d) => (d.id === destId ? { ...d, ...patch } : d))
    );
  };

  const handleRemoveDestination = (destId) => {
    setDestinations((prev) => (prev.length > 1 ? prev.filter((d) => d.id !== destId) : prev));
  };

  const handleCompleteOnDemandOrder = async (e) => {
    e.preventDefault();
    const finalTitle =
      customBookTitle.trim() ||
      `${bookSettings.familyTitle || '우리 가족 사진첩'} — ${currentPeriodLabel}`;

    const bindingName =
      podBindingType === 'hardcover' ? '양장 하드커버' : '소프트커버';

    const newBook = {
      id: `book-${Date.now()}`,
      title: finalTitle,
      subtitle: `${currentPeriodLabel} · 사진 ${curatedPhotos.length}장 (${pages.length}쪽)`,
      periodType,
      year: selectedYear,
      halfYear,
      month: selectedMonth,
      startDate: tripStartDate,
      endDate: tripEndDate,
      excludedPhotoIds,
      periodLabel: currentPeriodLabel,
      photoCount: curatedPhotos.length,
      pageCount: pages.length,
      designerNote,
      paidAmount: totalCheckoutPrice,
      createdAt: new Date().toISOString().slice(0, 10),
      status: packageOption === 'pdf-and-print' ? 'PDF 보관 · 인쇄 제작 중' : 'PDF 보관 완료',
      bindingType:
        packageOption === 'pdf-and-print'
          ? `${bindingName} (${totalPodCopies}권)`
          : '디지털 PDF',
      coverLayout,
      coverBgColor,
      coverShowPhoto,
      coverHeaderLeft: coverHeaderLeftInput,
      coverHeaderRight: coverHeaderRightInput,
      koreanTitle: koreanTitleInput,
      coverPhotoUrl:
        customCoverPhotoUrl ||
        curatedPhotos[0]?.url ||
        bookSettings.coverPhotoUrl ||
        'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=1400&q=85',
    };

    if (packageOption === 'pdf-and-print' && onUpdateBookSettings) {
      const activeMemberObj =
        members.find((m) => m.id === activeMemberId) ||
        members[0] || { name: '가족', city: '부산' };
      const existingOrders = Array.isArray(bookSettings.printOrders)
        ? bookSettings.printOrders
        : [];
      const summaryRecipient =
        destinations.length > 1
          ? `${destinations[0].householdLabel} 외 ${destinations.length - 1}곳`
          : `${destinations[0]?.householdLabel || ''} ${destinations[0]?.recipientName || activeMemberObj.name}`;
      const summaryAddress = destinations
        .map((d) => `${d.householdLabel}(${d.address || '주소지'} · ${d.copies}권)`)
        .join(' / ');

      const newOrder = {
        id: `order-${Date.now()}`,
        bookId: newBook.id,
        bookTitle: finalTitle,
        bindingLabel: bindingName,
        quantity: totalPodCopies,
        totalPrice: totalCheckoutPrice,
        recipientName: summaryRecipient,
        recipientAddress: summaryAddress,
        destinations,
        orderedBy: activeMemberObj.name,
        orderedAt: new Date().toISOString().slice(0, 10),
        status: '인쇄 접수 완료',
        stepIndex: 0,
        courier: '우체국택배',
        trackingNumber: `6894-2026-${String(Date.now()).slice(-4)}`,
      };
      await onUpdateBookSettings({ printOrders: [newOrder, ...existingOrders] });
    }

    setIsCheckoutOpen(false);
    if (onPublishBookToLibrary) {
      await onPublishBookToLibrary(newBook);
    }
  };

  const handleDownloadPdf = async (targetSpec = pdfRenderSpec) => {
    if (!pdfExportContainerRef.current || pdfProgress) return;
    if (targetSpec !== pdfRenderSpec) {
      setPdfRenderSpec(targetSpec);
    }

    setTimeout(async () => {
      if (!pdfExportContainerRef.current) return;
      const sheetElements = pdfExportContainerRef.current.querySelectorAll('.pdf-render-sheet');
      if (!sheetElements.length) return;

      setPdfProgress({ current: 0, total: sheetElements.length, spec: targetSpec });

      try {
        const isBleed = targetSpec === 'press-bleed';
        const pageW = isBleed ? 216 : 210;
        const pageH = isBleed ? 303 : 297;

        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: [pageW, pageH],
        });

        for (let i = 0; i < sheetElements.length; i++) {
          setPdfProgress({ current: i + 1, total: sheetElements.length, spec: targetSpec });
          const el = sheetElements[i];
          const canvas = await html2canvas(el, {
            scale: isBleed ? 2.5 : 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor:
              bookSettings.paperTheme === 'white'
                ? '#FFFFFF'
                : bookSettings.paperTheme === 'stone'
                ? '#F3F1EC'
                : '#FBF9F4',
          });
          const imgData = canvas.toDataURL('image/jpeg', isBleed ? 0.96 : 0.9);
          if (i > 0) pdf.addPage([pageW, pageH], 'portrait');
          pdf.addImage(imgData, 'JPEG', 0, 0, pageW, pageH);
        }

        const specSuffix = isBleed ? '인쇄용_300DPI' : '열람용_RGB';
        const fileName = `${
          studioBookSettings.familyTitle || '우리가족사진첩'
        }_${currentPeriodLabel}_${specSuffix}.pdf`.replace(/\s+/g, '_');
        pdf.save(fileName);
      } catch (err) {
        console.error('PDF generation failed:', err);
        window.print();
      } finally {
        setPdfProgress(null);
      }
    }, 120);
  };

  return (
    <div className="pb-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 items-start">
        {/* ===================================================================
            좌측(데스크톱 좌측 한 화면 고정): 사진첩 미리보기 뷰어
        =================================================================== */}
        <section className="lg:col-span-6 space-y-2.5 order-2 lg:order-1">
          {/* 상단 통합 컨트롤 바 (보기 전환 + 페이지 이동 + 위치조절/사진수정) */}
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setViewType('single');
                  setCurrentIndex(0);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                  viewType === 'single'
                    ? 'bg-[#B64E2E] text-[#FBF8F3]'
                    : 'border border-[#B64E2E]/45 text-[#8A442B] hover:border-[#B64E2E]'
                }`}
              >
                한 쪽씩 보기
              </button>
              <button
                type="button"
                onClick={() => setViewType('grid')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                  viewType === 'grid'
                    ? 'bg-[#B64E2E] text-[#FBF8F3]'
                    : 'border border-[#B64E2E]/45 text-[#8A442B] hover:border-[#B64E2E]'
                }`}
              >
                전체 {pages.length}쪽
              </button>
            </div>

            {viewType === 'single' && pages.length > 0 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                  className="px-2.5 py-1 rounded-full border border-[#B64E2E]/45 text-[#8A442B] hover:border-[#B64E2E] disabled:opacity-30 text-xs font-medium flex items-center gap-0.5 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>이전</span>
                </button>
                <span className="text-xs font-bold text-[#5E3422] px-1">
                  {currentIndex + 1} / {pages.length}쪽
                </span>
                <button
                  type="button"
                  disabled={currentIndex >= maxIndex}
                  onClick={() => setCurrentIndex((prev) => Math.min(maxIndex, prev + 1))}
                  className="px-2.5 py-1 rounded-full border border-[#B64E2E]/45 text-[#8A442B] hover:border-[#B64E2E] disabled:opacity-30 text-xs font-medium flex items-center gap-0.5 cursor-pointer"
                >
                  <span>다음</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setIsRepositionMode((prev) => !prev);
                  setShowCoverPhotoPicker(false);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors ${
                  isRepositionMode
                    ? 'bg-[#806E43] text-[#FBF8F3]'
                    : 'border border-[#B64E2E]/45 text-[#8A442B] hover:border-[#B64E2E]'
                }`}
              >
                <Move className="w-3.5 h-3.5" />
                <span>{isRepositionMode ? '위치 완료' : '사진 위치 조절'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowCoverPhotoPicker((prev) => !prev);
                  setIsRepositionMode(false);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors ${
                  showCoverPhotoPicker
                    ? 'bg-[#B64E2E] text-[#FBF8F3]'
                    : 'border border-[#B64E2E]/45 text-[#8A442B] hover:border-[#B64E2E]'
                }`}
              >
                <ImagePlus className="w-3.5 h-3.5" />
                <span>{showCoverPhotoPicker ? '수정 닫기' : '사진 수정'}</span>
              </button>
              <input
                ref={coverPhotoInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverFileUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* 사진 위치·확대/축소·상하좌우 이동 조절 바 */}
          {isRepositionMode && (
            <div className="bg-[#F2EDE3] p-2.5 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-[#8A442B]">
                <span className="font-bold text-[#5E3422]">
                  사진 네 모서리를 드래그해 크기를 조절하거나, 사진 중앙을 드래그해 위치를 이동하세요
                </span>
                <button
                  type="button"
                  onClick={() => handleToolbarAdjustPosition(0, 0, 0, true)}
                  className="px-2 py-0.5 rounded-full border border-[#B64E2E]/45 text-[#8A442B] hover:bg-[#FBF8F3] font-medium flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>초기화</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleToolbarAdjustPosition(-8, 0, 0, false)}
                    className="px-2 py-1 rounded-full bg-[#FBF8F3] hover:bg-[#B64E2E] hover:text-[#FBF8F3] text-xs font-bold text-[#5E3422] flex items-center gap-0.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    <span>좌</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToolbarAdjustPosition(8, 0, 0, false)}
                    className="px-2 py-1 rounded-full bg-[#FBF8F3] hover:bg-[#B64E2E] hover:text-[#FBF8F3] text-xs font-bold text-[#5E3422] flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>우</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToolbarAdjustPosition(0, -8, 0, false)}
                    className="px-2 py-1 rounded-full bg-[#FBF8F3] hover:bg-[#B64E2E] hover:text-[#FBF8F3] text-xs font-bold text-[#5E3422] flex items-center gap-0.5 cursor-pointer"
                  >
                    <ArrowUp className="w-3 h-3" />
                    <span>상</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToolbarAdjustPosition(0, 8, 0, false)}
                    className="px-2 py-1 rounded-full bg-[#FBF8F3] hover:bg-[#B64E2E] hover:text-[#FBF8F3] text-xs font-bold text-[#5E3422] flex items-center gap-0.5 cursor-pointer"
                  >
                    <ArrowDown className="w-3 h-3" />
                    <span>하</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleToolbarAdjustPosition(0, 0, -0.1, false)}
                    className="px-2 py-1 rounded-full bg-[#FBF8F3] hover:bg-[#B64E2E] hover:text-[#FBF8F3] text-xs font-bold text-[#5E3422] flex items-center gap-0.5 cursor-pointer"
                  >
                    <ZoomOut className="w-3 h-3" />
                    <span>축소</span>
                  </button>
                  <input
                    type="range"
                    min="0.4"
                    max="3.0"
                    step="0.02"
                    value={coverCropZoom}
                    onChange={(e) =>
                      handleToolbarAdjustPosition(0, 0, 0, false, Number(e.target.value))
                    }
                    title="드래그하여 사진 크기 조절 (40% ~ 300%)"
                    className="w-20 sm:w-28 accent-[#B64E2E] cursor-ew-resize"
                  />
                  <span className="px-1 text-xs font-mono-meta font-bold text-[#8A442B] min-w-[36px] text-center">
                    {Math.round(coverCropZoom * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => handleToolbarAdjustPosition(0, 0, 0.1, false)}
                    className="px-2 py-1 rounded-full bg-[#B64E2E] text-[#FBF8F3] text-xs font-bold flex items-center gap-0.5 cursor-pointer"
                  >
                    <ZoomIn className="w-3 h-3" />
                    <span>확대</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 사진 수정 패널 */}
          {showCoverPhotoPicker && (
            <div className="bg-[#F2EDE3] p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-[#5E3422]">
                  표지 사진 바꾸기 (가족 사진 선택 또는 기기에서 업로드)
                </span>
                <button
                  type="button"
                  onClick={() => coverPhotoInputRef.current?.click()}
                  className="px-3 py-1 rounded-full bg-[#B64E2E] hover:bg-[#B04C2E] text-[#FBF8F3] text-xs font-bold cursor-pointer shrink-0"
                >
                  내 기기에서 사진 올리기 +
                </button>
              </div>

              <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 max-h-28 overflow-y-auto">
                {curatedPhotos.map((p) => {
                  const isCurrent =
                    (customCoverPhotoUrl && customCoverPhotoUrl === p.url) ||
                    (!customCoverPhotoUrl && bestGroupPhotoId === p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setBestGroupPhotoId(p.id);
                        setCustomCoverPhotoUrl(p.url);
                        setCoverCropX(50);
                        setCoverCropY(50);
                        setCoverCropZoom(1);
                        setCoverShowPhoto(true);
                        setCurrentIndex(0);
                        if (onUpdateBookSettings) {
                          onUpdateBookSettings({
                            coverPhotoUrl: p.url,
                            coverCropX: 50,
                            coverCropY: 50,
                            coverCropZoom: 1,
                          });
                        }
                      }}
                      className={`relative aspect-square overflow-hidden bg-[#E6DEC8] cursor-pointer transition-all ${
                        isCurrent ? 'ring-2 ring-[#B64E2E] scale-[0.98]' : 'opacity-85 hover:opacity-100'
                      }`}
                    >
                      <img src={p.url} alt="" className="w-full h-full object-cover" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 책 페이지 뷰어 (모바일에서도 상단 01·02 아코디언과 한 화면에 함께 보이도록 높이 최적화, 웹은 기존 동일) */}
          {viewType === 'single' && pages.length > 0 && (
            <div className="bg-[#F2EDE3] p-2.5 sm:p-4 flex justify-center items-center">
              <div className="w-full max-w-[280px] sm:max-w-[460px] lg:h-[calc(100vh-210px)] lg:min-h-[460px] lg:max-h-[680px] lg:w-auto aspect-[1/1.38] bg-[#FAF9F6] shadow-md overflow-hidden">
                <BookPageRenderer
                  page={pages[currentIndex]}
                  members={members}
                  bookSettings={studioBookSettings}
                  side="single"
                  printSpec={pdfRenderSpec}
                  onSelectPhoto={onSelectPhoto}
                  onCycleVariant={onCycleVariant}
                  onUpdatePhotoPosition={handleStudioUpdatePhotoPosition}
                  onUpdateMonthlyHighlight={handleUpdateMonthlyHighlight}
                  isRepositionMode={isRepositionMode}
                  onToggleRepositionMode={() => setIsRepositionMode((p) => !p)}
                />
              </div>
            </div>
          )}

          {viewType === 'grid' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[calc(100vh-210px)] overflow-y-auto pr-1">
              {pages.map((pg, idx) => (
                <div key={pg.id} className="flex flex-col">
                  <div className="mb-1 flex items-center justify-between text-xs font-medium text-[#8A442B]">
                    <span>{pg.pageNumber}쪽</span>
                    <button
                      type="button"
                      onClick={() => {
                        setViewType('single');
                        setCurrentIndex(idx);
                      }}
                      className="text-[#B64E2E] underline cursor-pointer"
                    >
                      크게 열기
                    </button>
                  </div>
                  <div className="aspect-[1/1.38] bg-[#FAF9F6] shadow-xs overflow-hidden">
                    <BookPageRenderer
                      page={pg}
                      members={members}
                      bookSettings={studioBookSettings}
                      side="single"
                      printSpec={pdfRenderSpec}
                      onSelectPhoto={onSelectPhoto}
                      onCycleVariant={onCycleVariant}
                      onUpdatePhotoPosition={handleStudioUpdatePhotoPosition}
                      isRepositionMode={isRepositionMode}
                      onToggleRepositionMode={() => setIsRepositionMode((p) => !p)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 하단 PDF 저장 & 제작 보관 버튼 (컴팩트 1줄) */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setIsCheckoutOpen(true)}
              className="py-2 px-3 rounded-full bg-[#B64E2E] hover:bg-[#A3573E] text-[#FBF8F3] text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>서재 보관 · 책 인쇄 +</span>
            </button>

            <button
              type="button"
              disabled={Boolean(pdfProgress)}
              onClick={() => handleDownloadPdf('digital-rgb')}
              className="py-2 px-3 rounded-full border border-[#B64E2E]/50 text-[#8A442B] hover:border-[#B64E2E] text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {pdfProgress && pdfProgress.spec === 'digital-rgb' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>열람용 PDF 저장</span>
            </button>

            <button
              type="button"
              disabled={Boolean(pdfProgress)}
              onClick={() => handleDownloadPdf('press-bleed')}
              className="py-2 px-3 rounded-full border border-[#B64E2E]/50 text-[#8A442B] hover:border-[#B64E2E] text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {pdfProgress && pdfProgress.spec === 'press-bleed' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Printer className="w-3.5 h-3.5" />
              )}
              <span>인쇄용 PDF (300DPI)</span>
            </button>
          </div>
        </section>

        {/* ===================================================================
            우측(웹에서는 한 화면에 모두 펼쳐서 노출 / 모바일에서는 01·02·03을 열고 닫으며 아래 미리보기와 동시에 확인)
            - 목차(2쪽) 미리보기 중일 때: 03 / 목차 문구 · 1월~12월 하이라이트 섹션만 노출
            - 그 외 책자 미리보기 페이지일 때: 01, 02 섹션만 노출
        =================================================================== */}
        <div className="lg:col-span-6 space-y-2.5 lg:space-y-4 order-1 lg:order-2">
          {viewType === 'single' && pages[currentIndex]?.type === 'prologue' ? (
            /* 3. 목차 상단 문구 및 1월~12월 하이라이트 글귀 간편 입력 */
            <section className="space-y-2 lg:space-y-3">
              <div className="flex items-center justify-between gap-2 bg-[#F2EDE3] lg:bg-transparent px-3 py-2 lg:p-0 rounded-xl lg:rounded-none">
                <button
                  type="button"
                  onClick={() =>
                    setMobileOpenSection((prev) => (prev === '03' ? null : '03'))
                  }
                  className="flex items-center gap-1.5 text-left cursor-pointer lg:cursor-default flex-1"
                >
                  <h2 className="text-sm sm:text-lg font-medium text-[#B64E2E] tracking-tight">
                    03 / 목차 문구 · 1월~12월 하이라이트
                  </h2>
                  <span className="lg:hidden inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-[#B64E2E] text-[#FBF8F3] text-[10px] font-bold shrink-0">
                    {mobileOpenSection === '03' ? (
                      <>
                        <span>닫기</span>
                        <ChevronUp className="w-3 h-3" />
                      </>
                    ) : (
                      <>
                        <span>열기</span>
                        <ChevronDown className="w-3 h-3" />
                      </>
                    )}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setViewType('single');
                    setCurrentIndex(0);
                  }}
                  className="px-2.5 py-1 rounded-full border border-[#B64E2E]/45 text-xs font-medium text-[#8A442B] hover:border-[#B64E2E] shrink-0 cursor-pointer"
                >
                  표지(1쪽)로 이동
                </button>
              </div>

              <div
                className={`${
                  mobileOpenSection === '03'
                    ? 'block max-h-[34vh] overflow-y-auto pr-1 space-y-2.5'
                    : 'hidden'
                } lg:block lg:max-h-none lg:overflow-visible lg:space-y-3`}
              >
                {/* 목차 상단 문구 직접 수정 (모두 줄바꿈 지원 textarea + [가-][가+] 크기 조절) */}
                <div className="bg-[#F2EDE3] p-3 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-medium text-[#8A442B] mb-0.5">
                        <span>상단 왼쪽 문구</span>
                        {renderFontScaleControl('tocHeaderLeft', 1)}
                      </div>
                      <textarea
                        rows={1}
                        value={tocHeaderLeft}
                        onChange={(e) => {
                          setTocHeaderLeft(e.target.value);
                          if (onUpdateBookSettings) {
                            onUpdateBookSettings({ tocHeaderLeft: e.target.value });
                          }
                        }}
                        placeholder="우리 가족 사진첩 목차"
                        className="w-full bg-[#FBF8F3] px-2.5 py-1.5 text-xs text-[#5E3422] resize-y leading-snug"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-medium text-[#8A442B] mb-0.5">
                        <span>상단 오른쪽 문구</span>
                        {renderFontScaleControl('tocHeaderRight', 1)}
                      </div>
                      <textarea
                        rows={1}
                        value={tocHeaderRight}
                        onChange={(e) => {
                          setTocHeaderRight(e.target.value);
                          if (onUpdateBookSettings) {
                            onUpdateBookSettings({ tocHeaderRight: e.target.value });
                          }
                        }}
                        placeholder="2026년 연간 가족사"
                        className="w-full bg-[#FBF8F3] px-2.5 py-1.5 text-xs text-[#5E3422] resize-y leading-snug"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-medium text-[#8A442B] mb-0.5">
                        <span>목차 소제목</span>
                        {renderFontScaleControl('tocSubTitle', 1)}
                      </div>
                      <textarea
                        rows={1}
                        value={tocSubTitle}
                        onChange={(e) => {
                          setTocSubTitle(e.target.value);
                          if (onUpdateBookSettings) {
                            onUpdateBookSettings({ tocSubTitle: e.target.value });
                          }
                        }}
                        placeholder="연간 가족사 화보집 · 사계절 목차"
                        className="w-full bg-[#FBF8F3] px-2.5 py-1.5 text-xs text-[#5E3422] resize-y leading-snug"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-medium text-[#8A442B] mb-0.5">
                        <span>목차 큰 제목 (Enter 줄바꿈)</span>
                        {renderFontScaleControl('tocTitle', 1)}
                      </div>
                      <textarea
                        rows={2}
                        value={tocTitle}
                        onChange={(e) => {
                          setTocTitle(e.target.value);
                          if (onUpdateBookSettings) {
                            onUpdateBookSettings({ tocTitle: e.target.value });
                          }
                        }}
                        placeholder="멀리 떨어져 있어도 같은 계절을 건너는 우리들의 기록"
                        className="w-full bg-[#FBF8F3] px-2.5 py-1.5 text-xs font-medium text-[#5E3422] resize-y leading-snug"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-[11px] font-medium text-[#8A442B] mb-0.5">
                        <span>목차 소개글 (Enter 줄바꿈)</span>
                        {renderFontScaleControl('tocDesc', 1)}
                      </div>
                      <textarea
                        rows={2}
                        value={annualReviewNote}
                        onChange={(e) => {
                          setAnnualReviewNote(e.target.value);
                          if (onUpdateBookSettings) {
                            onUpdateBookSettings({ annualReviewNote: e.target.value });
                          }
                        }}
                        placeholder="각자의 도시에서 매달 사진과 안부를 나누며 함께 걸어온 기록입니다."
                        className="w-full bg-[#FBF8F3] px-2.5 py-1.5 text-xs text-[#5E3422] resize-y leading-snug"
                      />
                    </div>
                  </div>
                </div>

                {/* 1월 ~ 12월 하이라이트 글귀 (1열 · 줄바꿈 가능) */}
                <div className="bg-[#F2EDE3] p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#5E3422]">
                      1월 ~ 12월 하이라이트 글귀 (1열)
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-[#8A442B]">글씨 크기</span>
                      {renderFontScaleControl('tocHighlights', 1)}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-1">
                    {Array.from({ length: 12 }, (_, idx) => idx + 1).map((m) => (
                      <div key={m} className="flex items-center gap-2 bg-[#FBF8F3] px-2.5 py-1">
                        <span className="text-xs font-bold text-[#B64E2E] shrink-0 w-8">
                          {String(m).padStart(2, '0')}월
                        </span>
                        <textarea
                          rows={1}
                          value={
                            monthlyHighlights[m] !== undefined
                              ? monthlyHighlights[m]
                              : DEFAULT_MONTHLY_HIGHLIGHTS[m]
                          }
                          onChange={(e) => handleUpdateMonthlyHighlight(m, e.target.value)}
                          placeholder={`${m}월 하이라이트 글귀`}
                          className="w-full bg-transparent text-xs text-[#5E3422] focus:outline-none resize-y leading-snug"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          ) : (
            <>
              {/* 1. 기간 선택 (모바일에서는 열고 닫기 가능, 웹에서는 항상 펼침) */}
              <section className="space-y-2">
                <div className="flex items-center justify-between gap-2 bg-[#F2EDE3] lg:bg-transparent px-3 py-2 lg:p-0 rounded-xl lg:rounded-none">
                  <button
                    type="button"
                    onClick={() =>
                      setMobileOpenSection((prev) => (prev === '01' ? null : '01'))
                    }
                    className="flex items-center gap-2 text-left cursor-pointer lg:cursor-default flex-1"
                  >
                    <h2 className="text-sm sm:text-lg font-medium text-[#B64E2E] tracking-tight">
                      01 / 사진첩 기간 고르기
                    </h2>
                    <span className="lg:hidden inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-[#B64E2E] text-[#FBF8F3] text-[10px] font-bold shrink-0">
                      {mobileOpenSection === '01' ? (
                        <>
                          <span>닫기</span>
                          <ChevronUp className="w-3 h-3" />
                        </>
                      ) : (
                        <>
                          <span>열기</span>
                          <ChevronDown className="w-3 h-3" />
                        </>
                      )}
                    </span>
                  </button>
                  <div className="flex items-center gap-2 text-xs text-[#8A442B]">
                    <span>
                      수록 <strong className="text-[#5E3422]">{curatedPhotos.length}장</strong> ·{' '}
                      <strong className="text-[#5E3422]">{pages.length}쪽</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setShowPhotoSelector((prev) => !prev);
                        setMobileOpenSection('01');
                      }}
                      className="px-2.5 py-1 rounded-full border border-[#B64E2E]/45 font-medium text-[#8A442B] hover:border-[#B64E2E] cursor-pointer"
                    >
                      {showPhotoSelector ? '사진 선택 닫기' : '수록 사진 고르기 +'}
                    </button>
                  </div>
                </div>

                <div
                  className={`${
                    mobileOpenSection === '01'
                      ? 'block max-h-[32vh] overflow-y-auto pr-1 space-y-2'
                      : 'hidden'
                  } lg:block lg:max-h-none lg:overflow-visible lg:space-y-2`}
                >
                  <div className="grid grid-cols-4 gap-1.5">
                    {PERIOD_PRODUCTS.map((prod) => {
                      const active = periodType === prod.id;
                      return (
                        <button
                          key={prod.id}
                          type="button"
                          onClick={() => {
                            setPeriodType(prod.id);
                            setCurrentIndex(0);
                          }}
                          className={`p-2.5 text-left transition-all cursor-pointer ${
                            active
                              ? 'bg-[#B64E2E] text-[#FBF8F3]'
                              : 'bg-[#F2EDE3] text-[#5E3422] hover:bg-[#E8E0D0]'
                          }`}
                        >
                          <div
                            className={`text-[10px] font-medium ${
                              active ? 'text-[#FBF8F3]/80' : 'text-[#A3573E]'
                            }`}
                          >
                            {prod.categoryLabel}
                          </div>
                          <div className="text-xs sm:text-sm font-medium mt-0.5 truncate">
                            {prod.title}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* 기간 세부 선택 */}
                  <div className="bg-[#F2EDE3] px-3.5 py-2.5 space-y-2">
                    {periodType === 'trip' && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                        <div>
                          <label className="block text-[10px] font-medium text-[#8A442B]">
                            여행 시작일
                          </label>
                          <input
                            type="date"
                            value={tripStartDate}
                            onChange={(e) => setTripStartDate(e.target.value)}
                            className="w-full bg-[#FBF8F3] px-2.5 py-1 text-xs font-medium text-[#5E3422]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium text-[#8A442B]">
                            여행 종료일
                          </label>
                          <input
                            type="date"
                            value={tripEndDate}
                            onChange={(e) => setTripEndDate(e.target.value)}
                            className="w-full bg-[#FBF8F3] px-2.5 py-1 text-xs font-medium text-[#5E3422]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium text-[#8A442B]">
                            여행 표지 제목 (줄바꿈 가능)
                          </label>
                          <textarea
                            rows={1}
                            value={tripDestinationTitle}
                            onChange={(e) => setTripDestinationTitle(e.target.value)}
                            placeholder="예: 2026 여름 부산 가족 여행"
                            className="w-full bg-[#FBF8F3] px-2.5 py-1 text-xs font-medium text-[#5E3422] resize-y"
                          />
                        </div>
                      </div>
                    )}

                    {periodType === 'month' && (
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <select
                          value={selectedYear}
                          onChange={(e) => setSelectedYear(Number(e.target.value))}
                          className="bg-[#FBF8F3] px-2.5 py-1 text-xs font-medium text-[#5E3422]"
                        >
                          {[2024, 2025, 2026, 2027].map((yr) => (
                            <option key={yr} value={yr}>
                              {yr}년
                            </option>
                          ))}
                        </select>
                        <div className="flex flex-wrap gap-1">
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => setSelectedMonth(m)}
                              className={`px-2 py-1 rounded-full text-xs font-medium cursor-pointer ${
                                selectedMonth === m
                                  ? 'bg-[#B64E2E] text-[#FBF8F3]'
                                  : 'bg-[#FBF8F3] text-[#8A442B]'
                              }`}
                            >
                              {m}월
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {periodType === 'half' && (
                      <div className="flex items-center justify-between gap-2">
                        <select
                          value={selectedYear}
                          onChange={(e) => setSelectedYear(Number(e.target.value))}
                          className="bg-[#FBF8F3] px-2.5 py-1.5 text-xs font-medium text-[#5E3422]"
                        >
                          {[2024, 2025, 2026, 2027].map((yr) => (
                            <option key={yr} value={yr}>
                              {yr}년
                            </option>
                          ))}
                        </select>
                        <div className="flex-1 grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => setHalfYear('first')}
                            className={`py-1.5 rounded-full text-xs font-medium cursor-pointer ${
                              halfYear === 'first'
                                ? 'bg-[#B64E2E] text-[#FBF8F3]'
                                : 'bg-[#FBF8F3] text-[#8A442B]'
                            }`}
                          >
                            상반기 (1~6월)
                          </button>
                          <button
                            type="button"
                            onClick={() => setHalfYear('second')}
                            className={`py-1.5 rounded-full text-xs font-medium cursor-pointer ${
                              halfYear === 'second'
                                ? 'bg-[#B64E2E] text-[#FBF8F3]'
                                : 'bg-[#FBF8F3] text-[#8A442B]'
                            }`}
                          >
                            하반기 (7~12월)
                          </button>
                        </div>
                      </div>
                    )}

                    {periodType === 'annual' && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-[#5E3422]">제작 연도</span>
                        <select
                          value={selectedYear}
                          onChange={(e) => setSelectedYear(Number(e.target.value))}
                          className="bg-[#FBF8F3] px-3 py-1 text-xs font-medium text-[#5E3422]"
                        >
                          {[2024, 2025, 2026, 2027].map((yr) => (
                            <option key={yr} value={yr}>
                              {yr}년 (1월 ~ 12월)
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {showPhotoSelector && (
                      <div className="pt-2 space-y-2 border-t border-[#5E3422]/10">
                        <div className="flex items-center justify-between text-xs text-[#8A442B]">
                          <span>사진을 눌러 수록/제외를 선택하세요</span>
                          <button
                            type="button"
                            onClick={() => setExcludedPhotoIds([])}
                            className="font-medium text-[#B64E2E] underline cursor-pointer"
                          >
                            전체 선택
                          </button>
                        </div>
                        <div className="grid grid-cols-6 gap-1.5 max-h-36 overflow-y-auto">
                          {periodCandidatePhotos.map((p) => {
                            const isIncluded = !excludedPhotoIds.includes(p.id);
                            return (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => togglePhotoInclusion(p.id)}
                                className={`relative overflow-hidden text-left transition-all cursor-pointer ${
                                  isIncluded ? 'opacity-100' : 'opacity-35 grayscale'
                                }`}
                              >
                                <div className="aspect-square bg-[#E6DEC8]">
                                  <img src={p.url} alt="" className="w-full h-full object-cover" />
                                  <span
                                    className={`absolute top-1 right-1 px-1.5 py-0.2 rounded-full text-[9px] font-medium ${
                                      isIncluded
                                        ? 'bg-[#B64E2E] text-[#FBF8F3]'
                                        : 'bg-[#5E3422]/70 text-[#FBF8F3]'
                                    }`}
                                  >
                                    {isIncluded ? '수록' : '제외'}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* 2. 표지 디자인 · 배경색 · 문구 꾸미기 (모바일에서는 열고 닫기 가능, 웹에서는 항상 펼침) */}
              <section className="space-y-2.5">
                <div className="flex items-center justify-between bg-[#F2EDE3] lg:bg-transparent px-3 py-2 lg:p-0 rounded-xl lg:rounded-none">
                  <button
                    type="button"
                    onClick={() =>
                      setMobileOpenSection((prev) => (prev === '02' ? null : '02'))
                    }
                    className="flex items-center gap-2 text-left cursor-pointer lg:cursor-default flex-1"
                  >
                    <h2 className="text-sm sm:text-lg font-medium text-[#B64E2E] tracking-tight">
                      02 / 표지 디자인 · 문구 꾸미기
                    </h2>
                    <span className="lg:hidden inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-[#B64E2E] text-[#FBF8F3] text-[10px] font-bold shrink-0">
                      {mobileOpenSection === '02' ? (
                        <>
                          <span>닫기</span>
                          <ChevronUp className="w-3 h-3" />
                        </>
                      ) : (
                        <>
                          <span>열기</span>
                          <ChevronDown className="w-3 h-3" />
                        </>
                      )}
                    </span>
                  </button>
                  <span className="hidden sm:inline text-xs text-[#8A442B]">
                    모든 문구 입력칸에서 Enter로 줄바꿈 가능
                  </span>
                </div>

                <form
                  onSubmit={handleSaveCoverText}
                  className={`${
                    mobileOpenSection === '02'
                      ? 'block max-h-[34vh] overflow-y-auto pr-1 space-y-3'
                      : 'hidden'
                  } lg:block lg:max-h-none lg:overflow-visible lg:space-y-3`}
                >
                  {/* 표지 디자인 9종 선택 (3x3 그리드, 직접 올리기 포함) */}
                  <div className="space-y-1.5">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {COVER_LAYOUT_OPTIONS.map((opt) => {
                        const active = coverLayout === opt.id;
                        const isCustomUpload = opt.id === 'custom-upload';
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              setCoverLayout(opt.id);
                              if (opt.id === 'typography-cover') {
                                setCoverShowPhoto(false);
                              } else {
                                setCoverShowPhoto(true);
                              }
                              setCurrentIndex(0);
                              if (isCustomUpload) {
                                setIsRepositionMode(true);
                                if (!customCoverPhotoUrl) {
                                  coverPhotoInputRef.current?.click();
                                }
                              }
                            }}
                            className={`p-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                              active
                                ? 'bg-[#B64E2E] text-[#FBF8F3]'
                                : isCustomUpload
                                ? 'bg-[#E8E0D0] text-[#5E3422] hover:bg-[#DDD2BD] ring-1 ring-[#B64E2E]/40'
                                : 'bg-[#F2EDE3] text-[#5E3422] hover:bg-[#E8E0D0]'
                            }`}
                          >
                            <div className="text-xs font-bold leading-snug truncate">
                              {opt.label}
                            </div>
                            <div
                              className={`text-[10px] mt-0.5 truncate ${
                                active ? 'text-[#FBF8F3]/85' : 'text-[#8A442B]'
                              }`}
                            >
                              {opt.desc}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* 직접 올리기 & 표지 사진 드래그 크기 조절 빠른 바 */}
                    <div className="bg-[#F2EDE3] px-3 py-2 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => coverPhotoInputRef.current?.click()}
                          className="px-3 py-1 rounded-full bg-[#B64E2E] hover:bg-[#A3573E] text-[#FBF8F3] text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <ImagePlus className="w-3.5 h-3.5" />
                          <span>내 기기에서 표지 사진 직접 올리기 +</span>
                        </button>
                        {coverLayout === 'custom-upload' && (
                          <button
                            type="button"
                            onClick={() => {
                              const next = !customCoverShowText;
                              setCustomCoverShowText(next);
                              if (onUpdateBookSettings) {
                                onUpdateBookSettings({ customCoverShowText: next });
                              }
                            }}
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer ${
                              customCoverShowText
                                ? 'bg-[#5E3422] text-[#FBF8F3]'
                                : 'bg-[#FBF8F3] text-[#8A442B] border border-[#B64E2E]/40'
                            }`}
                          >
                            {customCoverShowText ? '표지 문구 표시 ON' : '표지 문구 숨김 (순수 이미지)'}
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 ml-auto">
                        <span className="text-[11px] font-medium text-[#5E3422]">
                          표지 사진 크기(드래그):
                        </span>
                        <input
                          type="range"
                          min="0.4"
                          max="3.0"
                          step="0.02"
                          value={coverCropZoom}
                          onChange={(e) => {
                            setCurrentIndex(0);
                            setIsRepositionMode(true);
                            handleToolbarAdjustPosition(0, 0, 0, false, Number(e.target.value));
                          }}
                          title="드래그하여 표지 사진 크기 조절 (40% ~ 300%)"
                          className="w-20 sm:w-28 accent-[#B64E2E] cursor-ew-resize"
                        />
                        <span className="text-xs font-mono-meta font-bold text-[#B64E2E] min-w-[36px] text-right">
                          {Math.round(coverCropZoom * 100)}%
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setCurrentIndex(0);
                            setIsRepositionMode((prev) => !prev);
                          }}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer ${
                            isRepositionMode
                              ? 'bg-[#806E43] text-[#FBF8F3]'
                              : 'bg-[#FBF8F3] text-[#8A442B] border border-[#B64E2E]/40'
                          }`}
                        >
                          {isRepositionMode ? '드래그 조절 켜짐' : '모서리 드래그 조절'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 표지 배경색 변경 (12색 팔레트 스와치 바) */}
                  <div className="bg-[#F2EDE3] p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-[#5E3422]">
                      <span className="font-medium">
                        표지 배경색:{' '}
                        <strong className="text-[#8A442B]">
                          {COVER_BG_COLORS.find(
                            (c) => c.hex.toLowerCase() === coverBgColor.toLowerCase()
                          )?.label || coverBgColor}
                        </strong>
                      </span>
                      <label className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-[#B64E2E]/45 text-[11px] text-[#8A442B] cursor-pointer">
                        <input
                          type="color"
                          value={coverBgColor}
                          onChange={(e) => {
                            setCoverBgColor(e.target.value);
                            setCurrentIndex(0);
                          }}
                          className="w-3 h-3 border-0 p-0 bg-transparent cursor-pointer"
                        />
                        <span>색상 직접 고르기</span>
                      </label>
                    </div>
                    <div className="grid grid-cols-12 gap-1.5">
                      {COVER_BG_COLORS.map((swatch) => {
                        const active = coverBgColor.toLowerCase() === swatch.hex.toLowerCase();
                        return (
                          <button
                            key={swatch.hex}
                            type="button"
                            onClick={() => {
                              setCoverBgColor(swatch.hex);
                              setCurrentIndex(0);
                            }}
                            title={swatch.label}
                            className={`h-7 rounded-md transition-transform cursor-pointer ${
                              active
                                ? 'ring-2 ring-[#5E3422] ring-offset-1 ring-offset-[#F2EDE3] scale-105'
                                : 'opacity-90 hover:opacity-100'
                            }`}
                            style={{ backgroundColor: swatch.hex }}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* 표지 문구 직접 수정 (모든 항목 줄바꿈 가능한 textarea + [가-][가+] 크기 조절) */}
                  <div className="bg-[#F2EDE3] p-3 space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-medium text-[#8A442B] mb-0.5">
                          <span>상단 왼쪽 문구 (줄바꿈 가능)</span>
                          {renderFontScaleControl('coverHeaderLeft', 0)}
                        </div>
                        <textarea
                          rows={1}
                          value={coverHeaderLeftInput}
                          onChange={(e) => {
                            setCoverHeaderLeftInput(e.target.value);
                            setCurrentIndex(0);
                          }}
                          placeholder="예: 2026 FAMILY ARCHIVE"
                          className="w-full bg-[#FBF8F3] px-2.5 py-1.5 text-xs text-[#5E3422] resize-y leading-snug"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-medium text-[#8A442B] mb-0.5">
                          <span>상단 오른쪽 문구 (줄바꿈 가능)</span>
                          {renderFontScaleControl('coverHeaderRight', 0)}
                        </div>
                        <textarea
                          rows={1}
                          value={coverHeaderRightInput}
                          onChange={(e) => {
                            setCoverHeaderRightInput(e.target.value);
                            setCurrentIndex(0);
                          }}
                          placeholder="예: 우리 가족 사계절 기록"
                          className="w-full bg-[#FBF8F3] px-2.5 py-1.5 text-xs text-[#5E3422] resize-y leading-snug"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-[11px] font-medium text-[#8A442B] mb-0.5">
                        <span>표지 큰 제목 (Enter로 줄바꿈 가능)</span>
                        {renderFontScaleControl('coverTitle', 0)}
                      </div>
                      <textarea
                        rows={2}
                        value={familyTitleInput}
                        onChange={(e) => {
                          setFamilyTitleInput(e.target.value);
                          setCurrentIndex(0);
                        }}
                        className="w-full bg-[#FBF8F3] px-2.5 py-1.5 text-xs sm:text-sm font-medium text-[#5E3422] resize-y leading-snug"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-medium text-[#8A442B] mb-0.5">
                          <span>부제목 (Enter로 줄바꿈 가능)</span>
                          {renderFontScaleControl('coverSubTitle', 0)}
                        </div>
                        <textarea
                          rows={2}
                          value={koreanTitleInput}
                          onChange={(e) => {
                            setKoreanTitleInput(e.target.value);
                            setCurrentIndex(0);
                          }}
                          className="w-full bg-[#FBF8F3] px-2.5 py-1.5 text-xs text-[#5E3422] resize-y leading-snug"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-medium text-[#8A442B] mb-0.5">
                          <span>하단 설명 문구 / 소개글 (Enter로 줄바꿈 가능)</span>
                          {renderFontScaleControl('coverDesc', 0)}
                        </div>
                        <textarea
                          rows={2}
                          value={subtitleInput}
                          onChange={(e) => {
                            setSubtitleInput(e.target.value);
                            setCurrentIndex(0);
                          }}
                          className="w-full bg-[#FBF8F3] px-2.5 py-1.5 text-xs text-[#5E3422] resize-y leading-snug"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-[#B64E2E] hover:bg-[#A3573E] text-[#FBF8F3] rounded-full text-xs sm:text-sm font-medium cursor-pointer"
                  >
                    표지 설정 저장하기 +
                  </button>
                </form>
              </section>
            </>
          )}
        </div>
      </div>

      {/* 3. 사진첩 제작 신청 & 가족 서재 보관 모달 */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-[480px] p-5 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 border-b border-neutral-200 pb-3.5">
              <div>
                <h3 className="text-base font-bold text-[#111111]">
                  사진첩 제작 확정 및 보관
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {currentPeriodLabel} · 사진 {curatedPhotos.length}장 ({pages.length}쪽)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCheckoutOpen(false)}
                className="p-1 text-neutral-400 hover:text-[#111111] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCompleteOnDemandOrder} className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPackageOption('pdf-only')}
                  className={`p-3 rounded-xl border text-left cursor-pointer ${
                    packageOption === 'pdf-only'
                      ? 'bg-[#111111] text-white border-[#111111]'
                      : 'bg-[#F8F7F4] text-[#111111] border-neutral-200'
                  }`}
                >
                  <div className="text-xs font-bold">디지털 PDF 보관</div>
                  <div
                    className={`text-[11px] mt-1 ${
                      packageOption === 'pdf-only' ? 'text-neutral-300' : 'text-neutral-500'
                    }`}
                  >
                    서재 영구 보관 ({designFee.toLocaleString()}원)
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPackageOption('pdf-and-print')}
                  className={`p-3 rounded-xl border text-left cursor-pointer ${
                    packageOption === 'pdf-and-print'
                      ? 'bg-[#111111] text-white border-[#111111]'
                      : 'bg-[#F8F7F4] text-[#111111] border-neutral-200'
                  }`}
                >
                  <div className="text-xs font-bold">PDF + 실물 책자 인쇄</div>
                  <div
                    className={`text-[11px] mt-1 ${
                      packageOption === 'pdf-and-print' ? 'text-neutral-300' : 'text-neutral-500'
                    }`}
                  >
                    고해상도 제본 · 가구별 배송
                  </div>
                </button>
              </div>

              {packageOption === 'pdf-and-print' && (
                <div className="bg-[#F8F7F4] border border-neutral-200 rounded-xl p-3.5 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPodBindingType('hardcover')}
                      className={`p-2.5 rounded-lg border text-left cursor-pointer ${
                        podBindingType === 'hardcover'
                          ? 'bg-[#111111] text-white border-[#111111]'
                          : 'bg-white text-[#111111] border-neutral-200'
                      }`}
                    >
                      <div className="text-xs font-bold">양장 하드커버</div>
                      <div className="text-[11px] opacity-75 mt-0.5">38,000원 / 권</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPodBindingType('softcover')}
                      className={`p-2.5 rounded-lg border text-left cursor-pointer ${
                        podBindingType === 'softcover'
                          ? 'bg-[#111111] text-white border-[#111111]'
                          : 'bg-white text-[#111111] border-neutral-200'
                      }`}
                    >
                      <div className="text-xs font-bold">소프트커버</div>
                      <div className="text-[11px] opacity-75 mt-0.5">24,000원 / 권</div>
                    </button>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-neutral-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#111111]">
                        배송지 및 부수 ({totalPodCopies}권)
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAddDestination()}
                        className="text-xs font-semibold text-[#111111] underline cursor-pointer"
                      >
                        + 배송지 추가
                      </button>
                    </div>

                    {destinations.map((dest, idx) => (
                      <div
                        key={dest.id}
                        className="p-2.5 rounded-lg bg-white border border-neutral-200 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-[#111111]">
                            배송지 {idx + 1}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateDestination(dest.id, {
                                  copies: Math.max(1, (dest.copies || 1) - 1),
                                })
                              }
                              className="w-6 h-6 rounded border border-neutral-200 text-xs font-bold cursor-pointer"
                            >
                              -
                            </button>
                            <span className="text-xs font-semibold px-1">{dest.copies}권</span>
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateDestination(dest.id, {
                                  copies: Math.min(20, (dest.copies || 1) + 1),
                                })
                              }
                              className="w-6 h-6 rounded border border-neutral-200 text-xs font-bold cursor-pointer"
                            >
                              +
                            </button>
                            {destinations.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveDestination(dest.id)}
                                className="text-[11px] text-neutral-400 hover:text-red-600 ml-1 cursor-pointer"
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
                              handleUpdateDestination(dest.id, {
                                householdLabel: e.target.value,
                              })
                            }
                            placeholder="가구명 (예: 본가)"
                            className="border border-neutral-200 rounded px-2 py-1.5 text-xs"
                          />
                          <input
                            type="text"
                            value={dest.recipientName}
                            onChange={(e) =>
                              handleUpdateDestination(dest.id, {
                                recipientName: e.target.value,
                              })
                            }
                            placeholder="받는 분"
                            className="border border-neutral-200 rounded px-2 py-1.5 text-xs"
                          />
                        </div>
                        <input
                          type="text"
                          value={dest.address}
                          onChange={(e) =>
                            handleUpdateDestination(dest.id, {
                              address: e.target.value,
                            })
                          }
                          placeholder="배송 주소"
                          className="w-full border border-neutral-200 rounded px-2 py-1.5 text-xs"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between py-2 border-t border-neutral-200">
                <span className="text-xs font-medium text-neutral-500">결제 금액</span>
                <span className="text-base font-bold text-[#111111]">
                  {totalCheckoutPrice.toLocaleString()}원
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsCheckoutOpen(false)}
                  className="flex-1 py-3 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-600 cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-2 py-3 px-4 rounded-xl bg-[#111111] text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>서재에 보관 및 제작 신청</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Offscreen High-Resolution Render Container for PDF Generation */}
      <div
        ref={pdfExportContainerRef}
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
        {pages.map((pg) => (
          <div
            key={`pdf-${pg.id}`}
            className="pdf-render-sheet"
            style={{ width: '794px', height: '1123px', overflow: 'hidden' }}
          >
            <BookPageRenderer
              page={pg}
              members={members}
              bookSettings={studioBookSettings}
              side="single"
              isPrint={true}
              printSpec={pdfRenderSpec}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
