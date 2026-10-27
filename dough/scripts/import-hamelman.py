"""Import the supplied TXT without inventing missing ingredients or methods."""
import hashlib,json,re,sys,unicodedata
from pathlib import Path
text=Path(sys.argv[1]).read_text()
out=Path(sys.argv[2])
records=[];chapter='';block=[]
def slug(s):
 return re.sub(r'[^a-z0-9]+','-',unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode().lower()).strip('-')
def flush():
 if not block:return
 titleline=block[0][3:];match=re.fullmatch(r'(.+) \(p\. (\d+)\)',titleline);title,page=match.groups()
 raw='\n'.join(block[1:]).strip();raw=re.sub(r'\n---\s*$','',raw).strip()
 before,sep,after=raw.partition('**Method:**')
 sections=[];section=None
 for line in before.splitlines():
  head=re.fullmatch(r'\*\*(.+?)\*\*',line.strip())
  if head:section={'name':head[1],'ingredients':[]};sections.append(section)
  row=re.fullmatch(r'\s*• (.+): ([\d.]+)%\s*',line)
  if row:
   assert section,line
   section['ingredients'].append({'name':row[1],'percent':float(row[2])})
  elif '•' in line:raise ValueError(line)
 overall=next((s['ingredients'] for s in sections if s['name']=='Overall Formula'),[])
 methods=[m.strip() for m in re.split(r'(?m)^\d+\. ',after)[1:]] if sep else []
 source_yield=re.search(r'^Yield: (.+)$',before,re.M);pf=re.search(r'Pre-fermented flour: ([\d.]+)%',before)
 description=re.split(r'(?m)^Yield:|^\*\*',before)[0].strip()
 basis=[i['name'] for i in overall if 'flour' in i['name'].lower()]
 flour_sum=sum(i['percent'] for i in overall if i['name'] in basis)
 # These three source formulas explicitly include germ/cornmeal/cracked grain in their 100% basis.
 extras={101:['Wheat germ, toasted'],129:['Cracked wheat'],143:['Fine cornmeal']}
 basis+=extras.get(int(page),[])
 issues=[]
 if not overall:issues.append('The supplied attachment does not contain a complete overall ingredient formula. Quantities cannot be calculated reliably.')
 if not methods:issues.append('No numbered preparation method was supplied for this entry.')
 if methods and methods[-1].endswith('…'):issues.append('The supplied method ends mid-passage. The missing continuation has not been invented.')
 builds=[s for s in sections if s['name']!='Overall Formula']
 if pf and not builds:issues.append('The attachment gives a prefermented-flour percentage, but omits the preferment ingredient formula. Only the overall dough quantities can be calculated.')
 if any(s['name'] not in ['Soaker','Overall Formula'] for s in sections) and not pf:issues.append('The attachment omits the share of flour assigned to the preferment. Enter a verified percentage to calculate build and final-addition weights; no default has been assumed.')
 if int(page)==320:issues.append('The two linked builds include an ingredient labelled only “drained”. Their source percentages are retained, but automatic build allocation is unavailable without clarifying that ingredient and the chained-build basis.')
 if int(page)==109:issues.append('The ingredient labelled “roasted” is retained exactly as supplied; the method identifies potatoes. Check the source before weighing.')
 if int(page)==125:issues.append('The ingredient label “Brown rice,” is incomplete; the method specifies cooked brown rice.')
 if int(page)==332:issues.append('The method includes an onion filling, but no filling quantities were supplied; the calculator covers the dough only.')
 if int(page)==336:issues.append('The crossing paste and finishing syrup are described in the method but their formulas are missing; the calculator covers the dough only.')
 records.append({'id':'hamelman-'+slug(title),'title':title,'page':int(page),'chapter':chapter,'sourceYield':source_yield[1].split(' | ')[0] if source_yield else '', 'prefermented':float(pf[1]) if pf else None,'description':description,'overall':overall,'basis':basis,'builds':builds,'methods':methods,'issues':issues,'sourceText':raw})
for line in text.splitlines():
 if line.startswith('# Chapter'):
  flush();block=[];chapter=line[2:]
 elif line.startswith('## '):flush();block=[line]
 elif block:block.append(line)
flush()
assert len(records)==60,len(records)
assert len({r['id'] for r in records})==60
payload={'title':'Hamelman · Bread','source':'Jeffrey Hamelman, Bread: A Baker’s Book of Techniques and Recipes, 2nd ed., Wiley, 2013. User-supplied reference transcription.','sourceSha256':hashlib.sha256(text.encode()).hexdigest(),'recipes':records}
out.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'recipes':len(records),'overallFormulas':sum(bool(r['overall']) for r in records),'methods':sum(bool(r['methods']) for r in records),'methodSteps':sum(len(r['methods']) for r in records),'buildSections':sum(len(r['builds']) for r in records)},indent=2))
