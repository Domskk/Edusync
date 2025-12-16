import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Board, UserProfile } from '@/types/collaboration';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  board: Board;
  members: UserProfile[];
  currentUserId: string;
  inviteEmail: string;
  setInviteEmail: (email: string) => void;
  searchResults: UserProfile[];
  isSearching: boolean;
  searchUsersByEmail: (email: string) => void;
  inviteUser: (userId: string) => void;
  openDeleteModal: (title: string, message: string, onConfirm: () => void) => void;
}

export default function InviteModal({
  isOpen,
  onClose,
  board,
  members,
  currentUserId,
  inviteEmail,
  setInviteEmail,
  searchResults,
  isSearching,
  searchUsersByEmail,
  inviteUser,
  openDeleteModal,
}: InviteModalProps) {
  if (!isOpen) return null;

  const isOwner = currentUserId === board.owner_id;

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999]"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#1a1a1e] rounded-2xl border border-white/20 w-full max-w-lg mx-4 shadow-2xl"
      >
        <div className="p-6 border-b border-white/10 flex justify-between items-center">
          <h2 className="text-2xl font-bold">Invite to {board.title}</h2>
          <button onClick={onClose}>
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="relative">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => {
                setInviteEmail(e.target.value);
                searchUsersByEmail(e.target.value);
              }}
              placeholder="Enter email address..."
              className="w-full px-5 py-4 bg-white/10 rounded-xl outline-none focus:ring-4 focus:ring-purple-500/50 text-white placeholder-gray-500"
              autoFocus
            />

            {inviteEmail && (
              <div className="absolute top-full mt-2 w-full bg-[#111116] border border-white/20 rounded-xl shadow-2xl z-10 max-h-60 overflow-y-auto">
                {isSearching ? (
                  <div className="p-4 text-center text-gray-400">Searching...</div>
                ) : searchResults.length === 0 ? (
                  <div className="p-4 text-center text-gray-400">No users found</div>
                ) : (
                  searchResults.map((user) => {
                    const isAdded = board.collaborator_ids.includes(user.id) || user.id === board.owner_id;
                    return (
                      <button
                        key={user.id}
                        onClick={() => !isAdded && inviteUser(user.id)}
                        disabled={isAdded}
                        className={`w-full px-4 py-3 flex items-center gap-4 hover:bg-white/10 transition ${isAdded ? 'opacity-50' : ''}`}
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
                          {(user.display_name || user.email)[0].toUpperCase()}
                        </div>
                        <div className="text-left flex-1">
                          <p className="font-medium">{user.display_name || user.email.split('@')[0]}</p>
                          <p className="text-sm text-gray-400">{user.email}</p>
                        </div>
                        {isAdded ? <span className="text-green-400 text-sm">Added</span> : <PlusIcon className="w-5 h-5 text-purple-400" />}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4">Members ({board.collaborator_ids.length + 1})</h3>
            <div className="space-y-3">
              {members.map((user) => {
                const isYou = user.id === currentUserId;
                const isOwnerUser = user.id === board.owner_id;
                const canRemove = isOwner && !isOwnerUser && !isYou;
                const canLeave = !isOwnerUser && isYou;

                const handleAction = () => {
                  if (canLeave) {
                    // Leave board logic would go here (remove self)
                  } else if (canRemove) {
                    // Remove user logic
                  }
                };

                return (
                  <div key={user.id} className="flex items-center gap-4 px-4 py-3 bg-white/5 rounded-xl group">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
                      {(user.display_name || user.email)[0].toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">
                        {isYou ? 'You' : user.display_name || user.email.split('@')[0]}
                        {isOwnerUser && ' (Owner)'}
                      </p>
                      <p className="text-sm text-gray-400">{user.email}</p>
                    </div>
                    {(canRemove || canLeave) && (
                      <button
                        onClick={() =>
                          openDeleteModal(
                            canLeave ? 'Leave board?' : `Remove ${user.display_name || user.email.split('@')[0]}?`,
                            canLeave ? "You'll lose access." : 'They will lose access.',
                            handleAction
                          )
                        }
                        className="p-2 rounded-lg opacity-0 group-hover:opacity-100 transition hover:bg-red-600/30 text-red-400"
                      >
                        <XMarkIcon className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-8 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}