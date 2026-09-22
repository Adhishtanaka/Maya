# MAYA: After the monsoon

MAYA is an original browser-based South Asian city game built with Three.js and Vite. Start with a small apartment, a car outside, and a first errand for Amma. From there, the city is open: drive, take jobs, make contacts, race, fly, buy property, or follow the main story through the community and harbor.

It is a playable prototype with a large set of connected systems. [DEVELOPMENT.md](DEVELOPMENT.md) records the current implementation, validation, and production limits. [Game.md](Game.md) contains the broader design roadmap.

## Play it

```sh
npm install
npm run dev
```

Open the URL Vite prints, enter a display name and age on first launch, then choose **Enter the city**. The game needs WebGL. Models, code, and synthesized sound run locally. It uses system fonts and does not require API keys or runtime CDNs.

The cream car near the starting point is yours. Press **F** to enter it and come to a stop before exiting. Your apartment contains a free pistol and 36 rounds. Talk to Amma to begin the first delivery.

## What is in the city

### City, people, and interiors

The map includes western neighborhoods, a village, farmland, the industrial harbor, a coast, cloud forest, and northern highlands. It has 64 registered buildings. Each has an exterior entrance, a ground-floor scene, and furnished upper rooms reached by stairs. Buildings can contain apartments, houses, cabins, cafes, shops, garages, warehouses, the hospital, temple, bank, and community spaces.

Forty-four named adult residents have jobs, homes, schedules, dialogue, relationships, clothes, and personal delivery favors. They walk routes, go indoors, flee danger, and remember help or harm. The city also has a small noncombat school-age family routine, club performers, dogs, deer, boars, and birds.

Every address also has a two-step work order. Read it downstairs, complete the two upstairs stations, and collect Rs. 220. Progress is saved.

Trees, rock faces, hills, buildings, street furniture, coast barriers, parked cars, and interior furniture block movement. Substepped motion prevents fast actors from passing through narrow obstacles. Interiors are created when you enter and stay available for the rest of the session.

### Driving, traffic, and flight

Ten road vehicle models have different mass, speed, steering, acceleration, and dimensions. You can buy and repair vehicles at De Silva Motors. Named residents drive traffic, leave their cars after trips, and visibly get out when you steal a vehicle. Doors animate during entry and exit. Collisions transfer momentum, can spin or damage vehicles, and can ignite critically damaged engines. Bicycles disable without exploding.

Amma sells tea, rolls, and rice meals. Fernando Sporting Goods sells firearms, ammunition, and the vault-job toolkit. Four named Dockside Crew members carry pistols or carbines and retaliate to nearby player violence. Fallen crew members and officers can drop usable weapons and ammunition.

Traffic uses connected road circuits, braking distance, wet-road handling, collision clearance, and recovery when a vehicle gets stuck. Police and ambulances share collision-aware road routing. Officers can leave a patrol car, pursue on foot, and walk back to it instead of teleporting into the driver's seat.

The northern Maya Air & Cycle Depot provides bicycles, motorcycles, jetpacks, parachutes, a utility helicopter, and a survey plane. Flight uses simplified controls: helicopters climb vertically, planes need forward speed, and low flight hits scenery.

### Combat, police, and recovery

MAYA has melee, pistols, carbines, a bazooka, grenades, C4, and missiles. Weapons use finite ammunition, reloads, line-of-sight checks, visible effects, recoil, swept projectile movement, wall-blocked explosions, and distance-based damage. Crouch, use nearby cover, dodge, and manage stamina to stay alive. Blood clears after 60 seconds of active simulation. Emergency crews collect bodies when they arrive; a resident's death stays in the save.

Witnessed crimes bring police attention. Four patrol units respond, wanted levels can call armed officers, a helicopter, and roadblocks, and medical crews travel to injuries. Officers aim before firing, use visibility rules, and can be delayed by walls or weather. Crouching, night, and rain reduce detection range. Four-star searches deploy two roadblock cars, and distant disabled patrol crews can be replaced.

When your health reaches zero, the game shows a WASTED screen for three seconds. Input is locked during recovery, then you return to Maya General Hospital with full health and a Rs. 150 treatment charge. Death during a vehicle, interior, or on-foot encounter uses the same recovery flow.

### Story, jobs, and city life

The main story has six chapters. It starts with Amma's tea delivery and branches between the community and harbor union. Separate activities include:

- Taxi, ambulance, courier, and walking-escort jobs
- Personal favors, trusted contacts, and up to three recruited companions
- Faction jobs that change district influence and payout bonuses
- Four races, including the two-lap Old Town circuit and Harbor Rivals against named drivers. Each keeps a personal best, and Harbor Rivals pays by finishing position.
- The wages-ledger investigation. Find Ravi, collect the harbor ledger, hear Deepa's testimony, then publish with the union, file a police complaint, or sell the records to the crew. The outcome changes payments, named relationships, and district influence.
- A separate vault job with planning, a toolkit, a getaway vehicle, and a police escape
- Property purchases that pay income every two minutes of active play

The phone provides contacts, job messages, dispatch calls, radio control, Pocket Snake, and Memory Pairs. Trusted residents can meet you at your shared location. Lotus Threads sells persistent outfits, and the Lotus Sound Truck supplies nearby synthesized music. Ceylon Social Club runs adult-only, fully clothed performances from 18:00 to 04:00 for players whose self-reported profile age is 18 or older. The game also includes elevated, shoulder, and first-person cameras, a driving chase camera, first-person weapon models, free mouse look, and camera collision.

## Controls

| Control | Action |
| --- | --- |
| WASD / arrows | Walk, or accelerate, reverse, and steer while driving |
| Shift / Ctrl | Sprint / slow walk |
| C / B / Alt | Crouch / take or leave cover / dodge |
| E | Talk, interact, or enter and exit a building |
| F | Enter or exit a nearby stopped vehicle |
| 1 / 2 / 3 / 4 | Fists / pistol / carbine / bazooka |
| Left click | Attack toward the cursor or crosshair |
| R | Reload |
| V | Cycle elevated, shoulder, and first-person cameras |
| Mouse movement / click | Look around in shoulder or first-person view. Click captures the pointer; Escape releases it. |
| Q / mouse wheel | Rotate or zoom the elevated view |
| Space | Jump on foot, handbrake in a road vehicle, or ascend in flight |
| Ctrl in flight | Descend |
| X / K | Toggle an owned jetpack / deploy an owned parachute above 5 m |
| G / T / Y / L | Grenade / C4 / detonate C4 / missile |
| I / Backtick | Equipment / sandbox codes |
| H | Horn |
| J / N | Phone / next vehicle radio station |
| O | City jobs |
| M | Map and waypoint |
| Tab | Journal, contacts, and relationships |
| P | Save |
| Escape | Settings or close a menu |

Touch controls include movement, interaction, vehicle entry, brake or jump, held fire, equipment, reload, crouch, and dodge. Drag the world to look in shoulder or first-person view. Touch devices use the Low graphics preset by default.

## Sandbox codes

Open Equipment with **I**, or press Backtick for codes. `RUNFAST`, `SKYHIGH`, `AIRFLEET`, `ARMORY`, `POCKETS`, `PEACE`, and `ARMOR` are available. `HOPUP`, `SQUAD`, and `TEMPEST` are also available in the equipment menu. Movement, fuel, and invulnerability modifiers apply only to the current session. Equipment and money save normally.

## Save, weather, and audio

A city day lasts 24 minutes of active simulation. Lighting, lamps, windows, headlights, routines, and ambient sound change across morning, afternoon, evening, and night. Weather updates every 90 active seconds. Rain affects visibility, road handling, pedestrian behavior, and sound. Natural snow appears only in the northern highlands (`z < -100`) with a 14% chance; choosing snow elsewhere previews overcast weather.

The game synthesizes engines, footsteps, horns, gunshots, reloads, impacts, sirens, rotor sound, doors, wind, rain, birds, insects, and club music with Web Audio. It does not include downloaded audio recordings.

Autosave runs every 20 seconds, after important transactions, and when you leave the page. Saves include position, health, city time, money, reputation, owned and stolen parked vehicles, inventory, active delivery and favor state, story choices, factions, properties, vault-job state, wanted level, discoveries, resident memories and deaths, building work, equipment, aircraft access, faction jobs, district influence, and race records. Existing version-1 saves migrate to version 2 under `maya-city-v1`. Active emergency routes, loose blood, exact pedestrian positions, projectiles, placed charges, and active flight are session state. Airborne saves return the player to the depot. Three manual save slots are available in Settings. Loading a slot backs up the current autosave under `maya-before-load` without replacing the other slots. Graphics and look sensitivity are stored separately.

## Develop and test

```sh
npm run build            # Production files in dist/
npm run preview          # Serve the production build
npm test                 # Unit tests
npm run test:browser     # Browser tests, with the dev server on port 5173
npm run test:production  # Production browser tests, with preview on port 4173
```

Set `MAYA_URL` to test another server address. Browser tests use Playwright Chromium. Development browser tests can use a deterministic simulation harness at `?test`; production builds exclude it.

`world.js` builds the exterior city, `physics.js` handles collision and navigation, `vehicles.js` handles traffic and driving, `emergency.js` handles police and ambulances, and `main.js` connects controls, UI, missions, and simulation. The full source map is documented in [DEVELOPMENT.md](DEVELOPMENT.md).

## Assets and publishing

The project reuses licensed Kenney scenery with generated pines, frost pines, and lanterns. New city and character geometry is authored in code. The supplied elephant emblem defines the ivory, charcoal, burgundy, and olive palette used across the HUD, menus, and map. See [THIRD_PARTY.md](THIRD_PARTY.md) for licenses and provenance.

Run `npm run assets:brand` to rebuild the social image and PNG icons from the supplied SVG emblem. The manifest is included, but the project has no service worker or offline cache. Before deployment, set the actual canonical and social-image URLs in `index.html`.
