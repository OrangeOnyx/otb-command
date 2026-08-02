-- Phase B merge-gate item (b): storage.objects policies move off the
-- profiles-era zero-arg helpers onto membership checks (single-tenant bridge
-- defaults). Folder-prefix layout (<property_id>/...) deliberately deferred
-- to multi-property onboarding: no second property exists, prefixing now
-- would require moving every prod object for zero isolation gain. The esign
-- signer policy is untouched (token-scoped via esign_requests state).

-- operator role policies (assets · documents · safe · maintenance-photos · vendor-docs)
alter policy "operator insert assets" on storage.objects
  with check (bucket_id = 'assets' and member_role_in(default_org_id(), default_property_id(), array['operator']));
alter policy "operator update assets" on storage.objects
  using (bucket_id = 'assets' and member_role_in(default_org_id(), default_property_id(), array['operator']));
alter policy "operator delete assets" on storage.objects
  using (bucket_id = 'assets' and member_role_in(default_org_id(), default_property_id(), array['operator']));
alter policy "operator insert documents" on storage.objects
  with check (bucket_id = 'documents' and member_role_in(default_org_id(), default_property_id(), array['operator']));
alter policy "operator update documents" on storage.objects
  using (bucket_id = 'documents' and member_role_in(default_org_id(), default_property_id(), array['operator']));
alter policy "operator delete documents" on storage.objects
  using (bucket_id = 'documents' and member_role_in(default_org_id(), default_property_id(), array['operator']));
alter policy "operator insert safe" on storage.objects
  with check (bucket_id = 'safe' and member_role_in(default_org_id(), default_property_id(), array['operator']));
alter policy "operator update safe" on storage.objects
  using (bucket_id = 'safe' and member_role_in(default_org_id(), default_property_id(), array['operator']));
alter policy "operator delete safe" on storage.objects
  using (bucket_id = 'safe' and member_role_in(default_org_id(), default_property_id(), array['operator']));
alter policy "operator all maintenance-photos" on storage.objects
  using (bucket_id = 'maintenance-photos' and member_role_in(default_org_id(), default_property_id(), array['operator']))
  with check (bucket_id = 'maintenance-photos' and member_role_in(default_org_id(), default_property_id(), array['operator']));
alter policy "operator all vendor-docs" on storage.objects
  using (bucket_id = 'vendor-docs' and member_role_in(default_org_id(), default_property_id(), array['operator']))
  with check (bucket_id = 'vendor-docs' and member_role_in(default_org_id(), default_property_id(), array['operator']));

-- owner+operator reads
alter policy "owner+operator read assets" on storage.objects
  using (bucket_id = 'assets' and member_role_in(default_org_id(), default_property_id(), array['owner','operator']));
alter policy "owner+operator read documents" on storage.objects
  using (bucket_id = 'documents' and member_role_in(default_org_id(), default_property_id(), array['owner','operator']));
alter policy "owner+operator read safe" on storage.objects
  using (bucket_id = 'safe' and member_role_in(default_org_id(), default_property_id(), array['owner','operator']));
alter policy "owner read maintenance-photos" on storage.objects
  using (bucket_id = 'maintenance-photos' and member_role_in(default_org_id(), default_property_id(), array['owner','operator']));

-- tenant photo policies: property-aware overload + property-scoped request match
alter policy "tenant rw own request photos" on storage.objects
  using (bucket_id = 'maintenance-photos' and (storage.foldername(name))[1] in (
    select r.id from maintenance_requests r
    where r.property_id = default_property_id()
      and r.unit = current_tenant_unit(default_org_id(), default_property_id())));
alter policy "tenant upload own request photos" on storage.objects
  with check (bucket_id = 'maintenance-photos' and (storage.foldername(name))[1] in (
    select r.id from maintenance_requests r
    where r.property_id = default_property_id()
      and r.unit = current_tenant_unit(default_org_id(), default_property_id())));

-- vendor folder policies: property-aware overload
alter policy "vendor read own folder" on storage.objects
  using (bucket_id = 'vendor-docs' and (storage.foldername(name))[1] = current_vendor_id(default_org_id(), default_property_id()));
alter policy "vendor upload own folder" on storage.objects
  with check (bucket_id = 'vendor-docs' and (storage.foldername(name))[1] = current_vendor_id(default_org_id(), default_property_id()));
