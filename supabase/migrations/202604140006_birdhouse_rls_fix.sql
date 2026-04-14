alter policy "Users can update their own birdhouse"
  on public.birdhouse
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
