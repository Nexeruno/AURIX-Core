import { useAppStore } from '../utils/store';
import { ItemCardPrijem } from './ItemCard';
import { formatCastka, filterItems } from '../utils/formatters';
import { Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export const SeznamPrijem = () => {
  const prijmy = useAppStore((s) => s.prijmy);
  const filtryPrijem = useAppStore((s) => s.filtryPrijem);
  const clearAll = useAppStore((s) => s.clearAll);

  const filteredItems = filterItems(prijmy, filtryPrijem.kategorie, filtryPrijem.mesic);
  const total = filteredItems.reduce((sum, item) => sum + Number(item.castka || 0), 0);

  const handleClearAll = () => {
    if (confirm('Smazat VŠECHNY příjmy? Tuto akci nelze vrátit!')) {
      clearAll();
      toast.success('Všechny příjmy smazány');
    }
  };

  return (
    <div>
      <div className="card mb-4">
        <h3 className="text-sm font-medium text-light-textMuted dark:text-dark-textMuted mb-1">Příjmy celkem</h3>
        <p className="text-3xl font-bold text-green-600 dark:text-green-400">{formatCastka(total)}</p>
      </div>

      <h2 className="text-2xl font-bold mb-4">Seznam příjmů</h2>
      <div className="space-y-3 mb-6">
        {filteredItems.length === 0 ? (
          <p className="text-center text-light-textMuted dark:text-dark-textMuted py-8">Nebyly nalezeny záznamy</p>
        ) : (
          filteredItems.map((item) => <ItemCardPrijem key={item.id} item={item} />)
        )}
      </div>

      {prijmy.length > 0 && (
        <button onClick={handleClearAll} className="btn-danger w-full flex items-center justify-center gap-2">
          <Trash2 size={20} />
          Vymazat všechny příjmy
        </button>
      )}
    </div>
  );
};
