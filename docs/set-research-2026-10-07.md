# 30 Jahre: Sortiment und Datenanschluesse

Recherche: 7. Oktober 2026. Ziel: vor Ort vorhandene deutsche Neuware bis belegter UVP-Referenz, kein Versandbestand. Katalogeintrag, Verkaufsfreigabe, Filialverfuegbarkeit und Wareneingang sind unterschiedliche Tatsachen.

## Sortiment

19 Katalogpositionen in 14 Produktfamilien, zehn belegte EANs, 22 konkrete Haendler-Artikelquellen. Varianten mit gemeinsamen Sortimentsbarcodes (Mini-Tins und Tech-Sticker) werden nicht als erfundene Einzel-SKUs vervielfacht.

- Handelsnachweise: Top-Trainer-Box, Boosterbundle, Mini-Tin, Evoli-2er-Blister, Tech-Sticker, Poster, Feelinara-ex und Quajutsu-ex Kollektionen, grosse Tins Tag und Nacht.
- Angekundigt / Zuordnung offen: Ordner-Kollektion mit fuenf Boostern, zwei Kampfdecks (keine Booster), Ditto-Premium, zwei Ultra-Premium-Kollektionen, zwei Figuren-Kollektionen und Knock-out. Beim Knock-out ist die eigene deutsche Handelsnummer und Abgrenzung zum Evoli-Blister ungeklart.
- Hersteller DE nennt oft nur Quartale. US-Termine bleiben US-Termine: Kampfdecks 30.10.; Ditto, Ultra-Premium und Figuren 06.11.; Ordner 04.12.2026. Das sind keine bestaetigten deutschen Filial-Liefertermine.
- Deutsche Haendler nennen fuer einige offiziell als Q4 angekundigte Artikel eine Verkaufsfreigabe ab 16.09.2026. Das ist als abweichender Beleg ausgewiesen, kein Beweis fuer Ware in einer bestimmten Filiale.
- UVP wird nicht aus Onlinepreisen, Gewinnspielwerten oder fremdsprachigen Marktprodukten abgeleitet. Fuer zukuenftige Produkte ohne belegte deutsche EAN wird keine Nummer geraten.

Primarquellen:

- [Pokémon DE Produktvorschau](https://www.pokemon.com/de/news/pokemon-sammelkartenspiel-produktvorschau-30-jahre)
- [Pokémon US Produktvorschau](https://www.pokemon.com/us/news/pokemon-tcg-30th-celebration-product-showcase)
- [Offizieller Oktober-Ueberblick inkl. grosser Tins](https://www.pokemon.com/de/news/wirf-einen-blick-auf-alle-pokemon-sammelkartenspiel-produkte-die-im-oktober-2026-veroeffentlicht-werden)
- [Smyths Produktkategorie](https://www.smythstoys.com/de/de-de/spielzeug/action-spielzeug/pokemon/pokemon-karten/c/SM1001012002)
- [VEDES Hersteller-/Artikelkatalog](https://www.vedes.com/k/spiele-puzzle/kartenspiele/trading-cards)
- Die Quellen je GTIN stehen in `lib/set-catalog.ts`; Bundle und Mini-Tin stammen zusaetzlich aus dem vom Nutzer gezeigten Kassenbeleg.

## Haendlerabdeckung

Alle zehn angefragten Ketten wurden mit beiden Beleg-Barcodes (UPC und EAN-13) in der Websuche geprueft. Kein indexierter Treffer ist kein Beweis gegen ein lokales Sortiment. Nicht jede dieser Suchen war eine native App-Abfrage.

| Haendler | Ergebnis / Stand | Naechster benoetigter Anschluss |
| --- | --- | --- |
| Smyths Toys | Neun konkrete Set-Artikelseiten. Automatische Seitenaufrufe werden blockiert; kein live verifizierter Filialadapter. | Regulare Filialabfrage und deren belegte unmittelbare Bestandsantwort. |
| GALERIA | ETB EAN 0196214144842. Browser-Filialabfrage: Leipzig, Neumarkt 1, 04109, nicht in der Filiale verfuegbar. Serverabruf 403. | Regulare Filialdatenantwort nach Artikelauswahl; jetzige manuelle Momentaufnahme ist kein automatischer Feed. |
| MediaMarkt | Native Suche "Pokémon 30 Jahre": 31 Treffer, darunter andere Serien, Pluesch und Marketplace. UPC Mini-Tin keine Treffer. Kein belegtes passendes eigenes Angebot. | Eigene Artikel-ID und konkrete Leipziger Marktverfuegbarkeit, Marketplace ausschliessen. |
| Thalia | Beide Beleg-Barcodes ohne oeffentlich zugeordneten Artikel. Offizielle App unterstuetzt Barcodes und Filialverfuegbarkeit; Webabruf blockiert. | Native Artikelansicht/Teilen-Link mit exakter Artikel-ID und Filialantwort. |
| Hugendubel | Kein indexierter passender EAN-Treffer. Offizielle App dokumentiert Barcode-Scan fuer Buecher UND andere Produkte plus Filialverfuegbarkeit. | Native Artikel-ID und Produkt-/Filialansicht, nicht nur Buchsuche. |
| Mueller | Kein verifizierter Set-Artikel oder Filialfeed gefunden; damit Bestand unbekannt. | Verifizierter eigener Katalogartikel mit Filialabfrage. |
| Rossmann | Kein verifizierter Zielartikel. Offizielle Produkt-/App-Filialpruefung ist dokumentiert. | Passender Artikel und ausgewaehlte Leipziger Filiale. |
| EDEKA | Kein filialgenauer Feed fuer das Set belegt. | Konkreter selbststaendiger Markt, Sortiment/Preis und unmittelbarer Bestand. |
| REWE | Kein filialgenauer Feed fuer das Set belegt. | Konkreter Markt und bestaetigter Produktanschluss; Lieferung nicht als Filialbestand werten. |
| Lidl | Kein passender filialgenauer Bestand belegt. | Lokale Aktions-/Filialquelle; allgemeine Prospekte sind kein Bestand. |
| Saturn | Eigene Artikel 3067917 (Bundle) und 3067922 (Mini-Tin), Hersteller-Artikelnummern 14524/14631. | Konkrete Markt-Auswahl mit sofortiger eigener Abholung; keine Aussage ueber Leipzig ohne diese Auswahl. |
| VEDES | Zehn konkrete deutsche Artikel mit Barcodes/Inhalt. Haendlernetz hat Reservierungsangebote, aber gezeigte Anbieter nicht Leipzig. Serverantwort 429. | Identifizierter lokaler Haendler mit vor Ort vorhandener Ware; Preis separat belegen. |
| idee+spiel | Grosse Tag/Nacht-Tins und Abholhinweise im Haendlernetz auffindbar. Keine belegte sofortige Leipziger Ware. | Lokaler Anbieter, Abholzeit und Filialpreis. |

Weitere Kandidaten (ROFU, ALDI, Penny, Netto, Kaufland) recherchiert, aber kein belastbarer Zielprodukt-Filialfeed. Kaufland-Marketplace nicht einbeziehen.

App-Funktionen: [Thalia](https://www.thalia.de/vorteile/thalia-app), [Hugendubel Barcode-Scan](https://www.hugendubel.de/de/category/90952/hugendubel_app_barcodes_scannen.html), [GALERIA Click & Collect](https://www.galeria.de/service/services-at-ort/click-collect).

## Betrieb

Die neuen Quellen werden einmalig hinzugefuegt. Vorhandene Pausen, Preisreferenzen und geloeschte Quellen bleiben erhalten. Bei einem Sicherheitscheck wird der gesamte betroffene Host fuer 30 Minuten pausiert statt alle Produkte desselben Haendlers erneut abzurufen. Ein blockierter Abruf setzt Bestand nicht auf null.

Der allgemeine Parser akzeptiert nur eindeutig dem Artikel zugeordneten sofortigen Filialbestand mit Adresse, Mengenbeleg und Preisreferenz. Die 22 URLs allein sind noch keine 22 funktionierenden Bestandsfeeds. Fehlende branchenspezifische Antworten bleiben sichtbar unbekannt. Keine Restock-Sicherheit oder laufende automatisierte Erkennung behaupten, solange ein solcher Anschluss nicht real getestet wurde.
