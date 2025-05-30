// Generated by GitHub Copilot

import { useState, useEffect, useCallback } from 'react';

/**
 * コンテナ要素の高さを画面に合わせて動的に調整するカスタムフック
 * @param {Object} options オプション
 * @param {React.RefObject} options.containerRef コンテナ要素への参照
 * @param {number} options.bufferPx 余白として確保する領域（ピクセル）
 * @param {number} options.minHeight 最小の高さ（ピクセル）
 * @param {Array} options.dependencies 計算を再実行するための依存配列（オプション）
 * @returns {string} 計算された高さ（CSSの値として適用可能な文字列）
 */
export function useAdaptiveHeight({ 
  containerRef, 
  bufferPx = 40, 
  minHeight = 300,
  dependencies = []
}) {
  // 計算されたコンテナの高さを保持するstate
  const [containerHeight, setContainerHeight] = useState('auto');

  /**
   * コンテナの最適な高さを計算する
   * 画面の高さからコンテナ上部の位置とフッターの高さを考慮して計算
   */
  const calculateContainerHeight = useCallback(() => {
    // サーバーサイドレンダリング時やコンテナ参照がない場合は処理しない
    if (typeof window === 'undefined' || !containerRef.current) return;
    
    // コンテナ要素の上部位置を取得（ヘッダーや上部UI要素を含む）
    const containerTop = containerRef.current.getBoundingClientRect().top;
    
    // フッターの高さを取得
    const footerElement = document.querySelector('footer');
    const footerHeight = footerElement ? footerElement.offsetHeight : 0;
    
    // 利用可能な高さを計算 = ウィンドウの高さ - (上部要素の高さ + フッターの高さ + バッファ)
    const availableHeight = window.innerHeight - (containerTop + footerHeight + bufferPx);
    
    // 最小の高さを確保した計算結果
    const calculatedHeight = Math.max(availableHeight, minHeight);
    
    // 計算結果をCSSで使用可能な形式で設定
    setContainerHeight(`${calculatedHeight}px`);
  }, [containerRef, bufferPx, minHeight]);

  // 初回レンダリング時と依存配列の値が変わった時に高さを再計算
  useEffect(() => {
    // クライアントサイドでのみ実行
    if (typeof window !== 'undefined') {
      // 初期計算（DOMが完全に読み込まれた後）
      const timer = setTimeout(calculateContainerHeight, 100);
      
      // リサイズイベントのリスナー
      window.addEventListener('resize', calculateContainerHeight);
      
      // クリーンアップ関数
      return () => {
        window.removeEventListener('resize', calculateContainerHeight);
        clearTimeout(timer);
      };
    }
  }, [calculateContainerHeight, ...dependencies]);

  return containerHeight;
}