import { supabase } from "@/integrations/supabase/client";
import { ensureSession } from "./ensureSession";
import { isLocalPreview } from "./localPreview";

/** One intentional entry point for guest creation and provider calls. */
export const invokeAI: typeof supabase.functions.invoke = async (
  name,
  options,
) => {
  if (isLocalPreview)
    return {
      data: null,
      error: new Error(
        "Live analysis is disconnected in this preview. Explore a worked example instead.",
      ),
    };
  const userId = await ensureSession();
  if (!userId)
    return {
      data: null,
      error: new Error(
        "Your private guest session could not start. Your input is preserved; please try again.",
      ),
    };
  const result = await supabase.functions.invoke(name, options);
  if (result.error?.context instanceof Response) {
    try {
      const detail = await result.error.context.clone().json();
      if (typeof detail.error === "string") result.error.message = detail.error;
    } catch {
      /* retain original provider error */
    }
  }
  return result;
};
