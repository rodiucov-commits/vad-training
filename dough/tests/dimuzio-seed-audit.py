"""Independent Decimal seed/feed and whole-dough mass checks against worksheet JS."""
from decimal import Decimal as D, getcontext
from pathlib import Path
import json, subprocess
getcontext().prec=40
source=Path(__file__).resolve().parents[1]/'proposals/dimuzio/worksheet.js'
cases=[];expected=[]
for two in [False,True]:
 for count,piece in [(1,1714 if not two else 1724),(3,400),(10,700)]:
  for dose in [1,2,4]:
   for hydration in [50,100,200]:
    s=dict(count=count,piece=piece,hydration=70 if two else 69,salt=2,p1=8 if two else 11,h1=100,p2=10 if two else 0,h2=60,seedPercent=dose,seedHydration=hydration,two=two)
    F=D(count)*D(piece)/(1+D(s['hydration'])/100+D('.02')+D('.004'))
    seed=F*D(dose)/100;sf=seed/(1+D(hydration)/100);sw=seed-sf
    lf=F*D(s['p1'])/100;lw=lf
    spf=F*D(s['p2'])/100;spw=spf*D('.6')
    feedf=lf-sf;feedw=lw-sw
    remainingf=F-lf-spf;remainingw=F*D(s['hydration'])/100-lw-spw
    ripe=feedf+feedw+seed
    final=remainingf+remainingw+F*D('.02')+F*D('.004')
    total=final+ripe+spf+spw
    assert abs(total-D(count)*D(piece))<D('1e-30')
    assert abs((feedw+sw+remainingw+spw)/(feedf+sf+remainingf+spf)*100-D(s['hydration']))<D('1e-30')
    cases.append(s);expected.append(dict(F=F,seed=seed,seedFlour=sf,seedWater=sw,feedFlour=feedf,feedWater=feedw,ripe=ripe,total=total,finalWater=remainingw))
node="const fs=require('fs'),vm=require('vm');const code=fs.readFileSync(process.argv[1],'utf8').split('window.calculate=calculate;')[0]+';calculate';const calc=vm.runInNewContext(code);const cases=JSON.parse(fs.readFileSync(0,'utf8'));console.log(JSON.stringify(cases.map(s=>{const r=calc(s);return {F:r.F,seed:r.seed,seedFlour:r.seedFlour,seedWater:r.seedWater,feedFlour:r.builds[0].feedFlour,feedWater:r.builds[0].feedWater,ripe:r.builds[0].mass,total:r.total,finalWater:r.final[1]}})));"
r=subprocess.run(['node','-e',node,str(source)],input=json.dumps(cases),text=True,capture_output=True,check=True)
for i,(actual,want) in enumerate(zip(json.loads(r.stdout),expected)):
 for key,value in want.items():
  assert abs(D(str(actual[key]))-value)<D('1e-8'),(i,key,actual[key],value)
# Independently interpretable oracle: whole flour1000g, seed20g at100% hydration.
a=expected[4]
assert a['F']==1000 and a['seed']==20 and a['feedFlour']==100 and a['feedWater']==100 and a['ripe']==220 and a['total']==1714
print('PASS 54 independent Decimal cases: explicit starter + fresh feeds, seed50/100/200% hydration, one/two preferments, three batch sizes; exact whole-dough hydration and mass; 100g flour +100g water +20g starter =220g ripe levain.')
