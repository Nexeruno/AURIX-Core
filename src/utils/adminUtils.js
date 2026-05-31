import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Fetch all users with parsed timestamps
 * Used by AdminPage and DevOpsPanel
 */
export const fetchAllUsers = async () => {
  const snap = await getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => ({
    uid: d.id,
    ...d.data(),
    createdAt: d.data().createdAt?.toDate?.()?.toISOString?.() || null,
    lastLogin: d.data().lastLogin?.toDate?.()?.toISOString?.() || null,
  }));
};
