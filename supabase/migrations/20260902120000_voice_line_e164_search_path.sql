-- 2026-09-02 · Pin search_path on the E.164 normalizer.
-- Supabase advisor lint 0011 (function_search_path_mutable) flagged
-- public.voice_line_e164(text), created by 20260901230000_voice_lines_publish
-- without a search_path clause. Behavior unchanged.
-- STATUS 2026-09-02: NOT YET ON PROD. Both MCP doors (apply_migration and
-- execute_sql) were classifier-blocked in the headless session that wrote
-- this file. Operator applies it (SQL editor or supabase db push); it is a
-- single idempotent ALTER.
alter function public.voice_line_e164(text) set search_path = public;
