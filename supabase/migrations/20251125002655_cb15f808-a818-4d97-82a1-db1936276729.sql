-- Create enum for inspection status
CREATE TYPE inspection_status AS ENUM ('normal', 'abnormal', 'not_relevant');

-- Create enum for corrective action status
CREATE TYPE corrective_action_status AS ENUM ('กำลังตรวจสอบ', 'ดำเนินการแก้ไข', 'แก้ไขเสร็จสิ้น');

-- Create enum for app roles
CREATE TYPE app_role AS ENUM ('admin', 'user');

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view user roles"
  ON public.user_roles FOR SELECT
  USING (true);

-- Create function to check if user has a role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create inspections table
CREATE TABLE IF NOT EXISTS public.inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  building TEXT NOT NULL,
  division TEXT NOT NULL,
  department TEXT,
  inspector_name TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view inspections"
  ON public.inspections FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create inspections"
  ON public.inspections FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can update inspections"
  ON public.inspections FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete inspections"
  ON public.inspections FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Create corrective_actions table
CREATE TABLE IF NOT EXISTS public.corrective_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID REFERENCES public.inspections(id) ON DELETE CASCADE NOT NULL,
  item_id TEXT NOT NULL,
  building TEXT NOT NULL,
  division TEXT NOT NULL,
  department TEXT,
  category TEXT NOT NULL,
  item_name TEXT NOT NULL,
  responsible TEXT NOT NULL,
  status corrective_action_status NOT NULL DEFAULT 'กำลังตรวจสอบ',
  action_details TEXT,
  action_by TEXT,
  action_date DATE,
  action_images JSONB DEFAULT '[]',
  is_new BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(inspection_id, item_id)
);

ALTER TABLE public.corrective_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view corrective actions"
  ON public.corrective_actions FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create corrective actions"
  ON public.corrective_actions FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update corrective actions"
  ON public.corrective_actions FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Create trigger function to update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_inspections_updated_at
  BEFORE UPDATE ON public.inspections
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_corrective_actions_updated_at
  BEFORE UPDATE ON public.corrective_actions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Enable realtime for inspections and corrective actions
ALTER PUBLICATION supabase_realtime ADD TABLE public.inspections;
ALTER PUBLICATION supabase_realtime ADD TABLE public.corrective_actions;