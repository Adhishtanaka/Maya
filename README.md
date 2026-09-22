# MAYA — After the monsoon

A browser-based, original South Asian city game built with Three.js and Vite. The development roadmap is [game.md](game.md); [DEVELOPMENT.md](DEVELOPMENT.md) distinguishes the current implementation from remaining production work.

## Run and verify

```sh
npm install
npm run dev
```

Open the URL printed by Vite, enter your name and age on first launch, then select **Enter the city**. Audio starts after that click. The game requires WebGL. Models, code, and synthesized audio are served locally; fonts use the device’s system fonts; there are no API keys or runtime CDNs.

```sh
npm run build        # Production files in dist/
npm run preview      # Serve the production build
npm test             # Collision, navigation, schedules, weather, cleanup and save rules
npm run test:browser  # Run with the dev server listening on port 5173
npm run test:production # Run with npm run preview listening on port 4173
```

Set `MAYA_URL` for a different test-server URL. Browser tests use Playwright Chromium. Expansion tests use a deterministic simulation harness available only in development with `?test`; that harness is excluded from the production build.

## The current game

- **Expanded world:** 64 individually registered buildings, approximately 4.5 times the previous playable area, western neighborhoods, a village, farmland, an industrial harbor, coastal scenery, cloud forest, and northern highlands.
- **Interiors:** every registered building has a doorway, a separate ground-floor scene and furnished upper rooms reached by stairs. A two-step work order at each address pays Rs. 220 once; progress survives saves. Furnished templates include apartments with rooms, houses, cabins, cafes, shops, garages, warehouses, the hospital, temple, sporting-goods store, bank, and community buildings. Interiors are created on entry and retained for the session.
- **Solid world:** trees, rock faces, hills, buildings, street furniture, coast barriers, parked cars, and interior furniture block movement. Substepped motion prevents fast movers from tunneling through narrow obstacles. Navigation checks whole segments, and vehicles account for their front/rear clearance.
- **Vehicles and shops:** ten road models have different acceleration, steering, mass, speed and body shapes. De Silva Motors sells cars and repairs them; purchases and paint persist in saves. Amma sells tea, rolls and rice meals, alongside the existing gun shop. Named residents drive traffic vehicles, get out after trips and visibly leave during theft. Entry/exit opens doors and takes time. Mass-based impacts push and spin cars; critical engine-vehicle damage starts a five-second fire warning, with immediate explosions at zero health. Bicycles disable without a fuel explosion.
- **Traffic:** cars follow connected circuits with acceleration, braking distance, reaction time, wet-road handling, vehicle damage, and collisions. Sprinting in front of a moving car can injure the player. Residents look before crossing unless fleeing danger.
- **Armed encounters:** four named Dockside Crew members carry pistols/carbines and retaliate to nearby player violence. Fallen crew members and officers drop weapons with ammunition. Serious crashes into pursuing police trigger armed dismounts even while you remain in your car.
- **People:** 44 persistent named adult residents have individual biographies, dialogue, occupations, homes, workplaces, casual/work outfits, day or night shifts, relationships, and personal delivery favors. Body shapes, hair, jackets, skirts and colors vary across the adult cast; work and casual wardrobes change with their schedules. Jointed legs and elbows animate walking, sprinting and seated driving. Residents walk routes, enter buildings, flee danger, and remember harm or help. Death persists in saves.
- **Combat:** melee, pistol, carbine, bazooka, ammunition, magazines, reload timing, visible weapon models, recoil, tracer effects, line-of-sight checks, civilian injury/death, and vehicle damage. Crouch, take nearby cover or dodge; sprinting and dodging consume stamina. Low cover blocks crouched targets until they expose themselves to fire. Blood fades during its last eight seconds and is disposed of after 60 seconds of active simulation. Corpses are collected by emergency crews or removed after 60 seconds; their resident identity remains deceased.
- **Police and medical response:** four police units patrol and respond to witnessed incidents. Wanted levels escalate to armed response and helicopter search. Police pursue last-known positions; breaking sight eventually clears the search. Officers navigate on foot and aim before firing. Crouching, night and precipitation reduce detection distance. Four-star searches deploy two roadblock vehicles, and distant disabled patrol crews can be replaced. Two ambulances dispatch to injuries, reach the scene, deploy medics, recover casualties, and return to the hospital. Surviving residents recover; fatalities do not respawn.
- **Story and optional jobs:** a six-chapter story beginning with Amma’s tea delivery, a choice between the community and harbor union, an indoor manifest objective, distinct outcomes, and a final gathering. Repeatable tea deliveries, personal favors, farm deliveries, and four race courses remain available: coastal sprint, a two-lap Old Town circuit, the Mistwood rally and Harbor Rivals against two named AI drivers. Each records a personal best; the opponent race pays by finishing position.
- **The wages ledger:** find Ravi through the faction board, collect a separate ledger inside the harbor, and hear Deepa’s testimony. Publish with the union, file a police complaint, or sell the records to the crew. Payments, named relationships and district influence reflect the choice; lost witnesses affect the objective.
- **Optional vault job:** plan at the bank marker, inspect the floor plan inside, acquire a toolkit, prepare an escape vehicle, open the vault under alarm, lose the police, and deliver the bag at South Harbor. This criminal path is separate from the main story.
- **Property and factions:** buy a tea-stop partnership, harbor warehouse, or hill cabin. Businesses pay income every two minutes of active simulation. Community, harbor union, police, and Dockside Crew relationships change with relevant actions. The journal’s faction board offers four staged jobs. Finishing jobs changes district influence; the map shows who leads each district. Jobs earn a 10% bonus when their faction already leads there.
- **Cameras:** elevated, over-the-shoulder, and first-person views, with aiming, visible first-person weapons, free mouse look, a following chase camera while driving, and camera collision. The compact HUD keeps details in menus and hides weapon information while driving. The persistent navbar and controls footer have been removed; controls are in Settings.

- **Transport and flight:** bicycles, motorcycles, vans and buses join the car fleet. The marked northern Air & Cycle Depot sells equipment and charters a utility helicopter and survey plane. Space/Ctrl climbs/descends; the plane needs forward speed. Jetpacks consume fuel, parachutes provide controlled landings, and low flight collides with scenery. These are simplified flight mechanics.
- **Equipment and damage:** grenade fuses, remotely triggered C4 and missiles use finite ammunition, swept projectile movement, distance-based damage and wall obstruction. Pistol/carbine damage now falls with distance; a healthy target takes several hits.
- **Neighborhood life:** three named school-age children and a guardian follow a separate noncombat school/park/home routine and change outfits. Ceylon Social Club opens its stage from 18:00 to 04:00, with four adult performers, individual dialogue, three synthesized music patterns and refreshments.
- **Emblem branding:** the ivory/charcoal/burgundy/olive palette carries through menus, HUD and map. SVG/PNG favicons, Apple touch icons, a web manifest, descriptions and social-card metadata use the provided emblem.

## Start playing

The cream car beside the starting point is yours. Press **F** to enter it. Stop before getting out.

Your apartment is marked on the map. Interact with its street marker to mark the actual doorway, then enter and inspect the equipment locker for a **free pistol and 36 rounds**. **Fernando Sporting Goods** sells firearms, ammunition, and the toolkit. Weapon access is available without completing the story.

Talk to Amma for your first delivery. The mission card tracks the story; the journal records contacts and relationships. A faction job, favor, race, or vault job temporarily takes priority in the mission tracker. Business partnerships are available from Amma, South Harbor, and Mistwood.

Find **Maya Air & Cycle Depot** on the northern map for aircraft, jetpack, parachute, grenades, C4 and missiles. The equipment button or **I** opens equipment and sandbox codes. **Backtick** opens codes directly: `RUNFAST`, `SKYHIGH`, `AIRFLEET`, `ARMORY`, `POCKETS`, `PEACE`, `ARMOR`. Movement, infinite fuel and invulnerability toggles last only for the current session; cash and equipment save normally.

Read a building’s work order near the right wall downstairs, use its stairs, then complete the two upstairs stations in order. Stand at each station for four seconds. Visit **Ceylon Social Club** after 18:00 for music and performances.

## Controls

| Control | Action |
| --- | --- |
| WASD / arrows | Walk; accelerate, reverse and steer when driving |
| Shift / Ctrl | Sprint / slow walk |
| C / B / Alt | Crouch / take or leave cover / dodge |
| E | Talk, interact, enter/exit a building |
| F | Enter/exit a nearby stopped vehicle |
| 1 / 2 / 3 | Fists / pistol / carbine |
| Left click | Attack toward the cursor or crosshair |
| R | Reload |
| V | Cycle elevated, shoulder and first-person cameras |
| Mouse movement / click | Look around in close views; click captures the pointer, Escape releases it |
| Q / mouse wheel | Rotate / zoom elevated view |
| Space | Jump on foot / handbrake in a road vehicle / ascend in flight |
| Ctrl in flight | Descend |
| X / K | Toggle owned jetpack / deploy owned parachute above 5 m |
| G / T / Y / L | Throw grenade / place C4 on the ground / detonate local charges / launch missile |
| I / Backtick | Equipment / sandbox codes |
| H | Horn |
| J / N | Phone / change vehicle radio station |
| M | Map; click to place a waypoint |
| Tab | Journal, contacts and relationships |
| P | Save |
| Escape | Settings / close a menu |

Touch devices have movement, interaction, vehicle, brake/jump, held fire, equipment, reload, crouch and dodge buttons. Drag on the world to look in shoulder/first-person view, or point the elevated-view aim. Settings includes look sensitivity and Low/Balanced/High graphics. Low reduces shadows, local lights, particles and render resolution; touch devices select it by default.

## Time, weather, audio and persistence

A city day takes 24 minutes of active simulation. Morning, afternoon, evening and dark night change lighting, street lamps, windows, headlights, routines and ambience. Settings can preview a time of day or weather.

Natural weather updates every 90 active seconds. Rain changes visibility, road reflectivity, braking/steering, pedestrian behavior and audio. Snow has a 14% natural-weather chance only in the northern highlands (`z < -100`); elsewhere the snow preview produces overcast skies.

Original Web Audio synthesis provides engines, footsteps, horns, gunshots, reloads, impacts, police/ambulance sirens, helicopter rotor audio, doors, interaction/reward cues, wind, rain, birds and insects. Club beats use original synthesized percussion, bass and chords. Bicycles do not play an engine sound. There are no downloaded recordings.

Autosave runs every 20 seconds, after important transactions, and when leaving the page. Saves include position, health, city time, money, reputation, owned/stolen parked vehicles, driving state, inventory, active delivery, personal favor, story progress/choice, factions, properties, vault-job stage, wanted level, discovered districts, and resident memories/deaths. Existing version-1 saves migrate to version 2 under the same `maya-city-v1` local-storage key. Active emergency routes, loose blood, and precise resident walking positions are regenerated. Faction job stages, district influence and race records are also saved. Active races restart from the race marker after loading. Building work orders, equipment quantities and aircraft access are saved. Airborne saves return you safely to the depot; active flight, fuel, placed charges, projectiles and aircraft damage/positions are session state. Family/club background actors do not have persistent combat or relationship records. Settings → Save slots offers three independent manual snapshots. Loading one backs up the previous autosave under `maya-before-load`; it does not overwrite the other manual snapshots. Graphics and look sensitivity are stored separately. Storage failures are reported in the HUD.

## Source layout

`physics.js` contains shared collision and A* navigation; `world.js` builds exterior geometry; `actor-models.js` builds articulated people and vehicle variants; `vehicles.js` simulates traffic and driving; `residents.js` defines identities and routines; `interiors.js` creates indoor scenes; `combat.js` handles weapons, damage and transient effects; `emergency.js` handles police, ambulances and helicopters; `atmosphere.js` and `audio.js` handle weather/lighting/sound; `systems.js` defines data and save validation; `map.js` draws maps; `tactics.js` handles player stances and detection rules; `city-activities.js` defines race courses, faction jobs and district influence; `racing.js` drives the rival cars; `encounters.js` stores the harbor-story rules; `saves.js` manages manual snapshots; `preferences.js` defines graphics presets; `mobility-models.js` builds bicycles and aircraft; `flight.js` handles flight/fuel/parachutes; `ordnance.js` handles timed projectiles and damage falloff; `families.js` handles background school routines; `interior-activities.js` validates work-order progress; `main.js` connects controls, UI, missions and the simulation.

The existing Kenney trees/rocks and generated pines, frostpines and lanterns are reused. New world and character geometry is authored in code. See [THIRD_PARTY.md](THIRD_PARTY.md) for provenance and licenses.


## Brand assets and publishing

Run `npm run assets:brand` to regenerate the social image and PNG icons directly from the supplied SVG emblem with Playwright. The manifest describes the app; there is no service worker or offline cache. Before public deployment, use the actual deployment origin for absolute Open Graph/Twitter image URLs and add a canonical URL in `index.html`. No deployment hostname has been assumed.

### City life update (0.11)

Enter your name and age on first launch; the profile stays on this device. Club entry requires a self-reported age of 18+. The club adds drinks, adult social scenes and a fully clothed seated performance.

Press **O** for taxi, ambulance, courier and walking-escort jobs. Complete three favors for a resident to unlock recruitment; manage up to three companions in the journal. Press **M** for searchable maps, zoom, route pins and filters. Houses now have exterior-view windows. Armed officers patrol on foot, civilians fight or flee, cash drops can be collected, and **4** equips a purchased bazooka. Police cars and ambulances are drivable.

Use **Shift** to sprint and **Space** to jump. The equipment menu’s sandbox codes include `RUNFAST`, `HOPUP`, `SQUAD`, `ARMORY` and `TEMPEST`. Dogs can be befriended; deer flee and boars can charge. Tornadoes appear rarely in rainy rural areas or through the weather/code controls. Buildings shelter you from wind.

Current limitations and validation are recorded in [DEVELOPMENT.md](DEVELOPMENT.md). Removed public assets are listed in [the cleanup audit](docs/asset-audit.json); retained licenses are described in [THIRD_PARTY.md](THIRD_PARTY.md).

### Shops, police recovery and phone (0.12)

Press **J** or the phone icon for contacts, job messages, radio and two playable games. Ask residents to **Exchange numbers** while talking; trusted contacts can meet at your location. Call police or an ambulance and share your location or a map pin. Available units drive there, with a final approach on foot; services report when busy.

Find **Lotus Threads** through map search. Inspect its mannequins, preview an outfit and buy/wear it; your clothing also appears while driving and survives reload. Shops and conversations now have animated participants, item previews, rotation and handover feedback. Weapon counters have individual physical displays.

Press **N** to cycle the vehicle radio. The **Lotus Sound Truck** travels the southern roads with speaker music audible nearby and is also available from the dealership. Music is synthesized locally. Police now route around nearby obstructions, retry unreachable paths on a timer and reverse/replan stalled vehicles.
