import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as theme from '../../constants/Theme.ts';
import * as pantry from '../../lib/pantry.ts';
import * as candidates from '../../lib/receiptCandidates.ts';
import * as products from '../../lib/receiptProducts.ts';
import * as expiry from '../../lib/pantryExpiry.ts';
import * as imports from '../../lib/receiptImport.ts';
import * as packageDates from '../../lib/receiptPackageDates.ts';
import * as limits from '../../lib/receiptLimits.ts';
import * as api from '../../lib/pantryApi.ts';
const require=createRequire(import.meta.url), web=require('react-native-web');
const glyphs=require('@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/MaterialCommunityIcons.json');
export function receiptReviewHarness({page='products',lines=['Spinach Rs. 30.00','Watermelon Rs. 50.00','Biscuits Rs. 20.00'],readOnly=false,...options}={}) {
 let cursor=0,slots=[],controls=[],fields=[],labelProps=null;const calls=[],prepared=[],cache={},modules={};
 const react={...React,useState:initial=>{const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return[slots[i],value=>slots[i]=typeof value==='function'?value(slots[i]):value];},useRef:initial=>{const i=cursor++;return slots[i]??(slots[i]={current:initial});}};
 const rows=products.receiptProducts(['Spinach Rs. 30.00','Watermelon Rs. 50.00'],null,'2026-10-21');
 const input=imports.reviewedReceiptInput(rows);
 const state={ready:true,stage:'review',busy:false,input,pending:null,duplicates:[],choices:{},result:null,error:'',...options.state};
 const controller={choose:(id,value)=>{calls.push(['choose',id,value]);state.choices={...state.choices,[id]:value};},confirm:async(...args)=>calls.push(['confirm',...args]),cancel:()=>calls.push('cancel'),restore:async()=>calls.push('restore'),retry:async(...args)=>calls.push(['retry',...args]),review:async value=>calls.push(['review',value])};
 Object.assign(modules,{
  react,'react-native':{...web,Pressable:props=>{controls.push(props);return React.createElement(web.Pressable,props);},TextInput:props=>{fields.push(props);return React.createElement(web.TextInput,props);},Linking:{openURL:async()=>calls.push('guidance')}},
  '@expo/vector-icons':{MaterialCommunityIcons:({name,color,size})=>React.createElement('span',{'aria-hidden':true,style:{fontFamily:'MaterialCommunityIcons',color,fontSize:size}},String.fromCodePoint(glyphs[name]??glyphs.leaf))},
  'expo-router':{router:{dismissTo:value=>calls.push(['route',value])}},
  '@/constants/Theme':theme,'../constants/Theme':theme,'@/components/PrototypeScreen':{ui:{card:{},row:{flexDirection:'row',flexWrap:'wrap',gap:8},pill:{padding:10,minHeight:44,borderRadius:999},text:{fontFamily:'PlusJakartaSans_400Regular',fontSize:13,lineHeight:21,color:theme.Colors.onSurfaceVariant},label:{fontFamily:'PlusJakartaSans_600SemiBold',fontSize:12,color:theme.Colors.primary},heading:{fontFamily:'PlusJakartaSans_700Bold',fontSize:17,color:theme.Colors.onSurface}}},
  '@/lib/pantry':pantry,'@/lib/receiptCandidates':candidates,'@/lib/receiptProducts':products,'@/lib/pantryExpiry':expiry,'@/lib/receiptImport':imports,'@/lib/receiptPackageDates':packageDates,'@/lib/receiptLimits':limits,'@/lib/pantryApi':api,'@/lib/runtimeFeatures':{DIAGNOSTICS_ENABLED:false},
  './PackageExpiryCapture':{__esModule:true,default:props=>{labelProps=props;return React.createElement(web.Text,{},`Label capture: ${props.name}`);}},
 });
 const paths={'./ReceiptReviewPresentation':'../../features/scanner/ReceiptReviewPresentation.tsx','@/components/PrimaryButton':'../../components/PrimaryButton.tsx','@/components/FormInput':'../../components/FormInput.tsx'};
 function load(name,path){if(cache[name])return cache[name].exports;const module={exports:{}};cache[name]=module;const source=ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 vm.runInNewContext(source,{module,exports:module.exports,require:id=>modules[id]??(paths[id]?load(id,paths[id]):require(id))});return module.exports;}
 const Screen=load('route',page==='products'?'../../features/scanner/ReceiptProductReview.tsx':'../../features/scanner/ReceiptImportView.tsx').default;
 const result={calls,prepared,state,controller,input,render(){cursor=0;controls=[];fields=[];labelProps=null;const markup=renderToStaticMarkup(React.createElement(Screen,page==='products'?{lines,layout:null,readOnly,onPrepare:value=>{calls.push(['prepare',value]);prepared.push(value);}}:{controller,state,readOnly,onNewReceipt:()=>calls.push('new')}));Object.assign(result,{markup,controls,fields,labelProps,css:web.StyleSheet.getSheet().textContent});return result;}};return result.render();
}
