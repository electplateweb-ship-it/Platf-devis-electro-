-- Nouvelles colonnes du profil de l'établissement
alter table public.establishments
  add column if not exists tax_id text,
  add column if not exists registration_number text,
  add column if not exists currency text default 'FCFA',
  add column if not exists default_conditions text;

-- Espace de stockage PRIVÉ pour les logos (2 Mo max, PNG ou JPEG)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('logos', 'logos', false, 2097152, array['image/png', 'image/jpeg'])
on conflict (id) do nothing;

-- Chaque établissement n'accède qu'à son propre dossier (nom du dossier = id de l'établissement)
create policy "logos lecture" on storage.objects
  for select to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] in
    (select id::text from public.establishments where owner_id = auth.uid()));

create policy "logos ajout" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'logos' and (storage.foldername(name))[1] in
    (select id::text from public.establishments where owner_id = auth.uid()));

create policy "logos modification" on storage.objects
  for update to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] in
    (select id::text from public.establishments where owner_id = auth.uid()))
  with check (bucket_id = 'logos' and (storage.foldername(name))[1] in
    (select id::text from public.establishments where owner_id = auth.uid()));

create policy "logos suppression" on storage.objects
  for delete to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] in
    (select id::text from public.establishments where owner_id = auth.uid()));
