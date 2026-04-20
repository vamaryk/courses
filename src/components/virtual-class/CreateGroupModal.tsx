import { useState } from 'react';
import { Check, Users2, X } from 'lucide-react';
import type { FriendProfile } from '@/shared/api/friends';
import { groupsApi } from '@/shared/api/groups';
import { resolveProfileMediaUrl } from '@/shared/utils/media';

interface Props {
  open: boolean;
  onClose: () => void;
  friends: FriendProfile[];
  onCreated: (groupId: number) => void;
}

export default function CreateGroupModal({ open, onClose, friends, onCreated }: Props) {
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const group = await groupsApi.create(name.trim(), [...selected]);
      setName('');
      setSelected(new Set());
      onCreated(group.id);
      onClose();
    } catch (err) {
      console.error('[CreateGroup] error:', err);
    } finally {
      setCreating(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[101] flex items-center justify-center bg-black/40">
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="text-lg font-bold text-gray-900">Создать беседу</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Group name */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-500">Название беседы</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например: Проектная группа"
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm placeholder-gray-400 focus:border-purple focus:outline-none focus:ring-2 focus:ring-purple/20"
            />
          </div>

          {/* Friends selection */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-500">
              Добавить друзей {selected.size > 0 && <span className="text-purple">({selected.size})</span>}
            </label>
            <div className="max-h-52 overflow-y-auto rounded-xl border border-gray-100">
              {friends.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-400">Нет друзей для добавления</p>
              ) : (
                friends.map((f) => {
                  const isSelected = selected.has(f.id);
                  return (
                    <button
                      key={f.id}
                      onClick={() => toggle(f.id)}
                      className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                        isSelected ? 'bg-purple/5' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple/10 text-xs font-semibold text-purple">
                        {resolveProfileMediaUrl(f.avatar_url) ? (
                          <img src={resolveProfileMediaUrl(f.avatar_url) as string} alt="" className="h-full w-full rounded-full object-cover" />
                        ) : (
                          `${(f.first_name?.[0] || '').toUpperCase()}${(f.last_name?.[0] || '').toUpperCase()}`
                        )}
                      </div>
                      <span className="flex-1 truncate text-sm font-medium text-gray-700">
                        {f.first_name} {f.last_name}
                      </span>
                      <div className={`flex h-5 w-5 items-center justify-center rounded-md border transition-colors ${
                        isSelected ? 'border-purple bg-purple text-white' : 'border-gray-300'
                      }`}>
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <button
            onClick={handleCreate}
            disabled={!name.trim() || creating}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple py-2.5 text-sm font-semibold text-white transition-colors hover:bg-purple/90 disabled:opacity-50"
          >
            <Users2 className="h-4 w-4" />
            {creating ? 'Создаём…' : 'Создать беседу'}
          </button>
        </div>
      </div>
    </div>
  );
}
