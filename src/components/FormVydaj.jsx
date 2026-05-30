import { useState, useRef, useCallback } from 'react';
import { Plus, Repeat2, Heart } from 'lucide-react';
import { useAppStore } from '../utils/store';
import { KATEGORIE_VYDAJ_FORM, KATEGORIE_PRIJEM_FORM } from '../utils/constants';
import { RecurringModal } from './RecurringModal';
import { FavoritesModal } from './FavoritesModal';
import { useAuth } from '../context/AuthContext';
import { db } from '../utils/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';

const todayISO = () => new Date().toISOString().slice(0, 10);

const Form = ({ typ }) => {
  const { session } = useAuth();
  const isVydaj   = typ === 'vydaj';
  const label     = isVydaj ? 'Výdaj' : 'Příjem';
  const kategorie = isVydaj ? KATEGORIE_VYDAJ_FORM : KATEGORIE_PRIJEM_FORM;
  const addItem   = useAppStore((s) => (isVydaj ? s.addVydaj : s.addPrijem));

  const nazevRef = useRef(null);

  const [form, setForm]     = useState({ nazev: '', castka: '', datum: todayISO(), kategorie: '' });
  const [saving, setSaving] = useState(false);
  const [recurringModalOpen, setRecurringModalOpen] = useState(false);
  const [favoritesModalOpen, setFavoritesModalOpen] = useState(false);

  const set = useCallback(
    (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value })),
    []
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nazev.trim())                       { toast.error(`Název ${label.toLowerCase()}e je povinný`); return; }
    if (!form.castka || Number(form.castka) <= 0) { toast.error('Částka musí být větší než 0');               return; }
    if (!form.datum)                              { toast.error('Datum je povinné');                           return; }
    if (!form.kategorie)                          { toast.error('Kategorie je povinná');                       return; }

    setSaving(true);
    try {
      await addItem({ ...form, castka: Number(form.castka) });
      toast.success(`${label} přidán ✓`);
      setForm((f) => ({ ...f, nazev: '', castka: '' }));
      nazevRef.current?.focus();
    } catch {
      // chyba zobrazena v store
    } finally {
      setSaving(false);
    }
  };

  const handleSelectFavorite = (favorite) => {
    setForm({
      nazev: favorite.title,
      castka: favorite.amount.toString(),
      datum: form.datum, // Zachovej dnešní datum
      kategorie: favorite.category,
    });
    toast.success(`Nahrána oblíbená "${favorite.title}"`);
    nazevRef.current?.focus();
  };

  const handleSaveRecurring = async (recurring) => {
    if (!form.nazev.trim())                       { toast.error(`Název ${label.toLowerCase()}e je povinný`); return; }
    if (!form.castka || Number(form.castka) <= 0) { toast.error('Částka musí být větší než 0');               return; }
    if (!form.kategorie)                          { toast.error('Kategorie je povinná');                       return; }

    if (!session?.uid) {
      toast.error('Nejsi přihlášen');
      return;
    }

    setSaving(true);
    try {
      const recurringData = {
        title: form.nazev,
        type: typ,
        amount: Number(form.castka),
        category: form.kategorie,
        ...recurring,
        recurrenceStartDate: new Date(form.datum),
        recurrenceEndDate: recurring.recurrenceEndDate ? new Date(recurring.recurrenceEndDate) : null,
        lastGeneratedDate: new Date(form.datum),
        isActive: true,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'users', session.uid, 'repeatingTransactions'), recurringData);

      toast.success(`${label} nastaven na opakování${recurring.isFavorite ? ' a uložen jako oblíbený' : ''} ✓`);
      setForm((f) => ({ ...f, nazev: '', castka: '' }));
      setRecurringModalOpen(false);
      nazevRef.current?.focus();
    } catch (err) {
      console.error('Chyba při ukládání opakující se transakce:', err);
      toast.error('Chyba při ukládání');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card">
      <h2 className="text-xl font-semibold mb-4">Přidat {label}</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          ref={nazevRef}
          type="text"
          placeholder={`Název ${label.toLowerCase()}e`}
          className="input-field"
          value={form.nazev}
          onChange={set('nazev')}
          maxLength={100}
          autoFocus
        />
        <input
          type="number"
          placeholder="Částka (Kč)"
          className="input-field"
          value={form.castka}
          min="0.01"
          step="any"
          onChange={set('castka')}
        />
        <input
          type="date"
          className="input-field"
          value={form.datum}
          onChange={set('datum')}
        />
        <select
          className="select-field"
          value={form.kategorie}
          onChange={set('kategorie')}
        >
          <option value="" disabled>Vyberte kategorii</option>
          {kategorie.map((k) => (
            <option key={k.value} value={k.value}>{k.label}</option>
          ))}
        </select>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <Plus size={20} />
            {saving ? 'Ukládám...' : `Přidat ${label}`}
          </button>
          <button
            type="button"
            onClick={() => setFavoritesModalOpen(true)}
            disabled={saving}
            className="btn-secondary flex items-center justify-center gap-2 px-4 disabled:opacity-60"
            title="Načíst z oblíbených"
          >
            <Heart size={20} />
          </button>
          <button
            type="button"
            onClick={() => setRecurringModalOpen(true)}
            disabled={saving}
            className="btn-secondary flex items-center justify-center gap-2 px-4 disabled:opacity-60"
            title="Nastavit jako opakující se"
          >
            <Repeat2 size={20} />
          </button>
        </div>
      </form>

      {/* Hint — kategorie a datum se pamatují */}
      <p className="text-xs text-light-textMuted dark:text-dark-textMuted mt-3 text-center">
        Po přidání zůstane kategorie a datum pro rychlé zadání dalšího záznamu
      </p>

      {/* RecurringModal */}
      <RecurringModal
        isOpen={recurringModalOpen}
        onClose={() => setRecurringModalOpen(false)}
        onSave={handleSaveRecurring}
        typ={typ}
      />

      {/* FavoritesModal */}
      <FavoritesModal
        isOpen={favoritesModalOpen}
        onClose={() => setFavoritesModalOpen(false)}
        onSelect={handleSelectFavorite}
        typ={typ}
      />
    </div>
  );
};

export const FormVydaj  = () => <Form typ="vydaj"  />;
export const FormPrijem = () => <Form typ="prijem" />;
