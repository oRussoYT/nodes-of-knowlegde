-- Reference institutions around the BDFFP / PDBFF, entered at the founder's
-- request (23 Oct 2026). Public organizations only -- no personal data.
--
-- All PROVISIONAL, source 'admin_entered': a steward confirms or corrects
-- them. Connections between these institutions and the project are not
-- asserted here; only the institutions themselves, plus the 1989 merger of
-- four federal bodies into IBAMA (so closed institutions can be read as such).
-- Any institution already in the record with the same name is left untouched.

with incoming (name, short_name, organization_type, status, location, closure_year) as (
  values
    ('Instituto Nacional de Pesquisas da Amazônia', 'INPA', 'research_institute', 'active', 'Manaus, Brazil', null::int),
    ('Smithsonian Tropical Research Institute', 'STRI', 'research_institute', 'active', 'Panama', null),
    ('Smithsonian Institution', null, 'museum', 'active', 'Washington, D.C., United States', null),
    ('World Wildlife Fund', 'WWF', 'conservation_ngo', 'active', 'United States', null),
    ('Universidade Federal do Amazonas', 'UFAM', 'university', 'active', 'Manaus, Brazil', null),
    ('Universidade do Estado do Amazonas', 'UEA', 'university', 'active', 'Manaus, Brazil', null),
    ('Universidade Federal do Pará', 'UFPA', 'university', 'active', 'Belém, Brazil', null),
    ('Universidade Federal do Oeste do Pará', 'UFOPA', 'university', 'active', 'Santarém, Brazil', null),
    ('Universidade de São Paulo', 'USP', 'university', 'active', 'São Paulo, Brazil', null),
    ('Universidade Estadual de Campinas', 'Unicamp', 'university', 'active', 'Campinas, Brazil', null),
    ('Universidade Estadual Paulista', 'Unesp', 'university', 'active', 'São Paulo state, Brazil', null),
    ('Universidade Federal do Rio de Janeiro', 'UFRJ', 'university', 'active', 'Rio de Janeiro, Brazil', null),
    ('Universidade Federal de Minas Gerais', 'UFMG', 'university', 'active', 'Belo Horizonte, Brazil', null),
    ('Universidade de Brasília', 'UnB', 'university', 'active', 'Brasília, Brazil', null),
    ('Universidade Federal do Rio Grande do Sul', 'UFRGS', 'university', 'active', 'Porto Alegre, Brazil', null),
    ('Museu Paraense Emílio Goeldi', null, 'museum', 'active', 'Belém, Brazil', null),
    ('Embrapa Amazônia Ocidental', null, 'research_institute', 'active', 'Manaus, Brazil', null),
    ('Instituto Nacional de Pesquisas Espaciais', 'INPE', 'research_institute', 'active', 'Brazil', null),
    ('Instituto de Pesquisa Ambiental da Amazônia', 'IPAM', 'research_institute', 'active', 'Brazil', null),
    ('Instituto Chico Mendes de Conservação da Biodiversidade', 'ICMBio', 'government_agency', 'active', 'Brazil', null),
    ('Instituto Brasileiro do Meio Ambiente e dos Recursos Naturais Renováveis', 'IBAMA', 'government_agency', 'active', 'Brazil', null),
    ('Conselho Nacional de Desenvolvimento Científico e Tecnológico', 'CNPq', 'funding_organization', 'active', 'Brazil', null),
    ('Coordenação de Aperfeiçoamento de Pessoal de Nível Superior', 'CAPES', 'funding_organization', 'active', 'Brazil', null),
    ('Fundação de Amparo à Pesquisa do Estado do Amazonas', 'FAPEAM', 'funding_organization', 'active', 'Manaus, Brazil', null),
    ('Secretaria Especial do Meio Ambiente', 'SEMA', 'government_agency', 'merged', 'Brazil', 1989),
    ('Instituto Brasileiro de Desenvolvimento Florestal', 'IBDF', 'government_agency', 'merged', 'Brazil', 1989),
    ('Superintendência da Borracha', 'SUDHEVEA', 'government_agency', 'merged', 'Brazil', 1989),
    ('Superintendência do Desenvolvimento da Pesca', 'SUDEPE', 'government_agency', 'merged', 'Brazil', 1989),
    ('McGill University', null, 'university', 'active', 'Montréal, Canada', null),
    ('University of Florida', null, 'university', 'active', 'Gainesville, United States', null),
    ('James Cook University', 'JCU', 'university', 'active', 'Queensland, Australia', null),
    ('Harvard University', null, 'university', 'active', 'Cambridge, Massachusetts, United States', null),
    ('Yale University', null, 'university', 'active', 'New Haven, United States', null),
    ('Duke University', null, 'university', 'active', 'Durham, North Carolina, United States', null),
    ('University of California, Davis', 'UC Davis', 'university', 'active', 'Davis, California, United States', null),
    ('University of Oxford', null, 'university', 'active', 'Oxford, United Kingdom', null),
    ('University of Cambridge', null, 'university', 'active', 'Cambridge, United Kingdom', null),
    ('Imperial College London', null, 'university', 'active', 'London, United Kingdom', null),
    ('University of East Anglia', 'UEA', 'university', 'active', 'Norwich, United Kingdom', null),
    ('Université de Montréal', null, 'university', 'active', 'Montréal, Canada', null),
    ('Université du Québec à Montréal', 'UQAM', 'university', 'active', 'Montréal, Canada', null),
    ('Columbia University', null, 'university', 'active', 'New York, United States', null)
)
insert into public.organizations
  (name, short_name, organization_type, status, location, closure_date, closure_precision, source_type, verification_status)
select i.name, i.short_name, i.organization_type, i.status, i.location,
       case when i.closure_year is not null then make_date(i.closure_year, 1, 1) end,
       case when i.closure_year is not null then 'year' end,
       'admin_entered', 'provisional'
  from incoming i
 where not exists (
   select 1 from public.organizations o
    where not o.is_demo and lower(btrim(o.name)) = lower(i.name)
 );

-- Acronyms as names too, so searching "INPA" or "IBAMA" finds them.
insert into public.organization_names (organization_id, name, name_type, source_type, verification_status)
select o.id, o.short_name, 'acronym', 'admin_entered', 'provisional'
  from public.organizations o
 where o.source_type = 'admin_entered'
   and o.short_name is not null
   and not o.is_demo
   and not exists (select 1 from public.organization_names n where n.organization_id = o.id and lower(n.name) = lower(o.short_name));

-- 1989: SEMA, IBDF, SUDHEVEA and SUDEPE merged into the new IBAMA.
insert into public.organization_relationships
  (kind, is_directional, source_organization_id, target_organization_id, note, start_date, start_precision,
   source_type, verification_status)
select 'merger', true, old.id, ibama.id, 'Merged into IBAMA when it was created in 1989.', '1989-01-01', 'year',
       'admin_entered', 'provisional'
  from public.organizations old
  join public.organizations ibama
    on ibama.short_name = 'IBAMA' and ibama.source_type = 'admin_entered' and not ibama.is_demo
 where old.short_name in ('SEMA', 'IBDF', 'SUDHEVEA', 'SUDEPE')
   and old.source_type = 'admin_entered'
   and not old.is_demo
   and not exists (
     select 1 from public.organization_relationships r
      where r.kind = 'merger' and r.source_organization_id = old.id and r.target_organization_id = ibama.id);

insert into public.audit_logs (actor_user_id, action, subject_type, subject_id, subject_label, metadata)
select null, 'create', 'organization', o.id, o.name,
       jsonb_build_object('migration', '20261023120000_add_reference_institutions', 'requestedBy', 'founder',
                          'note', 'reference institutions entered in bulk')
  from public.organizations o
 where o.source_type = 'admin_entered' and not o.is_demo;
