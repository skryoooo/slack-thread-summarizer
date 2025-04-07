// Slack API related helper functions

/**
 * スレッドのメッセージを取得する (Slack API: conversations.replies)
 * @param {string} channelId チャンネルID
 * @param {string} threadTs スレッドの起点タイムスタンプ
 * @param {string} token Slackボットトークン
 * @return {Array<string>|null} メッセージテキストの配列、失敗時はnull
 */
function getThreadMessages_(channelId, threadTs, token) { // 引数名を threadTs に変更 (意味合い明確化)
    Logger.log(`Fetching messages for thread: ${channelId}/${threadTs}`);
    const apiUrl = `https://slack.com/api/conversations.replies?channel=${channelId}&ts=${threadTs}`; // APIパラメータは ts のまま (これがスレッド起点TSを指す)
    const options = {
        "method": "get",
        "headers": {
            "Authorization": "Bearer " + token
        },
        "muteHttpExceptions": true
    };

    try {
        const response = UrlFetchApp.fetch(apiUrl, options);
        const responseCode = response.getResponseCode();
        const responseBody = response.getContentText();
        const jsonResponse = JSON.parse(responseBody);

        if (responseCode === 200 && jsonResponse.ok) {
            Logger.log(`Fetched ${jsonResponse.messages.length} messages.`);
            // ユーザー情報とメッセージテキストを結合して返すように修正
            return jsonResponse.messages.map(msg => `${msg.user}: ${msg.text}`).filter(text => text);
        } else {
            Logger.log(`Error fetching thread messages. Code: ${responseCode}, Body: ${responseBody}`);
            return null;
        }
    } catch (error) {
        Logger.log("Exception fetching thread messages: " + error);
        return null;
    }
}

/**
 * 要約結果を表示・編集するためのモーダルビューを構築する (元の形式に戻す)
 * @param {{question: string, answer: string}} summary QAオブジェクト
 * @param {string} privateMetadata モーダル送信時に渡す情報 (JSON文字列)
 * @return {object} Slackモーダルビューオブジェクト
 */
function constructSummaryModalView_(summary, privateMetadata) { // 引数をQAオブジェクトに戻す
    return {
        "type": "modal",
        "callback_id": "summary_modal_submit", // コメントアウト解除
        "title": {
            "type": "plain_text",
            "text": "QA要約の確認・編集", // 元のタイトルに戻す
            "emoji": true
        },
        "submit": { // コメントアウト解除
            "type": "plain_text",
            "text": "スプレッドシートに送信",
            "emoji": true
        },
        "close": {
            "type": "plain_text",
            "text": "キャンセル", // 元のテキストに戻す
            "emoji": true
        },
        "private_metadata": privateMetadata, // コメントアウト解除
        "blocks": [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": "AIによるQA要約結果です。\n内容を確認し、必要に応じて編集してから送信してください。" // 元のテキストに戻す
                }
            },
            { // 質問入力欄を元に戻す
                "type": "input",
                "block_id": "question_block",
                "element": {
                    "type": "plain_text_input",
                    "action_id": "question_input",
                    "multiline": false,
                    "initial_value": summary.question
                },
                "label": {
                    "type": "plain_text",
                    "text": "質問 (Question)",
                    "emoji": true
                }
            },
            { // 回答入力欄を元に戻す
                "type": "input",
                "block_id": "answer_block",
                "element": {
                    "type": "plain_text_input",
                    "action_id": "answer_input",
                    "multiline": true,
                    "initial_value": summary.answer
                },
                "label": {
                    "type": "plain_text",
                    "text": "回答 (Answer)",
                    "emoji": true
                }
            }
        ]
    };
}


/**
 * ユーザーにエラーメッセージを一時的なメッセージとして送信する
 * @param {string} userId ユーザーID
 * @param {string} channelId チャンネルID
 * @param {string} text 送信するメッセージテキスト
 */
function notifyUserError_(userId, channelId, text) {
    Logger.log(`Notifying user ${userId} in channel ${channelId} about error: ${text}`);
    const token = getScriptProperty_('SLACK_BOT_TOKEN');
    if (!token) {
        Logger.log("Cannot notify user: SLACK_BOT_TOKEN not found.");
        return;
    }

    const apiUrl = "https://slack.com/api/chat.postEphemeral";
    const payload = {
        "channel": channelId,
        "user": userId,
        "text": `:warning: エラーが発生しました:\n${text}`
    };
    const options = {
        "method": "post",
        "contentType": "application/json; charset=utf-8",
        "headers": {
            "Authorization": "Bearer " + token
        },
        "payload": JSON.stringify(payload),
        "muteHttpExceptions": true
    };

    try {
        const response = UrlFetchApp.fetch(apiUrl, options);
        const responseCode = response.getResponseCode();
        const responseBody = response.getContentText();
        if (responseCode !== 200 || !JSON.parse(responseBody).ok) {
            Logger.log(`Failed to send ephemeral message. Code: ${responseCode}, Body: ${responseBody}`);
        } else {
            Logger.log("Successfully sent ephemeral error message to user.");
        }
    } catch (error) {
        Logger.log("Exception sending ephemeral message: " + error);
    }
}
