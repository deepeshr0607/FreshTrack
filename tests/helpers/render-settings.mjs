import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as theme from '../../constants/Theme.ts';
import * as authRules from '../../lib/authSession.ts';
import * as authValidation from '../../lib/auth.ts';
const require=createRequire(import.meta.url),web=require('react-native-web');
const glyphs=require('@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/MaterialCommunityIcons.json');
/** Actual Settings/profile/privacy/reminder TSX. Session/native/provider hosts are injected; no API calls. */
export function settingsHarness({page='index',...options}={}) {
 let cursor=0,slots=[],effects=[],dirty=false,controls=[],inputs=[];const calls=[],routes=[],cache={},modules={};
 const same=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]));
 const react={...React,useMemo:fn=>fn(),useSyncExternalStore:(_subscribe,get)=>get(),useState:initial=>{const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return[slots[i],value=>{const next=typeof value==='function'?value(slots[i]):value;if(!Object.is(next,slots[i]))dirty=true;slots[i]=next;}];},useEffect:(fn,deps)=>{const i=cursor++;if(!slots[i]||!same(slots[i],deps)){slots[i]=deps;effects.push(fn);}}};
 const state={user:{id:'account-test',name:'Sample User',email:'sample@example.test'},checking:false,demo:false,...options.auth};
 const session={getSnapshot:()=>state,subscribe:()=>()=>{},signOut:async()=>calls.push('signOut'),exitDemo:()=>calls.push('exitDemo')};
 const preferences={hour:'17:00',digest:false,profile:{name:'Demo Person',email:'demo@example.test'},rememberDevice:false,setHour:value=>calls.push(['demoHour',value]),setDigest:value=>calls.push(['demoDigest',value]),setProfile:value=>calls.push(['profile',value]),setRememberDevice:value=>calls.push(['remember',value])};
 const reminder={hour:'18:30',enabled:false,ready:true,busy:false,message:'',permission:{allowed:true,label:'Allowed',canAskAgain:true},...options.reminder};
 const schedule={busy:false,scope:'account-test',count:3,nextAt:null,message:'',...options.schedule};
 const model={getSnapshot:()=>reminder,subscribe:()=>()=>{},refresh:async()=>calls.push('permission'),enable:async()=>calls.push('enable'),disable:async()=>calls.push('disable'),saveHour:async value=>calls.push(['saveHour',value])};
 const scheduler={getSnapshot:()=>schedule,subscribe:()=>()=>{},inspect:async value=>calls.push(['inspect',value])};
 const pantry={enabled:true,readOnly:false,syncReminders:async()=>calls.push('sync'),...options.pantry};
 Object.assign(modules,{
  react,'react-native':{...web,Platform:{OS:options.platform??'ios'},Image:({source,style})=>React.createElement(web.View,{style},React.createElement('img',{src:source.uri.startsWith('https:')?'/meal.png':source.uri,alt:'',style:{width:'100%',height:'100%',objectFit:'cover'}})),Pressable:props=>{controls.push(props);return React.createElement(web.Pressable,props);},TextInput:props=>{inputs.push(props);return React.createElement(web.TextInput,props);},Linking:{openSettings:async()=>calls.push('deviceSettings')},AppState:{addEventListener:()=>({remove(){}})}},
  'react-native-safe-area-context':{SafeAreaView:props=>React.createElement(web.View,props)},
  '@expo/vector-icons':{MaterialCommunityIcons:({name,color,size})=>React.createElement('span',{'aria-hidden':true,style:{fontFamily:'MaterialCommunityIcons',color,fontSize:size}},String.fromCodePoint(glyphs[name]??glyphs.leaf))},
  'expo-router':{router:{push:value=>routes.push(value),dismissTo:value=>routes.push(value),back:()=>routes.push('back'),replace:value=>routes.push(value),canGoBack:()=>options.canGoBack??true},useLocalSearchParams:()=>({id:'123'}),useFocusEffect(){}},
  '@/constants/Theme':theme,'../constants/Theme':theme,'@/lib/designAssets':{brandImage:{uri:'/brand.png'}},
  '@/context/AuthContext':{useAuth:()=>({state,session})},'@/context/RealPantryContext':{useRealPantry:()=>pantry},'@/context/MockPreferencesContext':{useMockPreferences:()=>preferences},'@/lib/runtimeFeatures':{DIAGNOSTICS_ENABLED:false},'@/lib/mock':{MOCK_CURRENCY:{code:'USD',symbol:'$'}},'@/lib/authSession':authRules,'@/lib/auth':authValidation,
  '@/features/auth/nativeProbe':{nativeAuthProbe:null},'@/lib/backendIdentity':{},'@/features/auth/useAuthRequest':{__esModule:true,default:()=>({loading:false,run:async fn=>fn(()=>true)})},
  '@/features/notifications/nativePreferences':{nativeReminderPreferences:()=>model},'@/features/notifications/nativeScheduler':{nativeExpiryScheduler:scheduler,notificationScope:value=>value},'@/features/scanner/nativeReceiptImages':{nativeReceiptImages:()=>({status:()=>({files:0,inUse:0,failed:false}),recover:()=>{calls.push('clearPhotos');return{files:0,inUse:0,failed:false};}})},

 });
 const paths={'@/features/settings/SettingsPresentation':'../../features/settings/SettingsPresentation.tsx','@/components/PrototypeScreen':'../../components/PrototypeScreen.tsx','./PrototypeScreen':'../../components/PrototypeScreen.tsx','@/components/PrimaryButton':'../../components/PrimaryButton.tsx','./PrimaryButton':'../../components/PrimaryButton.tsx','@/components/FormInput':'../../components/FormInput.tsx','./FormInput':'../../components/FormInput.tsx','@/components/ReminderPreferencesCard':'../../components/ReminderPreferencesCard.tsx','@/components/ReceiptPhotoPrivacyCard':'../../components/ReceiptPhotoPrivacyCard.tsx'};
 function load(name,path){if(cache[name])return cache[name].exports;const module={exports:{}};cache[name]=module;const code=ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 vm.runInNewContext(code,{process:{env:{}},module,exports:module.exports,require:id=>modules[id]??(paths[id]?load(id,paths[id]):require(id))});return module.exports;}
 const Screen=load('route',`../../app/settings/${page}.tsx`).default;
 const result={state,reminder,schedule,calls,routes,render(){let markup;for(let i=0;i<4;i++){cursor=0;controls=[];inputs=[];effects=[];dirty=false;markup=renderToStaticMarkup(React.createElement(Screen));for(const fn of effects)fn();if(!dirty)break;}Object.assign(result,{markup,controls,inputs,css:web.StyleSheet.getSheet().textContent});return result;}};return result.render();
}
