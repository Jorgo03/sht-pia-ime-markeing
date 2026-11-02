# Writes templates/campaigns/*.json — the 12 ready-to-produce campaigns.
# Copy is trilingual: {"sq": …, "en": …, "it": …}; `studio new <id> --lang xx`
# resolves it. Albanian copy should get a native-speaker read before paid use.
import json, os
OUT = os.path.join(os.path.dirname(__file__), '..', 'templates', 'campaigns')
def L(sq, en, it): return {"sq": sq, "en": en, "it": it}
TAGS = ["shtepiaime", "shtepi", "pronatshqiperi", "tirana", "albania", "realestate"]
T = []

T.append({"id": "app-launch", "title": L("Lansimi i Shtëpia.ime", "Shtëpia.ime launch", "Lancio di Shtëpia.ime"),
 "brief": "Official application launch. 25 s, 3D + UI motion. Hook, product reveal, three real features, logo, CTA.",
 "modes": ["3d", "ui-motion"], "duration": 25, "palette": "night",
 "audio": {"music": {"bed": "warm", "bpm": 100}},
 "scenes": [
  {"scene": "hook-question", "duration": 2.4, "vars": {"question": L("Po kërkon *shtëpinë tënde?*", "Looking for *your home?*", "Cerchi *casa tua?*")}},
  {"scene": "city-three-dive", "duration": 3.0, "vars": {"kicker": L("Shqipëri", "Albania", "Albania"), "title": L("Çdo lagje, *një prekje larg.*", "Every neighbourhood, *one tap away.*", "Ogni quartiere, *a un tocco.*")}},
  {"scene": "phone-rise", "duration": 3.2, "vars": {"title": L("Njihuni me *Shtëpia.ime.*", "Meet *Shtëpia.ime.*", "Ecco *Shtëpia.ime.*"), "screen": "home", "theme": "dark", "next": "explore"}},
  {"scene": "search-type-results", "duration": 3.6, "vars": {"title": L("Kërko *qytetin tënd.*", "Search *your city.*", "Cerca *la tua città.*"), "query": "Tiranë"}},
  {"scene": "map-app-clusters", "duration": 3.2, "vars": {"title": L("Eksploro *në hartë.*", "Explore *on the map.*", "Esplora *sulla mappa.*"), "callout": L("3 prona në Tiranë", "3 homes in Tirana", "3 immobili a Tirana")}},
  {"scene": "property-card-dive", "duration": 3.4, "vars": {"listing": "villa-dhermi"}},
  {"scene": "logo-knob-pullback", "duration": 3.6, "payoff": True},
  {"scene": "cta-app-icon", "duration": 2.6, "in": "cut", "vars": {"title": L("Gjej shtëpinë tënde *sot.*", "Find your home *today.*", "Trova casa *oggi.*"), "button": L("Provoje falas", "Try it free", "Provalo gratis")}}],
 "caption": L("Shtëpia.ime është këtu: kërko, krahaso dhe gjej shtëpinë tënde në gjithë Shqipërinë — në 8 gjuhë. 🧡", "Shtëpia.ime is here: search, compare and find your home anywhere in Albania — in 8 languages. 🧡", "Shtëpia.ime è qui: cerca, confronta e trova casa in tutta l'Albania — in 8 lingue. 🧡"),
 "hashtags": TAGS + ["newapp"], "evidence": {"3 prona në Tiranë": "map screenshot (config/screens.json map.clusterTirana) shows a cluster of 3", "3 homes in Tirana": "map screenshot cluster reads 3", "3 immobili a Tirana": "map screenshot cluster reads 3"}})

T.append({"id": "discover-dream-home", "title": L("Zbulo shtëpinë e ëndrrave", "Discover your dream home", "Scopri la casa dei sogni"),
 "brief": "Emotional discovery, 20 s, cinematic. Photos carry it; real app moment in the middle.", "modes": ["cinematic", "ui-motion"], "duration": 20, "palette": "night",
 "audio": {"music": {"bed": "cinematic", "bpm": 84}},
 "scenes": [
  {"scene": "hook-photo-montage", "duration": 2.4, "vars": {"title": L("Mijëra mundësi. *Një vend.*", "So many homes. *One place.*", "Tante case. *Un solo posto.*")}},
  {"scene": "cine-location-title", "duration": 3.2, "vars": {"city": "dhermi", "photo": "assets/property-images/villa-coast.jpg", "region": L("Riviera shqiptare", "Albanian Riviera", "Riviera albanese")}},
  {"scene": "property-kenburns-facts", "duration": 3.6, "vars": {"listing": "villa-dhermi"}},
  {"scene": "property-card-dive", "duration": 3.4, "vars": {"listing": "apartment-blloku"}},
  {"scene": "property-shutter-reveal", "duration": 3.4, "vars": {"listing": "stone-gjirokaster", "title": L("Histori në *gur.*", "History in *stone.*", "Storia nella *pietra.*")}},
  {"scene": "outro-photo-endcard", "duration": 4.0, "payoff": True, "vars": {"line": L("Çdo mundësi, *në një vend.*", "Every option, *in one place.*", "Ogni possibilità, *in un posto.*")}}],
 "caption": L("Nga bregdeti te kryeqyteti: shtëpia e ëndrrave mund të jetë një kërkim larg.", "From the coast to the capital: your dream home could be one search away.", "Dalla costa alla capitale: la casa dei sogni è a una ricerca di distanza."),
 "hashtags": TAGS + ["dreamhome", "riviera"]})

T.append({"id": "how-to-search", "title": L("Si të kërkosh prona", "How to search for properties", "Come cercare immobili"),
 "brief": "Tutorial, 20 s, UI motion only. Three numbered steps on real screens.", "modes": ["ui-motion"], "duration": 20, "palette": "night",
 "audio": {"music": {"bed": "bright", "bpm": 110}},
 "scenes": [
  {"scene": "hook-city-slot", "duration": 2.6},
  {"scene": "search-type-results", "duration": 4.0, "vars": {"title": L("1 · Kërko *qytetin.*", "1 · Search *a city.*", "1 · Cerca *la città.*"), "query": "Tiranë"}},
  {"scene": "search-filters-sheet", "duration": 4.6, "vars": {"title": L("2 · Vendos *filtrat.*", "2 · Set *your filters.*", "2 · Imposta *i filtri.*"), "labels": L("Buxheti yt, Sa dhoma?", "Your budget, How many rooms?", "Il tuo budget, Quante camere?")}},
  {"scene": "ui-push-nav", "duration": 4.2, "vars": {"title": L("3 · Hap *detajet.*", "3 · Open *the details.*", "3 · Apri *i dettagli.*"), "steps": L("Kërko, Shfleto, Zbulo detajet", "Search, Browse, See the details", "Cerca, Sfoglia, Scopri i dettagli")}},
  {"scene": "outro-lockup-tagline", "duration": 4.6, "payoff": True, "vars": {"tagline": L("Kërko. Krahaso. *Gjej.*", "Search. Compare. *Find.*", "Cerca. Confronta. *Trova.*")}}],
 "caption": L("Tre hapa për të gjetur pronën: kërko qytetin, vendos filtrat, hap detajet.", "Three steps to the right home: search the city, set filters, open the details.", "Tre passi per trovare casa: cerca la città, imposta i filtri, apri i dettagli."),
 "hashtags": TAGS + ["howto", "tutorial"]})

T.append({"id": "explore-map", "title": L("Eksploro Tiranën në hartë", "Explore Tirana on the map", "Esplora Tirana sulla mappa"),
 "brief": "20 s, 3D + maps. Albania map, 3D city, real app map.", "modes": ["3d", "print", "ui-motion"], "duration": 20, "palette": "night",
 "audio": {"music": {"bed": "night", "bpm": 96}},
 "scenes": [
  {"scene": "map-albania-pins", "duration": 3.4, "vars": {"kicker": L("Në gjithë Shqipërinë", "All over Albania", "In tutta l'Albania")}},
  {"scene": "map-route-line", "duration": 3.2, "vars": {"from": "durres", "to": "tirane"}},
  {"scene": "city-iso-rise", "duration": 3.4},
  {"scene": "map-app-clusters", "duration": 3.6},
  {"scene": "three-pin-drop", "duration": 3.0, "vars": {"place": L("*Tiranë*", "*Tirana*", "*Tirana*"), "kicker": L("Pronat e tua në", "Your next home in", "La tua casa a")}},
  {"scene": "outro-into-the-door", "duration": 3.4, "payoff": True}],
 "caption": L("Shiko ku ndodhen pronat — çdo listim ka vendndodhjen në hartë.", "See where every home is — each listing has its location on the map.", "Guarda dove si trova ogni casa — ogni annuncio ha la posizione sulla mappa."),
 "hashtags": TAGS + ["map", "tirane"], "evidence": {"3 prona në Tiranë": "map screenshot (config/screens.json map.clusterTirana) shows a cluster of 3", "3 homes in Tirana": "map screenshot cluster reads 3", "3 immobili a Tirana": "map screenshot cluster reads 3"}})

T.append({"id": "how-to-publish", "title": L("Si të publikosh pronën", "How to publish a property", "Come pubblicare un immobile"),
 "brief": "15 s, print + type. The listing wizard is live but has no screenshots yet, so this film uses no app screens. Capture the wizard to upgrade it.", "modes": ["print", "kinetic-typography"], "duration": 15, "palette": "paper",
 "features": ["publish-listing", "auto-translate"],
 "audio": {"music": {"bed": "paper", "bpm": 112}},
 "scenes": [
  {"scene": "hook-paper-door", "duration": 2.6, "vars": {"title": L("Ke një pronë për *të shitur?*", "Got a home *to sell?*", "Hai una casa *da vendere?*")}},
  {"scene": "paper-cards-stack", "duration": 3.6, "vars": {"title": L("Publiko *hap pas hapi.*", "Publish *step by step.*", "Pubblica *passo dopo passo.*"), "items": L("Shto foto|Vendos çmimin|Përshkruaje|Publiko", "Add photos|Set the price|Describe it|Publish", "Aggiungi foto|Imposta il prezzo|Descrivila|Pubblica")}},
  {"scene": "type-mask-lines", "duration": 3.4, "vars": {"title": L("Shpallja jote,|*në 8 gjuhë.*", "Your listing,|*in 8 languages.*", "Il tuo annuncio,|*in 8 lingue.*"), "body": L("Përkthimi automatik e çon pronën tënde edhe te diaspora.", "Automatic translation takes your listing to the diaspora too.", "La traduzione automatica porta l'annuncio anche alla diaspora."), "kicker": "Shtëpia.ime"}},
  {"scene": "paper-key-unlock", "duration": 2.8, "vars": {"title": L("Gati për *blerësin e ri.*", "Ready for *the next owner.*", "Pronta per *il nuovo proprietario.*")}},
  {"scene": "outro-lockup-tagline", "duration": 2.6, "payoff": True, "vars": {"ground": "light"}}],
 "caption": L("Publiko pronën tënde në Shtëpia.ime hap pas hapi — dhe arrij blerës në 8 gjuhë.", "Publish your property on Shtëpia.ime step by step — and reach buyers in 8 languages.", "Pubblica il tuo immobile su Shtëpia.ime passo dopo passo — in 8 lingue."),
 "hashtags": TAGS + ["sellyourhome"]})

T.append({"id": "features-benefits", "title": L("Veçoritë dhe përfitimet", "Features and benefits", "Funzioni e vantaggi"),
 "brief": "20 s, UI + typography. Four live features, each on its real screen.", "modes": ["ui-motion", "kinetic-typography"], "duration": 20, "palette": "night",
 "audio": {"music": {"bed": "bright", "bpm": 112}},
 "scenes": [
  {"scene": "type-flash-rsvp", "duration": 2.0, "vars": {"words": L("Kërko.|Filtro.|Ruaj.|*Gjej.*", "Search.|Filter.|Save.|*Find.*", "Cerca.|Filtra.|Salva.|*Trova.*")}},
  {"scene": "phone-3d-spin", "duration": 3.4},
  {"scene": "search-filters-sheet", "duration": 4.6},
  {"scene": "feature-favorites", "duration": 3.0},
  {"scene": "feature-spotlight", "duration": 3.2, "vars": {"screen": "detail-1", "region": "amenities"}},
  {"scene": "cta-button-press", "duration": 3.8, "payoff": True}],
 "caption": L("Filtra të saktë, harta, të preferuarat dhe çdo detaj i pronës — në një app.", "Precise filters, a map, favourites and every detail — in one app.", "Filtri precisi, mappa, preferiti e ogni dettaglio — in un'app."),
 "hashtags": TAGS + ["features"]})

T.append({"id": "why-shtepia-ime", "title": L("Pse Shtëpia.ime?", "Why Shtëpia.ime?", "Perché Shtëpia.ime?"),
 "brief": "15 s, typography only. Benefits as type, no screens.", "modes": ["kinetic-typography"], "duration": 15, "palette": "night",
 "audio": {"music": {"bed": "bright", "bpm": 118}},
 "scenes": [
  {"scene": "type-split-word", "duration": 3.2, "vars": {"inside": L("fillon me *një kërkim.*", "starts with *one search.*", "inizia con *una ricerca.*")}},
  {"scene": "type-stack-poster", "duration": 2.2, "palette": "orange", "vars": {"lines": L("Shitje|*&*|qira", "Sale|*&*|rent", "Vendita|*&*|affitto")}},
  {"scene": "type-highlighter", "duration": 3.0, "vars": {"text": L("[Shitje] dhe [qira], me [foto dhe hartë].", "[Sale] and [rent], with [photos and a map].", "[Vendita] e [affitto], con [foto e mappa].")}},
  {"scene": "feature-languages", "duration": 3.6},
  {"scene": "logo-flood-stacked", "duration": 3.0, "payoff": True}],
 "caption": L("Shitje dhe qira, harta dhe 8 gjuhë. Pse Shtëpia.ime? Sepse shtëpia jote meriton më shumë se një kërkim i lodhshëm.", "Sale and rent, a map and 8 languages. Why Shtëpia.ime? Because your home deserves a better search.", "Vendita e affitto, mappa e 8 lingue. Perché Shtëpia.ime? Perché la tua casa merita una ricerca migliore."),
 "hashtags": TAGS})

T.append({"id": "app-updates", "title": L("Përditësimet e aplikacionit", "App updates", "Aggiornamenti dell'app"),
 "brief": "15 s, UI. Changelog style: dark mode + languages. Swap scenes for what actually shipped.", "modes": ["ui-motion", "kinetic-typography"], "duration": 15, "palette": "night",
 "audio": {"music": {"bed": "bright", "bpm": 108}},
 "scenes": [
  {"scene": "type-mask-lines", "duration": 3.0, "vars": {"kicker": L("Çfarë ka të re", "What's new", "Novità"), "title": L("Shtëpia.ime,|*më e mirë.*", "Shtëpia.ime,|*even better.*", "Shtëpia.ime,|*ancora meglio.*"), "body": L("Disa përmirësime që i pret.", "A few improvements you asked for.", "Alcuni miglioramenti che aspettavi.")}},
  {"scene": "feature-dark-mode", "duration": 3.0},
  {"scene": "feature-languages", "duration": 4.2},
  {"scene": "outro-lockup-tagline", "duration": 4.8, "payoff": True}],
 "caption": L("Modaliteti i errët dhe 8 gjuhë: Shtëpia.ime, ditë e natë.", "Dark mode and 8 languages: Shtëpia.ime, day and night.", "Modalità scura e 8 lingue: Shtëpia.ime, giorno e notte."),
 "hashtags": TAGS + ["update", "darkmode"]})

T.append({"id": "new-feature-spotlight", "title": L("Veçori e re", "New feature spotlight", "Nuova funzione"),
 "brief": "15 s, UI. One live feature, deep-dived on its real screen (default: location map + similar listings on the detail page).", "modes": ["ui-motion"], "duration": 15, "palette": "night",
 "audio": {"music": {"bed": "warm", "bpm": 104}},
 "scenes": [
  {"scene": "ui-zoom-through-search", "duration": 2.6, "vars": {"line": L("E re në *Shtëpia.ime.*", "New in *Shtëpia.ime.*", "Novità in *Shtëpia.ime.*")}},
  {"scene": "feature-spotlight", "duration": 3.4, "vars": {"screen": "detail-1-scrolled", "region": "location", "title": L("Vendndodhja *e saktë.*", "The *exact* location.", "La posizione *esatta.*"), "kicker": L("Në çdo pronë", "On every listing", "In ogni annuncio"), "scale": 1.15, "lift": -20}},
  {"scene": "feature-spotlight", "duration": 3.4, "vars": {"screen": "detail-1-scrolled", "region": "similar", "title": L("Prona *të ngjashme.*", "Similar *homes.*", "Immobili *simili.*"), "kicker": L("Një prekje larg", "One tap away", "A un tocco")}},
  {"scene": "outro-lockup-tagline", "duration": 5.6, "payoff": True}],
 "caption": L("Çdo pronë tani tregon vendndodhjen në hartë dhe prona të ngjashme.", "Every listing shows its location on a map — and similar homes.", "Ogni annuncio mostra la posizione sulla mappa — e immobili simili."),
 "hashtags": TAGS + ["newfeature"]})

T.append({"id": "download-app", "title": L("Shkarko aplikacionin", "Download the app", "Scarica l'app"),
 "brief": "12 s, short CTA. Confirm store availability before adding store names.", "modes": ["ui-motion", "kinetic-typography"], "duration": 12, "palette": "night",
 "audio": {"music": {"bed": "bright", "bpm": 120}},
 "scenes": [
  {"scene": "phone-trio-fan", "duration": 3.2},
  {"scene": "ui-screens-wall", "duration": 3.0},
  {"scene": "cta-app-icon", "duration": 3.0, "payoff": True},
  {"scene": "cta-type-handle", "duration": 2.8}],
 "caption": L("Gjej shtëpinë tënde me Shtëpia.ime. Linku në bio. 📲", "Find your home with Shtëpia.ime. Link in bio. 📲", "Trova casa con Shtëpia.ime. Link in bio. 📲"),
 "hashtags": TAGS + ["app", "download"]})

T.append({"id": "brand-awareness", "title": L("Gjej shtëpinë tënde", "Find your home", "Trova casa tua"),
 "brief": "15 s, print studio. Warm cut-paper brand film.", "modes": ["print"], "duration": 15, "palette": "paper",
 "audio": {"music": {"bed": "paper", "bpm": 112}},
 "scenes": [
  {"scene": "paper-town-popup", "duration": 3.4, "vars": {"title": L("Gjej *shtëpinë* tënde", "Find *your* home", "Trova *casa* tua")}},
  {"scene": "tx-paper-sweep", "duration": 0.9},
  {"scene": "map-albania-pins", "duration": 3.2, "palette": "paper"},
  {"scene": "paper-torn-reveal", "duration": 3.0},
  {"scene": "paper-key-unlock", "duration": 2.6},
  {"scene": "outro-lockup-tagline", "duration": 2.8, "payoff": True, "vars": {"ground": "light"}}],
 "caption": L("Çdo shtëpi ka një histori. Gjeje tëndën në Shtëpia.ime.", "Every home has a story. Find yours on Shtëpia.ime.", "Ogni casa ha una storia. Trova la tua su Shtëpia.ime."),
 "hashtags": TAGS + ["home"]})

T.append({"id": "emotional-home", "title": L("Mirë se vjen në shtëpi", "Welcome home", "Benvenuto a casa"),
 "brief": "25 s, cinematic + paper. Slow, warm, music-led; the app appears once, the feeling carries the rest.", "modes": ["cinematic", "print", "ui-motion"], "duration": 25, "palette": "night",
 "audio": {"music": {"bed": "cinematic", "bpm": 80}},
 "scenes": [
  {"scene": "hook-paper-door", "duration": 2.8, "palette": "paper", "vars": {"title": L("Çdo derë *ka një histori.*", "Every door *has a story.*", "Ogni porta *ha una storia.*")}},
  {"scene": "city-skyline-paper", "duration": 3.6},
  {"scene": "cine-location-title", "duration": 3.4, "vars": {"city": "gjirokaster", "photo": "assets/property-images/stone-house.jpg"}},
  {"scene": "property-kenburns-facts", "duration": 3.8, "vars": {"listing": "apartment-blloku", "title": L("Dritë, *pamje, qetësi.*", "Light, *a view, calm.*", "Luce, *vista, calma.*")}},
  {"scene": "room-model-3d", "duration": 3.6},
  {"scene": "phone-rise", "duration": 3.4, "vars": {"screen": "detail-1", "theme": "light", "title": L("Gjeje *këtu.*", "Find it *here.*", "Trovala *qui.*")}},
  {"scene": "outro-into-the-door", "duration": 4.4, "payoff": True}],
 "caption": L("Shtëpia nuk është vetëm një adresë. Gjej vendin ku do të ndihesh në shtëpi.", "A home is more than an address. Find the place that feels like yours.", "Una casa è più di un indirizzo. Trova il posto che senti tuo."),
 "hashtags": TAGS + ["welcomehome", "family"]})

for t in T:
    sb = {"template": t["id"], "id": t["id"], "title": t["title"], "brief": t["brief"], "modes": t["modes"], "targetDuration": t["duration"],
          "language": "sq", "format": "reel", "palette": t["palette"], "voice": {"provider": "none"}, "audio": t["audio"],
          "features": t.get("features", []), "scenes": t["scenes"], "caption": t["caption"], "hashtags": t["hashtags"]}
    if t.get("evidence"): sb["evidence"] = t["evidence"]
    tot = sum(s["duration"] for s in t["scenes"] if not s["scene"].startswith("tx-"))
    assert abs(tot - t["duration"]) < 0.05, (t["id"], tot)
    json.dump(sb, open(os.path.join(OUT, t["id"] + ".json"), "w"), ensure_ascii=False, indent=2)
print(len(T), "templates written")
