-- Allow authenticated users to delete corrective actions
CREATE POLICY "Authenticated users can delete corrective actions" 
ON public.corrective_actions 
FOR DELETE 
USING (auth.uid() IS NOT NULL);