// Utility functions

/**
 * スクリプトプロパティを取得する（エラーハンドリング付き）
 * @param {string} key プロパティキー
 * @return {string|null} プロパティ値、存在しない/エラー時はnull
 */
function getScriptProperty_(key) {
    try {
        const value = PropertiesService.getScriptProperties().getProperty(key);
        if (!value) {
            Logger.log(`Script property "${key}" is not set.`);
            return null;
        }
        // Logger.log(`Retrieved script property "${key}"`);
        return value;
    } catch (error) {
        Logger.log(`Error getting script property "${key}": ` + error);
        return null;
    }
}

/**
 * 承認プロンプトをトリガーするためのダミー関数
 */
function forceAuthorization() {
  Logger.log("Requesting authorization...");
  UrlFetchApp.fetch("https://example.com"); // 外部リクエストを試みる
  SpreadsheetApp.getActiveSpreadsheet(); // スプレッドシートアクセスを試みる
  Logger.log("Authorization should be granted if no error occurred.");
}
