# Quellenpruefung 08.10.2026

Ziel: fruehe, filialgenaue Hinweise auf neue Pokemon-30-Jahre-Kartenware zum UVP-Rahmen. Versandbestand ist kein Filialbestand.

## Ergebnis

- Pokeping: https://discord.com/servers/pokeping-alertes-restock-fr-en-1347874448577134632 nennt kostenlose EU-Alerts und Deutschland. Kostenlos beigetreten. Im lesbaren Kanal `choose-your-alerts` existiert eine Rolle `Deutsche Karten`; ihre Auswahl war wegen erforderlicher Handyverifizierung gesperrt. Deutsche Filialkanale, Updatefrequenz, SKU-Abdeckung und eine Datenfreigabe sind noch nicht belegt. Keine fremden Privatnachrichten ausgelesen.
- Pokemon Restocks and Alerts: https://discord.com/servers/pokemon-restocks-and-alerts-1369077918244012072 bewirbt kostenlose In-Store-Pruefungen. Deutschland-Abdeckung offen.
- TCG Alerts: https://tcg-alerts.com/de zeigt Smyths-DE-Filialbeispiele. Die FAQ ordnet Instant-Alerts und Bestandschecks dem kostenpflichtigen Premiumplan zu.
- Cardwatch: https://cardwatch.eu/de beschreibt sechs Stunden Verzoegerung im kostenlosen Kanal. Daher kein kurzfristiger Filialalarm.
- Pokekarte: https://pokekarte-de.vercel.app/en/feed am 08.10.2026 ohne Zugang lesbar. Eigene Fundmeldungen aktuell leer; lokale Mydealz-Hinweise vorhanden (u.a. Kaufland, Globus). Nicht Leipzig- oder Restock-verifiziert.
- Kartodex: https://www.kartodex.de/restock-radar war wegen nicht passendem TLS-Zertifikat nicht abrufbar. Kein Sicherheitscheck umgangen, nicht als verbunden bezeichnet.
- Reddit: oeffentliche Feeds aus der lokalen Pruefung HTTP 403. Der Produktionsstatus wird pro Quelle angezeigt; nicht pauschal als live verkauft.
- Weitere Recherche: https://developers.reddit.com/apps/pokemon-restocks beschreibt einen Discord-zu-Reddit-Monitor, braucht aber ebenfalls einen freigegebenen Bot-/Kanalzugang. Keine unabhaengige kostenlose deutsche Bestandsdatenquelle.
- Gegenprobe: https://www.trackalacker.com/articles/news/best-free-pokemon-restocks-discord-server bewirbt kostenlose Alerts, aber keine belegten Leipziger Filialdaten. Nicht als deutsche Filialquelle aktiviert.
- Deutsche Reddit-Berichte unterscheiden sich stark nach Filiale. https://www.reddit.com/r/PokemonTCG_DE/comments/1s45vep/pokemon_m%C3%BCller_restock/ nennt widerspruechliche Liefertage; https://www.reddit.com/r/PokemonTCG_DE/comments/1whedhi/sammelthread_30th_release/ enthaelt historische Leipziger Nichtbelieferungsberichte. Keiner dieser alten Berichte wird als heutiger Bestand oder universelles Liefermuster uebernommen.

## Eingebaute Anbindung

Der kostenlose oeffentliche Pokekarte-Reader liest nur als `local` markierte 30-Jahre-Kartenartikel. Online-Angebote, alte oder unlesbare Zeiten und fremde Beleghosts werden ausgeschlossen. Gerundete Altersangaben sind keine exakten Verräumzeiten. Diese Meldungen sind Kontext, keine Push-Ausloeser.

Discord kann mit einem Bot ueber die offizielle REST-API eingelesen werden. Voraussetzung ist ein fuer diesen Zweck freigegebener Kanal, in dem der Bot lesen darf. Alternativ koennen veroeffentlichte Announcement-Kanale in einen eigenen Server verfolgt werden. Ein Incoming-Webhook allein kann keine Nachrichten aus einem fremden Server auslesen.

Cloudflare-Konfiguration (Bot-Geheimnis niemals im Repository oder Chat ablegen):

```text
DISCORD_IMPORT_ENABLED=true
DISCORD_BOT_TOKEN=<als Cloudflare Secret hinterlegen>
DISCORD_CHANNELS=[{"guildId":"<Server-ID>","channelId":"<Kanal-ID>","label":"Freigegebene Filialmeldungen"}]
```

Maximal drei Kanaele, Abfrage fruehestens alle zwei Minuten; HTTP 429 und fehlende Rechte fuehren zu Backoff. VIEW_CHANNEL, READ_MESSAGE_HISTORY und MESSAGE_CONTENT muessen entsprechend eingerichtet sein. Keine privaten Kontotokens oder pauschalen Administratorrechte erforderlich. Die Freigabe muss auch die Verarbeitung der Filialhinweise im oeffentlichen Radar abdecken.

Gespeichert werden nur minimale passende Pruefkandidaten mit Original-Link. Autoren, Anhaenge und Volltexte werden nicht gespeichert. Nachrichtenzeit ist nicht automatisch Beobachtungszeit. Bis das konkrete Format einer Quelle verifiziert ist, werden Discordmeldungen nicht ungeprueft zu Bestandsalarmen hochgestuft.

Dokumentation:
- https://docs.discord.com/developers/resources/message#get-channel-messages
- https://support.discord.com/hc/en-us/articles/360028384531-Channel-Following-FAQ

## Verbleibende Alarmhuerde

Alle bestehenden Produktmonitore hatten bei der Pruefung keine UVP-Referenz. Ohne belegte Artikelreferenz und Filialpreis wird weiterhin kein UVP-Alarm verschickt. Eine explizite Verfuegbarkeit eines vollstaendig adressierten physischen Geschaefts darf nun auch ohne Stueckzahl verarbeitet werden; unbekannte Mengen bleiben `null`, nicht erfundene Einsen.
