import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FinalReport from '@/components/simulator/FinalReport';
import { buildExample } from '@/data/workbenchExamples';
const mocks=vi.hoisted(()=>({invoke:vi.fn(),share:vi.fn(),copy:vi.fn(),role:vi.fn(),error:vi.fn(),success:vi.fn(),pdf:vi.fn(),pdfBytes:null as ArrayBuffer|null}));
vi.mock('@/lib/localPreview',()=>({isLocalPreview:false}));
vi.mock('@/lib/invokeAI',()=>({invokeAI:mocks.invoke}));
vi.mock('@/lib/workbench',()=>({setSharing:mocks.share}));
vi.mock('@/lib/copyToClipboard',()=>({copyToClipboard:mocks.copy}));
vi.mock('@/hooks/useUserRole',()=>({useUserRole:(enabled:boolean)=>{mocks.role(enabled);return {isPremium:false};}}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{}}));
vi.mock('sonner',()=>({toast:Object.assign(vi.fn(),{error:mocks.error,success:mocks.success})}));
vi.mock('@/components/simulator/ThunderdomePanel',()=>({default:()=> <button onClick={()=>mocks.invoke('persona-perspective')}>Run a perspective</button>}));
vi.mock('@/components/simulator/ActionHub',()=>({default:()=> <button onClick={()=>mocks.invoke('generate-alt-prompt')}>Create research prompt</button>}));
vi.mock('@/components/simulator/SynthesisPanel',()=>({default:()=> <button onClick={()=>mocks.invoke('orchestrate')}>Compare perspectives</button>}));
vi.mock('jspdf',async original=>{
  const actual=await original<typeof import('jspdf')>();
  function CapturePDF(options:ConstructorParameters<typeof actual.jsPDF>[0]) {
    const pdf=new actual.jsPDF(options);
    pdf.save=((filename:string)=>{mocks.pdf(filename);mocks.pdfBytes=pdf.output('arraybuffer');return pdf;}) as typeof pdf.save;
    return pdf;
  }
  return {...actual,jsPDF:CapturePDF};
});
function mount(example=false) {return render(<MemoryRouter><FinalReport brief={buildExample.brief} idea={buildExample.idea} rounds={[{brief:buildExample.brief,questions:[]}]} lovablePrompt={buildExample.prompt} onRestart={vi.fn()} reportId="private-report" example={example}/></MemoryRouter>);}
beforeEach(()=>{
  vi.clearAllMocks();mocks.pdfBytes=null;mocks.copy.mockResolvedValue(true);mocks.share.mockResolvedValue(undefined);
  mocks.invoke.mockResolvedValue({data:null,error:new Error('Provider offline')});
  vi.stubGlobal('IntersectionObserver',class{observe(){}disconnect(){}});
});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});

describe('build report actions',()=>{
  it('opens and copies a prompt without automatic grading or an email gate',async()=>{
    mount();expect(screen.queryByPlaceholderText(/email/i)).not.toBeInTheDocument();expect(mocks.invoke).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Copy prompt'));await waitFor(()=>expect(mocks.copy).toHaveBeenCalledWith(buildExample.prompt));
    expect(mocks.invoke).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Check prompt quality'));await waitFor(()=>expect(mocks.invoke).toHaveBeenCalledWith('grade-prompt',expect.anything()));
    await waitFor(()=>expect(mocks.error).toHaveBeenCalledWith('Provider offline'));
  });
  it('enables public access explicitly before copying and can revoke it',async()=>{
    mount();expect(mocks.share).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Enable public link'));await waitFor(()=>expect(mocks.share).toHaveBeenCalledWith('private-report',true));
    await waitFor(()=>expect(mocks.copy).toHaveBeenCalledWith(expect.stringContaining('/report/private-report')));
    fireEvent.click(screen.getByText('Turn off sharing'));await waitFor(()=>expect(mocks.share).toHaveBeenLastCalledWith('private-report',false));
  });
  it('does not copy or announce a share when the owner check/write fails',async()=>{
    mocks.share.mockRejectedValue(new Error('Create an account before sharing a report.'));
    mount();fireEvent.click(screen.getByText('Enable public link'));
    await waitFor(()=>expect(mocks.error).toHaveBeenCalledWith('Create an account before sharing a report.'));
    expect(mocks.copy).not.toHaveBeenCalled();expect(mocks.success).not.toHaveBeenCalled();
  });
  it('exports a real PDF immediately, including prompt and evidence boundary',async()=>{
    mount();fireEvent.click(screen.getByText('PDF'));
    await waitFor(()=>expect(mocks.pdf).toHaveBeenCalledWith(expect.stringMatching(/\.pdf$/)));
    const bytes=String.fromCharCode(...new Uint8Array(mocks.pdfBytes!));
    expect(bytes.startsWith('%PDF-')).toBe(true);expect(bytes).toContain('YOUR LOVABLE PROMPT');expect(bytes).toContain('AI-generated analysis');
  });
  it('keeps a worked example readable/exportable but disables all model tools and sharing',async()=>{
    mount(true);expect(screen.getByRole('heading',{level:1})).toBeInTheDocument();
    expect(mocks.role).toHaveBeenCalledWith(false);expect(mocks.invoke).not.toHaveBeenCalled();
    expect(screen.queryByText('Enable public link')).not.toBeInTheDocument();
    expect(screen.queryByText('Check prompt quality')).not.toBeInTheDocument();
    expect(screen.getByText('Compare perspectives')).toBeDisabled();expect(screen.getByText('Run a perspective')).toBeDisabled();
    fireEvent.click(screen.getByText('PDF'));expect(mocks.pdf).toHaveBeenCalled();
    expect(mocks.invoke).not.toHaveBeenCalled();expect(mocks.share).not.toHaveBeenCalled();
  });
});
