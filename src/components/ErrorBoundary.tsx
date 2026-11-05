/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Catches a render-time throw anywhere below it and shows a way back.
 *
 * Without this, one bad render unmounts the whole tree and the player is left
 * staring at a blank page with the audio engine still running and nothing to
 * click. A class component because React still has no hook equivalent for
 * `getDerivedStateFromError` / `componentDidCatch`.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // No error reporting is wired into this build; keep the component stack in
    // the console so a field report is diagnosable.
    console.error('[ErrorBoundary] render failed:', error, info.componentStack);
  }

  private handleReload = (): void => {
    try {
      window.location.reload();
    } catch {
      /* embedded contexts can block navigation; nothing else to try */
    }
  };

  render(): React.ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="app-shell">
        <main className="screen-main">
          <div className="stage">
            <div className="crash" role="alert">
              <span className="crash__kicker">Absürt Tramvay İkilemleri</span>
              <h1 className="crash__title">Bir şeyler ters gitti</h1>
              <p className="crash__text">
                Tramvay raydan çıktı. Sayfayı yenilersen ikilemler baştan başlayacak;
                ses ayarların tarayıcında saklı olduğu için korunur.
              </p>
              <button type="button" className="btn btn--primary" onClick={this.handleReload}>
                <span>Yeniden yükle</span>
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }
}
