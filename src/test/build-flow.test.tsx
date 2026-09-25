import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SimulatorShell from '@/components/simulator/SimulatorShell';
import { buildExample } from '@/data/workbenchExamples';

const mocks = vi.hoisted(() => ({ invoke: vi.fn(), from: vi.fn(), failure: false, report: null as Record<string, unknown> | null, error: vi.fn(), success: vi.fn(), session: vi.fn() }));
vi.mock('@/lib/localPreview', () => ({ isLocalPreview: false }));
vi.mock('@/lib/invokeAI', () => ({ invokeAI: mocks.invoke }));
vi.mock('@/lib/ensureSession', () => ({ ensureSession: mocks.session }));
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { error: mocks.error, success: mocks.success, info: vi.fn() }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: mocks.from, auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'guest', is_anonymous: true } } } }) } } }));
vi.mock('@/hooks/useVibeStack', () => ({ useVibeStack: () => ({ items: [], add: vi.fn(), hasItem: vi.fn(), togglePin: vi.fn(), remove: vi.fn(), reorder: vi.fn() }) }));
vi.mock('@/components/simulator/VibeStack', () => ({ default: () => null }));
vi.mock('@/components/simulator/SimulatorStepper', () => ({ default: () => null }));
vi.mock('@/components/simulator/IdeaInput', () => ({ default: ({ onSubmit, initialValue }: {onSubmit:(s:string)=>void;initialValue?:string}) => <button onClick={() => onSubmit(initialValue || 'A coaching follow up application')}>Start analysis</button> }));
vi.mock('@/components/simulator/IdeaBrief', () => ({ default: ({ brief }: {brief:{problem:string}}) => <div>{brief.problem}</div> }));
vi.mock('@/components/simulator/FollowUpQuestions', () => ({ default: ({ onSubmit, onSkipToFinal }: {onSubmit:(a:unknown)=>void;onSkipToFinal:(a:unknown)=>void}) => <><button onClick={() => onSubmit({ 0: { selected:['Coaches'], freeText:'Keep the coach in control' } })}>Answer next</button><button onClick={() => onSkipToFinal({ 0:{ selected:['Pilot first'] } })}>Skip to report</button></> }));
vi.mock('@/components/simulator/FinalReport', () => ({ default: ({ rounds, brief, onReSimulate, example }: {rounds:unknown[];brief:typeof buildExample.brief;onReSimulate?:(b:unknown)=>void;example:boolean}) => <div><p>Final rounds: {rounds.length}</p><p>{example ? 'Prepared example report' : 'Live report'}</p><button onClick={() => onReSimulate?.({ ...brief, problem:'Edited coach bottleneck' })}>Refine edited brief</button></div> }));

const question = { question:'Who should try it?', options:[{label:'Coaches',description:'One coach'}], allow_multiple:false };
const response = (final=false) => ({data:{ brief:buildExample.brief, follow_up_questions:[question], is_final:final, ...(final?{lovable_prompt:buildExample.prompt}:{}) },error:null});
function mount(props: React.ComponentProps<typeof SimulatorShell> = {}) { return render(<MemoryRouter><SimulatorShell {...props}/></MemoryRouter>); }
beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear(); mocks.failure=false; mocks.report=null;
  mocks.session.mockResolvedValue('guest');
  mocks.from.mockImplementation(() => {
    const chain: Record<string, unknown> = {};
    for (const method of ['select','eq','insert','update','upsert','limit','single','maybeSingle']) chain[method]=vi.fn(()=>chain);
    chain.throwOnError=vi.fn(async()=>{ if(mocks.failure) throw new Error('write denied'); return {data:mocks.report || {id:'saved-report'},error:null}; });
    return chain;
  });
  mocks.invoke.mockResolvedValue(response());
  vi.stubGlobal('scrollTo', vi.fn());
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('legacy build workflow', () => {
  it('opening an example or prefilled question starts no model run or save', async () => {
    const view=mount({example:true});
    expect(await screen.findByText('Prepared example report')).toBeInTheDocument();
    expect(mocks.invoke).not.toHaveBeenCalled(); expect(mocks.from).not.toHaveBeenCalled();
    expect(localStorage.getItem('vibeco_simulator_draft')).toBeNull();
    view.unmount(); mount({prefillIdea:'A coaching follow up application'});
    expect(screen.getByText('Start analysis')).toBeInTheDocument(); expect(mocks.invoke).not.toHaveBeenCalled();
  });
  it('carries fresh answers through three rounds and saves the same answered history', async () => {
    mocks.invoke.mockResolvedValueOnce(response()).mockResolvedValueOnce(response()).mockResolvedValueOnce(response(true));
    mount(); fireEvent.click(screen.getByText('Start analysis'));
    fireEvent.click(await screen.findByText('Answer next'));
    await waitFor(()=>expect(mocks.invoke).toHaveBeenCalledTimes(2));
    expect(mocks.invoke.mock.calls[1][1].body).toMatchObject({type:'refine',round:2});
    expect(mocks.invoke.mock.calls[1][1].body.history).toContain('Keep the coach in control');
    fireEvent.click(await screen.findByText('Answer next'));
    expect(await screen.findByText('Final rounds: 3')).toBeInTheDocument();
    expect(mocks.invoke.mock.calls[2][1].body.round).toBe(3);
    expect(mocks.invoke.mock.calls[2][1].body.history).toContain('Round 2 Brief');
    await waitFor(()=>expect(JSON.parse(localStorage.getItem('vibeco_simulator_draft')!).rounds[1].answers[0].freeText).toBe('Keep the coach in control'));
    expect(mocks.invoke.mock.calls.every(call=>call[0]==='simulate-idea')).toBe(true);
  });
  it('resumes an in-progress report and uses the correct next round with current answers', async () => {
    mocks.report={id:'resume',idea:buildExample.idea,rounds:[{brief:buildExample.brief,questions:[question]}],status:'in-progress'};
    mount({resumeId:'resume'});
    fireEvent.click(await screen.findByText('Answer next'));
    await waitFor(()=>expect(mocks.invoke).toHaveBeenCalled());
    expect(mocks.invoke.mock.calls[0][1].body.round).toBe(2);
    expect(mocks.invoke.mock.calls[0][1].body.history).toContain('Keep the coach in control');
  });
  it('refines an edited saved report using the new brief instead of a stale closure', async () => {
    mocks.report={id:'resume',idea:buildExample.idea,rounds:[{brief:buildExample.brief,questions:[]}],lovable_prompt:buildExample.prompt,status:'prompt-ready'};
    mocks.invoke.mockResolvedValue(response(true));
    mount({resumeId:'resume'}); fireEvent.click(await screen.findByText('Refine edited brief'));
    await waitFor(()=>expect(mocks.invoke).toHaveBeenCalled());
    expect(mocks.invoke.mock.calls[0][1].body.history).toContain('Edited coach bottleneck');
    expect(await screen.findByText('Final rounds: 2')).toBeInTheDocument();
  });
  it('keeps the report available after save failure and never announces a successful save', async () => {
    mocks.failure=true; mocks.invoke.mockResolvedValue(response(true));
    mount(); fireEvent.click(screen.getByText('Start analysis'));
    expect(await screen.findByText('Live report')).toBeInTheDocument();
    await waitFor(()=>expect(mocks.error).toHaveBeenCalledWith(expect.stringMatching(/not saved|saving failed|backup failed/i)));
    expect(mocks.success).not.toHaveBeenCalledWith(expect.stringMatching(/saved/i));
    expect(localStorage.getItem('vibeco_simulator_draft')).not.toBeNull();
  });
  it('ignores a late response after cancellation', async () => {
    let resolve!: (v:ReturnType<typeof response>)=>void;
    mocks.invoke.mockImplementation(()=>new Promise(r=>{resolve=r;}));
    mount();fireEvent.click(screen.getByText('Start analysis'));fireEvent.click(await screen.findByText('Cancel'));
    resolve(response(true));
    await waitFor(()=>expect(screen.getByText('Start analysis')).toBeInTheDocument());
    expect(screen.queryByText('Live report')).not.toBeInTheDocument();
  });
});
