import { isNativePlatform } from '@/lib/native/platform';

async function triggerHaptic(fn: () => Promise<void>): Promise<void> {
  if (!isNativePlatform()) return;
  try {
    await fn();
  } catch {
    // Haptics are best-effort; ignore failures silently.
  }
}

/** Light tap — primary button presses, navigation. */
export async function hapticLight(): Promise<void> {
  await triggerHaptic(async () => {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle.Light });
  });
}

/** Medium tap — secondary confirmations, seed transactions. */
export async function hapticMedium(): Promise<void> {
  await triggerHaptic(async () => {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle.Medium });
  });
}

/** Heavy impact — milestone unlocks. */
export async function hapticHeavy(): Promise<void> {
  await triggerHaptic(async () => {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle.Heavy });
  });
}

/** Success notification — correct answer. */
export async function hapticSuccess(): Promise<void> {
  await triggerHaptic(async () => {
    const { Haptics, NotificationType } = await import('@capacitor/haptics');
    await Haptics.notification({ type: NotificationType.Success });
  });
}

/** Error notification — incorrect answer. */
export async function hapticError(): Promise<void> {
  await triggerHaptic(async () => {
    const { Haptics, NotificationType } = await import('@capacitor/haptics');
    await Haptics.notification({ type: NotificationType.Error });
  });
}

/** Warning notification — destructive or cautionary actions. */
export async function hapticWarning(): Promise<void> {
  await triggerHaptic(async () => {
    const { Haptics, NotificationType } = await import('@capacitor/haptics');
    await Haptics.notification({ type: NotificationType.Warning });
  });
}
