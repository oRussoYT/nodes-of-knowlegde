-- With hundreds of real works in the record, the Contributions directory
-- needs a search (title, kind or description; accents and case ignored).
create function public.search_contributions(p_query text)
returns table (
  id uuid,
  title text,
  contribution_kind text,
  contribution_kind_label text,
  verification_status text
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'search_contributions: authentication required' using errcode = '42501';
  end if;
  return query
    select c.id, c.title, c.contribution_kind, ck.label, c.verification_status
      from public.contributions c
      left join public.contribution_kinds ck on ck.key = c.contribution_kind
     where char_length(btrim(coalesce(p_query, ''))) >= 2
       and public.fold_text(c.title || ' ' || coalesce(c.description, '') || ' ' || coalesce(ck.label, ''))
           like '%' || public.fold_text(btrim(left(p_query, 100))) || '%'
     order by c.title
     limit 200;
end;
$$;

revoke all on function public.search_contributions(text) from public, anon;
grant execute on function public.search_contributions(text) to authenticated;
