#!/usr/bin/env python3
"""Extract every tfc:anvil recipe of the Gregnautics modpack into data/recipes.json.

Usage: extract_recipes.py <work_dir>
  <work_dir>/tfc/        = TerraFirmaCraft jar unzipped
  <work_dir>/addons/x/*/ = each addon jar unzipped (Firmalife, TFC Items, Hammer Time, ...)
Recipes rewritten by the pack's KubeJS scripts are re-declared below (section 2),
because KubeJS builds them at runtime and they do not exist as JSON files.
"""
import json,glob,os,re,sys
from collections import deque
SP=os.path.join(os.path.abspath(sys.argv[1]),'')
OUT=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','data','recipes.json')
METALS={ # key: (display, kind)
 'copper':('Cuivre','pur'),'bismuth':('Bismuth','pur'),'tin':('Étain','pur'),'zinc':('Zinc','pur'),'gold':('Or','pur'),
 'silver':('Argent','pur'),'nickel':('Nickel','pur'),'lead':('Plomb','pur'),'aluminum':('Aluminium','pur'),
 'chromium':('Chrome','pur'),'uranium':('Uranium','pur'),'wrought_iron':('Fer forgé','pur'),'cast_iron':('Fonte','pur'),
 'cobalt':('Cobalt','pur'),'platinum':('Platine','pur'),
 'bronze':('Bronze','all'),'bismuth_bronze':('Bronze au bismuth','all'),'black_bronze':('Bronze noir','all'),
 'brass':('Laiton','all'),'rose_gold':('Or rose','all'),'sterling_silver':('Argent sterling','all'),
 'constantan':('Constantan','all'),'electrum':('Électrum','all'),'cupronickel':('Cupronickel','all'),'invar':('Invar','all'),
 'cobalt_brass':('Laiton au cobalt','all'),
 'steel':('Acier','all'),'black_steel':('Acier noir','all'),'blue_steel':('Acier bleu','all'),'red_steel':('Acier rouge','all'),
 'stainless_steel':('Acier inoxydable','all'),
}
MKEYS=sorted(METALS,key=len,reverse=True)
FORMS={ # form key -> (label, group)
 'pickaxe_head':('Pickaxe Head','Outils & armes'),'axe_head':('Axe Head','Outils & armes'),'shovel_head':('Shovel Head','Outils & armes'),
 'hoe_head':('Hoe Head','Outils & armes'),'hammer_head':('Hammer Head','Outils & armes'),'propick_head':('Propick Head','Outils & armes'),
 'saw_blade':('Saw Blade','Outils & armes'),'scythe_blade':('Scythe Blade','Outils & armes'),'knife_blade':('Knife Blade','Outils & armes'),
 'javelin_head':('Javelin Head','Outils & armes'),'chisel_head':('Chisel Head','Outils & armes'),'sword_blade':('Sword Blade','Outils & armes'),
 'mace_head':('Mace Head','Outils & armes'),
 'sheet':('Sheet (plaque)','Matières de base'),'rod':('Rod','Matières de base'),'chain':('Chain','Matières de base'),'nugget':('Nuggets','Matières de base'),
 'fish_hook':('Fish Hook','Pièces de feuille'),'trapdoor':('Trapdoor','Pièces de feuille'),'bars':('Bars','Pièces de feuille'),
 'unfinished_boots':('Unfinished Boots','Armures & grosses pièces'),'unfinished_helmet':('Unfinished Helmet','Armures & grosses pièces'),
 'unfinished_chestplate':('Unfinished Chestplate','Armures & grosses pièces'),'unfinished_greaves':('Unfinished Greaves','Armures & grosses pièces'),
 'shield':('Shield','Armures & grosses pièces'),'tuyere':('Tuyere','Armures & grosses pièces'),'unfinished_lamp':('Unfinished Lamp','Armures & grosses pièces'),
 'bucket':('Bucket','Armures & grosses pièces'),'excavator_head':('Excavator Head (Hammer Time)','Outils & armes'),'sledgehammer_head':('Sledgehammer Head (Hammer Time)','Outils & armes'),'ingot':('Ingot','Matières de base'),
 'foil':('Foil','Petites pièces'),'gear':('Gear','Petites pièces'),'stamen':('Stamen','Petites pièces'),'wire':('Wire','Petites pièces'),
 'ring':('Ring','Petites pièces'),'nail':('Nail','Petites pièces'),'rivet':('Rivet','Petites pièces'),'screw':('Screw','Petites pièces'),
}
def inglabel(ing):
    if isinstance(ing,list): ing=ing[0]
    if 'tag' in ing:
        t=ing['tag'].split(':',1)[-1]
        k,_,m=t.partition('/')
        n={'ingots':'Lingot','double_ingots':'Lingot double','sheets':'Feuille','double_sheets':'Feuille double','rods':'Tige','plates':'Plaque','stamens':'Étamine'}.get(k,k)
        return n
    it=ing.get('item','')
    if 'stamen' in it: return 'Étamine'
    if 'double_ingot' in it: return 'Lingot double'
    if 'ingot' in it: return 'Lingot'
    return it
def tierv(d): return d.get('tier')
entries={}  # recipe key -> entry
def metal_of(s):
    for m in MKEYS:
        if m in s: return m
    if 'aluminium' in s: return 'aluminum'
    return None
def add(key,metal,form,label,group,inp,count,rules,tier,ids,sure,src,extra=''):
    entries[key]=dict(key=key,metal=metal or 'misc',form=form,label=label,group=group,input=inp,count=count,rules=rules,tier=tier,ids=ids,sure=sure,src=src,note=extra)
# 1) jar recipes
SRC=lambda p:'TFC' if '/tfc/' in p or p.startswith(SP+'tfc/') else 'Addon'
for p in glob.glob(SP+'tfc/data/**/recipe/anvil/**/*.json',recursive=True)+glob.glob(SP+'addons/x/**/data/*/recipe/anvil/**/*.json',recursive=True):
    d=json.load(open(p))
    if d.get('type')!='tfc:anvil': continue
    rel=p.split('/recipe/anvil/')[1][:-5]; ns=re.search(r'/data/([^/]+)/recipe/',p).group(1)
    rid=f'{ns}:anvil/{rel}'
    res=d['result']; oid=res['id']; cnt=res.get('count',1) or 1
    parts=rel.split('/')
    src='TFC' if p.startswith(SP+'tfc/') else 'Addon'
    if parts[0]=='metal':
        form=parts[1]; mname=parts[2].replace('_double','')
        metal=mname
        lab=FORMS.get(form,(form,'Divers'))
        if form=='ingot':
            ing=d['ingredient']; lab=('Ingot ← '+(ing.get('tag','').split('/')[-1] or ing.get('item','')),lab[1])
        dbl=parts[2].endswith('_double')
        add(rid,metal,form,lab[0]+(' (double)' if dbl else ''),lab[1],inglabel(d['ingredient']),cnt,d['rules'],tierv(d),[oid],True,src)
    else:
        base=parts[-1]; m=metal_of(base) or metal_of(oid)
        form=None
        if m:
            f=base.replace(m+'_','',1) if base.startswith(m+'_') else base
            form=f if f in FORMS else None
            if m=='aluminum' or True: pass
        if m and form:
            lab=FORMS[form]
            add(rid,m,form,lab[0],lab[1],inglabel(d['ingredient']),cnt,d['rules'],tierv(d),[oid],True,src)
        else:
            lab=base.replace('_',' ').title()
            mm=m or (metal_of(json.dumps(d['ingredient'])) )
            add(rid,mm,base,lab,'Divers',inglabel(d['ingredient']),cnt,d['rules'],tierv(d),[oid],True,src)
# 2) pack overrides
HIT3=['hit_last','hit_second_last','hit_third_last']
PLATE=[('bismuth',1),('bismuth_bronze',2),('black_bronze',2),('black_steel',5),('blue_steel',6),('brass',1),('bronze',2),('cast_iron',1),
 ('copper',1),('gold',1),('nickel',1),('red_steel',6),('rose_gold',1),('silver',1),('steel',4),('sterling_silver',1),('tin',1),('wrought_iron',3),('zinc',1)]
GT=lambda m:'aluminium' if m=='aluminum' else m
for m,t in PLATE:
    entries.pop(f'tfc:anvil/metal/sheet/{m}',None); entries.pop(f'tfc:anvil/metal/rod/{m}',None)
    add(f'tfc:anvil/metal/sheet/{m}',m,'sheet','Sheet (plaque)','Matières de base','Lingot',1,HIT3,t,[f'gtceu:{GT(m)}_plate',f'tfc:metal/sheet/{m}'],False,'Pack')
    add(f'tfc:anvil/metal/rod/{m}',m,'rod','Rod','Matières de base','Lingot',2,HIT3,t,[f'gtceu:{GT(m)}_rod',f'tfc:metal/rod/{m}'],False,'Pack')
for m in ('chromium','stainless_steel'):
    add(f'firmalife:anvil/metal/sheet/{m}',m,'sheet','Sheet (plaque)','Matières de base','Lingot double',1,HIT3,4,[f'gtceu:{m}_plate'],True,'Pack')
    add(f'firmalife:anvil/metal/rod/{m}',m,'rod','Rod','Matières de base','Lingot',2,['bend_last','draw_second_last','draw_third_last'],4,[f'gtceu:{m}_rod'],True,'Pack')
SMALLM=['bismuth','bismuth_bronze','black_bronze','black_steel','blue_steel','brass','bronze','cast_iron','chromium','copper','gold','nickel','red_steel','rose_gold','silver','stainless_steel','steel','sterling_silver','tin','wrought_iron','zinc','uranium']
SMALLF={'ring':['hit_last','draw_second_last','draw_third_last'],'nail':['punch_last','hit_not_last','bend_not_last'],'rivet':['draw_not_last','bend_any','hit_any'],'screw':['hit_any','hit_any','draw_last']}
for m in SMALLM:
    for f,r in SMALLF.items():
        k=f'tfc_items:anvil/{m}_{f}'
        old=entries.get(k); tier=old['tier'] if old else (dict(PLATE).get(m) or 3)
        ids=[f'gtceu:{m}_{f}',f'tfc_items:{GT(m) if False else m}_{f}'.replace('tfc_items:'+m,'tfc_items:'+('aluminum' if m=='aluminium' else m))]
        sure = f in ('nail','rivet')
        if f in ('nail','rivet'): ids=[f'tfc_items:{m}_{f}',f'gtceu:{m}_{f}']
        add(k,m,f,f.title()+' ×2','Petites pièces','Étamine',2,r,tier,ids,False,'Pack')
NUG=[('aluminium',2),('bismuth',1),('bismuth_bronze',2),('black_bronze',2),('black_steel',5),('blue_steel',6),('brass',2),('bronze',2),('cobalt',3),('cobalt_brass',3),('constantan',2),('copper',1),('cupronickel',2),('electrum',1),('gold',1),('invar',3),('lead',1),('nickel',1),('platinum',3),('rose_gold',1),('silver',1),('stainless_steel',4),('steel',4),('sterling_silver',1),('tin',1),('wrought_iron',3),('zinc',1)]
for m,t in NUG:
    mk='aluminum' if m=='aluminium' else m
    oid='minecraft:gold_nugget' if m=='gold' else f'gtceu:{m}_nugget'
    add(f'gregnautics:tfc/anvil/{m}_nuggets_from_ingot',mk,'nugget','Nuggets ×9','Matières de base','Lingot',9,['punch_last','hit_second_last','hit_third_last'],t,[oid],True,'Pack')
for m,t,oid in (('copper',1,'powergrid:wire'),('gold',1,'powergrid:golden_wire')):
    add(f'gregnautics:tfc/anvil/{m}_wire_from_{m}_rod',m,'wire','Wire ×2 (PowerGrid)','Petites pièces','Tige',2,HIT3,t,[oid],True,'Pack')
add('gregnautics:tfc/anvil/iron_wire_from_iron_rod','wrought_iron','wire_iron','Wire ×2 (PowerGrid, fer)','Petites pièces','Tige',2,HIT3,3,['powergrid:iron_wire'],True,'Pack')
for i,m,oid,t in (('create_fluid_pipe','copper','create:fluid_pipe',1),('tfmg_brass_pipe','brass','tfmg:brass_pipe',2),('tfmg_aluminum_pipe','aluminum','tfmg:aluminum_pipe',2),('tfmg_cast_iron_pipe','cast_iron','tfmg:cast_iron_pipe',3),('tfmg_steel_pipe','steel','tfmg:steel_pipe',4)):
    add(f'gregnautics:tfc/anvil/pipe/{i}',m,'pipe','Pipe','Pièces de feuille','Plaque',1,['bend_last','bend_second_last','hit_third_last'],t,[oid],True,'Pack')
# drop tfc steel_pipe jar dup? keep both. Remove metal=None -> misc
# 3) min/max
ACTS=[(-3,1),(-6,1),(-9,1),(-15,2),(2,3),(7,4),(13,5),(16,6)]
CL={'hit':1,'draw':2,'punch':3,'bend':4,'upset':5,'shrink':6}
def prs(r):
    for o in ('not_last','second_last','third_last','last','any'):
        if r.endswith('_'+o): return CL[r[:-len(o)-1]],o
def okr(rules,l,s,t):
    for ty,o in rules:
        if o=='any': m=ty in (l,s,t)
        elif o=='last': m=l==ty
        elif o=='not_last': m=ty in (s,t)
        elif o=='second_last': m=s==ty
        else: m=t==ty
        if not m: return False
    return True
cache={}
def minmax(rl):
    k=tuple(rl)
    if k in cache: return cache[k]
    rules=[prs(r) for r in rl]
    best={}
    seen={(0,0,0,0)}; q=deque([((0,0,0,0),0)])
    while q:
        (w,a,b,c),dist=q.popleft()
        for d,cl in ACTS:
            nw=w+d
            if nw<0 or nw>150: continue
            ns=(nw,cl,a,b)
            if ns in seen: continue
            seen.add(ns)
            if 40<=nw<=113 and nw not in best and okr(rules,cl,a,b): best[nw]=dist+1
            q.append((ns,dist+1))
    vals=[best.get(t) for t in range(40,114)]
    v=[x for x in vals if x is not None]
    cache[k]=(min(v),max(v),vals.count(None))
    return cache[k]
out=[]
for e in entries.values():
    e['min'],e['max'],e['uns']=minmax(e['rules'])
    out.append(e)
ordm=list(METALS)
gord=['Outils & armes','Matières de base','Pièces de feuille','Armures & grosses pièces','Petites pièces','Divers']
out.sort(key=lambda e:(ordm.index(e['metal']) if e['metal'] in ordm else 99, gord.index(e['group']) if e['group'] in gord else 9, e['label']))
for e in out:
    if e['metal'] not in METALS: e['metal']='misc'
MOD={'tfc_items':'TFC Items','tfc_metal_tools':'Metal Tools','tfc':'TFC','firmalife':'Firmalife','gregnautics':'Gregnautics','tfc_hammer_time':'Hammer Time'}
import collections
cnt=collections.Counter((e['metal'],e['label']) for e in out)
for e in out:
    if cnt[(e['metal'],e['label'])]>1 and '(double)' not in e['label']:
        ns=e['key'].split(':')[0]; e['label']+=' ('+MOD.get(ns,ns)+')'
metals=[dict(key=k,name=v[0],kind=v[1]) for k,v in METALS.items()]+[dict(key='misc',name='Divers (sans métal)',kind='misc')]
keep=('key','metal','label','group','input','count','rules','tier','ids','sure','src','min','max')
json.dump({'metals':metals,'recipes':[{k:e[k] for k in keep} for e in out]},open(OUT,'w'),ensure_ascii=False,indent=1)
print(len(out),'recipes written to',os.path.normpath(OUT))
