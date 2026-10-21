import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as theme from '../../constants/Theme.ts';
import * as recipes from '../../lib/chefRecipes.ts';
import * as api from '../../lib/chefApi.ts';
import { ingredientWindow, summary, detail } from '../chef-fixtures.mjs';
const require=createRequire(import.meta.url),web=require('react-native-web');
const glyphs=require('@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/MaterialCommunityIcons.json');
/** Actual live recipe/card/detail/shopping TSX. Session/native/provider hosts are injected; no API calls. */
export function chefHarness({page='recipes',...options}={}) {
 let cursor=0,slots=[],effects=[],dirty=false,controls=[],inputs=[];const calls=[],routes=[],cache={},modules={};
 const same=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]));
 const react={...React,useState:initial=>{const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return[slots[i],value=>{const next=typeof value==='function'?value(slots[i]):value;if(!Object.is(next,slots[i]))dirty=true;slots[i]=next;}];},useEffect:(fn,deps)=>{const i=cursor++;if(!slots[i]||!same(slots[i],deps)){slots[i]=deps;effects.push(fn);}}};
 const first=structuredClone({...summary,metadata:{readyInMinutes:15,vegetarian:true,vegan:false},match:{...summary.match,pantryNameMatchPercent:85}});
 const second=structuredClone({...summary,id:124,title:'Vegetable Rice',metadata:{readyInMinutes:40,vegetarian:true,vegan:true}});
 const recipe=structuredClone({...detail,match:{...detail.match,shoppingItems:[...detail.match.shoppingItems,{name:'salt',checkFirst:true,reason:'CHECK_STAPLE'}]}});
 const state={ingredients:structuredClone(ingredientWindow),ingredientsStatus:'ready',ingredientsError:'',suggestions:{...ingredientWindow,state:'READY',recipes:[first,second]},suggestionsStatus:'ready',suggestionsError:'',filtersStatus:'ready',filtersError:'',saved:[],shopping:[],detailId:'123',detailStatus:'ready',detailError:'',recipe,...options.state};
 const store={getSnapshot:()=>state,suggest:async()=>calls.push('suggest'),loadIngredients:async()=>calls.push('ingredients'),loadFilters:async()=>calls.push('filters'),loadDetail:async id=>calls.push(['detail',id]),save:id=>{calls.push(['save',id]);state.saved=state.saved.includes(id)?state.saved.filter(v=>v!==id):[...state.saved,id];},addShopping:items=>calls.push(['shopping',Array.from(items)]),toggleShopping:name=>{calls.push(['toggle',name]);state.shopping=state.shopping.map(row=>row.name===name?{...row,checked:!row.checked}:row);},clearPurchased:()=>{calls.push('clear');state.shopping=state.shopping.filter(row=>!row.checked);}};
 Object.assign(modules,{
  react,'react-native':{...web,Platform:{OS:'ios'},Image:({source,style})=>React.createElement(web.View,{style},React.createElement('img',{src:source.uri.startsWith('https:')?'/meal.png':source.uri,alt:'',style:{width:'100%',height:'100%',objectFit:'cover'}})),Pressable:props=>{controls.push(props);return React.createElement(web.Pressable,props);},TextInput:props=>{inputs.push(props);return React.createElement(web.TextInput,props);},Linking:{openURL:async value=>calls.push(['external',value])}},
  'react-native-safe-area-context':{SafeAreaView:props=>React.createElement(web.View,props)},
  '@expo/vector-icons':{MaterialCommunityIcons:({name,color,size})=>React.createElement('span',{'aria-hidden':true,style:{fontFamily:'MaterialCommunityIcons',color,fontSize:size}},String.fromCodePoint(glyphs[name]??glyphs.leaf))},
  'expo-router':{router:{push:value=>routes.push(value),dismissTo:value=>routes.push(value),back:()=>routes.push('back'),canGoBack:()=>true},useLocalSearchParams:()=>({id:'123'}),useFocusEffect(){}},
  '@/constants/Theme':theme,'../constants/Theme':theme,'@/lib/designAssets':{brandImage:{uri:'/brand.png'}},'@/context/AuthContext':{useAuth:()=>({state:{checking:false}})},'@/context/RealChefContext':{useRealChef:()=>({state,store})},'@/lib/chefRecipes':recipes,'@/lib/chefApi':api,
 });
 const paths={'./ChefPresentation':'../../features/chef/ChefPresentation.tsx','@/features/chef/ChefPresentation':'../../features/chef/ChefPresentation.tsx','@/components/PrototypeScreen':'../../components/PrototypeScreen.tsx','@/components/PrimaryButton':'../../components/PrimaryButton.tsx','@/components/LiveRecipeCard':'../../components/LiveRecipeCard.tsx'};
 function load(name,path){if(cache[name])return cache[name].exports;const module={exports:{}};cache[name]=module;const code=ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 vm.runInNewContext(code,{module,exports:module.exports,require:id=>modules[id]??(paths[id]?load(id,paths[id]):require(id))});return module.exports;}
 const Screen=load('route',`../../features/chef/${page==='detail'?'LiveRecipeDetailScreen':page==='shopping'?'LiveShoppingListScreen':'LiveRecipesScreen'}.tsx`).default;
 const result={state,store,calls,routes,render(){let markup;for(let i=0;i<4;i++){cursor=0;controls=[];inputs=[];effects=[];dirty=false;markup=renderToStaticMarkup(React.createElement(Screen));for(const fn of effects)fn();if(!dirty)break;}Object.assign(result,{markup,controls,inputs,css:web.StyleSheet.getSheet().textContent});return result;}};return result.render();
}
