import test from 'node:test';
import assert from 'node:assert/strict';
import {createScopedStateStorage,stateStorageKey,LEGACY_STATE_KEY} from '../src/lib/state-storage.js';
import {configureStoreScope,installUnitsPrivate,byUnit,getNote,setNote,hydrateRemote,hydrateLayer,getLayerState,exportJSON,importJSON} from '../src/store.js';

const scope={mode:'authenticated',userId:'user-a',orgId:'org-a',propertyId:'property-a'};
const local={mode:'local-review',propertyId:'otb'};
const storage=()=>{
  const values=new Map(),reads=[];
  return {values,reads,getItem(key){reads.push(key);return values.get(key)??null;},setItem(key,value){values.set(key,value);}};
};

test('authenticated boot never reads legacy or scoped browser snapshots',()=>{
  const disk=storage();
  disk.setItem(LEGACY_STATE_KEY,JSON.stringify({version:1,notes:{101:'legacy private note'}}));
  const adapter=createScopedStateStorage({scope,storage:disk});
  adapter.save({notes:{101:'earlier account edit'}});
  assert.deepEqual(adapter.load(),{status:'remote-required'});
  assert.deepEqual(disk.reads,[]);
});

test('local review copies legacy state once without removing or overwriting it',()=>{
  const disk=storage(), legacy=JSON.stringify({version:1,notes:{101:'original'}});
  disk.setItem(LEGACY_STATE_KEY,legacy);
  const adapter=createScopedStateStorage({scope:local,storage:disk});
  assert.equal(adapter.load().status,'legacy-local');
  adapter.save({notes:{101:'review edit'}});
  assert.deepEqual(adapter.load().snapshot,{notes:{101:'review edit'}});
  assert.equal(disk.values.get(LEGACY_STATE_KEY),legacy);
  assert.notEqual(stateStorageKey(local),stateStorageKey({...local,mode:'offline'}));
});

test('account, organization and property changes each have distinct recovery keys',()=>{
  const keys=[scope,{...scope,userId:'user-b'},{...scope,orgId:'org-b'},{...scope,propertyId:'property-b'},local];
  assert.equal(new Set(keys.map(stateStorageKey)).size,keys.length);
  assert.equal(stateStorageKey({...scope,userId:'invalid:scope'}),null);
  assert.equal(createScopedStateStorage().save({notes:{}}).status,'locked');
});

test('remote hydration cannot overwrite the last authenticated user edit on disk',()=>{
  const disk=storage(), adapter=createScopedStateStorage({scope,storage:disk});
  adapter.save({notes:{101:'recoverable'}});
  const before=disk.values.get(stateStorageKey(scope));
  assert.equal(adapter.save({notes:{}},{source:'remote'}).status,'retained');
  assert.equal(disk.values.get(stateStorageKey(scope)),before);
});

test('malformed, wrong-scope and blocked storage do not load state',()=>{
  const disk=storage(), key=stateStorageKey(local),adapter=createScopedStateStorage({scope:local,storage:disk});
  disk.setItem(key,'{');assert.equal(adapter.load().reason,'corrupt-snapshot');
  disk.setItem(key,JSON.stringify({version:2,scope:{...local,mode:'offline'},snapshot:{notes:{101:'other'}}}));
  assert.equal(adapter.load().reason,'wrong-scope');
  const blocked=createScopedStateStorage({scope:local,storage(){throw new Error('blocked');}});
  assert.equal(blocked.load().status,'unavailable');
  assert.equal(blocked.save({notes:{}}).status,'unavailable');
});

test('store scope change clears private unit fields and mutable overrides in place',()=>{
  const disk=storage(), reference=byUnit['101'];
  configureStoreScope(scope,{storage:disk});
  installUnitsPrivate({'101':{legal:'private party',monthly:45678,notes:'private seed'}});
  setNote('101','private override');
  configureStoreScope({...scope,userId:'user-b'},{storage:disk});
  assert.equal(byUnit['101'],reference);
  for (const key of ['legal','monthly','notes']) assert.equal(Object.hasOwn(reference,key),false,key);
  assert.notEqual(getNote('101'),'private override');
  assert.deepEqual(getLayerState('notes'),{});
});

test('empty remote snapshots and deleted remote rows clear memory but retain recovery copies',()=>{
  const disk=storage();configureStoreScope(scope,{storage:disk});
  setNote('101','recover me');
  const before=disk.values.get(stateStorageKey(scope));
  hydrateRemote({});assert.deepEqual(getLayerState('notes'),{});
  assert.equal(disk.values.get(stateStorageKey(scope)),before);
  hydrateRemote({notes:{101:'server'}});hydrateLayer('notes',{});
  assert.deepEqual(getLayerState('notes'),{});
  assert.equal(disk.values.get(stateStorageKey(scope)),before);
});

test('authenticated import rejects unbound and other-property exports before changing state',()=>{
  const disk=storage();configureStoreScope(scope,{storage:disk});
  setNote('101','keep');
  for (const binding of [undefined,local,{...scope,propertyId:'other'}]) {
    assert.throws(()=>importJSON(JSON.stringify({version:1,scope:binding,notes:{101:'replace'}})),/not bound/);
    assert.equal(getNote('101'),'keep');
  }
  const packet=exportJSON();assert.deepEqual(JSON.parse(packet).scope,scope);
  importJSON(packet);assert.equal(getNote('101'),'keep');
  configureStoreScope(null,{storage:disk});
});
