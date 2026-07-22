-- COI tracking (deferred item from P3): certificate-of-insurance expiry per
-- vendor. Existing policies cover it: operator ALL (sets the date after
-- filing the cert in the vendor folder), owner/operator read, vendor reads
-- own row (sees their own COI status).
alter table public.vendors add column if not exists coi_expires date;
alter table public.vendors add column if not exists coi_note text not null default '';
