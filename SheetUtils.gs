// Google Sheets related helper functions

/**
 * スプレッドシートに質問、回答、関連情報を書き込む
 * @param {string} question 質問
 * @param {string} answer 回答 (または編集後のQA全体)
 * @param {string} threadUrl 元のスレッドURL
 * @return {boolean} 書き込み成功時はtrue, 失敗時はfalse
 */
function writeToSpreadsheet_(question, answer, threadUrl) { // 引数を変更
    const spreadsheetId = getScriptProperty_('SPREADSHEET_ID');
    if (!spreadsheetId) {
        Logger.log("SPREADSHEET_ID not found in script properties.");
        return false;
    }
    Logger.log("Spreadsheet ID retrieved."); // 追加

    try {
        Logger.log("Opening spreadsheet..."); // 追加
        const ss = SpreadsheetApp.openById(spreadsheetId);
        // 最初のシートを取得 (シート名を指定する場合は getSheetByName)
        const sheet = ss.getSheets()[0];
        if (!sheet) {
            Logger.log("Spreadsheet does not contain any sheets."); // Loggerに変更
            return false;
        }
        Logger.log("Sheet retrieved: " + sheet.getName()); // 追加

        const timestamp = new Date();

        // 新しい行を追加してデータを書き込む
        // 列の順序: 質問, 回答, スレッドURL, 出力日時
        Logger.log(`Appending row: Q='${question}', A='${answer}', URL='${threadUrl}'`); // ログ変更
        sheet.appendRow([question, answer, threadUrl, timestamp]); // 列順序を変更
        Logger.log("Successfully appended row to spreadsheet.");
        return true;

    } catch (error) {
        Logger.log("Error writing to spreadsheet: " + error); // Loggerに変更
        Logger.log("Error stack: " + error.stack); // スタックトレース追加
        return false;
    }
}
