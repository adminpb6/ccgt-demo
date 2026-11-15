# Część II — Specyfikacja implementacyjna dema (do kodowania w osobnej sesji)

Ta część opisuje wszystko, co potrzeba, żeby zbudować klikalne demo na GitHub Pages bez dopytywania: cel, zakres, dane, stack, model, reguły, ekrany, testy i plan prac. Część I (powyżej) to wymagania biznesowe; w razie konfliktu obowiązuje ta część dla dema, a część I dla produktu docelowego.

## 1. Cel i zakres dema

**Cel:** w 5–10 minut pokazać Łukaszowi i potencjalnemu klientowi cały obieg: wczytanie harmonogramu z XER → wykrycie przesunięć → monity do opiekunów obiektów → propozycje nowych terminów → akceptacja przez harmonogramistę → eksport delty XER. Demo ma wyglądać i działać jak produkt, ale działa w całości w przeglądarce na danych syntetycznych.

**W zakresie dema (MUST):**

- Import pełnego XER (przeciągnij plik) i parsowanie w przeglądarce; domyślnie załadowany zestaw Rev0G. Import aktualizacji z Excela (bez relacji, patrz R1a).
- Zakres wybierany ręcznie (zaznaczenie, import listy z Excela); filtr po kodach aktywności tylko jako podpowiedź do masowego zaznaczania.
- Przełącznik ról (admin, opiekun obiektu, dyrekcja, zakupy, harmonogramista, kierownik) bez logowania.
- Ekrany: pulpit roli, lista obiektów z postępem, Gantt obiektu, ranking opóźnień, monity, rejestr zmian terminów, ścieżka zakupowa, formularz aktualizacji/przekazania zadania, postęp zespołu.
- Drugi import (Rev0H) wykrywa przesunięcia i tworzy monity; wynik zgodny z `expected_shifts.json`.
- Akceptacja/odrzucenie w rejestrze → eksport pliku delta XER do pobrania.
- Stan zapisywany lokalnie (IndexedDB), przycisk „Zresetuj demo".
**Poza zakresem dema (NIE robimy):** prawdziwe logowanie i autoryzacja po stronie serwera, backend, baza, powiadomienia e-mail/push, integracja z API Primavery, wielu użytkowników naraz, RODO/audyt produkcyjny, edycja logiki sieci (CPM) w aplikacji, wersja mobilna natywna.

**Kryterium sukcesu:** osoba spoza projektu przechodzi scenariusz z sekcji 10 w 5 minut bez instrukcji; wszystkie testy akceptacyjne zielone; strona ładuje się poniżej 3 s na typowym laptopie przy pełnym XER (5,2 tys. zadań).

## 2. Zasady danych i hosting

- **Hosting:** GitHub Pages (statyczne). Strona na Free/Pro/Team jest publiczna nawet z prywatnego repo, więc **w repo i na stronie mogą być wyłącznie dane syntetyczne**. Prywatne Pages istnieją tylko w Enterprise Cloud.
- **Zakaz:** żadnych plików ani fragmentów prawdziwego XER/prototypu klienta w repo, w historii git, w testach, w zrzutach ekranu i w README. Prawdziwy plik zostaje lokalnie w Pobranych i służy tylko do porównania struktury.
- **Zabezpieczenie:** `.gitignore` na `*.xer` poza `public/data/` i skrypt CI (`scripts/guard.mjs`), który blokuje build, gdy w repo jest plik `.xer` bez prefiksu `PL5001_SYNTH_` albo gdy w danych pojawia się nazwa spoza listy fikcyjnych słowników z generatora.
- **Baner na każdej stronie:** „Demo na danych syntetycznych — brak związku z rzeczywistym projektem".
- Ścieżka docelowa dla produktu (poza demem): Entra ID SSO, autoryzacja po stronie serwera wg roli i obiektu, dane w UE, log audytowy — patrz „Zarys architektury i opcje wdrożenia" w części I.
## 3. Dane testowe (link i opis)

**Pobranie:** paczka danych syntetycznych (strona z plikami) — widoczna dla właściciela, do udostępnienia z poziomu claude.ai. Kopia lokalna u Piotra: `~/Downloads/ccgt-synthetic/`. Dane można też odtworzyć bit w bit: `python3 generate.py out 20260930` (Python 3.9+, bez zależności). Generator i walidator są w paczce.

| Plik | Zawartość | Użycie w demie |
|---|---|---|
| `PL5001_SYNTH_schedule_Rev0G_DD30092026.xer` | Pełny harmonogram, data statusu 2026-09-30, 5 208 zadań, 7 065 relacji, 1 950 węzłów WBS, 3 projekty | Dane startowe i test parsera |
| `PL5001_SYNTH_schedule_Rev0H_DD07102026.xer` | Ten sam harmonogram tydzień później; te same task_id i guid | Drugi import: wykrywanie przesunięć |
| `PL5001_SYNTH_delta_export_sample.xer` | Wzorzec eksportu delty (25 zadań) | Test zgodności eksportu |
| `expected_shifts.json` | Prawda referencyjna: 212 przesunięć zadań w zakresie Rev0G→Rev0H (68 przyczyn źródłowych, reszta skutki w dół sieci) | Testy akceptacyjne |
| `app-data.json` | Użytkownicy i role, 43 obiekty, 621 zadań w zakresie w wersjach Rev0G i Rev0H, kroki ścieżki zakupowej | Szybki start UI bez parsowania |
| `stats.json`, `README.md`, `generate.py`, `validate.py` | Liczności, opis, generator, walidator | Narzędzia |

**Struktura odwzorowana z prawdziwego eksportu:**

- Plik tekstowy, separator tabulator, kodowanie **cp1250** (polskie litery), końce linii CRLF, pierwsza linia `ERMHDR`, ostatnia `%E`, bloki `%T` (tabela), `%F` (pola), `%R` (wiersze).
- Liczby ułamkowe z **przecinkiem dziesiętnym** (np. `12,8`); daty `YYYY-MM-DD HH:MM`; czasy trwania i luzy w godzinach (dzień = 8 h).
- Tabele (w tej kolejności): CURRTYPE, OBS, UDFTYPE, PROJECT, CALENDAR, PROJWBS, ACTVTYPE, TASK, ACTVCODE, TASKPRED, TASKACTV, UDFVALUE.
- Hierarchia WBS do głębokości 6 (projekt → obszar → obiekt → faza → pakiet → sekcja → podsekcja).
- Typy zadań: `TT_Task`, `TT_Mile`, `TT_FinMile`; statusy: `TK_NotStart`, `TK_Active`, `TK_Complete`; relacje `PR_FS`, `PR_SS`, `PR_FF`, `PR_SF` z opóźnieniem w godzinach (w danych jest 12 relacji SF).
- 13 typów kodów aktywności na zadanie (89 tys. wierszy TASKACTV): wykonawca, obiekt, dyscyplina, faza, zakres, opiekun, obszar, `AC_PP_PM` (PM000/PM100/PM200/PM300), zespół (Zespół-I/E/K/W), blok, priorytet, pakiet, poziom.
- Pola dat w TASK: `target_*` (baza), `early_*` (prognoza), `late_*`, `act_*`, `restart/reend`; ograniczenie `cstr_type`.
**Ustalenia z Łukaszem (15.11, odpowiedzi na pytania techniczne):**

- **Zakres:** Łukasz wybiera zadania ręcznie, „na wyczucie" — nie ma jednego kodu, który go wyznacza. Aplikacja musi pozwalać wskazać zadania ręcznie (zaznaczenie na liście/Gantcie, import listy `task_code` z Excela) i zapamiętać wybór. Reguła po kodach (`AC_PP_PM`, zespół) to tylko podpowiedź do masowego zaznaczania.
- **Dane wejściowe:** XER z relacjami co miesiąc i tylko na prośbę Łukasza; między tym aktualizacje przychodzą w Excelu, **bez powiązań**. Excel czyta się łatwo, więc demo obsługuje oba źródła.
- **Relacje:** wszystko jest w XER; w eksporcie delty relacji nie ruszamy.
- **Opiekun:** jeden na obiekt; zastępstwa (urlopy) pomijamy na tym etapie.
- **Próg istotnego przesunięcia:** jeszcze nieznany, ustalimy go w praktyce → konfigurowalny z wartością domyślną.
- **Ścieżka zakupowa:** kroki zawsze takie same, ale nikt ich nie pilnuje; Łukasz chce je zbudować, a dyrektor zakupów może być zainteresowana osobnym systemem zakupowym.
- **Wymiana danych z Primaverą:** na start wystarczy lokalny eksport/import; API później. Zmiany wracają do głównego planu jako plik z samymi aktualizacjami (XER, ewentualnie Excel); dokładna forma do sprawdzenia na małym wycinku.
- **Start:** Łukasz zaczyna od małego wycinka, bo najpierw musi ręcznie uporządkować harmonogram.
**Co nadal niepotwierdzone:** w jakiej formie Primavera przyjmie zmiany (w sampie: ograniczenie „start nie wcześniej niż" `CS_MSOA` + `cstr_date`). To parametr w `write.ts`, nie zaszyta logika.

**Uwaga o wiarygodności:** dane są realistyczne strukturalnie (długości łańcuchów, mieszanka relacji, odsetek zadań ukończonych 62%, aktywnych 7%, nierozpoczętych 30%), ale nazwy, osoby, firmy, kody obiektów i daty są w pełni fikcyjne. W zbiorze są celowo zadania „rozpoczęte poza kolejnością" (ukończone przy nieukończonych poprzednikach), tak jak w prawdziwych harmonogramach.

## 4. Stack i architektura dema

| Warstwa | Wybór | Uzasadnienie |
|---|---|---|
| Aplikacja | Vite + React 18 + TypeScript (strict) | Szybki build do statyki, dobre wsparcie narzędzi |
| Stan | Zustand + selektory | Prosty stan globalny bez boilerplate |
| Trwałość | IndexedDB (biblioteka `idb`) | Dane ~10 MB, zapis lokalny, reset jednym przyciskiem |
| Parsowanie XER | Web Worker, własny parser strumieniowy | 6 MB tekstu cp1250 nie może blokować UI |
| Dekodowanie | `TextDecoder('windows-1250')` | Poprawne polskie znaki |
| Lista/Gantt | Własny Gantt na SVG/canvas z wirtualizacją wierszy | 5 tys. zadań; biblioteki Gantta są ciężkie i płatne |
| Routing | HashRouter | GitHub Pages nie ma przepisywania ścieżek |
| Style | Tailwind CSS + własne komponenty | Szybka iteracja, spójny wygląd |
| Testy | Vitest (jednostkowe), Playwright (E2E) | Scenariusz akceptacyjny jako test E2E |
| CI/CD | GitHub Actions → `actions/deploy-pages` | Deploy po merge do `main` |

**Zasady:** zero backendu; zero zewnętrznych wywołań sieciowych w runtime (poza własnymi statycznymi plikami); `base` w Vite ustawione na nazwę repo; dane startowe z `public/data/` ciągnięte `fetch`em; żadnych cookies i telemetrii.

**Przepływ danych:** plik XER → Worker (dekodowanie, parsowanie tabel, indeksy po `task_id` i `task_code`) → model domenowy (zadania, WBS, kody, relacje) → filtr zakresu → snapshot importu zapisany w IndexedDB → porównanie z poprzednim snapshotem → zdarzenia (przesunięcie, nowe, usunięte, zmiana statusu) → monity → UI.

## 5. Struktura repozytorium

```
ccgt-demo/
  public/data/            # TYLKO dane syntetyczne (z paczki)
    PL5001_SYNTH_schedule_Rev0G_DD30092026.xer
    PL5001_SYNTH_schedule_Rev0H_DD07102026.xer
    app-data.json  expected_shifts.json
  src/
    domain/               # typy, reguły, bez zależności od UI
      types.ts  rules.ts  workdays.ts  scope.ts  diff.ts
    xer/                  # parser i writer
      parse.worker.ts  parse.ts  write.ts  mapping.ts
    store/                # Zustand + IndexedDB
    ui/                   # strony i komponenty
      pages/ (Dashboard, Objects, ObjectGantt, DelayRanking, Monits, Register, Purchasing, UpdateTask, TeamProgress, Import)
      components/ (Gantt, RoleSwitcher, Banner, DateInput, ...)
  tests/ (unit/, e2e/)
  scripts/guard.mjs  scripts/compare-expected.mjs
  .github/workflows/deploy.yml
  README.md  SPEC.md      # SPEC.md = ta część dokumentu
```

## 6. Model danych (TypeScript)

```
type Role = 'admin'|'owner'|'director'|'purchaser'|'planner'|'manager';
interface Task {
  id: string; code: string; guid: string; name: string;
  type: 'TT_Task'|'TT_Mile'|'TT_FinMile'; status: 'TK_NotStart'|'TK_Active'|'TK_Complete';
  wbsId: string; projId: string; objectCode: string;
  baselineStart: string; baselineEnd: string;   // target_*
  start: string; end: string;                   // early_* (prognoza)
  actStart?: string; actEnd?: string;
  durationDays: number; floatDays: number;
  codes: Record<string,string>;                 // typ kodu -> wartość
  preds: { code: string; type: 'PR_FS'|'PR_SS'|'PR_FF'|'PR_SF'; lagDays: number }[];
}
interface Snapshot { id: string; revision: string; dataDate: string; importedAt: string; tasks: Record<string,Task>; }
interface ShiftEvent { id: string; taskCode: string; fromEnd: string; toEnd: string; deltaWd: number; snapshotId: string; }
interface Monit {
  id: string; taskCode: string; ownerId: string; shiftId: string;
  status: 'new'|'negotiating'|'proposed'|'accepted'|'rejected'|'closed';
  proposedStart?: string; proposedEnd?: string; reason?: string; contractor?: string; comment?: string;
  createdAt: string; history: { at: string; by: string; action: string; note?: string }[];
}
interface RegisterEntry {  // rejestr zmian terminów, tylko dopisywany
  id: string; taskCode: string; oldEnd: string; newEnd: string; reason: string;
  decision: 'accepted'|'rejected'; decidedBy: string; decidedAt: string; exported: boolean;
}
interface AppConfig { scopeRule: { ppIn: string[]; teamIn: string[] }; shiftThresholdWd: number; delayThresholdWd: number; deltaConstraintType: 'CS_MSOA'|'CS_MEOA'; }
```

Klucz tożsamości zadania między importami: **`task_code`** (z kontrolą `guid`). `task_id` może się zmieniać przy re-eksporcie z innej bazy, więc nie wolno na nim polegać w porównaniach.

## 7. Parser i writer XER — reguły

- Dekoduj `windows-1250`; normalizuj CRLF; dziel po `\t`; puste pole = `""`.
- `%T` zaczyna tabelę, `%F` ustawia listę pól, `%R` to wiersz; liczba kolumn wiersza musi równać się liczbie pól, inaczej błąd z numerem linii.
- Liczby: zamień `,` na `.` **przed** `parseFloat` (`'1752,4'` w `float()` wywala parser). Godziny → dni dzieleniem przez 8 (z kalendarza zadania, gdy `day_hr_cnt` inne).
- Daty: `YYYY-MM-DD HH:MM`, bez strefy; pusta = brak.
- Złącz `TASKACTV` + `ACTVCODE` + `ACTVTYPE` do mapy kodów na zadanie; `PROJWBS` do drzewa; `TASKPRED` do list poprzedników (po `task_id`, potem mapowanie na `task_code`).
- Walidacje po wczytaniu: unikalność `task_code` i `guid`, brak relacji wskazujących poza zbiór (pokazuje ostrzeżenie, nie przerywa), brak cykli (ostrzeżenie).
- Writer delty: nagłówek `ERMHDR` jak w imporcie, jedna tabela `TASK` z polami `task_id, proj_id, task_code, guid, cstr_type, cstr_date, task_name`, kodowanie cp1250, CRLF, `%E` na końcu. Wiersze tylko dla zaakceptowanych wpisów rejestru, które nie były jeszcze wyeksportowane. Zgodność z wzorcem: bajt w bajt na tym samym wejściu (test).
- Wydajność: parsowanie pełnego Rev0G w Workerze poniżej 1,5 s; UI nie może się blokować dłużej niż 100 ms.
## 8. Reguły biznesowe

**R1. Zakres.** Zakres to lista `task_code` wybrana ręcznie (zaznaczenie w UI albo import listy z Excela), bo Łukasz wybiera je „na wyczucie". Lista jest zapisywana w IndexedDB i eksportowalna do CSV/Excela. Reguła po kodach (`AC_PP_PM ∈ config.scopeRule.ppIn` **lub** `AC_Zespol ∈ config.scopeRule.teamIn`) służy tylko do masowego zaznaczenia (przycisk „Zaznacz wg reguły"). Zadania poza zakresem są wczytane (kontekst Gantta i relacji), ale nie generują monitów i nie pojawiają się w listach.

**R1a. Import z Excela.** Plik .xlsx/.csv z kolumnami `task_code`, `nowy_termin_końca` (opcjonalnie `nowy_termin_startu`, `uwagi`); dopasowanie po `task_code`; wiersze bez dopasowania trafiają do raportu błędów. Excel nie ma relacji: nie przelicza zależnych zadań, a porównanie (R3) dotyczy tylko podanych zadań. Relacje i prognoza pochodzą z ostatniego XER.

**R2. Dni robocze.** Poniedziałek–piątek; różnice terminów liczymy w dniach roboczych (`workdays.ts`, testy graniczne: weekendy, przejście roku). Brak świąt w demie.

**R3. Wykrycie przesunięcia.** Dla każdego zadania w zakresie, które istnieje w obu snapshotach i nie jest ukończone w nowym: `delta = workdays(nowy.end) − workdays(stary.end)`; jeśli `|delta| ≥ shiftThresholdWd` (domyślnie 1) → `ShiftEvent`. Zadania ukończone w obu snapshotach pomijamy. Dodatkowo liczymy opóźnienie skumulowane `end − baselineEnd`.

**R4. Monit.** Każdy `ShiftEvent` z `delta > 0` tworzy `Monit` dla opiekuna obiektu zadania (kod `AC_Opiekun`); przesunięcia w lewo (`delta < 0`) tworzą wpis informacyjny bez wymaganej akcji. Wiele przesunięć tego samego zadania scala się w jeden otwarty monit (aktualizuje `toEnd`).

**R5. Cykl monitu.** `new` → `negotiating` (opiekun potwierdza kontakt z wykonawcą) → `proposed` (opiekun podaje nowy termin, powód, wykonawcę, komentarz) → harmonogramista: `accepted` albo `rejected` (z uzasadnieniem) → `closed` po eksporcie lub odrzuceniu. Odrzucony wraca do opiekuna jako `negotiating`.

**R6. Rejestr zmian terminów.** Każda decyzja harmonogramisty dopisuje `RegisterEntry` (log tylko do dopisywania, bez edycji i usuwania). Widok z filtrami: obiekt, wykonawca, status, zakres dat.

**R7. Eksport delty.** Przycisk dostępny dla `planner` i `admin`: generuje XER z zaakceptowanych, jeszcze niewyeksportowanych wpisów; po pobraniu oznacza je `exported = true`. Pusty zbiór → komunikat, bez pliku.

**R8. Nowe i usunięte zadania.** Zadanie obecne tylko w nowym imporcie → powiadomienie dla harmonogramisty „nowe w zakresie"; zadanie znikające → „usunięte z harmonogramu", monity do niego zamykają się automatycznie.

**R9. Ranking opóźnień.** Per obiekt: liczba opóźnionych zadań (opóźnienie skumulowane ≥ `delayThresholdWd`, domyślnie 5), maksymalne opóźnienie, wyróżnik krytyczności (luz ≤ 0). Sortowanie malejąco po maksymalnym opóźnieniu; drugi widok: per opiekun i per wykonawca.

**R10. Uprawnienia w demie** (tylko UI, nie jest to zabezpieczenie):

| Akcja | admin | opiekun | dyrekcja | zakupy | harmonogramista | kierownik |
|---|---|---|---|---|---|---|
| Import XER | tak | nie | nie | nie | tak | nie |
| Widok wszystkich obiektów | tak | swoje + podgląd | tak | tak | tak | tak |
| Proponowanie terminów w monicie | tak | swoje obiekty | nie | nie | nie | swoje obiekty |
| Akceptacja/odrzucenie | tak | nie | nie | nie | tak | nie |
| Eksport delty | tak | nie | nie | nie | tak | nie |
| Ścieżka zakupowa | tak | podgląd | podgląd | edycja | podgląd | podgląd |
| Zarządzanie użytkownikami/konfiguracją | tak | nie | nie | nie | nie | nie |

## 9. Role, ekrany i historyjki użytkownika

Każdy ekran: URL (hash), rola, dane, akcje, stany puste/błędne. Kolejność nawigacji: Pulpit, Obiekty, Monity, Rejestr, Opóźnienia, Zakupy, Zespół, Import.

| Ekran | URL | Główna zawartość | Kluczowe akcje |
|---|---|---|---|
| Pulpit roli | `#/` | Kafle zależne od roli: dla opiekuna „mój dzień" (otwarte monity, zadania w tym tygodniu, najbliższe kamienie milowe); dla dyrekcji KPI i top 5 opóźnień; dla harmonogramisty kolejka do akceptacji; dla zakupów pozycje w ścieżce | Przejście do szczegółów |
| Obiekty | `#/objects` | Tabela 43 obiektów: kod, nazwa, opiekun, wykonawca, postęp %, liczba opóźnionych, maks. opóźnienie; filtry i sortowanie | Wejście do obiektu |
| Gantt obiektu | `#/objects/:code` | Gantt zadań obiektu (WBS zwijany), linia bazowa vs prognoza, relacje jako strzałki dla zaznaczonego zadania, znacznik daty statusu, kamienie milowe | Zoom (tydzień/miesiąc/kwartał), klik w zadanie → panel boczny, „Zgłość zmianę" |
| Ranking opóźnień | `#/delays` | Tabela wg R9, przełącznik obiekt/opiekun/wykonawca, wykres słupkowy top 10 | Przejście do obiektu |
| Monity | `#/monits` | Lista wg statusu; dla opiekuna tylko swoje; karta monitu: zadanie, stary/nowy termin, wykonawca, formularz propozycji | R5: potwierdź kontakt, zaproponuj termin |
| Rejestr zmian | `#/register` | Tabela wg R6, filtry, wyróżnione oczekujące na decyzję | Zatwierdź / Odrzuć (z uzasadnieniem), eksport delty |
| Ścieżka zakupowa | `#/purchasing` | Pozycje zakupowe obiektów z 7 krokami (specyfikacja, zapytanie, analiza ofert, negocjacje, umowa, produkcja i FAT, dostawa); status kroku, data, odpowiedzialny | Przesunięcie kroku (rola zakupy) |
| Aktualizacja / przekazanie zadania | modal z karty zadania | Zmiana procentu wykonania, komentarz, przekazanie zadania innemu opiekunowi | Zapisz, Przekaż |
| Postęp zespołu | `#/team` | Per opiekun: liczba obiektów, zadań w tygodniu, otwartych monitów, terminowość odpowiedzi | Przejście do monitów |
| Import | `#/import` | Pole upuszczenia pliku XER lub Excela, wybór wbudowanych Rev0G/Rev0H, podsumowanie porównania (nowe, usunięte, przesunięte), wybór zakresu (lista zadań, import z Excela), konfiguracja progów | Importuj, Zresetuj demo |

**Historyjki (skrót):**

- Jako opiekun obiektu widzę rano, które moje zadania się przesunęły, i zgłaszam nowy termin uzgodniony z wykonawcą.
- Jako harmonogramista wgrywam tygodniowy XER, widzę co się przesunęło, akceptuję terminy opiekunów i eksportuję deltę do Primavery.
- Jako dyrekcja widzę ranking opóźnień i obiekty wymagające decyzji bez wchodzenia w szczegóły.
- Jako zakupowiec prowadzę ścieżkę zakupową pozycji i widzę, które dostawy zagrażają harmonogramowi.
- Jako administrator ustawiam regułę zakresu i progi.
**Wymagania UX:** polski interfejs; format dat `DD.MM.RRRR`; każdy ekran ma stan pusty i stan błędu; desktop first (min. 1280 px), czytelne na tablecie; kontrast i obsługa klawiatury w tabelach i formularzach.

## 10. Kryteria akceptacji i testy

**Testy jednostkowe (Vitest):**

- Parser Rev0G: 5 208 zadań, 7 065 relacji, 1 950 węzłów WBS, 3 projekty; polskie znaki bez uszkodzeń; `1752,4`-podobne liczby parsują się poprawnie; `task_code` i `guid` unikalne.
- Zakres: dokładnie 621 zadań (11,9%) przy domyślnej regule; zmiana reguły w konfiguracji zmienia liczbę natychmiast.
- Diff Rev0G→Rev0H: zbiór przesunięć w zakresie identyczny z `expected_shifts.json` (212 pozycji: 128 w prawo, 84 w lewo; pary `task_code` + `new_end` zgodne co do dnia).
- Dni robocze: weekend, granica roku, ujemne różnice.
- Writer delty: dla 25 zadań z wzorca wynik identyczny bajt w bajt z `PL5001_SYNTH_delta_export_sample.xer` (to samo wejście: zaakceptowane przesunięcia pierwotne, `cstr_date` = nowy start).
- Maszyna stanów monitu: dozwolone i zabronione przejścia z R5.
**Scenariusz E2E (Playwright), dokładnie ten sam co demo:**

- Otwórz stronę → widoczny baner o danych syntetycznych, załadowany Rev0G, rola: harmonogramista.
- Import → wybierz wbudowany Rev0H → podsumowanie pokazuje 212 przesunięć, nowe/usunięte zgodnie z danymi.
- Przełącz rolę na opiekuna (np. pierwszego z listy z największą liczbą monitów) → pulpit pokazuje jego monity → otwórz monit → „potwierdź kontakt" → wpisz nowy termin i powód → wyślij.
- Rola harmonogramista → Rejestr → zatwierdź propozycję → pojawia się wpis w rejestrze.
- Eksport delty → pobrany plik zawiera dokładnie zaakceptowane zadania, cp1250, CRLF.
- Odśwież stronę → stan zachowany; „Zresetuj demo" przywraca stan początkowy.
**Akceptacja niefunkcjonalna:** pierwszy render poniżej 3 s; Gantt obiektu z 150 zadaniami płynny (60 fps przy przewijaniu); bundle JS poniżej 1,5 MB gzip bez danych; brak błędów w konsoli; Lighthouse accessibility co najmniej 90; działa w aktualnych Chrome, Edge, Firefox, Safari.

## 11. Plan prac (kamienie milowe)

| Kamień | Zakres | Wynik / kryterium zakończenia |
|---|---|---|
| M0 Szkielet | Repo, Vite+React+TS, Tailwind, lint, deploy.yml, guard.mjs, baner, HashRouter | Pusta strona live na GitHub Pages z banerem |
| M1 Parser | Worker, parse.ts, mapping, walidacje, testy na Rev0G | Testy parsera zielone, ładowanie poniżej 1,5 s |
| M2 Model i magazyn | domain/, store, IndexedDB, snapshoty, konfiguracja zakresu | Dane startowe widoczne w tabeli debug |
| M3 Obiekty i Gantt | Lista obiektów, Gantt z wirtualizacją, WBS, linia bazowa | Ekran obiektu zgodny z sekcją 9 |
| M4 Import i diff | Ekran importu (XER i Excel), wybór zakresu, R1a, R3, R8, podsumowanie | Test diff = `expected_shifts.json` |
| M5 Monity i rejestr | R4–R6, formularze, role i uprawnienia R10, pulpity ról | Kroki 3–4 scenariusza E2E |
| M6 Eksport delty | Writer, R7, pobieranie pliku | Test bajt w bajt |
| M7 Reszta ekranów | Ranking opóźnień, zakupy, zespół, aktualizacja/przekazanie | Wszystkie ekrany z sekcji 9 |
| M8 Dopracowanie | Stany puste/błędne, a11y, wydajność, README, nagranie demo | Pełny E2E zielony, checklista niefunkcjonalna |

Kolejność jest wiążąca do M6 (to około 70% wartości demo); M7 i M8 można zamienić miejscami. Każdy kamień kończy się wdrożeniem na Pages i zielonym CI.

## 12. Ryzyka i pytania otwarte

**Ryzyka:**

- Prawdziwy kod zakresu inny niż zakładany → reguła w konfiguracji, nie w kodzie (sekcja 3).
- Wydajność Gantta przy 5 tys. zadań → wirtualizacja i widok per obiekt jako domyślny.
- Eksport do Primavery nie zadziała w zakładanej formie (np. wymagane inne pola/tabele) → format delty izolowany w `write.ts` i parametryzowany.
- Przypadkowe użycie prawdziwych danych → guard w CI, zakaz z sekcji 2.
**Pytania otwarte (do Łukasza, wpływają na produkt, nie blokują dema):**

- W jakiej formie Primavera przyjmie zmiany z aplikacji: plik XER z samymi aktualizacjami czy Excel, ograniczenia dat czy daty planowane? Sprawdzić na małym wycinku z Łukaszem.
- Jaki układ ma Excel z aktualizacjami (kolumny, kto go prowadzi, jak często)? Potrzebny przykład pliku.
- Próg istotnego przesunięcia: ustalamy empirycznie po pierwszych importach.
- Czy lista zakresu jest wspólna dla wszystkich użytkowników, czy prowadzi ją tylko harmonogramista?
- Ścieżka zakupowa jako osobny moduł z własnym odbiorcą (dyrekcja zakupów): robimy w tym samym demie czy odkładamy?
- Jak duży ma być pierwszy „wycinek" (ile obiektów/zadań) i kiedy Łukasz skończy porządkowanie harmonogramu?
