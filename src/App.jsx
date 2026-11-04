import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Upload,
  Users,
  Share2,
  CheckCircle2,
  MapPin,
  UserCog,
  Home,
  Library,
  Sparkles,
  Camera,
  ZoomIn,
  Edit3,
  Building2,
  User,
} from 'lucide-react';
import { buildPhotobookPages } from './utils/bookLayoutEngine';
import HomeFeedView from './components/HomeFeedView';
import PhotobookStudioView from './components/PhotobookStudioView';
import FamilyLibraryView from './components/FamilyLibraryView';
import ProfileFamilySettingsPage from './components/ProfileFamilySettingsPage';
import MyPageView from './components/MyPageView';
import UploadModal from './components/UploadModal';
import PhotoDetailModal from './components/PhotoDetailModal';
import FamilyCloudModal from './components/FamilyCloudModal';
import BookPageRenderer from './components/BookPageRenderer';

export default function App() {
  const [photos, setPhotos] = useState([]);
  const [members, setMembers] = useState([]);
  const [bookSettings, setBookSettings] = useState({
    year: 2026,
    familyTitle: '박서 오피스 — 우리 가족 사진첩',
    title: '박서 오피스 — 우리 가족 사진첩',
    koreanTitle: '각자의 계절, 하나의 시간',
    subtitle: '온 가족이 함께 모으는 사계절 사진첩',
    paperTheme: 'ivory',
    layoutDensity: 'ten-per-page',
    includeMonthDividers: false,
    publishedBooks: [],
    printOrders: [],
  });
  const [cloudStatus, setCloudStatus] = useState({
    connected: false,
    mode: 'local-server',
  });
  const [loading, setLoading] = useState(true);

  // 진입 즉시 메인 피드가 노출되도록 기본 탭을 'home' (홈 메인 피드)으로 설정!
  // 'home' | 'studio' | 'library' | 'profile'
  const [activeTab, setActiveTab] = useState('home');

  // 어르신 · 어린이 맞춤 큰 글씨 모드
  const [largeTextMode, setLargeTextMode] = useState(
    () => localStorage.getItem('fivestar_large_text') === 'true'
  );

  useEffect(() => {
    if (largeTextMode) {
      document.documentElement.classList.add('large-text-mode');
    } else {
      document.documentElement.classList.remove('large-text-mode');
    }
    localStorage.setItem('fivestar_large_text', String(largeTextMode));
  }, [largeTextMode]);

  // 현재 접속 중인 내 가족 프로필
  const [activeMemberId, setActiveMemberId] = useState(
    () => localStorage.getItem('fivestar_active_member') || 'member-first'
  );

  // 홈(메인 피드) 필터 상태
  const [selectedSeason, setSelectedSeason] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedMemberFilter, setSelectedMemberFilter] = useState('all');

  // 페이지 레이아웃 모양 변환 상태
  const [pageVariants, setPageVariants] = useState({});

  // 모달 상태
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedPhotoId, setSelectedPhotoId] = useState(null);
  const [familyModalState, setFamilyModalState] = useState({
    open: false,
    tab: 'members',
  });
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? '' : prev));
    }, 4000);
  };

  const fetchArchive = async () => {
    try {
      const res = await fetch('/api/archive');
      if (!res.ok) throw new Error('Failed to load archive');
      const data = await res.json();
      setPhotos(data.photos || []);
      setMembers(data.members || []);
      if (data.bookSettings) setBookSettings((prev) => ({ ...prev, ...data.bookSettings }));
      if (data.cloudStatus) setCloudStatus(data.cloudStatus);
    } catch (err) {
      console.error('Archive load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchive();
  }, []);

  const handleSelectActiveMember = (id) => {
    setActiveMemberId(id);
    localStorage.setItem('fivestar_active_member', id);
    const found = members.find((m) => m.id === id);
    if (found) {
      showToast(`현재 내 프로필이 '${found.name} (${found.city})'(으)로 선택되었습니다.`);
    }
  };

  // 사진첩 페이지 자동 조판
  const compiledPages = useMemo(() => {
    return buildPhotobookPages(photos, members, bookSettings, pageVariants);
  }, [photos, members, bookSettings, pageVariants]);

  const selectedPhoto = useMemo(
    () => photos.find((p) => p.id === selectedPhotoId) || null,
    [photos, selectedPhotoId]
  );

  const handleCyclePageVariant = (pageId) => {
    setPageVariants((prev) => ({
      ...prev,
      [pageId]: (prev[pageId] || 0) + 1,
    }));
    showToast('해당 쪽의 사진 배치 모양이 변경되었습니다.');
  };

  // 사진 업로드 성공 핸들러
  const handleUploadSuccess = (allPhotos, newPhotos) => {
    setPhotos(allPhotos);
    const months = [...new Set(newPhotos.map((p) => `${p.month}월`))].join(', ');
    showToast(
      `새 사진 ${newPhotos.length}장이 가족 피드와 ${months} 사진첩에 등록되었습니다!`
    );
  };

  // 사진 정보 또는 위치 업데이트 핸들러
  const handleUpdatePhoto = async (photoId, patch) => {
    setPhotos((prev) =>
      prev.map((p) => (p.id === photoId ? { ...p, ...patch } : p))
    );
    const res = await fetch(`/api/photos/${photoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const data = await res.json();
      setPhotos(data.allPhotos);
      if (typeof patch.cropX === 'number') {
        showToast('사진 위치 및 크기 조절이 저장되었습니다.');
      } else {
        showToast('사진 내용이 수정되었습니다.');
      }
    }
  };

  // 공감 반응 (사랑해요 / 최고예요 / 반가워요) 토글 핸들러
  const handleToggleReaction = async (photoId, reactionType = 'heart') => {
    const mId = activeMemberId || members[0]?.id || 'member-first';

    // 낙관적 즉시 업데이트
    setPhotos((prev) =>
      prev.map((p) => {
        if (p.id !== photoId) return p;
        const currReactions = p.reactions || { heart: [], clap: [], smile: [] };
        const currList = Array.isArray(currReactions[reactionType])
          ? [...currReactions[reactionType]]
          : [];
        const idx = currList.indexOf(mId);
        if (idx === -1) currList.push(mId);
        else currList.splice(idx, 1);
        return {
          ...p,
          reactions: {
            ...currReactions,
            [reactionType]: currList,
          },
        };
      })
    );

    try {
      const res = await fetch(`/api/photos/${photoId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: mId, type: reactionType }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.allPhotos) setPhotos(data.allPhotos);
      }
    } catch (err) {
      console.error('Reaction error:', err);
    }
  };

  const handleDeletePhoto = async (photoId) => {
    const res = await fetch(`/api/photos/${photoId}`, { method: 'DELETE' });
    if (res.ok) {
      const data = await res.json();
      setPhotos(data.allPhotos);
      showToast('사진이 삭제되었습니다.');
    }
  };

  const handleAddComment = async (photoId, memberId, text) => {
    const res = await fetch(`/api/photos/${photoId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId, text }),
    });
    if (res.ok) {
      const data = await res.json();
      setPhotos(data.allPhotos);
      showToast('가족 댓글이 등록되었습니다.');
    }
  };

  const handleDeleteComment = async (photoId, commentId) => {
    const res = await fetch(`/api/photos/${photoId}/comments/${commentId}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      const data = await res.json();
      setPhotos(data.allPhotos);
    }
  };

  const handleUpdateBookSettings = async (patch) => {
    setBookSettings((prev) => ({ ...prev, ...patch }));
    const res = await fetch('/api/book-settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const data = await res.json();
      setBookSettings(data.bookSettings);
    }
  };

  // 사진첩 스튜디오에서 시안 검수 후 '가족 서재'에 사진첩 완성 보관하기
  const handlePublishBookToLibrary = async (newBook) => {
    const existingBooks = Array.isArray(bookSettings.publishedBooks)
      ? bookSettings.publishedBooks
      : [
          {
            id: 'book-2026-annual',
            title: '2026년 우리 가족 사계절 사진첩 (연간 종합본)',
            subtitle: '온 가족이 일 년 동안 함께 모은 사계절 추억 기록집',
            periodType: 'annual',
            periodLabel: '연간 전체 (2026년 1월 ~ 12월)',
            createdAt: '2026-11-01',
            status: '제작 완료 · 열람 및 인쇄 가능',
            bindingType: '고급 양장 하드커버',
          },
        ];

    const updatedBooks = [newBook, ...existingBooks];
    await handleUpdateBookSettings({ publishedBooks: updatedBooks });
    showToast(`'${newBook.title}' 사진첩이 완성되어 [가족 서재]에 보관되었습니다!`);
    setActiveTab('library');
  };

  const syncSubtitleCities = (updatedMembers) => {
    const updatedCities = [...new Set(updatedMembers.map((m) => m.city).filter(Boolean))];
    if (
      bookSettings.subtitle &&
      bookSettings.subtitle.includes('에서 보낸') &&
      updatedCities.length > 0
    ) {
      const newSub = `${updatedCities.join(' · ')}에서 보낸 ${
        bookSettings.year || 2026
      }년 우리 가족의 사계절 기록`;
      handleUpdateBookSettings({ subtitle: newSub });
    }
  };

  const handleAddMember = async (memberPayload) => {
    const res = await fetch('/api/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(memberPayload),
    });
    if (res.ok) {
      const data = await res.json();
      setMembers(data.members);
      syncSubtitleCities(data.members);
      showToast(`새 가족 '${memberPayload.name}'님이 추가되었습니다.`);
    }
  };

  const handleUpdateMember = async (memberId, patch) => {
    const optimisticMembers = members.map((m) => {
      if (m.id !== memberId) return m;
      const nextName = patch.name ? patch.name.trim() : m.name;
      const nextCity = typeof patch.city === 'string' ? patch.city.trim() : m.city;
      const nextRole =
        typeof patch.role === 'string' && patch.role.trim() ? patch.role.trim() : nextCity;
      return {
        ...m,
        name: nextName,
        city: nextCity,
        role: nextRole,
        avatar: patch.avatar ? patch.avatar.trim().slice(0, 2) : nextName.slice(0, 2),
        avatarImage:
          typeof patch.avatarImage === 'string' ? patch.avatarImage : m.avatarImage,
        color: patch.color || m.color,
        badgeBg: patch.badgeBg || m.badgeBg,
      };
    });
    setMembers(optimisticMembers);
    syncSubtitleCities(optimisticMembers);

    try {
      const target = optimisticMembers.find((m) => m.id === memberId);
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: memberId,
          ...target,
          ...patch,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.members) {
          setMembers(data.members);
          syncSubtitleCities(data.members);
        }
      }
      showToast(
        `'${patch.name || target?.name || '가족'}' 프로필 및 거주 도시('${
          patch.city || target?.city || ''
        }')가 저장되었습니다!`
      );
    } catch (err) {
      console.error('Failed to update member:', err);
    }
  };

  const handleDeleteMember = async (memberId) => {
    const res = await fetch(`/api/members/${memberId}`, { method: 'DELETE' });
    if (res.ok) {
      const data = await res.json();
      setMembers(data.members);
      syncSubtitleCities(data.members);
      showToast('가족 구성원이 삭제되었습니다.');
    }
  };

  const handleReorderMembers = async (reorderedMembers) => {
    setMembers(reorderedMembers);
    syncSubtitleCities(reorderedMembers);

    try {
      const orderedIds = reorderedMembers.map((m) => m.id);
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.members) {
          setMembers(data.members);
          syncSubtitleCities(data.members);
        }
      }
      showToast('가족 명단 및 도시 순서가 저장되었습니다.');
    } catch (err) {
      console.error('Failed to reorder members:', err);
    }
  };

  const handleSaveCloudConfig = async (cfg) => {
    const res = await fetch('/api/cloud-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cfg),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '연결 실패');
    if (data.cloudStatus) setCloudStatus(data.cloudStatus);
    return data;
  };

  const handleResetArchive = async (mode) => {
    const res = await fetch('/api/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
    });
    if (res.ok) {
      const data = await res.json();
      setPhotos(data.photos || []);
      setMembers(data.members || []);
      if (data.bookSettings) setBookSettings(data.bookSettings);
      showToast(
        mode === 'empty'
          ? '샘플 사진이 비워졌습니다. 이제 우리 가족의 첫 사진을 올려보세요!'
          : '우리 가족 샘플 사진첩이 복원되었습니다.'
      );
    }
  };

  const activeMember =
    members.find((m) => m.id === activeMemberId) ||
    members[0] || { id: 'member-first', name: '가족', city: '부산', color: '#141413' };

  const uniqueCities = [...new Set(members.map((m) => m.city).filter(Boolean))];
  const displayFamilyName =
    bookSettings.familyTitle ||
    (bookSettings.title && !bookSettings.title.includes('OUR YEAR')
      ? bookSettings.title
      : '박서 오피스 — 우리 가족 사진첩');

  // 미니멀 기하학 라인 아이콘 (테라코타·웜토프 톤)
  const renderMenuIcon = (id, isActive) => {
    const strokeColor = isActive ? '#B64E2E' : '#A69B80';
    switch (id) {
      case 'home':
        return (
          <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
            <rect
              x="4"
              y="4"
              width="20"
              height="20"
              stroke={strokeColor}
              strokeWidth={isActive ? '1.8' : '1.4'}
            />
            {[9, 14, 19].map((cx) =>
              [9, 14, 19].map((cy) => (
                <circle
                  key={`${cx}-${cy}`}
                  cx={cx}
                  cy={cy}
                  r="1.15"
                  fill={strokeColor}
                />
              ))
            )}
          </svg>
        );
      case 'studio':
        return (
          <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
            <rect
              x="4"
              y="4"
              width="20"
              height="20"
              stroke={strokeColor}
              strokeWidth={isActive ? '1.8' : '1.4'}
            />
            <line x1="12" y1="22" x2="22" y2="12" stroke={strokeColor} strokeWidth="1.4" />
            <line x1="15.5" y1="22" x2="22" y2="15.5" stroke={strokeColor} strokeWidth="1.4" />
            <line x1="19" y1="22" x2="22" y2="19" stroke={strokeColor} strokeWidth="1.4" />
          </svg>
        );
      case 'library':
        return (
          <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
            <path
              d="M14 5L23 11L14 17L5 11L14 5Z"
              stroke={strokeColor}
              strokeWidth={isActive ? '1.8' : '1.4'}
              strokeLinejoin="round"
            />
            <path
              d="M5 16.5L14 22.5L23 16.5"
              stroke={strokeColor}
              strokeWidth={isActive ? '1.8' : '1.4'}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );
      case 'mypage':
      default:
        return (
          <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
            <circle
              cx="14"
              cy="14"
              r="9"
              stroke={strokeColor}
              strokeWidth="1.3"
              strokeDasharray="3.2 2.4"
            />
            <circle
              cx="14"
              cy="14"
              r="5.5"
              stroke={strokeColor}
              strokeWidth={isActive ? '1.8' : '1.4'}
            />
          </svg>
        );
    }
  };

  const BOTTOM_MENUS = [
    { id: 'home', label: '홈' },
    { id: 'studio', label: '스튜디오' },
    { id: 'library', label: '가족 서재' },
    { id: 'mypage', label: '마이페이지' },
  ];

  const currentTabObj =
    BOTTOM_MENUS.find((m) => m.id === activeTab) || BOTTOM_MENUS[0];

  return (
    <div className="min-h-screen bg-[#FBF8F3] text-[#5E3422] flex flex-col">
      {/* 알림 토스트 */}
      {toastMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 w-[90%] max-w-[460px] z-50 bg-[#B64E2E] text-[#FBF8F3] px-5 py-3.5 rounded-full text-sm font-medium shadow-md flex items-center justify-between no-print">
          <span>{toastMsg}</span>
        </div>
      )}

      {/* =====================================================================
          반응형 웹앱 레이아웃 (re_ 감성 크림·테라코타·올리브오커 톤 · 테두리 최소화)
      ====================================================================== */}
      <div className="no-print w-full min-h-screen flex flex-col relative pb-28 md:pb-16">
        {/* 상단 미니멀 유틸리티 & 네비게이션 바 */}
        <header className="sticky top-0 z-40 bg-[#FBF8F3]/95 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 pt-4 pb-3 flex items-center justify-between gap-4">
            {/* 좌측: 데스크톱 메뉴 또는 홈 바로가기 */}
            <div className="flex items-center gap-6">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('home');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="text-sm sm:text-base font-medium text-[#8A442B] hover:text-[#B64E2E] cursor-pointer"
              >
                우리 가족 기록장
              </button>

              <nav
                aria-label="웹 상단 메뉴"
                className="hidden md:flex items-center gap-1.5"
              >
                {BOTTOM_MENUS.map((menu) => {
                  const isActive = activeTab === menu.id;
                  return (
                    <button
                      key={menu.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(menu.id);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className={`px-4 py-1.5 rounded-full text-sm sm:text-base font-medium transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#B64E2E] text-[#FBF8F3]'
                          : 'text-[#8A442B] hover:text-[#B64E2E] hover:bg-[#F2EDE3]'
                      }`}
                    >
                      {menu.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* 우측: 큰 글씨 & 사진 올리기 필 버튼 */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setLargeTextMode((prev) => !prev)}
                className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium border transition-colors cursor-pointer ${
                  largeTextMode
                    ? 'bg-[#7E7763] text-[#FBF8F3] border-[#7E7763]'
                    : 'border-[#B64E2E]/45 text-[#8A442B] hover:border-[#B64E2E]'
                }`}
              >
                {largeTextMode ? '기본 글씨' : '큰 글씨'}
              </button>

              <button
                type="button"
                onClick={() => setIsUploadOpen(true)}
                className="px-4 py-1.5 sm:px-5 sm:py-2 bg-[#B64E2E] hover:bg-[#A3573E] text-[#FBF8F3] rounded-full text-xs sm:text-sm font-medium cursor-pointer"
              >
                사진 올리기 +
              </button>
            </div>
          </div>

          {/* 에디토리얼 타이틀 행 (re_ / Pasta 감성) */}
          <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 pt-2 pb-5 flex flex-wrap items-baseline gap-x-4 sm:gap-x-8 gap-y-1">
            <button
              type="button"
              onClick={() => {
                setActiveTab('home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="text-left cursor-pointer"
            >
              <h1 className="font-editorial-ko text-2xl sm:text-4xl font-normal tracking-tight text-[#B64E2E]">
                {displayFamilyName}
              </h1>
            </button>
            <span className="text-xl sm:text-3xl font-light text-[#CD6E50] tracking-tight">
              / {currentTabObj.label}
            </span>
          </div>
        </header>

        {/* 메인 반응형 콘텐츠 컨테이너 */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 pt-2">
          {loading ? (
            <div className="py-24 text-center text-base text-[#8A442B]">
              사진첩을 불러오는 중입니다...
            </div>
          ) : activeTab === 'home' ? (
            <HomeFeedView
              photos={photos}
              members={members}
              activeMemberId={activeMember.id}
              selectedMemberId={selectedMemberFilter}
              onSelectMemberId={setSelectedMemberFilter}
              selectedSeason={selectedSeason}
              onSelectSeason={setSelectedSeason}
              selectedMonth={selectedMonth}
              onSelectMonth={setSelectedMonth}
              onSelectPhoto={(photo) => setSelectedPhotoId(photo.id)}
              onToggleFavorite={(photo) =>
                handleUpdatePhoto(photo.id, { isFavorite: !photo.isFavorite })
              }
              onToggleReaction={handleToggleReaction}
              onAddComment={handleAddComment}
              onDeleteComment={handleDeleteComment}
              onUpdatePhoto={handleUpdatePhoto}
              onUpdatePhotoPosition={handleUpdatePhoto}
              onAddMember={handleAddMember}
              onUploadSuccess={handleUploadSuccess}
              onOpenUploadModal={() => setIsUploadOpen(true)}
              onSwitchToStudio={() => setActiveTab('studio')}
              onSwitchToProfile={() => setActiveTab('mypage')}
            />
          ) : activeTab === 'studio' ? (
            <PhotobookStudioView
              photos={photos}
              pages={compiledPages}
              members={members}
              activeMemberId={activeMember.id}
              bookSettings={bookSettings}
              pageVariants={pageVariants}
              onUpdateBookSettings={handleUpdateBookSettings}
              onSelectPhoto={(photo) => setSelectedPhotoId(photo.id)}
              onCycleVariant={handleCyclePageVariant}
              onUpdatePhotoPosition={handleUpdatePhoto}
              onPublishBookToLibrary={handlePublishBookToLibrary}
              onSwitchToLibrary={() => setActiveTab('library')}
            />
          ) : activeTab === 'library' ? (
            <FamilyLibraryView
              photos={photos}
              members={members}
              activeMemberId={activeMember.id}
              bookSettings={bookSettings}
              onUpdateBookSettings={handleUpdateBookSettings}
              onSelectPhoto={(photo) => setSelectedPhotoId(photo.id)}
              onSwitchToStudio={() => setActiveTab('studio')}
              showToast={showToast}
            />
          ) : (
            <MyPageView
              members={members}
              photos={photos}
              activeMemberId={activeMember.id}
              bookSettings={bookSettings}
              onSelectActiveMember={handleSelectActiveMember}
              onUpdateMember={handleUpdateMember}
              onReorderMembers={handleReorderMembers}
              onAddMember={handleAddMember}
              onDeleteMember={handleDeleteMember}
              onUpdateBookSettings={handleUpdateBookSettings}
              onSwitchToLibrary={() => setActiveTab('library')}
              showToast={showToast}
            />
          )}
        </main>

        {/* ===================================================================
            모바일 전용 하단 고정 메뉴바 (웜 크림 배경 + 테라코타/토프 심볼)
        =================================================================== */}
        <nav
          aria-label="하단 메뉴"
          className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-[#FBF8F3]/95 backdrop-blur-md border-t border-[#E6DEC8] px-2 pt-3 pb-4 grid grid-cols-4"
        >
          {BOTTOM_MENUS.map((menu) => {
            const isActive = activeTab === menu.id;
            return (
              <button
                key={menu.id}
                type="button"
                onClick={() => {
                  setActiveTab(menu.id);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="flex flex-col items-center justify-center gap-1.5 cursor-pointer select-none"
              >
                {renderMenuIcon(menu.id, isActive)}
                <span
                  className={`text-xs tracking-wide leading-none ${
                    isActive
                      ? 'text-[#B64E2E] font-bold'
                      : 'text-[#A69B80] font-normal'
                  }`}
                >
                  {menu.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* 브라우저 인쇄용 고해상도 북 레이아웃 */}
      <div className="hidden print-only-book">
        {compiledPages.map((pg) => (
          <div key={`print-${pg.id}`} className="print-page-sheet">
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

      {/* 모달 창 */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        members={members}
        activeMemberId={activeMember.id}
        onUpdateMember={handleUpdateMember}
        onUploadSuccess={handleUploadSuccess}
      />

      <PhotoDetailModal
        photo={selectedPhoto}
        onClose={() => setSelectedPhotoId(null)}
        members={members}
        activeMemberId={activeMember.id}
        bookSettings={bookSettings}
        onUpdatePhoto={handleUpdatePhoto}
        onDeletePhoto={handleDeletePhoto}
        onAddComment={handleAddComment}
        onDeleteComment={handleDeleteComment}
        onSetAsCover={(url) => {
          handleUpdateBookSettings({ coverPhotoUrl: url });
        }}
      />

      <FamilyCloudModal
        isOpen={familyModalState.open}
        onClose={() => setFamilyModalState({ ...familyModalState, open: false })}
        initialTab={familyModalState.tab}
        members={members}
        activeMemberId={activeMember.id}
        bookSettings={bookSettings}
        cloudStatus={cloudStatus}
        onAddMember={handleAddMember}
        onUpdateMember={handleUpdateMember}
        onDeleteMember={handleDeleteMember}
        onUpdateBookSettings={handleUpdateBookSettings}
        onSaveCloudConfig={handleSaveCloudConfig}
        onResetArchive={handleResetArchive}
      />
    </div>
  );
}
