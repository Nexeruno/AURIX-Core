import { useAppStore } from '../utils/store';
import { formatCastka } from '../utils/formatters';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export const Dashboard = () => {
  const vydaje = useAppStore((s) => s.vydaje);
  const prijmy = useAppStore((s) => s.prijmy);

  const totalVydaje = vydaje.reduce((sum, item) => sum + Number(item.castka || 0), 0);
  const totalPrijmy = prijmy.reduce((sum, item) => sum + Number(item.castka || 0), 0);
  const zustatek = totalPrijmy - totalVydaje;

  // Data pro pie chart - kategorie výdajů
  const categoryData = {};
  vydaje.forEach((item) => {
    const cat = item.kategorie;
    categoryData[cat] = (categoryData[cat] || 0) + Number(item.castka || 0);
  });

  const pieData = Object.entries(categoryData).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value: Math.round(value),
  }));

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  // Data pro bar chart - měsíční srovnání
  const monthlyData = {};
  [...vydaje, ...prijmy].forEach((item) => {
    if (item.datum) {
      const [year, month] = item.datum.split('-');
      const key = `${month}/${year}`;
      if (!monthlyData[key]) {
        monthlyData[key] = { month: key, vydaje: 0, prijmy: 0 };
      }
      if (vydaje.includes(item)) {
        monthlyData[key].vydaje += Number(item.castka || 0);
      } else {
        monthlyData[key].prijmy += Number(item.castka || 0);
      }
    }
  });

  const barData = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card border-l-4 border-green-500">
          <p className="text-sm font-medium text-light-textMuted dark:text-dark-textMuted">Příjmy</p>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">{formatCastka(totalPrijmy)}</p>
        </div>
        <div className="card border-l-4 border-red-500">
          <p className="text-sm font-medium text-light-textMuted dark:text-dark-textMuted">Výdaje</p>
          <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">{formatCastka(totalVydaje)}</p>
        </div>
        <div className={`card border-l-4 ${zustatek >= 0 ? 'border-blue-500' : 'border-red-500'}`}>
          <p className="text-sm font-medium text-light-textMuted dark:text-dark-textMuted">Zůstatek</p>
          <p className={`text-3xl font-bold mt-2 ${zustatek >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
            {formatCastka(zustatek)}
          </p>
        </div>
      </div>

      {/* Charts */}
      {pieData.length > 0 && (
        <div className="card">
          <h3 className="text-xl font-semibold mb-4">Výdaje podle kategorií</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value} Kč`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${value} Kč`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {barData.length > 0 && (
        <div className="card">
          <h3 className="text-xl font-semibold mb-4">Příjmy vs Výdaje</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => `${value} Kč`} />
              <Legend />
              <Bar dataKey="prijmy" fill="#10B981" name="Příjmy" />
              <Bar dataKey="vydaje" fill="#EF4444" name="Výdaje" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card">
          <p className="text-sm font-medium text-light-textMuted dark:text-dark-textMuted">Průměrný výdaj</p>
          <p className="text-2xl font-bold mt-2">{formatCastka(vydaje.length > 0 ? totalVydaje / vydaje.length : 0)}</p>
          <p className="text-xs text-light-textMuted dark:text-dark-textMuted mt-1">z {vydaje.length} položek</p>
        </div>
        <div className="card">
          <p className="text-sm font-medium text-light-textMuted dark:text-dark-textMuted">Průměrný příjem</p>
          <p className="text-2xl font-bold mt-2">{formatCastka(prijmy.length > 0 ? totalPrijmy / prijmy.length : 0)}</p>
          <p className="text-xs text-light-textMuted dark:text-dark-textMuted mt-1">z {prijmy.length} položek</p>
        </div>
      </div>
    </div>
  );
};
