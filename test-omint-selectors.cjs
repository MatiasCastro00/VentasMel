const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
class Element {
  constructor(id=''){this.id=id;this.listeners={};this.children=[];this.value='';this.disabled=false;this.classList={add(){},remove(){}}}
  addEventListener(type,fn){(this.listeners[type]??=[]).push(fn)}
  fire(type){for(const fn of this.listeners[type]||[])fn({target:this})}
  replaceChildren(...items){this.children=items;if(this.id.startsWith('quote-')&&['quote-province','quote-category','quote-plan'].includes(this.id))this.value=items[0]?.value||''}
  get options(){return this.children} append(...items){this.children.push(...items)} prepend(...items){this.children.unshift(...items)} before(){} setAttribute(){} querySelectorAll(){return []} focus(){} 
}
const ids=['include-iva','province','category','plan','members','discounts','result','generate-pdf','load-sale','add-discount','add-member','client-name'];
const elements=Object.fromEntries(ids.map(id=>['quote-'+id,new Element('quote-'+id)]));
const document={getElementById:id=>elements[id],createElement:()=>new Element(),addEventListener(type,fn){if(type==='DOMContentLoaded')this.init=fn}};
const window=new Element();const context={document,window,Option:function(text,value){this.text=text;this.value=value},Intl,console};vm.createContext(context);
vm.runInContext(fs.readFileSync('omint-data.js','utf8')+'\nthis.data=OMINT_DATA',context);vm.runInContext(fs.readFileSync('omint-quote.js','utf8'),context);document.init();
const p=elements['quote-province'],c=elements['quote-category'],plan=elements['quote-plan'];
assert(c.disabled&&plan.disabled);
for(const province of context.data.provinces){p.value=province;p.fire('change');assert(!c.disabled,province);const categories=c.options.slice(1).map(o=>o.value);assert(categories.length,province);for(const category of categories){c.value=category;c.fire('input');assert(!plan.disabled,province+' '+category);assert(plan.options.length>1);plan.value=plan.options[1].value;plan.fire('change')}}
p.value='AMBA';p.fire('change');c.value='201602';c.fire('change');plan.value='2500_24';p.value='Córdoba';p.fire('change');assert.equal(c.value,'201602');assert.equal(plan.value,'2500_24');
c.value='B';c.fire('change');assert.equal(plan.value,'');assert(!plan.disabled);
p.value='';p.fire('change');assert(c.disabled&&plan.disabled);
p.value='Mendoza';window.fire('pageshow');assert(!c.disabled);c.value='B';c.fire('change');assert(!plan.disabled);
console.log('Selectores verificados para todas las provincias, tipos, cambios y restauración.');

// El IVA se aplica después de los descuentos y se revierte al destildar.
p.value='AMBA';p.fire('change');c.value=c.options[1].value;c.fire('change');plan.value=plan.options[1].value;
const chosen=context.data.groups.AMBA.find(item=>item.category===c.value&&item.name===plan.value);
const count=chosen.rows[0].min;
elements['quote-members'].querySelectorAll=()=>Array.from({length:count},()=>({querySelector:selector=>selector==='select'?{value:'adult'}:{value:'30'}}));
elements['quote-discounts'].querySelectorAll=()=>[{querySelector:selector=>({value:selector.includes('text')?'Bonificación':'20'})}];
plan.fire('change');
const withoutTax=elements['quote-result'].children[0].textContent;
let loaded;document.dispatchEvent=event=>{loaded=event.detail.quote};context.CustomEvent=function(type,options){this.detail=options.detail};
elements['quote-load-sale'].fire('click');const subtotal=loaded.total;assert.equal(loaded.iva,0);
elements['quote-include-iva'].checked=true;elements['quote-include-iva'].fire('change');elements['quote-load-sale'].fire('click');
assert.equal(loaded.subtotal,subtotal);assert.equal(loaded.iva,Math.round(subtotal*.105));assert.equal(loaded.total,subtotal+loaded.iva);assert(loaded.total>subtotal);
elements['quote-include-iva'].checked=false;elements['quote-include-iva'].fire('change');assert.equal(elements['quote-result'].children[0].textContent,withoutTax);
console.log('IVA opcional verificado sobre el subtotal con descuentos.');
