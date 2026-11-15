#!/usr/bin/env python3
"""Generator syntetycznych danych 'CCGT Zatoka' (w pelni fikcyjnych) wzorowanych na strukturze eksportu Primavera P6 XER.
Uzycie: python3 generate.py [outdir] [seed]
Wyniki: schedule_Rev0G.xer, schedule_Rev0H_update.xer, delta_export_sample.xer, app-data.json, expected_shifts.json, stats.json
"""
import sys, json, random, datetime as dt, string, os
OUT = sys.argv[1] if len(sys.argv) > 1 else "out"
SEED = int(sys.argv[2]) if len(sys.argv) > 2 else 20260930
os.makedirs(OUT, exist_ok=True)
R = random.Random(SEED)
BASE = dt.date(2025, 1, 6)            # poniedzialek = dzien roboczy 0
DD_G = dt.date(2026, 9, 30); DD_H = dt.date(2026, 10, 7)

def wd2date(n):
    n = int(n); return BASE + dt.timedelta(days=(n // 5) * 7 + n % 5)
def date2wd(d):
    delta = (d - BASE).days; w, r = divmod(delta, 7); return w * 5 + min(r, 5)
def fmt(d, h): return f"{d:%Y-%m-%d} {h}"
def guid(): return "".join(R.choice(string.ascii_letters + string.digits + "+/") for _ in range(22))
def num(x):
    if isinstance(x, float) and x != int(x): return ("%.1f" % x).replace(".", ",")
    return str(int(x)) if isinstance(x, (int, float)) else str(x)

# ---------- slowniki (calosc fikcyjna) ----------
CONTRACTORS = ["BudMar Sp. z o.o.", "TurboSystem S.A.", "ElektroPro Sp. z o.o.", "Aerotherm Polska", "GdanskSteel Montaż", "HydroInstal", "AutomatykaPlus", "Kablex Energo", "Izoterm Serwis", "Pomorskie Roboty Inżynieryjne"]
OWNERS = ["Anna Wiśniewska", "Marek Kowalczyk", "Ewa Zielińska", "Tomasz Lewandowski", "Katarzyna Dąbrowska", "Paweł Wójcik", "Joanna Kamińska", "Michał Szymański", "Agnieszka Woźniak", "Krzysztof Kozłowski", "Magdalena Jankowska", "Piotr Mazur"]
AREAS = [("Wyspa turbinowa", 1), ("Wyspa kotłowa", 1), ("Układ chłodzenia", 2), ("Układ elektryczny", 2), ("Automatyka i AKPiA", 3), ("Infrastruktura i BOP", 3)]
OBJ_NAMES = {
 "Wyspa turbinowa": ["Turbina gazowa", "Generator", "Turbina parowa", "Skraplacz", "Pompy skroplin", "Układ oleju smarnego", "Hala maszyn", "Układ paliwa gazowego"],
 "Wyspa kotłowa": ["Kocioł odzyskowy HRSG", "Komin główny", "Bęben wysokiego ciśnienia", "Pompy wody zasilającej", "Układ by-pass pary", "Odgazowywacz", "Zbiornik wody zasilającej"],
 "Układ chłodzenia": ["Wieża chłodnicza", "Pompy wody chłodzącej", "Ujęcie wody", "Układ chemicznego uzdatniania", "Stacja demineralizacji", "Oczyszczalnia ścieków technologicznych"],
 "Układ elektryczny": ["Transformator blokowy", "Rozdzielnia 110 kV", "Rozdzielnia SN", "Rozdzielnia nN", "Zasilanie awaryjne", "Układy wyprowadzenia mocy", "Uziemienia i ochrona odgromowa"],
 "Automatyka i AKPiA": ["System DCS", "System zabezpieczeń", "Układy pomiarowe", "Analizatory spalin (CEMS)", "Sieć światłowodowa", "System SCADA"],
 "Infrastruktura i BOP": ["Budynek administracyjny", "Stacja redukcyjno-pomiarowa gazu", "Drogi i place", "Instalacje przeciwpożarowe", "Magazyn", "Warsztat", "Ogrodzenie i monitoring", "Zbiornik oleju", "Wentylacja i klimatyzacja"],
}
PHASES = ["Projektowanie", "Zakupy", "Budowa", "Rozruch"]
DISC = ["Budowlana", "Mechaniczna", "Rurociągi", "Elektryczna", "AKPiA", "HVAC", "Rozruch"]
TEAMS = [("ZI", "Zespół-I (Inwestor)"), ("ZE", "Zespół-E (Eksploatacja)"), ("ZK", "Zespół-K (Kontrakt)"), ("ZW", "Zespół-W (Wykonawca)")]
PMS = ["PM000", "PM100", "PM200", "PM300"]
SCOPES = ["Roboty", "Dostawa", "Projekt", "Kamień milowy", "Rozruch"]
UNITS = ["Blok 1", "Blok 2", "Wspólne"]
PRIOS = ["Krytyczny", "Wysoki", "Normalny", "Niski"]
LEVELS = ["L1 – kamień milowy kontraktowy", "L2 – kamień milowy obiektowy", "L3 – aktywność"]
PACKAGES = [f"Pakiet {c}" for c in "ABCDEFGH"]

# ---------- obiekty ----------
objects = []; proj_of_area = {}
projects = [dict(id=100001, short="PL5001-SE-01", name="PL5001 – Wyspa mocy (SE-01)", areas=["Wyspa turbinowa", "Wyspa kotłowa"]),
            dict(id=100002, short="PL5001-SE-02", name="PL5001 – Chłodzenie i elektryka (SE-02)", areas=["Układ chłodzenia", "Układ elektryczny"]),
            dict(id=100003, short="PL5001-SE-03", name="PL5001 – AKPiA i infrastruktura (SE-03)", areas=["Automatyka i AKPiA", "Infrastruktura i BOP"])]
for p in projects:
    for a in p["areas"]: proj_of_area[a] = p
kks = 0
for area, _ in AREAS:
    for nm in OBJ_NAMES[area]:
        kks += 1
        code = f"{R.randint(10,30)}{''.join(R.choice('ABCDEFGHKLMNPQRSTUWXY') for _ in range(2))}{R.randint(10,99)}"
        while any(o['code'] == code for o in objects): code = f"{R.randint(10,30)}{''.join(R.choice('ABCDEFGHKLMNPQRSTUWXY') for _ in range(2))}{R.randint(10,99)}"
        objects.append(dict(code=code, name=nm, area=area, proj=proj_of_area[area], contractor=R.choice(CONTRACTORS), owner=R.choice(OWNERS),
                            unit=R.choices(UNITS, [3, 3, 2])[0], pkg=R.choice(PACKAGES), start=R.randint(0, 120)))

# ---------- zadania ----------
T = []   # kazde: dict
def add(o, name, phase, pkg, dur, ttype="TT_Task", preds=None, wbs=None, disc="Mechaniczna", minstart=0, scope="Roboty", level=2):
    t = dict(i=len(T), obj=o, name=name, phase=phase, dur=float(dur), type=ttype, preds=preds or [], wbs=wbs, disc=disc, minstart=minstart, scope=scope, level=level)
    T.append(t); return t["i"]

def build(o):
    c = o["code"]; s0 = o["start"]
    ph = lambda p: (p,)
    d1 = add(o, f"Projekt wykonawczy – {o['name']}", 0, "Dokumentacja", R.randint(40, 120), minstart=s0, wbs=("Projektowanie", "Dokumentacja"), disc="Budowlana", scope="Projekt")
    d2 = add(o, "Uzgodnienie dokumentacji z Inwestorem", 0, "Dokumentacja", R.randint(10, 30), preds=[(d1, "PR_FS", 0)], wbs=("Projektowanie", "Dokumentacja"), disc="Budowlana", scope="Projekt")
    d3 = add(o, "Zatwierdzenie dokumentacji do realizacji", 0, "Dokumentacja", R.randint(5, 15), preds=[(d2, "PR_FS", 0)], wbs=("Projektowanie", "Dokumentacja"), disc="Budowlana", scope="Projekt")
    dm = add(o, f"KM: Dokumentacja zatwierdzona – {o['name']}", 0, "Dokumentacja", 0, "TT_Mile", [(d3, "PR_FS", 0)], ("Projektowanie", "Dokumentacja"), "Budowlana", scope="Kamień milowy", level=1)
    p1 = add(o, "Zapytanie ofertowe", 1, "Zakupy", R.randint(15, 30), preds=[(d1, "PR_SS", 20)], wbs=("Zakupy", "Zamówienia"), scope="Dostawa")
    p2 = add(o, "Analiza i wybór ofert", 1, "Zakupy", R.randint(10, 20), preds=[(p1, "PR_FS", 0)], wbs=("Zakupy", "Zamówienia"), scope="Dostawa")
    p3 = add(o, "Zawarcie umowy / zamówienie", 1, "Zakupy", R.randint(5, 10), preds=[(p2, "PR_FS", 0), (dm, "PR_SS", 0)], wbs=("Zakupy", "Zamówienia"), scope="Dostawa", level=1)
    p4 = add(o, "Produkcja u dostawcy", 1, "Zakupy", R.randint(60, 300), preds=[(p3, "PR_FS", 0)], wbs=("Zakupy", "Dostawy"), scope="Dostawa")
    p5 = add(o, "Testy FAT", 1, "Zakupy", R.randint(3, 10), preds=[(p4, "PR_FS", 0)], wbs=("Zakupy", "Dostawy"), scope="Dostawa")
    p6 = add(o, "Transport i dostawa na plac budowy", 1, "Zakupy", R.randint(10, 40), preds=[(p5, "PR_FS", 0)], wbs=("Zakupy", "Dostawy"), scope="Dostawa")
    pm = add(o, f"KM: Dostawa na budowę – {o['name']}", 1, "Zakupy", 0, "TT_Mile", [(p6, "PR_FS", 0)], ("Zakupy", "Dostawy"), scope="Kamień milowy", level=1)
    f = add(o, "Fundamenty i roboty ziemne", 2, "Roboty budowlane", R.randint(20, 60), preds=[(p3, "PR_FS", R.randint(0, 20))], wbs=("Budowa", "Roboty budowlane"), disc="Budowlana")
    k = add(o, "Montaż konstrukcji stalowych", 2, "Montaż", R.randint(15, 50), preds=[(f, "PR_FS", 0)], wbs=("Budowa", "Montaż"))
    u = add(o, "Montaż urządzeń głównych", 2, "Montaż", R.randint(20, 70), preds=[(k, "PR_FS", 0), (pm, "PR_FS", 0)], wbs=("Budowa", "Montaż"))
    n = R.randint(8, 28); last_prefab = None; tests = []
    for s in range(1, n + 1):
        sec = f"Sekcja {s:02d}"; sub = ("Budowa", "Rurociągi", sec) + ((f"Podsekcja {s:02d}.A",) if s % 3 == 0 else ())
        pf = add(o, f"Prefabrykacja rurociągów – {sec}", 2, "Rurociągi", round(R.uniform(3, 15), 1), preds=[(f, "PR_FS", 0)] + ([(last_prefab, "PR_SS", 5)] if last_prefab is not None else []), wbs=sub, disc="Rurociągi")
        last_prefab = pf
        ins = add(o, f"Montaż rurociągów – {sec}", 2, "Rurociągi", round(R.uniform(5, 25), 1), preds=[(pf, "PR_FS", 0), (u, "PR_SS", R.randint(0, 10))], wbs=sub, disc="Rurociągi")
        ts = add(o, f"Próba ciśnieniowa – {sec}", 2, "Rurociągi", R.randint(2, 6), preds=[(ins, "PR_FS", 0)], wbs=sub, disc="Rurociągi")
        iz = add(o, f"Izolacje – {sec}", 2, "Rurociągi", R.randint(3, 12), preds=[(ts, "PR_FS", 0)], wbs=sub, disc="Rurociągi")
        pa = add(o, f"Malowanie i oznakowanie – {sec}", 2, "Rurociągi", R.randint(2, 8), preds=[(iz, "PR_FF", 2)], wbs=sub, disc="Rurociągi")
        tests.append(pa)
        if s % 2 == 0:
            kb = add(o, f"Układanie kabli – trasa {s:02d}", 2, "Elektryka", R.randint(4, 20), preds=[(u, "PR_SS", 10)], wbs=("Budowa", "Elektryka"), disc="Elektryczna")
            kc = add(o, f"Podłączenia i pomiary – trasa {s:02d}", 2, "Elektryka", R.randint(3, 10), preds=[(kb, "PR_FF", 0)], wbs=("Budowa", "Elektryka"), disc="Elektryczna")
            tests.append(kc)
    ar = add(o, "Montaż układów AKPiA", 2, "AKPiA", R.randint(10, 40), preds=[(u, "PR_SS", 5)], wbs=("Budowa", "AKPiA"), disc="AKPiA"); tests.append(ar)
    bm = add(o, f"KM: Zakończenie montażu – {o['name']}", 2, "Montaż", 0, "TT_Mile", [(x, "PR_FS", 0) for x in tests[-4:]] + [(u, "PR_FS", 0)], ("Budowa", "Montaż"), scope="Kamień milowy", level=2)
    r1 = add(o, "Przegląd gotowości do rozruchu", 3, "Rozruch", R.randint(3, 8), preds=[(bm, "PR_FS", 0)] + [(x, "PR_FS", 0) for x in tests[:3]], wbs=("Rozruch", "Rozruch"), disc="Rozruch", scope="Rozruch")
    r2 = add(o, "Rozruch na zimno", 3, "Rozruch", R.randint(5, 15), preds=[(r1, "PR_FS", 0)], wbs=("Rozruch", "Rozruch"), disc="Rozruch", scope="Rozruch")
    r3 = add(o, "Rozruch na gorąco / próby ruchowe", 3, "Rozruch", R.randint(10, 25), preds=[(r2, "PR_FS", 0)], wbs=("Rozruch", "Rozruch"), disc="Rozruch", scope="Rozruch")
    ro = add(o, f"KM: Odbiór końcowy – {o['name']}", 3, "Rozruch", 0, "TT_FinMile", [(r3, "PR_FS", 0)], ("Rozruch", "Rozruch"), disc="Rozruch", scope="Kamień milowy", level=1)
    o["first"] = d1; o["dm"] = dm; o["pm"] = pm; o["ro"] = ro; o["order"] = p3

for o in objects: build(o)
# relacje miedzyobiektowe i kamienie milowe projektu
for idx, o in enumerate(objects):
    for _ in range(R.choice([1, 1, 2])):
        src = R.choice(objects[:idx]) if idx else None
        if src: T[o["order"]]["preds"].append((src["dm"], R.choice(["PR_FS", "PR_FS", "PR_SS", "PR_SF"]), R.randint(0, 15)))
root_ms = {}
for p in projects:
    objs = [o for o in objects if o["proj"] is p]
    pid = add(objs[0], f"KM: Zakończenie rozruchu – {p['short']}", 3, "Kamienie milowe", 0, "TT_FinMile", [(o["ro"], "PR_FS", 0) for o in objs], ("Rozruch", "Kamienie milowe"), disc="Rozruch", scope="Kamień milowy", level=1)
    root_ms[p["id"]] = pid
add(objects[0], "KM: Synchronizacja bloku z siecią", 3, "Kamienie milowe", 0, "TT_Mile", [(root_ms[p["id"]], "PR_FS", 10) for p in projects], ("Rozruch", "Kamienie milowe"), disc="Rozruch", scope="Kamień milowy", level=1)
T[-1]["obj"] = objects[0]  # w projekcie 1
N = len(T)

# kody aktywnosci (przypisanie na zadanie)
for t in T:
    o = t["obj"]
    t["pp"] = R.choices(PMS, [94, 2, 2, 2])[0]
    t["team"] = R.choices([x[0] for x in TEAMS], [3, 3, 40, 54])[0] if t["pp"] == "PM000" else R.choice(["ZI", "ZE"])
    t["prio"] = R.choices(PRIOS, [4, 15, 71, 10])[0]
    t["calid"] = R.choices([201, 202], [92, 8])[0]
    t["pkg"] = o["pkg"]; t["rev"] = R.choice(["A", "B", "C"]) if R.random() < .3 else None
    if t["type"] != "TT_Task": t["dur"] = 0.0

def cpm(freeze=None, extra_min=None, drop=()):
    """przebieg w przod; freeze: {i:(es,ef)} zadania z faktycznymi datami; extra_min: {i:min_es}"""
    ES = [0.0] * N; EF = [0.0] * N
    for t in T:
        i = t["i"]
        if freeze and i in freeze: ES[i], EF[i] = freeze[i]; continue
        es = float(t["minstart"]);
        if extra_min and i in extra_min: es = max(es, extra_min[i])
        d = t["dur"]
        for (p, ty, lag) in t["preds"]:
            if p in drop: continue
            if ty == "PR_FS": es = max(es, EF[p] + lag)
            elif ty == "PR_SS": es = max(es, ES[p] + lag)
            elif ty == "PR_FF": es = max(es, EF[p] + lag - d)
            else: es = max(es, ES[p] + lag - d)
        ES[i] = es; EF[i] = es + d
    return ES, EF
def backward(ES, EF):
    end = max(EF); LF = [end] * N; LS = [end] * N
    for t in reversed(T):
        i = t["i"]; lf = end
        for s in succ[i]:
            ty, lag, j = s
            if ty == "PR_FS": lf = min(lf, LS[j] - lag)
            elif ty == "PR_SS": lf = min(lf, LS[j] - lag + T[i]["dur"])
            elif ty == "PR_FF": lf = min(lf, LF[j] - lag)
            else: lf = min(lf, LF[j] - lag + T[i]["dur"])
        LF[i] = lf; LS[i] = lf - T[i]["dur"]
    return LS, LF
succ = [[] for _ in range(N)]
for t in T:
    for (p, ty, lag) in t["preds"]: succ[p].append((ty, lag, t["i"]))

TES, TEF = cpm()                       # baza (target)
def snapshot(dd, slip_set, prev=None):
    """status i daty biezace dla daty statusu dd; slip_set: {i: min_es} dodatkowe poslizgi"""
    ddw = date2wd(dd); st = {}; freeze = {}; act = {}
    for t in T:
        i = t["i"]
        if prev is not None and prev["st"][i] == "TK_Complete":
            st[i] = "TK_Complete"; freeze[i] = prev["fr"][i]; act[i] = prev["act"][i]; continue
        base_s, base_e = TES[i], TEF[i]
        if base_e + R.randint(-2, 3) <= ddw and (R.random() < .93 or prev is not None):
            js = R.randint(-1, 3); a_s = max(0, base_s + js); a_e = a_s + t["dur"] + R.randint(0, 3) * (t["dur"] > 0)
            if a_e > ddw: a_e = float(ddw); a_s = min(a_s, a_e)
            st[i] = "TK_Complete"; freeze[i] = (a_s, a_e); act[i] = (a_s, a_e)
        elif base_s <= ddw and R.random() < .9 and t["dur"] > 0:
            a_s = max(0, base_s + R.randint(0, 4)); a_s = min(a_s, ddw)
            st[i] = "TK_Active"; act[i] = (a_s, None)
            rem = max(1.0, round(t["dur"] * R.uniform(.1, .9), 1)); freeze[i] = (a_s, ddw + rem)
        else: st[i] = "TK_NotStart"
    em = {i: max(ddw, slip_set.get(i, 0)) for i in range(N) if st[i] == "TK_NotStart"}
    for i, v in slip_set.items():
        if st[i] == "TK_NotStart": em[i] = max(em.get(i, 0), v, ddw)
    ES, EF = cpm(freeze, em)
    return dict(st=st, fr=freeze, act=act, ES=ES, EF=EF, dd=dd)
# poslizgi bazowe: ok. 7% niezaczetych zadan "w tyle" (w Rev0G)
ddw0 = date2wd(DD_G)
slipG = {t["i"]: ddw0 + R.randint(3, 25) for t in T if R.random() < .07 and t["dur"] > 0}
G = snapshot(DD_G, slipG)
# Rev0H: tydzien pozniej, dodatkowe poslizgi ~70 zadan w zakresie
def in_scope(t): return t["pp"] in ("PM100", "PM200", "PM300") or t["team"] in ("ZI", "ZE")
cand = [t["i"] for t in T if in_scope(t) and G["st"][t["i"]] == "TK_NotStart" and t["dur"] > 0]
R2 = random.Random(SEED + 1)
shifted = R2.sample(cand, min(70, len(cand)))
ddH = date2wd(DD_H)
slipH = dict(slipG)
for i in shifted: slipH[i] = int(G["ES"][i]) + R2.randint(5, 40)
H = snapshot(DD_H, slipH, prev=G)

# ---------- zapis XER ----------
W = {}  # wbs
wbs_rows = []; wid = [7000000]
def new_wbs(pid, parent, name, short, node=False, seq=0):
    wid[0] += R.randint(1, 7); wbs_rows.append(dict(wbs_id=wid[0], proj_id=pid, parent=parent, name=name, short=short, node=node, seq=seq)); return wid[0]
proj_root = {}
for p in projects:
    proj_root[p["id"]] = new_wbs(p["id"], "", p["name"], p["short"], True)
for o in objects:
    pid = o["proj"]["id"]; area_key = (pid, o["area"])
    if area_key not in W: W[area_key] = new_wbs(pid, proj_root[pid], o["area"], o["area"][:12].upper().replace(" ", "_"))
    ow = new_wbs(pid, W[area_key], f"{o['code']} – {o['name']}", o["code"]); o["wbs"] = ow
    for ph in PHASES: W[(o["code"], ph)] = new_wbs(pid, ow, ph, ph[:4].upper())
def wbs_for(t):
    o = t["obj"]; path = t["wbs"]; key = (o["code"],) + tuple(path)
    if key in W: return W[key]
    parent = W[(o["code"], path[0])]
    for depth in range(1, len(path)):
        k = (o["code"],) + tuple(path[:depth + 1])
        if k not in W: W[k] = new_wbs(o["proj"]["id"], parent, path[depth], path[depth][:10].upper())
        parent = W[k]
    return parent

# kody
ACT_TYPES = [("AC_Wykonawca", [c for c in CONTRACTORS]), ("AC_Obiekt", [f"{o['code']} {o['name']}" for o in objects]), ("AC_Dyscyplina", DISC), ("AC_Faza", PHASES),
             ("AC_Zakres", SCOPES), ("AC_Opiekun", OWNERS), ("AC_Obszar", [a for a, _ in AREAS]), ("AC_PP_PM", PMS), ("AC_Zespol", [x[1] for x in TEAMS]),
             ("AC_Blok", UNITS), ("AC_Priorytet", PRIOS), ("AC_Pakiet", PACKAGES), ("AC_Poziom", LEVELS)]
TYPE_ID = {}; CODE_ID = {}; code_rows = []; cid = 5000
for ti, (tn, vals) in enumerate(ACT_TYPES, start=1):
    TYPE_ID[tn] = 300 + ti
    for si, v in enumerate(vals):
        cid += R.randint(1, 4); CODE_ID[(tn, v)] = cid; code_rows.append((cid, TYPE_ID[tn], v, v.split(" ")[0][:8], si))
team_name = dict(TEAMS)
def codes_for(t):
    o = t["obj"]
    return [("AC_Wykonawca", o["contractor"]), ("AC_Obiekt", f"{o['code']} {o['name']}"), ("AC_Dyscyplina", t["disc"]), ("AC_Faza", PHASES[t["phase"]]), ("AC_Zakres", t["scope"]),
            ("AC_Opiekun", o["owner"]), ("AC_Obszar", o["area"]), ("AC_PP_PM", t["pp"]), ("AC_Zespol", team_name[t["team"]]), ("AC_Blok", o["unit"]),
            ("AC_Priorytet", t["prio"]), ("AC_Pakiet", t["pkg"]), ("AC_Poziom", LEVELS[t["level"] - 1])]

# task_id/guid/task_code
tid0 = 412000000; seq = {}
for t in T:
    tid0 += R.randint(3, 40); t["id"] = tid0; t["guid"] = guid()
    o = t["obj"]; seq[o["code"]] = seq.get(o["code"], 0) + 1; t["code"] = f"{o['code']}-{seq[o['code']]:03d}"
wbs_ids = {}
for t in T: t["wbsid"] = wbs_for(t)

def hrs(x): return round(x * 8, 1)
def tfmt(wd, hh): return fmt(wd2date(wd), hh)
def write_xer(path, snap, extra_tasks=(), removed=()):
    global R
    R = random.Random(SEED + 99)
    dd = snap["dd"]; L = []; P = lambda *a: L.append("\t".join(a))
    def tab(name, fields, rows):
        P("%T", name); P("%F", *fields)
        for r in rows: P("%R", *[("" if v is None else str(v)) for v in r])
    P("ERMHDR", "19.12", f"{dd:%Y-%m-%d}", "Project", "synthetic", "SYNTH_DB", "projmgmt", "Project Management", "USD")
    tab("CURRTYPE", ["curr_id", "decimal_digit_cnt", "curr_symbol", "decimal_symbol", "digit_group_symbol", "pos_curr_fmt_type", "neg_curr_fmt_type", "curr_type", "curr_short_name", "group_digit_cnt", "base_exch_rate"], [[1, 2, "$", ",", ".", "#1.1", "(#1.1)", "Dolar", "USD", 3, 1]])
    tab("OBS", ["obs_id", "seq_num", "obs_name", "obs_descr"], [[100, 0, "Struktura organizacyjna (synt.)", ""]])
    tab("UDFTYPE", ["udf_type_id", "table_name", "udf_type_name", "udf_type_label", "logical_data_type", "super_flag"], [[901, "TASK", "UD_Uwagi", "Uwagi harmonogramisty", "FT_TEXT", "N"], [902, "TASK", "UD_Rewizja", "Rewizja dokumentu", "FT_TEXT", "N"]])
    tab("PROJECT", ["proj_id", "proj_short_name", "clndr_id", "plan_start_date", "scd_end_date", "last_recalc_date", "add_date", "def_duration_type", "task_code_prefix", "guid", "def_complete_pct_type", "def_cost_per_qty", "task_code_base", "task_code_step", "critical_path_type"],
        [[p["id"], p["short"], 201, tfmt(0, "07:00"), tfmt(int(max(snap["EF"]) + 1), "15:00"), f"{dd:%Y-%m-%d} 06:00", "2025-01-06 08:00", "DT_FixedDUR2", "", guid(), "CP_Drtn", num(1.0 if False else 0.0), 1, 10, "CT_TotFloat"] for p in projects])
    cal = lambda i, n, d, w: [i, "Y" if i == 201 else "N", n, "2025-01-06 08:00", "CA_Base", d, w, w * 4, w * 52, "N", "(0||CalendarData()(0||DaysOfWeek()())"]
    tab("CALENDAR", ["clndr_id", "default_flag", "clndr_name", "last_chng_date", "clndr_type", "day_hr_cnt", "week_hr_cnt", "month_hr_cnt", "year_hr_cnt", "rsrc_private", "clndr_data"], [cal(201, "Kalendarz 5-dniowy", 8, 40), cal(202, "Kalendarz 6-dniowy", 8, 48)])
    tab("PROJWBS", ["wbs_id", "proj_id", "obs_id", "seq_num", "est_wt", "proj_node_flag", "sum_data_flag", "status_code", "wbs_short_name", "wbs_name", "parent_wbs_id", "guid"],
        [[w["wbs_id"], w["proj_id"], 100, w["seq"], 1, "Y" if w["node"] else "N", "Y", "WS_Open", w["short"], w["name"], w["parent"], guid()] for w in wbs_rows])
    tab("ACTVTYPE", ["actv_code_type_id", "actv_short_len", "seq_num", "actv_code_type", "actv_code_type_scope"], [[TYPE_ID[n], 8, i, n, "AS_Global"] for i, (n, _) in enumerate(ACT_TYPES)])
    rows = []
    for t in T:
        i = t["id"]; k = t["i"]; st = snap["st"][k]; ES, EF = snap["ES"][k], snap["EF"][k]
        d = hrs(t["dur"]); a = snap["act"].get(k)
        rem = 0 if st == "TK_Complete" else (hrs(EF - ES) if st == "TK_NotStart" else hrs(EF - date2wd(dd)))
        lsv = snap["LS"][k]; tf = hrs(lsv - ES)
        rows.append([t["id"], t["obj"]["proj"]["id"], t["wbsid"], t["calid"], 0 if st != "TK_Complete" else 100, "N", 1, "N", "Y", "CP_Drtn", t["type"], "DT_FixedDUR2", st, t["code"], t["name"], "", tf, 0, rem, 0, 0, 0, d, 0, 0, 0,
            tfmt(snap["LS"][k], "07:00"), tfmt(max(snap["LF"][k] - 1, snap["LS"][k]) if t["dur"] else snap["LS"][k], "15:00"),
            tfmt(ES, "07:00"), tfmt(max(EF - 1, ES) if t["dur"] else ES, "15:00"),
            tfmt(date2wd(dd), "07:00") if st != "TK_Complete" else "", tfmt(EF - 1 if t["dur"] else EF, "15:00") if st != "TK_Complete" else "",
            tfmt(TES[k], "07:00"), tfmt(max(TEF[k] - 1, TES[k]) if t["dur"] else TES[k], "15:00"),
            tfmt(a[0], "07:00") if a else "", tfmt(a[1] - 1 if a[1] else 0, "15:00") if (a and a[1] is not None) else "",
            "CS_MSOA" if t["minstart"] and st == "TK_NotStart" and t["i"] == [x for x in T if x["obj"] is t["obj"]][0]["i"] else "", "PT_Normal", t["guid"]])
    tab("TASK", ["task_id", "proj_id", "wbs_id", "clndr_id", "phys_complete_pct", "rev_fdbk_flag", "est_wt", "lock_plan_flag", "auto_compute_act_flag", "complete_pct_type", "task_type", "duration_type", "status_code", "task_code", "task_name", "rsrc_id", "total_float_hr_cnt", "free_float_hr_cnt", "remain_drtn_hr_cnt", "act_work_qty", "remain_work_qty", "target_work_qty", "target_drtn_hr_cnt", "target_equip_qty", "act_equip_qty", "remain_equip_qty",
        "late_start_date", "late_end_date", "early_start_date", "early_end_date", "restart_date", "reend_date", "target_start_date", "target_end_date", "act_start_date", "act_end_date", "cstr_type", "priority_type", "guid"],
        [[num(v) for v in r] for r in rows])
    tab("ACTVCODE", ["actv_code_id", "actv_code_type_id", "actv_code_name", "short_name", "seq_num", "color", "total_assignments"], [list(r[:2]) + [r[2], r[3], r[4], "", ""] for r in code_rows])
    pr = []; pid = 900000000
    for t in T:
        for (p, ty, lag) in t["preds"]:
            pid += R.randint(1, 9); pr.append([pid, t["id"], T[p]["id"], t["obj"]["proj"]["id"], T[p]["obj"]["proj"]["id"], ty, num(hrs(lag)), "", ""])
    tab("TASKPRED", ["task_pred_id", "task_id", "pred_task_id", "proj_id", "pred_proj_id", "pred_type", "lag_hr_cnt", "aref", "arls"], pr)
    tab("TASKACTV", ["task_id", "actv_code_type_id", "actv_code_id", "proj_id"], [[t["id"], TYPE_ID[tn], CODE_ID[(tn, v)], t["obj"]["proj"]["id"]] for t in T for tn, v in codes_for(t)])
    uv = []
    for t in T:
        if R.random() < .25: uv.append([901, t["id"], t["obj"]["proj"]["id"], R.choice(["Do weryfikacji z wykonawcą", "Uzgodnione na koordynacji", "Czeka na dostawę", "Ryzyko opóźnienia", "Bez uwag"])])
        if t["rev"]: uv.append([902, t["id"], t["obj"]["proj"]["id"], "Rev " + t["rev"]])
    tab("UDFVALUE", ["udf_type_id", "fk_id", "proj_id", "udf_text"], uv)
    L.append("%E")
    with open(path, "w", encoding="cp1250", newline="") as f: f.write("\r\n".join(L) + "\r\n")
    return dict(tasks=len(rows), preds=len(pr), taskactv=sum(len(codes_for(t)) for t in T), wbs=len(wbs_rows), udf=len(uv))

for s in (G, H):
    s["LS"], s["LF"] = backward(s["ES"], s["EF"])
statsG = write_xer(f"{OUT}/PL5001_SYNTH_schedule_Rev0G_DD30092026.xer", G)
statsH = write_xer(f"{OUT}/PL5001_SYNTH_schedule_Rev0H_DD07102026.xer", H)

# ---------- przesuniecia (oczekiwane) ----------
def d_(wd, end=False): return wd2date(wd - 1 if end else wd).isoformat()
shifts = []
for t in T:
    k = t["i"]
    if not in_scope(t) or t["dur"] == 0 and False: continue
    if G["st"][k] == "TK_Complete" and H["st"][k] == "TK_Complete": continue
    de = H["EF"][k] - G["EF"][k]
    if abs(de) >= 1:
        o = t["obj"]
        shifts.append(dict(task_code=t["code"], task_name=t["name"], object=f"{o['code']} {o['name']}", owner=o["owner"], contractor=o["contractor"],
                           old_end=wd2date(max(G["EF"][k] - 1, G["ES"][k])).isoformat(), new_end=wd2date(max(H["EF"][k] - 1, H["ES"][k])).isoformat(), delta_wd=round(de, 1),
                           baseline_end=wd2date(max(TEF[k] - 1, TES[k])).isoformat(), root_cause=(k in shifted)))
shifts.sort(key=lambda s: -s["delta_wd"])
json.dump(shifts, open(f"{OUT}/expected_shifts.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)

# delta (przyklad eksportu: tylko zaakceptowane, nowe terminy jako ograniczenie 'start nie wczesniej')
acc = [s for s in shifts if s["root_cause"]][:25]
code2t = {t["code"]: t for t in T}
L = ["ERMHDR\t19.12\t2026-10-07\tProject\tsynthetic\tSYNTH_DB\tprojmgmt\tProject Management\tUSD", "%T\tTASK", "%F\ttask_id\tproj_id\ttask_code\tguid\tcstr_type\tcstr_date\ttask_name"]
for s in acc:
    t = code2t[s["task_code"]]; k = t["i"]
    L.append("%R\t" + "\t".join([str(t["id"]), str(t["obj"]["proj"]["id"]), t["code"], t["guid"], "CS_MSOA", fmt(wd2date(H["ES"][k]), "07:00"), t["name"]]))
L.append("%E")
open(f"{OUT}/PL5001_SYNTH_delta_export_sample.xer", "w", encoding="cp1250", newline="").write("\r\n".join(L) + "\r\n")

# ---------- JSON dla aplikacji ----------
scope_ids = [t for t in T if in_scope(t)]
def tjson(t, snap):
    k = t["i"]; o = t["obj"]
    return dict(id=t["id"], code=t["code"], guid=t["guid"], name=t["name"], type=t["type"], status=snap["st"][k], objectCode=o["code"], wbsId=t["wbsid"], projId=o["proj"]["id"],
                phase=PHASES[t["phase"]], discipline=t["disc"], scope=t["scope"], pp=t["pp"], team=t["team"], priority=t["prio"],
                baselineStart=wd2date(TES[k]).isoformat(), baselineEnd=wd2date(max(TEF[k] - 1, TES[k])).isoformat(),
                start=wd2date(snap["ES"][k]).isoformat(), end=wd2date(max(snap["EF"][k] - 1, snap["ES"][k])).isoformat(),
                durationDays=t["dur"], floatDays=round(snap["LS"][k] - snap["ES"][k], 1),
                predecessors=[dict(code=T[p]["code"], type=ty, lagDays=lag) for p, ty, lag in t["preds"]])
objs_json = []
for o in objects:
    ts = [t for t in T if t["obj"] is o]
    done = sum(1 for t in ts if G["st"][t["i"]] == "TK_Complete") / len(ts)
    late = [t for t in ts if G["EF"][t["i"]] - TEF[t["i"]] >= 5]
    objs_json.append(dict(code=o["code"], name=o["name"], area=o["area"], project=o["proj"]["short"], contractor=o["contractor"], owner=o["owner"], unit=o["unit"], package=o["pkg"],
                          taskCount=len(ts), percentComplete=round(done * 100, 1), delayedTasks=len(late), maxDelayDays=round(max([G["EF"][t["i"]] - TEF[t["i"]] for t in ts] + [0]), 1)))
users = [dict(id="u-admin", name="Administrator systemu", role="admin")] + \
        [dict(id=f"u-own-{i}", name=n, role="owner", objects=[o["code"] for o in objects if o["owner"] == n]) for i, n in enumerate(OWNERS)] + \
        [dict(id="u-dir", name="Zofia Nowicka (dyrekcja)", role="director"), dict(id="u-pur", name="Rafał Pawlak (zakupy)", role="purchaser"), dict(id="u-plan", name="Barbara Sadowska (harmonogramista)", role="planner"), dict(id="u-kier", name="Jan Kruk (kierownik budowy)", role="manager")]
app = dict(meta=dict(generator="generate.py", seed=SEED, dataDateG=DD_G.isoformat(), dataDateH=DD_H.isoformat(), note="DANE W PELNI SYNTETYCZNE – brak zwiazku z rzeczywistym projektem", scopeRule="pp in PM100/200/300 OR team in ZI/ZE"),
           users=users, objects=objs_json, projects=[dict(id=p["id"], short=p["short"], name=p["name"]) for p in projects],
           contractors=CONTRACTORS, tasksScopeRev0G=[tjson(t, G) for t in scope_ids], tasksScopeRev0H=[tjson(t, H) for t in scope_ids],
           purchasingSteps=["Specyfikacja techniczna", "Zapytanie ofertowe", "Analiza ofert", "Negocjacje", "Umowa / zamówienie", "Produkcja i FAT", "Dostawa"])
json.dump(app, open(f"{OUT}/app-data.json", "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
stats = dict(seed=SEED, projects=len(projects), objects=len(objects), tasks=N, inScope=len(scope_ids), inScopePct=round(100 * len(scope_ids) / N, 1), xerRev0G=statsG, xerRev0H=statsH,
             statusG={s: sum(1 for v in G["st"].values() if v == s) for s in ("TK_Complete", "TK_Active", "TK_NotStart")},
             shifts=len(shifts), rootShifts=sum(1 for s in shifts if s["root_cause"]), deltaRows=len(acc),
             relTypes={ty: sum(1 for t in T for _, x, _ in t["preds"] if x == ty) for ty in ("PR_FS", "PR_SS", "PR_FF", "PR_SF")}, maxWbsDepth=max(len(t["wbs"]) for t in T) + 2)
json.dump(stats, open(f"{OUT}/stats.json", "w"), indent=1); print(json.dumps(stats, indent=1))
