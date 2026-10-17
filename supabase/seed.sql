-- Studesk · local development seed
-- Runs on `supabase db reset` against your LOCAL database only. It is never pushed to
-- staging or production. Real people and projects go in through the app or the import script.
--
-- Sign in locally as any of these emails; the code arrives in Mailpit at http://127.0.0.1:54324

insert into public.orgs (id, name) values
  ('00000000-0000-4000-a000-000000000001', 'AM Studio');

insert into public.settings (org_id) values ('00000000-0000-4000-a000-000000000001');

insert into public.holidays (org_id, day, label) values
  ('00000000-0000-4000-a000-000000000001', '2026-11-01', 'Kannada Rajyotsava'),
  ('00000000-0000-4000-a000-000000000001', '2026-12-25', 'Christmas'),
  ('00000000-0000-4000-a000-000000000001', '2027-01-26', 'Republic Day');

insert into public.people (id, org_id, email, name, role, capacity, sort_order) values
  ('00000000-0000-4000-b000-000000000001', '00000000-0000-4000-a000-000000000001', 'asif@amstudio.test',    'Ar. Asif',    'principal', 0.25, 1),
  ('00000000-0000-4000-b000-000000000002', '00000000-0000-4000-a000-000000000001', 'athiq@amstudio.test',   'Ar. Athiq',   'director',  0.50, 2),
  ('00000000-0000-4000-b000-000000000003', '00000000-0000-4000-a000-000000000001', 'lilia@amstudio.test',   'Ar. Lilia',   'lead',      1,    3),
  ('00000000-0000-4000-b000-000000000004', '00000000-0000-4000-a000-000000000001', 'disha@amstudio.test',   'Ar. Disha',   'lead',      1,    4),
  ('00000000-0000-4000-b000-000000000005', '00000000-0000-4000-a000-000000000001', 'bushra@amstudio.test',  'Ar. Bushra',  'junior',    1,    5),
  ('00000000-0000-4000-b000-000000000006', '00000000-0000-4000-a000-000000000001', 'nashwa@amstudio.test',  'Ar. Nashwa',  'junior',    1,    6),
  ('00000000-0000-4000-b000-000000000007', '00000000-0000-4000-a000-000000000001', 'prapthi@amstudio.test', 'Ar. Prapthi', 'junior',    1,    7);

-- Sample projects — illustrative, for building screens against realistic content
insert into public.projects (id, org_id, code, name, client, project_type, tier, priority, lead_id, target_date) values
  ('00000000-0000-4000-c000-000000000001', '00000000-0000-4000-a000-000000000001', 'AMS-26-014', 'Kadri Residence',        'Mr. Rashid Kadri', 'Residence',              'development',      2, '00000000-0000-4000-b000-000000000003', '2026-12-24'),
  ('00000000-0000-4000-c000-000000000002', '00000000-0000-4000-a000-000000000001', 'AMS-26-008', 'Mangala Residence',      'Mangala family',   'Residence',              'development',      1, '00000000-0000-4000-b000-000000000004', '2026-12-02'),
  ('00000000-0000-4000-c000-000000000003', '00000000-0000-4000-a000-000000000001', 'AMS-26-002', 'Madikeri Campus Block',  'Al Balagh Trust',  'Institutional / campus', 'development',      3, '00000000-0000-4000-b000-000000000002', '2027-02-12'),
  ('00000000-0000-4000-c000-000000000004', '00000000-0000-4000-a000-000000000001', 'AMS-25-019', 'Munnar Resort · Phase 1','Hi-Tech Group',    'Hospitality / resort',   'development',      4, '00000000-0000-4000-b000-000000000004', '2027-01-09'),
  ('00000000-0000-4000-c000-000000000005', '00000000-0000-4000-a000-000000000001', 'AMS-26-021', 'Kavoor Clinic',          'Dr. Shenoy',       'Commercial / office',    'ready_to_release', 5, '00000000-0000-4000-b000-000000000003', null),
  ('00000000-0000-4000-c000-000000000006', '00000000-0000-4000-a000-000000000001', 'AMS-25-031', 'Bejai Apartments',       'Bejai Builders',   'Apartment / housing',    'response_awaited', null, '00000000-0000-4000-b000-000000000003', null);

insert into public.packages (id, project_id, code) values
  ('00000000-0000-4000-d000-000000000001', '00000000-0000-4000-c000-000000000001', 'P04'),
  ('00000000-0000-4000-d000-000000000002', '00000000-0000-4000-c000-000000000001', 'ADD'),
  ('00000000-0000-4000-d000-000000000003', '00000000-0000-4000-c000-000000000002', 'P04');

insert into public.tasks (package_id, title, assignee_id, hours, due_date, status, sort_order) values
  ('00000000-0000-4000-d000-000000000001', 'Ground floor working plan',   '00000000-0000-4000-b000-000000000005', 12, '2026-11-06', 'issued',      1),
  ('00000000-0000-4000-d000-000000000001', 'First floor working plan',    '00000000-0000-4000-b000-000000000005', 10, '2026-11-10', 'checked',     2),
  ('00000000-0000-4000-d000-000000000001', 'Section AA and BB',           '00000000-0000-4000-b000-000000000006',  8, '2026-11-19', 'for_check',   3),
  ('00000000-0000-4000-d000-000000000001', 'Toilet details T1–T3',        '00000000-0000-4000-b000-000000000005',  9, '2026-11-21', 'in_progress', 4),
  ('00000000-0000-4000-d000-000000000001', 'Staircase details',           '00000000-0000-4000-b000-000000000003',  6, '2026-11-24', 'todo',        5),
  ('00000000-0000-4000-d000-000000000001', 'Door and window schedule',    '00000000-0000-4000-b000-000000000006',  7, '2026-11-26', 'todo',        6),
  ('00000000-0000-4000-d000-000000000001', 'Terrace and parapet details', '00000000-0000-4000-b000-000000000007',  8, '2026-11-28', 'todo',        7),
  ('00000000-0000-4000-d000-000000000002', 'Revised facade option for client', '00000000-0000-4000-b000-000000000003', 6, '2026-11-20', 'todo', 1),
  ('00000000-0000-4000-d000-000000000002', 'Site measurement visit',      '00000000-0000-4000-b000-000000000004',  3, '2026-11-18', 'in_progress', 2),
  ('00000000-0000-4000-d000-000000000003', 'Ground floor working plan',   '00000000-0000-4000-b000-000000000006', 11, '2026-11-25', 'in_progress', 1),
  ('00000000-0000-4000-d000-000000000003', 'Elevations',                  '00000000-0000-4000-b000-000000000004',  8, '2026-11-28', 'todo',        2);
