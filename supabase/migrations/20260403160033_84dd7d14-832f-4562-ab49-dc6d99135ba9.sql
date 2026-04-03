
CREATE TABLE public.work_experiences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  company TEXT NOT NULL DEFAULT '',
  period TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.work_experiences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Work experiences viewable by everyone"
ON public.work_experiences FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own work experiences"
ON public.work_experiences FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own work experiences"
ON public.work_experiences FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own work experiences"
ON public.work_experiences FOR DELETE
USING (auth.uid() = user_id);

CREATE TRIGGER update_work_experiences_updated_at
BEFORE UPDATE ON public.work_experiences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
