import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useAppStore } from '../utils/store';
import toast from 'react-hot-toast';

const KATEGORIE_VYDAJ = [
  { value: 'doprava', label: 'Doprava' },
  { value: 'jidlo', label: 'Jídlo' },
  { value: 'bydleni', label: 'Bydlení' },
  { value: 'sporeni', label: 'Spoření' },
  { value: 'zabava', label: 'Zábava' },
  { value: 'ostatni', label: 'Ostatní' },
];

export const FormVydaj = () => {
  const [form, setForm] = useState({ nazev: '', castka: '', datum: '', kategorie: 'doprava' });
  const addVydaj = useAppStore((s) => s.addVydaj);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!form.nazev.trim()) {
      toast.error('Název výdaje je povinný');
      return;
    }
    if (!form.castka || Number(form.castka) <= 0) {
      toast.error('Částka musí být větší než 0');
      return;
    }

    addVydaj({ ...form, castka: Number(form.castka) });
    toast.success('Výdaj přidán ✓');
    setForm({ nazev: '', castka: '', datum: '', kategorie: 'doprava' });
  };

  return (
    <div className="card">
      <h2 className="text-xl font-semibold mb-4">Přidat Výdaj</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          placeholder="Název výdaje"
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
          {KATEGORIE_VYDAJ.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </select>
        <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2">
          <Plus size={20} />
          Přidat Výdaj
        </button>
      </form>
    </div>
  );
};
