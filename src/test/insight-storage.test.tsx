import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { useVibeStack, type StackItem } from '@/hooks/useVibeStack';
const mocks=vi.hoisted(()=>({from:vi.fn(),error:vi.fn(),fail:false,saved:[] as Record<string,unknown>[],writes:[] as Record<string,unknown>[]}));
vi.mock('@/lib/localPreview',()=>({isLocalPreview:false}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{from:mocks.from}}));
vi.mock('sonner',()=>({toast:{error:mocks.error}}));
const item:StackItem={id:'local-item',report_id:'',kind:'note',source:null,label:'Check this',content:'A useful question',position:0,pinned:false,deleted_at:null,created_at:'2026-09-25T12:00:00Z',round:2};
beforeEach(()=>{
  localStorage.clear();vi.clearAllMocks();mocks.fail=false;mocks.saved=[];mocks.writes=[];
  mocks.from.mockImplementation(()=>{
    let operation='read';let payload:Record<string,unknown>[]=[];let singular=false;
    const result=()=>({data:operation==='read'?mocks.saved:singular?{...item,...payload[0]}:payload,error:mocks.fail&&operation!=='read'?new Error('write failed'):null});
    const chain:Record<string,unknown>={};
    for(const name of ['select','eq','is','order'])chain[name]=()=>chain;
    for(const name of ['insert','upsert','update'])chain[name]=(value:Record<string,unknown>|Record<string,unknown>[])=>{operation=name;payload=Array.isArray(value)?value:[value];mocks.writes.push(...payload);return chain;};
    chain.single=()=>{singular=true;return chain;};
    chain.then=(resolve:(v:ReturnType<typeof result>)=>unknown,reject:(r:unknown)=>unknown)=>Promise.resolve(result()).then(resolve,reject);
    return chain;
  });
});
afterEach(cleanup);
describe('insight persistence',()=>{
  it('isolates prepared examples from browser drafts and cloud writes',async()=>{
    localStorage.setItem('vibeco_stack_local',JSON.stringify([item]));
    const {result}=renderHook(()=>useVibeStack('report',{ephemeral:true,localScope:'sample'}));
    expect(result.current.items).toEqual([]);
    await act(async()=>{await result.current.add({kind:'note',label:'Example',content:'Ephemeral'});});
    expect(mocks.from).not.toHaveBeenCalled();expect(localStorage.getItem('vibeco_stack_local_sample')).toBeNull();
    expect(JSON.parse(localStorage.getItem('vibeco_stack_local')!)).toEqual([item]);
  });
  it('carries local insights into the same report when it gains a saved ID',async()=>{
    localStorage.setItem('vibeco_stack_local_session',JSON.stringify([item]));
    const {result,rerender}=renderHook(({id}:{id:string|null})=>useVibeStack(id,{localScope:'session'}),{initialProps:{id:null}});
    await waitFor(()=>expect(result.current.items).toHaveLength(1));
    rerender({id:'new-report'});
    await waitFor(()=>expect(mocks.writes).toHaveLength(1));
    await waitFor(()=>expect(result.current.items[0].report_id).toBe('new-report'));
    expect(result.current.items[0].round).toBe(2);expect(localStorage.getItem('vibeco_stack_local_session')).toBeNull();
  });
  it('preserves a draft and reports migration failure rather than dropping insights',async()=>{
    mocks.fail=true;localStorage.setItem('vibeco_stack_local_session',JSON.stringify([item]));
    const {result}=renderHook(()=>useVibeStack('new-report',{localScope:'session'}));
    await waitFor(()=>expect(mocks.error).toHaveBeenCalled());
    expect(result.current.items[0].id).toBe(item.id);expect(localStorage.getItem('vibeco_stack_local_session')).not.toBeNull();
  });
  it('does not remove or pin an insight when the database rejects the mutation',async()=>{
    mocks.saved=[{...item,report_id:'report'}];mocks.fail=true;
    const {result}=renderHook(()=>useVibeStack('report'));
    await waitFor(()=>expect(result.current.items).toHaveLength(1));
    await act(async()=>{await result.current.remove(item.id);});expect(result.current.items).toHaveLength(1);
    await act(async()=>{await result.current.togglePin(item.id);});expect(result.current.items[0].pinned).toBe(false);
    expect(mocks.error).toHaveBeenCalledWith('Insight was not removed. Please try again.');
  });
});
