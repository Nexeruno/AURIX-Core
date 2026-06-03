import { useState, useEffect } from 'react';
import { auth, db } from '../../utils/firebase';
import { collection, query, orderBy, limit, getDocs, doc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { UserFilterDropdown } from '../UserFilterDropdown';

export const MLPredictionPanel = () => {
  const [predictions, setPredictions] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mlRuns, setMlRuns] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [expandedPred, setExpandedPred] = useState(null);
  const [showLevel2, setShowLevel2] = useState(false);

  const checkAdmin = async () => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      const userDoc = await getDocs(
        query(collection(db, 'users'), limit(1))
      );
      const userData = userDoc.docs.find(d => d.id === uid)?.data();
      setIsAdmin(userData?.role === 'admin');
    } catch (err) {
      console.error('Admin check error:', err);
    }
  };

  const toggleHidden = async (predictionId, uid, currentHidden) => {
    try {
      const predRef = doc(db, `users/${uid}/mlPredictions/${predictionId}`);
      await updateDoc(predRef, { hidden: !currentHidden });

      setPredictions(prev =>
        prev.map(p =>
          p.id === predictionId && p.uid === uid
            ? { ...p, hidden: !currentHidden }
            : p
        )
      );

      toast.success(currentHidden ? '✅ Predikce obnovena' : '👁️ Predikce skryta');
    } catch (err) {
      console.error('Error toggling hidden:', err);
      toast.error('Chyba při skrývání');
    }
  };

  const loadPredictions = async () => {
    try {
      setLoading(true);
      const uid = auth.currentUser?.uid;
      if (!uid) {
        toast.error('Není přihlášen uživatel');
        return;
      }

      let allPredictions = [];
      let users = [];

      if (isAdmin) {
        // Admin vidí všechny predikce všech uživatelů + uživatele bez predikcí
        const usersSnap = await getDocs(collection(db, 'users'));
        users = usersSnap.docs.map(doc => ({
          uid: doc.id,
          username: doc.data().username || doc.id,
          lastActivity: doc.data().lastLogin || doc.data().createdAt,
        })).sort((a, b) => (a.username || '').localeCompare(b.username || ''));

        setAllUsers(users);
        if (users.length > 0 && !selectedUserId) {
          setSelectedUserId(users[0].uid);
        }

        for (const user of users) {
          const preds = await getDocs(
            query(
              collection(db, `users/${user.uid}/mlPredictions`),
              orderBy('createdAt', 'desc'),
              limit(20)
            )
          );

          if (preds.empty) {
            // Uživatel bez predikcí - přidej placeholder
            allPredictions.push({
              id: `${user.uid}-no-predictions`,
              uid: user.uid,
              username: user.username,
              month: '-',
              totalPredictedExpense: 0,
              status: 'no-predictions',
              createdAt: null,
              message: '⏳ Čeká na první běh pipeline (každé 3 dny)',
            });
          } else {
            // Přidej všechny predikce
            allPredictions.push(
              ...preds.docs.map(doc => ({
                id: doc.id,
                uid: user.uid,
                username: user.username,
                status: 'active',
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate?.(),
              }))
            );
          }
        }
        allPredictions.sort((a, b) => {
          // Aktivní uživatelé první, pak podle data
          if (a.status === 'active' && b.status !== 'active') return -1;
          if (a.status !== 'active' && b.status === 'active') return 1;
          return (b.createdAt || 0) - (a.createdAt || 0);
        });
      } else {
        // Běžný uživatel vidí jen svoje
        setAllUsers([{ uid, username: auth.currentUser?.displayName || 'Já' }]);
        setSelectedUserId(uid);

        const preds = await getDocs(
          query(
            collection(db, `users/${uid}/mlPredictions`),
            orderBy('createdAt', 'desc'),
            limit(12)
          )
        );
        allPredictions = preds.docs.map(doc => ({
          id: doc.id,
          uid,
          username: auth.currentUser?.displayName || 'Já',
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.(),
        }));
      }

      setPredictions(allPredictions);

      // Load ML runs (if admin)
      if (isAdmin) {
        const runs = await getDocs(
          query(
            collection(db, 'mlRuns'),
            orderBy('startedAt', 'desc'),
            limit(5)
          )
        );
        setMlRuns(runs.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          startedAt: doc.data().startedAt?.toDate?.(),
          finishedAt: doc.data().finishedAt?.toDate?.(),
        })));
      }
    } catch (err) {
      console.error('Load predictions error:', err);
      toast.error('Chyba při načítání predikací');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAdmin();
  }, []);

  useEffect(() => {
    loadPredictions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="card">
          <p className="text-center text-light-textMuted dark:text-dark-textMuted">
            ⏳ Načítám predikace...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* User Predictions */}
      <div className="card">
        <div className="mb-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold">🤖 Předpovědi výdajů</h3>
            {isAdmin && (
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showHidden}
                    onChange={(e) => setShowHidden(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-light-textMuted dark:text-dark-textMuted">
                    Zobrazit skryté
                  </span>
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer bg-purple-100 dark:bg-purple-900/30 px-3 py-1 rounded">
                  <input
                    type="checkbox"
                    checked={showLevel2}
                    onChange={(e) => setShowLevel2(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-purple-700 dark:text-purple-300 font-medium">
                    Level 2 (Shadow)
                  </span>
                </label>
              </div>
            )}
          </div>

          {/* User Filter Dropdown */}
          {allUsers.length > 1 && (
            <UserFilterDropdown
              users={allUsers}
              selectedUid={selectedUserId}
              onSelect={setSelectedUserId}
              getStatusBadge={(user) => {
                const userPreds = predictions.filter(p => p.uid === user.uid);
                const activePreds = userPreds.filter(p => p.status === 'active');
                return `${activePreds.length} predikci`;
              }}
              placeholder="Vybrat uživatele..."
            />
          )}
        </div>

        {predictions.length === 0 ? (
          <div className="p-4 bg-light-bg dark:bg-dark-card rounded-lg text-center">
            <p className="text-light-textMuted dark:text-dark-textMuted">
              Zatím žádné předpovědi. Pipeline se spouští každé 3 dny.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg">
                  <th className="text-left py-2 px-3 font-semibold">Měsíc</th>
                  <th className="text-right py-2 px-3 font-semibold">Výdaje</th>
                  <th className="text-right py-2 px-3 font-semibold">Průměr 3m</th>
                  <th className="text-center py-2 px-3 font-semibold">Jistota</th>
                  <th className="text-center py-2 px-3 font-semibold">Akce</th>
                </tr>
              </thead>
              <tbody>
                {predictions
                  .filter(pred => pred.uid === selectedUserId)
                  .filter(pred => showHidden || !pred.hidden)
                  .filter(pred => {
                    const level = pred.pipelineLevel || 1;
                    return showLevel2 ? level === 2 : level === 1;
                  })
                  .map(pred => {
                    const isExpanded = expandedPred === `${pred.uid}-${pred.id}`;
                    const predKey = `${pred.uid}-${pred.id}`;

                    // Placeholder pro uživatele bez predikcí
                    if (pred.status === 'no-predictions') {
                      return (
                        <tr key={pred.id} className="border-b border-light-border dark:border-dark-border">
                          <td colSpan="5" className="py-2 px-3">
                            <div className="flex items-center gap-3 text-light-textMuted dark:text-dark-textMuted">
                              <span className="text-lg">⏳</span>
                              <div>
                                <p className="text-sm font-medium">Zatím žádná predikce</p>
                                <p className="text-xs">{pred.message}</p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    // Normální predikce
                    const confColor = pred.confidence === 'high' ? 'bg-green-100 dark:bg-green-900' :
                                     pred.confidence === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900' :
                                     'bg-red-100 dark:bg-red-900';
                    const confTextColor = pred.confidence === 'high' ? 'text-green-800 dark:text-green-200' :
                                         pred.confidence === 'medium' ? 'text-yellow-800 dark:text-yellow-200' :
                                         'text-red-800 dark:text-red-200';
                    const confIcon = pred.confidence === 'high' ? '✅' :
                                    pred.confidence === 'medium' ? '⚠️' : '❌';

                    return (
                      <tbody key={predKey}>
                        <tr
                          className={`border-b border-light-border dark:border-dark-border hover:bg-light-bg dark:hover:bg-dark-bg transition-colors ${
                            pred.hidden ? 'opacity-60' : ''
                          }`}
                        >
                          <td className="py-2 px-3 font-medium">
                            {new Date(pred.month + '-01').toLocaleDateString('cs-CZ', {
                              month: 'short',
                              year: 'numeric',
                            })}
                            {pred.hidden && <span className="ml-2 text-xs bg-gray-500 text-white px-2 py-0.5 rounded">SKRYTO</span>}
                            {pred.shadowMode && <span className="ml-2 text-xs bg-orange-500 text-white px-2 py-0.5 rounded">🔄 SHADOW MODE</span>}
                          </td>
                          <td className="py-2 px-3 text-right font-semibold text-red-600 dark:text-red-400">
                            {pred.totalPredictedExpense.toLocaleString('cs-CZ')} Kč
                          </td>
                          <td className="py-2 px-3 text-right text-light-textMuted dark:text-dark-textMuted">
                            {pred.features?.avg3m?.toLocaleString('cs-CZ')} Kč
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${confColor} ${confTextColor}`}>
                              {confIcon} {pred.confidenceScore || '?'}%
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => setExpandedPred(isExpanded ? null : predKey)}
                                className="px-2 py-1 hover:bg-light-border dark:hover:bg-dark-border rounded transition-colors text-lg"
                                title={isExpanded ? 'Zavřít' : 'Detaily'}
                              >
                                {isExpanded ? '▼' : '▶'}
                              </button>
                              <button
                                onClick={() => toggleHidden(pred.id, pred.uid, pred.hidden)}
                                className="px-2 py-1 hover:bg-light-border dark:hover:bg-dark-border rounded transition-colors text-lg"
                                title={pred.hidden ? 'Obnovit' : 'Skrýt'}
                              >
                                {pred.hidden ? '👁️' : '🗑️'}
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Expandable details */}
                        {isExpanded && (
                          <tr className="bg-light-bg dark:bg-dark-bg border-b border-light-border dark:border-dark-border">
                            <td colSpan="5" className="py-3 px-3">
                              <div className="space-y-3">
                                {/* Confidence reason */}
                                {pred.confidenceReason && (
                                  <div className={`p-2 rounded text-xs ${confColor}`}>
                                    <p className={confTextColor}>{pred.confidenceReason}</p>
                                  </div>
                                )}

                                {/* Categories */}
                                {Object.keys(pred.categories || {}).length > 0 && (
                                  <div>
                                    <p className="text-xs font-semibold text-light-textMuted dark:text-dark-textMuted mb-1">Po kategoriích:</p>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                      {Object.entries(pred.categories)
                                        .sort(([, a], [, b]) => b - a)
                                        .map(([cat, amount]) => (
                                          <div key={cat} className="p-2 bg-light-card dark:bg-dark-card rounded text-xs">
                                            <p className="capitalize font-medium">{cat}</p>
                                            <p className="font-semibold text-red-600 dark:text-red-400">{amount.toLocaleString('cs-CZ')}</p>
                                          </div>
                                        ))}
                                    </div>
                                  </div>
                                )}

                                {/* Income summary */}
                                {pred.incomeStats && Object.keys(pred.incomeStats).length > 0 && (
                                  <div className="p-2 bg-green-50 dark:bg-green-950 rounded">
                                    <p className="text-xs font-semibold text-green-900 dark:text-green-200 mb-1">💰 Příjmy</p>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                      <div>
                                        <p className="text-green-700 dark:text-green-300">Průměr 3m</p>
                                        <p className="font-bold text-green-900 dark:text-green-100">{pred.incomeStats.avg3m?.toLocaleString('cs-CZ')}</p>
                                      </div>
                                      <div>
                                        <p className="text-green-700 dark:text-green-300">Průměr 6m</p>
                                        <p className="font-bold text-green-900 dark:text-green-100">{pred.incomeStats.avg6m?.toLocaleString('cs-CZ')}</p>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                <p className="text-xs text-light-textMuted dark:text-dark-textMuted">
                                  Model: {pred.modelType} v{pred.modelVersion} • Vytvořeno: {pred.createdAt?.toLocaleDateString('cs-CZ')}
                                </p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ML Runs (Admin Only) */}
      {isAdmin && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">🔧 Pipeline běhy</h3>

          {mlRuns.length === 0 ? (
            <div className="p-4 bg-light-bg dark:bg-dark-card rounded-lg text-center">
              <p className="text-light-textMuted dark:text-dark-textMuted">
                Zatím žádné běhy
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {mlRuns.map(run => (
                <div
                  key={run.id}
                  className={`p-3 bg-light-bg dark:bg-dark-card rounded-lg border-l-4 ${
                    run.status === 'success'
                      ? 'border-green-500'
                      : 'border-red-500'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-sm">
                        {run.status === 'success' ? '✅' : '❌'} {run.status}
                      </p>
                      <p className="text-xs text-light-textMuted dark:text-dark-textMuted">
                        {run.startedAt?.toLocaleString('cs-CZ')}
                      </p>
                    </div>
                    <span className="text-xs font-mono bg-light-border dark:bg-dark-border px-2 py-1 rounded">
                      {run.durationMs}ms
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                    <div>
                      <p className="text-light-textMuted dark:text-dark-textMuted">
                        Uživatelů zpracováno
                      </p>
                      <p className="font-semibold">{run.usersProcessed}</p>
                    </div>
                    <div>
                      <p className="text-light-textMuted dark:text-dark-textMuted">
                        Predikací vytvořeno
                      </p>
                      <p className="font-semibold">{run.predictionsCreated}</p>
                    </div>
                  </div>

                  {run.errorMessage && (
                    <div className="p-2 bg-red-100 dark:bg-red-900 rounded text-xs text-red-800 dark:text-red-200">
                      <p className="font-semibold">Chyba:</p>
                      <p className="font-mono">{run.errorMessage}</p>
                      {run.errorCode && (
                        <p className="text-xs">({run.errorCode})</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Info Sections */}
      <div className="space-y-4">
        {/* Level 1 Info */}
        <div className="card border-l-4 border-purple-500 bg-purple-50 dark:bg-purple-950">
          <h4 className="font-semibold text-purple-900 dark:text-purple-200 mb-2">
            🤖 O ML Pipeline (Level 1)
          </h4>
          <ul className="text-sm text-purple-800 dark:text-purple-300 space-y-1">
            <li>• Běží každé 3 dny automaticky</li>
            <li>• Používá 3-měsíční a 6-měsíční průměry</li>
            <li>• Predikuje výdaje na příští měsíc</li>
            <li>• Jistota závisí na konzistenci vašich výdajů</li>
            <li>• Model: baseline average (bez ML algoritmů)</li>
          </ul>
        </div>

        {/* Level 2 Shadow Mode Info */}
        <div className="card border-l-4 border-orange-500 bg-orange-50 dark:bg-orange-950">
          <div className="flex items-start gap-3 mb-2">
            <span className="text-2xl">🔄</span>
            <div>
              <h4 className="font-semibold text-orange-900 dark:text-orange-200">
                Level 2 ML Pipeline (Shadow Mode)
              </h4>
              <p className="text-xs text-orange-700 dark:text-orange-300 mt-0.5">
                Experimentální – běží v pozadí bez vlivu na produkční predikce
              </p>
            </div>
          </div>
          <ul className="text-sm text-orange-800 dark:text-orange-300 space-y-1 ml-8">
            <li>• RandomForestRegressor trénovaný na vašich datech</li>
            <li>• Feature engineering: trendy, kategorie, sezónnost</li>
            <li>• Porovnání s Level 1 – měří přesnost</li>
            <li>• Fallback na baseline, když málo dat</li>
            <li>• Zatím nenahrazuje Level 1 v UI (shadow mode)</li>
            <li>• Aktivace až po ověření kvality</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
