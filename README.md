# Kamień, Kość i Kasa

Roguelike match-3 w duchu Puzzle Quest. Dopasowujesz kamienie, zbierasz manę w czterech kolorach, rzucasz czary i idziesz przez generowaną mapę aż do bossa. Jedna wyprawa to ok. 15–20 minut.

## Uruchomienie

```bash
npm install
npm run dev          # serwer deweloperski (http://localhost:5173)
npm run build        # statyczne pliki w dist/ (PWA: działa offline po pierwszym wejściu)
npm run build:single # wszystko w jednym pliku: dist-single/index.html
```

## GitHub Pages

Workflow `.github/workflows/pages.yml` buduje grę i publikuje `dist/` przy każdym pushu na `main`. Wystarczy raz ustawić w repozytorium **Settings → Pages → Source: GitHub Actions**. Ścieżki są względne, więc gra działa pod adresem `https://<user>.github.io/<repo>/` bez dodatkowej konfiguracji.

## Jak to jest zbudowane

- Canvas 2D, bez silnika i bez grafik z zewnątrz. Kamienie, portrety potworów, mgławice i efekty są generowane kodem (`src/gfx`).
- Dźwięki są syntezowane na żywo przez Web Audio (`src/core/audio.ts`).
- Cała zawartość wyprawy pochodzi z jednego ziarna: mapa, wrogowie, anomalie, nagrody i sklep (`src/game`). „Wyzwanie dnia” używa ziarna z daty.
- Stan zapisuje się w `localStorage` po każdej turze, więc wyprawę można przerwać w dowolnej chwili.

| Katalog | Zawartość |
| --- | --- |
| `src/game` | logika planszy, czary, relikty, generator wrogów i mapy, wydarzenia, SI |
| `src/gfx` | proceduralne sprite'y kamieni, portrety, tło, system cząsteczek |
| `src/scenes` | menu, mapa, walka |
| `src/flow.ts` | przebieg wyprawy i ekrany (nagrody, sklep, obozowisko, wydarzenia) |

## Balans

```bash
npm run sim                 # 300 wypraw na klasę, gracz dobry (0.9) i przeciętny (0.6)
npm run sim -- 1000 0.9     # więcej wypraw, jeden poziom gracza
BAL='{"bossHp":0.8}' npm run sim   # szybki eksperyment bez zmiany kodu
```

Symulator (`src/sim/sim.ts`) odtwarza reguły walki bez grafiki i przechodzi całe wyprawy rozsądną SI gracza. Wszystkie pokrętła trudności są w `src/game/balance.ts`.
