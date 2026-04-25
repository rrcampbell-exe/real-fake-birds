import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

vi.mock('@capacitor/app', () => ({
  App: {
    addListener: vi.fn(),
    exitApp: vi.fn(),
  },
}));

import { useRouter } from 'next/navigation';
import { App } from '@capacitor/app';
import NativeBackHandler from './NativeBackHandler';

type BackButtonCallback = (data: { canGoBack: boolean }) => void;

function setAndroidCapacitor() {
  (window as Window & { Capacitor?: unknown }).Capacitor = {
    isNativePlatform: () => true,
    getPlatform: () => 'android',
  };
}

describe('NativeBackHandler', () => {
  const mockBack = vi.fn();

  beforeEach(() => {
    delete (window as Window & { Capacitor?: unknown }).Capacitor;
    mockBack.mockReset();
    vi.mocked(useRouter).mockReturnValue({ back: mockBack } as ReturnType<typeof useRouter>);
    vi.mocked(App.addListener).mockResolvedValue({ remove: vi.fn() } as never);
    vi.mocked(App.exitApp).mockResolvedValue(undefined);
  });

  it('renders null', () => {
    const { container } = render(<NativeBackHandler />);
    expect(container.firstChild).toBeNull();
  });

  it('does not register a listener when Capacitor is absent', async () => {
    render(<NativeBackHandler />);
    await act(async () => {});
    expect(App.addListener).not.toHaveBeenCalled();
  });

  it('does not register a listener on non-Android platforms', async () => {
    (window as Window & { Capacitor?: unknown }).Capacitor = {
      isNativePlatform: () => true,
      getPlatform: () => 'ios',
    };

    render(<NativeBackHandler />);
    await act(async () => {});

    expect(App.addListener).not.toHaveBeenCalled();
  });

  it('registers a backButton listener when running on Android', async () => {
    setAndroidCapacitor();

    render(<NativeBackHandler />);
    await act(async () => {});

    expect(App.addListener).toHaveBeenCalledWith('backButton', expect.any(Function));
  });

  it('calls router.back() when canGoBack is true', async () => {
    setAndroidCapacitor();

    let capturedCb: BackButtonCallback | undefined;
    vi.mocked(App.addListener).mockImplementation(async (_event, cb) => {
      capturedCb = cb as BackButtonCallback;
      return { remove: vi.fn() } as never;
    });

    render(<NativeBackHandler />);
    await act(async () => {});

    capturedCb?.({ canGoBack: true });
    expect(mockBack).toHaveBeenCalled();
  });

  it('calls App.exitApp() when canGoBack is false', async () => {
    setAndroidCapacitor();

    let capturedCb: BackButtonCallback | undefined;
    vi.mocked(App.addListener).mockImplementation(async (_event, cb) => {
      capturedCb = cb as BackButtonCallback;
      return { remove: vi.fn() } as never;
    });

    render(<NativeBackHandler />);
    await act(async () => {});

    capturedCb?.({ canGoBack: false });
    expect(App.exitApp).toHaveBeenCalled();
  });

  it('removes the listener when the component unmounts', async () => {
    setAndroidCapacitor();

    const mockRemove = vi.fn();
    vi.mocked(App.addListener).mockResolvedValue({ remove: mockRemove } as never);

    const { unmount } = render(<NativeBackHandler />);
    await act(async () => {});

    unmount();
    expect(mockRemove).toHaveBeenCalled();
  });
});
