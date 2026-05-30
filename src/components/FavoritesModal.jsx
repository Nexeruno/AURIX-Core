import { useState, useEffect } from 'react';
import { X, Heart, Trash2 } from 'lucide-react';
import { db } from '../utils/firebase';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export const FavoritesModal = ({ isOpen, onClose, onSelect, typ }) => {
  const { session } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);

  // Načti oblíbené
  useEffect(() => {
    if (!isOpen || !session?.uid) return;

    const loadFavorites = async () => {
      setLoading(true);
      try {
        const snap = await getDocs(
          collection(db, 'users', session.uid, 'repeatingTransactions')
        );
        const favs = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((f) => f.isFavorite && f.type === typ); // Filtruj podle typu
        setFavorites(favs);
      } catch (err) {
        console.error('Chyba při načítání oblíbených:', err);
      } finally {
        setLoading(false);
      }
    };

    loadFavorites();
  }, [isOpen, session?.uid, typ]);

  // Vymaž oblíbenou
  const handleDelete = async (id, title) => {
    if (!window.confirm(`Smazat oblíbenou "${title}"?`)) return;

    try {
      await deleteDoc(doc(db, 'users', session.uid, 'repeatingTransactions', id));
      setFavorites((prev) => prev.filter((f) => f.id !== id));
      toast.success('Oblíbená smazána');
    } catch (err) {
      console.error('Chyba při mazání:', err);
      toast.error('Chyba při mazání');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-light-bg dark:bg-dark-bg rounded-lg max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-light-border dark:border-dark-border sticky top-0 bg-light-bg dark:bg-dark-bg">
          <div className="flex items-center gap-2">
            <Heart size={20} className="text-red-500" fill="currentColor" />
            <h2 className="text-lg font-semibold">Oblíbené</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-light-border dark:hover:bg-dark-border rounded"
          >
            <X size={20} />
          </button>
        </div>

        {/* Obsah */}
        <div className="p-4">
          {loading ? (
            <p className="text-center py-8 text-light-textMuted dark:text-dark-textMuted">
              Načítám...
            </p>
          ) : favorites.length === 0 ? (
            <p className="text-center py-8 text-light-textMuted dark:text-dark-textMuted">
              Nemáš žádné oblíbené {typ === 'vydaj' ? 'výdaje' : 'příjmy'}
            </p>
          ) : (
            <div className="space-y-2">
              {favorites.map((fav) => (
                <button
                  key={fav.id}
                  onClick={() => {
                    onSelect(fav);
                    onClose();
                  }}
                  className="w-full text-left p-3 rounded-lg bg-light-border dark:bg-dark-border hover:bg-light-card dark:hover:bg-dark-card transition-colors flex items-center justify-between group"
                >
                  <div>
                    <div className="font-medium">{fav.title}</div>
                    <div className="text-sm text-light-textMuted dark:text-dark-textMuted">
                      {fav.amount} Kč • {fav.category}
                    </div>
                    <div className="text-xs text-light-textMuted dark:text-dark-textMuted mt-1">
                      {fav.recurrenceType === 'daily' && 'Denně'}
                      {fav.recurrenceType === 'weekly' && `Týdně (${fav.recurrenceFrequency}x)`}
                      {fav.recurrenceType === 'monthly' && `Měsíčně (${fav.recurrenceDay}. den)`}
                      {fav.recurrenceType === 'yearly' && 'Ročně'}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(fav.id, fav.title);
                    }}
                    className="p-2 text-red-600 opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-all"
                    title="Smazat"
                  >
                    <Trash2 size={16} />
                  </button>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
