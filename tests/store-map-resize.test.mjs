import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

// Exercise the actual map module against the vendor's camera/event contract,
// without WebGL, network calls, or a billable Mapbox initialization.
const source=readFileSync(new URL('../assets/store-map.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
async function runtime(){
  const state={fits:[],zoom:15,center:[37.538,55.685],enlarged:false};
  const element=tag=>({
    tag,children:[],className:'',dataset:{},width:0,height:0,
    append(...nodes){for(const node of nodes)node.parent=this;this.children.push(...nodes);},setAttribute(){},
    querySelector(){return element('button');},
    getBoundingClientRect(){
      let left=100,top=100;
      if(this.tag==='img'){
        const parent=this.parent,shop=parent.className==='store-map-marker';
        left+=state.raised ? (shop?(parent.offsetWidth-this.offsetWidth)/2:parent.offsetWidth-this.offsetWidth) : 0;
        top+=state.raised&&shop ? parent.offsetHeight-this.offsetHeight : (parent.offsetHeight-this.offsetHeight)/2;
      }
      return {left,top,width:this.offsetWidth,height:this.offsetHeight};
    },
    get offsetWidth(){
      if(this.className==='store-map-marker')return state.enlarged?190:182;
      if(this.className==='store-map-metro')return state.enlarged?200:110;
      return this.width===20&&state.enlarged?40:this.width;
    },
    get offsetHeight(){
      if(this.className==='store-map-marker')return state.enlarged?188:53;
      if(this.className==='store-map-metro')return state.enlarged?61:28;
      return this.width===20&&state.enlarged?32:this.height;
    },
  });
  const root=element('html');root.classList={toggle:(name,value)=>{state.raised=value;}};
  const container=element('main'),status=element('p');
  const document={documentElement:root,readyState:'complete',createElement:element,addEventListener(){},querySelector:selector=>selector==='#store-map'?container:status};
  class Map{
    constructor(){state.map=this;this.handlers={};this.touchZoomRotate={disableRotation(){}};}
    on(name,fn){(this.handlers[name]??=[]).push(fn);return this;}
    emit(name,event={}){for(const fn of this.handlers[name]??[])fn(event);}
    addControl(){}getCanvas(){return {};}
    fitBounds(bounds,options){state.fits.push(options);state.zoom=options.maxZoom;state.center=[37.538,55.685];}
    resize(){this.emit('movestart');}setStyle(){}remove(){}
  }
  class Marker{
    constructor({element}){this.element=element;}
    setLngLat(){return this;}addTo(){return this;}
    setOffset(offset){this.offset=offset;return this;}
  }
  const window={document,addEventListener(){},mapboxgl:{supported:()=>true,Map,Marker,NavigationControl:class{},AttributionControl:class{}}};window.parent=window;
  vm.runInNewContext(source,{
    document,window,ResizeObserver:class{constructor(fn){state.resize=fn;}observe(){}disconnect(){}},
    getComputedStyle:()=>({getPropertyValue:()=> '#ffffff'}),
    fetch:async()=>({ok:true,json:async()=>({})}),styleStoreMap:style=>style,
    mapAccessToken:'',mapStyles:{light:'mapbox://styles/mapbox/light-v11',dark:'mapbox://styles/mapbox/dark-v11'},
    storeLocation:[37.536554,55.685849],nearestMetroLocation:[37.5393527,55.6843472],universityMetroLocation:[37.5351394,55.6917002],
    setTimeout:()=>0,clearTimeout(){},
  });
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(typeof state.resize,'function');
  return state;
}

test('a responsive initial view still fits the shop and metro before camera interaction',async()=>{
  const state=await runtime(),before=state.fits.length;
  state.map.emit('movestart',{originalEvent:{type:'resize'}});state.resize();
  assert.equal(state.fits.length,before+1);
  assert.deepEqual({...state.fits.at(-1).padding},{top:44,right:140,bottom:60,left:28});
});

test('resizing preserves zoom-only, pointer and keyboard camera choices',async()=>{
  for(const type of ['click','mousedown','keydown','touchstart']){
    const state=await runtime(),before=state.fits.length;
    state.map.emit('movestart',{originalEvent:{type}});
    state.zoom=16;state.center=[37.54,55.686];state.resize();
    assert.equal(state.fits.length,before,`${type} must not trigger a new initial fit`);
    assert.equal(state.zoom,16);assert.deepEqual(state.center,[37.54,55.686]);
  }
});

test('initial fitting reserves the measured enlarged metro label and raised shop title',async()=>{
  const state=await runtime();state.enlarged=true;state.resize();
  const {padding}=state.fits.at(-1);
  assert.equal(state.raised,true);
  assert.ok(padding.right>=40/2+12);
  assert.ok(padding.top>=188-32/2+12);
  assert.ok(padding.left>=190/2+12);
});
