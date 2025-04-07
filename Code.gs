/**
 * @OnlyCurrentDoc
 */

// --- Configuration ---
// スクリプトプロパティに必要なキーを設定してください:
// - SLACK_BOT_TOKEN: SlackアプリのBot User OAuth Token
// - GEMINI_API_KEY: Gemini APIキー
// - SPREADSHEET_ID: 出力先スプレッドシートのID
// - SLACK_SIGNING_SECRET: (オプション) Slackリクエスト検証用

    // --- Main Handler ---

    function doPost(e) {
      try { // doPost全体をtry...catchで囲む
        // SlackからのPOSTリクエストを処理する関数
        Logger.log("Received POST request:");
        // Logger.log(JSON.stringify(e)); // デバッグ用に必要に応じて有効化

        // Slackにチャレンジリクエストへの応答を返す (初回認証用)
        if (e.parameter && e.parameter.challenge) {
          Logger.log("Responding to challenge request");
          return ContentService.createTextOutput(e.parameter.challenge);
        }

        // TODO: Slackリクエスト検証 (Signing Secretを使用) - セキュリティ向上のために推奨

        // Interaction Payloadの処理
        if (e.parameter && e.parameter.payload) {
          try {
            const payload = JSON.parse(e.parameter.payload);
            const user = payload.user; // ユーザー情報を取得
            Logger.log(`Received interaction payload type: ${payload.type} from user: ${user.id}`);
            // Logger.log(JSON.stringify(payload)); // デバッグ用

            // イベントタイプに応じて処理を分岐
            if (payload.type === 'shortcut' || payload.type === 'message_action') { // ショートカット or メッセージアクション
              handleShortcut(payload);
            } else if (payload.type === 'view_submission') { // モーダル送信
              handleViewSubmission(payload);
            } else if (payload.type === 'block_actions') { // ボタンクリックなど
              handleBlockActions(payload);
            }
            // 他のインタラクションタイプも必要に応じて追加

            // Slackへの応答（通常は空でOK、3秒以内に返す必要あり）
            Logger.log("Interaction processed successfully. Returning empty response to Slack.");
            return ContentService.createTextOutput();

          } catch (error) {
            Logger.log("Error processing interaction payload: " + error);
            Logger.log("Payload string: " + e.parameter.payload);
            Logger.log("Error stack: " + error.stack);
            // エラー発生時もSlackには応答を返す
            return ContentService.createTextOutput();
          }
        }

        // Event API の処理 (event_callbackなど) - 今回は主にインタラクションを使うため詳細は省略
        if (e.postData && e.postData.contents) {
            try {
                const eventPayload = JSON.parse(e.postData.contents);
                Logger.log("Received event payload type: " + eventPayload.type);
                // Logger.log(JSON.stringify(eventPayload)); // デバッグ用

                if (eventPayload.type === 'event_callback') {
                    // handleEventCallback(eventPayload);
                }
                // URL Verification用 (doPostのchallengeと同様)
                if (eventPayload.type === 'url_verification') {
                    return ContentService.createTextOutput(eventPayload.challenge);
                }
            } catch (error) {
                Logger.log("Error processing event payload: " + error);
                Logger.log("Payload string: " + e.postData.contents);
                Logger.log("Error stack: " + error.stack);
            }
        }

        // 上記いずれにも該当しない場合 (または処理が終わった後)
        Logger.log("No specific handler executed or processing complete.");
        // 通常、Slackへの応答は各ハンドラで行うか、早期リターンするので、ここは呼ばれないことが多い
        // フォールバックとしてOKを返す
        return ContentService.createTextOutput("OK");

      } catch (outerError) { // doPost全体のcatchブロック
        Logger.log("!!! Critical error in doPost: " + outerError);
        Logger.log("Error stack: " + outerError.stack);
        // クリティカルエラー時もSlackには応答を試みる (ただし失敗する可能性あり)
        try {
          return ContentService.createTextOutput("An internal error occurred.");
        } catch (responseError) {
          Logger.log("Failed to send error response to Slack: " + responseError);
        }
      }
    }


    // --- Interaction Handlers ---

    function handleShortcut(payload) {
      Logger.log("--- handleShortcut START ---");
      Logger.log("Payload received:", JSON.stringify(payload));
      const triggerId = payload.trigger_id;
      // メッセージアクションの場合、メッセージ情報が含まれる
      const channelId = payload.channel ? payload.channel.id : null;
      const messageTs = payload.message ? payload.message.ts : null;
      const callbackId = payload.callback_id; // Slackアプリ設定で定義したID
      const teamDomain = payload.team ? payload.team.domain : null;
      const userId = payload.user ? payload.user.id : null;

      // スレッドの起点となるタイムスタンプを取得
      const threadTs = payload.message.thread_ts || messageTs; // thread_tsがあればそれを、なければ自身のtsを使う
      Logger.log(`Callback ID: ${callbackId}, Channel: ${channelId}, Message TS: ${messageTs}, Thread TS: ${threadTs}, User: ${userId}, Team Domain: ${teamDomain}`);

      if (channelId && threadTs && teamDomain && userId) { // threadTs をチェック
        Logger.log("Sufficient context found. Calling openSummaryModal...");
        // メッセージコンテキストがある場合のみモーダルを開く (threadTs を渡す)
        openSummaryModal(triggerId, channelId, threadTs, teamDomain, userId);
      } else {
        Logger.log("Shortcut triggered without sufficient context. Ignoring.");
        // 必要であればユーザーに通知する処理を追加
        if (userId && channelId) {
            notifyUserError_(userId, channelId, "メッセージコンテキストが見つからないため、処理を開始できませんでした。");
        }
         Logger.log("--- handleShortcut END (Insufficient context) ---");
      }
       Logger.log("--- handleShortcut END ---");
    }

    function handleViewSubmission(payload) {
      Logger.log("Handling view submission...");
      const view = payload.view;
      const values = view.state.values;
      const privateMetadata = JSON.parse(view.private_metadata || '{}'); // モーダルを開く際に渡した情報
      const callbackId = view.callback_id; // モーダル定義時のcallback_id
      const userId = payload.user ? payload.user.id : null;
      const channelId = privateMetadata.channelId; // メタデータから取得

      // ここで callback_id をチェックして、適切なアクションを実行
      // 例: if (callbackId === 'summary_modal_submit') { ... }
      Logger.log(`View Callback ID: ${callbackId}, User: ${userId}`);

      if (callbackId === 'summary_modal_submit') {
        try {
          // モーダルから質問と回答を取得
          const originalThreadUrl = privateMetadata.threadUrl;
          const question = values.question_block.question_input.value;
          const answer = values.answer_block.answer_input.value;

          // スプレッドシートに書き込み
          const success = writeToSpreadsheet_(question, answer, originalThreadUrl); // 分割したQとAを渡す

          if (success) {
              Logger.log("Successfully processed view submission and wrote to spreadsheet.");
              // 必要であればユーザーに成功を通知
              // notifyUserSuccess_(userId, channelId, "スプレッドシートへの書き込みが完了しました。");
          } else {
              Logger.log("Failed to write to spreadsheet.");
              if (userId && channelId) {
                notifyUserError_(userId, channelId, "スプレッドシートへの書き込みに失敗しました。");
              }
          }

          // モーダルを閉じるなどの応答は不要 (view_submission では空の応答でOK)

        } catch (error) {
          Logger.log("Error processing view submission values: " + error);
          Logger.log("View state values: " + JSON.stringify(values));
          Logger.log("Error stack: " + error.stack);
          // 必要であればユーザーにエラーを通知する処理を追加
          if (userId && channelId) {
            notifyUserError_(userId, channelId, "送信されたデータの処理中にエラーが発生しました。");
          }
        }
      } else {
          Logger.log(`Unhandled view callback ID: ${callbackId}`);
      }
    }

    function handleBlockActions(payload) {
        Logger.log("Handling block actions...");
        // ボタンクリックなどのインタラクションを処理
        // 今回の要件ではモーダル送信がメインなので、詳細な実装は保留
        // 例: 確認ボタン、キャンセルボタンなど
        const actions = payload.actions;
        if (actions && actions.length > 0) {
            Logger.log(`Action ID: ${actions[0].action_id}, Value: ${actions[0].value}`);
        }
    }

    // --- Helper Functions --- (openSummaryModal はここに残す)

    /**
     * 指定されたスレッドのメッセージを取得し、Geminiで要約後、結果表示用のモーダルを開く
     * (コアとなる処理フロー)
     * @param {string} triggerId Slack Trigger ID
     * @param {string} channelId チャンネルID
     * @param {string} threadTs スレッドの起点タイムスタンプ
     * @param {string} teamDomain チームドメイン
     * @param {string} userId ユーザーID
     */
    function openSummaryModal(triggerId, channelId, threadTs, teamDomain, userId) {
        Logger.log("--- openSummaryModal START ---");
        Logger.log(`Params: triggerId=${triggerId}, channelId=${channelId}, threadTs=${threadTs}, teamDomain=${teamDomain}, userId=${userId}`);
        const token = getScriptProperty_('SLACK_BOT_TOKEN');
        if (!token) {
            Logger.log("SLACK_BOT_TOKEN not found in script properties.");
            notifyUserError_(userId, channelId, "設定エラー: Slack Bot Tokenが見つかりません。");
            Logger.log("--- openSummaryModal END (No Token) ---");
            return;
        }
        Logger.log("Slack Bot Token retrieved.");

        try {
            // 1. スレッドのメッセージを取得 (SlackUtils.gs) - threadTs を渡す
            Logger.log("Fetching thread messages...");
            const messages = getThreadMessages_(channelId, threadTs, token);
            if (!messages || messages.length === 0) {
                Logger.log("Failed to fetch thread messages or thread is empty.");
                notifyUserError_(userId, channelId, "スレッドのメッセージを取得できませんでした。");
                Logger.log("--- openSummaryModal END (Fetch Messages Failed) ---");
                return;
            }
            Logger.log("Successfully fetched thread messages.");

            // 2. Gemini APIで要約 (GeminiUtils.gs)
            Logger.log("Calling Gemini API...");
            const summary = callGeminiApi_(messages);
            // エラーチェック
            if (typeof summary === 'string' && summary.startsWith("Error:")) {
                 Logger.log("Failed to get summary from Gemini: " + summary);
                 notifyUserError_(userId, channelId, `AIによる要約に失敗しました。\n${summary}`);
                 Logger.log("--- openSummaryModal END (Gemini Failed) ---");
                 return;
            }
            Logger.log("Successfully received summary object from Gemini.");

            // 3. モーダルビューを構築 (SlackUtils.gs)
            Logger.log("Constructing modal view...");
            const threadUrl = `https://${teamDomain}.slack.com/archives/${channelId}/p${threadTs.replace('.', '')}`; // threadTsを使用
            const privateMetadata = JSON.stringify({ threadUrl: threadUrl, channelId: channelId });
            const modalView = constructSummaryModalView_(summary, privateMetadata); // QAオブジェクトを渡す
            Logger.log("Modal view constructed.");

            // 4. Slack API (views.open) を呼び出してモーダル表示
            Logger.log("Calling Slack API views.open...");
            const slackApiUrl = "https://slack.com/api/views.open";
            const options = {
                "method": "post",
                "contentType": "application/json; charset=utf-8",
                "headers": {
                    "Authorization": "Bearer " + token
                },
                "payload": JSON.stringify({
                    "trigger_id": triggerId,
                    "view": modalView
                }),
                "muteHttpExceptions": true
            };

            const response = UrlFetchApp.fetch(slackApiUrl, options);
            const responseCode = response.getResponseCode();
            const responseBody = response.getContentText();
            Logger.log(`views.open response: Code=${responseCode}, Body=${responseBody}`);

            if (responseCode === 200 && JSON.parse(responseBody).ok) {
                Logger.log("Successfully opened modal.");
            } else {
                Logger.log(`Error opening modal. Code: ${responseCode}, Body: ${responseBody}`);
                notifyUserError_(userId, channelId, `要約結果を表示できませんでした。\n\`\`\`${responseBody}\`\`\``);
            }
            Logger.log("--- openSummaryModal END (After views.open) ---");

        } catch (error) {
            Logger.log("Exception in openSummaryModal: " + error);
            Logger.log("Error stack: " + error.stack);
            notifyUserError_(userId, channelId, `予期せぬエラーが発生しました。\n\`\`\`${error}\`\`\``);
            Logger.log("--- openSummaryModal END (Exception) ---");
        }
    }
