import test from 'node:test';
import assert from 'node:assert/strict';
import {chefHarness} from './helpers/render-chef.mjs';
const button=(v,label)=>v.controls.find(c=>c.accessibilityLabel===label);
const tab=(v,label)=>v.controls.find(c=>c.accessibilityRole==='tab'&&c.children?.props?.children===label);
test('Recipe UI has explicit search/refresh/navigation and real recipe imagery without invented stats',()=>{
 const v=chefHarness();assert.deepEqual(v.calls,[]);assert.match(v.markup,/Tonight’s rescue pick/);assert.doesNotMatch(v.markup,/12.40|95% Match|POWERED BY GEMINI|\\n/);
 button(v,'Suggest Recipes').onPress();button(v,'Refresh Pantry Ingredients').onPress();button(v,'Open Shopping List').onPress();button(v,'Recipe settings').onPress();button(v,'Cook This Tonight').onPress();
 assert.deepEqual(v.calls,['suggest','ingredients']);assert.deepEqual(JSON.parse(JSON.stringify(v.routes)),['/recipe/shopping-list','/settings',{pathname:'/recipe/[id]',params:{id:'123'}}]);
});
test('Quick/diet/query/saved controls preserve filtering and only fetch metadata when needed',()=>{
 const v=chefHarness({state:{filtersStatus:'idle'}});tab(v,'15-Min Quick').onPress();v.render();assert.deepEqual(v.calls,['filters']);assert.doesNotMatch(v.markup,/Vegetable Rice/);
 button(v,'Time & diet preferences · Any').onPress();v.render();tab(v,'Vegan').onPress();v.render();assert.match(v.markup,/No matching recipes/);
 button(v,'Clear Search & Filters').onPress();v.render();button(v,'Save recipe').onPress();v.render();tab(v,'Saved').onPress();v.render();assert.match(v.markup,/Tomato Rice/);assert.doesNotMatch(v.markup,/Vegetable Rice/);
 v.inputs.find(c=>c.accessibilityLabel==='Search recipe suggestions').onChangeText('no-such-meal');v.render();assert.match(v.markup,/No matching recipes/);
});
test('Compact cards now save independently and ingredient shortcuts use the existing local search',()=>{
 const v=chefHarness();button(v,'Save Vegetable Rice').onPress();assert.deepEqual(v.state.saved,[124]);button(v,'Find recipes with Tomato').onPress();v.render();assert.equal(v.inputs[0].value,'Tomato');assert.equal(v.calls.filter(c=>c==='suggest').length,0);
});
test('Idle/error/loading recipe states retain recovery without fabricated recipes',()=>{
 const idle=chefHarness({state:{suggestions:null,suggestionsStatus:'idle'}});assert.match(idle.markup,/What’s cooking tonight/);assert.equal(button(idle,'Cook This Tonight'),undefined);
 const error=chefHarness({state:{suggestions:null,suggestionsStatus:'error',suggestionsError:'Try later.'}});assert.match(error.markup,/Try later/);button(error,'Retry Recipes').onPress();assert.deepEqual(error.calls,['suggest']);
 const loading=chefHarness({state:{suggestionsStatus:'loading'}});assert.equal(button(loading,'Suggest Recipes').disabled,true);assert.equal(button(loading,'Cook This Tonight'),undefined);
});
test('Detail preserves default staple exclusion, selected shopping names, source and Pantry links',()=>{
 const v=chefHarness({page:'detail'});assert.equal(button(v,'rice').accessibilityState.checked,true);assert.equal(button(v,'salt').accessibilityState.checked,false);
 button(v,'Add Selected to Shopping List').onPress();assert.deepEqual(v.calls,[['shopping',['rice']]]);button(v,'salt').onPress();v.render();button(v,'Add Selected to Shopping List').onPress();assert.deepEqual(v.calls.at(-1),['shopping',['rice','salt']]);
 button(v,'Open Shopping List').onPress();button(v,'Review Pantry After Cooking').onPress();assert.deepEqual(v.routes,['/recipe/shopping-list','/(tabs)/pantry']);
 button(v,'Recipe source & credits').onPress();v.render();button(v,'Open Original Recipe').onPress();assert.deepEqual(v.calls.at(-1),['external','https://example.test/recipe']);assert.match(v.markup,/Cook the tomatoes/);
});
test('Detail unavailable metadata/instructions/errors remain honest and retryable',()=>{
 const v=chefHarness({page:'detail'});v.state.recipe.readyInMinutes=null;v.state.recipe.servings=null;v.state.recipe.instructionStatus='UNAVAILABLE';v.render();assert.match(v.markup,/Total time unavailable/);assert.match(v.markup,/Servings unavailable/);assert.match(v.markup,/Instructions are unavailable/);
 v.state.detailStatus='error';v.state.detailError='Could not load.';v.render();button(v,'Retry Details').onPress();assert.deepEqual(v.calls,[['detail','123']]);
});
test('Shopping list progress/check/clear/empty use existing session state and retain lifetime notice',()=>{
 const v=chefHarness({page:'shopping',state:{shopping:[{name:'rice',checked:false},{name:'salt',checked:false}]}});assert.match(v.markup,/2 left to buy/);assert.equal(button(v,'Clear Purchased Items').disabled,true);
 button(v,'rice').onPress();v.render();assert.match(v.markup,/1 left to buy/);button(v,'Clear Purchased Items').onPress();v.render();assert.equal(v.state.shopping.length,1);assert.equal(v.state.shopping[0].name,'salt');assert.match(v.markup,/restarting or signing out clears it/);
 const empty=chefHarness({page:'shopping'});button(empty,'Browse Recipes').onPress();assert.deepEqual(empty.routes,['/(tabs)/recipes']);
});
