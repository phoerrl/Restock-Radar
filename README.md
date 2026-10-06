# Drop Radar Leipzig: Nur Filialen, Bis UVP

Private Web-App fuer physische Laeden, mit Leipzig-Filialverzeichnis, Artikelquellen, Bestandswechsel-Verlauf und vorbereitetem Web Push. Keine Online-Angebote, Versandverfuegbarkeiten, Marketplace-Alarme oder automatische Uebernahme von Shop-Suchergebnissen.

Alle zehn gewuenschten Haendler sind gleichberechtigt im Verzeichnis und Filter enthalten: Smyths Toys, Mueller, Hugendubel, Thalia, MediaMarkt, GALERIA, Rossmann, EDEKA, REWE und Lidl. Keine Kette ist pauschal als UVP-Haendler bestaetigt. Die Preiskontrolle gilt je Artikel und Filialangebot.

## Aktueller Stand

**Das eigentliche Ziel ist noch nicht erreicht:** Es gibt noch keine verifizierte Live-Datenquelle fuer Pokemon-Wareneingaenge oder den aktuellen Ladenbestand der gewuenschten Filialen. Die App ist eine lokal lauffaehige Grundlage, kein bereits funktionierender Wareneingangs-Alarm. Es wurde keine private Warenwirtschaft angebunden. Keine synthetischen Bestaende werden als echte Daten angezeigt.

- Thalia Karl-Liebknecht-Str. 8-14, 04107 Leipzig ist wie alle anderen verzeichneten Filialen enthalten, ohne Priorisierung. Offizielle Filial-ID: 5629. https://www.thalia.de/buchhandlung/5629
- Die oeffentliche Thalia-Suche bietet einen Filialfilter. Bei der Pruefung am 06.10.2026 lieferte die Suche nach `Pokemon 30 Jahre` mit dieser Filiale keinen passenden Kartenartikel mit belegtem Ladenbestand. Das ist **kein Beleg fuer einen leeren Laden**. Nicht im Online-Katalog gelistete Artikel koennen trotzdem vor Ort vorhanden sein.
- Direkte automatisierte Thalia-Abfrage: HTTP 403/Sicherheits-Check. Smyths blockiert ebenfalls automatische Abfragen. Es erfolgt kein Umgehen dieser Sperren.
- Vertiefte Thalia-Pruefung: Die oeffentliche Filialauswahl ruft `GET /api/filialabholung/5629/abholaussage/<Artikel-ID>` auf. Im normalen Browser wurde dies fuer einen Portfolio-Zubehoerartikel beobachtet, **nicht fuer Karten aus dem Jubilaeumsset**. Die Karli-Abfrage zeigte Abholung am folgenden Tag, keinen sofortigen Ladenbestand. Direkter Abruf dieses Endpunkts: HTTP 403. Endpunkt und Befunde: [DATENQUELLEN.md](DATENQUELLEN.md). Kein verifizierter Thalia-Live-Adapter wurde daraus aktiviert.
- Bei Hugendubel und MediaMarkt wurde bisher kein belastbarer filialbezogener Bestands- oder Wareneingangsfeed verifiziert.
- Das Filialverzeichnis enthaelt derzeit 78 Standorte aus allen zehn Ketten: 16 zuvor erfasste Adressen plus 62 weitere Leipziger OSM-Adressen. Keine vollstaendige Liste aller Laeden oder aller Smyths-Filialen. Die zwei vorgesehenen Smyths-Standorte Paunsdorf und Guenthersdorf sind enthalten. Weitere belegte Filialadressen aus Artikelquellen werden beim Abruf ergaenzt.
- Fuer die neuen Ketten sind noch keine Live-Bestandsadapter verifiziert. Filialfinder-Links sind Adressquellen und werden nicht als Warenbestand abgefragt.
- Es ist noch keine deutsche Hersteller-UVP fuer die konkreten Artikel automatisch verifiziert. Es werden keine geratenen Preise vorbefuellt. Unter Artikel kann eine eigene UVP-Referenz in EUR mit Beleglink fuer exakt denselben Artikel hinterlegt werden. Der Beleglink wird gespeichert, nicht automatisch ausgelesen oder als Herstellerbeleg zertifiziert.
- Hintergrunddienst ist noch nicht eingerichtet. Die Anzeige prueft bei geoeffneter App; ein erfolgreicher privater HTTPS-Deployment ist getrennt davon zu bestaetigen.
- Push-Schluessel und PWA sind vorbereitet. Eine echte iPhone-Zustellung wurde nicht getestet; es ist noch kein Geraet registriert.

Der Name/Link der anderen App oder ein konkreter Artikel mit EAN/Artikel-ID kann helfen, deren Datenquelle zu identifizieren. Fuer einen Alarm beim **tatsaechlichen Wareneingang** braucht es einen zugelassenen Liefer-/Wareneingangsfeed oder eine explizite Meldung des Ladens. Ein nachtraeglich beobachteter Bestandswechsel beweist keine Lieferung und liefert auch keinen Wareneingangszeitpunkt.

## Filialkarte Und Tour

Die Startansicht `Karte` nutzt Leaflet mit Marker-Clustering und regulaere OpenStreetMap-Kacheln. Gespeicherte Koordinaten werden beim Oeffnen nicht erneut geocodiert. Standortbelege sind pro Filiale verlinkt; die Karli ist als ungefaehre Gebaeudeposition markiert. OSM-Ergaenzungen haben keine behauptete offizielle Adresspruefung, Sortiment-, UVP- oder Bestandszusage. Datenstand 06.10.2026, OSM-Mitwirkende: https://www.openstreetmap.org/copyright (ODbL).

Suche nach Filiale, Strasse oder PLZ, Filter fuer alle zehn Haendler und die Modi `Alle`, `Frisch`, `Bis UVP` und `Tour` gelten fuer Karte und Liste gemeinsam. `Geprueft geoeffnet` schliesst unbekannte Oeffnungszeiten aus. Einzelmarker, Cluster, Tastatur und Filialliste sind bedienbar. Details zeigen Adresse, Herkunft, Oeffnungsbeleg, aktuelle Hinweise, Route in Apple Maps und, soweit verifiziert, Telefonnummer. Fundmeldungen uebernehmen die ausgewaehlte Filiale.

Tour-Stopps werden auf diesem Geraet im lokalen Browser-Speicher gespeichert und lassen sich umsortieren oder entfernen. Keine GPS-Ortung, keine behauptete Routenoptimierung, keine Synchronisierung zwischen Mac und iPhone. Kartenfehler lassen das Verzeichnis weiter benutzbar. Kein Offline-Kachel-Prefetch.

Gruene Hinweis-Punkte brauchen frische filialgenaue Belege mit Filialpreis im eigenen belegten UVP-Rahmen. Geschlossene Filialen haben niemals gruene oder frische Marker. Alte, zukuenftige, gesperrte, fremde und Online-Bestaende werden nicht positiv gewertet. Tagesgenaue Beobachtungen bekommen keine erfundene Uhrzeit.

## Alarm-Regeln

### Neue Hinweisauswertung

Der Reiter `Heute` verarbeitet Beobachtungen mit Quelle, exakter Filialadresse, tatsaechlichem Beobachtungszeitpunkt und getrennten Preisbelegen. Der eigene Hugendubel-Fund vom 05.10.2026 um 12:20 ist gespeichert; seine Filialzuordnung bleibt bis zur Rueckmeldung offen. Der Thalia-Hinweis desselben Tages ist aus zweiter Hand und ohne erfundene Uhrzeit gespeichert.

- Frische positive Meldungen gelten hoechstens 20 Minuten. Juengere Leer- oder teurere Meldungen desselben Artikels ersetzen aeltere Hinweise. Ungepruefte, historische und reine Tagesangaben erzeugen keinen frischen Alarm.
- Eigene Verraeum-Beobachtungen ergeben erst ab drei verschiedenen Tagen, verteilt ueber mindestens zwei Wochen, ein vorsichtiges gleichwochentagsbezogenes Zeitfenster. Es gibt keine vorgetaeuschte Prozent-Trefferquote und keine aus einem einzelnen Fund abgeleitete Lieferzusage.
- Tatsaechlich erfasste Besuchstage einschliesslich erfolgloser Kontrollen bilden den historischen Nenner. Das ist kein kalibriertes Prognosemodell; systematisch erfasste Gegenproben fehlen noch.
- Offizielle Oeffnungszeiten fuer fuenf verzeichnete Filialen sind mit Datum und Quelle hinterlegt. Karli-Samstag 09:00-15:00 und REWE Hauptbahnhof einschliesslich Sonntag wurden am 06.10.2026 erneut verifiziert. Unbekannte Zeiten bleiben unbekannt; nach 30 Tagen veralten die Angaben. Geschlossene Filialen erzeugen keinen Fundmeldungs-Push. Aus Feiertags-Schliessungen werden keine regulaeren Samstagszeiten abgeleitet.
- Oeffentliche Reddit-Feeds fuer PokemonTCG_DE (Beitraege und Kommentare) und Leipzig werden serverseitig mit Groessenlimit, Zeitlimit, Weiterleitungsverbot und Rueckoff nach Fehlern gelesen. Zwei Feeds waren beim lokalen Lauf lesbar, der Kommentarfeed antwortete zeitweise mit HTTP 429. Lesbarkeit ist keine Zusage dauerhaften Zugangs.
- Pro Feed werden Eintragszahl und neueste Datumsangabe dokumentiert (`published`, sonst `updated`). Eine Aktualisierung ist nicht zwingend die Erstveroeffentlichung. Passende Vor-Ort-Beitraege anderer Orte sind nur Kontext, keine Leipziger Bestandssignale. Leipziger Kandidaten bleiben ungeprueft bis zum belegten Filial-/Artikelabgleich. Feed-Zeit wird nicht als Verraeumzeit ausgegeben.
- Private Facebook-, WhatsApp- und Discord-Inhalte sind nicht verbunden. Es werden keine Benutzer-Cookies, Zugangsdaten oder Gruppentexte heimlich uebernommen. Die vorhandenen Recherchebelege sind datierte Quellen, kein Live-Bestandsfeed.

`/api/signals` speichert und liest diese Daten. `/api/background` prueft beide Quelltypen. `/mcp` bietet zusaetzlich `read_branch_signals` und `record_branch_observation` fuer spaetere autorisierte Rechercheimporte; die normalen Melde- und Alarmregeln bleiben verbindlich. Migrationen `0002_supreme_fallen_one.sql` und `0003_simple_clea.sql` erhalten vorhandene Daten. Es wurden keine Test-Bestaende in den echten Radar geschrieben.

Eine Browserpruefung kann im Original abgeschlossen werden. Dies entsperrt nicht automatisch die getrennte Server-Sitzung. Eine solche Freischaltung oder einen sofortigen iPhone-Alarm behauptet die App nicht. Ein unbeaufsichtigter Zeitplan ist weiterhin nicht eingerichtet.

Die Serverlogik erzwingt den Filialumfang. Auch alte Einstellungen `online: true` oder `marketplace: true` koennen keine Online-Pushs ausloesen. Alte Shop-Suchquellen und erkannte reine Online-Angebote sind verlustfrei als `kind='archived'` deaktiviert. Alte Online- und unsichere Pickup-Ereignisse bleiben in der Datenbank, erscheinen aber nicht mehr im Verlauf und werden nicht versendet.

Der konservative Schema.org-Parser akzeptiert nur zum konkreten Produkt gehoerende Filialangebote mit Store-Typ, vollstaendiger Adresse, passendem regionalem Umfang, expliziter Stueckzahl `inventoryLevel.value` und widerspruchsfreier Verfuegbarkeit. Diese generische Auswertung ist **kein verifizierter Haendler-Adapter**. Keine der bisherigen Quellen liefert aktuell verifiziert passende Daten.

Die UVP-Regel ist serverseitig verpflichtend: ein belegter, zum Filialangebot gehoerender Preis in EUR muss <= der eigenen UVP-Referenz liegen, und Preis sowie Beleglink muessen hinterlegt sein. Online-Preise werden nicht uebernommen. Fehlende Preise, fremde Waehrung, widerspruechliche Preise, fehlende Referenzen und Angebote darueber erzeugen keine Alarme. Rabatte darunter sind erlaubt. Jede Filiale wird einzeln verglichen; abweichende Preise anderer Filialen werden nicht verwendet. Diese Regel garantiert die Einhaltung der eingegebenen Referenz, nicht die Richtigkeit einer manuell angegebenen Hersteller-UVP.

Eine Abholoption, Lieferbarkeit aus dem Zentrallager, Vorbestellung oder Lieferzeit in die Filiale genuegt nicht. Eine erste Sichtung wird als `Erstmals beobachtet` markiert. Erst ein fuer dieselbe Filiale bekannter Wechsel von nicht verfuegbar zu verfuegbar ist `Wieder verfuegbar`. Eine hoehere Stueckzahl allein wird nicht als Lieferung gemeldet. Fehlende Filialen, Teilantworten, Sperren und Fehler loeschen den letzten bekannten Zustand nicht. Benachrichtigungen nennen nur die neu verfuegbaren Filialen.

Wird ein bereits verfuegbarer Artikel erst spaeter preislich belegbar oder ausreichend guenstig, lautet das Ereignis `Jetzt im UVP-Rahmen`, nicht `Wareneingang` oder `Wieder verfuegbar`. Wiederholte identische Beobachtungen erzeugen keinen weiteren Alarm. Ereignisse speichern Filialpreise und UVP-Referenz samt Beleg zum damaligen Zeitpunkt. Aeltere Ereignisse ohne solche Belege bleiben in der Datenbank, erscheinen aber nicht im UVP-Verlauf und werden nicht gepusht. Vor einem erneuten Push-Versuch werden auch die neueste Filialverfuegbarkeit und der Preis gegen die aktuelle Referenz geprueft. Zustandswechsel und Ereignis werden zusammen in einer Datenbanktransaktion gespeichert.

Schema.org-Daten beschreiben Angebote, nicht interne Warenbuchungen: https://schema.org/availableAtOrFrom und https://schema.org/inventoryLevel

## Lokal Starten

Node 22.13 oder neuer. `npm ci`, einmal `node scripts/push-keys.mjs`, dann `npm run dev`. Die generierte `.dev.vars` enthaelt geheime Schluessel und bleibt ignoriert. Produktionswerte gehoeren ausschliesslich in Sites-Runtime-Variablen.

D1-Schema: `db/schema.ts`, unveraenderliche Migrationen: `drizzle/`. Vor lokalen Migrationen bauen und Wrangler mit `dist/server/wrangler.json` und `.wrangler/state` verwenden. Die neue Migration `0001_aspiring_rockslide.sql` ergaenzt UVP-Referenzen und Filialpreis-Belege; bestehende Daten bleiben erhalten. Alle Migrationen in Reihenfolge anwenden, keine Tabellen zur Laufzeit erstellen.

## Spaetere Hintergrundanbindung

Erst nach echter Datenquellen-Verifizierung und erfolgreicher privater Veroeffentlichung einen Zeitplan anbinden. Sites-Authentifizierung schuetzt alle Routen des persoenlichen Radars. Ein spaeterer Lauf ruft `get_site` fuer genau dieses Site-Projekt auf und verwendet dessen aktuellen `siwc_bypass_bearer_token` ausschliesslich im Header `OAI-Sites-Authorization: Bearer ...` an diese Site. Einmal POST `/api/background`, danach per GET gespeicherte Ergebnisse und `schedulerAt` pruefen. Kein Rebuild bei einer Datenaktualisierung.

`/mcp` bietet `check_pokemon_drops`. Keine Zugangsdaten in Zeitplan-Prompts speichern. Bestehende passende Zeitplaene wiederverwenden. Ohne relevante Aenderung still bleiben. Der Pause-Schalter gilt auch im Hintergrund. `PUT /api/background` speichert nur Zeitplan-Metadaten; es startet keinen Scheduler.

Auf dem iPhone muss die spaetere HTTPS-App zum Home-Bildschirm hinzugefuegt und von dort gestartet werden. Push-Berechtigung nur durch direkte Nutzeraktion. Testzustellung auf dem Empfangsgeraet pruefen. https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/

## Tests

`node --test tests/*.test.mjs` prueft Parser und echten Worker-Code mit der echten Datenbankmigration in einer temporaeren In-Memory-SQLite-Datenbank. Fuer diese Tests Node 24 verwenden. Abgedeckt sind Online-Ausschluss, Abholung versus Ladenbestand, Lageradressen, Filialbezug, Fremdverkaeufer, gebrauchte Artikel, widerspruechliche Daten, erste Sichtung versus Wiederverfuegbarkeit, Teilantworten, Sperren, alte Online-Einstellungen, ausstehende Online-Pushs und Adressvarianten. Die positiven Testdaten sind synthetische Fixtures, keine Live-Bestaende.

Zusaetzliche Tests pruefen alle zehn Ketten, Cent-Vergleiche, EUR-Pflicht, fehlende/zu hohe Preise, verschiedene Filialpreise, spaetere Preisqualifikation, persistierte Referenzen, Alt-Ereignisse ohne UVP-Beleg, aktuell unpassende ausstehende Alarme, Haendlerwechsel bei Weiterleitungen und Transaktions-Rollback. Hinweistests pruefen Frische, leere Gegenmeldungen, SKU-Trennung, Tagesgenauigkeit, Oeffnungszeiten, wiederholte Fenster, Feed-Blockaden, Kandidatenpruefung, persistente deduplizierte Feed-Importe und synthetische Push-Uebertragung. Stand: 84 Tests erfolgreich; keine reale iPhone-Zustellung dadurch belegt. Neue Tests decken Kartenzuordnung, konservative Filter, Tour-Speicher, andere Sets/Zubehoer und die einmalige Wiederaufnahme frischer Hinweise nach Geraeteverbindung ab.

## Offizielle Adressquellen Der Ergaenzungen

- GALERIA: https://www.galeria.de/filialen/l/leipzig/neumarkt-1/001559
- Mueller Petersstrasse 28: aktuelle offizielle Standortangabe in https://karriere.mueller.de/v1/jobposting/d5e80c192bd211a0c7d9fae2bdf5f3ba51c4c3eb/export/pdf ; Filialfinder https://www.mueller.de/storefinder/
- Rossmann: https://www.rossmann.de/de/filialen/sachsen/leipzig/petersstr--44.html
- EDEKA: https://www.edeka.de/eh/nordbayern-sachsen-th%C3%BCringen/edeka-vo%C3%9Fler-pestalozzistra%C3%9Fe-72/index/
- REWE: https://www.rewe.de/marktseite/leipzig/4040174/rewe-markt-willy-brandt-platz-4/
- Lidl: https://www.lidl.de/s/de-DE/filialen/leipzig/bruehl-1/

Geprueft am 06.10.2026. Adressen belegen weder Pokemon-Sortiment noch Preise oder aktuelle Verfuegbarkeit.

`node node_modules/typescript/bin/tsc --noEmit` prueft TypeScript. Der Sites-Build erfolgt mit dem gebuendelten `build-site.mjs`.
