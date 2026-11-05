import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  Check,
  Plus,
  Trash2,
  Copy,
  Edit3,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

const COLOR_PRESETS = [
  { label: '테라코타 러스트', color: '#B64E2E', badgeBg: '#F4E5DF' },
  { label: '코랄 테라코타', color: '#CD6E50', badgeBg: '#F7EAE5' },
  { label: '시나몬 클레이', color: '#A3573E', badgeBg: '#F2E5DF' },
  { label: '더스티 로즈', color: '#B87B72', badgeBg: '#F4EAE8' },
  { label: '오커 모스', color: '#806E43', badgeBg: '#EFECE2' },
  { label: '올리브 엄버', color: '#7E7763', badgeBg: '#EFECE5' },
  { label: '웜 슬레이트', color: '#757166', badgeBg: '#EDEBE6' },
  { label: '토프 스톤', color: '#A69B80', badgeBg: '#F2EFE6' },
];

const TEAM_NAME_SUGGESTIONS = [
  '박서 오피스 — 우리 가족 사진첩',
  '오성 가족 사랑방 사진첩',
  '부산·덴버·대전 우리 가족 기록장',
  '우리 가족 사계절 이야기',
];

const PAYMENT_METHODS = [
  '신한카드 (4512-****-****-8821)',
  'KB국민카드 (5234-****-****-1092)',
  '카카오페이 자동결제',
  '네이버페이 정기결제',
  '현대카드 (3791-****-****-4410)',
];

const ORDER_STEPS = [
  '접수 완료',
  '인쇄·제본 중',
  '발송 완료',
  '배송 완료',
];

export default function MyPageView({
  members = [],
  photos = [],
  activeMemberId,
  bookSettings = {},
  onUpdateMember,
  onReorderMembers,
  onAddMember,
  onDeleteMember,
  onSaveMembersList,
  onUpdateBookSettings,
  showToast,
}) {
  const activeMember =
    members.find((m) => m.id === activeMemberId) ||
    members[0] || {
      id: 'member-first',
      name: '막둥이 세나',
      city: '부산',
      role: '부산',
      avatar: '막둥',
      avatarImage: '',
      color: '#2C3E50',
      badgeBg: '#E8EEF5',
    };

  const [myName, setMyName] = useState(activeMember.name || '');
  const [myCity, setMyCity] = useState(activeMember.city || '');
  const [myColor, setMyColor] = useState(activeMember.color || '#2C3E50');
  const [myBadgeBg, setMyBadgeBg] = useState(activeMember.badgeBg || '#E8EEF5');
  const [myAvatarImage, setMyAvatarImage] = useState(activeMember.avatarImage || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const avatarFileInputRef = useRef(null);

  const [payerMemberId, setPayerMemberId] = useState(
    bookSettings.payerMemberId || 'member-first'
  );

  // 우리 가족 사진첩 이름 설정 (대표 가족 마이페이지 전용)
  const [familyTitleInput, setFamilyTitleInput] = useState(
    bookSettings.familyTitle ||
      (bookSettings.title && !bookSettings.title.includes('OUR YEAR')
        ? bookSettings.title
        : '박서 오피스 — 우리 가족 사진첩')
  );
  const [subtitleInput, setSubtitleInput] = useState(
    bookSettings.subtitle || '온 가족이 함께 모으는 소중한 일상 기록'
  );
  const [familyCodeInput, setFamilyCodeInput] = useState(
    bookSettings.familyCode || '2026FAM'
  );
  const [savedTeamBanner, setSavedTeamBanner] = useState(false);

  // 가족 초대 & 구성원 명단 관리 상태 (저장 버튼을 눌러야 최종 저장됨)
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [draftMembers, setDraftMembers] = useState(() =>
    Array.isArray(members) ? [...members] : []
  );
  const [isMembersDirty, setIsMembersDirty] = useState(false);
  const [isSavingMembers, setIsSavingMembers] = useState(false);
  const [savedMembersBanner, setSavedMembersBanner] = useState(false);

  const [editingMemberId, setEditingMemberId] = useState(null);
  const [rowName, setRowName] = useState('');
  const [rowCity, setRowCity] = useState('');
  const [newName, setNewName] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newColorIdx, setNewColorIdx] = useState(0);

  useEffect(() => {
    if (!isMembersDirty) {
      setDraftMembers(Array.isArray(members) ? [...members] : []);
    }
  }, [members, isMembersDirty]);

  useEffect(() => {
    setMyName(activeMember.name || '');
    setMyCity(activeMember.city || '');
    setMyColor(activeMember.color || '#2C3E50');
    setMyBadgeBg(activeMember.badgeBg || '#E8EEF5');
    setMyAvatarImage(activeMember.avatarImage || '');
  }, [activeMember]);

  useEffect(() => {
    setFamilyTitleInput(
      bookSettings.familyTitle ||
        (bookSettings.title && !bookSettings.title.includes('OUR YEAR')
          ? bookSettings.title
          : '박서 오피스 — 우리 가족 사진첩')
    );
    setSubtitleInput(bookSettings.subtitle || '');
    setFamilyCodeInput(bookSettings.familyCode || '2026FAM');
    if (bookSettings.payerMemberId) {
      setPayerMemberId(bookSettings.payerMemberId);
    }
  }, [
    bookSettings.familyTitle,
    bookSettings.title,
    bookSettings.subtitle,
    bookSettings.familyCode,
    bookSettings.payerMemberId,
  ]);

  const handleAvatarFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 240;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setMyAvatarImage(dataUrl);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveMyProfile = async (e) => {
    e.preventDefault();
    if (!myName.trim()) return;
    setIsSavingProfile(true);
    try {
      const cleanCity = myCity.trim() || '부산';
      await onUpdateMember(activeMember.id, {
        id: activeMember.id,
        name: myName.trim(),
        city: cleanCity,
        role: cleanCity,
        avatar: myName.trim().slice(0, 2),
        avatarImage: myAvatarImage,
        color: myColor,
        badgeBg: myBadgeBg,
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSaveFamilyTeamInfo = async (e) => {
    e.preventDefault();
    const cleanTitle = familyTitleInput.trim() || '박서 오피스 — 우리 가족 사진첩';
    await onUpdateBookSettings({
      familyTitle: cleanTitle,
      title: cleanTitle,
      subtitle: subtitleInput.trim(),
      familyCode: familyCodeInput.trim() || '2026FAM',
    });
    setSavedTeamBanner(true);
    setTimeout(() => setSavedTeamBanner(false), 3000);
    if (showToast) {
      showToast('우리 가족 사진첩 이름이 저장되었습니다.');
    }
  };

  const handleCopyInvite = () => {
    const shareUrl = window.location.origin;
    const titleName = bookSettings.familyTitle || '박서 오피스 — 우리 가족 사진첩';
    const message = `[${titleName}]\n우리 가족 전용 온라인 사진첩입니다.\n아래 링크로 들어오셔서 일상 사진을 편하게 올려주세요.\n\n• 바로 접속하기: ${shareUrl}\n• 가족 초대 코드: ${
      bookSettings.familyCode || '2026FAM'
    }`;
    navigator.clipboard.writeText(message);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 3000);
  };

  const startRowEdit = (m) => {
    setEditingMemberId(m.id);
    setRowName(m.name || '');
    setRowCity(m.city || '');
  };

  const handleSaveRowEdit = (memberId) => {
    if (!rowName.trim()) return;
    const cleanCity = rowCity.trim() || '부산';
    setDraftMembers((prev) =>
      prev.map((m) =>
        m.id === memberId
          ? {
              ...m,
              name: rowName.trim(),
              city: cleanCity,
              role: cleanCity,
              avatar: rowName.trim().slice(0, 2),
            }
          : m
      )
    );
    setEditingMemberId(null);
    setIsMembersDirty(true);
  };

  const handleMoveByOffset = (index, delta) => {
    const targetIdx = index + delta;
    if (targetIdx < 0 || targetIdx >= draftMembers.length) return;
    const reordered = [...draftMembers];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIdx, 0, moved);
    setDraftMembers(reordered);
    setIsMembersDirty(true);
  };

  const handleRemoveDraftMember = (e, memberId) => {
    e.preventDefault();
    e.stopPropagation();
    if (draftMembers.length <= 1) return;
    setDraftMembers((prev) => prev.filter((m) => m.id !== memberId));
    setIsMembersDirty(true);
  };

  const handleAddMemberSubmit = (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const pick = COLOR_PRESETS[newColorIdx % COLOR_PRESETS.length];
    const cleanCity = newCity.trim() || '부산';
    const newDraft = {
      id: `member-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      name: newName.trim(),
      city: cleanCity,
      role: cleanCity,
      color: pick.color,
      badgeBg: pick.badgeBg,
      avatar: newName.trim().slice(0, 2),
    };
    setDraftMembers((prev) => [...prev, newDraft]);
    setIsMembersDirty(true);
    setNewName('');
    setNewCity('');
    setNewColorIdx((prev) => (prev + 1) % COLOR_PRESETS.length);
  };

  const handleCommitMembersSave = async () => {
    if (draftMembers.length === 0) return;
    setIsSavingMembers(true);
    try {
      // 만약 행 수정 중이던 항목이 있다면 함께 반영
      let finalMembers = [...draftMembers];
      if (editingMemberId && rowName.trim()) {
        const cleanCity = rowCity.trim() || '부산';
        finalMembers = finalMembers.map((m) =>
          m.id === editingMemberId
            ? {
                ...m,
                name: rowName.trim(),
                city: cleanCity,
                role: cleanCity,
                avatar: rowName.trim().slice(0, 2),
              }
            : m
        );
        setEditingMemberId(null);
      }

      if (onSaveMembersList) {
        await onSaveMembersList(finalMembers);
      } else if (onReorderMembers) {
        await onReorderMembers(finalMembers);
      }
      setDraftMembers(finalMembers);
      setIsMembersDirty(false);
      setSavedMembersBanner(true);
      setTimeout(() => setSavedMembersBanner(false), 3000);
    } finally {
      setIsSavingMembers(false);
    }
  };

  const handleCancelMembersChanges = () => {
    setDraftMembers(Array.isArray(members) ? [...members] : []);
    setEditingMemberId(null);
    setIsMembersDirty(false);
  };

  const myPhotoCount = photos.filter((p) => p.memberId === activeMember.id).length;
  const payerMember = members.find((m) => m.id === payerMemberId) || activeMember;
  const isRepresentative = activeMember.id === payerMember.id;

  return (
    <div className="pb-12 pt-1">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* ===================================================================
            좌측 컬럼: 내 프로필 설정 + 우리 가족 사진첩 이름 설정 (대표 가족 전용)
        =================================================================== */}
        <div className="lg:col-span-5 space-y-6">
          {/* 1. 내 프로필 설정 */}
          <section className="bg-[#F2EDE3] rounded-3xl p-5 sm:p-7 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-[#B64E2E] tracking-tight">
                  내 프로필 설정
                </h2>
                <p className="text-xs sm:text-sm text-[#8A442B] mt-0.5">
                  내 이름과 프로필 사진을 관리합니다.
                </p>
              </div>
              {isRepresentative && (
                <span className="px-3 py-1 rounded-full bg-[#B64E2E] text-[#FBF8F3] text-xs font-bold">
                  대표 가족
                </span>
              )}
            </div>

            <form onSubmit={handleSaveMyProfile} className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="relative shrink-0">
                  {myAvatarImage ? (
                    <img
                      src={myAvatarImage}
                      alt={myName}
                      className="w-20 h-20 rounded-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-20 h-20 rounded-full flex items-center justify-center text-lg font-bold"
                      style={{ backgroundColor: myBadgeBg, color: myColor }}
                    >
                      {myName.slice(0, 2)}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => avatarFileInputRef.current?.click()}
                    className="absolute -bottom-0.5 -right-0.5 w-8 h-8 rounded-full bg-[#B64E2E] text-[#FBF8F3] flex items-center justify-center shadow-xs cursor-pointer"
                    title="사진 변경"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                  <input
                    ref={avatarFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarFileChange}
                    className="hidden"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base sm:text-lg font-bold text-[#5E3422]">
                      {myName}
                    </span>
                    {isRepresentative && (
                      <span className="px-2 py-0.5 rounded-full border border-[#B64E2E]/45 text-[#8A442B] text-xs font-bold">
                        대표
                      </span>
                    )}
                  </div>
                  <div className="text-xs sm:text-sm text-[#8A442B]">
                    올린 사진 {myPhotoCount}장
                  </div>
                  <div className="flex items-center gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={() => avatarFileInputRef.current?.click()}
                      className="px-3.5 py-1.5 rounded-full border border-[#B64E2E]/50 hover:bg-[#E8E1D1] text-xs font-bold text-[#8A442B] cursor-pointer"
                    >
                      사진 바꾸기
                    </button>
                    {myAvatarImage && (
                      <button
                        type="button"
                        onClick={() => setMyAvatarImage('')}
                        className="px-2 py-1 text-xs text-[#A69B80] hover:text-[#5E3422] cursor-pointer"
                      >
                        기본으로
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-[#8A442B] mb-1.5">
                    이름 / 호칭
                  </label>
                  <input
                    type="text"
                    value={myName}
                    onChange={(e) => setMyName(e.target.value)}
                    className="w-full bg-[#FBF8F3] rounded-2xl px-4 py-3 text-sm sm:text-base font-bold text-[#5E3422] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-[#8A442B] mb-1.5">
                    거주 도시
                  </label>
                  <input
                    type="text"
                    value={myCity}
                    onChange={(e) => setMyCity(e.target.value)}
                    className="w-full bg-[#FBF8F3] rounded-2xl px-4 py-3 text-sm sm:text-base font-bold text-[#5E3422] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-bold text-[#8A442B] mb-2">
                  배지 색상
                </label>
                <div className="flex flex-wrap items-center gap-2.5">
                  {COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.color}
                      type="button"
                      onClick={() => {
                        setMyColor(preset.color);
                        setMyBadgeBg(preset.badgeBg);
                      }}
                      className={`w-7 h-7 rounded-full cursor-pointer transition-transform ${
                        myColor === preset.color
                          ? 'scale-115 ring-2 ring-[#B64E2E] ring-offset-2 ring-offset-[#F2EDE3]'
                          : 'opacity-75'
                      }`}
                      style={{ backgroundColor: preset.color }}
                      title={preset.label}
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSavingProfile}
                className="w-full py-3.5 bg-[#B64E2E] hover:bg-[#B04C2E] text-[#FBF8F3] rounded-full text-sm sm:text-base font-bold cursor-pointer"
              >
                {isSavingProfile ? '저장 중...' : '내 정보 저장하기'}
              </button>
            </form>
          </section>

          {/* 2. 우리 가족 사진첩 이름 설정 (대표 가족의 마이페이지 전용) */}
          {isRepresentative && (
            <section className="bg-[#F2EDE3] rounded-3xl p-5 sm:p-7 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-[#B64E2E]">
                    우리 가족 사진첩 이름 설정
                  </h3>
                  <p className="text-xs sm:text-sm text-[#8A442B] mt-0.5">
                    대표 가족({activeMember.name}) 마이페이지에서 사진첩 이름을 관리합니다.
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full border border-[#B64E2E]/45 text-xs font-bold text-[#8A442B] shrink-0">
                  대표 가족 전용
                </span>
              </div>

              {savedTeamBanner && (
                <div className="p-3.5 bg-[#FBF8F3] rounded-2xl text-[#B64E2E] text-sm font-bold flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>사진첩 이름이 저장되어 상단 제목과 표지에 반영되었습니다.</span>
                </div>
              )}

              <form onSubmit={handleSaveFamilyTeamInfo} className="space-y-3.5">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-[#8A442B] mb-1.5">
                    사진첩 이름 (팀 이름)
                  </label>
                  <input
                    type="text"
                    value={familyTitleInput}
                    onChange={(e) => setFamilyTitleInput(e.target.value)}
                    placeholder="예: 박서 오피스 — 우리 가족 사진첩"
                    className="w-full bg-[#FBF8F3] rounded-2xl px-4 py-3 text-sm sm:text-base font-bold text-[#5E3422] focus:outline-none"
                  />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {TEAM_NAME_SUGGESTIONS.map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => setFamilyTitleInput(sug)}
                        className="px-3 py-1 rounded-full border border-[#B64E2E]/45 hover:bg-[#FBF8F3] text-xs font-medium text-[#8A442B] cursor-pointer"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold text-[#8A442B] mb-1.5">
                    한줄 소개
                  </label>
                  <input
                    type="text"
                    value={subtitleInput}
                    onChange={(e) => setSubtitleInput(e.target.value)}
                    placeholder="예: 온 가족이 함께 모으는 사계절 일상 기록"
                    className="w-full bg-[#FBF8F3] rounded-2xl px-4 py-3 text-sm text-[#5E3422] focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-[#B64E2E] hover:bg-[#B04C2E] text-[#FBF8F3] rounded-full text-sm sm:text-base font-bold cursor-pointer"
                >
                  이름 저장하기
                </button>
              </form>
            </section>
          )}
        </div>

        {/* ===================================================================
            우측 컬럼: 가족 초대하기 + 가족 구성원 명단 + 정기 구독 관리 + 제작·배송 내역
        =================================================================== */}
        <div className="lg:col-span-7 space-y-6">
          {/* 3. 가족 초대하기 */}
          <section className="bg-[#F2EDE3] rounded-3xl p-5 sm:p-7 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[#B64E2E]">가족 초대하기</h3>
                <p className="text-xs sm:text-sm text-[#8A442B] mt-0.5">
                  대표 1인 구독으로 온 가족 인원 제한 없이 참여할 수 있습니다.
                </p>
              </div>
              <span className="px-3.5 py-1.5 rounded-full border border-[#B64E2E]/45 text-xs sm:text-sm font-mono font-bold text-[#8A442B]">
                {bookSettings.familyCode || '2026FAM'}
              </span>
            </div>

            <button
              type="button"
              onClick={handleCopyInvite}
              className="w-full py-3.5 bg-[#B64E2E] hover:bg-[#B04C2E] text-[#FBF8F3] rounded-full text-sm sm:text-base font-bold flex items-center justify-center gap-2 cursor-pointer"
            >
              {copiedInvite ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>초대 문구가 복사되었습니다</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>초대장 문구 · 링크 복사하기</span>
                </>
              )}
            </button>
          </section>

          {/* 4. 가족 구성원 명단 (수정·삭제·추가 후 [구성원 명단 저장하기] 버튼을 눌러야 저장됨) */}
          <section className="bg-[#F2EDE3] rounded-3xl p-5 sm:p-7 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[#B64E2E]">
                  가족 구성원 명단 ({draftMembers.length}명)
                </h3>
                <p className="text-xs sm:text-sm text-[#8A442B] mt-0.5">
                  구성원 추가·수정·삭제 후 아래 [구성원 명단 저장하기] 버튼을 눌러야 반영됩니다.
                </p>
              </div>
              {isMembersDirty && (
                <span className="px-3 py-1 rounded-full bg-[#B64E2E]/15 text-[#B64E2E] text-xs font-bold">
                  저장 전 변경사항 있음
                </span>
              )}
            </div>

            {savedMembersBanner && (
              <div className="p-3.5 bg-[#FBF8F3] rounded-2xl text-[#B64E2E] text-sm font-bold flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>가족 구성원 명단이 저장되었습니다.</span>
              </div>
            )}

            <div className="space-y-2">
              {draftMembers.map((m, index) => {
                const isEditing = editingMemberId === m.id;
                const photoCount = photos.filter((p) => p.memberId === m.id).length;

                return (
                  <div
                    key={m.id}
                    className="p-3.5 bg-[#FBF8F3] rounded-2xl flex items-center justify-between gap-3"
                  >
                    {isEditing ? (
                      <div className="flex-1 space-y-2.5">
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={rowName}
                            onChange={(e) => setRowName(e.target.value)}
                            placeholder="이름/호칭"
                            className="bg-[#F2EDE3] rounded-xl px-3 py-2 text-sm font-bold text-[#5E3422] focus:outline-none"
                          />
                          <input
                            type="text"
                            value={rowCity}
                            onChange={(e) => setRowCity(e.target.value)}
                            placeholder="거주 도시"
                            className="bg-[#F2EDE3] rounded-xl px-3 py-2 text-sm text-[#5E3422] focus:outline-none"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingMemberId(null)}
                            className="px-3.5 py-1.5 rounded-full border border-[#B64E2E]/45 text-xs font-semibold text-[#8A442B] cursor-pointer"
                          >
                            취소
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveRowEdit(m.id)}
                            className="px-4 py-1.5 bg-[#B64E2E] text-[#FBF8F3] rounded-full text-xs font-bold cursor-pointer"
                          >
                            확인
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-xs sm:text-sm font-bold text-[#A69B80] w-4 text-center shrink-0">
                            {index + 1}
                          </span>
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm shrink-0 overflow-hidden"
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
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-sm sm:text-base text-[#5E3422] truncate">
                                {m.name}
                              </span>
                              {m.id === activeMember.id && (
                                <span className="px-2 py-0.5 rounded-full border border-[#B64E2E]/45 text-[#8A442B] text-xs font-bold">
                                  나
                                </span>
                              )}
                              {m.id === payerMember.id && (
                                <span className="px-2 py-0.5 bg-[#B64E2E] text-[#FBF8F3] rounded-full text-xs font-bold">
                                  대표
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-[#8A442B] mt-0.5">
                              {m.city || '도시 미설정'} · 사진 {photoCount}장
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => handleMoveByOffset(index, -1)}
                            className="p-2 text-[#8A442B] hover:text-[#B64E2E] disabled:opacity-25 cursor-pointer"
                            title="위로"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            disabled={index === draftMembers.length - 1}
                            onClick={() => handleMoveByOffset(index, 1)}
                            className="p-2 text-[#8A442B] hover:text-[#B64E2E] disabled:opacity-25 cursor-pointer"
                            title="아래로"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => startRowEdit(m)}
                            className="p-2 text-[#8A442B] hover:text-[#B64E2E] cursor-pointer"
                            title="수정"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          {draftMembers.length > 1 && (
                            <button
                              type="button"
                              onClick={(e) => handleRemoveDraftMember(e, m.id)}
                              className="p-2 text-[#A69B80] hover:text-[#B64E2E] cursor-pointer"
                              title="명단에서 제외 (저장 시 최종 반영)"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 새 가족 구성원 추가 (목록에 추가) */}
            <form
              onSubmit={handleAddMemberSubmit}
              className="bg-[#FBF8F3] rounded-2xl p-4 space-y-3"
            >
              <span className="block text-sm font-bold text-[#8A442B]">
                새 가족 프로필 추가
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="이름/호칭 (예: 손주 하준)"
                  className="bg-[#F2EDE3] rounded-xl px-3.5 py-2.5 text-sm text-[#5E3422] focus:outline-none"
                />
                <input
                  type="text"
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                  placeholder="거주 도시 (예: 서울)"
                  className="bg-[#F2EDE3] rounded-xl px-3.5 py-2.5 text-sm text-[#5E3422] focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 border border-[#B64E2E]/50 hover:bg-[#F2EDE3] text-[#8A442B] rounded-full text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>명단 목록에 추가 +</span>
              </button>
            </form>

            {/* 최종 구성원 명단 저장하기 버튼 */}
            <div className="flex items-center gap-2 pt-1">
              {isMembersDirty && (
                <button
                  type="button"
                  onClick={handleCancelMembersChanges}
                  className="px-5 py-3.5 rounded-full border border-[#B64E2E]/45 text-[#8A442B] hover:bg-[#FBF8F3] text-sm font-bold cursor-pointer shrink-0"
                >
                  되돌리기
                </button>
              )}
              <button
                type="button"
                disabled={isSavingMembers}
                onClick={handleCommitMembersSave}
                className="flex-1 py-3.5 bg-[#B64E2E] hover:bg-[#B04C2E] text-[#FBF8F3] rounded-full text-sm sm:text-base font-bold flex items-center justify-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>
                  {isSavingMembers ? '저장 중...' : '구성원 명단 저장하기'}
                </span>
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
