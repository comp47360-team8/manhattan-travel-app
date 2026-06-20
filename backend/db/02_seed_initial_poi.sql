BEGIN;

INSERT INTO poi (
  slug, name, type, summary, description,
  borough, neighborhood, address, latitude, longitude,
  opening_hours, opening_hours_text,
  google_place_id, google_review_star, google_review_count,
  best_time_start, best_time_end, best_time_label, why_this_time,
  accessibility_labels, admission_fee, admission_text, recommended_duration_min,
  closest_subway, map_external_url, website_url, tags
) VALUES
-- 1. Central Park
-- nyc_busyness.json: place_id ChIJ4zGFAZpYwokRGUGph3Mf37k, rating 4.8, reviews 300300
-- osm_attractions.json: opening_hours 06:00-01:00, wheelchair yes
(
  'central-park', 'Central Park', 'park',
  'A 843-acre urban oasis stretching through the heart of Manhattan.',
  'Designed by Frederick Law Olmsted and Calvert Vaux, Central Park offers meadows, lakes, outdoor theaters, and miles of walking paths. Home to the Bethesda Fountain, Sheep Meadow, and the Delacorte Theater.',
  'Manhattan', 'Midtown', 'Central Park, New York, NY 10024',
  40.7825547, -73.9655834,
  '{"mon":[["06:00","01:00"]],"tue":[["06:00","01:00"]],"wed":[["06:00","01:00"]],"thu":[["06:00","01:00"]],"fri":[["06:00","01:00"]],"sat":[["06:00","01:00"]],"sun":[["06:00","01:00"]]}',
  'Daily 6 AM–1 AM',
  'ChIJ4zGFAZpYwokRGUGph3Mf37k', 4.8, 300300,
  '07:00', '09:00', 'Weekday mornings',
  'Weekend afternoons push busyness above 80%; weekday mornings before 9 AM are calm with far fewer visitors.',
  ARRAY['wheelchair'], 0, 'Free', 180,
  '72 St (B,C) or 86 St (4,5,6)',
  'https://maps.google.com/?q=Central+Park+New+York',
  'https://www.centralparknyc.org',
  ARRAY['park','nature','outdoor','free','walk']
),
-- 2. Times Square
-- nyc_busyness.json: place_id ChIJmQJIxlVYwokRLgeuocVOGVU, rating 4.7, reviews 243817
-- osm_attractions.json: no opening_hours, no wheelchair data
(
  'times-square', 'Times Square', 'landmark',
  'The neon-lit crossroads of the world, buzzing day and night with Broadway marquees and giant billboards.',
  'Times Square stretches from 42nd to 47th Street along Broadway, drawing over 50 million visitors a year to its theater district, flagship stores, and iconic New Year''s Eve ball drop.',
  'Manhattan', 'Midtown', 'Manhattan, NY 10036',
  40.7579747, -73.9855426,
  '{"mon":[["00:00","24:00"]],"tue":[["00:00","24:00"]],"wed":[["00:00","24:00"]],"thu":[["00:00","24:00"]],"fri":[["00:00","24:00"]],"sat":[["00:00","24:00"]],"sun":[["00:00","24:00"]]}',
  'Open 24 hours',
  'ChIJmQJIxlVYwokRLgeuocVOGVU', 4.7, 243817,
  '08:00', '10:00', 'Weekday mornings',
  'Evenings and weekends push crowd levels above 85%; weekday mornings have far fewer tourists and better photo opportunities.',
  NULL, 0, 'Free', 60,
  '42 St–Times Sq (1,2,3,7,N,Q,R,W,S)',
  'https://maps.google.com/?q=Times+Square+New+York',
  'https://www.timessquarenyc.org',
  ARRAY['landmark','nyc-icon','free','broadway','photo-spot']
),
-- 3. 9/11 Memorial & Museum
-- nyc_busyness.json: place_id ChIJRcvoOxpawokR7R4dQMXMMPQ, rating 4.8, reviews 93953
-- osm_attractions.json: opening_hours Mo-Th 09:00-20:00, Fr-Sa 09:00-21:00, Su 09:00-20:00; wheelchair yes
(
  '9-11-memorial', '9/11 Memorial & Museum', 'museum',
  'A solemn tribute at Ground Zero honoring the nearly 3,000 victims of the September 11 attacks.',
  'The memorial''s twin reflecting pools occupy the footprints of the original Twin Towers, surrounded by bronze panels engraved with every victim''s name. The underground museum traces the events of 9/11 through artifacts, oral histories, and exhibitions.',
  'Manhattan', 'Financial District', '180 Greenwich St, New York, NY 10007',
  40.7115776, -74.0133362,
  '{"mon":[["09:00","20:00"]],"tue":[["09:00","20:00"]],"wed":[["09:00","20:00"]],"thu":[["09:00","20:00"]],"fri":[["09:00","21:00"]],"sat":[["09:00","21:00"]],"sun":[["09:00","20:00"]]}',
  'Mon–Thu & Sun 9 AM–8 PM; Fri–Sat 9 AM–9 PM',
  'ChIJRcvoOxpawokR7R4dQMXMMPQ', 4.8, 93953,
  '09:00', '11:00', 'At opening, any weekday',
  'Busyness climbs above 90% from noon onward; arriving right at 9 AM gives the quietest and most reflective experience.',
  ARRAY['wheelchair','accessible_restroom'], 33.00, '$33 adults; outdoor memorial pools are free', 90,
  'Cortlandt St (1) or Fulton St (2,3,4,5,A,C,J,Z)',
  'https://maps.google.com/?q=9/11+Memorial+Museum+New+York',
  'https://www.911memorial.org',
  ARRAY['museum','memorial','history','indoor','landmark']
),
-- 4. Grand Central Terminal
-- nyc_busyness.json: place_id ChIJhRwB-yFawokRi0AhGH87UTc, rating 4.7, reviews 7628
-- osm_attractions.json: opening_hours Mo-Su 05:30-02:00; wheelchair yes
(
  'grand-central-terminal', 'Grand Central Terminal', 'landmark',
  'Beaux-Arts masterpiece and working rail hub beneath a celestial ceiling of 2,500 stars.',
  'Opened in 1913, Grand Central handles half a million visitors daily across its Main Concourse, dining concourse, and the famous Oyster Bar. The celestial ceiling mural and the whisper gallery are architectural must-sees.',
  'Manhattan', 'Midtown East', '89 E 42nd St, New York, NY 10017',
  40.7533582, -73.9768041,
  '{"mon":[["05:30","02:00"]],"tue":[["05:30","02:00"]],"wed":[["05:30","02:00"]],"thu":[["05:30","02:00"]],"fri":[["05:30","02:00"]],"sat":[["05:30","02:00"]],"sun":[["05:30","02:00"]]}',
  'Daily 5:30 AM–2 AM',
  'ChIJhRwB-yFawokRi0AhGH87UTc', 4.7, 7628,
  '08:00', '10:00', 'Weekday early morning',
  'Commuter rush fades by mid-morning; early arrivals get the Main Concourse nearly to themselves for an unobstructed look at the architecture.',
  ARRAY['wheelchair','accessible_restroom'], 0, 'Free', 60,
  'Grand Central–42 St (4,5,6,7,S)',
  'https://maps.google.com/?q=Grand+Central+Terminal+New+York',
  'https://www.grandcentralterminal.com',
  ARRAY['landmark','architecture','free','indoor','transit']
),
-- 5. The High Line
-- nyc_busyness.json: place_id ChIJ5bQPhMdZwokRkTwKhVxhP1g, rating 4.7, reviews 67573
-- osm_attractions.json: opening_hours Mo-Su 07:00-19:00; wheelchair yes
(
  'the-high-line', 'The High Line', 'park',
  'Elevated rail-trail turned urban park stretching 1.45 miles above Chelsea and Hudson Yards.',
  'Built on a former freight rail line, the High Line winds through the West Side offering rotating public art installations, native plantings, and city views from 14th to 34th Street. Directly connected to Chelsea Market and The Shed.',
  'Manhattan', 'Chelsea', 'New York, NY 10011',
  40.7479925, -74.0047649,
  '{"mon":[["07:00","19:00"]],"tue":[["07:00","19:00"]],"wed":[["07:00","19:00"]],"thu":[["07:00","19:00"]],"fri":[["07:00","19:00"]],"sat":[["07:00","19:00"]],"sun":[["07:00","19:00"]]}',
  'Daily 7 AM–7 PM',
  'ChIJ5bQPhMdZwokRkTwKhVxhP1g', 4.7, 67573,
  '07:00', '09:00', 'Weekday mornings at opening',
  'Weekend afternoons fill the walkway; arriving at opening on a weekday gives you the gardens and art installations without the crowds.',
  ARRAY['wheelchair'], 0, 'Free', 60,
  '14 St / 8 Av (A,C,E,L) or 23 St (C,E)',
  'https://maps.google.com/?q=The+High+Line+New+York',
  'https://www.thehighline.org',
  ARRAY['park','outdoor','free','art','walk']
);

COMMIT;
