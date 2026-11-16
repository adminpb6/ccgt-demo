# ccgt-demo

Klikalne demo workflow harmonogramu CCGT (import XER → przesunięcia → monity → propozycje → akceptacja → eksport delty XER).
Specyfikacja obowiązująca: [SPEC.md](SPEC.md) (część II dokumentu „CCGT Gdańsk — wymagania i zarys architektury").

**Demo na danych syntetycznych — brak związku z rzeczywistym projektem.**
W repo wolno trzymać wyłącznie pliki `PL5001_SYNTH_*`; `scripts/guard.mjs` (uruchamiany w `npm run build` i w CI) blokuje inne pliki `.xer`.
Generator danych: `tools-synth/generate.py` (`python3 generate.py out 20260930`).

Strona: https://adminpb6.github.io/ccgt-demo/

## Uruchomienie
```bash
npm install
npm run dev          # tryb deweloperski (http://localhost:5173/ccgt-demo/)
npm test             # Vitest: parser, zakres, diff, writer, monity, Excel
npm run test:e2e     # Playwright: scenariusz z sekcji 10
npm run build        # guard + tsc + vite build
```

## Założenia i odstępstwa (niejasności / sprzeczności w specyfikacji)
1. **Liczba węzłów WBS = 1 572, nie 1 950.** Rev0G (tabela `PROJWBS`, `stats.json`) ma 1 572 węzły; test parsera asercją na 1 572. Pozostałe liczby zgodne (5 208 zadań, 7 065 relacji, 3 projekty).
2. **Diff Rev0G→Rev0H: 212 + 6 granicznych.** Generator liczył `expected_shifts.json` na ułamkowych dniach roboczych, a XER niesie tylko daty całkowite. Wszystkie 212 oczekiwanych pozycji są wykrywane (kod, `old_end`, `new_end` zgodne co do dnia; 128 w prawo / 84 w lewo), ale 6 zadań z przesunięciem dokładnie +1 d rob. (`16KE73-026`, `16KE73-070`, `16KE73-142`, `25DF82-082`, `28YY90-102`, `28YY90-112`) ma w prawdzie < 1 dnia i nie ma ich w pliku, choć daty w XER przesuwają się o 1 d rob. — z samych dat nie da się ich odróżnić od `24PY38-046` (+1 → 1,5 w pliku). UI pokazuje więc 218 przesunięć. Test dokumentuje dokładnie ten zbiór.
3. **R3 a expected_shifts:** spec R3 każe pomijać zadania ukończone w nowym imporcie, ale `expected_shifts.json` je zawiera (pomijane są tylko ukończone w obu). Obowiązuje `expected_shifts.json`.
4. **Reguła zakresu** dopasowuje skrót kodu (`Zespół-I`) do pełnej nazwy wartości (`Zespół-I (Inwestor)`). Zakres początkowy = reguła (621 zadań) — to tylko podpowiedź; można go dowolnie zmienić (zaznaczanie, import z Excela/CSV, eksport CSV).
5. **Writer delty:** `cstr_date` = `early_start` zadania z ostatniego importu (07:00), chyba że opiekun podał nowy start; nagłówek `ERMHDR` z ostatniego importu. Test bajt w bajt na 25 pierwszych przyczynach źródłowych.
6. **Import Excela (R1a)** tworzy wirtualny snapshot z podmienionymi terminami (bez przeliczania zależnych); `.xlsx` czytane przez `read-excel-file`, `.csv` natywnie (separatory `;`, `,`, tab).
7. **Statystyki obiektów** (postęp, opóźnienia, ranking) liczone po wszystkich zadaniach obiektu, nie tylko zakresie; monity — tylko dla zakresu.
8. **Ścieżka zakupowa:** dane syntetyczne generowane deterministycznie w aplikacji (po jednej pozycji na obiekt), bo `app-data.json` zawiera tylko nazwy 7 kroków.
9. **Stack:** React 18, Vite 6, Tailwind 3, Vitest 2.
10. Pomiary (M8, lokalnie): Lighthouse accessibility 100 (Pulpit), pierwsze załadowanie pełnego XER do stanu interaktywnego ok. 0,4 s, przewijanie Gantta ok. 60 fps, JS ok. 75 kB gzip; E2E zielone w Chromium, Firefox i WebKit. Lighthouse performance 0,8 przy domyślnym throttlingu symulowanym (nie jest kryterium).

## Struktura
Zgodna z SPEC.md sekcja 5: `src/domain` (reguły), `src/xer` (parser/writer, Web Worker), `src/store` (Zustand + IndexedDB), `src/ui` (strony i komponenty), `tests/unit`, `tests/e2e`.
