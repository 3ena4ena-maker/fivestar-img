import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Lock,
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

  // 진입 즉시 메인 피드가 노출되도록 기본 탭을 'home' (홈 메인 피드)으로 설정, 새로고침 시 현재 탭 유지
  const [activeTab, setActiveTabState] = useState(
    () => sessionStorage.getItem('fivestar_active_tab') || 'home'
  );
  const setActiveTab = (nextTab) => {
    setActiveTabState(nextTab);
    try {
      sessionStorage.setItem('fivestar_active_tab', nextTab);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    document.documentElement.classList.remove('large-text-mode');
    localStorage.removeItem('fivestar_large_text');
  }, []);

  // 현재 접속 중인 내 가족 프로필 & 본인 확인(선택) 완료 여부
  const [activeMemberId, setActiveMemberId] = useState(
    () => localStorage.getItem('fivestar_active_member') || 'member-first'
  );
  const [isMemberConfirmed, setIsMemberConfirmed] = useState(
    () => localStorage.getItem('fivestar_member_confirmed') === 'true'
  );
  const [isChoosingMember, setIsChoosingMember] = useState(false);

  // 우리 가족 전용 페이지 잠금 상태 (가족 비밀번호/초대 코드가 일치해야 열람·업로드 가능)
  const [unlockedCode, setUnlockedCode] = useState(
    () => localStorage.getItem('fivestar_unlocked_code') || ''
  );
  const [passcodeInput, setPasscodeInput] = useState('');
  const [passcodeError, setPasscodeError] = useState('');

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

  const lastUpdatedAtRef = useRef('');

  const fetchArchive = async (silent = false) => {
    try {
      const res = await fetch(`/api/archive?t=${Date.now()}`, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('Failed to load archive');
      const data = await res.json();
      const incomingStamp = `${data.cloudStatus?.updatedAt || data.updatedAt || ''}-${
        (data.photos || []).length
      }`;
      if (silent && incomingStamp && incomingStamp === lastUpdatedAtRef.current) {
        return;
      }
      lastUpdatedAtRef.current = incomingStamp;
      setPhotos(data.photos || []);
      setMembers(data.members || []);
      if (data.bookSettings) setBookSettings((prev) => ({ ...prev, ...data.bookSettings }));
      if (data.cloudStatus) setCloudStatus(data.cloudStatus);
    } catch (err) {
      if (!silent) console.error('Archive load error:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchive(false);

    const handleSyncOnFocus = () => {
      if (document.visibilityState === 'visible') {
        const activeTag = document.activeElement?.tagName;
        if (activeTag !== 'INPUT' && activeTag !== 'TEXTAREA') {
          fetchArchive(true);
        }
      }
    };

    window.addEventListener('focus', handleSyncOnFocus);
    document.addEventListener('visibilitychange', handleSyncOnFocus);

    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        const activeTag = document.activeElement?.tagName;
        if (activeTag !== 'INPUT' && activeTag !== 'TEXTAREA') {
          fetchArchive(true);
        }
      }
    }, 8000);

    return () => {
      window.removeEventListener('focus', handleSyncOnFocus);
      document.removeEventListener('visibilitychange', handleSyncOnFocus);
      clearInterval(intervalId);
    };
  }, []);

  const handleSelectActiveMember = (id) => {
    setActiveMemberId(id);
    localStorage.setItem('fivestar_active_member', id);
    setIsMemberConfirmed(true);
    localStorage.setItem('fivestar_member_confirmed', 'true');
    setIsChoosingMember(false);
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
    const target = photos.find((p) => p.id === photoId);
    const payerId = bookSettings.payerMemberId || 'member-first';
    const isRep = activeMemberId === payerId;
    if (target && !isRep && target.memberId !== activeMemberId) {
      showToast('본인이 올린 사진만 삭제할 수 있습니다.');
      return;
    }
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
    if (typeof patch.familyCode === 'string' && patch.familyCode.trim()) {
      const cleanCode = patch.familyCode.trim();
      setUnlockedCode(cleanCode);
      localStorage.setItem('fivestar_unlocked_code', cleanCode);
    }
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

  const handleSaveMembersList = async (nextMembers) => {
    setMembers(nextMembers);
    syncSubtitleCities(nextMembers);

    try {
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replaceMembers: nextMembers }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.members) {
          setMembers(data.members);
          syncSubtitleCities(data.members);
        }
      }
      showToast('가족 구성원 명단이 저장되었습니다.');
    } catch (err) {
      console.error('Failed to save members list:', err);
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

  const expectedFamilyCode = String(bookSettings.familyCode || '2026FAM').trim();
  const isPageUnlocked =
    unlockedCode.trim().toUpperCase() === expectedFamilyCode.toUpperCase();
  const payerMemberId = bookSettings.payerMemberId || 'member-first';
  const isCurrentRepresentative = activeMember.id === payerMemberId;

  const handleUnlockSubmit = (e) => {
    e.preventDefault();
    const entered = passcodeInput.trim();
    if (!entered) {
      setPasscodeError('가족 비밀번호(초대 코드)를 입력해 주세요.');
      return;
    }
    if (entered.toUpperCase() === expectedFamilyCode.toUpperCase()) {
      setUnlockedCode(expectedFamilyCode);
      localStorage.setItem('fivestar_unlocked_code', expectedFamilyCode);
      setPasscodeInput('');
      setPasscodeError('');
      setIsChoosingMember(true);
    } else {
      setPasscodeError('비밀번호(초대 코드)가 일치하지 않습니다. 다시 확인해 주세요.');
    }
  };

  const handleLockPage = () => {
    localStorage.removeItem('fivestar_unlocked_code');
    localStorage.removeItem('fivestar_member_confirmed');
    setUnlockedCode('');
    setIsMemberConfirmed(false);
    setIsChoosingMember(false);
    setPasscodeInput('');
    setPasscodeError('');
  };

  if (!isPageUnlocked) {
    return (
      <div className="min-h-screen bg-[#FBF8F3] text-[#5E3422] flex flex-col items-center justify-center px-5 py-12">
        <div className="w-full max-w-[420px] bg-[#F2EDE3] rounded-3xl p-7 sm:p-9 space-y-6 shadow-xs">
          <div className="flex flex-col items-center text-center space-y-2.5">
            <div className="w-12 h-12 rounded-full bg-[#B64E2E] text-[#FBF8F3] flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <span className="px-3 py-1 rounded-full bg-[#FBF8F3] text-[#B64E2E] text-xs font-bold tracking-wide">
              우리 가족 전용 비공개 사진첩
            </span>
            <h1 className="font-editorial-ko text-2xl sm:text-3xl font-bold text-[#5E3422] tracking-tight pt-1">
              {displayFamilyName}
            </h1>
            <p className="text-xs sm:text-sm text-[#8A442B] leading-relaxed">
              초대받은 우리 가족만 사진을 보고 올릴 수 있습니다.
              <br />
              전달받은 <strong>가족 비밀번호(초대 코드)</strong>를 입력해 주세요.
            </p>
          </div>

          <form onSubmit={handleUnlockSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-[#8A442B] mb-1.5">
                가족 비밀번호 (초대 코드)
              </label>
              <input
                type="password"
                value={passcodeInput}
                onChange={(e) => {
                  setPasscodeInput(e.target.value);
                  if (passcodeError) setPasscodeError('');
                }}
                placeholder="비밀번호(초대 코드) 입력"
                autoFocus
                className="w-full bg-[#FBF8F3] rounded-2xl px-4 py-3.5 text-center text-base font-bold tracking-widest text-[#5E3422] focus:outline-none focus:ring-2 focus:ring-[#B64E2E]"
              />
              {passcodeError && (
                <p className="mt-2 text-xs font-bold text-[#B64E2E] text-center">
                  {passcodeError}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#B64E2E] hover:bg-[#A3573E] text-[#FBF8F3] rounded-full text-sm sm:text-base font-bold cursor-pointer transition-colors disabled:opacity-50"
            >
              {loading ? '확인 중...' : '다음 · 내 이름 선택하기'}
            </button>
          </form>

          <p className="text-[11px] text-[#A69B80] text-center leading-relaxed">
            비밀번호 입력 후 본인의 이름을 선택하면 내 프로필과 마이페이지가 연결됩니다.
          </p>
        </div>
      </div>
    );
  }

  // 비밀번호 통과 후: 내가 누구인지(가족 구성원 5명 중 본인) 먼저 선택하는 화면
  if ((!isMemberConfirmed || isChoosingMember) && members.length > 0) {
    return (
      <div className="min-h-screen bg-[#FBF8F3] text-[#5E3422] flex flex-col items-center justify-center px-5 py-12">
        <div className="w-full max-w-[460px] bg-[#F2EDE3] rounded-3xl p-6 sm:p-8 space-y-5 shadow-xs">
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-[#B64E2E] text-[#FBF8F3] flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <span className="px-3 py-1 rounded-full bg-[#FBF8F3] text-[#B64E2E] text-xs font-bold">
              입장 가족 본인 확인
            </span>
            <h1 className="font-editorial-ko text-xl sm:text-2xl font-bold text-[#5E3422] tracking-tight pt-0.5">
              반갑습니다! 어떤 가족분이신가요?
            </h1>
            <p className="text-xs sm:text-sm text-[#8A442B] leading-relaxed">
              본인의 이름을 눌러 입장해 주세요.
              <br />
              선택한 이름으로 사진을 올리고 내 마이페이지를 이용할 수 있습니다.
            </p>
          </div>

          <div className="space-y-2.5">
            {members.map((m) => {
              const isRep = m.id === payerMemberId;
              const isSelected = m.id === activeMember.id && isMemberConfirmed;
              const memberPhotoCount = photos.filter((p) => p.memberId === m.id).length;

              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleSelectActiveMember(m.id)}
                  className={`w-full p-3.5 sm:p-4 rounded-2xl flex items-center justify-between gap-3 text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#FBF8F3] ring-2 ring-[#B64E2E]'
                      : 'bg-[#FBF8F3] hover:bg-[#E8E1D1]/75'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden"
                      style={{
                        backgroundColor: m.badgeBg || '#E8E1D1',
                        color: m.color || '#8A442B',
                      }}
                    >
                      {m.avatarImage ? (
                        <img
                          src={m.avatarImage}
                          alt={m.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        m.avatar || m.name.slice(0, 2)
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-base font-bold text-[#5E3422] truncate">
                          {m.name}
                        </span>
                        {m.city && (
                          <span className="text-xs font-medium text-[#8A442B]">
                            ({m.city})
                          </span>
                        )}
                        {isRep ? (
                          <span className="px-2 py-0.5 rounded-full bg-[#B64E2E] text-[#FBF8F3] text-[11px] font-bold">
                            대표 가족 · 스튜디오 편집 가능
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-[#F2EDE3] text-[#8A442B] text-[11px] font-medium">
                            사진첩 미리보기 · 사진 업로드
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#A69B80] mt-0.5">
                        올린 사진 {memberPhotoCount}장 · 클릭하여 {m.name} 화면으로 입장
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1.5 rounded-full bg-[#B64E2E] text-[#FBF8F3] text-xs font-bold shrink-0">
                    입장 →
                  </span>
                </button>
              );
            })}
          </div>

          {isMemberConfirmed && (
            <button
              type="button"
              onClick={() => setIsChoosingMember(false)}
              className="w-full py-2.5 rounded-full border border-[#B64E2E]/45 text-xs sm:text-sm font-bold text-[#8A442B] hover:bg-[#FBF8F3] cursor-pointer"
            >
              현재 프로필({activeMember.name}) 그대로 유지하기
            </button>
          )}
        </div>
      </div>
    );
  }

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
          <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 pt-3.5 pb-2.5 flex items-center justify-between gap-2">
            {/* 좌측: 데스크톱 메뉴 또는 홈 바로가기 */}
            <div className="flex items-center gap-6 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('home');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="text-xs sm:text-base font-medium text-[#8A442B] hover:text-[#B64E2E] whitespace-nowrap shrink-0 cursor-pointer"
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
                      className={`px-4 py-1.5 rounded-full text-sm sm:text-base font-medium whitespace-nowrap transition-all cursor-pointer ${
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

            {/* 우측: 현재 접속 가족 표시 · 잠금 · 사진 올리기 필 버튼 */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsChoosingMember(true)}
                title="입장 가족 선택 화면 보기"
                className="px-2.5 sm:px-3 py-1.5 rounded-full text-xs sm:text-sm font-bold bg-[#F2EDE3] hover:bg-[#E8E1D1] text-[#5E3422] flex items-center gap-1 whitespace-nowrap cursor-pointer transition-colors"
              >
                <User className="w-3.5 h-3.5 text-[#B64E2E] shrink-0" />
                <span>{activeMember.name}</span>
                {isCurrentRepresentative && (
                  <span className="px-1.5 py-0.2 rounded-full bg-[#B64E2E] text-[#FBF8F3] text-[10px]">
                    대표
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={handleLockPage}
                title="페이지 잠그기"
                className="px-2.5 sm:px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium border border-[#B64E2E]/45 text-[#8A442B] hover:border-[#B64E2E] flex items-center gap-1 whitespace-nowrap cursor-pointer transition-colors"
              >
                <Lock className="w-3.5 h-3.5 shrink-0" />
                <span>잠금</span>
              </button>

              <button
                type="button"
                onClick={() => setIsUploadOpen(true)}
                className="px-3 sm:px-5 py-1.5 sm:py-2 bg-[#B64E2E] hover:bg-[#A3573E] text-[#FBF8F3] rounded-full text-xs sm:text-sm font-medium whitespace-nowrap cursor-pointer"
              >
                사진 올리기 +
              </button>
            </div>
          </div>

          {/* 에디토리얼 타이틀 행 */}
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
              bookSettings={bookSettings}
              selectedMemberId={selectedMemberFilter}
              onSelectMemberId={setSelectedMemberFilter}
              selectedSeason={selectedSeason}
              onSelectSeason={setSelectedSeason}
              selectedMonth={selectedMonth}
              onSelectMonth={setSelectedMonth}
              onSelectPhoto={(photo) => setSelectedPhotoId(photo.id)}
              onDeletePhoto={handleDeletePhoto}
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
              onSaveMembersList={handleSaveMembersList}
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
