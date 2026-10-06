# Untersuchung Der Filialdaten

Stand: 06.10.2026. Diese Datei dokumentiert eine Datenquellen-Recherche, keine aktive Bestandsanbindung. Es wurde kein aktueller Drop des Jubilaeumssets verifiziert.

## Thalia: Oeffentliche Filialabfrage Gefunden

Die Filiale Karl-Liebknecht-Str. 8-14, 04107 Leipzig hat die offizielle Filial-ID `5629`:

https://www.thalia.de/buchhandlung/5629

Die Produktseite erlaubt ohne Anmeldung die Standortauswahl und eine Abholtermin-Abfrage. Beim normalen Bedienen dieser Oberflaeche wurden folgende oeffentlichen Webseitenanfragen beobachtet:

```text
GET https://www.thalia.de/include/filialabholung/filialauswahl/A1077971868?origin=ads
GET https://www.thalia.de/include/kundenfiliale/5629/A1077971868?filialeAusgewaehlt=true&filialeFavorisiert=true
GET https://www.thalia.de/api/filialabholung/5629/abholaussage/A1077971868
```

`A1077971868` ist das Produkt "PKM ME02.5 9-Pocket Portfolio". Es ist ein Ultra-Pro-Zubehoerartikel, **keine versiegelte Kartenware aus 30 Jahre**. Es wurde nur zum Nachvollziehen der oeffentlichen Filialfunktion verwendet und nicht als Kartenquelle zum Radar hinzugefuegt:

https://www.thalia.de/shop/home/artikeldetails/A1077971868

Nach Auswahl von Leipzig und Klick auf "Hier Abholtermin erfahren" fuer die Karli-Filiale stand dort:

> Voraussichtlich abholbereit am 07.10.2026

Das ist kein Nachweis, dass dieser Artikel am 06.10. im Laden liegt. Thalia erklaert selbst: Bei vorhandener Ware ist Abholung innerhalb kurzer Zeit moeglich; andernfalls kann Ware fuer den naechsten Werktag in die Filiale bestellt werden:

https://www.thalia.de/vorteile/filialabholung

Alle drei beobachteten Anfragen lieferten bei direktem automatisiertem Abruf HTTP 403 mit einem Sicherheits-Check. Es wurden keine Sitzungs-Cookies oder Tokens aus dem Browser exportiert, keine Zugangsdaten eingesetzt und keine Schutzmassnahmen umgangen. Die erfolgreich bediente Browseroberflaeche ist daher noch kein Beleg, dass ein dauerhaft laufender Server die Daten abrufen darf oder kann. Das Antwortschema der API wurde nicht verifiziert.

Die bisherige Suche nach `Pokemon 30 Jahre` ergab keinen eindeutig passenden Kartenartikel. Die vertiefte Suche `Pokemon First Partner` ergab drei Buch-/eBook-Treffer. Die breitere Kartensuche enthaelt Zubehoerartikel. Fehlende Treffer beweisen **keinen fehlenden Ladenbestand**: Store-only-Artikel oder nicht in der Suche auffindbare Produkte bleiben unbekannt.

### Konkreter Barcode Der Mini Tin

Am 06.10.2026 wurde vom Nutzer der Code `196214146310` genannt und der Artikel als Mini Tin bestaetigt. Die UPC-A-Pruefziffer ist gueltig; die gleichwertige EAN-13 lautet `0196214146310`. Der Code identifiziert das Produkt, nicht eine Filiale oder eine interne Thalia-Artikel-ID.

Die Produktzuordnung "Pokemon 30 Jahre Mini Tin, Deutsch" wird durch oeffentliche Haendlerangaben mit genau diesem Barcode gestuetzt:

- https://www.wellplayed.ch/de/products/pokemon-tcg-30-jahre-mini-tins-de
- https://www.toytans.ch/de/pokemon-tins/2890-pokemon-me055-30-jahre-mini-tin-de-196214146310.html

Diese Onlineshop-Seiten wurden ausschliesslich zur Produktidentifikation verwendet. Ihre Preise, Liefertermine und Verfuegbarkeiten sind weder Leipziger Filialdaten noch deutsche UVP-Referenzen und werden nicht als Radarquelle aktiviert.

Die normale Thalia-Websuche wurde mit beiden gleichwertigen Codes bedient. Beide lieferten keinen passenden Artikel. Die anschliessende Suche nach "Pokemon 30 Jahre Mini Tin" zeigte 36 unscharfe Treffer; nach Laden aller 36 Treffer war keine passende Jubilaeums-Mini-Tin enthalten. Daher liegt weiterhin keine verifizierte Thalia-Artikel-ID oder Filialantwort fuer diesen Code vor. Das ist kein Nachweis, dass die Mini Tin in Thalia-Laeden nicht verkauft wird.

Thalia beschreibt fuer seine native App eine Produktscan-Funktion und die Anzeige der Verfuegbarkeit in einer ausgewaehlten Lieblingsbuchhandlung: https://www.thalia.de/vorteile/thalia-app . Ob dieser konkrete Code dort einen Artikel mit Filialverfuegbarkeit oeffnet, ist noch ungeprueft. Ein Teilen-Link oder Screenshot dieser Artikelansicht ist der naechste gezielte Pruefpunkt; eine weitere Barcode-Anfrage ist fuer die Mini Tin nicht erforderlich.

Die gesonderte Funktion Scan & Go dient laut Thalia dem Bezahlen waehrend eines Filialbesuchs, einschliesslich Spielwaren: https://www.thalia.de/vorteile/scan-go . Ihre Existenz belegt keine Fernabfrage von Warenbestand oder Wareneingang. Es wurden keine Standortdaten gefaelscht, QR-Zugangscodes beschafft oder Bezahlvorgaenge ausgeloest.

### Kassabon Mit Boosterbundle Und Mini Tin

Ein am 06.10.2026 vom Nutzer gezeigter Kassabon-Ausschnitt enthaelt zwei Artikelzeilen:

- `Art/EAN 196214145245` - `PKM 30 Jahre Boosterbund`
- `Art/EAN 196214146310` - `PKM 30 Jahre Mini-Tin`

Der Kopf nennt teilweise lesbar Thalia Leipzig Karl-Liebknecht. Der Ausschnitt ist ein konkreter Beleg fuer den Verkauf dieser Artikel im Filialsortiment, aber Kaufdatum, Uhrzeit und Artikelpreise sind nicht lesbar. Er wird deshalb weder als heutige Bestandsmeldung noch als Liefer-/Verraeumzeit, UVP-Beleg oder zusaetzlicher Fund mit erfundenem Zeitstempel gespeichert. Das private Belegfoto und Zahlungsinformationen werden nicht in die App-Quellen aufgenommen.

Die oeffentliche Produktzuordnung des Boosterbundles wird unter anderem hier durch genau denselben Barcode gestuetzt: https://amazingtoys.ch/Pokemon-TCG-30-Jahre-Boosterbundle-DE . Wiederum ausschliesslich Identifikation, keine aktive Onlineshop-Bestandsquelle.

Die beiden gleichwertigen Codes `196214145245` und `0196214145245` wurden anschliessend in der normalen Thalia-Websuche geprueft. Beide lieferten keinen passenden Artikel. Damit ist nun auch der konkrete Boosterbundle-Code bekannt; der offene Punkt ist die Verknuepfung mit einer abfragbaren Thalia-Artikel-ID und einer echten Filialverfuegbarkeitsantwort, nicht erneut die Beschaffung des Barcodes.

## Andere Gepruefte Quellen

- Smyths: Die reale Produktseite fuer "Pokemon 30 Jahre Edition Feelinara-ex", Artikel `264162`, ist bekannt. Auch der normale Recherche-Browser wurde am Sicherheits-Check angehalten. Kein aktueller Filialbestand konnte ausgelesen werden. https://www.smythstoys.com/de/de-de/spielzeug/action-spielzeug/pokemon/pokemon-karten/pokemon-30-jahre-edition-feelinara-ex/p/264162
- Hugendubel: Die bediente oeffentliche Suche `Pokemon 30 Jahre` lieferte drei Buecher, keine passende Kartenware. Daraus folgt keine Aussage ueber Ware an der Filialkasse. Ein Karten-Filialfeed wurde nicht verifiziert. https://www.hugendubel.de/de/search?q=Pokemon%2030%20Jahre
- MediaMarkt: Die gefundenen deutschen Jubilaeumsangebote enthielten Marketplace-Verkaeufer. Diese sind keine Quelle fuer MediaMarkt-Filialbestand und wurden nicht aktiviert. Gefundene oesterreichische Produkte wurden ebenfalls nicht als Leipziger Filialquelle verwendet.
- Mueller, GALERIA, Rossmann, EDEKA, REWE und Lidl: Keine neue Live-Anbindung verifiziert. Verzeichnisadressen und Filialfinder belegen weiterhin weder Sortiment noch aktuellen Bestand.

## Vertiefte Community-Recherche Am 06.10.2026

Die gefundenen primaeren Erfahrungsberichte nennen drei unterschiedliche Informationswege: oeffentliche Filialabfragen, schnelle lokale Gruppenmeldungen und ueber mehrere Wochen selbst protokollierte Liefer-/Verraeumzeiten. Eine genaue Thalia-Wareneingangsbuchung oder ein einheitlicher Leipziger Lieferplan ist damit nicht belegt.

- Wochenlange Filial-/Zeitnotizen: https://www.reddit.com/r/PokemonTCG_DE/comments/1wpuchy/frustration_30_jahre_jubil%C3%A4um/ (25.09.2026). Anonyme Erfahrungsberichte, nicht unabhaengig bestaetigt.
- Unterschiedliche Verraeumzeiten, auch nach 14 Uhr: https://www.reddit.com/r/PokemonTCG_DE/comments/1tig0d5/wie_wisst_ihr_wann_restocks_in_l%C3%A4den_kommen/ (20.-21.05.2026). Kein universelles Mueller-Muster.
- Kurzlebige regionale Verfuegbarkeit: https://www.reddit.com/r/PokemonTCG_DE/comments/1wu2jb7/2_wochen_nach_release_habt_ihr_irgendwo_etwas/ (30.09.2026).
- Eine Leipzig/Halle-Messengergruppe wird erwaehnt: https://www.reddit.com/r/Leipzig/comments/1tya3q3/pokemon_tcg_messengergruppen_in_leipzig/ (06.06.2026). Kein oeffentlich lesbarer Restock-Stream dieser Gruppe verifiziert.
- Team Restocks bewirbt einen live abfragenden Filialpruefer fuer Rossmann, HIT und budni plus separate Instore-Informationen: https://www.teamrestocks.de/ . Anbieterangabe, kein getesteter Zugang und keine beworbene Thalia-Anbindung.
- TCG Alerts zeigt nach eigener Aussage Smyths-DE-Filialmonitor-Beispiele mit Produkt, Filiale und Stueckzahl: https://tcg-alerts.com/de . Preise der Beispiele sind unbekannt (`N/A`); sie sind weder UVP-Belege noch aktuelle Leipziger Drops. Premium wird mit 4,99 EUR/Monat beworben. Kein Abo abgeschlossen, keine Datenrechte oder Export-/API-Funktion verifiziert.

Das ist eine konkrete Antwort auf den vermuteten Informationsvorsprung: Solche Filialmonitore und Gruppeninfos werden angeboten. **Welche dieser Quellen die gestern beobachtete App verwendete, bleibt unbekannt.** Claude kann die Darstellung und Abfragen programmieren, liefert aber nicht automatisch eine sonst unzugaengliche Bestandsquelle.

Der normale Rossmann-Recherchebrowser zeigte die Seite nach einer automatischen Browserpruefung. Der sichtbare Amigo-Pokemon-Adventskalender war ausdruecklich `Nur Online` und kein 30-Jahre-Filialbeleg; er wurde ausgeschlossen. Die Direktabfrage der Homepage lieferte einen Client-Challenge-Inhalt trotz HTTP 200. https://www.rossmann.de/de/adventskalender-amigo-pokemon-adventskalender/p/0820650457463

Die App liest drei oeffentliche Reddit-Feeds. Beim lokalen Serverlauf wurden Beitragsfeeds lesbar, waehrend der Kommentarfeed mit HTTP 429 begrenzt wurde. Die Rueckoff-Regel bleibt aktiv. Bisher entstand daraus kein verifizierter aktueller Leipziger Fund. Private Gruppen werden nicht als angeschlossen ausgegeben; die Integrationssuche fand keinen fuer dieses Lesen passenden Discord-/WhatsApp-Connector.

Der eigene Kauf bei Hugendubel am 05.10.2026 gegen 12:20 ist die konkrete lokale Verraeum-Beobachtung. Da Filiale und Preis noch fehlen, wurde er keiner der drei Hugendubel-Adressen pauschal zugeschrieben. Eine einzelne Beobachtung begruendet keinen wiederkehrenden Liefertermin.

## Fahrtindikator Und Offene Voraussetzungen

Eine App kann wiederholte oeffentliche Filialmeldungen vergleichen und einen Wechsel von "nicht vorraetig" zu "vorraetig" auf einer Karte anzeigen. Die gefundene Thalia-Funktion ist eine konkrete moegliche Grundlage fuer diesen Ansatz; sie beweist nicht, welche Datenquelle die vom Nutzer beobachtete App tatsaechlich verwendet hat.

Ein Bestandswechsel ist ein nuetzlicher Fahrtindikator, aber keine bestaetigte Wareneingangsbuchung: Beispielsweise koennen auch aufgehobene Reservierungen den verfuegbaren Bestand veraendern. Ein exakter Liefer-/Buchungszeitpunkt braucht eine ausdruecklich zugelassene Quelle des Haendlers. Solche Daten werden hier weder angenommen noch vorgetaeuscht.

Die verbleibenden Voraussetzungen sind:

1. Die Zuordnung der bekannten Thalia-Barcodes `196214146310` (Mini Tin) und `196214145245` (Boosterbundle) zu tatsaechlich abfragbaren Artikelansichten; fuer weitere Produkte und Haendler entsprechende Artikel-IDs/EANs.
2. Eine erlaubte, dauerhaft abrufbare Filialantwort, die Bestand vor Ort von Lieferung in die Filiale unterscheidet.
3. Ein belegter Filialpreis und eine passende UVP-Referenz fuer exakt diesen Artikel.
4. Ein dauerhaft laufender Hintergrunddienst sowie eine getestete iPhone-Push-Zustellung.

Ein Name, Link oder Screenshot der anderen App kann helfen, Punkt 1 und 2 gezielt aufzuklaeren. Autorisierte Haendler-Schnittstellen koennen angebunden werden; ohne solche Berechtigungen erfolgt kein Zugriff auf interne Warenwirtschaftssysteme.
