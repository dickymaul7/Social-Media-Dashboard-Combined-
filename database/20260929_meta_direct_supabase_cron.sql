-- Meta Direct scheduler for projects that remain on Vercel Hobby.
--
-- Prerequisites (run once in Supabase Vault before installing the cron job):
--   select vault.create_secret(
--     'https://YOUR-VERCEL-DEPLOYMENT.example.com/api/meta/instagram/publish-due',
--     'meta_publish_worker_url'
--   );
--   select vault.create_secret('YOUR_CRON_SECRET', 'meta_publish_cron_secret');
--
-- The same CRON_SECRET value must be configured as a server-only environment
-- variable on the Vercel Preview and Production environments.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

do $$
declare
  existing_job_id bigint;
begin
  select jobid
    into existing_job_id
    from cron.job
   where jobname = 'meta-publish-due-every-minute'
   limit 1;

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;
end;
$$;

select cron.schedule(
  'meta-publish-due-every-minute',
  '* * * * *',
  $cron$
    select net.http_get(
      url := (
        select decrypted_secret
          from vault.decrypted_secrets
         where name = 'meta_publish_worker_url'
         limit 1
      ),
      headers := jsonb_build_object(
        'Authorization',
        'Bearer ' || (
          select decrypted_secret
            from vault.decrypted_secrets
           where name = 'meta_publish_cron_secret'
           limit 1
        )
      ),
      timeout_milliseconds := 60000
    ) as request_id;
  $cron$
);
