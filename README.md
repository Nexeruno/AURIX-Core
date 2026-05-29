# Evidence Výdajů - Moderní React Aplikace

Plně funkční aplikace na správu příjmů a výdajů s moderním designem, dark modem a grafy.

## 🚀 Features

- ✨ **Dark Mode** - Light/Dark режім s persistencí
- 📊 **Grafy** - Pie chart (kategorie), Bar chart (měsíční srovnání)
- 💾 **Lokální uložení** - Data se automaticky ukládají (Zustand + localStorage)
- 📱 **Plně responsivní** - Funguje na mobilech, tabletech i desktopu
- 🎨 **Moderní design** - Tailwind CSS, glasmorphism efekty
- 🔔 **Notifikace** - Toast zprávy (React Hot Toast)
- 📥 **Export** - Připraveno na CSV/PDF (papaparse, html2pdf)

## 🛠️ Setup

### 1. Node.js instalace
Stáhni a nainstaluj Node.js LTS z https://nodejs.org

### 2. Instalace Dependencies
```bash
npm install
```

### 3. Dev Server
```bash
npm run dev
```
Aplikace se otevře na `http://localhost:5173`

### 4. Build pro produkci
```bash
npm run build
```
Vygeneruje `dist/` složku připravenou k nasazení.

## 📦 Deploy na GitHub Pages

1. Pushni kód na GitHub
2. Settings → Pages → Deploy from a branch
3. Vyber `main` branch, `/root` folder
4. GitHub Actions buildne a deployuje aplikaci automaticky
5. Aplikace bude dostupná na `https://username.github.io/evidence-vydaju`

## 🏗️ Struktura Projektu

```
src/
├── components/       # React komponenty
├── context/         # Theme context
├── utils/           # Utility funkce, Zustand store
├── App.jsx          # Main komponenta
├── main.jsx         # Entry point
└── index.css        # Global styly (Tailwind)
```

## 💾 Data Storage

Data se automaticky ukládají do `localStorage` pod klíčem `evidence-vydaju-store`.

## 🌙 Dark Mode

- Toggle tlačítko v headeru (slunce/měsíc ikona)
- Automaticky detekuje systémový preference
- Nastavení se pamatuje v localStorage

## 📊 Grafy

- **Pie Chart** - Rozdělení výdajů podle kategorií
- **Bar Chart** - Měsíční srovnání příjmů vs výdajů
- **Statistiky** - Průměrné příjmy/výdaje

## 🚀 Budoucí Features

- [ ] Firebase cloud sync
- [ ] Uživatelské účty
- [ ] Export PDF s reporty
- [ ] Budgetování s upozorněníma
- [ ] Recurring transactions

## 📄 License

MIT
