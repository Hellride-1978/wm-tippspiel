-- Elfmeterschießen-Ergebnis für K.o.-Spiele (kicktipp-Standard: zählt für die Wertung).
-- Einmalig im Supabase SQL-Editor ausführen. Danach läuft alles automatisch über den Sync.
alter table wm_matches_cache
  add column if not exists home_penalty_score integer,
  add column if not exists away_penalty_score integer;
