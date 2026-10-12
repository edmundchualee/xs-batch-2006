\set ON_ERROR_STOP 1
-- committee member via seeded code
insert into auth.users (id, email, raw_user_meta_data)
select '00000000-0000-0000-0000-00000000000a', 'ed@test.com', jsonb_build_object('full_name','Edmund','code',lower(code)) from public.committee_codes;
do $$ begin
  begin insert into auth.users (email, raw_user_meta_data) values ('x@test.com','{"code":"NOPE"}'); raise exception 'FAIL no code';
  exception when others then if sqlerrm <> 'INVALID_CODE' then raise; end if; end;
end $$;

set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000a', false);
insert into public.events (slug, title, published, capacity, fields)
values ('golf-day-2026','Batch Golf Day',true,2,'[{"key":"shirt","label":"Shirt size","type":"select","options":["M","L"],"required":true}]'),
       ('draft-reunion','Reunion',false,null,'[]');

reset role; set role anon;
select set_config('request.jwt.claim.sub','', false);
do $$
declare eid uuid; n int; s text;
begin
  select count(*) into n from public.events; assert n = 1, 'anon sees only published';
  select id into eid from public.events where slug='golf-day-2026';
  begin perform count(*) from public.registrations; raise exception 'FAIL anon reads regs';
  exception when insufficient_privilege then null; end;
  begin perform public.register(eid,'Ana','ana@test.com','', '{}'); raise exception 'FAIL required';
  exception when others then if sqlerrm <> 'FIELD_REQUIRED:Shirt size' then raise; end if; end;
  s := public.register(eid,'Ana Cruz','ana@test.com','0917','{"shirt":"M"}'); assert s='registered';
  begin perform public.register(eid,'Ana Cruz','ANA@test.com','', '{"shirt":"L"}'); raise exception 'FAIL dup';
  exception when others then if sqlerrm <> 'ALREADY_REGISTERED' then raise; end if; end;
  s := public.register(eid,'Ben Lim','ben@test.com','','{"shirt":"L"}'); assert s='registered';
  s := public.register(eid,'Carl Tan','carl@test.com','','{"shirt":"L"}'); assert s='waitlist', 'capacity → waitlist';
  begin perform public.register(eid,'Dan','bad-email','','{"shirt":"L"}'); raise exception 'FAIL email';
  exception when others then if sqlerrm <> 'EMAIL_INVALID' then raise; end if; end;
  select registered into n from public.event_counts() where event_id = eid; assert n = 2, 'counts';
  begin insert into public.events(slug,title) values ('hack','x'); raise exception 'FAIL anon insert';
  exception when insufficient_privilege then null; end;
end $$;

reset role; set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000a', false);
do $$ declare n int; begin
  select count(*) into n from public.registrations; assert n = 3, 'committee sees regs';
  update public.registrations set paid = true where email='ana@test.com';
  update public.events set registration_open = false where slug='golf-day-2026';
end $$;
reset role; set role anon;
do $$ begin
  begin perform public.register((select id from public.events where slug='golf-day-2026'),'Eve Go','eve@test.com','','{"shirt":"M"}'); raise exception 'FAIL closed';
  exception when others then if sqlerrm <> 'REGISTRATION_CLOSED' then raise; end if; end;
end $$;
reset role;
select 'ALL DATABASE CHECKS PASSED';
