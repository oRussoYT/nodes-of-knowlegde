-- Second Node (docs/ROTEIRO.md fase 2, etapa N), asked for by the founder on
-- 28 Oct 2026: the Mamirauá Institute for Sustainable Development (Tefé,
-- Amazonas), on the same engine. It starts with its institution only -- no
-- people until real lists arrive. Provisional; the founder may remove it.

insert into public.organizations (name, short_name, organization_type, status, source_type, verification_status,
                                  latitude, longitude, country_code, city, location_source)
select 'Instituto de Desenvolvimento Sustentável Mamirauá', 'IDSM', 'research_institute', 'active', 'admin_entered', 'provisional',
       -3.354, -64.711, 'BR', 'Tefé', 'Approximate location of Tefé, Amazonas (city centre)'
 where not exists (select 1 from public.organizations o where lower(o.name) = lower('Instituto de Desenvolvimento Sustentável Mamirauá'));

insert into public.organization_names (organization_id, name, name_type, source_type, verification_status)
select o.id, x.n, x.t, 'admin_entered', 'provisional'
  from public.organizations o
  join (values ('IDSM', 'acronym'), ('Mamirauá Institute for Sustainable Development', 'translation')) as x(n, t) on true
 where o.name = 'Instituto de Desenvolvimento Sustentável Mamirauá'
   and not exists (select 1 from public.organization_names n where n.organization_id = o.id and lower(n.name) = lower(x.n));

insert into public.nodes (slug, name, short_name, tagline, description, cover_photo, plan)
values ('mamiraua', 'Instituto de Desenvolvimento Sustentável Mamirauá', 'Mamirauá',
        'Research and people of the flooded forests of the Middle Solimões.',
        'The Mamirauá Institute, in Tefé (Amazonas), studies and works with the várzea — the seasonally flooded forests — and the '
        || 'communities that live in them. This Node starts with the institution; its people and history are added from real records.',
        '/photos/flooded', 'pro_bono')
on conflict (slug) do nothing;

insert into public.node_organizations (node_id, organization_id, role)
select n.id, o.id, 'core'
  from public.nodes n
  join public.organizations o on o.name = 'Instituto de Desenvolvimento Sustentável Mamirauá'
 where n.slug = 'mamiraua'
on conflict do nothing;

insert into public.audit_logs (actor_user_id, action, subject_type, subject_id, subject_label, metadata)
select null, 'create', 'node', n.id, n.name, jsonb_build_object('migration', '20261029200000_add_mamiraua_node', 'requestedBy', 'founder')
  from public.nodes n where n.slug = 'mamiraua';
