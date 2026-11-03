import React, { useState } from 'react';
import {
  X,
  Users,
  Cloud,
  Share2,
  Plus,
  Trash2,
  Copy,
  Check,
  Database,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

const SUPABASE_SQL_SNIPPET = `-- Supabase SQL Editor에 붙여넣고 Run을 눌러주세요:
create table if not exists public.family_archive_state (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz default now()
);

alter table public.family_archive_state enable row level security;

create policy "Allow public family access"
  on public.family_archive_state
  for all
  using (true)
  with check (true);`;

export default function FamilyCloudModal({
  isOpen,
  onClose,
  initialTab = 'members', // 'members' | 'invite' | 'cloud'
  members = [],
  bookSettings = {},
  cloudStatus = {},
  onAddMember,
  onDeleteMember,
  onUpdateBookSettings,
  onSaveCloudConfig,
  onResetArchive,
}) {
  const [tab, setTab] = useState(initialTab);
  const [newName, setNewName] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newRole, setNewRole] = useState('');
  const [supabaseUrl, setSupabaseUrl] = useState(cloudStatus?.supabaseUrl || '');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [cloudMsg, setCloudMsg] = useState('');
  const [cloudLoading, setCloudLoading] = useState(false);

  if (!isOpen) return null;

  const handleCreateMember = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    await onAddMember({
      name: newName.trim(),
      city: newCity.trim() || '서울',
      role: newRole.trim() || `${newCity.trim() || '서울'} 거주`,
    });
    setNewName('');
    setNewCity('');
    setNewRole('');
  };

  const handleCopyInviteMessage = () => {
    const shareUrl = window.location.origin;
    const message = `[${bookSettings.koreanTitle || '2026 우리 가족 사계절 포토북'}]\n각자 있는 곳에서 찍은 일상 사진을 올려주세요! 연말에 날짜별로 자동 편집되어 한 권의 화보집 책으로 만들어집니다 📖\n\n• 접속 주소: ${shareUrl}\n• 가족 초대 코드: ${bookSettings.familyCode || '2026FAM'}`;
    navigator.clipboard.writeText(message);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2500);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SNIPPET);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleConnectSupabase = async (e) => {
    e.preventDefault();
    setCloudLoading(true);
    setCloudMsg('');
    try {
      const res = await onSaveCloudConfig({
        supabaseUrl,
        supabaseAnonKey: supabaseKey,
      });
      if (res?.cloudStatus?.connected) {
        setCloudMsg('Supabase 클라우드 DB와 성공적으로 동기화되었습니다!');
      } else if (res?.cloudStatus?.tableWarning) {
        setCloudMsg(
          `연결되었으나 테이블 생성이 필요합니다: 아래 SQL을 Supabase SQL Editor에서 실행해 주세요.`
        );
      }
    } catch (err) {
      setCloudMsg(err.message || '연결 중 오류가 발생했습니다.');
    } finally {
      setCloudLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#141413]/65 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-[#FAF9F6] border border-[#141413]/15 w-full max-w-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#141413]/12 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono-meta uppercase tracking-[0.22em] text-[#8C5A3C]">
              FAMILY ARCHIVE SETTINGS & CLOUD SYNC
            </span>
            <h3 className="font-editorial-ko text-lg font-semibold text-[#141413]">
              가족 구성원 · 초대장 · 클라우드 관리
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#71706B] hover:text-[#141413] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[#141413]/12 bg-[#F3F1EC]">
          <button
            type="button"
            onClick={() => setTab('members')}
            className={`flex-1 py-3 text-xs font-medium flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              tab === 'members'
                ? 'border-[#141413] text-[#141413] bg-[#FAF9F6]'
                : 'border-transparent text-[#71706B] hover:text-[#141413]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>가족 구성원 관리 ({members.length}명)</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('invite')}
            className={`flex-1 py-3 text-xs font-medium flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              tab === 'invite'
                ? 'border-[#141413] text-[#141413] bg-[#FAF9F6]'
                : 'border-transparent text-[#71706B] hover:text-[#141413]'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>가족 초대 링크 공유</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('cloud')}
            className={`flex-1 py-3 text-xs font-medium flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              tab === 'cloud'
                ? 'border-[#141413] text-[#141413] bg-[#FAF9F6]'
                : 'border-transparent text-[#71706B] hover:text-[#141413]'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>클라우드 DB & 데이터 관리</span>
          </button>
        </div>

        {/* Tab 1: Family Members */}
        {tab === 'members' && (
          <div className="p-6 space-y-5">
            <p className="text-xs text-[#5A5852] leading-relaxed">
              각자 다른 도시에 떨어져 지내는 가족 구성원을 등록하세요. 사진을 올릴 때 누가 어디서 찍은 사진인지 자동으로 포토북에 기록됩니다.
            </p>

            <div className="divide-y divide-[#141413]/10 border border-[#141413]/12 bg-white">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="px-4 py-3 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="w-7 h-7 rounded-full flex items-center justify-center font-semibold text-xs"
                      style={{ backgroundColor: m.badgeBg, color: m.color }}
                    >
                      {m.avatar || m.name.slice(0, 1)}
                    </span>
                    <div>
                      <div className="font-semibold text-[#141413]">{m.name}</div>
                      <div className="text-[11px] text-[#71706B]">
                        거주 도시: {m.city} · {m.role}
                      </div>
                    </div>
                  </div>
                  {members.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onDeleteMember(m.id)}
                      className="p-1.5 text-[#8E8A80] hover:text-red-600 cursor-pointer"
                      title="구성원 삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <form
              onSubmit={handleCreateMember}
              className="bg-[#F3F1EC] p-4 border border-[#141413]/10 space-y-3"
            >
              <div className="text-xs font-semibold text-[#141413]">
                + 새 가족 구성원 추가하기
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="이름/호칭 (예: 외할머니)"
                  className="bg-white border border-[#141413]/15 px-3 py-2 text-xs"
                />
                <input
                  type="text"
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                  placeholder="거주 도시 (예: 전주, 대전)"
                  className="bg-white border border-[#141413]/15 px-3 py-2 text-xs"
                />
                <input
                  type="text"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  placeholder="소개 (예: 전주 한옥마을)"
                  className="bg-white border border-[#141413]/15 px-3 py-2 text-xs"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-[#141413] text-[#FAF9F6] text-xs font-medium flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>가족 구성원 등록</span>
              </button>
            </form>
          </div>
        )}

        {/* Tab 2: Family Invite Share */}
        {tab === 'invite' && (
          <div className="p-6 space-y-5">
            <div className="bg-[#F3F1EC] p-5 border border-[#141413]/12 text-center space-y-3">
              <span className="text-[10px] font-mono-meta uppercase tracking-[0.2em] text-[#8C5A3C]">
                FAMILY INVITATION PASSCODE
              </span>
              <div className="font-mono-meta text-2xl font-semibold tracking-[0.25em] text-[#141413]">
                {bookSettings.familyCode || '2026FAM'}
              </div>
              <p className="text-xs text-[#5A5852] max-w-md mx-auto leading-relaxed">
                가족 단톡방(카카오톡·문자)에 아래 초대 메시지를 복사해 공유하세요. 복잡한 회원가입 없이 본인 이름만 선택하면 바로 스마트폰에서 사진을 올릴 수 있습니다.
              </p>
              <button
                type="button"
                onClick={handleCopyInviteMessage}
                className="px-5 py-2.5 bg-[#141413] text-[#FAF9F6] text-xs font-medium inline-flex items-center gap-2 cursor-pointer"
              >
                {copiedInvite ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>초대 메시지가 클립보드에 복사되었습니다!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>카카오톡/문자용 가족 초대장 복사하기</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Cloud Sync & Archive Reset */}
        {tab === 'cloud' && (
          <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
            {/* Current Status Banner */}
            <div className="p-4 bg-[#E6EFEA] border border-[#3B5249]/25 flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-[#3B5249] flex items-center gap-1.5">
                  <Database className="w-4 h-4" />
                  <span>
                    현재 저장소 상태:{' '}
                    {cloudStatus?.mode === 'supabase'
                      ? 'Supabase 클라우드 실시간 연동 중'
                      : '풀스택 서버 영구 저장소 (Local Server DB + Uploads) 활성'}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-[#3B5249]/85 leading-relaxed">
                  현재 서버에 업로드된 모든 사진과 코멘트는 자동으로 서버 디스크(`server/storage/`)에 영구 보관되며, 원격 배포 시 아래 Supabase 클라우드를 연결하면 전 세계 어디서나 동기화됩니다.
                </p>
              </div>
            </div>

            {/* Supabase Cloud Form */}
            <form
              onSubmit={handleConnectSupabase}
              className="p-4 bg-white border border-[#141413]/12 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#141413]">
                  Supabase 클라우드 DB 연동 (선택 사항)
                </span>
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="text-[11px] text-[#8C5A3C] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {copiedSql ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedSql ? 'SQL 복사 완료!' : '초기 테이블 생성 SQL 복사'}</span>
                </button>
              </div>

              <div className="space-y-2">
                <input
                  type="url"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  placeholder="Supabase Project URL (https://xxxx.supabase.co)"
                  className="w-full bg-[#FAF9F6] border border-[#141413]/15 px-3 py-2 text-xs font-mono-meta"
                />
                <input
                  type="password"
                  value={supabaseKey}
                  onChange={(e) => setSupabaseKey(e.target.value)}
                  placeholder="Supabase Anon Public Key"
                  className="w-full bg-[#FAF9F6] border border-[#141413]/15 px-3 py-2 text-xs font-mono-meta"
                />
              </div>

              {cloudMsg && (
                <p className="text-xs text-[#8C5A3C] font-medium">{cloudMsg}</p>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={cloudLoading}
                  className="px-4 py-2 bg-[#141413] text-[#FAF9F6] text-xs font-medium cursor-pointer"
                >
                  {cloudLoading ? '연결 확인 중...' : 'Supabase 클라우드 연결 및 동기화'}
                </button>
              </div>
            </form>

            {/* Archive Data Reset Controls */}
            <div className="p-4 bg-[#F3F1EC] border border-[#141413]/12 space-y-3">
              <div className="text-xs font-semibold text-[#141413]">
                아카이브 데이터 초기화 / 샘플 전환
              </div>
              <p className="text-[11px] text-[#5A5852]">
                기본 제공된 사계절 샘플 사진을 모두 비우고 우리 가족만의 새 포토북을 시작하거나, 언제든 샘플 데이터를 다시 불러올 수 있습니다.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (
                      window.confirm(
                        '샘플 사진을 모두 지우고 빈 가족 포토북으로 새로 시작할까요?'
                      )
                    ) {
                      onResetArchive('empty');
                      onClose();
                    }
                  }}
                  className="px-3.5 py-2 bg-white border border-[#141413]/20 hover:border-red-600 hover:text-red-600 text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>샘플 지우고 빈 앨범으로 시작하기</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('2026 사계절 가족 샘플 데이터를 다시 불러올까요?')) {
                      onResetArchive('sample');
                      onClose();
                    }
                  }}
                  className="px-3.5 py-2 bg-white border border-[#141413]/20 hover:border-[#141413] text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>사계절 샘플 데이터 복원하기</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
