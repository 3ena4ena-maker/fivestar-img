import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  MapPin,
  Users,
  Plus,
  Trash2,
  Check,
  Copy,
  Share2,
  RotateCcw,
  Sparkles,
  Edit3,
  BookOpen,
  Database,
} from 'lucide-react';

const COLOR_PRESETS = [
  { label: '테라코타 브라운', color: '#8C5A3C', badgeBg: '#F5EBE6' },
  { label: '포레스트 그린', color: '#3B5249', badgeBg: '#E6EFEA' },
  { label: '미드나잇 네이비', color: '#2C3E50', badgeBg: '#E8EEF5' },
  { label: '모브 퍼플', color: '#6C5B7B', badgeBg: '#EFEBF5' },
  { label: '앰버 오렌지', color: '#B85D19', badgeBg: '#F9EFE6' },
  { label: '플럼 와인', color: '#7A4988', badgeBg: '#F3EAF6' },
];

const QUICK_CITIES = [
  '서울',
  '강릉',
  '부산',
  '제주',
  '인천',
  '대전',
  '대구',
  '광주',
  '수원',
  '전주',
  '춘천',
  '도쿄',
  '뉴욕',
  '런던',
];

export default function ProfileFamilySettingsPage({
  members = [],
  photos = [],
  activeMemberId,
  bookSettings = {},
  cloudStatus = {},
  onSelectActiveMember,
  onUpdateMember,
  onAddMember,
  onDeleteMember,
  onUpdateBookSettings,
  onResetArchive,
  onSwitchToBookView,
}) {
  const activeMember =
    members.find((m) => m.id === activeMemberId) ||
    members[0] || {
      id: 'member-first',
      name: '가족',
      city: '서울',
      role: '서울',
      avatar: '가',
      color: '#2C3E50',
      badgeBg: '#E8EEF5',
    };

  // My Profile Form State
  const [myName, setMyName] = useState(activeMember.name || '');
  const [myCity, setMyCity] = useState(activeMember.city || '');
  const [myRole, setMyRole] = useState(activeMember.role || '');
  const [myAvatar, setMyAvatar] = useState(activeMember.avatar || '');
  const [myColor, setMyColor] = useState(activeMember.color || '#2C3E50');
  const [myBadgeBg, setMyBadgeBg] = useState(activeMember.badgeBg || '#E8EEF5');
  const [mySavedBanner, setMySavedBanner] = useState(false);
  const [isSavingMyProfile, setIsSavingMyProfile] = useState(false);

  // Other family members inline edit state
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [rowName, setRowName] = useState('');
  const [rowCity, setRowCity] = useState('');
  const [rowRole, setRowRole] = useState('');

  // Add New Family Member State
  const [newName, setNewName] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newColorIdx, setNewColorIdx] = useState(0);

  // Invite copy state
  const [copiedInvite, setCopiedInvite] = useState(false);

  // Sync form inputs whenever activeMember changes
  useEffect(() => {
    if (activeMember) {
      setMyName(activeMember.name || '');
      setMyCity(activeMember.city || '');
      setMyRole(activeMember.role || '');
      setMyAvatar(activeMember.avatar || (activeMember.name || '가').slice(0, 1));
      setMyColor(activeMember.color || '#2C3E50');
      setMyBadgeBg(activeMember.badgeBg || '#E8EEF5');
    }
  }, [
    activeMember.id,
    activeMember.name,
    activeMember.city,
    activeMember.role,
    activeMember.avatar,
    activeMember.color,
    activeMember.badgeBg,
  ]);

  const handleSaveMyProfile = async (e) => {
    e.preventDefault();
    if (!myName.trim()) return;
    setIsSavingMyProfile(true);
    try {
      const cleanCity = myCity.trim() || '서울';
      const cleanRole = myRole.trim() || cleanCity;
      await onUpdateMember(activeMember.id, {
        id: activeMember.id,
        name: myName.trim(),
        city: cleanCity,
        role: cleanRole,
        avatar: (myAvatar || myName).trim().slice(0, 2),
        color: myColor,
        badgeBg: myBadgeBg,
      });
      setMySavedBanner(true);
      setTimeout(() => setMySavedBanner(false), 3500);
    } finally {
      setIsSavingMyProfile(false);
    }
  };

  const startRowEdit = (m) => {
    setEditingMemberId(m.id);
    setRowName(m.name || '');
    setRowCity(m.city || '');
    setRowRole(m.role || '');
  };

  const handleSaveRowEdit = async (memberId) => {
    if (!rowName.trim()) return;
    const cleanCity = rowCity.trim() || '서울';
    await onUpdateMember(memberId, {
      id: memberId,
      name: rowName.trim(),
      city: cleanCity,
      role: rowRole.trim() || cleanCity,
    });
    setEditingMemberId(null);
  };

  const handleAddMemberSubmit = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const pick = COLOR_PRESETS[newColorIdx % COLOR_PRESETS.length];
    const cleanCity = newCity.trim() || '서울';
    await onAddMember({
      name: newName.trim(),
      city: cleanCity,
      role: newRole.trim() || cleanCity,
      color: pick.color,
      badgeBg: pick.badgeBg,
      avatar: newName.trim().slice(0, 1),
    });
    setNewName('');
    setNewCity('');
    setNewRole('');
    setNewColorIdx((prev) => (prev + 1) % COLOR_PRESETS.length);
  };

  const handleCopyInvite = () => {
    const shareUrl = window.location.origin;
    const message = `[${
      bookSettings.koreanTitle || '2026 우리 가족 사계절 포토북'
    }]\n각자 있는 곳에서 찍은 일상 사진을 올려주세요!\n상단 '03. 내 프로필 변경 / 가족 설정' 페이지에서 내 이름과 거주 도시를 설정할 수 있습니다 📖\n\n• 접속 주소: ${shareUrl}\n• 가족 초대 코드: ${
      bookSettings.familyCode || '2026FAM'
    }`;
    navigator.clipboard.writeText(message);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2500);
  };

  const uniqueCities = [...new Set(members.map((m) => m.city).filter(Boolean))];

  return (
    <div className="space-y-10">
      {/* Page Title Banner */}
      <div className="bg-white border border-[#141413]/15 p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
        <div>
          <span className="text-[10px] font-mono-meta uppercase tracking-[0.24em] text-[#8C5A3C]">
            MY PROFILE & FAMILY CITIES CONFIGURATION
          </span>
          <h2 className="mt-1 font-editorial-ko text-2xl sm:text-3xl font-semibold text-[#141413]">
            내 프로필 변경 · 가족 거주 도시 설정
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm text-[#5A5852]">
            내가 누구인지 프로필을 선택하고, 내 이름·호칭과 현재 사는 도시를 자유롭게 변경하세요. 설정한 도시는 포토북 표지와 모든 사진 기록에 즉시 반영됩니다.
          </p>
        </div>

        <div className="flex flex-col sm:items-end gap-2 shrink-0">
          <div className="px-3.5 py-2 bg-[#F3F1EC] border border-[#141413]/12 text-xs">
            <span className="text-[#71706B] mr-1.5">현재 연결된 가족 도시:</span>
            <strong className="text-[#141413]">
              {uniqueCities.length > 0 ? uniqueCities.join(' · ') : '미설정'}
            </strong>
          </div>
          <button
            type="button"
            onClick={onSwitchToBookView}
            className="text-xs font-medium text-[#8C5A3C] hover:text-[#141413] flex items-center gap-1 underline underline-offset-4 cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>포토북 펼침뷰로 돌아가기 →</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: 내 프로필 선택 및 내 정보·내 도시 수정 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 5 Cols: Step 1 - 누구로 접속 중인가요? */}
        <div className="lg:col-span-5 bg-white border border-[#141413]/15 p-6 space-y-4">
          <div>
            <span className="text-[10px] font-mono-meta uppercase tracking-[0.2em] text-[#8C5A3C]">
              STEP 01 · SELECT MY PROFILE
            </span>
            <h3 className="mt-1 font-editorial-ko text-lg font-semibold text-[#141413]">
              1. 내 프로필 선택하기 (현재 접속자)
            </h3>
            <p className="mt-1 text-xs text-[#71706B]">
              아래 가족 목록에서 본인을 클릭하면 내 프로필로 전환되며, 우측에서 내 이름과 거주 도시를 바로 수정할 수 있습니다.
            </p>
          </div>

          <div className="space-y-2.5">
            {members.map((m) => {
              const isSelected = m.id === activeMember.id;
              const photoCount = photos.filter((p) => p.memberId === m.id).length;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onSelectActiveMember(m.id)}
                  className={`w-full p-3.5 text-left border transition-all flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-[#141413] text-[#FAF9F6] border-[#141413] shadow-sm'
                      : 'bg-[#FAF9F6] text-[#141413] border-[#141413]/12 hover:border-[#141413]/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-xs shrink-0"
                      style={{
                        backgroundColor: isSelected ? '#FAF9F6' : m.badgeBg,
                        color: isSelected ? '#141413' : m.color,
                      }}
                    >
                      {m.avatar || m.name.slice(0, 1)}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{m.name}</span>
                        {isSelected && (
                          <span className="px-2 py-0.5 bg-amber-400 text-[#141413] text-[10px] font-bold rounded-xs">
                            현재 내 프로필
                          </span>
                        )}
                      </div>
                      <div
                        className={`text-xs mt-0.5 flex items-center gap-1 ${
                          isSelected ? 'text-[#E6E4DD]' : 'text-[#71706B]'
                        }`}
                      >
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span>거주 도시: {m.city || '미설정'}</span>
                        {m.role && m.role !== m.city && <span>· {m.role}</span>}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`font-mono-meta text-xs ${
                      isSelected ? 'text-amber-300' : 'text-[#71706B]'
                    }`}
                  >
                    사진 {photoCount}장
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right 7 Cols: Step 2 - 내 프로필 & 내 거주 도시 변경 폼 */}
        <form
          onSubmit={handleSaveMyProfile}
          className="lg:col-span-7 bg-white border-2 border-[#141413] p-6 sm:p-8 space-y-6 shadow-md"
        >
          <div className="flex items-start justify-between border-b border-[#141413]/12 pb-4">
            <div>
              <span className="text-[10px] font-mono-meta uppercase tracking-[0.2em] text-[#8C5A3C]">
                STEP 02 · EDIT MY PROFILE & MY CITY
              </span>
              <h3 className="mt-1 font-editorial-ko text-xl font-semibold text-[#141413] flex items-center gap-2">
                <span>2. 내 프로필 및 내 거주 도시 변경</span>
              </h3>
              <p className="mt-1 text-xs text-[#5A5852]">
                현재 선택된 <strong>‘{activeMember.name}’</strong> 프로필의 이름(호칭), 거주 도시, 동네 소개, 배지 색상을 수정합니다.
              </p>
            </div>

            {/* Live Preview Badge */}
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-mono-meta text-[#71706B] mb-1">배지 미리보기</span>
              <div
                className="px-3 py-1 rounded-xs text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
                style={{ backgroundColor: myBadgeBg, color: myColor }}
              >
                <span>{myName || '이름'}</span>
                <span>·</span>
                <span>{myCity || '도시'}</span>
              </div>
            </div>
          </div>

          {mySavedBanner && (
            <div className="p-3.5 bg-emerald-900 text-white text-xs font-medium flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-300 shrink-0" />
              <span>
                저장 완료! 내 프로필(‘{myName}’)과 거주 도시(‘{myCity}’)가 전체 포토북과 상단 배너에 즉시 반영되었습니다.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#141413] mb-1.5">
                내 이름 / 가족 내 호칭 *
              </label>
              <input
                type="text"
                required
                value={myName}
                onChange={(e) => setMyName(e.target.value)}
                placeholder="예: 큰딸 세나, 엄마 (정숙), 막내 지민"
                className="w-full bg-[#FAF9F6] border border-[#141413]/25 px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:border-[#141413]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#141413] mb-1.5">
                내 거주 도시 (연결된 가족 도시) *
              </label>
              <input
                type="text"
                required
                value={myCity}
                onChange={(e) => setMyCity(e.target.value)}
                placeholder="예: 서울, 강릉, 부산, 대전, 뉴욕"
                className="w-full bg-[#FAF9F6] border border-[#141413]/25 px-3.5 py-2.5 text-sm font-semibold text-[#8C5A3C] focus:outline-none focus:border-[#141413]"
              />
            </div>
          </div>

          {/* Quick City Selection Chips */}
          <div className="bg-[#F3F1EC] p-3.5 border border-[#141413]/10">
            <span className="block text-[11px] font-medium text-[#5A5852] mb-2">
              자주 쓰는 도시 빠른 선택 (클릭 시 내 거주 도시에 바로 입력되며 직접 타이핑도 가능합니다):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_CITIES.map((city) => (
                <button
                  key={city}
                  type="button"
                  onClick={() => {
                    setMyCity(city);
                    if (!myRole || QUICK_CITIES.includes(myRole)) {
                      setMyRole(city);
                    }
                  }}
                  className={`px-2.5 py-1 text-xs border transition-colors cursor-pointer ${
                    myCity === city
                      ? 'bg-[#141413] text-[#FAF9F6] border-[#141413] font-semibold'
                      : 'bg-white text-[#2C2B29] border-[#141413]/15 hover:border-[#141413]'
                  }`}
                >
                  {city}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#141413] mb-1.5">
                세부 지역 / 동네 소개 (선택)
              </label>
              <input
                type="text"
                value={myRole}
                onChange={(e) => setMyRole(e.target.value)}
                placeholder="예: 서울 마포구, 강릉 본가, 제주 애월읍"
                className="w-full bg-[#FAF9F6] border border-[#141413]/25 px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#141413]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#141413] mb-1.5">
                프로필 아이콘 글자 (1~2자)
              </label>
              <input
                type="text"
                maxLength={2}
                value={myAvatar}
                onChange={(e) => setMyAvatar(e.target.value)}
                placeholder="예: 첫, 모, 부, 세"
                className="w-full bg-[#FAF9F6] border border-[#141413]/25 px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#141413]"
              />
            </div>
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-xs font-semibold text-[#141413] mb-2">
              내 프로필 대표 색상 선택
            </label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map((preset) => {
                const selected = myColor === preset.color;
                return (
                  <button
                    key={preset.color}
                    type="button"
                    onClick={() => {
                      setMyColor(preset.color);
                      setMyBadgeBg(preset.badgeBg);
                    }}
                    className={`px-3 py-1.5 text-xs font-medium border flex items-center gap-2 cursor-pointer transition-all ${
                      selected
                        ? 'border-[#141413] ring-1 ring-[#141413] bg-white font-semibold'
                        : 'border-[#141413]/15 bg-[#FAF9F6] opacity-80 hover:opacity-100'
                    }`}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full"
                      style={{ backgroundColor: preset.color }}
                    />
                    <span>{preset.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end">
            <button
              type="submit"
              disabled={isSavingMyProfile}
              className="w-full sm:w-auto px-8 py-3 bg-[#141413] text-[#FAF9F6] hover:bg-[#2C2B29] text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-md transition-colors"
            >
              <UserCheck className="w-4 h-4" />
              <span>
                {isSavingMyProfile
                  ? '저장 중...'
                  : '내 프로필 및 거주 도시 변경사항 저장하기'}
              </span>
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 2: 전체 가족 구성원 관리 & 새 가족 추가 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* All Family Members List with Direct City Edit */}
        <div className="lg:col-span-7 bg-white border border-[#141413]/15 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#141413]/12 pb-3">
            <div>
              <span className="text-[10px] font-mono-meta uppercase tracking-[0.2em] text-[#8C5A3C]">
                ALL FAMILY MEMBERS & CITIES
              </span>
              <h3 className="mt-0.5 font-editorial-ko text-lg font-semibold text-[#141413]">
                전체 가족 구성원 및 도시 목록 ({members.length}명)
              </h3>
            </div>
            <span className="text-xs text-[#71706B]">
              모든 가족의 도시를 이곳에서 개별 수정할 수 있습니다
            </span>
          </div>

          <div className="divide-y divide-[#141413]/10 border border-[#141413]/12">
            {members.map((m) => {
              const isRowEditing = editingMemberId === m.id;
              return (
                <div key={m.id} className="p-4 bg-[#FAF9F6]/50">
                  {isRowEditing ? (
                    <div className="space-y-3 bg-white p-3.5 border border-[#141413]/25">
                      <div className="text-xs font-semibold text-[#8C5A3C]">
                        ‘{m.name}’ 정보 및 거주 도시 수정
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div>
                          <label className="block text-[10px] text-[#71706B] mb-1">이름/호칭</label>
                          <input
                            type="text"
                            value={rowName}
                            onChange={(e) => setRowName(e.target.value)}
                            className="w-full bg-[#FAF9F6] border border-[#141413]/25 px-2.5 py-1.5 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-[#71706B] mb-1">거주 도시</label>
                          <input
                            type="text"
                            value={rowCity}
                            onChange={(e) => setRowCity(e.target.value)}
                            className="w-full bg-[#FAF9F6] border border-[#141413]/25 px-2.5 py-1.5 text-xs font-semibold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-[#71706B] mb-1">세부 지역</label>
                          <input
                            type="text"
                            value={rowRole}
                            onChange={(e) => setRowRole(e.target.value)}
                            className="w-full bg-[#FAF9F6] border border-[#141413]/25 px-2.5 py-1.5 text-xs"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingMemberId(null)}
                          className="px-3 py-1 text-xs text-[#71706B] cursor-pointer"
                        >
                          취소
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveRowEdit(m.id)}
                          className="px-4 py-1.5 bg-[#141413] text-[#FAF9F6] text-xs font-medium flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>저장</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span
                          className="w-8 h-8 rounded-full flex items-center justify-center font-semibold text-xs"
                          style={{ backgroundColor: m.badgeBg, color: m.color }}
                        >
                          {m.avatar || m.name.slice(0, 1)}
                        </span>
                        <div>
                          <div className="text-xs font-semibold text-[#141413]">{m.name}</div>
                          <div className="text-[11px] text-[#5A5852] flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-[#8C5A3C]" />
                            <span>
                              거주 도시: <strong className="text-[#141413]">{m.city}</strong>
                            </span>
                            {m.role && m.role !== m.city && <span>· {m.role}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => startRowEdit(m)}
                          className="px-3 py-1.5 bg-white border border-[#141413]/20 hover:bg-[#141413] hover:text-[#FAF9F6] text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>도시·이름 수정</span>
                        </button>
                        {members.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`'${m.name}' 프로필을 삭제할까요?`)) {
                                onDeleteMember(m.id);
                              }
                            }}
                            className="p-1.5 text-[#8E8A80] hover:text-red-600 cursor-pointer"
                            title="가족 삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 5 Cols: Add New Family Member + Invite Share & Reset */}
        <div className="lg:col-span-5 space-y-6">
          {/* Add New Member Form */}
          <form
            onSubmit={handleAddMemberSubmit}
            className="bg-white border border-[#141413]/15 p-6 space-y-4"
          >
            <div>
              <span className="text-[10px] font-mono-meta uppercase tracking-[0.2em] text-[#8C5A3C]">
                ADD NEW FAMILY MEMBER
              </span>
              <h3 className="mt-0.5 font-editorial-ko text-lg font-semibold text-[#141413]">
                + 새 가족 구성원 추가하기
              </h3>
              <p className="mt-1 text-xs text-[#71706B]">
                할머니, 할아버지, 삼촌, 배우자 등 함께 포토북을 만들 새 가족과 거주 도시를 추가하세요.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#141413] mb-1">
                  이름 / 호칭 *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="예: 할머니, 사위 민수, 막내동생"
                  className="w-full bg-[#FAF9F6] border border-[#141413]/20 px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#141413] mb-1">
                  거주 도시 *
                </label>
                <input
                  type="text"
                  required
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                  placeholder="예: 전주, 수원, 캐나다 밴쿠버"
                  className="w-full bg-[#FAF9F6] border border-[#141413]/20 px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#141413] mb-1">
                  세부 지역 / 동네 소개 (선택)
                </label>
                <input
                  type="text"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  placeholder="예: 전주 한옥마을 인근"
                  className="w-full bg-[#FAF9F6] border border-[#141413]/20 px-3 py-2 text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-[#141413] text-[#FAF9F6] text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-[#2C2B29] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>새 가족 구성원 등록하기</span>
            </button>
          </form>

          {/* Family Invite & Data Management Box */}
          <div className="bg-[#F3F1EC] border border-[#141413]/15 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#141413] flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5 text-[#8C5A3C]" />
                <span>가족 단톡방 초대장 복사</span>
              </span>
              <span className="font-mono-meta text-xs font-semibold text-[#8C5A3C]">
                CODE: {bookSettings.familyCode || '2026FAM'}
              </span>
            </div>
            <p className="text-xs text-[#5A5852] leading-relaxed">
              가족들에게 사이트 링크를 보내면 각자 이 페이지에서 본인의 이름과 거주 도시를 직접 설정하고 사진을 올릴 수 있습니다.
            </p>
            <button
              type="button"
              onClick={handleCopyInvite}
              className="w-full py-2.5 bg-white border border-[#141413] text-[#141413] hover:bg-[#141413] hover:text-[#FAF9F6] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              {copiedInvite ? (
                <>
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span>카카오톡 초대 메시지가 복사되었습니다!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>가족 초대 링크 & 안내 문구 복사하기</span>
                </>
              )}
            </button>

            <div className="pt-4 border-t border-[#141413]/12 space-y-2">
              <div className="text-[11px] font-semibold text-[#5A5852] flex items-center gap-1">
                <Database className="w-3.5 h-3.5" />
                <span>앨범 데이터 초기화 / 샘플 복원</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (
                      window.confirm(
                        '샘플 사진을 모두 비우고 우리 가족 사진만 담는 새 포토북으로 시작할까요?'
                      )
                    ) {
                      onResetArchive('empty');
                    }
                  }}
                  className="px-3 py-1.5 bg-white border border-[#141413]/20 hover:border-red-600 hover:text-red-600 text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>샘플 사진 비우기</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('기본 사계절 샘플 데이터를 다시 불러올까요?')) {
                      onResetArchive('sample');
                    }
                  }}
                  className="px-3 py-1.5 bg-white border border-[#141413]/20 hover:border-[#141413] text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>샘플 데이터 복원</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
