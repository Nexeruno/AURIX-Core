import { Trash2 } from 'lucide-react';
import { formatDatum, formatCastka, getCategoryColor } from '../utils/formatters';
import { useAppStore } from '../utils/store';
import toast from 'react-hot-toast';

export const ItemCardVydaj = ({ item }) => {
  const removeVydaj = useAppStore((s) => s.removeVydaj);

  const handleDelete = () => {
    if (confirm('Opravdu smazat tento výdaj?')) {
      removeVydaj(item.id);
      toast.success('Výdaj smazán');
    }
  };

  return (
    <div className="card flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
      <div className="flex-1">
        <p className="font-semibold text-light-text dark:text-dark-text">{item.nazev}</p>
        <p className="text-xs text-light-textMuted dark:text-dark-textMuted mt-1">{formatDatum(item.datum)}</p>
        <div className={`mt-2 w-fit px-2 py-1 rounded text-xs font-medium ${getCategoryColor(item.kategorie)}`}>
          {item.kategorie}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <p className="font-bold text-red-600 dark:text-red-400 text-lg">{formatCastka(item.castka)}</p>
        <button
          onClick={handleDelete}
          className="p-2 hover:bg-light-bg dark:hover:bg-dark-bg rounded transition-colors"
          aria-label="Delete item"
        >
          <Trash2 size={18} className="text-red-500" />
        </button>
      </div>
    </div>
  );
};

export const ItemCardPrijem = ({ item }) => {
  const removePrijem = useAppStore((s) => s.removePrijem);

  const handleDelete = () => {
    if (confirm('Opravdu smazat tento příjem?')) {
      removePrijem(item.id);
      toast.success('Příjem smazán');
    }
  };

  return (
    <div className="card flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
      <div className="flex-1">
        <p className="font-semibold text-light-text dark:text-dark-text">{item.nazev}</p>
        <p className="text-xs text-light-textMuted dark:text-dark-textMuted mt-1">{formatDatum(item.datum)}</p>
        <div className={`mt-2 w-fit px-2 py-1 rounded text-xs font-medium ${getCategoryColor(item.kategorie)}`}>
          {item.kategorie}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <p className="font-bold text-green-600 dark:text-green-400 text-lg">{formatCastka(item.castka)}</p>
        <button
          onClick={handleDelete}
          className="p-2 hover:bg-light-bg dark:hover:bg-dark-bg rounded transition-colors"
          aria-label="Delete item"
        >
          <Trash2 size={18} className="text-red-500" />
        </button>
      </div>
    </div>
  );
};
