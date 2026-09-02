-- 2026-09-02 · Pin search_path on the E.164 normalizer.
-- Supabase advisor lint 0011 (function_search_path_mutable) flagged
-- public.voice_line_e164(text), created by 20260901230000_voice_lines_publish
-- without a search_path clause. Behavior unchanged.
-- STATUS 2026-09-02 (later session): APPLIED TO PROD via MCP apply_migration
-- (in server migration history as voice_line_e164_search_path). The session
-- that wrote this file had both MCP doors classifier-blocked; the next one
-- did not — the doors flake per session. Verified: pg_proc.proconfig carries
-- search_path=public. Nothing left for the operator here.
alter function public.voice_line_e164(text) set search_path = public;
