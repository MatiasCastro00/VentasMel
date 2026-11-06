async function downloadOmintPdf(quote, clientName) {
  const {PDFDocument, StandardFonts, rgb}=PDFLib;
  const doc=await PDFDocument.create(), font=await doc.embedFont(StandardFonts.Helvetica), bold=await doc.embedFont(StandardFonts.HelveticaBold);
  const logo=await doc.embedPng(OMINT_LOGO_DATA), blue=rgb(.15,.20,.46), muted=rgb(.35,.40,.50), line=rgb(.86,.89,.94);
  const format=value=>new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0}).format(value).replace(/\u00a0/g,' ');
  const name=clientName.trim()||'Potencial asociado', filename=`${name} ${quote.plan}`.replace(/[\\/:*?"<>|\x00-\x1f]/g,' ').replace(/\s+/g,' ').trim();
  doc.setTitle(filename);let page,y;
  function nextPage(){page=doc.addPage([595.28,841.89]);y=790;page.drawImage(logo,{x:43,y:742,width:110,height:110});y=725;page.drawLine({start:{x:45,y},end:{x:550,y},thickness:2,color:blue});y-=26}
  function ensure(height){if(y-height<55)nextPage()}
  function text(value,x,size=11,face=font,color=blue){page.drawText(String(value),{x,y,size,font:face,color})}
  function heading(value){ensure(34);y-=14;text(value,45,14,bold);y-=15}
  function row(label,value){ensure(26);const amount=format(value),maxWidth=390;let clean=label;while(font.widthOfTextAtSize(clean,10)>maxWidth&&clean.length>4)clean=clean.slice(0,-2);if(clean!==label)clean+='...';text(clean,52,10);text(amount,540-font.widthOfTextAtSize(amount,10),10);y-=8;page.drawLine({start:{x:45,y},end:{x:550,y},thickness:.5,color:line});y-=16}
  nextPage();text(`COTIZACIÓN DE ${name}`,45,18,bold);y-=23;
  text(`Fecha: ${new Intl.DateTimeFormat('es-AR').format(new Date())}`,45,10,font,muted);y-=17;
  text(`Provincia: ${quote.province}`,45,11);y-=17;text(`Plan: ${quote.plan} · ${quote.category}`,45,11);y-=17;text(`${quote.count} cápitas · tramo ${quote.tier.min} a ${quote.tier.max}`,45,10,font,muted);y-=8;
  heading('Integrantes');quote.people.forEach((person,i)=>row(`${i+1}. ${person.kind==='child'?'Hijo hasta 25 años':'Adulto / familiar'} · ${person.age} años`,quote.detail[i]));
  heading('Detalle de cotización');row(`Valor del plan (${quote.count} cápitas)`,quote.base);
  quote.reductions.forEach(item=>row(`${item.name} (${item.percent}%)`, -Math.round(quote.base*item.percent/100)));
  ensure(45);page.drawRectangle({x:45,y:y-12,width:505,height:28,color:rgb(.91,.93,.97)});text('TOTAL A PAGAR',52,13,bold);const total=format(quote.total);text(total,540-bold.widthOfTextAtSize(total,13),13,bold);y-=42;
  const notes=['Los descuentos se calculan sobre el valor base del plan.','Precios Omint Empresas vigentes a noviembre de 2026.','Los importes no incluyen IVA aplicable a socios directos.','La cotización está sujeta a cambios y condiciones comerciales.'];
  for(const note of notes){ensure(15);text(note,45,9,font,muted);y-=14}
  const bytes=await doc.save(), url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'})), link=document.createElement('a');link.href=url;link.download=`${filename}.pdf`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
