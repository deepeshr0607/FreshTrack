import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as theme from '../../constants/Theme.ts';
import * as permission from '../../lib/scannerPermission.ts';
const require=createRequire(import.meta.url),web=require('react-native-web');
const glyphs=require('@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/MaterialCommunityIcons.json');
/** Actual scanner routes/presentation with injected native/provider/import hosts; never calls a camera/network. */
export function scannerHarness({page='landing',demo=false,diagnostics=false,supported=true,...options}={}) {
 let cursor=0,state=[],controls=[],pending=[],importProps=null;const calls=[],routes=[],cache={},modules={};
 const mockReact={...React,useState:initial=>{const i=cursor++;if(!(i in state))state[i]=typeof initial==='function'?initial():initial;return[state[i],value=>{state[i]=typeof value==='function'?value(state[i]):value;}];}};
 const ocr={image:null,read:false,busy:false,lines:[],error:'',errorCode:null,layout:null,...options.ocr};
 const imported={ready:true,stage:'idle',busy:false,input:null,pending:null,duplicates:null,choices:{},result:null,error:'',...options.imported};
 const store={getSnapshot:()=>ocr,subscribe:()=>()=>{},choose:async(...args)=>{calls.push(['choose',...args]);},read:async()=>calls.push('read'),clear:()=>{calls.push('clear');Object.assign(ocr,{image:null,read:false,lines:[],error:'',errorCode:null});}};
 const importer={getSnapshot:()=>imported,subscribe:()=>()=>{},restore:async()=>{},leave(){},reset(){calls.push('reset');},review:async v=>calls.push(['review',v])};
 const native={...web,Platform:{OS:'ios'},Image:({source,style})=>React.createElement(web.View,{style},React.createElement('img',{src:source.uri,alt:'',style:{width:'100%',height:'100%',objectFit:'contain'}})),Pressable:props=>{controls.push(props);return React.createElement(web.Pressable,props);},Linking:{openSettings:async()=>calls.push('settings')}};
 const placeholder=()=>null;
 Object.assign(modules,{
  react:mockReact,'react-native':native,'react-native-safe-area-context':{SafeAreaView:props=>React.createElement(web.View,props)},
  '@expo/vector-icons':{MaterialCommunityIcons:({name,color,size})=>React.createElement('span',{'aria-hidden':true,style:{fontFamily:'MaterialCommunityIcons',color,fontSize:size}},String.fromCodePoint(glyphs[name]??glyphs.leaf))},
  'expo-router':{router:{push:v=>routes.push(v),back:()=>routes.push('back'),dismissTo:v=>routes.push(v)},useLocalSearchParams:()=>({}),useFocusEffect(){}},
  '@/constants/Theme':theme,'../constants/Theme':theme,'@/lib/designAssets':{brandImage:{uri:'/brand.png'},avatarImage:{uri:'/brand.png'}},
  '@/lib/runtimeFeatures':{DIAGNOSTICS_ENABLED:diagnostics},'@/lib/scannerPermission':permission,
  '@/context/AuthContext':{useAuth:()=>({state:{user:demo?null:{id:'test-subject'},demo,checking:false},session:{getSnapshot:()=>({status:'authenticated',user:{id:'test-subject'},demo:false,checking:false})}})},
  '@/context/RealPantryContext':{useRealPantry:()=>({readOnly:options.readOnly??false})},
  '@/features/scanner/CameraPermissionGate':{__esModule:true,default:({children})=>React.createElement(web.View,{},children)},
  '@/features/scanner/ReceiptReview':{__esModule:true,default:()=>React.createElement(web.Text,{},'Demo receipt review')},
  '@/features/scanner/BarcodeReview':{__esModule:true,default:()=>React.createElement(web.Text,{},'Demo barcode review')},
  '@/features/scanner/LocalReceiptReview':{__esModule:true,default:placeholder},
  '@/features/scanner/ReceiptProductReview':{__esModule:true,default:props=>React.createElement(web.Text,{},`Product review: ${props.lines.length} lines`)},
  '@/features/scanner/ReceiptImportView':{__esModule:true,default:props=>{importProps=props;return null;}},
  '@/lib/receiptImport':{createReceiptImportController:()=>importer},'@/features/scanner/nativeReceiptImport':{nativeReceiptImportStorage:()=>({})},
  '@/lib/receiptOcrProbe':{createReceiptOcrProbe:()=>store},'@/lib/receiptImageCache':{bindConfirmedReceiptImageCleanup:()=>()=>{}},
  '@/features/scanner/ocrProbeDevice':{chooseOcrImage(){},disposeOcrImage(){},ocrProbeSupported:()=>supported,recognizeOcrImage(){}},
 });
 const paths={'@/features/scanner/ScannerPresentation':'../../features/scanner/ScannerPresentation.tsx','./ScannerPresentation':'../../features/scanner/ScannerPresentation.tsx','@/components/PrimaryButton':'../../components/PrimaryButton.tsx','@/components/PrototypeScreen':'../../components/PrototypeScreen.tsx','@/components/ScreenHeader':'../../components/ScreenHeader.tsx'};
 function load(name,path){if(cache[name])return cache[name].exports;const module={exports:{}};cache[name]=module;
  const source=ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
  vm.runInNewContext(source,{module,exports:module.exports,require:id=>modules[id]??(paths[id]?load(id,paths[id]):require(id))});return module.exports;}
 const Screen=load('route',page==='landing'?'../../app/(tabs)/scanner.tsx':'../../features/scanner/ReceiptScannerScreen.tsx').default;
 const result={calls,routes,ocr,imported,async flush(){await Promise.all(pending);pending=[];},render(){cursor=0;controls=[];const markup=renderToStaticMarkup(React.createElement(Screen,{diagnostics}));Object.assign(result,{markup,controls,importProps,css:web.StyleSheet.getSheet().textContent});return result;}};return result.render();
}
