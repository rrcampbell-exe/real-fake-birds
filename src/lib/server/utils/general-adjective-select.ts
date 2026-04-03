export async function generalAdjectiveSelect(
  birdType: string
): Promise<string | { error: string }> {
  const validatedBirdType = birdType.substring(birdType.indexOf(' ') + 1);
  try {
    const response = await fetch(
      `https://api.datamuse.com/words?rel_jjb=${encodeURIComponent(validatedBirdType)}`,
      { signal: AbortSignal.timeout(8000) }
    );
    const data: { word: string }[] = await response.json();
    if (data.length === 0) {
      return { error: 'adjective call timed out' };
    }
    const adjVal = Math.floor(Math.random() * data.length);
    const adjective = data[adjVal].word;
    return adjective.charAt(0).toUpperCase() + adjective.slice(1);
  } catch {
    console.log('adjective call timed out');
    return { error: 'adjective call timed out' };
  }
}
