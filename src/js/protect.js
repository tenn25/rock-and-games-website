/**
 * 画像の保存抑止（casual deterrent）
 * -----------------------------------------------------------------
 * 画像上での「右クリック→名前を付けて画像を保存」と「ドラッグ保存」を抑止する。
 * ※ 開発者ツール・キャッシュ・スクリーンショットには効果がない簡易対策。
 *    確実な保護は画像への透かし焼き込みで担保する。
 * 右クリック抑止は画像に限定し、リンクやテキストの右クリックUXは壊さない。
 */
(function () {
    'use strict';

    // 画像上での右クリック（コンテキストメニュー）を抑止
    document.addEventListener('contextmenu', function (e) {
        if (e.target && e.target.tagName === 'IMG') {
            e.preventDefault();
        }
    });

    // 画像のドラッグ開始を抑止（デスクトップへのドラッグ保存対策）
    document.addEventListener('dragstart', function (e) {
        if (e.target && e.target.tagName === 'IMG') {
            e.preventDefault();
        }
    });
})();
