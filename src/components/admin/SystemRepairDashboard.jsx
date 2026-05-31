import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { useAuth } from '../../context/AuthContext';
import { Wrench, TrendingDown, CheckCircle, AlertCircle, BarChart3, Clock, Activity } from 'lucide-react';
import toast from 'react-hot-toast';

export const SystemRepairDashboard = ({ onClose }) => {
  const { session } = useAuth();
  const [repairs, setRepairs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedRepair, setSelectedRepair] = useState(null);

  useEffect(() => {
    const fetchRepairs = async () => {
      try {
        const snap = await getDocs(
          query(collection(db, 'systemRepairs'), orderBy('timestamp', 'desc'), limit(50))
        );

        const repairData = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          timestamp: d.data().timestamp?.toDate?.()?.toISOString?.() || null,
        }));

        setRepairs(repairData);

        // Spočítej statistiky
        const last24h = new Date(Date.now() - 86400000);
        const repairs24h = repairData.filter(
          (r) => new Date(r.timestamp) > last24h
        );

        const totalRepaired = repairs24h.reduce((sum, r) => sum + (r.totalRepairs || 0), 0);
        const byType = {};
        const byStatus = { SUCCESS: 0, PARTIAL_SUCCESS: 0, FAILED: 0 };

        repairs24h.forEach((r) => {
          byStatus[r.status || 'UNKNOWN'] = (byStatus[r.status || 'UNKNOWN'] || 0) + 1;
          r.repairs?.forEach((repair) => {
            byType[repair.type] = (byType[repair.type] || 0) + (repair.count || 0);
          });
        });

        setStats({
          totalRepairs24h: totalRepaired,
          successRate: repairs24h.length > 0
            ? ((byStatus.SUCCESS / repairs24h.length) * 100).toFixed(1)
            : 0,
          runCount: repairs24h.length,
          avgDuration: repairs24h.length > 0
            ? (repairs24h.reduce((sum, r) => sum + (r.duration || 0), 0) / repairs24h.length).toFixed(0)
            : 0,
          byType,
          byStatus,
        });
      } catch (err) {
        console.error('Chyba při načítání repair dat:', err);
        toast.error('Chyba při načítání repair statistik');
      } finally {
        setLoading(false);
      }
    };

    if (session?.isAdmin) {
      fetchRepairs();
    }
  }, [session?.isAdmin]);

  if (!session?.isAdmin) {
    return (
      <div className="card text-center py-12 text-light-textMuted dark:text-dark-textMuted">
        Nemáš oprávnění k zobrazení repair dashboardu.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wrench size={24} className="text-blue-500" />
          <h1 className="text-2xl font-bold">System Repair Dashboard</h1>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-light-border dark:bg-dark-border hover:bg-light-card dark:hover:bg-dark-card transition"
          >
            ← Zpět
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-light-textMuted dark:text-dark-textMuted">
          Načítám repair data...
        </div>
      ) : (
        <>
          {/* Stats Grid (24h) */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="card border-l-4 border-green-500">
                <p className="text-sm text-light-textMuted dark:text-dark-textMuted">Repairů (24h)</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">{stats.totalRepairs24h}</p>
              </div>
              <div className="card border-l-4 border-blue-500">
                <p className="text-sm text-light-textMuted dark:text-dark-textMuted">Success Rate</p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-1">{stats.successRate}%</p>
              </div>
              <div className="card border-l-4 border-purple-500">
                <p className="text-sm text-light-textMuted dark:text-dark-textMuted">Repair Runs</p>
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-1">{stats.runCount}</p>
              </div>
              <div className="card border-l-4 border-orange-500">
                <p className="text-sm text-light-textMuted dark:text-dark-textMuted">Avg Duration</p>
                <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-1">{stats.avgDuration}ms</p>
              </div>
            </div>
          )}

          {/* Repair Types Breakdown */}
          {stats && Object.keys(stats.byType).length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <BarChart3 size={20} /> Typy Repairů (24h)
              </h3>
              <div className="space-y-2">
                {Object.entries(stats.byType)
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between p-3 rounded-lg bg-light-border dark:bg-dark-border">
                      <span className="font-medium">{type}</span>
                      <span className="text-sm px-3 py-1 rounded-full bg-light-bg dark:bg-dark-bg">
                        {count}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Repair History Timeline */}
          <div className="card">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Activity size={20} /> Historie Repairů (poslední 50)
            </h3>

            {repairs.length === 0 ? (
              <div className="text-center py-8 text-light-textMuted dark:text-dark-textMuted">
                Zatím žádné opravy
              </div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {repairs.map((repair) => (
                  <div
                    key={repair.id}
                    className={`p-4 rounded-lg border-l-4 cursor-pointer hover:opacity-80 transition ${
                      repair.status === 'SUCCESS'
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-500'
                        : repair.status === 'PARTIAL_SUCCESS'
                        ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500'
                        : 'bg-red-50 dark:bg-red-900/20 border-red-500'
                    }`}
                    onClick={() => setSelectedRepair(selectedRepair?.id === repair.id ? null : repair)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {repair.status === 'SUCCESS' ? (
                          <CheckCircle size={16} className="text-green-600 dark:text-green-400" />
                        ) : repair.status === 'PARTIAL_SUCCESS' ? (
                          <AlertCircle size={16} className="text-yellow-600 dark:text-yellow-400" />
                        ) : (
                          <AlertCircle size={16} className="text-red-600 dark:text-red-400" />
                        )}
                        <span className="font-semibold text-sm">
                          {repair.status === 'SUCCESS' ? '✓ Úspěšný' : repair.status === 'PARTIAL_SUCCESS' ? '⚠️ Částečný' : '✗ Selhání'}
                        </span>
                      </div>
                      <span className="text-xs text-light-textMuted dark:text-dark-textMuted">
                        {repair.timestamp ? new Date(repair.timestamp).toLocaleString('cs-CZ') : 'N/A'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm">
                        {repair.totalRepairs} {repair.totalRepairs === 1 ? 'oprava' : 'opravy'}
                      </span>
                      <span className="text-xs text-light-textMuted dark:text-dark-textMuted flex items-center gap-1">
                        <Clock size={12} /> {repair.duration || 0}ms
                      </span>
                    </div>

                    {/* Details (klik pro rozšíření) */}
                    {selectedRepair?.id === repair.id && (
                      <div className="mt-3 pt-3 border-t border-current border-opacity-20 space-y-2">
                        {repair.repairs && repair.repairs.length > 0 ? (
                          repair.repairs.map((action, idx) => (
                            <div key={idx} className="text-sm p-2 rounded bg-white/50 dark:bg-black/20">
                              <div className="font-medium">{action.type}</div>
                              <div className="text-xs text-light-textMuted dark:text-dark-textMuted">
                                {action.message}
                                {action.count && ` (${action.count})`}
                              </div>
                            </div>
                          ))
                        ) : repair.error ? (
                          <div className="text-sm p-2 rounded bg-red-100/50 dark:bg-red-900/30">
                            <div className="font-medium text-red-700 dark:text-red-300">Chyba</div>
                            <div className="text-xs text-red-600 dark:text-red-400">{repair.error}</div>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="card bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Wrench size={16} /> Jak funguje Auto-Repair?
            </h4>
            <ul className="text-sm space-y-1 text-light-text dark:text-dark-text">
              <li>• Spouští se každou hodinu v XX:15 (15 minut po health checku)</li>
              <li>• Archivuje pending transakce starší než 24 hodin</li>
              <li>• Regeneruje nebo deaktivuje stále recurring (>48h bez generace)</li>
              <li>• Odstraňuje duplikáty a nevalidní dokumenty</li>
              <li>• Loguje všechny akce do systemRepairs kolekce</li>
              <li>• Tichý běh — bez emailů pokud vše je OK</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
};
