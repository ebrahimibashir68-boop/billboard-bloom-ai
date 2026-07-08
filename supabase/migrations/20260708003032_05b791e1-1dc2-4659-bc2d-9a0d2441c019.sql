
-- Seed traditional billboard advertising companies (pre-approved partners)
INSERT INTO public.ad_partners (id, company_name, contact_email, country, website, billboards_summary, status, revenue_share_pct)
VALUES
  ('11111111-1111-1111-1111-111111111101', 'Clear Channel Outdoor', 'partners@clearchannel.example', 'USA', 'https://clearchanneloutdoor.com', 'Global leader in digital and static billboards across North America and Europe.', 'approved', 60),
  ('11111111-1111-1111-1111-111111111102', 'JCDecaux', 'partners@jcdecaux.example', 'France', 'https://jcdecaux.com', 'World #1 outdoor advertising in transit, airports, and street furniture across 80+ countries.', 'approved', 60),
  ('11111111-1111-1111-1111-111111111103', 'Lamar Advertising', 'partners@lamar.example', 'USA', 'https://lamar.com', 'Largest OOH network in North America — highways, digital bulletins, and posters.', 'approved', 60),
  ('11111111-1111-1111-1111-111111111104', 'Outfront Media', 'partners@outfront.example', 'USA', 'https://outfrontmedia.com', 'Iconic U.S. billboards, subways, and Times Square digital canvases.', 'approved', 60),
  ('11111111-1111-1111-1111-111111111105', 'Ocean Outdoor', 'partners@oceanoutdoor.example', 'UK', 'https://oceanoutdoor.com', 'Premium digital OOH — Piccadilly Lights, IMAX, and landmark screens across Europe.', 'approved', 60),
  ('11111111-1111-1111-1111-111111111106', 'Branded Cities Network', 'partners@brandedcities.example', 'USA', 'https://brandedcities.com', 'Spectacular signage in Times Square, Las Vegas Strip, and Toronto.', 'approved', 60),
  ('11111111-1111-1111-1111-111111111107', 'Ströer', 'partners@stroeer.example', 'Germany', 'https://stroeer.com', 'Germany''s largest OOH operator with digital city networks.', 'approved', 60),
  ('11111111-1111-1111-1111-111111111108', 'Focus Media', 'partners@focusmedia.example', 'China', 'https://focusmedia.cn', 'Elevator, cinema and mega-LED screens across 300+ Chinese cities.', 'approved', 60),
  ('11111111-1111-1111-1111-111111111109', 'oOh!media', 'partners@oohmedia.example', 'Australia', 'https://oohmedia.com.au', 'Leading OOH across Australia and New Zealand — retail, road, transit, airports.', 'approved', 60),
  ('11111111-1111-1111-1111-11111111110a', 'Daktronics Live', 'partners@daktronics.example', 'USA', 'https://daktronics.com', 'Stadium and landmark LED billboards worldwide.', 'approved', 60)
ON CONFLICT (id) DO UPDATE
  SET company_name = EXCLUDED.company_name,
      website = EXCLUDED.website,
      billboards_summary = EXCLUDED.billboards_summary,
      status = 'approved';

-- Seed iconic real-world billboard venues in vibrant global locations
INSERT INTO public.venues (code, name, sport, placement, city, country, region, daily_impressions, base_rate_pi, partner_id, active) VALUES
  ('times-square-nyc',    'Times Square Spectacular',        'urban', 'digital-spectacular', 'New York',      'USA',          'north-america', 1500000, 45, '11111111-1111-1111-1111-111111111104', true),
  ('piccadilly-lights',   'Piccadilly Lights',               'urban', 'digital-spectacular', 'London',        'UK',           'europe',        1000000, 40, '11111111-1111-1111-1111-111111111105', true),
  ('shibuya-crossing',    'Shibuya Crossing Mega Screens',   'urban', 'digital-spectacular', 'Tokyo',         'Japan',        'asia',          2500000, 50, '11111111-1111-1111-1111-111111111102', true),
  ('burj-khalifa-led',    'Burj Khalifa LED Facade',         'urban', 'landmark-led',        'Dubai',         'UAE',          'middle-east',    900000, 55, '11111111-1111-1111-1111-11111111110a', true),
  ('ginza-crossing',      'Ginza 4-chome Crossing',          'urban', 'digital-spectacular', 'Tokyo',         'Japan',        'asia',           700000, 35, '11111111-1111-1111-1111-111111111102', true),
  ('champs-elysees',      'Champs-Élysées Digital Network',  'urban', 'street-furniture',    'Paris',         'France',       'europe',         850000, 38, '11111111-1111-1111-1111-111111111102', true),
  ('kpop-square-seoul',   'K-Pop Square (SM Town) Seoul',    'urban', 'anamorphic-led',      'Seoul',         'South Korea',  'asia',          1200000, 42, '11111111-1111-1111-1111-111111111108', true),
  ('vegas-strip-sphere',  'Las Vegas Strip Sphere-Facing',   'urban', 'landmark-led',        'Las Vegas',     'USA',          'north-america', 1100000, 48, '11111111-1111-1111-1111-111111111106', true),
  ('sunset-strip-la',     'Sunset Strip Bulletins',          'urban', 'bulletin',            'Los Angeles',   'USA',          'north-america',  600000, 30, '11111111-1111-1111-1111-111111111103', true),
  ('m-toronto-yd',        'Yonge-Dundas Square Toronto',     'urban', 'digital-spectacular', 'Toronto',       'Canada',       'north-america',  550000, 28, '11111111-1111-1111-1111-111111111106', true),
  ('federation-sq-melb',  'Federation Square Melbourne',     'urban', 'digital-spectacular', 'Melbourne',     'Australia',    'oceania',        400000, 25, '11111111-1111-1111-1111-111111111109', true),
  ('nanjing-road-sh',     'Nanjing Road Shanghai',           'urban', 'landmark-led',        'Shanghai',      'China',        'asia',          1400000, 40, '11111111-1111-1111-1111-111111111108', true),
  ('kurfurstendamm',      'Kurfürstendamm Berlin',           'urban', 'street-furniture',    'Berlin',        'Germany',      'europe',         500000, 22, '11111111-1111-1111-1111-111111111107', true),
  ('reforma-cdmx',        'Paseo de la Reforma Mexico City', 'urban', 'bulletin',            'Mexico City',   'Mexico',       'latin-america',  650000, 24, '11111111-1111-1111-1111-111111111103', true),
  ('avenida-paulista',    'Avenida Paulista São Paulo',      'urban', 'digital-spectacular', 'São Paulo',     'Brazil',       'latin-america',  900000, 30, '11111111-1111-1111-1111-111111111101', true),
  ('marina-bay-sg',       'Marina Bay Sands Facade',         'urban', 'landmark-led',        'Singapore',     'Singapore',    'asia',           700000, 44, '11111111-1111-1111-1111-11111111110a', true),
  ('mumbai-bandra',       'Bandra-Worli Sea Link Approach',  'urban', 'bulletin',            'Mumbai',        'India',        'asia',           800000, 20, '11111111-1111-1111-1111-111111111101', true),
  ('istanbul-taksim',     'Taksim Square Istanbul',          'urban', 'digital-spectacular', 'Istanbul',      'Turkey',       'europe',         600000, 22, '11111111-1111-1111-1111-111111111102', true),
  ('m30-madrid',          'M-30 Madrid Digital Bulletins',   'urban', 'bulletin',            'Madrid',        'Spain',        'europe',         480000, 21, '11111111-1111-1111-1111-111111111102', true),
  ('heathrow-t5',         'Heathrow Terminal 5 Digital',     'transit','airport-digital',    'London',        'UK',           'europe',         350000, 26, '11111111-1111-1111-1111-111111111102', true)
ON CONFLICT (code) DO UPDATE
  SET name = EXCLUDED.name,
      placement = EXCLUDED.placement,
      daily_impressions = EXCLUDED.daily_impressions,
      base_rate_pi = EXCLUDED.base_rate_pi,
      partner_id = EXCLUDED.partner_id,
      active = true;
