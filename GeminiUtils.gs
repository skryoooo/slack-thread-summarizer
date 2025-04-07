// Gemini API related helper functions

    /**
     * Gemini APIを呼び出してテキストをQA形式で要約する
     * @param {Array<string>} messages メッセージテキストの配列
     * @return {{question: string, answer: string}|string} 要約結果オブジェクト、失敗時は"Error: ..."
     */
    function callGeminiApi_(messages) {
        const apiKey = getScriptProperty_('GEMINI_API_KEY');
        if (!apiKey) {
            Logger.log("GEMINI_API_KEY not found in script properties.");
            return "Error: Gemini API Key not set.";
        }
        Logger.log("Gemini API Key retrieved.");

        const model = "gemini-2.0-flash";
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        // プロンプトの組み立て (会話履歴をテキストに含める)
        Logger.log("Messages array received:", JSON.stringify(messages)); // ★ messages 配列の内容をログ出力
        const promptText = messages.join('\n');
        Logger.log("Prompt Text:", promptText); // ★プロンプト内容をログ出力
        const systemInstruction = `
Slack上の会話の履歴が与えられます。
会話の内容をノウハウとして蓄積するため、質問と回答の形式で要約してください。

- できる限り、簡潔にまとめてください。
- だれが質問したのか、誰が回答したのかは記載しないでください。
- 企業名や、人物名などの固有名詞は記載しないでください。
- 社内文書として残すため、適切な日本語に整形してください。
- こちら、あちらなどの指示語は使用せず、具体的に記載してください。

`

        const payload = {
          "contents": [{
            "role": "user", // サンプルに合わせて role を追加
            "parts":[{
              "text": promptText
            }]
          }],
          "systemInstruction": {
            "parts":[{
              "text": systemInstruction
            }]
          },
          "generationConfig": { // サンプルに合わせて generationConfig を追加
            "temperature": 0.2,
            "responseMimeType": "application/json",
            "responseSchema" : {
              "type": "object",
              "properties": {
                "question": {
                  "type": "string",
                  "description": "抽出された質問" // 説明を追加
                },
                "answer": {
                  "type": "string",
                  "description": "抽出された回答" // 説明を追加
                }
              },
              "required": ["question", "answer"] // 必須プロパティを指定
            }
          }
        };

        const options = {
            "method": "post",
            "contentType": "application/json",
            "payload": JSON.stringify(payload),
            "muteHttpExceptions": true
        };

        try {
            Logger.log("Calling Gemini API...");
            Logger.log("Request Payload:", JSON.stringify(payload)); // ペイロードもログ出力
            const response = UrlFetchApp.fetch(apiUrl, options);
            const responseCode = response.getResponseCode();
            const responseBody = response.getContentText();
            Logger.log(`Gemini API response: Code=${responseCode}, Body=${responseBody}`);

            if (responseCode === 200) {
                try {
                    const jsonResponse = JSON.parse(responseBody);
                    if (jsonResponse.candidates && jsonResponse.candidates.length > 0 && jsonResponse.candidates[0].content && jsonResponse.candidates[0].content.parts && jsonResponse.candidates[0].content.parts.length > 0) {
                        // responseMimeType が application/json の場合、parts[0].text にJSON文字列が入る
                        const qaJsonString = jsonResponse.candidates[0].content.parts[0].text;
                        Logger.log("Received JSON string from Gemini:", qaJsonString);
                        const qaResult = JSON.parse(qaJsonString); // JSON文字列をパース
                        if (qaResult.question && qaResult.answer) {
                            Logger.log("Successfully parsed QA result from Gemini.");
                            return { question: qaResult.question, answer: qaResult.answer };
                        } else {
                            Logger.log("Error: Gemini response JSON does not contain question or answer.");
                            return "Error: Gemini response JSON structure is invalid.";
                        }
                    } else {
                        Logger.log("Error: Gemini response structure is unexpected.");
                        return `Error: Unexpected Gemini response structure: ${responseBody}`;
                    }
                } catch (parseError) {
                    Logger.log("Error parsing Gemini JSON response: " + parseError);
                    return `Error: Failed to parse Gemini JSON response: ${responseBody}`;
                }
            } else {
                Logger.log(`Error calling Gemini API. Code: ${responseCode}, Body: ${responseBody}`);
                return `Error: Gemini API call failed. Response: ${responseBody}`;
            }
        } catch (error) {
            Logger.log("Exception calling Gemini API: " + error);
            return `Error: Exception during Gemini API call: ${error}`;
        }
    }
