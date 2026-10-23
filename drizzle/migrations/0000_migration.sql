-- Profiles (app account)
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- Planned Instagram profiles (many per user)
CREATE TABLE public.ig_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  username text NOT NULL DEFAULT 'username',
  full_name text NOT NULL DEFAULT '',
  bio text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT '',
  link text NOT NULL DEFAULT '',
  avatar_url text,
  followers text NOT NULL DEFAULT '0',
  following text NOT NULL DEFAULT '0',
  posts_count_override text,
  is_verified boolean NOT NULL DEFAULT false,
  source text NOT NULL DEFAULT 'manual',
  external_account_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ig_profiles TO authenticated;
GRANT ALL ON public.ig_profiles TO service_role;
ALTER TABLE public.ig_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ig_profiles" ON public.ig_profiles FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX ig_profiles_user_idx ON public.ig_profiles(user_id);
CREATE TRIGGER ig_profiles_touch BEFORE UPDATE ON public.ig_profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Grid items: posts, reels, carousels
CREATE TABLE public.ig_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.ig_profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'post' CHECK (kind IN ('post','reel','carousel')),
  media_urls text[] NOT NULL DEFAULT '{}',
  cover_url text,
  caption text NOT NULL DEFAULT '',
  position integer NOT NULL DEFAULT 0,
  pinned boolean NOT NULL DEFAULT false,
  show_in_grid boolean NOT NULL DEFAULT true,
  external_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ig_posts TO authenticated;
GRANT ALL ON public.ig_posts TO service_role;
ALTER TABLE public.ig_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ig_posts" ON public.ig_posts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX ig_posts_profile_idx ON public.ig_posts(profile_id, position);
CREATE TRIGGER ig_posts_touch BEFORE UPDATE ON public.ig_posts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Story highlights
CREATE TABLE public.ig_highlights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.ig_profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'Highlight',
  cover_url text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ig_highlights TO authenticated;
GRANT ALL ON public.ig_highlights TO service_role;
ALTER TABLE public.ig_highlights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ig_highlights" ON public.ig_highlights FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX ig_highlights_profile_idx ON public.ig_highlights(profile_id, position);

-- Media storage policies (bucket 'media', files under <user_id>/...)
CREATE POLICY "media public read" ON storage.objects FOR SELECT USING (bucket_id = 'media');
CREATE POLICY "media own insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "media own update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "media own delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text);