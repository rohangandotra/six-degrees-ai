-- Enable the pgvector extension to work with embedding vectors
create extension if not exists vector;

-- Add an embedding column to the contacts table
-- We use 1536 dimensions for OpenAI's text-embedding-3-small
alter table contacts 
add column if not exists embedding vector(1536);

-- Create an index for faster queries
-- IVFFlat is good for recall/speed balance, HNSW is better for performance but more expensive
-- We'll start with IVFFlat for simplicity, or just no index for small datasets (<10k)
-- But let's add HNSW for future proofing
create index if not exists contacts_embedding_idx 
on contacts 
using hnsw (embedding vector_cosine_ops);

-- Create a function to search for contacts by similarity
drop function if exists match_contacts(vector, float, int, uuid);
drop function if exists match_contacts(vector, float, int, uuid[]);

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
