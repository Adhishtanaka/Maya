import {STATIONS} from './vehicle-radio.js';
// All audio is synthesized locally. No downloaded recordings or autoplay permissions required.
export class CityAudio {
  constructor(){this.ctx=null;this.muted=false;this.volume=.45;this.stepTimer=0;this.birdTimer=0;this.clubTrack=0;this.beatTimer=0;this.beat=0;this.radioBeat=0;this.radioTimer=0;this.ringTimer=0;}
  async start(){
    if(this.ctx){await this.ctx.resume();return;}
    const AudioContext=window.AudioContext||window.webkitAudioContext;if(!AudioContext)return;
    this.ctx=new AudioContext();const c=this.ctx;
    this.master=c.createGain();this.master.gain.value=this.volume;this.master.connect(c.destination);
    this.engine=c.createOscillator();this.engine.type='sawtooth';this.engine.frequency.value=45;
    const low=c.createBiquadFilter();low.type='lowpass';low.frequency.value=240;this.engineGain=c.createGain();this.engineGain.gain.value=0;
    this.engine.connect(low).connect(this.engineGain).connect(this.master);this.engine.start();
    const buffer=c.createBuffer(1,c.sampleRate*3,c.sampleRate);const data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
    this.noise=buffer;
    const ambient=c.createBufferSource();ambient.buffer=buffer;ambient.loop=true;
    const wind=c.createBiquadFilter();wind.type='lowpass';wind.frequency.value=420;this.windGain=c.createGain();this.windGain.gain.value=.035;ambient.connect(wind).connect(this.windGain).connect(this.master);ambient.start();
    const rain=c.createBufferSource();rain.buffer=buffer;rain.loop=true;const filter=c.createBiquadFilter();filter.type='lowpass';filter.frequency.value=4500;this.rainGain=c.createGain();this.rainGain.gain.value=0;rain.connect(filter).connect(this.rainGain).connect(this.master);rain.start();
    this.siren=c.createOscillator();this.siren.type='sine';this.sirenGain=c.createGain();this.sirenGain.gain.value=0;this.siren.connect(this.sirenGain).connect(this.master);this.siren.start();
    this.rotor=c.createOscillator();this.rotor.type='triangle';this.rotor.frequency.value=38;this.rotorGain=c.createGain();this.rotorGain.gain.value=0;this.rotor.connect(this.rotorGain).connect(this.master);this.rotor.start();
    this.chirp(520,.15,.08);this.chirp(780,.25,.06,.12);
  }
  setVolume(n){this.volume=n;if(this.ctx)this.master.gain.setTargetAtTime(this.muted?0:n,this.ctx.currentTime,.08);}
  toggle(){this.muted=!this.muted;this.setVolume(this.volume);return this.muted;}
  chirp(freq,duration=.12,volume=.1,delay=0,type='sine'){
    if(!this.ctx)return;const c=this.ctx,t=c.currentTime+delay,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(Math.max(30,freq*.65),t+duration);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(volume,t+.008);g.gain.exponentialRampToValueAtTime(.001,t+duration);o.connect(g).connect(this.master);o.start(t);o.stop(t+duration+.03);
  }
  noiseHit(duration=.12,volume=.15,frequency=700){if(!this.ctx)return;const c=this.ctx,s=c.createBufferSource(),g=c.createGain(),f=c.createBiquadFilter();s.buffer=this.noise;f.type='lowpass';f.frequency.value=frequency;g.gain.setValueAtTime(volume,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+duration);s.connect(f).connect(g).connect(this.master);s.start();s.stop(c.currentTime+duration);}
  play(name){
    if(name==='success'){[440,554,659,880].forEach((f,i)=>this.chirp(f,.3,.12,i*.09));}
    else if(name==='horn'){this.chirp(220,.45,.2,0,'triangle');this.chirp(277,.45,.12,0,'triangle');}
    else if(name==='crash'||name==='punch'){this.noiseHit(.22,.35,900);this.chirp(90,.18,.2);}
    else if(name==='explosion'){this.noiseHit(1.2,.65,550);this.chirp(65,.8,.4,0,'sawtooth');}
    else if(name==='gunshot'){this.noiseHit(.18,.5,2200);this.chirp(135,.12,.2,0,'sawtooth');}
    else if(name==='reload'){this.noiseHit(.08,.12,1800);this.chirp(440,.06,.07,.3);this.noiseHit(.05,.07,700);}
    else if(name==='door'){this.noiseHit(.13,.15,500);}
    else this.chirp(640,.09,.075);
  }
  update(dt,s){
    if(!this.ctx)return;const c=this.ctx,t=c.currentTime;
    if(s.phoneRinging){this.ringTimer-=dt;if(this.ringTimer<=0){this.ringTimer=.9;this.chirp(660,.13,.07);this.chirp(880,.13,.07,.17);}}else this.ringTimer=0;
    if(s.radioSignal&&!s.paused){const station=STATIONS.find(r=>r.id===s.radioSignal.station)||STATIONS[1];this.radioTimer-=dt;if(this.radioTimer<=0){this.radioTimer=station.tempo;const volume=s.radioSignal.gain;this.radioBeat++;this.chirp(station.notes[this.radioBeat%8],station.tempo*.8,.055*volume,0,'triangle');if(this.radioBeat%2===0)this.chirp(70,.15,.085*volume);if(this.radioBeat%4===2)this.noiseHit(.08,.045*volume,2300);}}else this.radioTimer=0;
    if(s.club&&!s.paused){this.beatTimer-=dt;if(this.beatTimer<=0){this.beatTimer=[.48,.4,.56][this.clubTrack];this.beat++;this.chirp(this.beat%4?90:60,.13,.12,0,'sine');this.chirp([220,261,329,293][(this.beat+this.clubTrack)%4],.22,.055,0,'triangle');if(this.beat%2)this.noiseHit(.055,.055,2300);}}
    this.engine.frequency.setTargetAtTime(35+Math.abs(s.speed)*3,t,.12);this.engineGain.gain.setTargetAtTime(((s.driving&&s.driving.model!=='bicycle')||s.flightMode==='plane')&&!s.paused?.08+Math.abs(s.speed)*.002:0,t,.2);
    this.rainGain.gain.setTargetAtTime(['rain','tornado'].includes(s.weather)?(s.indoor?.035:.16):0,t,1);this.windGain.gain.setTargetAtTime(s.paused?.01:s.weather==='tornado'?(s.indoor?.045:.2):s.flightMode==='jetpack'?.12:s.weather==='snow'?.07:.03,t,1);
    this.siren.frequency.setValueAtTime(640+Math.sin(t*4)*210,t);this.sirenGain.gain.setTargetAtTime((s.heat>0||s.ambulance)&&!s.paused?.05:0,t,.3);
    this.rotorGain.gain.setTargetAtTime(s.helicopter&&!s.paused?.075*(.65+Math.sin(t*19)*.35):0,t,.025);
    this.stepTimer-=dt;this.birdTimer-=dt;
    if(s.walking&&!s.driving&&!s.paused&&this.stepTimer<=0){this.noiseHit(.065,.095,500);this.stepTimer=s.sprinting?.22:.36;}
    if(!s.paused&&this.birdTimer<=0){this.birdTimer=3+Math.random()*7;if(s.hour>5&&s.hour<18&&s.weather==='clear'){this.chirp(2200,.12,.035);this.chirp(2800,.1,.025,.17);}else if(s.hour>=19||s.hour<5){this.chirp(4200,.06,.018);this.chirp(4300,.06,.015,.13);}}
  }
}
