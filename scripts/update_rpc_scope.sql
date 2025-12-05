-- Drop old function signatures to avoid conflicts
drop function if exists match_contacts(vector, float, int, uuid);

create or replace function match_contacts (
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  filter_user_ids uuid[]
)
returns table (
  id uuid,
  full_name text,
  company text,
  "position" text,
  email text,
  linkedin_url text,
  user_id uuid,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    contacts.id,
    contacts.full_name::text,
    contacts.company::text,
    contacts."position"::text,
    contacts.email::text,
    contacts.linkedin_url::text,
    contacts.user_id,
    1 - (contacts.embedding <=> query_embedding) as similarity
  from contacts
  where 1 - (contacts.embedding <=> query_embedding) > match_threshold
  and contacts.user_id = any(filter_user_ids)
  order by contacts.embedding <=> query_embedding
  limit match_count;
end;
$$;
