import { useAppStore } from '../utils/store';

const MESICE = [
  { value: 'vse-mesic', label: 'Všechny měsíce' },
  { value: '01', label: 'Leden' },
  { value: '02', label: 'Únor' },
  { value: '03', label: 'Březen' },
  { value: '04', label: 'Duben' },
  { value: '05', label: 'Květen' },
  { value: '06', label: 'Červen' },
  { value: '07', label: 'Červenec' },
  { value: '08', label: 'Srpen' },
  { value: '09', label: 'Září' },
  { value: '10', label: 'Říjen' },
  { value: '11', label: 'Listopad' },
  { value: '12', label: 'Prosinec' },
];

const KATEGORIE_VYDAJ = [
  { value: 'vse', label: 'Všechny kategorie' },
  { value: 'doprava', label: 'Doprava' },
  { value: 'jidlo', label: 'Jídlo' },
  { value: 'bydleni', label: 'Bydlení' },
  { value: 'sporeni', label: 'Spoření' },
  { value: 'zabava', label: 'Zábava' },
  { value: 'ostatni', label: 'Ostatní' },
];

const KATEGORIE_PRIJEM = [
  { value: 'vse-prijem', label: 'Všechny kategorie' },
  { value: 'prace', label: 'Práce' },
  { value: 'brigada', label: 'Brigáda' },
  { value: 'prodej', label: 'Prodej' },
  { value: 'prispevky', label: 'Příspěvky' },
  { value: 'ostatni', label: 'Ostatní' },
];

export const FilterBarVydaj = () => {
  const filtrVydaj = useAppStore((s) => s.filtrVydaj);
  const setFiltrVydaj = useAppStore((s) => s.setFiltrVydaj);

  return (
    <div className="card flex flex-col md:flex-row gap-4">
      <div className="flex-1">
        <label className="text-sm font-medium text-light-textMuted dark:text-dark-textMuted mb-2 block">Kategorie</label>
        <select
          className="select-field"
          value={filtrVydaj.kategorie}
          onChange={(e) => setFiltrVydaj({ kategorie: e.target.value })}
        >
          {KATEGORIE_VYDAJ.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex-1">
        <label className="text-sm font-medium text-light-textMuted dark:text-dark-textMuted mb-2 block">Měsíc</label>
        <select
          className="select-field"
          value={filtrVydaj.mesic}
          onChange={(e) => setFiltrVydaj({ mesic: e.target.value })}
        >
          {MESICE.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export const FilterBarPrijem = () => {
  const filtryPrijem = useAppStore((s) => s.filtryPrijem);
  const setFiltrPrijem = useAppStore((s) => s.setFiltrPrijem);

  return (
    <div className="card flex flex-col md:flex-row gap-4">
      <div className="flex-1">
        <label className="text-sm font-medium text-light-textMuted dark:text-dark-textMuted mb-2 block">Kategorie</label>
        <select
          className="select-field"
          value={filtryPrijem.kategorie}
          onChange={(e) => setFiltrPrijem({ kategorie: e.target.value })}
        >
          {KATEGORIE_PRIJEM.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex-1">
        <label className="text-sm font-medium text-light-textMuted dark:text-dark-textMuted mb-2 block">Měsíc</label>
        <select
          className="select-field"
          value={filtryPrijem.mesic}
          onChange={(e) => setFiltrPrijem({ mesic: e.target.value })}
        >
          {MESICE.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
