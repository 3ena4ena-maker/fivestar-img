import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Calendar,
  Upload,
  Users,
  Share2,
  CheckCircle2,
  MapPin,
  UserCog,
} from 'lucide-react';
import { buildPhotobookPages } from './utils/bookLayoutEngine';
import PhotobookStudioView from './components/PhotobookStudioView';
import TimelineArchiveView from './components/TimelineArchiveView';
import ProfileFamilySettingsPage from './components/ProfileFamilySettingsPage';
import UploadModal from './components/UploadModal';
import PhotoDetailModal from './components/PhotoDetailModal';
import FamilyCloudModal from './components/FamilyCloudModal';
import BookPageRenderer from './components/BookPageRenderer';

export default function App() {
  const [photos, setPhotos] = useState([]);
  const [members, setMembers] = useState([]);
  const [bookSettings, setBookSettings] = useState({
    year: 2026,
    title: 'OUR YEAR, APART YET TOGETHER',
    koreanTitle: '각자의 계절, 하나의 시간',
    subtitle: '흩어진 가족들이 일 년 동안 함께 만든 사계절 포토북 아카이브',
    paperTheme: 'ivory',
    layoutDensity: 'balanced',
    includeMonthDividers: true,
  });
  const [cloudStatus, setCloudStatus] = useState({
    connected: false,
    mode: 'local-server',
  });
  const [loading, setLoading] = useState(true);

  // Active page tab: 'book' | 'timeline' | 'profile'
  const [activeTab, setActiveTab] = useState('book');

  // Active logged-in family member profile (persisted in localStorage per device)
  const [activeMemberId, setActiveMemberId] = useState(
    () => localStorage.getItem('fivestar_active_member') || 'member-first'
  );

  // Timeline filters
  const [selectedSeason, setSelectedSeason] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedMemberFilter, setSelectedMemberFilter] = useState('all');

  // Page layout variant overrides
  const [pageVariants, setPageVariants] = useState({});

  // Modals state
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
      if (data.bookSettings) setBookSettings(data.bookSettings);
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

  // Compile photobook pages automatically whenever photos, members, or bookSettings change
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
    showToast('해당 포토북 페이지의 화보 레이아웃 배치가 변경되었습니다.');
  };

  // API Handlers
  const handleUploadSuccess = (allPhotos, newPhotos) => {
    setPhotos(allPhotos);
    const months = [...new Set(newPhotos.map((p) => `${p.month}월`))].join(', ');
    showToast(
      `새 사진 ${newPhotos.length}장이 촬영일(EXIF) 기준으로 ${months} 포토북 페이지에 자동 배치되었습니다!`
    );
  };

  const handleUpdatePhoto = async (photoId, patch) => {
    const res = await fetch(`/api/photos/${photoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const data = await res.json();
      setPhotos(data.allPhotos);
      showToast('사진 기록이 업데이트되어 포토북 레이아웃에 반영되었습니다.');
    }
  };

  const handleDeletePhoto = async (photoId) => {
    const res = await fetch(`/api/photos/${photoId}`, { method: 'DELETE' });
    if (res.ok) {
      const data = await res.json();
      setPhotos(data.allPhotos);
      showToast('사진이 아카이브에서 삭제되었습니다.');
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
      showToast('가족 코멘트가 등록되었습니다.');
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
      showToast(`새 가족 구성원 '${memberPayload.name}'님이 추가되었습니다.`);
    }
  };

  const handleUpdateMember = async (memberId, patch) => {
    // 1. Instant optimistic state update so UI reflects new name/city immediately
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
        avatar: patch.avatar ? patch.avatar.trim().slice(0, 2) : nextName.slice(0, 1),
        color: patch.color || m.color,
        badgeBg: patch.badgeBg || m.badgeBg,
      };
    });
    setMembers(optimisticMembers);
    syncSubtitleCities(optimisticMembers);

    // 2. Persist via POST /api/members (with id) for 100% compatibility on both Local & Cloudflare KV
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
          ? '샘플 사진이 초기화되었습니다. 이제 우리 가족의 첫 사진을 올려보세요!'
          : '2026 사계절 가족 샘플 아카이브가 복원되었습니다.'
      );
    }
  };

  const activeMember =
    members.find((m) => m.id === activeMemberId) ||
    members[0] || { id: 'member-first', name: '가족', city: '서울', color: '#141413' };

  const uniqueCities = [...new Set(members.map((m) => m.city).filter(Boolean))];
  const activeMonthsCount = new Set(photos.map((p) => p.month)).size;

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6] text-[#141413]">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#141413] text-[#FAF9F6] px-4 py-3 text-xs font-medium shadow-xl flex items-center gap-2 border border-white/15 no-print">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Main Web UI (Hidden during native book print) */}
      <div className="no-print flex-1 flex flex-col">
        {/* Top Utility & Cloud Status Bar */}
        <div className="bg-[#141413] text-[#FAF9F6] px-4 sm:px-8 py-2 text-[11px] border-b border-white/10">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <span className="font-mono-meta text-[10px] tracking-[0.2em] uppercase text-[#C9C5BA]">
                {bookSettings.volumeLabel || 'VOL. 01 — 2026 ANNUAL FAMILY ARCHIVE'}
              </span>
              <span className="hidden md:inline text-white/25">|</span>
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                title="클릭하면 내 프로필 변경 / 가족 설정 페이지로 이동합니다"
                className="inline-flex items-center gap-1.5 text-[11px] text-[#E6E4DD] hover:text-amber-300 transition-colors cursor-pointer"
              >
                <MapPin className="w-3 h-3 text-amber-400" />
                <span>연결된 가족 도시: {uniqueCities.join(' · ') || '도시 설정하기'}</span>
                <span className="px-1.5 py-0.2 bg-white/15 rounded-xs text-[10px] text-amber-300">
                  도시·프로필 변경 →
                </span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              {/* Cloud Sync Indicator */}
              <button
                type="button"
                onClick={() => setFamilyModalState({ open: true, tab: 'cloud' })}
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-white/10 hover:bg-white/20 rounded-xs text-[10px] font-mono-meta transition-colors cursor-pointer"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>
                  {cloudStatus.mode === 'supabase'
                    ? 'CLOUD SYNC: SUPABASE LIVE'
                    : cloudStatus.mode === 'cloudflare-kv'
                    ? 'CLOUD DB: CLOUDFLARE KV 영구 공유 활성'
                    : 'SERVER DB: 동기화 활성'}
                </span>
              </button>

              {/* Invite Link Button */}
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className="inline-flex items-center gap-1 text-[11px] text-amber-300 hover:underline cursor-pointer"
              >
                <Share2 className="w-3 h-3" />
                <span>가족 초대코드: {bookSettings.familyCode || '2026FAM'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Editorial Masthead Header */}
        <header className="border-b border-[#141413]/12 bg-[#FAF9F6]">
          <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
              {/* Brand Title & Subtitle */}
              <div>
                <div className="flex items-center gap-2 text-[11px] font-mono-meta uppercase tracking-[0.24em] text-[#8C5A3C]">
                  <span>ANNUAL FAMILY PHOTOBOOK ARCHIVE</span>
                  <span>·</span>
                  <span>AUTO-LAYOUT BY EXIF DATE</span>
                </div>
                <h1
                  onClick={() => setActiveTab('book')}
                  className="mt-1 font-editorial-en text-3xl sm:text-5xl font-normal tracking-tight text-[#141413] uppercase cursor-pointer"
                >
                  {bookSettings.title || 'OUR YEAR, APART YET TOGETHER'}
                </h1>
                <p className="mt-1.5 font-editorial-ko text-sm sm:text-base text-[#4A4944]">
                  {bookSettings.koreanTitle} — {bookSettings.subtitle}
                </p>
              </div>

              {/* Right Controls: Active Member Switcher + Dedicated Profile Settings Page Button & Upload CTA */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Who am I switcher */}
                <div className="flex items-center bg-[#F3F1EC] border border-[#141413]/15 px-3 py-2 gap-2">
                  <span className="text-[10px] font-mono-meta uppercase tracking-wider text-[#71706B]">
                    내 프로필:
                  </span>
                  <select
                    value={activeMember.id}
                    onChange={(e) => handleSelectActiveMember(e.target.value)}
                    className="bg-transparent text-xs font-semibold text-[#141413] focus:outline-none cursor-pointer"
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.city})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Dedicated Profile & City Settings Page Button */}
                <button
                  type="button"
                  onClick={() => setActiveTab('profile')}
                  className={`px-4 py-2.5 border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    activeTab === 'profile'
                      ? 'bg-[#8C5A3C] text-white border-[#8C5A3C]'
                      : 'bg-white text-[#141413] border-[#141413]/25 hover:border-[#141413]'
                  }`}
                >
                  <UserCog className="w-3.5 h-3.5" />
                  <span>내 프로필 변경 / 가족 설정</span>
                </button>

                {/* Primary Upload Photo CTA */}
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(true)}
                  className="px-5 py-2.5 bg-[#141413] text-[#FAF9F6] hover:bg-[#2C2B29] text-xs font-medium tracking-wide flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>+ 추억 사진 올리기</span>
                </button>
              </div>
            </div>

            {/* Navigation Bar & Live Book Compilation Summary */}
            <div className="mt-7 pt-4 border-t border-[#141413]/12 flex flex-wrap items-center justify-between gap-4">
              {/* Primary View Tabs (01 Photobook / 02 Timeline / 03 Profile & Family Settings) */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('book')}
                  className={`px-4 py-2 text-xs font-medium flex items-center gap-2 border transition-all cursor-pointer ${
                    activeTab === 'book'
                      ? 'bg-[#141413] text-[#FAF9F6] border-[#141413]'
                      : 'bg-white text-[#5A5852] border-[#141413]/15 hover:text-[#141413]'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>01. 포토북 펼침뷰 & PDF 스튜디오</span>
                  <span
                    className={`px-1.5 py-0.2 text-[10px] font-mono-meta rounded-xs ${
                      activeTab === 'book'
                        ? 'bg-white/20 text-white'
                        : 'bg-[#F3F1EC] text-[#141413]'
                    }`}
                  >
                    {compiledPages.length}P
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('timeline')}
                  className={`px-4 py-2 text-xs font-medium flex items-center gap-2 border transition-all cursor-pointer ${
                    activeTab === 'timeline'
                      ? 'bg-[#141413] text-[#FAF9F6] border-[#141413]'
                      : 'bg-white text-[#5A5852] border-[#141413]/15 hover:text-[#141413]'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>02. 날짜·계절별 타임라인 아카이브</span>
                  <span
                    className={`px-1.5 py-0.2 text-[10px] font-mono-meta rounded-xs ${
                      activeTab === 'timeline'
                        ? 'bg-white/20 text-white'
                        : 'bg-[#F3F1EC] text-[#141413]'
                    }`}
                  >
                    {photos.length}장
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('profile')}
                  className={`px-4 py-2 text-xs font-medium flex items-center gap-2 border transition-all cursor-pointer ${
                    activeTab === 'profile'
                      ? 'bg-[#141413] text-[#FAF9F6] border-[#141413]'
                      : 'bg-white text-[#5A5852] border-[#141413]/15 hover:text-[#141413]'
                  }`}
                >
                  <UserCog className="w-3.5 h-3.5" />
                  <span>03. 내 프로필 변경 / 가족 설정</span>
                  <span
                    className={`px-1.5 py-0.2 text-[10px] font-mono-meta rounded-xs ${
                      activeTab === 'profile'
                        ? 'bg-white/20 text-white'
                        : 'bg-[#F3F1EC] text-[#8C5A3C]'
                    }`}
                  >
                    {activeMember.name} · {activeMember.city}
                  </span>
                </button>
              </div>

              {/* Archive Summary Metrics */}
              <div className="flex items-center gap-4 text-xs text-[#5A5852] font-mono-meta">
                <span>
                  기록된 달: <strong className="text-[#141413]">{activeMonthsCount}/12개월</strong>
                </span>
                <span>·</span>
                <span>
                  누적 사진: <strong className="text-[#141413]">{photos.length}장</strong>
                </span>
                <span>·</span>
                <span>
                  자동 편집된 책 분량:{' '}
                  <strong className="text-[#8C5A3C]">{compiledPages.length}페이지</strong>
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Workspace Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8">
          {loading ? (
            <div className="py-24 text-center font-editorial-ko text-sm text-[#71706B]">
              가족들의 사계절 포토북 아카이브를 불러오는 중입니다...
            </div>
          ) : activeTab === 'book' ? (
            <PhotobookStudioView
              pages={compiledPages}
              members={members}
              bookSettings={bookSettings}
              onUpdateBookSettings={handleUpdateBookSettings}
              onSelectPhoto={(photo) => setSelectedPhotoId(photo.id)}
              onCycleVariant={handleCyclePageVariant}
            />
          ) : activeTab === 'timeline' ? (
            <TimelineArchiveView
              photos={photos}
              members={members}
              selectedSeason={selectedSeason}
              onSelectSeason={setSelectedSeason}
              selectedMonth={selectedMonth}
              onSelectMonth={setSelectedMonth}
              selectedMemberId={selectedMemberFilter}
              onSelectMemberId={setSelectedMemberFilter}
              onSelectPhoto={(photo) => setSelectedPhotoId(photo.id)}
              onToggleFavorite={(photo) =>
                handleUpdatePhoto(photo.id, { isFavorite: !photo.isFavorite })
              }
              onOpenUpload={() => setIsUploadOpen(true)}
              onSwitchToBookView={() => setActiveTab('book')}
            />
          ) : (
            <ProfileFamilySettingsPage
              members={members}
              photos={photos}
              activeMemberId={activeMember.id}
              bookSettings={bookSettings}
              cloudStatus={cloudStatus}
              onSelectActiveMember={handleSelectActiveMember}
              onUpdateMember={handleUpdateMember}
              onAddMember={handleAddMember}
              onDeleteMember={handleDeleteMember}
              onUpdateBookSettings={handleUpdateBookSettings}
              onResetArchive={handleResetArchive}
              onSwitchToBookView={() => setActiveTab('book')}
            />
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-[#141413]/12 bg-[#F3F1EC] py-6 px-4 sm:px-8 text-xs text-[#71706B]">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-editorial-en font-semibold text-sm text-[#141413]">
                OUR YEAR ARCHIVE
              </span>
              <span>— 흩어진 가족들이 일 년의 사진을 모아 한 권의 책으로 엮는 사계절 화보집</span>
            </div>
            <div className="flex items-center gap-4 font-mono-meta text-[11px]">
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className="hover:text-[#141413] underline underline-offset-4 cursor-pointer"
              >
                내 프로필 변경 / 가족·도시 설정
              </button>
              <button
                type="button"
                onClick={() => setFamilyModalState({ open: true, tab: 'cloud' })}
                className="hover:text-[#141413] underline underline-offset-4 cursor-pointer"
              >
                클라우드 DB 상태 확인
              </button>
              <span>FIVESTAR FAMILY EDITION</span>
            </div>
          </div>
        </footer>
      </div>

      {/* Native High-DPI Print Book Layout (Visible ONLY when printing / saving PDF via browser print) */}
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

      {/* Modals */}
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
