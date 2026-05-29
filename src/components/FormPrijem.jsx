import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useAppStore } from '../utils/store';
import toast from 'react-hot-toast';

const KATEGORIE_PRIJEM = [
  { value: 'prace', label: 'Práce' },
  { value: 'brigada', label: 'Brigáda' },
  { value: 'prodej', label: 'Prodej' },
  { value: 'prispevky', label: 'Příspěvky' },
  { value: 'ostatni', label: 'Ostatní' },
];

export const FormPrijem = () => {
  const [form, setForm] = useState({ nazev: '', castka: '', datum: '', kategorie: 'prace' });
  const addPrijem = useAppStore((s) => s.addPrijem);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!form.nazev.trim()) {
      toast.error('Název příjmu je povinný');
      return;
    }
    if (!form.castka || Number(form.castka) <= 0) {
      toast.error('Částka musí být větší než 0');
      return;
    }

    addPrijem({ ...form, castka: Number(form.castka) });
    toast.success('Příjem přidán ✓');
    setForm({ nazev: '', castka: '', datum: '', kategorie: 'prace' });
  };

  return (
    <div className="card">
      <h2 className="text-xl font-semibold mb-4">Přidat Příjem</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          placeholder="Název příjmu"
          className="input-field"
          value={form.nazev}
          onChange={(e) => setForm({ ...form, nazev: e.target.value })}
        />
        <input
          type="number"
          placeholder="Částka"
          className="input-field"
          value={form.castka}
          onChange={(e) => setForm({ ...form, castka: e.target.value })}
        />
        <input
          type="date"
          className="input-field"
          value={form.datum}
          onChange={(e) => setForm({ ...form, datum: e.target.value })}
        />
        <select className="select-field" value={form.kategorie} onChange={(e) => setForm({ ...form, kategorie: e.target.value })}>
          {KATEGORIE_PRIJEM.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </select>
        <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2">
          <Plus size={20} />
          Přidat Příjem
        </button>
      </form>
    </div>
  );
};
