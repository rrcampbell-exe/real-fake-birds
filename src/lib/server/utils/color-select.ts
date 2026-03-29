export async function colorSelect(): Promise<string | { error: string }> {
  const colorVal = Math.floor(Math.random() * 1000000);
  try {
    const response = await fetch(
      `https://www.thecolorapi.com/id?hex=${colorVal}`,
      { signal: AbortSignal.timeout(8000) }
    );
    const data = await response.json();
    return data.name.value as string;
  } catch {
    console.log('color call timed out');
    return { error: 'color call timed out' };
  }
}
