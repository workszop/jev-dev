# Jev Router – question pool

The app fetches this file at start and draws a random question from the chosen
category each time an example button (or key 1–6) is pressed. Keep the format:
a `## key` heading per category (the key must match `PRESETS` in `index.html`),
then one item per question with an `EN:` line and an indented `PL:` line.
Nothing else in this file is parsed.

## pii

- EN: Draft a reminder about an overdue invoice for the customer with PESEL 85042311876. Keep it polite and give a 14-day deadline.
  PL: Napisz przypomnienie o zaległej fakturze dla klienta o numerze PESEL 85042311876. Uprzejmy ton, termin 14 dni.
- EN: Patient, female, born 4 March 1978, treated at our clinic: recurrent migraines, hypertension, metformin 500 mg. Propose a differential diagnosis and a treatment plan referencing current guidelines.
  PL: Pacjentka, ur. 4 marca 1978, leczona w naszej przychodni: nawracające migreny, nadciśnienie, metformina 500 mg. Zaproponuj diagnostykę różnicową i plan leczenia z odniesieniem do aktualnych wytycznych.
- EN: Write an SMS reminding the person at 601 222 333 that their dental appointment is on Thursday at 9:30.
  PL: Napisz SMS przypominający osobie pod numerem 601 222 333 o wizycie u dentysty w czwartek o 9:30.
- EN: Draft a reply to kasia.m@example.com thanking her for the feedback and asking for a meeting next week.
  PL: Napisz odpowiedź do kasia.m@example.com z podziękowaniem za uwagi i prośbą o spotkanie w przyszłym tygodniu.
- EN: Summarise this CV in three lines for the hiring manager: Tomasz W., date of birth 12 May 1991, 6 years in logistics, lives in Poznań, driving licence C+E.
  PL: Streść to CV w trzech linijkach dla rekrutera: Tomasz W., data urodzenia 12 maja 1991, 6 lat w logistyce, mieszka w Poznaniu, prawo jazdy C+E.

## proprietary

- EN: Below is the pricing we plan to announce for the 2027 enterprise tier; nobody outside the product team has seen it yet. Turn it into a one-paragraph summary for the sales kickoff.
  PL: Poniżej cennik, który planujemy ogłosić dla pakietu enterprise w 2027 roku; nikt poza zespołem produktowym jeszcze go nie widział. Zrób z tego jeden akapit na spotkanie otwierające sprzedaż.
- EN: Translate this Slack message into formal English: "hey, don't forward the Q4 numbers deck yet, legal hasn't cleared it, ping me if the client asks".
  PL: Przetłumacz tę wiadomość ze Slacka na oficjalny angielski: „hej, nie podsyłaj jeszcze prezentacji z wynikami za Q4, prawnicy jej nie zaakceptowali, daj znać, jeśli klient zapyta”.
- EN: Here is our client list from the CRM export, about 400 rows. Find likely duplicates and suggest a merge rule.
  PL: Poniżej lista naszych klientów z eksportu CRM, około 400 wierszy. Znajdź prawdopodobne duplikaty i zaproponuj regułę łączenia.
- EN: These are my notes from yesterday's board meeting. Pull out the action items with owners and deadlines.
  PL: To moje notatki z wczorajszego posiedzenia zarządu. Wyciągnij zadania z osobami odpowiedzialnymi i terminami.
- EN: Our support team of 14 people closed 1 230 tickets last month, median response 3 h 40 min. Write a two-sentence update for the company newsletter.
  PL: Nasz 14-osobowy zespół wsparcia zamknął w zeszłym miesiącu 1 230 zgłoszeń, mediana odpowiedzi 3 h 40 min. Napisz dwuzdaniową aktualizację do firmowego newslettera.

## trivia

- EN: What year did the Berlin Wall fall, and which two countries reunified afterwards?
  PL: W którym roku upadł mur berliński i które dwa państwa się potem zjednoczyły?
- EN: Rewrite this sentence to sound friendlier: "Your request has been denied because the form was incomplete."
  PL: Przeredaguj to zdanie, żeby brzmiało życzliwiej: „Państwa wniosek został odrzucony, ponieważ formularz był niekompletny”.
- EN: I have a list of 40 groceries below (milk, bread, eggs, butter, ...). Group them by aisle: dairy, bakery, produce, pantry, frozen.
  PL: Poniżej lista 40 zakupów (mleko, chleb, jajka, masło, ...). Pogrupuj je według działów: nabiał, pieczywo, warzywa i owoce, suche produkty, mrożonki.
- EN: Convert 72 degrees Fahrenheit to Celsius and show the formula.
  PL: Przelicz 72 stopnie Fahrenheita na Celsjusza i pokaż wzór.
- EN: Give me three synonyms for "quick" that fit a job advert.
  PL: Podaj trzy synonimy słowa „szybki”, które pasują do ogłoszenia o pracę.

## deep

- EN: Compare three approaches to retrieval-augmented generation for a legal document corpus (hybrid BM25 + dense, late-interaction rerankers, graph-based retrieval). Discuss latency, citation faithfulness and maintenance cost, and recommend one for a 20-person law firm.
  PL: Porównaj trzy podejścia do RAG dla korpusu dokumentów prawnych (hybryda BM25 + dense, rerankery late-interaction, retrieval oparty na grafie). Omów opóźnienia, wierność cytowań i koszt utrzymania, a potem poleć jedno dla kancelarii zatrudniającej 20 osób.
- EN: Design a migration path from a monolithic payments platform to event-driven services under PSD2 strong customer authentication. Cover data consistency during the cut-over, rollback strategy and how the audit trail stays complete for the regulator.
  PL: Zaprojektuj ścieżkę migracji monolitycznej platformy płatności do usług sterowanych zdarzeniami przy wymaganiach silnego uwierzytelniania klienta (PSD2). Omów spójność danych podczas przełączenia, strategię wycofania zmian i to, jak ślad audytowy pozostaje kompletny dla regulatora.
- EN: Acme Robotics (fictional) has 3 factories, 12 % defect rate and a 6-week backlog. Design a 90-day plan to halve defects without adding headcount, with a risk register and the assumptions you had to make.
  PL: Acme Robotics (firma fikcyjna) ma 3 fabryki, 12 % wadliwych sztuk i 6 tygodni zaległości. Zaprojektuj 90-dniowy plan zmniejszenia wad o połowę bez zwiększania zatrudnienia, z rejestrem ryzyk i listą przyjętych założeń.
- EN: What changed in the EU AI Act implementation timeline in 2026?
  PL: Co zmieniło się w 2026 roku w harmonogramie wdrażania unijnego AI Act?
- EN: Evaluate the trade-offs between write-through and write-behind caching for a multi-region booking system, and propose a strategy that keeps inventory counts consistent.
  PL: Oceń kompromisy między cache write-through i write-behind w wieloregionalnym systemie rezerwacji i zaproponuj strategię, która utrzyma spójne stany magazynowe.

## mixed

- EN: Using the anonymised cohort below (patient IDs P001–P040, age band, HbA1c trend), suggest which subgroups would benefit most from a GLP-1 trial and what confounders to control for.
  PL: Na podstawie zanonimizowanej kohorty poniżej (ID pacjentów P001–P040, przedział wieku, trend HbA1c) wskaż, które podgrupy najbardziej skorzystałyby z badania GLP-1 i jakie zmienne zakłócające trzeba kontrolować.
- EN: Analyse our churn dataset (customer emails and monthly spend attached) and propose three retention experiments with success metrics.
  PL: Przeanalizuj nasze dane o odejściach klientów (w załączniku adresy e-mail i miesięczne wydatki) i zaproponuj trzy eksperymenty retencyjne z miarami sukcesu.
- EN: Here is the draft contract our lawyer prepared for a client. Identify the clauses that would be unenforceable under the Polish Civil Code and propose alternatives.
  PL: Poniżej projekt umowy, który nasz prawnik przygotował dla klienta. Wskaż klauzule, które byłyby nieskuteczne według Kodeksu cywilnego, i zaproponuj alternatywy.
- EN: Patient born 4 March 1978, treated at our clinic: recurrent migraines, hypertension, metformin 500 mg. Compare the evidence for two prophylactic options and recommend one.
  PL: Pacjentka ur. 4 marca 1978, leczona w naszej przychodni: nawracające migreny, nadciśnienie, metformina 500 mg. Porównaj dowody dla dwóch opcji profilaktyki i poleć jedną.
- EN: These are this year's performance reviews for my team of eight. Summarise the recurring themes and design a training plan with trade-offs between cost and impact.
  PL: To tegoroczne oceny pracownicze mojego ośmioosobowego zespołu. Streść powtarzające się wątki i zaprojektuj plan szkoleń z kompromisem między kosztem a efektem.

## edge

- EN: Explain to a colleague how our team usually handles a customer refund when the order came from the marketplace, and draft a short email template.
  PL: Wyjaśnij koledze, jak nasz zespół zwykle obsługuje zwrot pieniędzy, gdy zamówienie przyszło z marketplace'u, i przygotuj krótki szablon maila.
- EN: Write a short story opening about a detective named Zofia Wróbel who finds a letter addressed to "Jan Nowak, ul. Lipowa 3, Gdańsk".
  PL: Napisz początek opowiadania o detektyw Zofii Wróbel, która znajduje list zaadresowany do „Jana Nowaka, ul. Lipowa 3, Gdańsk”.
- EN: Summarise Orlen's publicly reported 2025 annual results: revenue, EBITDA and net profit, in three bullets.
  PL: Streść opublikowane wyniki roczne Orlenu za 2025 rok: przychody, EBITDA i zysk netto, w trzech punktach.
- EN: Write a 150-word biography of Olga Tokarczuk for a school bulletin, mentioning her birthplace and the year she won the Nobel Prize.
  PL: Napisz 150-wyrazową notkę biograficzną o Oldze Tokarczuk do szkolnej gazetki, z miejscem urodzenia i rokiem Nobla.
- EN: Explain to a junior developer the difference between optimistic and pessimistic locking, with one example each in PostgreSQL.
  PL: Wyjaśnij młodszemu programiście różnicę między blokowaniem optymistycznym i pesymistycznym, z jednym przykładem każdego w PostgreSQL.
