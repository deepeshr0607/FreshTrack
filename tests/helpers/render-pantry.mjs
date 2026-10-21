import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as theme from '../../constants/Theme.ts';
import * as pantryApi from '../../lib/pantryApi.ts';
import * as pantry from '../../lib/pantry.ts';
import { dashboardFixture } from './render-dashboard.mjs';
const require=createRequire(import.meta.url), web=require('react-native-web');
const glyphs=require('@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/MaterialCommunityIcons.json');
/** Actual Pantry route/cards with injected context and gesture/native hosts. No account/network writes. */
export function pantryHarness(overrides={}) {
  let cursor=0, slots=[], effects=[], dirty=false, controls=[], inputs=[], swipes=[], confirmations=[], refreshes=[];
  const calls=[], routes=[], modules={}, cache={}, pending=[];
  const same=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]));
  const mockReact={...React,
    useState: initial=>{const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return[slots[i],value=>{const next=typeof value==='function'?value(slots[i]):value;if(!Object.is(next,slots[i]))dirty=true;slots[i]=next;}];},
    useMemo:(fn,deps)=>{const i=cursor++;if(!slots[i]||!same(slots[i].deps,deps))slots[i]={deps,value:fn()};return slots[i].value;},
    useEffect:(fn,deps)=>{const i=cursor++;if(!slots[i]||!same(slots[i],deps)){slots[i]=deps;effects.push(fn);}},
  };
  const rows=dashboardFixture().state.items;
  const overdue={status:'ready',items:[],message:'',householdDay:'2026-10-21',householdTimeZone:'Asia/Kolkata'};
  const real={enabled:true,items:rows,loading:false,error:'',total:3,hasMore:false,readOnly:false,cachedAt:null,cachePreview:false,diskStatus:'Offline copy saved',filters:{sort:'expiry'},inventory:{active:27,categories:{PRODUCE:20,DAIRY:7}},lastOutcome:[],pendingNotificationIds:[],notificationOutbox:null,
    overdueReview:{subscribe:()=>()=>{},getSnapshot:()=>overdue,request:async()=>calls.push('overdue')},
    reload:async()=>calls.push('reload'),loadMore:async()=>calls.push('more'),setFilters:filters=>{real.filters=filters;dirty=true;},
    outcome:async(...args)=>calls.push(['outcome',...args]),batchOutcome:async(...args)=>calls.push(['batchOutcome',...args]),batchUndo:async(...args)=>calls.push(['batchUndo',...args]),dismissUndo:()=>calls.push('dismissUndo'),endCachePreview:()=>calls.push('endCachePreview'),...overrides};
  Object.assign(modules,{
    react:mockReact,
    'react-native':{...web,Image:({source,style})=>React.createElement(web.View,{style},React.createElement('img',{src:source.uri,alt:'',style:{width:'100%',height:'100%',objectFit:'cover'}})),
      Pressable:props=>{controls.push(props);return React.createElement(web.Pressable,props);},TextInput:props=>{inputs.push(props);return React.createElement(web.TextInput,props);},
      RefreshControl:props=>{refreshes.push(props);return React.createElement(React.Fragment,{},props.children);}},
    'react-native-gesture-handler':{Pressable:props=>{controls.push(props);return React.createElement(web.Pressable,props);}},
    'react-native-gesture-handler/ReanimatedSwipeable':{__esModule:true,default:React.forwardRef((props,_ref)=>{swipes.push(props);return React.createElement(web.View,{},props.children);})},
    'react-native-safe-area-context':{SafeAreaView:props=>React.createElement(web.View,props)},
    '@expo/vector-icons':{MaterialCommunityIcons:({name,color,size})=>React.createElement('span',{'aria-hidden':true,style:{fontFamily:'MaterialCommunityIcons',color,fontSize:size}},String.fromCodePoint(glyphs[name]??glyphs.leaf))},
    'expo-router':{router:{push:v=>routes.push(v)},useLocalSearchParams:()=>({})},
    '@/constants/Theme':theme,'../constants/Theme':theme,'@/lib/runtimeFeatures':{DIAGNOSTICS_ENABLED:false},
    '@/lib/designAssets':{brandImage:{uri:'/brand.png'}},'@/lib/pantryApi':pantryApi,'@/lib/pantry':pantry,
    '@/context/MockPantryContext':{useMockPantry:()=>({items:[],dispatch:()=>{throw Error('real session touched demo');}})},
    '@/context/RealPantryContext':{useRealPantry:()=>real},
    '@/features/auth/useAuthRequest':{__esModule:true,default:setError=>({loading:false,run:fn=>{const task=Promise.resolve().then(()=>fn(()=>true)).catch(()=>setError('Request failed'));pending.push(task);return task;}})},
    '@/components/PantryConfirmation':{__esModule:true,default:props=>{confirmations.push(props);return null;}},
    '@/components/NotificationQueuePanel':{__esModule:true,default:()=>null},'@/components/OverdueReviewCheck':{__esModule:true,default:()=>null},
    './PrototypeScreen':{ui:{}},
  });
  const paths={'../lib/expiry':'../../lib/expiry.ts','@/features/pantry/PantryOverview':'../../features/pantry/PantryOverview.tsx','@/components/PantryItemCard':'../../components/PantryItemCard.tsx','@/components/PrimaryButton':'../../components/PrimaryButton.tsx','./PrimaryButton':'../../components/PrimaryButton.tsx','@/components/ReconciliationBanner':'../../components/ReconciliationBanner.tsx','./ExpiryBadge':'../../components/ExpiryBadge.tsx','./FreshnessBar':'../../components/FreshnessBar.tsx'};
  function load(name,path){if(cache[name])return cache[name].exports;const module={exports:{}};cache[name]=module;
    const source=ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
    vm.runInNewContext(source,{module,exports:module.exports,setTimeout:fn=>{fn();return 1;},clearTimeout(){},require:id=>modules[id]??(paths[id]?load(id,paths[id]):require(id))});return module.exports;}
  const Screen=load('route','../../app/(tabs)/pantry.tsx').default;
  const result={real,calls,routes,overdue,async flush(){await Promise.all(pending);},render(){let markup;for(let count=0;count<4;count++){
    cursor=0;controls=[];inputs=[];swipes=[];confirmations=[];refreshes=[];effects=[];dirty=false;
    markup=renderToStaticMarkup(React.createElement(Screen));for(const fn of effects)fn();if(!dirty)break;
  }Object.assign(result,{markup,controls,inputs,swipes,confirmations,refreshes,css:web.StyleSheet.getSheet().textContent});return result;}};
  return result.render();
}
