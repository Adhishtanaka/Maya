export const icons={
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
 moon:'<path d="M20 15.3A8.5 8.5 0 0 1 8.7 4a8.5 8.5 0 1 0 11.3 11.3Z"/>',
 rain:'<path d="M7 15H6a4 4 0 0 1-.4-8A6 6 0 0 1 17 6a4.5 4.5 0 0 1 1 9M8 18l-1 3m6-3-1 3m6-3-1 3"/>',
 cloud:'<path d="M6 18a5 5 0 0 1-.3-10A6 6 0 0 1 17 7a5.5 5.5 0 0 1 1 11Z"/>',
 snow:'<path d="M12 2v20M3.4 7l17.2 10M3.4 17 20.6 7M9 4l3 3 3-3M9 20l3-3 3 3M4 10l4-1-1-4m13 9-4 1 1 4M4 14l4 1-1 4m13-9-4-1 1-4"/>',
 sound:'<path d="m11 4-6 5H2v6h3l6 5V4Zm4 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
 settings:'<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="16" cy="17" r="3"/>',
 arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',
 map:'<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5Zm6-2v16m6-14v16"/>',
 pin:'<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',
 heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
 car:'<path d="m5 6-2 7v5h3v-2h12v2h3v-5l-2-7H5Zm-2 7h18M6 10h12M6 14h2m8 0h2"/>',
};
export const icon=(name)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]||icons.pin}</svg>`;
export function createUI(){
 document.querySelector('#ui').innerHTML=`
 <div id="wasted-screen" class="hidden" role="alert" aria-live="assertive"><div><h2>WASTED</h2><p>Recovering at Maya General Hospital</p></div></div>
 <main class="hud">
 <section class="district-panel"><div class="eyebrow">WESTERN PROVINCE · MAYA ISLAND</div><h1 id="district">Lotus Avenue</h1><p><span class="tiny-dot"></span><span id="district-sub">The city is yours. Take the long way home.</span></p></section>
 <section class="status-panel"><div class="weather-clock"><span id="weather-icon">${icon('sun')}</span><strong id="clock">17:20</strong><div><span id="phase">Evening</span><small id="weather">CLEAR SKIES</small></div></div><div class="wallet"><span>WALLET</span><strong id="money">Rs. 2,500</strong></div><div class="wanted" id="wanted" aria-label="Wanted level zero">☆ ☆ ☆ ☆ ☆</div></section>
 <div class="quick-actions"><button id="sound-button" title="Toggle audio" aria-label="Toggle audio">${icon('sound')}</button><button id="map-button" title="City map (M)" aria-label="City map">${icon('map')}</button><button id="phone-button" aria-label="Phone" title="Phone · J">☎</button><button id="camera-button" title="Change camera (V)" aria-label="Change camera">◈</button><button id="journal-button" title="Journal (Tab)" aria-label="Journal">☷</button><button id="equipment-button" title="Equipment (I)" aria-label="Equipment">▣</button><button id="settings-button" title="Settings (Esc)" aria-label="Settings">${icon('settings')}</button></div>
 <section class="map-panel"><div class="map-title"><span>${icon('pin')} MAYA CITY</span><button id="expand-map" title="Open city map">M ↗</button></div><canvas id="minimap" width="420" height="330" aria-label="Live city minimap"></canvas><div class="map-bottom"><span><i></i> <span id="map-location">LOTUS AVENUE</span></span><span>N ↑</span></div></section>
 <section class="vitals"><div class="health-icon">${icon('heart')}</div><div class="health-track"><i id="health-bar"></i></div><span id="health-label">100</span><div class="rep"><span>REP</span> <b id="rep">0</b></div></section>
 <section class="mission-panel"><div class="mission-top"><span class="eyebrow" id="mission-tag">A LITTLE LOCAL BUSINESS</span><span class="mission-number">01</span></div><h2 id="mission-title">A small favor</h2><p id="mission-copy">Amma has a delivery that needs a friendly face. Stop by her tea shop.</p><div class="mission-rule"></div><div class="mission-bottom"><span id="mission-distance">${icon('pin')} AMMA’S TEA STOP</span><button id="track-button">TRACK ${icon('arrow')}</button></div></section>
 <div class="interaction hidden" id="interaction"><kbd>E</kbd><span></span></div>
 <div class="speed hidden" id="speed"><strong>0</strong><span>KM/H</span><small id="car-name">CEYLON CLASSIC</small></div>
 <div id="toast" class="toast" role="status"></div>
 <section class="equipment"><span id="weapon-label">UNARMED</span><strong id="ammo-label">—</strong><span id="stance-label"></span><span class="stamina-track" aria-label="Stamina"><i id="stamina-bar"></i></span><small id="camera-label">ELEVATED VIEW</small></section>
 <div id="crosshair" class="hidden" aria-hidden="true">＋</div>
 <div id="flight-status" class="flight-status hidden"></div><div id="flight-controls" class="hidden"><button data-key=" ">ASCEND</button><button data-key="control">DESCEND</button><button data-key="l">MISSILE</button><button data-key="k">CHUTE</button></div><div id="dispatch" class="dispatch"></div>
 <span id="save-status" class="save-indicator">LOCAL SAVE READY</span>
 </main>
 <div id="welcome" class="overlay welcome"><section class="welcome-card"><div class="eyebrow"><i class="tiny-dot"></i> WELCOME TO THE ISLAND</div><div class="welcome-logo"><img src="/assets/maya-emblem.svg" alt="Maya elephant emblem" width="90" height="90">MAYA<span>AFTER THE MONSOON</span></div><h2>A city with a life<br>of its own.</h2><p>Warm streets. Late nights. New beginnings.<br>Find your own way through Maya City.</p><div id="profile-fields" class="profile-fields"><label>Your name<input id="player-name" maxlength="24" autocomplete="nickname" placeholder="Name"></label><label>Your age<input id="player-age" type="number" min="1" max="120" inputmode="numeric" placeholder="Age"></label><small>Saved on this device. Club entry requires age 18+.</small></div><p id="profile-error" role="alert"></p><button id="start-button" class="primary">ENTER THE CITY ${icon('arrow')}</button><div class="welcome-meta">AN OPEN-WORLD CITY <span>◆</span> HEADPHONES RECOMMENDED</div></section><div class="welcome-caption">06°55′ N &nbsp; 79°51′ E<br><span>Somewhere between the ocean and the hills.</span></div></div>
 <div id="modal" class="overlay hidden"><section class="modal-card"><div class="modal-top"><div class="eyebrow" id="modal-eyebrow">MAKE YOURSELF AT HOME</div><button id="close-modal" aria-label="Close dialog">✕</button></div><div id="modal-body"></div></section></div>
 <div id="touch-controls"><div class="touch-dpad"><button data-key="w">↑</button><button data-key="a">←</button><button data-key="s">↓</button><button data-key="d">→</button></div><div class="touch-actions"><button data-action="interact">E</button><button data-action="vehicle">F</button><button id="touch-jump" data-key=" ">JUMP</button><button data-action="fire">FIRE</button><button data-key="r">RELOAD</button><button data-action="weapon">EQUIP</button><button data-key="c">CROUCH</button><button data-key="alt">DODGE</button><button data-key="shift">RUN</button></div></div>`;
 return {el:id=>document.getElementById(id),icon};
}
