# 🔐 Role-Based Access Control (RBAC)

Projekt má implementovanou RBAC aby normální uživatelé neměli přístup k admin/DevOps funkcím.

## 👤 Role System

### Regular User (Default)
- ✅ Vidí "Čeká na schválení"
- ✅ Schvaluje/odmítá transakce
- ✅ Edituje transakce
- ❌ ŽÁDNÝ přístup k Debug/Test/Cleanup
- ❌ ŽÁDNÝ přístup k Metrics
- ❌ ŽÁDNÝ přístup k Admin panelu

### Admin User
- ✅ Všechny regular user funkce
- ✅ 🐛 Debug button - diagnostika opakujících se transakcí
- ✅ ⚡ Test button - ruční generování transakcí
- ✅ 🧹 Cleanup button - smazání duplikátů + oprava dat
- ✅ 📊 Metrics endpoint - system statistics
- ✅ Admin panel - správa uživatelů
- ✅ Health check - status Firebase

## 🎯 Frontend RBAC

### PendingTransactions Component

**Dříve:**
```jsx
// Všechna tlačítka viditelná pro všechny
<button onClick={handleDebug}>🐛 Debug</button>
<button onClick={handleCleanup}>🧹 Cleanup</button>
<button onClick={handleGenerateTest}>⚡ Test</button>
```

**Teď:**
```jsx
// Admin check
{isAdmin && (
  <>
    <button onClick={handleDebug}>🐛 Debug</button>
    <button onClick={handleCleanup}>🧹 Cleanup</button>
    <button onClick={handleGenerateTest}>⚡ Test</button>
  </>
)}
```

**Admin Detection:**
```javascript
// Load user document a check role
const snap = await getDocs(collection(db, 'users'));
const doc = snap.docs.find(d => d.id === session.uid);
setIsAdmin(doc.data()?.role === 'admin');
```

## 🛡️ Backend RBAC

### Cloud Function Protection

**Všechny admin endpointy mají guard:**

```javascript
// Check admin
if (!(await verifyAdmin(decodedToken))) {
  return res.status(403).json({ error: '🔐 Jen admin!' });
}
```

### Protected Endpoints

| Endpoint | Role | Účel |
|----------|------|------|
| `cleanupDuplicates` | Admin | Smazání duplikátů + oprava dat |
| `debugRecurring` | Admin | Diagnostika opakujících se transakcí |
| `metrics` | Admin | System statistics pro DevOps/AI |
| `healthCheck` | Public | Kontrola Firebase stavu |
| `testGenerateRecurring` | User | Ruční generování (pro testy) |
| `generateRecurringTransactions` | Scheduled | Automatické generování (daily 2 AM) |

### Error Responses

**Unauthorized (normální uživatel se pokusí přistoupit):**
```json
{
  "error": "🔐 Jen admin!",
  "status": 403
}
```

**Authentication Error (bez tokenu):**
```json
{
  "error": "Autentifikace vyžadována",
  "status": 401
}
```

## 🔧 Setup

### Make User Admin

```javascript
// V Firebase Console nebo Cloud Functions
await admin.firestore()
  .doc('users/{uid}')
  .update({ role: 'admin' });
```

### Check if User is Admin

**Frontend:**
```javascript
const snap = await getDocs(collection(db, 'users'));
const user = snap.docs.find(d => d.id === uid);
const isAdmin = user.data()?.role === 'admin';
```

**Cloud Functions:**
```javascript
const adminDoc = await db.doc(`users/${uid}`).get();
const isAdmin = adminDoc.data()?.role === 'admin';
```

## 📊 Security Matrix

```
┌──────────────────────────────┬─────────┬───────┐
│ Feature                      │ User    │ Admin │
├──────────────────────────────┼─────────┼───────┤
│ View Pending Transactions    │ ✅      │ ✅    │
│ Approve Transaction          │ ✅      │ ✅    │
│ Edit Transaction             │ ✅      │ ✅    │
│ Reject Transaction           │ ✅      │ ✅    │
│ Auto-Refresh Toggle          │ ✅      │ ✅    │
│                              │         │       │
│ 🐛 Debug Diagnostics        │ ❌      │ ✅    │
│ 🧹 Cleanup Duplicates       │ ❌      │ ✅    │
│ ⚡ Test Generate            │ ❌      │ ✅    │
│ 📊 Metrics                  │ ❌      │ ✅    │
│ 💚 Health Check             │ ❌      │ ✅    │
│ 🧑‍💻 Admin Panel            │ ❌      │ ✅    │
└──────────────────────────────┴─────────┴───────┘
```

## 🚨 Data Protection

### What Admin CAN Do
- Vidět debug info
- Spustit cleanup
- Vidět metrics
- Spravovat uživatele

### What Admin CANNOT Do
- Vidět jiného uživatele **pending** transakce (jen svoje)
- Editovat jiného uživatele data (jen svoje)
- Smazat jiného uživatele transakce (jen svoje)

```
Firestore Rules:
- /users/{uid}/pendingTransactions: 
  allow read: if isOwner(uid) || isAdmin(request.auth.uid)
```

### What Regular User CANNOT Do
- Přistoupit k Debug/Test/Cleanup
- Vidět Metrics
- Přistoupit k Admin panelu

```
Cloud Functions:
if (!(await verifyAdmin(decodedToken))) {
  return res.status(403).json({ error: '🔐 Jen admin!' });
}
```

## ✅ Verification

### How to Test RBAC

**Jako normální uživatel:**
1. Přihlásit se jako běžný uživatel
2. Jít na Dashboard → "Čeká na schválení"
3. ❌ Nevidíš 🐛 Debug, 🧹 Cleanup, ⚡ Test tlačítka
4. ✅ Vidíš pouze Auto-refresh toggle

**Jako admin:**
1. Přihlásit se jako admin (role=admin)
2. Jít na Dashboard → "Čeká na schválení"
3. ✅ Vidíš všechna tlačítka: 🐛, 🧹, ⚡
4. ✅ Vidíš Admin panel ikonu

**Curl test (admin endpoint):**
```bash
# Bez admin role - 403
curl -H "Authorization: Bearer USER_TOKEN" \
  https://.../metrics

# S admin role - 200
curl -H "Authorization: Bearer ADMIN_TOKEN" \
  https://.../metrics
```

## 🎯 Future RBAC Levels

```
Možné budoucí role:
- super_admin: Všechno + delete db
- finance_manager: Vidí všechny transakce
- support: Může resetovat hesla
- data_analyst: Vidí pouze metrics/reports
```

---

**Status**: ✅ Implemented  
**Last Updated**: 2026-05-30  
**Version**: 1.0.0
