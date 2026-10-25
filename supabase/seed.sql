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

-- The rest of the portfolio, so the board, the timeline and the clash list are built and tested at the
-- scale the studio actually works at: 50 projects, which is where layout and speed problems show up.
-- Development is deliberately full at 15 and Ready to Release at 10 — both tiers sit exactly on their
-- limit, so a test can push one over by adding a single project.
insert into public.projects (id, org_id, code, name, client, project_type, tier, priority, lead_id, target_date) values
  ('00000000-0000-4000-c000-000000000007', '00000000-0000-4000-a000-000000000001', 'AMS-26-022', 'Surathkal Beach House', 'Mr. Girish Rao', 'Residence', 'development', 5, '00000000-0000-4000-b000-000000000003', '2027-01-22'),
  ('00000000-0000-4000-c000-000000000008', '00000000-0000-4000-a000-000000000001', 'AMS-26-025', 'Kodialbail Office Tower', 'Suvarna Developers', 'Commercial / office', 'development', 6, '00000000-0000-4000-b000-000000000004', '2027-03-10'),
  ('00000000-0000-4000-c000-000000000009', '00000000-0000-4000-a000-000000000001', 'AMS-26-027', 'Attavar Clinic Extension', 'Dr. Shalini Pai', 'Healthcare', 'development', 7, '00000000-0000-4000-b000-000000000002', '2027-02-26'),
  ('00000000-0000-4000-c000-000000000010', '00000000-0000-4000-a000-000000000001', 'AMS-26-029', 'Panambur Warehouse', 'Coastal Logistics', 'Industrial', 'development', 8, '00000000-0000-4000-b000-000000000003', '2027-04-02'),
  ('00000000-0000-4000-c000-000000000011', '00000000-0000-4000-a000-000000000001', 'AMS-25-004', 'Ullal Villa', 'Mr. Ibrahim Haji', 'Residence', 'development', 9, '00000000-0000-4000-b000-000000000004', '2027-01-15'),
  ('00000000-0000-4000-c000-000000000012', '00000000-0000-4000-a000-000000000001', 'AMS-25-007', 'Falnir Apartments', 'Falnir Housing LLP', 'Apartment / housing', 'development', 10, '00000000-0000-4000-b000-000000000002', '2027-05-20'),
  ('00000000-0000-4000-c000-000000000013', '00000000-0000-4000-a000-000000000001', 'AMS-26-033', 'Mukka Resort Cottages', 'Sea Pearl Hospitality', 'Hospitality / resort', 'development', 11, '00000000-0000-4000-b000-000000000003', '2027-06-12'),
  ('00000000-0000-4000-c000-000000000014', '00000000-0000-4000-a000-000000000001', 'AMS-25-011', 'Bantwal School Block', 'Vidya Trust', 'Education', 'development', 12, '00000000-0000-4000-b000-000000000004', '2027-03-28'),
  ('00000000-0000-4000-c000-000000000015', '00000000-0000-4000-a000-000000000001', 'AMS-26-035', 'Hampankatta Retail Arcade', 'Hampankatta Traders', 'Retail', 'development', 13, '00000000-0000-4000-b000-000000000002', '2027-04-18'),
  ('00000000-0000-4000-c000-000000000016', '00000000-0000-4000-a000-000000000001', 'AMS-25-014', 'Deralakatte Hostel', 'Yenepoya Trust', 'Institutional / campus', 'development', 14, null, '2027-07-01'),
  ('00000000-0000-4000-c000-000000000017', '00000000-0000-4000-a000-000000000001', 'AMS-26-037', 'Kankanady Mixed Use', 'Nitte Estates', 'Mixed use', 'development', 15, null, '2027-08-14'),
  ('00000000-0000-4000-c000-000000000018', '00000000-0000-4000-a000-000000000001', 'AMS-26-039', 'Balmatta Dental Clinic', 'Dr. Anup Shetty', 'Healthcare', 'ready_to_release', 6, '00000000-0000-4000-b000-000000000003', null),
  ('00000000-0000-4000-c000-000000000019', '00000000-0000-4000-a000-000000000001', 'AMS-25-016', 'Thokkottu Row Houses', 'Thokkottu Builders', 'Apartment / housing', 'ready_to_release', 7, '00000000-0000-4000-b000-000000000004', null),
  ('00000000-0000-4000-c000-000000000020', '00000000-0000-4000-a000-000000000001', 'AMS-26-041', 'Moodbidri Jain Bhavan', 'Moodbidri Samaj', 'Institutional / campus', 'ready_to_release', 8, '00000000-0000-4000-b000-000000000002', null),
  ('00000000-0000-4000-c000-000000000021', '00000000-0000-4000-a000-000000000001', 'AMS-25-018', 'Karkala Guest House', 'Mr. Suresh Hegde', 'Hospitality / resort', 'ready_to_release', 9, '00000000-0000-4000-b000-000000000003', null),
  ('00000000-0000-4000-c000-000000000022', '00000000-0000-4000-a000-000000000001', 'AMS-26-043', 'Pandeshwar Showroom', 'Pandeshwar Motors', 'Retail', 'ready_to_release', 10, '00000000-0000-4000-b000-000000000004', null),
  ('00000000-0000-4000-c000-000000000023', '00000000-0000-4000-a000-000000000001', 'AMS-25-020', 'Mulki Farmhouse', 'Mrs. Rekha Shenoy', 'Residence', 'ready_to_release', 11, null, null),
  ('00000000-0000-4000-c000-000000000024', '00000000-0000-4000-a000-000000000001', 'AMS-26-045', 'Baikampady Factory Shed', 'Shakti Industries', 'Industrial', 'ready_to_release', 12, '00000000-0000-4000-b000-000000000002', null),
  ('00000000-0000-4000-c000-000000000025', '00000000-0000-4000-a000-000000000001', 'AMS-25-022', 'Gurupura Riverside Homes', 'Gurupura Infra', 'Apartment / housing', 'ready_to_release', 13, null, null),
  ('00000000-0000-4000-c000-000000000026', '00000000-0000-4000-a000-000000000001', 'AMS-26-047', 'Manipal Study Centre', 'Manipal Academy', 'Education', 'ready_to_release', 14, '00000000-0000-4000-b000-000000000003', null),
  ('00000000-0000-4000-c000-000000000027', '00000000-0000-4000-a000-000000000001', 'AMS-25-024', 'Puttur Temple Hall', 'Puttur Devaswom', 'Institutional / campus', 'response_awaited', null, '00000000-0000-4000-b000-000000000003', null),
  ('00000000-0000-4000-c000-000000000028', '00000000-0000-4000-a000-000000000001', 'AMS-26-049', 'Udupi Beach Resort', 'Krishna Hospitality', 'Hospitality / resort', 'response_awaited', null, '00000000-0000-4000-b000-000000000004', null),
  ('00000000-0000-4000-c000-000000000029', '00000000-0000-4000-a000-000000000001', 'AMS-25-026', 'Belthangady Clinic', 'Dr. Ravi Gowda', 'Healthcare', 'response_awaited', null, null, null),
  ('00000000-0000-4000-c000-000000000030', '00000000-0000-4000-a000-000000000001', 'AMS-26-050', 'Vittla Residence', 'Mr. Naveen Bhat', 'Residence', 'response_awaited', null, '00000000-0000-4000-b000-000000000002', null),
  ('00000000-0000-4000-c000-000000000031', '00000000-0000-4000-a000-000000000001', 'AMS-25-028', 'Kotekar Apartments', 'Kotekar Builders', 'Apartment / housing', 'response_awaited', null, null, null),
  ('00000000-0000-4000-c000-000000000032', '00000000-0000-4000-a000-000000000001', 'AMS-26-052', 'Haleangady Warehouse', 'Coastal Logistics', 'Industrial', 'response_awaited', null, null, null),
  ('00000000-0000-4000-c000-000000000033', '00000000-0000-4000-a000-000000000001', 'AMS-25-030', 'Kadaba School', 'Saraswathi Trust', 'Education', 'response_awaited', null, '00000000-0000-4000-b000-000000000003', null),
  ('00000000-0000-4000-c000-000000000034', '00000000-0000-4000-a000-000000000001', 'AMS-26-054', 'Sullia Office Block', 'Sullia Co-operative', 'Commercial / office', 'response_awaited', null, null, null),
  ('00000000-0000-4000-c000-000000000035', '00000000-0000-4000-a000-000000000001', 'AMS-25-032', 'Kundapura Beach Villa', 'Mr. Prakash Amin', 'Residence', 'response_awaited', null, '00000000-0000-4000-b000-000000000004', null),
  ('00000000-0000-4000-c000-000000000036', '00000000-0000-4000-a000-000000000001', 'AMS-26-056', 'Bejai Retail Strip', 'Bejai Builders', 'Retail', 'response_awaited', null, null, null),
  ('00000000-0000-4000-c000-000000000037', '00000000-0000-4000-a000-000000000001', 'AMS-25-034', 'Mangalore Central Offices', 'MCC Properties', 'Commercial / office', 'response_awaited', null, '00000000-0000-4000-b000-000000000002', null),
  ('00000000-0000-4000-c000-000000000038', '00000000-0000-4000-a000-000000000001', 'AMS-26-058', 'Konaje Campus Annexe', 'Mangalore University', 'Institutional / campus', 'response_awaited', null, null, null),
  ('00000000-0000-4000-c000-000000000039', '00000000-0000-4000-a000-000000000001', 'AMS-25-036', 'Shakthinagar Housing', 'Shakthi Housing', 'Apartment / housing', 'response_awaited', null, null, null),
  ('00000000-0000-4000-c000-000000000040', '00000000-0000-4000-a000-000000000001', 'AMS-26-060', 'Nanthoor Clinic', 'Dr. Meera Nayak', 'Healthcare', 'response_awaited', null, null, null),
  ('00000000-0000-4000-c000-000000000041', '00000000-0000-4000-a000-000000000001', 'AMS-24-002', 'Kavoor Godown', 'Mr. Aboobakar', 'Industrial', 'dormant', null, null, null),
  ('00000000-0000-4000-c000-000000000042', '00000000-0000-4000-a000-000000000001', 'AMS-24-005', 'Kulshekar Residence', 'Mr. Vinod Kumar', 'Residence', 'dormant', null, null, null),
  ('00000000-0000-4000-c000-000000000043', '00000000-0000-4000-a000-000000000001', 'AMS-24-008', 'Bondel Apartments', 'Bondel Developers', 'Apartment / housing', 'dormant', null, null, null),
  ('00000000-0000-4000-c000-000000000044', '00000000-0000-4000-a000-000000000001', 'AMS-24-011', 'Urwa Retail Block', 'Urwa Traders', 'Retail', 'dormant', null, null, null),
  ('00000000-0000-4000-c000-000000000045', '00000000-0000-4000-a000-000000000001', 'AMS-24-014', 'Maroli Villa', 'Mrs. Asha Rai', 'Residence', 'dormant', null, null, null),
  ('00000000-0000-4000-c000-000000000046', '00000000-0000-4000-a000-000000000001', 'AMS-24-017', 'Jeppu School Block', 'Jeppu Education Trust', 'Education', 'dormant', null, null, null),
  ('00000000-0000-4000-c000-000000000047', '00000000-0000-4000-a000-000000000001', 'AMS-24-020', 'Padil Workshop', 'Padil Motors', 'Industrial', 'dormant', null, null, null),
  ('00000000-0000-4000-c000-000000000048', '00000000-0000-4000-a000-000000000001', 'AMS-24-023', 'Adyar Farmhouse', 'Mr. Santhosh Shetty', 'Residence', 'dormant', null, null, null),
  ('00000000-0000-4000-c000-000000000049', '00000000-0000-4000-a000-000000000001', 'AMS-24-026', 'Yeyyadi Office Unit', 'Yeyyadi Enterprises', 'Commercial / office', 'dormant', null, null, null),
  ('00000000-0000-4000-c000-000000000050', '00000000-0000-4000-a000-000000000001', 'AMS-24-029', 'Thumbe Resort', 'Thumbe Hospitality', 'Hospitality / resort', 'dormant', null, null, null);

-- ---------------------------------------------------------------------------
-- Packages and drawings
--
-- Dates are written as offsets from `current_date` rather than fixed days, so the studio looks the same
-- whenever someone resets: work straddles today, a few drawings are overdue, and the twelve-week timeline
-- has something in every column. A seed dated to one week in 2026 goes stale the week after.
--
-- A package is "in production" only while one of its drawings still has hours left on it — the engine's own
-- rule (packages/engine/src/schedule.ts). So a P04 whose drawings have all been issued is finished work and
-- occupies no slot, which is how fourteen projects carry a full history while exactly six are in production.
-- ---------------------------------------------------------------------------

-- The six packages with open work. Five is the studio limit and two is the limit per Project Architect, so
-- this seed is deliberately one over on both: Lilia holds Kadri P04, Kadri ADD and Surathkal P04. That is
-- the state the clash list exists to report, and until now nothing in the seed could produce it.
insert into public.packages (id, project_id, code) values
  ('00000000-0000-4000-d000-000000000001', '00000000-0000-4000-c000-000000000001', 'P04'),  -- Kadri · Lilia
  ('00000000-0000-4000-d000-000000000002', '00000000-0000-4000-c000-000000000001', 'ADD'),  -- Kadri · Lilia
  ('00000000-0000-4000-d000-000000000003', '00000000-0000-4000-c000-000000000002', 'P04'),  -- Mangala · Disha
  ('00000000-0000-4000-d000-000000000004', '00000000-0000-4000-c000-000000000003', 'P02'),  -- Madikeri · Athiq
  ('00000000-0000-4000-d000-000000000005', '00000000-0000-4000-c000-000000000004', 'P04'),  -- Munnar · Disha
  ('00000000-0000-4000-d000-000000000006', '00000000-0000-4000-c000-000000000007', 'P04');  -- Surathkal · Lilia

-- Kadri Residence · P04 Design and Tender. Priority 2, and the package the access tests read.
-- 'Section AA and BB' and 'Toilet details T1–T3' are named in supabase/tests/access_test.sql; keep them.
insert into public.tasks (package_id, title, assignee_id, hours, due_date, status, sort_order) values
  ('00000000-0000-4000-d000-000000000001', 'Ground floor working plan',    '00000000-0000-4000-b000-000000000005', 12, current_date - 26, 'issued',      1),
  ('00000000-0000-4000-d000-000000000001', 'First floor working plan',     '00000000-0000-4000-b000-000000000005', 10, current_date + 32, 'checked',     2),
  ('00000000-0000-4000-d000-000000000001', 'Section AA and BB',            '00000000-0000-4000-b000-000000000006',  8, current_date -  4, 'for_check',   3),
  ('00000000-0000-4000-d000-000000000001', 'Toilet details T1–T3',         '00000000-0000-4000-b000-000000000005',  9, current_date + 44, 'in_progress', 4),
  ('00000000-0000-4000-d000-000000000001', 'Staircase details',            '00000000-0000-4000-b000-000000000003',  6, current_date + 50,      'todo',        5),
  ('00000000-0000-4000-d000-000000000001', 'Door and window schedule',     '00000000-0000-4000-b000-000000000006', 14, current_date + 56, 'todo',        6),
  ('00000000-0000-4000-d000-000000000001', 'Terrace and parapet details',  '00000000-0000-4000-b000-000000000007', 12, current_date + 62, 'todo',        7),
  ('00000000-0000-4000-d000-000000000001', 'Kitchen and utility details',  '00000000-0000-4000-b000-000000000005', 16, current_date + 68, 'todo',        8),
  ('00000000-0000-4000-d000-000000000001', 'Wardrobe and joinery details', '00000000-0000-4000-b000-000000000007', 14, current_date + 74, 'todo',        9),
  ('00000000-0000-4000-d000-000000000001', 'External development plan',    '00000000-0000-4000-b000-000000000006', 12, current_date + 80, 'todo',       10),
  ('00000000-0000-4000-d000-000000000001', 'Compound wall and gate',       '00000000-0000-4000-b000-000000000007', 10, current_date + 86, 'todo',       11),
  ('00000000-0000-4000-d000-000000000001', 'Electrical layout',            '00000000-0000-4000-b000-000000000005', 14, current_date + 92, 'todo',       12),
  ('00000000-0000-4000-d000-000000000001', 'Plumbing and drainage layout', '00000000-0000-4000-b000-000000000006', 14, current_date + 98, 'todo',       13),
  ('00000000-0000-4000-d000-000000000001', 'Flooring and finish schedule', '00000000-0000-4000-b000-000000000003', 10, current_date + 49, 'todo',       14);

-- Kadri Residence · ADD. One-off work outside the drawing list: this is what used to happen and never
-- appear anywhere. Asif's only open work lives here — at 0.25 capacity he gets 1.5 hours a day.
insert into public.tasks (package_id, title, assignee_id, hours, due_date, status, sort_order) values
  ('00000000-0000-4000-d000-000000000002', 'Revised facade option for client', '00000000-0000-4000-b000-000000000003',  6, current_date + 26, 'todo',        1),
  ('00000000-0000-4000-d000-000000000002', 'Site measurement visit',           '00000000-0000-4000-b000-000000000004',  3, current_date + 32, 'in_progress', 2),
  ('00000000-0000-4000-d000-000000000002', 'Client decision deck',             '00000000-0000-4000-b000-000000000001',  3, current_date + 38, 'todo',        3),
  ('00000000-0000-4000-d000-000000000002', 'Authority query response',         '00000000-0000-4000-b000-000000000003',  4, current_date + 44, 'todo',        4),
  ('00000000-0000-4000-d000-000000000002', 'Revised parking layout',           '00000000-0000-4000-b000-000000000004',  5, current_date + 16, 'todo',        5);

-- Mangala Residence · P04. Priority 1, so the engine schedules this before everything else.
insert into public.tasks (package_id, title, assignee_id, hours, due_date, status, sort_order) values
  ('00000000-0000-4000-d000-000000000003', 'Ground floor plan',              '00000000-0000-4000-b000-000000000006', 11, current_date -  1, 'in_progress', 1),
  ('00000000-0000-4000-d000-000000000003', 'Elevations',                     '00000000-0000-4000-b000-000000000004',  8, current_date + 32, 'todo',        2),
  ('00000000-0000-4000-d000-000000000003', 'Longitudinal section',           '00000000-0000-4000-b000-000000000006',  9, current_date + 38, 'todo',        3),
  ('00000000-0000-4000-d000-000000000003', 'Foundation layout',              '00000000-0000-4000-b000-000000000007', 12, current_date + 44, 'todo',        4),
  ('00000000-0000-4000-d000-000000000003', 'Roof framing plan',              '00000000-0000-4000-b000-000000000005', 11, current_date + 50, 'todo',        5),
  ('00000000-0000-4000-d000-000000000003', 'Bathroom details B1–B4',         '00000000-0000-4000-b000-000000000006', 12, current_date + 56, 'todo',        6),
  ('00000000-0000-4000-d000-000000000003', 'Staircase and railing details',  '00000000-0000-4000-b000-000000000007', 10, current_date + 62, 'todo',        7),
  ('00000000-0000-4000-d000-000000000003', 'Door schedule',                  '00000000-0000-4000-b000-000000000005',  8, current_date + 68, 'todo',        8),
  ('00000000-0000-4000-d000-000000000003', 'Window schedule',                '00000000-0000-4000-b000-000000000006',  8, current_date + 74, 'todo',        9),
  ('00000000-0000-4000-d000-000000000003', 'Site services layout',           '00000000-0000-4000-b000-000000000004', 10, current_date + 80, 'todo',       10),
  ('00000000-0000-4000-d000-000000000003', 'Boundary and levels plan',       '00000000-0000-4000-b000-000000000007',  9, current_date + 86, 'todo',       11),
  ('00000000-0000-4000-d000-000000000003', 'Finish schedule — Mangala',      '00000000-0000-4000-b000-000000000005',  8, current_date + 50, 'todo',       12);

-- Madikeri Campus Block · P02 Design (Concepts). Athiq leads it and reviews it himself, which is why his
-- own My work is not empty: the director carries studio work too, at half capacity.
insert into public.tasks (package_id, title, assignee_id, hours, due_date, status, sort_order) values
  ('00000000-0000-4000-d000-000000000004', 'Site analysis drawings',       '00000000-0000-4000-b000-000000000006', 14, current_date + 26, 'todo',  1),
  ('00000000-0000-4000-d000-000000000004', 'Block massing options',        '00000000-0000-4000-b000-000000000007', 16, current_date + 32, 'todo',  2),
  ('00000000-0000-4000-d000-000000000004', 'Concept plan — Block A',       '00000000-0000-4000-b000-000000000005', 18, current_date + 38, 'todo',  3),
  ('00000000-0000-4000-d000-000000000004', 'Concept sections',             '00000000-0000-4000-b000-000000000006', 12, current_date + 44, 'todo',  4),
  ('00000000-0000-4000-d000-000000000004', 'Concept review notes',         '00000000-0000-4000-b000-000000000002',  4, current_date + 50, 'todo',  5),
  ('00000000-0000-4000-d000-000000000004', 'Campus circulation diagram',   '00000000-0000-4000-b000-000000000002',  6, current_date + 56, 'todo',  6),
  ('00000000-0000-4000-d000-000000000004', 'Landscape concept',            '00000000-0000-4000-b000-000000000007', 12, current_date + 62, 'todo',  7),
  ('00000000-0000-4000-d000-000000000004', 'Concept plan — Block B',       '00000000-0000-4000-b000-000000000005', 16, current_date + 68, 'todo',  8),
  ('00000000-0000-4000-d000-000000000004', 'Material and finish board',    '00000000-0000-4000-b000-000000000006',  8, current_date + 74, 'todo',  9),
  ('00000000-0000-4000-d000-000000000004', 'Concept presentation set',     '00000000-0000-4000-b000-000000000002', 10, current_date + 60, 'todo', 10);

-- Munnar Resort · Phase 1 · P04. The last two drawings are the ones the engine cannot place: one has
-- nobody on it, one has no hours. Both appear on the clash list as BLOCKED and on nobody's calendar.
insert into public.tasks (package_id, title, assignee_id, hours, due_date, status, sort_order) values
  ('00000000-0000-4000-d000-000000000005', 'Cottage type A working drawings', '00000000-0000-4000-b000-000000000007', 18, current_date + 26, 'todo', 1),
  ('00000000-0000-4000-d000-000000000005', 'Cottage type B working drawings', '00000000-0000-4000-b000-000000000005', 18, current_date + 32, 'todo', 2),
  ('00000000-0000-4000-d000-000000000005', 'Pool and deck details',           '00000000-0000-4000-b000-000000000006', 12, current_date + 38, 'todo', 3),
  ('00000000-0000-4000-d000-000000000005', 'Reception block plan',            '00000000-0000-4000-b000-000000000004', 14, current_date + 44, 'todo', 4),
  ('00000000-0000-4000-d000-000000000005', 'Spa block plan',                  '00000000-0000-4000-b000-000000000007', 14, current_date + 50, 'todo', 5),
  ('00000000-0000-4000-d000-000000000005', 'Restaurant layout',               '00000000-0000-4000-b000-000000000005', 13, current_date + 56, 'todo', 6),
  ('00000000-0000-4000-d000-000000000005', 'Landscape and pathways',          '00000000-0000-4000-b000-000000000006', 11, current_date + 62, 'todo', 7),
  ('00000000-0000-4000-d000-000000000005', 'Service block drawings',          '00000000-0000-4000-b000-000000000007', 12, current_date + 68, 'todo', 8),
  ('00000000-0000-4000-d000-000000000005', 'Signage and wayfinding',          '00000000-0000-4000-b000-000000000004',  8, current_date + 74, 'todo', 9),
  ('00000000-0000-4000-d000-000000000005', 'Guest room details',              '00000000-0000-4000-b000-000000000005', 12, current_date + 80, 'todo', 10),
  ('00000000-0000-4000-d000-000000000005', 'External lighting plan',          null,                                   8, current_date + 86, 'todo', 11),
  ('00000000-0000-4000-d000-000000000005', 'Pergola and shade structures',    '00000000-0000-4000-b000-000000000006',  0, current_date + 50, 'todo', 12);

-- Surathkal Beach House · P04. Lilia's third package in production, against a limit of two.
insert into public.tasks (package_id, title, assignee_id, hours, due_date, status, sort_order) values
  ('00000000-0000-4000-d000-000000000006', 'Working plan — ground floor',    '00000000-0000-4000-b000-000000000005', 14, current_date + 26, 'todo',        1),
  ('00000000-0000-4000-d000-000000000006', 'Working plan — first floor',     '00000000-0000-4000-b000-000000000006', 13, current_date + 32, 'todo',        2),
  ('00000000-0000-4000-d000-000000000006', 'Beach elevation',                '00000000-0000-4000-b000-000000000003', 10, current_date -  3, 'in_progress', 3),
  ('00000000-0000-4000-d000-000000000006', 'Terrace and pergola details',    '00000000-0000-4000-b000-000000000007', 11, current_date + 44, 'todo',        4),
  ('00000000-0000-4000-d000-000000000006', 'Design review — coastal setback','00000000-0000-4000-b000-000000000001',  2, current_date + 50, 'todo',        5),
  ('00000000-0000-4000-d000-000000000006', 'Toilet details T4–T6',           '00000000-0000-4000-b000-000000000005', 10, current_date + 56, 'todo',        6),
  ('00000000-0000-4000-d000-000000000006', 'Staircase detail — sea side',    '00000000-0000-4000-b000-000000000006',  9, current_date + 62, 'todo',        7),
  ('00000000-0000-4000-d000-000000000006', 'Deck and railing details',       '00000000-0000-4000-b000-000000000007', 10, current_date + 68, 'todo',        8),
  ('00000000-0000-4000-d000-000000000006', 'Boundary wall — coastal',        '00000000-0000-4000-b000-000000000003',  8, current_date + 74, 'todo',        9),
  ('00000000-0000-4000-d000-000000000006', 'Finishes schedule — beach house','00000000-0000-4000-b000-000000000005',  9, current_date + 51, 'todo',       10);

-- Kavoor Clinic · P01, on a Ready to Release project. It is not scheduled — only Development projects are —
-- so it takes no production slot and gets no forecast. It is here so that branch of the project screen,
-- which nothing used to reach, has something to render.
insert into public.packages (id, project_id, code) values
  ('00000000-0000-4000-d000-000000000007', '00000000-0000-4000-c000-000000000005', 'P01');
insert into public.tasks (package_id, title, assignee_id, hours, due_date, status, sort_order) values
  ('00000000-0000-4000-d000-000000000007', 'Measured site survey — Kavoor', '00000000-0000-4000-b000-000000000003', 8, null, 'issued',      1),
  ('00000000-0000-4000-d000-000000000007', 'Existing services record',      '00000000-0000-4000-b000-000000000006', 6, null, 'checked',     2),
  ('00000000-0000-4000-d000-000000000007', 'Soil report co-ordination',     '00000000-0000-4000-b000-000000000003', 4, null, 'in_progress', 3),
  ('00000000-0000-4000-d000-000000000007', 'Statutory setback study',       '00000000-0000-4000-b000-000000000007', 5, null, 'todo',        4);

-- ---------------------------------------------------------------------------
-- Finished history
--
-- Every Development project carries the packages it has already delivered, all drawings issued. They hold
-- no remaining hours, so they occupy no production slot and the engine never schedules them — but they are
-- what makes a project screen look like a project rather than an empty shell, and they exercise all nine
-- package codes instead of the three the seed used to touch.
--
-- Titles repeat across projects on purpose: every job really does have a site survey. supabase/tests/
-- access_test.sql keys its task lookups on package_id for exactly this reason.
-- ---------------------------------------------------------------------------
with plan(project_id, code, titles) as (values
  ('00000000-0000-4000-c000-000000000001'::uuid, 'P01'::public.package_code, array['Site survey plan','Contour and levels study','Neighbourhood context study','Statutory envelope study']),
  ('00000000-0000-4000-c000-000000000001'::uuid, 'P02'::public.package_code, array['Concept option A','Concept option B','Concept massing study','Concept presentation']),
  ('00000000-0000-4000-c000-000000000001'::uuid, 'P03'::public.package_code, array['Proposal drawing set','Walkthrough stills','Area statement','Client presentation deck']),
  ('00000000-0000-4000-c000-000000000001'::uuid, 'P05'::public.package_code, array['Structural co-ordination set','MEP co-ordination set','Vendor shop drawing review']),
  ('00000000-0000-4000-c000-000000000002'::uuid, 'P01'::public.package_code, array['Site survey plan','Contour and levels study','Neighbourhood context study']),
  ('00000000-0000-4000-c000-000000000002'::uuid, 'P02'::public.package_code, array['Concept option A','Concept option B','Concept massing study','Concept presentation']),
  ('00000000-0000-4000-c000-000000000002'::uuid, 'P03'::public.package_code, array['Proposal drawing set','Area statement','Client presentation deck']),
  ('00000000-0000-4000-c000-000000000002'::uuid, 'CS'::public.package_code,  array['Foundation GA','Column and beam layout','Slab reinforcement details']),
  ('00000000-0000-4000-c000-000000000003'::uuid, 'P01'::public.package_code, array['Site survey plan','Contour and levels study','Neighbourhood context study','Statutory envelope study']),
  ('00000000-0000-4000-c000-000000000004'::uuid, 'P01'::public.package_code, array['Site survey plan','Contour and levels study','Statutory envelope study']),
  ('00000000-0000-4000-c000-000000000004'::uuid, 'P02'::public.package_code, array['Concept option A','Concept option B','Concept presentation']),
  ('00000000-0000-4000-c000-000000000004'::uuid, 'P03'::public.package_code, array['Proposal drawing set','Walkthrough stills','Area statement']),
  ('00000000-0000-4000-c000-000000000004'::uuid, 'SV'::public.package_code,  array['Water supply schematic','Drainage schematic','Electrical single line']),
  ('00000000-0000-4000-c000-000000000007'::uuid, 'P01'::public.package_code, array['Site survey plan','Contour and levels study','Statutory envelope study']),
  ('00000000-0000-4000-c000-000000000007'::uuid, 'P02'::public.package_code, array['Concept option A','Concept option B','Concept presentation']),
  ('00000000-0000-4000-c000-000000000008'::uuid, 'P01'::public.package_code, array['Site survey plan','Contour and levels study','Neighbourhood context study']),
  ('00000000-0000-4000-c000-000000000008'::uuid, 'P02'::public.package_code, array['Concept option A','Concept option B','Concept presentation']),
  ('00000000-0000-4000-c000-000000000008'::uuid, 'P03'::public.package_code, array['Proposal drawing set','Area statement','Client presentation deck']),
  ('00000000-0000-4000-c000-000000000008'::uuid, 'P04'::public.package_code, array['Issued working plan set','Issued sections set','Issued details set','Issued schedules set']),
  ('00000000-0000-4000-c000-000000000009'::uuid, 'P01'::public.package_code, array['Site survey plan','Contour and levels study','Statutory envelope study']),
  ('00000000-0000-4000-c000-000000000009'::uuid, 'P02'::public.package_code, array['Concept option A','Concept option B','Concept presentation']),
  ('00000000-0000-4000-c000-000000000009'::uuid, 'P03'::public.package_code, array['Proposal drawing set','Area statement']),
  ('00000000-0000-4000-c000-000000000010'::uuid, 'P01'::public.package_code, array['Site survey plan','Contour and levels study','Neighbourhood context study']),
  ('00000000-0000-4000-c000-000000000010'::uuid, 'P02'::public.package_code, array['Concept option A','Concept option B','Concept presentation']),
  ('00000000-0000-4000-c000-000000000011'::uuid, 'P01'::public.package_code, array['Site survey plan','Contour and levels study','Statutory envelope study']),
  ('00000000-0000-4000-c000-000000000011'::uuid, 'P02'::public.package_code, array['Concept option A','Concept option B','Concept presentation']),
  ('00000000-0000-4000-c000-000000000011'::uuid, 'P03'::public.package_code, array['Proposal drawing set','Area statement','Client presentation deck']),
  ('00000000-0000-4000-c000-000000000011'::uuid, 'P04'::public.package_code, array['Issued working plan set','Issued sections set','Issued details set']),
  ('00000000-0000-4000-c000-000000000012'::uuid, 'P01'::public.package_code, array['Site survey plan','Contour and levels study','Neighbourhood context study']),
  ('00000000-0000-4000-c000-000000000012'::uuid, 'P02'::public.package_code, array['Concept option A','Concept option B','Concept presentation']),
  ('00000000-0000-4000-c000-000000000012'::uuid, 'TD'::public.package_code,  array['Typical wall section','Typical parapet detail','Waterproofing details']),
  ('00000000-0000-4000-c000-000000000013'::uuid, 'P01'::public.package_code, array['Site survey plan','Contour and levels study','Statutory envelope study']),
  ('00000000-0000-4000-c000-000000000013'::uuid, 'P02'::public.package_code, array['Concept option A','Concept option B','Concept presentation']),
  ('00000000-0000-4000-c000-000000000014'::uuid, 'P01'::public.package_code, array['Site survey plan','Contour and levels study','Neighbourhood context study']),
  ('00000000-0000-4000-c000-000000000014'::uuid, 'P02'::public.package_code, array['Concept option A','Concept option B','Concept presentation']),
  ('00000000-0000-4000-c000-000000000014'::uuid, 'P03'::public.package_code, array['Proposal drawing set','Area statement']),
  ('00000000-0000-4000-c000-000000000015'::uuid, 'P01'::public.package_code, array['Site survey plan','Contour and levels study','Statutory envelope study']),
  ('00000000-0000-4000-c000-000000000015'::uuid, 'P02'::public.package_code, array['Concept option A','Concept option B']),
  ('00000000-0000-4000-c000-000000000016'::uuid, 'P01'::public.package_code, array['Site survey plan','Contour and levels study','Neighbourhood context study']),
  ('00000000-0000-4000-c000-000000000016'::uuid, 'P02'::public.package_code, array['Concept option A','Concept option B']),
  ('00000000-0000-4000-c000-000000000017'::uuid, 'P01'::public.package_code, array['Site survey plan','Contour and levels study','Statutory envelope study'])
),
made as (
  insert into public.packages (project_id, code)
  select project_id, code from plan
  returning id, project_id, code
)
insert into public.tasks (package_id, title, assignee_id, hours, due_date, status, sort_order)
select
  made.id,
  drawing.title,
  -- Spread across the five production staff so nobody's history is blank.
  (array[
    '00000000-0000-4000-b000-000000000005','00000000-0000-4000-b000-000000000006',
    '00000000-0000-4000-b000-000000000007','00000000-0000-4000-b000-000000000003',
    '00000000-0000-4000-b000-000000000004'
  ])[1 + (row_number() over (order by made.id, drawing.ord))::int % 5]::uuid,
  6 + (drawing.ord * 2),
  current_date - (40 + (row_number() over (order by made.id, drawing.ord))::int),
  'issued',
  drawing.ord
from made
join plan on plan.project_id = made.project_id and plan.code = made.code
cross join lateral unnest(plan.titles) with ordinality as drawing(title, ord);

-- The trigger stamps done_at = now() when a task arrives already issued, and refuses to let an update move
-- it afterwards (supabase/migrations/…0300_rules.sql). Left alone, every one of these drawings would carry
-- the moment of the reset, and Today would announce that a hundred and fifty drawings went out yesterday.
-- Local seed only: drop the trigger for one statement so finished work carries the date it was finished.
alter table public.tasks disable trigger tasks_before;
update public.tasks
   set done_at = (due_date + time '17:30') at time zone 'Asia/Kolkata'
 where status in ('checked', 'issued') and due_date is not null;
-- Two drawings went out yesterday, so the ISSUED YESTERDAY card has a believable number on it rather than
-- nothing at all or the entire history.
update public.tasks
   set done_at = (current_date - 1 + time '18:10') at time zone 'Asia/Kolkata'
 where title in ('Issued schedules set', 'Client presentation deck')
   and package_id in (select id from public.packages where project_id = '00000000-0000-4000-c000-000000000008');
alter table public.tasks enable trigger tasks_before;
