import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Check,
  Copy,
  Edit3,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

const COLOR_PRESETS = [
  { label: '브라운', color: '#8C5A3C', badgeBg: '#F5EBE6' },
  { label: '그린', color: '#3B5249', badgeBg: '#E6EFEA' },
  { label: '네이비', color: '#2C3E50', badgeBg: '#E8EEF5' },
  { label: '퍼플', color: '#6C5B7B', badgeBg: '#EFEBF5' },
  { label: '오렌지', color: '#B85D19', badgeBg: '#F9EFE6' },
  { label: '플럼', color: '#7A4988', badgeBg: '#F3EAF6' },
];

const TEAM_NAME_SUGGESTIONS = [
  '박서 오피스 — 우리 가족 사진첩',
  '오성 가족 사랑방 사진첩',
  '부산·덴버·대전 우리 가족 기록장',
  '우리 가족 사계절 이야기',
];

export default function ProfileFamilySettingsPage({
  members = [],
  photos = [],
  activeMemberId,
  bookSettings = {},
  onUpdateMember,
  onReorderMembers,
  onAddMember,
  onDeleteMember,
  onUpdateBookSettings,
}) {
  const activeMember =
    members.find((m) => m.id === activeMemberId) ||
    members[0] || {
      id: 'member-first',
      name: '가족',
      city: '부산',
      role: '부산',
      avatar: '가',
      color: '#2C3E50',
      badgeBg: '#E8EEF5',
    };

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

  const [editingMemberId, setEditingMemberId] = useState(null);
  const [rowName, setRowName] = useState('');
  const [rowCity, setRowCity] = useState('');

  const [newName, setNewName] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newColorIdx, setNewColorIdx] = useState(0);

  const [copiedInvite, setCopiedInvite] = useState(false);

  useEffect(() => {
    setFamilyTitleInput(
      bookSettings.familyTitle ||
        (bookSettings.title && !bookSettings.title.includes('OUR YEAR')
          ? bookSettings.title
          : '박서 오피스 — 우리 가족 사진첩')
    );
    setSubtitleInput(bookSettings.subtitle || '');
    setFamilyCodeInput(bookSettings.familyCode || '2026FAM');
  }, [bookSettings.familyTitle, bookSettings.title, bookSettings.subtitle, bookSettings.familyCode]);

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
  };

  const startRowEdit = (m) => {
    setEditingMemberId(m.id);
    setRowName(m.name || '');
    setRowCity(m.city || '');
  };

  const handleSaveRowEdit = async (memberId) => {
    if (!rowName.trim()) return;
    const cleanCity = rowCity.trim() || '부산';
    await onUpdateMember(memberId, {
      id: memberId,
      name: rowName.trim(),
      city: cleanCity,
      role: cleanCity,
    });
    setEditingMemberId(null);
  };

  const handleMoveByOffset = (index, delta) => {
    const targetIdx = index + delta;
    if (targetIdx < 0 || targetIdx >= members.length) return;
    const reordered = [...members];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIdx, 0, moved);
    if (onReorderMembers) {
      onReorderMembers(reordered);
    }
  };

  const handleAddMemberSubmit = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const pick = COLOR_PRESETS[newColorIdx % COLOR_PRESETS.length];
    const cleanCity = newCity.trim() || '부산';
    await onAddMember({
      name: newName.trim(),
      city: cleanCity,
      role: cleanCity,
      color: pick.color,
      badgeBg: pick.badgeBg,
      avatar: newName.trim().slice(0, 2),
    });
    setNewName('');
    setNewCity('');
    setNewColorIdx((prev) => (prev + 1) % COLOR_PRESETS.length);
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

  return (
    <div className="pb-6 bg-[#F8F7F4] space-y-3">
      {/* 1. 우리 가족 사진첩 / 팀 이름 설정 */}
      <section className="bg-white border-b border-neutral-200 px-4 py-5 space-y-4">
        <div>
          <p className="text-[11px] font-medium text-neutral-400 tracking-tight">
            공간 관리
          </p>
          <h2 className="text-lg font-bold text-[#111111] tracking-tight mt-0.5">
            우리 가족 사진첩 이름 설정
          </h2>
        </div>

        {savedTeamBanner && (
          <div className="p-3 bg-neutral-100 border border-neutral-200 rounded-xl text-[#111111] text-xs font-semibold flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>사진첩 이름이 저장되어 상단 제목과 표지에 반영되었습니다.</span>
          </div>
        )}

        <form onSubmit={handleSaveFamilyTeamInfo} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
              사진첩 이름 (팀 이름)
            </label>
            <input
              type="text"
              value={familyTitleInput}
              onChange={(e) => setFamilyTitleInput(e.target.value)}
              placeholder="예: 박서 오피스 — 우리 가족 사진첩"
              className="w-full bg-[#F8F7F4] border border-neutral-200 focus:border-neutral-400 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-[#111111] focus:outline-none"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {TEAM_NAME_SUGGESTIONS.map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => setFamilyTitleInput(sug)}
                  className="px-2.5 py-1 bg-[#F8F7F4] hover:bg-neutral-200 border border-neutral-200 rounded-md text-[11px] text-neutral-600 cursor-pointer"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
              한줄 소개
            </label>
            <input
              type="text"
              value={subtitleInput}
              onChange={(e) => setSubtitleInput(e.target.value)}
              placeholder="예: 온 가족이 함께 모으는 사계절 일상 기록"
              className="w-full bg-[#F8F7F4] border border-neutral-200 focus:border-neutral-400 rounded-xl px-3.5 py-2.5 text-xs text-[#111111] focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-[#111111] text-white rounded-xl text-xs font-semibold cursor-pointer"
          >
            이름 저장하기
          </button>
        </form>
      </section>

      {/* 2. 가족 초대 링크 복사 */}
      <section className="bg-white border-y border-neutral-200 px-4 py-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#111111]">가족 초대하기</h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              대표 1인 구독으로 온 가족 인원 제한 없이 참여할 수 있습니다.
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-md bg-[#F8F7F4] border border-neutral-200 text-xs font-mono font-semibold text-[#111111]">
            {bookSettings.familyCode || '2026FAM'}
          </span>
        </div>

        <button
          type="button"
          onClick={handleCopyInvite}
          className="w-full py-3 bg-[#111111] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
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

      {/* 3. 가족 구성원 명단 및 순서 편집 */}
      <section className="bg-white border-y border-neutral-200 px-4 py-5 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-[#111111]">
            가족 구성원 명단 ({members.length}명)
          </h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            순서를 변경하면 첫 화면 상단 가족 명단에 그대로 반영됩니다.
          </p>
        </div>

        <div className="divide-y divide-neutral-200/80 border border-neutral-200 rounded-xl overflow-hidden">
          {members.map((m, index) => {
            const isEditing = editingMemberId === m.id;
            const photoCount = photos.filter((p) => p.memberId === m.id).length;

            return (
              <div
                key={m.id}
                className="p-3 bg-white flex items-center justify-between gap-2"
              >
                {isEditing ? (
                  <div className="flex-1 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={rowName}
                        onChange={(e) => setRowName(e.target.value)}
                        placeholder="이름/호칭"
                        className="bg-[#F8F7F4] border border-neutral-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                      />
                      <input
                        type="text"
                        value={rowCity}
                        onChange={(e) => setRowCity(e.target.value)}
                        placeholder="거주 도시"
                        className="bg-[#F8F7F4] border border-neutral-300 rounded-lg px-2.5 py-1.5 text-xs"
                      />
                    </div>
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditingMemberId(null)}
                        className="px-2.5 py-1 border border-neutral-200 rounded text-xs text-neutral-500 cursor-pointer"
                      >
                        취소
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveRowEdit(m.id)}
                        className="px-3 py-1 bg-[#111111] text-white rounded text-xs font-semibold cursor-pointer"
                      >
                        저장
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xs font-medium text-neutral-400 w-4 text-center shrink-0">
                        {index + 1}
                      </span>
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden"
                        style={{ backgroundColor: m.badgeBg || '#F0EFEA', color: m.color || '#111111' }}
                      >
                        {m.avatarImage ? (
                          <img src={m.avatarImage} alt={m.name} className="w-full h-full object-cover" />
                        ) : (
                          m.avatar || m.name.slice(0, 2)
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-[#111111] truncate">
                            {m.name}
                          </span>
                          {m.id === activeMember.id && (
                            <span className="px-1.5 py-0.5 bg-neutral-100 text-neutral-600 rounded text-[10px] font-medium">
                              나
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-neutral-400">
                          {m.city || '도시 미설정'} · 사진 {photoCount}장
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => handleMoveByOffset(index, -1)}
                        className="p-1.5 text-neutral-400 hover:text-[#111111] disabled:opacity-25 cursor-pointer"
                        title="위로"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={index === members.length - 1}
                        onClick={() => handleMoveByOffset(index, 1)}
                        className="p-1.5 text-neutral-400 hover:text-[#111111] disabled:opacity-25 cursor-pointer"
                        title="아래로"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => startRowEdit(m)}
                        className="p-1.5 text-neutral-500 hover:text-[#111111] cursor-pointer"
                        title="수정"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      {members.length > 1 && (
                        <button
                          type="button"
                          onClick={() => onDeleteMember(m.id)}
                          className="p-1.5 text-neutral-400 hover:text-red-600 cursor-pointer"
                          title="삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* 새 가족 구성원 추가 */}
        <form
          onSubmit={handleAddMemberSubmit}
          className="bg-[#F8F7F4] border border-neutral-200 rounded-xl p-3.5 space-y-2.5"
        >
          <span className="block text-xs font-semibold text-[#111111]">
            새 가족 프로필 추가
          </span>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="이름/호칭 (예: 손주 하준)"
              className="bg-white border border-neutral-200 rounded-lg px-3 py-2 text-xs focus:outline-none"
            />
            <input
              type="text"
              value={newCity}
              onChange={(e) => setNewCity(e.target.value)}
              placeholder="거주 도시 (예: 서울)"
              className="bg-white border border-neutral-200 rounded-lg px-3 py-2 text-xs focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2.5 bg-[#111111] text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>가족 명단에 추가</span>
          </button>
        </form>
      </section>
    </div>
  );
}
