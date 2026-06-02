import { create } from 'zustand';
import {
  collection, doc, increment, writeBatch, serverTimestamp, getDocs,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import toast from 'react-hot-toast';

const getUid = () => auth.currentUser?.uid;

const firestoreWrite = async (fn) => {
  try {
    await fn();
  } catch (err) {
    console.error('Firestore write error:', err);
    toast.error('Chyba při ukládání dat');
    throw err;
  }
};

export const useAppStore = create((set) => ({
  prijmy: [],
  vydaje: [],
  filtryPrijem: { kategorie: 'vse-prijem', mesic: 'vse-mesic' },
  filtrVydaj:   { kategorie: 'vse',        mesic: 'vse-mesic' },

  vydajeReady: false,
  prijmyReady: false,

  setVydaje:  (items) => set({ vydaje: items, vydajeReady: true }),
  setPrijmy:  (items) => set({ prijmy: items, prijmyReady: true }),
  resetStore: ()      => set({ prijmy: [], vydaje: [], vydajeReady: false, prijmyReady: false }),

  // Batch write — add + counter update + AI telemetry jsou atomické
  addVydaj: (data) =>
    firestoreWrite(async () => {
      const uid = getUid();
      if (!uid) return;
      const batch = writeBatch(db);
      const newRef = doc(collection(db, 'users', uid, 'vydaje'));
      batch.set(newRef, { ...data, createdAt: serverTimestamp() });
      batch.update(doc(db, 'users', uid), { vydajeCount: increment(1) });
      // AI Telemetry - pro učení
      const transactionRef = doc(collection(db, 'aiTelemetry', uid, 'transactions'));
      batch.set(transactionRef, {
        type: 'vydaj',
        castka: Number(data.castka || 0),
        nazev: (data.nazev || '').substring(0, 100),
        kategorie: data.kategorie,
        datum: data.datum,
        dayOfWeek: new Date(data.datum).getDay(),
        hourOfDay: new Date().getHours(),
        createdAt: serverTimestamp(),
      });
      await batch.commit();
    }),

  removeVydaj: (id) =>
    firestoreWrite(async () => {
      const uid = getUid();
      if (!uid) return;
      const batch = writeBatch(db);
      batch.delete(doc(db, 'users', uid, 'vydaje', id));
      batch.update(doc(db, 'users', uid), { vydajeCount: increment(-1) });
      await batch.commit();
    }),

  addPrijem: (data) =>
    firestoreWrite(async () => {
      const uid = getUid();
      if (!uid) return;
      const batch = writeBatch(db);
      const newRef = doc(collection(db, 'users', uid, 'prijmy'));
      batch.set(newRef, { ...data, createdAt: serverTimestamp() });
      batch.update(doc(db, 'users', uid), { prijmyCount: increment(1) });
      // AI Telemetry - pro učení
      const transactionRef = doc(collection(db, 'aiTelemetry', uid, 'transactions'));
      batch.set(transactionRef, {
        type: 'prijem',
        castka: Number(data.castka || 0),
        nazev: (data.nazev || '').substring(0, 100),
        kategorie: data.kategorie,
        datum: data.datum,
        dayOfWeek: new Date(data.datum).getDay(),
        hourOfDay: new Date().getHours(),
        createdAt: serverTimestamp(),
      });
      await batch.commit();
    }),

  removePrijem: (id) =>
    firestoreWrite(async () => {
      const uid = getUid();
      if (!uid) return;
      const batch = writeBatch(db);
      batch.delete(doc(db, 'users', uid, 'prijmy', id));
      batch.update(doc(db, 'users', uid), { prijmyCount: increment(-1) });
      await batch.commit();
    }),

  clearVydaje: () =>
    firestoreWrite(async () => {
      const uid = getUid();
      if (!uid) return;
      const snap = await getDocs(collection(db, 'users', uid, 'vydaje'));
      if (snap.empty) return;
      const batch = writeBatch(db);
      snap.docs.forEach((d) => batch.delete(d.ref));
      batch.update(doc(db, 'users', uid), { vydajeCount: 0 });
      await batch.commit();
    }),

  clearPrijmy: () =>
    firestoreWrite(async () => {
      const uid = getUid();
      if (!uid) return;
      const snap = await getDocs(collection(db, 'users', uid, 'prijmy'));
      if (snap.empty) return;
      const batch = writeBatch(db);
      snap.docs.forEach((d) => batch.delete(d.ref));
      batch.update(doc(db, 'users', uid), { prijmyCount: 0 });
      await batch.commit();
    }),

  setFiltrPrijem: (filtry) =>
    set((state) => ({ filtryPrijem: { ...state.filtryPrijem, ...filtry } })),

  setFiltrVydaj: (filtry) =>
    set((state) => ({ filtrVydaj: { ...state.filtrVydaj, ...filtry } })),
}));

// Activity tracker - comprehensive user activity tracking
let activityTimeout;
let tabVisibleTimeout;
let lastSessionStart;
let lastTabVisibility = document.hidden;

export const initActivityTracker = () => {
  const uid = auth.currentUser?.uid;
  if (!uid) return;

  // Update activity timestamp in Firestore
  const updateActivity = async () => {
    try {
      if (!auth.currentUser?.uid) return;
      const { updateDoc } = await import('firebase/firestore');
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        lastActivity: serverTimestamp(),
      });
    } catch (err) {
      // Fail silently
    }
  };

  // Record user interaction (click, keypress, scroll)
  const onUserInteraction = () => {
    clearTimeout(activityTimeout);
    activityTimeout = setTimeout(updateActivity, 5000);
  };

  // Handle tab visibility changes
  const onVisibilityChange = async () => {
    try {
      const currentUid = auth.currentUser?.uid;
      if (!currentUid) return;

      const isNowVisible = !document.hidden;
      const { updateDoc, serverTimestamp } = await import('firebase/firestore');

      if (isNowVisible && !lastTabVisibility) {
        // Tab became visible - user likely returned
        lastSessionStart = new Date();
        await updateDoc(doc(db, 'users', currentUid), {
          lastActivity: serverTimestamp(),
          lastSessionStart: serverTimestamp(),
          isOnline: true,
        });
      } else if (!isNowVisible && lastTabVisibility) {
        // Tab became hidden - user is away but not logged out
        await updateDoc(doc(db, 'users', currentUid), {
          lastTabHidden: serverTimestamp(),
          isOnline: false,
        });
      }

      lastTabVisibility = isNowVisible;
    } catch (err) {
      // Fail silently
    }
  };

  // Track page/tab changes
  const onPageChange = async () => {
    try {
      const currentUid = auth.currentUser?.uid;
      if (!currentUid) return;

      const { updateDoc, serverTimestamp } = await import('firebase/firestore');
      const currentPage = window.location.pathname.split('/').pop() || 'dashboard';

      await updateDoc(doc(db, 'users', currentUid), {
        lastPageView: currentPage,
        lastPageViewTime: serverTimestamp(),
      });
    } catch (err) {
      // Fail silently
    }
  };

  // Track: user interactions
  document.addEventListener('click', onUserInteraction, { passive: true });
  document.addEventListener('keydown', onUserInteraction, { passive: true });
  document.addEventListener('scroll', onUserInteraction, { passive: true });

  // Track: tab visibility (important for "always open" users)
  document.addEventListener('visibilitychange', onVisibilityChange, { passive: true });

  // Track: page navigation
  window.addEventListener('popstate', onPageChange, { passive: true });

  // Set initial session start
  (async () => {
    try {
      const currentUid = auth.currentUser?.uid;
      if (!currentUid) return;
      const { updateDoc, serverTimestamp } = await import('firebase/firestore');
      lastSessionStart = new Date();
      await updateDoc(doc(db, 'users', currentUid), {
        lastActivity: serverTimestamp(),
        lastSessionStart: serverTimestamp(),
        isOnline: true,
      });
    } catch (err) {
      // Fail silently
    }
  })();

  // Cleanup on unload
  window.addEventListener('beforeunload', () => {
    document.removeEventListener('click', onUserInteraction);
    document.removeEventListener('keydown', onUserInteraction);
    document.removeEventListener('scroll', onUserInteraction);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('popstate', onPageChange);
  });
};
