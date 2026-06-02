import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';

export const UserFilterDropdown = ({
  users,
  selectedUid,
  onSelect,
  getStatusBadge,
  placeholder = 'Vybrat uživatele...',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);

  const selectedUser = users.find(u => u.uid === selectedUid);

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset search when closing
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  const getInitials = (username) => {
    return username
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (uid) => {
    const colors = [
      'bg-blue-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-red-500',
      'bg-orange-500',
      'bg-green-500',
      'bg-teal-500',
      'bg-indigo-500',
      'bg-cyan-500',
      'bg-rose-500',
    ];
    const index = uid.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-lg flex items-center justify-between hover:bg-light-border dark:hover:bg-dark-border transition-colors text-left"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {selectedUser ? (
            <>
              <div className={`w-8 h-8 rounded-full ${getAvatarColor(selectedUser.uid)} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                {getInitials(selectedUser.username)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-light-text dark:text-dark-text truncate">
                  {selectedUser.username}
                </p>
                {getStatusBadge && (
                  <p className="text-xs text-light-textMuted dark:text-dark-textMuted">
                    {getStatusBadge(selectedUser)}
                  </p>
                )}
              </div>
            </>
          ) : (
            <span className="text-light-textMuted dark:text-dark-textMuted">{placeholder}</span>
          )}
        </div>
        <ChevronDown
          size={18}
          className={`flex-shrink-0 text-light-textMuted dark:text-dark-textMuted transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-lg shadow-lg overflow-hidden">
          {/* Search Input */}
          <div className="p-3 border-b border-light-border dark:border-dark-border">
            <div className="flex items-center gap-2 px-3 py-2 bg-light-bg dark:bg-dark-bg rounded-lg">
              <Search size={16} className="text-light-textMuted dark:text-dark-textMuted flex-shrink-0" />
              <input
                type="text"
                placeholder="Hledat uživatele..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent outline-none text-sm text-light-text dark:text-dark-text placeholder-light-textMuted dark:placeholder-dark-textMuted"
                autoFocus
              />
            </div>
          </div>

          {/* User List */}
          <div className="max-h-72 overflow-y-auto">
            {filteredUsers.length === 0 ? (
              <div className="p-4 text-center text-sm text-light-textMuted dark:text-dark-textMuted">
                Žádní uživatelé se shodují
              </div>
            ) : (
              <div className="divide-y divide-light-border dark:divide-dark-border">
                {filteredUsers.map((user) => {
                  const isSelected = selectedUid === user.uid;
                  return (
                    <button
                      key={user.uid}
                      onClick={() => {
                        onSelect(user.uid);
                        setIsOpen(false);
                      }}
                      className={`w-full px-4 py-3 flex items-center justify-between gap-3 hover:bg-light-bg dark:hover:bg-dark-bg transition-colors text-left ${
                        isSelected ? 'bg-blue-50 dark:bg-blue-950' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-10 h-10 rounded-full ${getAvatarColor(user.uid)} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
                          {getInitials(user.username)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-light-text dark:text-dark-text truncate">
                            {user.username}
                          </p>
                          {getStatusBadge && (
                            <p className="text-xs text-light-textMuted dark:text-dark-textMuted">
                              {getStatusBadge(user)}
                            </p>
                          )}
                        </div>
                      </div>
                      {isSelected && (
                        <Check size={18} className="text-blue-500 flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer with user count */}
          <div className="p-3 border-t border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-center">
            <p className="text-xs text-light-textMuted dark:text-dark-textMuted">
              {filteredUsers.length} z {users.length} uživatelů
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
