export async function surnameSelect(): Promise<string | { error: string }> {
  try {
    const response = await fetch(
      'https://randomuser.me/api/?nat=us,dk,fr,gb,de,es,ca,mx',
      { signal: AbortSignal.timeout(8000) }
    );
    const data = await response.json();
    return data.results[0].name.last as string;
  } catch {
    console.log('surname call timed out');
    return { error: 'surname call timed out' };
  }
}
