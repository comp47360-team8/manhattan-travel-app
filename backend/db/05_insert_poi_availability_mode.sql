BEGIN;

UPDATE poi
SET availability_mode = 'ASSUMED_OPEN'
WHERE slug IN (
  'times-square',
  'rockefeller-center',
  'grand-central-terminal',
  'brooklyn-bridge',
  'st-patrick-s-cathedral',
  'flatiron-building',
  'staten-island-ferry-whitehall-terminal',
  'south-street-seaport',
  'lincoln-center',
  'columbia-university',
  'union-square',
  'chelsea-piers',
  'the-dakota',
  'the-mall-central-park',
  'gapstow-bridge',
  'gramercy-park',
  'little-italy',
  'chinatown-manhattan',
  'koreatown-manhattan',
  'one-world-trade-center',
  'columbus-circle',
  'chrysler-building',
  'bryant-park-winter-village',
  'metlife-building',
  'bethesda-fountain'
);

UPDATE poi 
SET availability_mode = 'UNKNOWN'
WHERE opening_hours IS NULL
  AND availability_mode = 'STRICT';

COMMIT;