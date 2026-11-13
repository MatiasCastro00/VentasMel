// Cotizador Omint Empresas. Los importes se leen de omint-data.js.
document.addEventListener('DOMContentLoaded',()=>{
  const $=id=>document.getElementById(id);
  const province=$('quote-province'),category=$('quote-category'),plan=$('quote-plan'),members=$('quote-members'),discounts=$('quote-discounts'),result=$('quote-result'),pdfButton=$('quote-generate-pdf'),saleButton=$('quote-load-sale');
  let quote=null;
  const message=value=>{quote=null;pdfButton.disabled=true;saleButton.disabled=true;result.textContent=value};
  const restore=document.createElement('button');restore.type='button';restore.className='button outline hidden';restore.textContent='Restaurar 20 % PyME';restore.addEventListener('click',()=>addDiscount(true));$('quote-add-discount').before(restore);
  const groupFor=name=>{
    if(name==='AMBA')return 'AMBA';
    if(name==='Córdoba'||name==='Santa Fe'||name==='Mendoza')return name;
    if(['Salta','Tucumán','Neuquén','Río Negro'].includes(name))return 'Salta / Tucumán / Neuquén / Río Negro';
    if(['Chubut','Santa Cruz'].includes(name))return 'Chubut / Santa Cruz';
    return 'Buenos Aires y otras provincias';
  };
  const options=(select,placeholder,values)=>select.replaceChildren(new Option(placeholder,''),...values.map(value=>new Option(value,value)));
  const money=value=>new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0}).format(value);
  const selectedPlans=()=>province.value?(OMINT_DATA.groups[groupFor(province.value)]||[]):[];
  let renderedProvince='',renderedCategory='';
  function syncSelectors(){
    const provinceChanged=renderedProvince!==province.value;
    if(provinceChanged){
      const previous=category.value,categories=[...new Set(selectedPlans().map(item=>item.category))];
      options(category,categories.length?'Elegí un tipo':'No hay tipos disponibles',categories);
      if(categories.includes(previous))category.value=previous;
      renderedProvince=province.value;
    }
    category.disabled=!province.value||category.options.length<=1;
    const categoryChanged=renderedCategory!==category.value;
    if(provinceChanged||categoryChanged){
      const previous=plan.value,plans=selectedPlans().filter(item=>item.category===category.value).map(item=>item.name);
      options(plan,plans.length?'Elegí un plan':'No hay planes disponibles',plans);
      if(plans.includes(previous))plan.value=previous;
      renderedCategory=category.value;
    }
    plan.disabled=!category.value||plan.options.length<=1;
    calculate();
  }
  const addMember=()=>{
    const row=document.createElement('div');row.className='omint-member';
    const kind=document.createElement('select');kind.setAttribute('aria-label','Parentesco');kind.replaceChildren(new Option('Adulto / cónyuge / familiar','adult'),new Option('Hijo hasta 25 años inclusive','child'));
    const age=document.createElement('input');age.type='number';age.min='0';age.max='120';age.placeholder='Edad';age.setAttribute('aria-label','Edad');
    const remove=document.createElement('button');remove.type='button';remove.className='button outline';remove.textContent='Quitar';remove.setAttribute('aria-label','Quitar integrante');remove.addEventListener('click',()=>{row.remove();calculate()});
    kind.addEventListener('change',calculate);age.addEventListener('input',calculate);row.append(kind,age,remove);members.append(row);calculate();age.focus();
  };
  function addDiscount(fixed=false){
    const row=document.createElement('div');row.className='omint-member omint-discount';
    const name=document.createElement('input');name.type='text';name.maxLength=80;name.placeholder='Motivo del descuento';name.setAttribute('aria-label','Motivo del descuento');name.value=fixed?'Afiliación PyME (1 año)':'';name.readOnly=fixed;
    const percent=document.createElement('input');percent.type='number';percent.min='0';percent.max='100';percent.step='0.01';percent.placeholder='%';percent.setAttribute('aria-label','Porcentaje de descuento');percent.value=fixed?'20':'';percent.readOnly=fixed;
    const action=document.createElement('button');action.type='button';action.className='button outline';action.textContent='Quitar';action.addEventListener('click',()=>{row.remove();if(fixed)restore.classList.remove('hidden');calculate()});
    const percentField=document.createElement('div');percentField.className='omint-percent-field';const suffix=document.createElement('span');suffix.textContent='%';suffix.setAttribute('aria-hidden','true');percentField.append(percent,suffix);
    name.addEventListener('input',calculate);percent.addEventListener('input',calculate);row.append(name,percentField,action);if(fixed){discounts.prepend(row);restore.classList.add('hidden')}else discounts.append(row);calculate();if(!fixed)name.focus();
  }
  function calculate(){
    const chosen=selectedPlans().find(item=>item.category===category.value&&item.name===plan.value);
    if(!chosen)return message('Elegí provincia y plan para comenzar.');
    const people=[...members.querySelectorAll('.omint-member')].map(row=>({kind:row.querySelector('select').value,age:Number(row.querySelector('input').value),filled:row.querySelector('input').value!==''}));
    if(!people.length)return message('Agregá al menos un integrante.');
    if(people.some(person=>!person.filled||!Number.isInteger(person.age)||person.age<0||person.age>120))return message('Ingresá la edad de todos los integrantes.');
    if(people.some(person=>person.kind==='child'&&person.age>25))return message('A partir de los 26 años ya no se puede agregar como hijo. Elegí adulto / familiar.');
    const count=people.length,min=Math.min(...chosen.rows.map(row=>row.min));
    if(count<min)return message(`Este plan necesita al menos ${min} cápitas. Seleccioná otro plan o agregá integrantes.`);
    const tier=chosen.rows.find(row=>count>=row.min&&count<=row.max);
    if(!tier)return message(chosen.category==='B'||chosen.name==='COMUNIDAD_CC'?'Este plan admite holdings de hasta 25 cápitas. Seleccioná otro plan.':'Para esta cantidad de cápitas, consultá con Producto.');
    let childNumber=0,total=0;const detail=[];
    for(const person of people){let index;if(person.kind==='child')index=childNumber++===0?5:6;else index=person.age<=25?0:person.age<=35?1:person.age<=54?2:person.age<=59?3:4;
      const price=tier.prices[index];if(price===null)return message('Para este tramo, consultá con Producto.');total+=price;detail.push(price)}
    const reductions=[...discounts.querySelectorAll('.omint-discount')].map(row=>({name:row.querySelector('input[type="text"]').value.trim(),percent:Number(row.querySelector('input[type="number"]').value),filled:row.querySelector('input[type="number"]').value!==''}));
    if(reductions.some(item=>!item.name||!item.filled||!Number.isFinite(item.percent)||item.percent<0||item.percent>100))return message('Completá el motivo y el porcentaje de cada descuento.');
    const totalPercent=reductions.reduce((sum,item)=>sum+item.percent,0);if(totalPercent>100)return message('La suma de descuentos no puede superar el 100 %.');
    const base=total,final=Math.round(base*(1-totalPercent/100));quote={province:province.value,category:category.value,plan:chosen.name,tier,count,people,detail,base,reductions,total:final};pdfButton.disabled=false;saleButton.disabled=false;
    result.replaceChildren();const strong=document.createElement('strong');strong.textContent=`Total con descuentos: ${money(final)}`;const note=document.createElement('span');note.textContent=`Valor del plan: ${money(base)} · Descuentos: ${totalPercent}% · ${count} cápita${count===1?'':'s'} · tramo ${tier.min} a ${tier.max}`;
    const breakdown=document.createElement('div');breakdown.className='omint-capita-breakdown';const heading=document.createElement('b');heading.textContent='Importe por cápita';breakdown.append(heading);
    detail.forEach((price,index)=>{const item=document.createElement('div');item.className='omint-capita-row';const childIndex=people.slice(0,index+1).filter(person=>person.kind==='child').length;const label=people[index].kind==='child'?`Hijo ${childIndex}`:'Adulto / familiar';const title=document.createElement('span');title.textContent=`${index+1}. ${label} · ${people[index].age} años`;const amount=document.createElement('span');amount.textContent=`${money(price)} → ${money(price*(1-totalPercent/100))} con descuentos`;item.append(title,amount);breakdown.append(item)});result.append(strong,note,breakdown);
  }
  async function generatePdf(){if(!quote)return;try{await downloadOmintPdf(quote,$('quote-client-name').value)}catch(error){console.error(error);alert('No se pudo generar el PDF. Volvé a intentarlo.')}}
  options(province,'Elegí una provincia',OMINT_DATA.provinces);
  for(const event of ['input','change']){province.addEventListener(event,syncSelectors);category.addEventListener(event,syncSelectors)}
  // El navegador puede restaurar valores sin emitir change al volver a la página.
  window.addEventListener('pageshow',syncSelectors);
  category.addEventListener('focus',syncSelectors);plan.addEventListener('focus',syncSelectors);
  syncSelectors();
  plan.addEventListener('change',calculate);$('quote-add-member').addEventListener('click',addMember);$('quote-add-discount').addEventListener('click',()=>addDiscount());pdfButton.addEventListener('click',generatePdf);saleButton.addEventListener('click',()=>{if(quote)document.dispatchEvent(new CustomEvent('omint:load-sale',{detail:{quote:{...quote,reductions:quote.reductions.map(item=>({...item}))},name:$('quote-client-name').value.trim()}}))});addDiscount(true);
});
