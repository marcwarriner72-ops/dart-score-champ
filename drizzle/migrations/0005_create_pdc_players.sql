CREATE TABLE public.pdc_players (
  player_id text PRIMARY KEY,
  name text NOT NULL,
  nickname text,
  country_code text,
  merit_ranking integer,
  wiki_title text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pdc_players TO authenticated;
GRANT ALL ON public.pdc_players TO service_role;
ALTER TABLE public.pdc_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "players readable" ON public.pdc_players FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins insert players" ON public.pdc_players FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins update players" ON public.pdc_players FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins delete players" ON public.pdc_players FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
INSERT INTO public.pdc_players (player_id,name,nickname,country_code,merit_ranking,wiki_title) VALUES
('luke-littler','Luke Littler','The Nuke','GB-ENG',1,'Luke_Littler'),
('luke-humphries','Luke Humphries','Cool Hand Luke','GB-ENG',2,'Luke_Humphries'),
('michael-van-gerwen','Michael van Gerwen','Mighty Mike','NL',3,'Michael_van_Gerwen'),
('stephen-bunting','Stephen Bunting','The Bullet','GB-ENG',4,'Stephen_Bunting'),
('gerwyn-price','Gerwyn Price','The Iceman','GB-WLS',5,'Gerwyn_Price'),
('jonny-clayton','Jonny Clayton','The Ferret','GB-WLS',6,'Jonny_Clayton'),
('rob-cross','Rob Cross','Voltage','GB-ENG',7,'Rob_Cross_(darts_player)'),
('danny-noppert','Danny Noppert','The Freeze','NL',8,'Danny_Noppert'),
('gian-van-veen','Gian van Veen','The Giant','NL',9,'Gian_van_Veen'),
('josh-rock','Josh Rock','Rocky','GB-NIR',10,'Josh_Rock'),
('james-wade','James Wade','The Machine','GB-ENG',11,'James_Wade'),
('chris-dobey','Chris Dobey','Hollywood','GB-ENG',12,'Chris_Dobey'),
('nathan-aspinall','Nathan Aspinall','The Asp','GB-ENG',13,'Nathan_Aspinall'),
('ross-smith','Ross Smith','Smudger','GB-ENG',14,'Ross_Smith_(darts_player)'),
('damon-heta','Damon Heta','The Heat','AU',15,'Damon_Heta'),
('peter-wright','Peter Wright','Snakebite','GB-SCT',16,'Peter_Wright_(darts_player)'),
('dave-chisnall','Dave Chisnall','Chizzy','GB-ENG',17,'Dave_Chisnall'),
('martin-schindler','Martin Schindler','The Wall','DE',18,'Martin_Schindler'),
('dimitri-van-den-bergh','Dimitri Van den Bergh','The DreamMaker','BE',19,'Dimitri_Van_den_Bergh'),
('ryan-searle','Ryan Searle','Heavy Metal','GB-ENG',20,'Ryan_Searle'),
('mike-de-decker','Mike De Decker','The Real Deal','BE',21,'Mike_De_Decker'),
('daryl-gurney','Daryl Gurney','Superchin','GB-NIR',22,'Daryl_Gurney'),
('gary-anderson','Gary Anderson','The Flying Scotsman','GB-SCT',23,'Gary_Anderson_(darts_player)'),
('michael-smith','Michael Smith','Bully Boy','GB-ENG',24,'Michael_Smith_(darts_player)');