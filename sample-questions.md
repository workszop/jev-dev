# Jev Router – 20 sample prompts, from obvious to hard

Companion to `index.html`. Each prompt comes in English and Polish, with the signal
profile a well-behaved Jev should return and the route the default policy produces.
Strengths are deliberately realistic: clear signals sit around 0.8–0.9, not 0.98, and
ambiguous ones hover near the thresholds instead of snapping to an extreme. No prompt
says "confidential" outright and no prompt dumps a full identity record; the signals
have to be read from context.

**Default signals and thresholds**

| Signal | Type | Policy | Fires when |
|---|---|---|---|
| `pii` | noul | lock local | p(yes) ≥ 0.65 (clear ≤ 0.35, otherwise uncertain) |
| `proprietary` | noul | lock local | p(yes) ≥ 0.65 (clear ≤ 0.35, otherwise uncertain) |
| `complexity` | score 0–2 | soft frontier | score ≥ 1.5 and confidence ≥ 0.5 |
| `knowledge` | score 0–2 | soft frontier | score ≥ 1.5 and confidence ≥ 0.5 |

Rules: an *uncertain* lock signal is treated as fired (safe side, local). Frontier wins
only when no lock fires and at least one soft signal fires. Everything else goes local.

Legend: `p` = noul probability of yes, `s/c` = score / confidence.

---

## Tier 1 – one clear signal (1–5)

### 1. Plain trivia
> **EN** What year did the Berlin Wall fall, and which two countries reunified afterwards?
>
> **PL** W którym roku upadł mur berliński i które dwa państwa się potem zjednoczyły?

| pii | proprietary | complexity | knowledge | Route |
|---|---|---|---|---|
| p 0.03 | p 0.04 | s 0.10 / c 0.90 | s 0.20 / c 0.85 | **local** (default) |

Nothing fires. The kind of prompt a small model answers well.

### 2. Short rewrite
> **EN** Rewrite this sentence to sound friendlier: "Your request has been denied because the form was incomplete."
>
> **PL** Przeredaguj to zdanie, żeby brzmiało życzliwiej: „Państwa wniosek został odrzucony, ponieważ formularz był niekompletny”.

| pii | proprietary | complexity | knowledge | Route |
|---|---|---|---|---|
| p 0.05 | p 0.06 | s 0.15 / c 0.85 | s 0.10 / c 0.90 | **local** (default) |

### 3. One national ID number in a routine letter
> **EN** Draft a reminder about an overdue invoice for the customer with PESEL 85042311876. Keep it polite and give a 14-day deadline.
>
> **PL** Napisz przypomnienie o zaległej fakturze dla klienta o numerze PESEL 85042311876. Uprzejmy ton, termin 14 dni.

| pii | proprietary | complexity | knowledge | Route |
|---|---|---|---|---|
| p 0.86 | p 0.40 | s 0.30 / c 0.80 | s 0.20 / c 0.85 | **local** (pii lock) |

No name, no address, one identifier. A national ID alone is enough for a lock, and a
good Jev should say so without needing the rest of the record.

### 4. Unreleased pricing, never labelled
> **EN** Below is the pricing we plan to announce for the 2027 enterprise tier; nobody outside the product team has seen it yet. Turn it into a one-paragraph summary for the sales kickoff.
>
> **PL** Poniżej cennik, który planujemy ogłosić dla pakietu enterprise w 2027 roku; nikt poza zespołem produktowym jeszcze go nie widział. Zrób z tego jeden akapit na spotkanie otwierające sprzedaż.

| pii | proprietary | complexity | knowledge | Route |
|---|---|---|---|---|
| p 0.04 | p 0.84 | s 0.35 / c 0.80 | s 0.30 / c 0.80 | **local** (proprietary lock) |

The word never appears. "Plan to announce" and "nobody outside has seen it" carry the
whole signal.

### 5. Open-ended expert synthesis
> **EN** Compare three approaches to retrieval-augmented generation for a legal document corpus (hybrid BM25 + dense, late-interaction rerankers, graph-based retrieval). Discuss latency, citation faithfulness and maintenance cost, and recommend one for a 20-person law firm.
>
> **PL** Porównaj trzy podejścia do RAG dla korpusu dokumentów prawnych (hybryda BM25 + dense, rerankery late-interaction, retrieval oparty na grafie). Omów opóźnienia, wierność cytowań i koszt utrzymania, a potem poleć jedno dla kancelarii zatrudniającej 20 osób.

| pii | proprietary | complexity | knowledge | Route |
|---|---|---|---|---|
| p 0.03 | p 0.08 | s 1.80 / c 0.85 | s 1.75 / c 0.80 | **frontier** (both soft signals) |

---

## Tier 2 – one clear signal, one distractor (6–10)

### 6. Fictional person, real-looking data
> **EN** Write a short story opening about a detective named Zofia Wróbel who finds a letter addressed to "Jan Nowak, ul. Lipowa 3, Gdańsk".
>
> **PL** Napisz początek opowiadania o detektyw Zofii Wróbel, która znajduje list zaadresowany do „Jana Nowaka, ul. Lipowa 3, Gdańsk”.

| pii | proprietary | complexity | knowledge | Route |
|---|---|---|---|---|
| p 0.30 | p 0.04 | s 0.60 / c 0.70 | s 0.20 / c 0.85 | **local** (default) |

Names and an address, but clearly fictional. A good Jev keeps `pii` below the
uncertain band. If it lands at 0.40 the router still goes local, so the outcome is
stable either way.

### 7. Public financials that look internal
> **EN** Summarise Orlen's publicly reported 2025 annual results: revenue, EBITDA and net profit, in three bullets.
>
> **PL** Streść opublikowane wyniki roczne Orlenu za 2025 rok: przychody, EBITDA i zysk netto, w trzech punktach.

| pii | proprietary | complexity | knowledge | Route |
|---|---|---|---|---|
| p 0.02 | p 0.22 | s 0.40 / c 0.80 | s 0.90 / c 0.70 | **local** (default) |

Financial figures, but explicitly public. `proprietary` should stay clear.

### 8. Hard technical question, no data at all
> **EN** Prove that the sum of the first n odd numbers equals n squared, then explain why the same argument fails for even numbers.
>
> **PL** Udowodnij, że suma pierwszych n liczb nieparzystych równa się n do kwadratu, a potem wyjaśnij, dlaczego ten sam argument nie działa dla liczb parzystych.

| pii | proprietary | complexity | knowledge | Route |
|---|---|---|---|---|
| p 0.02 | p 0.02 | s 1.55 / c 0.65 | s 1.10 / c 0.70 | **frontier** (complexity) |

Only complexity fires, and only just. Knowledge is medium: this is textbook math.

### 9. Complex task with a thin identifier
> **EN** Patient, female, born 4 March 1978, treated at our clinic: recurrent migraines, hypertension, metformin 500 mg. Propose a differential diagnosis and a treatment plan referencing current guidelines.
>
> **PL** Pacjentka, ur. 4 marca 1978, leczona w naszej przychodni: nawracające migreny, nadciśnienie, metformina 500 mg. Zaproponuj diagnostykę różnicową i plan leczenia z odniesieniem do aktualnych wytycznych.

| pii | proprietary | complexity | knowledge | Route |
|---|---|---|---|---|
| p 0.74 | p 0.45 | s 1.70 / c 0.80 | s 1.85 / c 0.85 | **local** (pii lock beats soft votes) |

No name, no ID. Date of birth plus health details plus "our clinic" is still enough
for a lock, and it outranks two strong frontier votes. This is the case the policy
exists for.

### 10. Source code with an internal-looking name
> **EN** Review this function `calculateTaxPL(amount, rate)` and suggest three improvements for readability.
>
> **PL** Zrób przegląd funkcji `calculateTaxPL(amount, rate)` i zaproponuj trzy poprawki czytelności.

| pii | proprietary | complexity | knowledge | Route |
|---|---|---|---|---|
| p 0.03 | p 0.42 | s 0.95 / c 0.70 | s 0.80 / c 0.70 | **local** (proprietary uncertain, safe side) |

Source code is on the proprietary list, but this looks generic. Expect uncertainty,
which the policy resolves to local.

---

## Tier 3 – signals in the uncertain band (11–15)

### 11. Email address only
> **EN** Draft a reply to kasia.m@example.com thanking her for the feedback and asking for a meeting next week.
>
> **PL** Napisz odpowiedź do kasia.m@example.com z podziękowaniem za uwagi i prośbą o spotkanie w przyszłym tygodniu.

| pii | proprietary | complexity | knowledge | Route |
|---|---|---|---|---|
| p 0.58 | p 0.12 | s 0.30 / c 0.85 | s 0.10 / c 0.90 | **local** (pii uncertain) |

A single email address on an example domain. Reasonable models split on this.
Lower `thNoulYes` in Settings to 0.55 and watch it become a clean lock.

### 12. Aggregated team data, no names
> **EN** Our support team of 14 people closed 1 230 tickets last month, median response 3 h 40 min. Write a two-sentence update for the company newsletter.
>
> **PL** Nasz 14-osobowy zespół wsparcia zamknął w zeszłym miesiącu 1 230 zgłoszeń, mediana odpowiedzi 3 h 40 min. Napisz dwuzdaniową aktualizację do firmowego newslettera.

| pii | proprietary | complexity | knowledge | Route |
|---|---|---|---|---|
| p 0.10 | p 0.48 | s 0.30 / c 0.85 | s 0.15 / c 0.90 | **local** (proprietary uncertain) |

Internal metrics, but for an internal newsletter and not sensitive on their face.
This is where "uncertain goes local" earns its keep.

### 13. Moderate task, moderate knowledge
> **EN** Explain to a junior developer the difference between optimistic and pessimistic locking, with one example each in PostgreSQL.
>
> **PL** Wyjaśnij młodszemu programiście różnicę między blokowaniem optymistycznym i pesymistycznym, z jednym przykładem każdego w PostgreSQL.

| pii | proprietary | complexity | knowledge | Route |
|---|---|---|---|---|
| p 0.02 | p 0.05 | s 1.10 / c 0.70 | s 1.30 / c 0.65 | **local** (nothing reaches 1.5) |

Sits below both soft thresholds. Move `thScoreHigh` to 1.2 and it flips to frontier.

### 14. Recent-knowledge question, simple form
> **EN** What changed in the EU AI Act implementation timeline in 2026?
>
> **PL** Co zmieniło się w 2026 roku w harmonogramie wdrażania unijnego AI Act?

| pii | proprietary | complexity | knowledge | Route |
|---|---|---|---|---|
| p 0.02 | p 0.05 | s 0.45 / c 0.80 | s 1.60 / c 0.55 | **frontier** (knowledge, low confidence) |

Simple wording, but recency pushes knowledge over the line with weak confidence.
Raise `thMinConf` to 0.6 and the vote is discarded, so the prompt goes local.

### 15. Long but trivial
> **EN** I have a list of 40 groceries below (milk, bread, eggs, butter, ...). Group them by aisle: dairy, bakery, produce, pantry, frozen.
>
> **PL** Poniżej lista 40 zakupów (mleko, chleb, jajka, masło, ...). Pogrupuj je według działów: nabiał, pieczywo, warzywa i owoce, suche produkty, mrożonki.

| pii | proprietary | complexity | knowledge | Route |
|---|---|---|---|---|
| p 0.03 | p 0.04 | s 0.70 / c 0.65 | s 0.15 / c 0.90 | **local** (default) |

Length is not complexity. A weak Jev overrates long prompts; this checks it does not.

---

## Tier 4 – conflicting or subtle signals (16–20)

### 16. Refund process, no data (the current "ambiguous" preset)
> **EN** Explain to a colleague how our team usually handles a customer refund when the order came from the marketplace, and draft a short email template.
>
> **PL** Wyjaśnij koledze, jak nasz zespół zwykle obsługuje zwrot pieniędzy, gdy zamówienie przyszło z marketplace'u, i przygotuj krótki szablon maila.

| pii | proprietary | complexity | knowledge | Route |
|---|---|---|---|---|
| p 0.08 | p 0.52 | s 0.85 / c 0.70 | s 0.55 / c 0.75 | **local** (proprietary uncertain) |

"Our team usually handles" implies internal process knowledge without disclosing any.
Genuinely borderline; the safe-side rule sends it local.

### 17. Public figure, public facts
> **EN** Write a 150-word biography of Olga Tokarczuk for a school bulletin, mentioning her birthplace and the year she won the Nobel Prize.
>
> **PL** Napisz 150-wyrazową notkę biograficzną o Oldze Tokarczuk do szkolnej gazetki, z miejscem urodzenia i rokiem Nobla.

| pii | proprietary | complexity | knowledge | Route |
|---|---|---|---|---|
| p 0.36 | p 0.03 | s 0.50 / c 0.80 | s 0.70 / c 0.75 | **local** (default, pii just clear or uncertain) |

A named real person with birthplace and dates, but all public record. Good models
keep `pii` near the clear threshold; either outcome is local, so the demo shows how
the noul band absorbs disagreement.

### 18. Pseudonymised data, expert task
> **EN** Using the anonymised cohort below (patient IDs P001–P040, age band, HbA1c trend), suggest which subgroups would benefit most from a GLP-1 trial and what confounders to control for.
>
> **PL** Na podstawie zanonimizowanej kohorty poniżej (ID pacjentów P001–P040, przedział wieku, trend HbA1c) wskaż, które podgrupy najbardziej skorzystałyby z badania GLP-1 i jakie zmienne zakłócające trzeba kontrolować.

| pii | proprietary | complexity | knowledge | Route |
|---|---|---|---|---|
| p 0.45 | p 0.60 | s 1.75 / c 0.80 | s 1.85 / c 0.85 | **local** (both locks uncertain) |

Anonymised health data still smells like PII and like an internal dataset. Two
uncertain locks against two strong frontier votes. The policy chooses local; whether
that is right is a good discussion point for a workshop.

### 19. Trivial task, sensitive payload
> **EN** Translate this Slack message into formal English: "hey, don't forward the Q4 numbers deck yet, legal hasn't cleared it, ping me if the client asks".
>
> **PL** Przetłumacz tę wiadomość ze Slacka na oficjalny angielski: „hej, nie podsyłaj jeszcze prezentacji z wynikami za Q4, prawnicy jej nie zaakceptowali, daj znać, jeśli klient zapyta”.

| pii | proprietary | complexity | knowledge | Route |
|---|---|---|---|---|
| p 0.05 | p 0.68 | s 0.25 / c 0.85 | s 0.10 / c 0.90 | **local** (proprietary lock, barely) |

The task is translation, but the content references an uncleared internal deck.
A weak Jev sees "translate" and returns 0.3; a good one reads the payload.

### 20. Hard reasoning with a fictional company
> **EN** Acme Robotics (fictional) has 3 factories, 12 % defect rate and a 6-week backlog. Design a 90-day plan to halve defects without adding headcount, with a risk register and the assumptions you had to make.
>
> **PL** Acme Robotics (firma fikcyjna) ma 3 fabryki, 12 % wadliwych sztuk i 6 tygodni zaległości. Zaprojektuj 90-dniowy plan zmniejszenia wad o połowę bez zwiększania zatrudnienia, z rejestrem ryzyk i listą przyjętych założeń.

| pii | proprietary | complexity | knowledge | Route |
|---|---|---|---|---|
| p 0.03 | p 0.28 | s 1.85 / c 0.85 | s 1.45 / c 0.60 | **frontier** (complexity; knowledge just misses) |

Operational figures, but flagged fictional, so `proprietary` should stay clear. Only
complexity fires. Nudge `thScoreHigh` to 1.4 and both soft signals agree.

---

## Suggested replacements for the six presets

| Preset key | Current | Replace with | Why |
|---|---|---|---|
| `pii` | full record: name, PESEL, address, phone | #3 | A single identifier is enough; p ≈ 0.85 is what real models return |
| `proprietary` | board deck stamped CONFIDENTIAL | #4 or #19 | The signal has to come from context, not a label; #19 hides it inside a trivial task |
| `trivia` | capital of Portugal | #1 | Equivalent, slightly less canned |
| `deep` | AI Act vs NIST roadmap | #5 | Same shape, less keyword-heavy |
| `mixed` | Anna Nowak with name, birth date and PESEL | #9 or #18 | #9 keeps the lock with a thin identifier; #18 is the more interesting conflict |
| `edge` | refund process | #16 (unchanged) or #11 | #11 puts a single signal exactly on the threshold |

For mock mode, `mockNoul` and `mockScore` in `index.html` currently return values in
the 0.93–0.98 and 1.85+ ranges, and `mockNoul` keys on words like "confidential" and
"PESEL". Softening the ranges to the profiles above (roughly 0.80–0.90 for clear hits,
0.40–0.60 for the uncertain cases) and matching on context words would make the demo
match live Jev output more closely.
