# MAYA — Open-World 3D Top-Down Action Game

## 1. Game Concept

**MAYA** is a story-driven, open-world 3D top-down action game set in a fictional South Asian-inspired city. The player lives in a large interconnected city where they can freely explore streets, enter buildings, interact with people, drive vehicles, participate in races, complete missions, commit crimes, help citizens, build relationships, work with gangs, or become a respected member of society.

The game should feel like a living city rather than a collection of disconnected missions. The player should be able to make meaningful choices about how they live, and those choices should affect their reputation, relationships, access to missions, police attention, gangs, businesses, and the story.

The game is **open-source**, designed with modular systems and openly available assets/code where legally possible.

---

# 2. Core Gameplay

The core gameplay loop is:

**Explore → Discover people/events → Choose what to do → Complete activities/missions → Earn money/reputation → Change relationships and city conditions → Unlock new opportunities.**

The player should not be forced into a single path.

They can choose to:

* Follow the main story.
* Help ordinary citizens.
* Take legitimate jobs.
* Participate in street races.
* Steal vehicles.
* Rob shops.
* Plan and execute bank robberies.
* Work with criminal organizations.
* Fight rival gangs.
* Avoid crime and build a legitimate reputation.
* Help police investigations.
* Buy or improve properties.
* Explore the city.
* Visit businesses and social locations.
* Simply drive around and interact with the world.

The game should support both **lawful and criminal playstyles**.

---

# 3. Game World

The game takes place in one large interconnected city called **Maya City**.

The city should contain different districts with distinct visual identities and gameplay opportunities.

### Example districts

**Downtown**

* Banks
* Corporate buildings
* Hotels
* Restaurants
* Shopping areas
* Police headquarters

**Old Town**

* Temples
* Markets
* Small businesses
* Narrow streets
* Historic buildings

**Industrial District**

* Warehouses
* Factories
* Garages
* Vehicle yards
* Criminal activities

**Residential District**

* Houses
* Apartments
* Schools
* Small shops
* Parks

**Entertainment District**

* Clubs
* Bars
* Restaurants
* Music venues
* Night activities

**Harbor / Port**

* Docks
* Warehouses
* Boats
* Smuggling-related missions
* Industrial areas

**Outskirts**

* Rural roads
* Small villages
* Farms
* Dirt roads
* Racing areas

The world should contain hidden locations, shortcuts, alleys, rooftops, interiors, underground areas, and places that become accessible as the story progresses.

---

# 4. Fully Interactive Buildings

Buildings should not simply be decorative objects.

Important buildings should have accessible interiors.

The player should be able to:

* Enter houses.
* Walk through rooms.
* Enter apartments.
* Visit shops.
* Enter banks.
* Visit temples.
* Enter clubs.
* Enter restaurants.
* Visit garages.
* Enter offices.
* Explore warehouses.

Houses should contain multiple rooms such as:

* Living room
* Bedroom
* Kitchen
* Bathroom
* Garage
* Storage areas

Some interiors can be used for missions while others exist for exploration.

The long-term goal is to make the city feel physically believable, with interiors connected naturally to the outside world.

---

# 5. Player Character

The player controls a fully animated 3D character viewed primarily from a **top-down / elevated camera**.

The character should support:

* Walking
* Running
* Sprinting
* Crouching
* Jumping where appropriate
* Entering vehicles
* Exiting vehicles
* Climbing where appropriate
* Melee combat
* Weapon handling
* Interaction animations
* Taking cover
* Swimming if supported by the environment

Character animations should feel responsive and polished.

---

# 6. Camera

The primary camera is a dynamic 3D top-down camera.

It should:

* Follow the player smoothly.
* Rotate when appropriate.
* Zoom in/out.
* Provide enough visibility for combat and driving.
* Automatically adjust around buildings and obstacles.
* Cinematically change during important story moments.
* Allow the player to explore the environment without losing awareness of nearby threats.

The game should remain fundamentally top-down rather than becoming a traditional third-person game.

---

# 7. Vehicles

Vehicles are an important part of the city.

Possible vehicle categories:

* Cars
* Motorcycles
* Vans
* Trucks
* Buses
* Emergency vehicles
* Boats

Vehicles should have:

* Different handling characteristics.
* Damage states.
* Fuel or energy systems where appropriate.
* Enter/exit animations.
* Vehicle theft mechanics.
* Traffic interactions.
* Police pursuit behavior.

Vehicles should feel different rather than being simple reskinned models.

---

# 8. Racing

The city should contain a racing system.

Players can discover or receive invitations to races.

Race types can include:

* Street races
* Circuit races
* Checkpoint races
* Time trials
* Motorcycle races
* Off-road races

Winning races provides:

* Money
* Reputation
* New contacts
* Vehicle access
* New missions

Racing should exist as a complete optional activity rather than only appearing in the main story.

---

# 9. Crime System

Crime is an optional gameplay path.

Possible activities include:

* Vehicle theft
* Shop robbery
* House burglary
* Bank robbery
* Smuggling
* Gang missions
* Vehicle delivery
* Criminal contracts

Crime should have consequences.

For example:

**Crime → witnesses/cameras → police investigation → wanted level → police response → reputation changes.**

Large crimes should require preparation rather than being instant button presses.

---

# 10. Bank Robbery System

Bank robberies should be multi-stage missions.

Example structure:

### Preparation

* Find information.
* Identify the target.
* Obtain equipment.
* Find a vehicle.
* Recruit helpers if necessary.

### Execution

* Enter the bank.
* Deal with security.
* Control the situation.
* Reach the objective.
* Escape.

### Escape

* Leave the area.
* Avoid or deal with police.
* Reach a safe location.
* Deliver/store the stolen money.

Different approaches should be possible.

The outcome should depend on the player's choices and preparation.

---

# 11. Police System

The city has an active police system.

Police should respond to crimes based on their severity and available evidence.

The system should include:

* Witnesses
* Police patrols
* Police vehicles
* Cameras
* Wanted levels
* Police searches
* Pursuits
* Roadblocks for serious crimes
* Arrests

Importantly, police should not magically know everything.

The game should distinguish between:

**Crime occurring → crime being detected → player being identified → police response.**

This creates more believable gameplay.

---

# 12. Reputation System

MAYA should have a dynamic reputation system.

The player's actions influence how different groups perceive them.

Instead of one simple morality meter, reputation can exist across several categories.

Examples:

### Public Reputation

How ordinary citizens perceive the player.

### Criminal Reputation

How criminal organizations perceive the player.

### Police Reputation

How law enforcement views the player.

### Business Reputation

How legitimate businesses and wealthy characters perceive the player.

### Gang Reputation

How individual gangs perceive the player.

A player could therefore become respected by ordinary citizens while being feared by criminals, or become highly respected within criminal organizations while being wanted by police.

---

# 13. Good and Bad Paths

The player should not be forced to become a criminal.

A player can build a legitimate life through activities such as:

* Helping citizens.
* Completing delivery jobs.
* Driving passengers.
* Participating in legal races.
* Protecting businesses.
* Helping people in emergencies.
* Supporting community characters.
* Purchasing businesses.
* Completing investigation missions.

Criminal actions create different opportunities and consequences.

The story should react to the player's behavior rather than assuming that every player follows the same path.

---

# 14. Gangs and Factions

The city contains multiple organized groups.

Each faction should have:

* Its own territory.
* Members.
* Leaders.
* Visual identity.
* Vehicles.
* Businesses.
* Relationships with other factions.
* Missions.
* Internal conflicts.

The player can gain or lose reputation with each faction.

Faction relationships can change depending on player actions.

For example:

**Help Gang A → Gang A trusts player → Gang B becomes hostile.**

Or:

**Help civilians → public reputation increases → certain criminal factions become less interested in the player.**

---

# 15. Mission System

Missions should be story-driven and varied.

Mission categories include:

* Main story missions
* Side missions
* Racing missions
* Investigation missions
* Rescue missions
* Delivery missions
* Robbery missions
* Gang missions
* Police-related missions
* Character missions
* Exploration missions
* Random encounters

Missions should not all be simple:

**Go there → kill everyone → return.**

Instead, missions should involve different gameplay systems and player decisions.

---

# 16. Dynamic Events

The city should generate events while the player is exploring.

Examples:

* A vehicle accident.
* A citizen asking for help.
* A police chase.
* A street fight.
* A robbery.
* A gang confrontation.
* A racing invitation.
* A suspicious character following the player.
* A business requesting help.
* A random opportunity.

The player can ignore these events or participate.

This helps make the world feel alive.

---

# 17. NPC System

NPCs should have believable daily behavior.

NPCs can:

* Walk around.
* Drive.
* Go to work.
* Visit shops.
* Visit restaurants.
* Go home.
* Attend entertainment locations.
* React to crimes.
* React to violence.
* Call police.
* Flee dangerous situations.
* Interact with other NPCs.

Important NPCs should have individual identities, relationships, schedules, and story roles.

---

# 18. Weapons and Combat

Combat is an important part of the game, but weapons should feel physically convincing and highly polished.

Weapons should have excellent animations for:

* Drawing
* Holstering
* Aiming
* Shooting
* Reloading
* Switching weapons
* Taking cover
* Recoiling
* Recovering from recoil
* Melee attacks
* Weapon inspection
* Picking weapons up
* Dropping weapons

Animation quality should be one of the game's major technical priorities.

Combat should feel responsive, weighty, and visually clear from the top-down camera.

Weapons should also have distinct handling characteristics rather than only different damage numbers.

---

# 19. Combat Design

The combat system should support:

* Melee combat
* Firearms
* Cover
* Dodging
* Enemy awareness
* Stealth where appropriate
* Vehicle combat where appropriate

Enemies should use different behaviors.

For example:

* Aggressive attackers
* Defensive enemies
* Ranged enemies
* Guards
* Police
* Gang members
* Boss characters

Combat should prioritize readable animations and responsive controls.

---

# 20. Story

The main story follows the player's life and rise through Maya City.

The player begins with limited money, connections, and influence.

Through exploration and missions, the player meets characters who offer different opportunities.

The story should contain:

* Major characters
* Friendships
* Rivalries
* Betrayals
* Faction conflicts
* Personal objectives
* Major turning points
* Multiple mission outcomes

The player's actions should influence which characters trust them, which factions become hostile, and which opportunities become available.

---

# 21. World Interaction

Almost everything important should be interactable.

Examples:

* Doors
* Vehicles
* Shops
* ATMs
* Phones
* Computers
* NPCs
* Mission objects
* Weapons
* Furniture
* Businesses
* Signs
* Safehouses

Use a consistent interaction system so the player immediately understands what can be interacted with.

---

# 22. Economy

The city has an economy.

The player can earn money through:

* Jobs
* Missions
* Racing
* Businesses
* Legal activities
* Criminal activities

Money can be spent on:

* Vehicles
* Weapons
* Clothing
* Properties
* Vehicle upgrades
* Safehouses
* Business investments
* Other gameplay-related upgrades

Money should have meaningful uses rather than simply being a score.

---

# 23. Properties

The player can eventually obtain properties.

Properties can function as:

* Homes
* Safehouses
* Garages
* Businesses
* Mission locations

A home should be physically explorable.

The player should be able to enter the home, walk between rooms, store items, change clothing, access vehicles, and interact with selected objects.

---

# 24. UI

The UI should remain clean because the game is viewed from above.

The main HUD should include:

* Health
* Armor if applicable
* Current weapon
* Ammunition
* Money
* Wanted level
* Current mission
* Mini-map
* Reputation indicators when relevant

The map should show:

* Missions
* Businesses
* Properties
* Racing locations
* Important characters
* Safehouses
* Faction territories
* Discovered locations

Do not constantly fill the screen with UI elements.

The world itself should communicate as much information as possible.

---

# 25. Audio

The city should have a dynamic soundscape.

Include:

* Traffic
* Pedestrians
* Police sirens
* Vehicle engines
* Weapons
* Environmental sounds
* Businesses
* Clubs
* Religious/cultural locations
* Weather
* Footsteps

Important story moments should use cinematic music and sound design.

The city should sound different during:

* Day
* Night
* Rain
* High police activity
* Major events

---

# 26. Day/Night Cycle

The city should have a real-time day/night cycle.

Different locations and NPC behaviors should change according to time.

For example:

**Morning**

* Workers commute.
* Shops open.

**Day**

* Heavy traffic.
* Businesses active.

**Evening**

* Entertainment areas become active.
* Racing and social events appear.

**Night**

* Clubs become busy.
* Criminal activity can increase.
* Certain missions become available.

---

# 27. Weather

The game can support dynamic weather.

Possible conditions:

* Clear
* Cloudy
* Rain
* Heavy rain
* Storm

Weather should affect the atmosphere and, where practical, gameplay.

For example:

* Wet roads affect driving.
* Visibility changes.
* NPC behavior changes.
* Certain missions become more difficult.

---

# 28. Save System

The player should be able to save:

* Story progress
* Money
* Vehicles
* Properties
* Reputation
* Faction relationships
* Mission states
* Character relationships

The game should support multiple save slots if practical.

---

# 29. Technical Direction

The game should be built as a **modular open-source project**.

Prioritize a clean architecture where major systems are independent:

```text
Player
 ├── Movement
 ├── Combat
 ├── Interaction
 └── Inventory

World
 ├── Buildings
 ├── NPCs
 ├── Traffic
 ├── Weather
 └── Day/Night

Missions
 ├── Main Story
 ├── Side Missions
 ├── Racing
 └── Dynamic Events

Factions
 ├── Gangs
 ├── Police
 └── Civilian Reputation

Vehicles
 ├── Driving
 ├── Damage
 └── Traffic

Economy
 ├── Money
 ├── Properties
 └── Businesses
```

Systems should be data-driven wherever possible so missions, NPCs, weapons, vehicles, and factions can be added without rewriting the entire game.

---

# 30. Performance

The game should be designed for scalable performance.

The city can be large, but distant objects should use:

* Level of detail
* Object pooling
* Occlusion
* Streaming
* Efficient NPC simulation
* Efficient traffic simulation

Only nearby NPCs and gameplay systems need full simulation.

The game should prioritize a stable frame rate over unnecessarily rendering every object at maximum detail.

---

# 31. Art Direction

The visual style should be a **stylized but detailed 3D world**.

The city should have a distinctive South Asian-inspired identity without simply copying a real city.

Important visual elements include:

* Dense streets
* Local architecture
* Markets
* Temples
* Modern buildings
* Residential areas
* Neon entertainment districts
* Industrial areas
* Tropical vegetation
* Local signage
* Different vehicle types

The city should feel culturally coherent and recognizable as its own fictional location.

---

# 32. Long-Term Goal

The long-term goal is to create a complete open-source sandbox where players can experience a story while having freedom to create their own stories through the systems.

A player should be able to finish the main story and still have reasons to continue playing through:

* Racing
* Exploration
* Properties
* Businesses
* Factions
* Dynamic events
* Side missions
* Reputation
* Collectibles
* Vehicle activities

The ultimate goal is:

**A living 3D city where the player's choices create their own version of Maya.**

---

# 33. Development Priority

Do NOT attempt to build the entire game at once.

Build the project incrementally.

### Prototype 1

* Small city block
* Player movement
* Top-down camera
* Basic NPC
* Basic vehicle
* Basic interaction

### Prototype 2

* Combat
* Weapons
* Police
* Wanted system
* Vehicle theft

### Prototype 3

* Mission system
* Dialogue
* Money
* Reputation

### Prototype 4

* Factions
* Racing
* Businesses
* Properties
* Interiors

### Prototype 5

* Main story
* Large world
* Dynamic events
* Advanced NPC behavior
* Full audio/visual polish

### Final

Integrate all systems into one coherent open-world experience.

**The first playable version should be small but fully functional. Do not create a huge empty map before the core gameplay works.**
