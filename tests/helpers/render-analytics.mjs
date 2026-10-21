import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as theme from '../../constants/Theme.ts';
import * as presentation from '../../lib/analyticsPresentation.ts';
import { analyticsFixture } from '../analytics-mobile-fixtures.mjs';
const require=createRequire(import.meta.url),web=require('react-native-web');
const glyphs=require('@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/MaterialCommunityIcons.json');
/** Actual live analytics TSX. Session/native/provider hosts are injected; no API calls. */
export function analyticsHarness({financial=false,...options}={}) {
 let cursor=0,slots=[],effects=[],dirty=false,controls=[],inputs=[];const calls=[],routes=[],cache={},modules={};
 const same=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]));
 const react={...React,useState:initial=>{const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return[slots[i],value=>{const next=typeof value==='function'?value(slots[i]):value;if(!Object.is(next,slots[i]))dirty=true;slots[i]=next;}];},useEffect:(fn,deps)=>{const i=cursor++;if(!slots[i]||!same(slots[i],deps)){slots[i]=deps;effects.push(fn);}}};
 const state={data:analyticsFixture(),month:undefined,status:'ready',error:'',...options.state};
 const store={load:async month=>calls.push(['load',month]),current:()=>calls.push('current')};
 Object.assign(modules,{
  react,'react-native':{...web,Platform:{OS:'ios'},Image:({source,style})=>React.createElement(web.View,{style},React.createElement('img',{src:source.uri.startsWith('https:')?'/meal.png':source.uri,alt:'',style:{width:'100%',height:'100%',objectFit:'cover'}})),Pressable:props=>{controls.push(props);return React.createElement(web.Pressable,props);},TextInput:props=>{inputs.push(props);return React.createElement(web.TextInput,props);},Linking:{openURL:async value=>calls.push(['external',value])}},
  'react-native-safe-area-context':{SafeAreaView:props=>React.createElement(web.View,props)},
  '@expo/vector-icons':{MaterialCommunityIcons:({name,color,size})=>React.createElement('span',{'aria-hidden':true,style:{fontFamily:'MaterialCommunityIcons',color,fontSize:size}},String.fromCodePoint(glyphs[name]??glyphs.leaf))},
  'expo-router':{router:{push:value=>routes.push(value),dismissTo:value=>routes.push(value),back:()=>routes.push('back'),canGoBack:()=>true},useLocalSearchParams:()=>({id:'123'}),useFocusEffect(){}},
  '@/constants/Theme':theme,'../constants/Theme':theme,'@/lib/designAssets':{brandImage:{uri:'/brand.png'}},'@/context/AuthContext':{useAuth:()=>({state:{checking:false}})},'@/context/RealAnalyticsContext':{useRealAnalytics:()=>({state,store})},'@/context/RealPantryContext':{useRealPantry:()=>({})},'@/lib/analyticsPresentation':presentation, '@/components/ReconciliationBanner':{__esModule:true,default:()=>null}, '@/components/ReportSheet':{__esModule:true,default:({report,onClose})=>report?React.createElement('section',null,report,React.createElement(web.Pressable,{onPress:onClose},React.createElement(web.Text,null,'Close Report'))):null},
 });
 const paths={'./AnalyticsPresentation':'../../features/analytics/AnalyticsPresentation.tsx','./AnalyticsParts':'../../features/analytics/AnalyticsParts.tsx','./CategoryBreakdown':'../../features/analytics/CategoryBreakdown.tsx','./UsedBeforeExpiry':'../../features/analytics/UsedBeforeExpiry.tsx','@/components/PrototypeScreen':'../../components/PrototypeScreen.tsx','@/components/PrimaryButton':'../../components/PrimaryButton.tsx'};
 function load(name,path){if(cache[name])return cache[name].exports;const module={exports:{}};cache[name]=module;const code=ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 vm.runInNewContext(code,{module,exports:module.exports,require:id=>modules[id]??(paths[id]?load(id,paths[id]):require(id))});return module.exports;}
 const Screen=load('route','../../features/analytics/LiveAnalyticsScreen.tsx').default;
 const result={state,store,calls,routes,render(){let markup;for(let i=0;i<4;i++){cursor=0;controls=[];inputs=[];effects=[];dirty=false;markup=renderToStaticMarkup(React.createElement(Screen,{financial}));for(const fn of effects)fn();if(!dirty)break;}Object.assign(result,{markup,controls,inputs,css:web.StyleSheet.getSheet().textContent});return result;}};return result.render();
}
