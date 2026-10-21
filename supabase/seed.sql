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

insert into public.packages (id, project_id, code) values
  ('00000000-0000-4000-d000-000000000001', '00000000-0000-4000-c000-000000000001', 'P04'),
  ('00000000-0000-4000-d000-000000000002', '00000000-0000-4000-c000-000000000001', 'ADD'),
  ('00000000-0000-4000-d000-000000000003', '00000000-0000-4000-c000-000000000002', 'P04'),
  -- Five packages in production is the studio-wide limit, and no Project Architect holds more than two.
  -- The other eleven Development projects have a lead and a target date but no drawings broken down yet,
  -- which is exactly the backlog this app exists to make visible.
  ('00000000-0000-4000-d000-000000000004', '00000000-0000-4000-c000-000000000003', 'P02'),
  ('00000000-0000-4000-d000-000000000005', '00000000-0000-4000-c000-000000000004', 'P04');

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
  ('00000000-0000-4000-d000-000000000003', 'Elevations',                  '00000000-0000-4000-b000-000000000004',  8, '2026-11-28', 'todo',        2),
  ('00000000-0000-4000-d000-000000000004', 'Site analysis drawings',      '00000000-0000-4000-b000-000000000006', 10, '2027-01-08', 'todo',        1),
  ('00000000-0000-4000-d000-000000000004', 'Block massing options',       '00000000-0000-4000-b000-000000000007', 12, '2027-01-15', 'todo',        2),
  ('00000000-0000-4000-d000-000000000004', 'Concept plan — Block A',      '00000000-0000-4000-b000-000000000005', 14, '2027-01-22', 'todo',        3),
  ('00000000-0000-4000-d000-000000000004', 'Concept sections',            '00000000-0000-4000-b000-000000000006',  8, '2027-01-29', 'todo',        4),
  ('00000000-0000-4000-d000-000000000005', 'Cottage type A working drawings', '00000000-0000-4000-b000-000000000007', 16, '2027-02-05', 'todo',    1),
  ('00000000-0000-4000-d000-000000000005', 'Cottage type B working drawings', '00000000-0000-4000-b000-000000000005', 16, '2027-02-19', 'todo',    2),
  ('00000000-0000-4000-d000-000000000005', 'Pool and deck details',       '00000000-0000-4000-b000-000000000006', 10, '2027-03-05', 'todo',        3);
