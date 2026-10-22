-- Undo an accepted external match (found in the first real coverage test:
-- two homonyms were accepted by mistake and there was no way back).
--
-- steward_undo_external_match(match, reason): only for an ACCEPTED match, by
-- a steward of that row's institution. It removes exactly what accepting it
-- wrote -- the destination carrying this match's external id, and the
-- OpenAlex / ORCID identifiers it added to the person -- marks the match
-- rejected, and puts back as "proposed" the other proposals for the same row
-- that accepting had set aside, so the right one can be chosen. A reason is
-- required and the undo is audited.

create function public.steward_undo_external_match(p_match_id uuid, p_reason text)
returns integer
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_m public.import_row_external_matches%rowtype;
  v_person uuid;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_restored integer;
begin
  if auth.uid() is null then
    raise exception 'steward_undo_external_match: authentication required' using errcode = '42501';
  end if;
  select * into v_m from public.import_row_external_matches where id = p_match_id for update;
  if not found then
    raise exception 'steward_undo_external_match: proposal not found';
  end if;
  if not public.can_steward_import_row(auth.uid(), v_m.row_id) then
    raise exception 'steward_undo_external_match: reviewer authorization required' using errcode = '42501';
  end if;
  if v_m.status <> 'accepted' then
    raise exception 'steward_undo_external_match: only an accepted match can be undone';
  end if;
  if v_reason is null then
    raise exception 'steward_undo_external_match: say why it was wrong';
  end if;

  select resolved_person_id into v_person from public.import_rows where id = v_m.row_id;

  if v_person is not null then
    delete from public.person_destinations d
     where d.person_id = v_person and d.source = v_m.source
       and d.evidence ->> 'externalId' = v_m.external_id;
    delete from public.person_external_ids e
     where e.person_id = v_person and e.source = 'openalex' and e.external_id = v_m.external_id;
    if v_m.orcid is not null then
      delete from public.person_external_ids e
       where e.person_id = v_person and e.source = 'orcid' and e.external_id = v_m.orcid;
    end if;
  end if;

  -- Bring back the alternatives that accepting this one had set aside.
  update public.import_row_external_matches s
     set status = 'proposed', decided_at = null, decided_by_user_id = null
   where s.row_id = v_m.row_id and s.source = v_m.source and s.id <> v_m.id
     and s.status = 'rejected' and s.decided_at = v_m.decided_at;
  get diagnostics v_restored = row_count;

  update public.import_row_external_matches
     set status = 'rejected', decided_at = now(), decided_by_user_id = auth.uid()
   where id = p_match_id;

  insert into public.audit_logs (actor_user_id, action, subject_type, subject_id, subject_label, metadata)
  values (auth.uid(), 'reject', 'external_match', p_match_id, v_m.display_name,
          jsonb_build_object('undo', true, 'reason', v_reason, 'personId', v_person,
                             'externalId', v_m.external_id, 'restoredProposals', v_restored));
  return v_restored;
end;
$$;

revoke all on function public.steward_undo_external_match(uuid, text) from public;
revoke all on function public.steward_undo_external_match(uuid, text) from anon;
grant execute on function public.steward_undo_external_match(uuid, text) to authenticated;
