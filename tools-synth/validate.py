import sys,re,collections,datetime as dt
f=sys.argv[1]; raw=open(f,'rb').read(); s=raw.decode('cp1250'); L=s.split('\r\n')
assert L[0].startswith('ERMHDR') and L[-2]=='%E', 'hdr/end'
T={};cur=None
for l in L:
    if l.startswith('%T\t'): cur=l[3:]; T[cur]=dict(f=None,r=[])
    elif l.startswith('%F\t'): T[cur]['f']=l[3:].split('\t')
    elif l.startswith('%R\t'):
        v=l[3:].split('\t'); assert len(v)==len(T[cur]['f']),(cur,len(v),len(T[cur]['f'])); T[cur]['r'].append(dict(zip(T[cur]['f'],v)))
tk=T['TASK']['r']; ids=[t['task_id'] for t in tk]; codes=[t['task_code'] for t in tk]; gu=[t['guid'] for t in tk]
assert len(set(ids))==len(ids) and len(set(codes))==len(codes) and len(set(gu))==len(gu),'uniq'
idset=set(ids); wb={w['wbs_id'] for w in T['PROJWBS']['r']}
assert all(t['wbs_id'] in wb for t in tk),'wbs fk'
# acyklicznosc
g=collections.defaultdict(list); indeg=collections.Counter()
for p in T['TASKPRED']['r']:
    assert p['task_id'] in idset and p['pred_task_id'] in idset,'pred fk'; g[p['pred_task_id']].append(p['task_id']); indeg[p['task_id']]+=1
q=[i for i in ids if indeg[i]==0]; n=0
while q:
    x=q.pop(); n+=1
    for y in g[x]:
        indeg[y]-=1
        if indeg[y]==0: q.append(y)
assert n==len(ids),'cykl'
D=lambda x: dt.datetime.strptime(x,'%Y-%m-%d %H:%M')
bad=0;byst=collections.Counter()
for t in tk:
    byst[t['status_code']]+=1
    assert D(t['early_end_date'])>=D(t['early_start_date']),t['task_code']
    if t['status_code']=='TK_Complete': assert t['act_start_date'] and t['act_end_date'],'complete bez actual'
    if t['status_code']=='TK_NotStart': assert not t['act_start_date']
    for k in('task_name',):
        pass
dd=D(L[0].split('\t')[2]+' 00:00')
late=sum(1 for t in tk if t['status_code']=='TK_NotStart' and D(t['early_start_date'])<dd)
print(f, 'OK tasks',len(tk),'preds',len(T['TASKPRED']['r']),dict(byst),'notstart-before-dd:',late,'decimal commas:',len(re.findall(r'\t\d+,\d\b',s)),'polish chars:',sum(s.count(c) for c in 'ąćęłńóśźżĄĆĘŁŃÓŚŹŻ'))
