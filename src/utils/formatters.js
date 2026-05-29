export const formatDatum = (dateString) => {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-');
  return `${day}.${month}.${year}`;
};

export const formatCastka = (amount) => {
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    minimumFractionDigits: 0,
  }).format(amount);
};

export const getMesicZDatumu = (dateString) => {
  if (!dateString) return '';
  const [, month] = dateString.split('-');
  return month;
};

export const getMesicNazev = (mesic) => {
  const mesice = {
    '01': 'Leden',
    '02': 'Únor',
    '03': 'Březen',
    '04': 'Duben',
    '05': 'Květen',
    '06': 'Červen',
    '07': 'Červenec',
    '08': 'Srpen',
    '09': 'Září',
    '10': 'Říjen',
    '11': 'Listopad',
    '12': 'Prosinec',
  };
  return mesice[mesic] || '';
};

export const calculateTotal = (items) => {
  return items.reduce((sum, item) => sum + Number(item.castka || 0), 0);
};

export const filterItems = (items, kategorie, mesic) => {
  return items.filter((item) => {
    const kategorieMatch = kategorie === 'vse' || kategorie === 'vse-prijem' || kategorie === 'vse-mesic' || item.kategorie === kategorie;
    const mesicMatch = mesic === 'vse-mesic' || getMesicZDatumu(item.datum) === mesic;
    return kategorieMatch && mesicMatch;
  });
};

export const getCategoryColor = (category) => {
  const colors = {
    doprava: 'bg-blue-100 dark:bg-blue-900',
    jidlo: 'bg-orange-100 dark:bg-orange-900',
    bydleni: 'bg-green-100 dark:bg-green-900',
    sporeni: 'bg-purple-100 dark:bg-purple-900',
    zabava: 'bg-pink-100 dark:bg-pink-900',
    ostatni: 'bg-slate-100 dark:bg-slate-700',
    prace: 'bg-green-100 dark:bg-green-900',
    brigada: 'bg-yellow-100 dark:bg-yellow-900',
    prodej: 'bg-blue-100 dark:bg-blue-900',
    prispevky: 'bg-purple-100 dark:bg-purple-900',
  };
  return colors[category] || 'bg-slate-100 dark:bg-slate-700';
};
