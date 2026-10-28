// Presentation only: preserve the original data and calculation precision separately.
const fractions={'½':.5,'¼':.25,'¾':.75,'⅛':.125,'⅜':.375,'⅝':.625,'⅞':.875,'⅓':1/3,'⅔':2/3};
const fmt=(v,d=1)=>String(Number(v.toFixed(d)));
const N='(?:\\d+(?:\\.\\d+)?|\\.\\d+)';
export function cleanCase(s){return s.replace(/\b[A-Za-z]+\b/g,w=>/[a-z]/.test(w)&&/[A-Z]/.test(w.slice(1))?w.toLowerCase():w)}
export function stripReferences(s){return s.replace(/^\s*(?:\d+\s+)?Bread: A Baker[^\n]*$/gmi,'').replace(/^\s*(?:sourdough rye breads|levain breads|miscellaneous breads|straight doughs|Breads Made with yeasted pre-ferments)\s*\d*\s*$/gmi,'').replace(/^.*\d{2}_978\d+[^\n]*$/gm,'').replace(/^.*\d{1,2}\/\d{1,2}\/\d{2}\s+\d{1,2}:\d{2}\s*[AP]M.*$/gm,'').replace(/\b(?:book\s+)?(?:pages?|pp?\.?)\s*\d+(?:\s*[–-]\s*\d+)?/gi,'').replace(/\(\s*\)/g,'').replace(/\s+,/g,',').replace(/\b(?:see|refer to)\s*(?:the )?(?:book|sidebar)\s*(?:on\s*)?(?=[).,;]|$)/gi,'').replace(/[ \t]{2,}/g,' ').replace(/ +\n/g,'\n').trim()}
export function metricText(input){
 let s=stripReferences(cleanCase(String(input))).replace(/(\d+)?([½¼¾⅛⅜⅝⅞⅓⅔])/g,(_,a,b)=>fmt(Number(a||0)+fractions[b],3)).replace(/\b(\d+)\s+(\d+)\/(\d+)\b/g,(_,a,b,c)=>fmt(+a+(+b/+c),3)).replace(/\b(\d+)\/(\d+)\b/g,(_,a,b)=>fmt(+a/+b,3));
 // A temperature change converts as a difference, never as an absolute temperature.
 s=s.replace(new RegExp(`(${N})\\s*°?(?:F)?\\s*(?:to|[–−-])\\s*(${N})\\s*°\\s*F\\b`,'gi'),(m,a,b,offset,full)=>{const delta=/\bby(?:\s+(?:about|approximately))?\s*$/i.test(full.slice(Math.max(0,offset-45),offset));const f=v=>fmt((+v-(delta?0:32))*5/9,0);return f(a)+'–'+f(b)+'°C'});
 s=s.replace(new RegExp(`(${N})\\s*°\\s*F\\b`,'gi'),(m,a,offset,full)=>{const delta=/\bby(?:\s+(?:about|approximately))?\s*$/i.test(full.slice(Math.max(0,offset-45),offset));return fmt((+a-(delta?0:32))*5/9,0)+'°C'});
 s=s.replace(new RegExp(`(${N})\\s*(?:lb\\.?|pounds?)\\s*,?\\s*(?:and\\s*)?(${N})\\s*(?:oz\\.?|ounces?)\\b`,'gi'),(_,a,b)=>fmt(+a*453.59237 + +b*28.349523125,0)+' g');
 const units=[['pounds?|lbs?\\.?',453.59237,'g',0],['ounces?|oz\\.?',28.349523125,'g',0],['inches|inch|in\\.',2.54,'cm',1],['feet|foot',30.48,'cm',1],['quarts?|qt\\.?',946.352946,'ml',0],['gallons?',3785.411784,'ml',0],['cups?',236.5882365,'ml',0],['tablespoons?|tbsp\\.?',14.7867648,'ml',1],['teaspoons?|tsp\\.?',4.9289216,'ml',1]];
 for(const [unit,k,symbol,d] of units){
  s=s.replace(new RegExp(`(${N})\\s*(?:by|[×x])\\s*(${N})(?:\\s*(?:by|[×x])\\s*(${N}))?\\s*[- ]?\\s*(?:${unit})(?=\\b|[.,;)])`,'gi'),(_,a,b,c)=>[a,b,c].filter(v=>v!==undefined).map(v=>fmt(+v*k,d)).join(' × ')+' '+symbol);
  s=s.replace(new RegExp(`(${N})\\s*-?\\s*(?:to|[–−-])\\s*(${N})\\s*[- ]?\\s*(?:${unit})(?=\\b|[.,;)])`,'gi'),(_,a,b)=>fmt(+a*k,d)+'–'+fmt(+b*k,d)+' '+symbol);
  s=s.replace(new RegExp(`(${N})\\s*[- ]?\\s*(?:${unit})(?=\\b|[.,;)])`,'gi'),(_,a)=>fmt(+a*k,d)+' '+symbol);
 }
 s=s.replace(new RegExp(`(${N})\\s*T\\b`,'gi'),(_,n)=>fmt(+n*14.7867648,1)+' ml');
 // Verbal imperial measures used in the prose.
 for(const [phrase,value,unit]of [['a half inch',1.3,'cm'],['half an inch',1.3,'cm'],['a quarter inch',.6,'cm'],['an inch',2.5,'cm'],['one inch',2.5,'cm'],['one pound',454,'g'],['a pound',454,'g'],['one ounce',28,'g'],['a tablespoon',14.8,'ml'],['a teaspoon',4.9,'ml']])s=s.replace(new RegExp('\\b'+phrase+'\\b','gi'),value+' '+unit);
 return s.replace(/\bEighteen[- ]ounce/gi,'510 g').replace(/\bof several pounds\b/gi,'').replace(/\bweekly quart\b/gi,'weekly 946 ml portion').replace(/(?:the )?weights at the top of the formula fit full sheet pans in the U\.S\. and Metric columns, and half sheet pans in the Home column/gi,'reference quantities fit sheet pans of different sizes; choose a piece weight appropriate for your pans').replace(/\bU\.S\.(?:A\.)? and Home columns/gi,'alternative measurement columns').replace(/\bU\.S\.(?:A\.)? (?:column|quantity)/gi,'alternative quantity').replace(/\bU\.S\.(?:A\.)?/g,'United States').replace(/\b(?:see|refer to)(?: the)?\s*(?=[).,;]|$)/gi,'').replace(/\s+([,.;:])/g,'$1').replace(/\(\s*[,;.]?\s*\)/g,'').replace(/ {2,}/g,' ').trim();
}
export function methodParts(text){const s=metricText(text),m=s.match(/^([^:]{2,100}):\s*([\s\S]*)$/);return m?{heading:m[1].toLowerCase().replace(/^\w/,c=>c.toUpperCase()),body:m[2]}:{heading:'',body:s}}
export function readableMethods(r){return r.methods.map((text,i)=>{if(r.page===92&&i===6)text=text.split(' g brought the poolish-style')[0];if(r.page===359&&i===3)text=text.split(' TWO FILLINGS')[0];return metricText(text)})}
export function recipeNotes(r){
 const first=r.pages[0]?.text||'',start=first.search(/(?:Overall Formula|U\.S\.\s+Metric)/i),intro=start<0?first:first.slice(0,start);
 const lines=intro.split('\n').map(l=>l.trim().replace(/(?:Pre-fermented flour:|Dough Yield|U\.S\.:?|Metric:|Home:).*$/i,'').trim()).filter(l=>!/^\d+\s*(?:loaves|at|each)\b/i.test(l));
 // Keep narrative; titles/yield side panels are redundant with the recipe and batch card.
 const titleWords=new Set(r.title.toLowerCase().match(/[a-z0-9]+/g)||[]);while(lines.length&&(lines[0].toLowerCase().match(/[a-z0-9]+/g)||[]).every(w=>titleWords.has(w)))lines.shift();
 const notes=[];if(lines.length)notes.push(...metricText(lines.join('\n').replace(/(?<!\n)\n(?!\n)/g,' ')).split(/\n\s*\n/));
 for(const p of r.pages){for(const match of p.text.matchAll(/(?:^|\n)[ \t]*(?:\*[^\n]*|Note:|Notes:)[\s\S]*?(?=\n[ \t]*\n|\n\s*1\.\s|\n\s*\d{2}_978|$)/g)){const clean=metricText(match[0]);if(clean)notes.push(clean)}}
 if(r.page===359){
  notes.push(metricText('Spicy tomato filling\n\n• Extra-virgin olive oil: 2 tablespoons\n• Garlic, finely chopped: 2 cloves or more, to taste\n• Onion, finely chopped: 1 medium\n• Green bell pepper, finely chopped: 1\n• Jalapeño pepper, finely chopped: 1\n• Cumin seeds: 1–2 teaspoons\n• Coriander seeds, ground: 1 teaspoon\n• Fennel seeds: 1–2 teaspoons\n• Salt: ½ teaspoon\n• Pepper: to taste\n• Cayenne pepper: optional, to taste\n• Plum tomatoes: 1 can (28 ounces)\n• Parsley, chopped: several stems\n\nHeat the olive oil. Add the garlic, onion, green pepper, and jalapeño pepper. Sauté until the onion is translucent, 6 to 8 minutes. Add the cumin, coriander, fennel, salt, pepper, and optional cayenne. Add the plum tomatoes and cook until somewhat thick, stirring often. Add the chopped parsley. Taste and adjust the seasoning as necessary. Cool before filling the flat breads. The filling can be made up to 3 days before use. Note that the filling recipe makes more than needed for the flat bread formula. Extra filling can be used in pasta or egg dishes.'));
  notes.push(metricText('Feta cheese filling\n\n• Jalapeño pepper, finely chopped: 1\n• Scallions, finely chopped: 2\n• Feta cheese, crumbled: 8 ounces\n• Cilantro leaves: to taste\n\nCombine the ingredients and use to fill the flat breads.'));
 }

 if(r.page===92){const t=r.pages.find(p=>p.text.includes('Baker’s Notes'))?.text.split('Baker’s Notes')[1];if(t)notes.push(metricText(t.split(/\n\s*Breads Made/)[0]))}
 return notes.filter(Boolean);
}
