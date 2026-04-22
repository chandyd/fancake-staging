-- Fix: Rimuove definizione duplicata di search_media
DROP FUNCTION IF EXISTS search_media(TEXT, VARCHAR, UUID, BOOLEAN, INTEGER, INTEGER);
-- Mantiene solo la definizione corretta
-- La funzione rimanente è già definita correttamente nel file principale
