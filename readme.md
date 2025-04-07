# slack-thread-summarizer

## Overview

- Google Apps Scriptで動作するSlackアプリです
- Slackのスレッドを生成AIで要約し、QA形式でスプレッドシートに出力します
- Slack内でのやり取りやQAをスプレッドシートにノウハウとして蓄積することができます

## 使い方

- Slack上でQAとして要約したいスレッドで「Summariza QA」を選択します
- スレッド内の会話を参照して、QA形式で要約しした結果がSlack上に表示されます
- 表示された結果をSlack上で確認します。適宜、修正や加筆することができます
- 問題なければ送信ボタンを押下します。スプレッドシートに要約結果が出力されます
- スプレッドシートに要約されたQA及び、元のスレッドのURL、出力した日時が出力されます

## Slack アプリの設定

1.  **Slack アプリの作成:**
    *   [Slack API サイト](https://api.slack.com/apps) にアクセスし、「Create New App」をクリックします。
    *   「From scratch」を選択し、アプリ名（例: `QA Summarizer`）を入力し、対象のワークスペースを選択してアプリを作成します。

2.  **Interactivity & Shortcuts の設定:**
    *   左側のメニューから「Interactivity & Shortcuts」を選択し、機能を「On」にします。
    *   **Request URL** に、デプロイした Google Apps Script の Web アプリ URL を入力します。
        *   (例: `https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec`)
        *   *注意:* この URL は `clasp deploy` コマンドを実行した際に表示されます。
    *   **Shortcuts** セクションまでスクロールし、「Create New Shortcut」をクリックします。
        *   「On messages」を選択します。
        *   **Name:** `Summarize QA` (または任意の名前)
        *   **Short description:** `スレッドをQA形式で要約します` (または任意の説明)
        *   **Callback ID:** `summarize_qa_shortcut` (この ID は Apps Script コード内で使用します。変更する場合はコードも修正が必要です)
        *   「Create」をクリックし、右上の「Save Changes」をクリックします。

3.  **OAuth & Permissions の設定:**
    *   左側のメニューから「OAuth & Permissions」を選択します。
    *   **Scopes** セクションまでスクロールし、「Bot Token Scopes」で「Add an OAuth Scope」をクリックして、以下の権限を追加します:
        *   `chat:write` (エラーメッセージなどを送信するため)
        *   `commands` (ショートカットを利用するため)
        *   `conversations:history` (スレッドのメッセージを取得するため)

4.  **アプリのインストールとトークンの取得:**
    *   ページ上部の「Install to Workspace」をクリックし、表示される手順に従ってアプリをワークスペースにインストールします。
    *   インストール後、同じ「OAuth & Permissions」ページにリダイレクトされます。**Bot User OAuth Token** (`xoxb-...` で始まる文字列) をコピーしておきます。このトークンは Google Apps Script の設定で使用します。

## Google Apps Script の設定

1.  **スクリプトプロパティの設定:**
    *   `clasp open` コマンドで Google Apps Script プロジェクトを開きます。
    *   左側のメニューから **プロジェクトの設定** (歯車アイコン ⚙️) をクリックします。
    *   **スクリプト プロパティ** のセクションまでスクロールし、「スクリプト プロパティを編集」をクリックします。
    *   以下のプロパティを追加します:
        *   `SLACK_BOT_TOKEN`: 上記 4. でコピーした **Bot User OAuth Token** を貼り付けます。
        *   `GEMINI_API_KEY`: ご利用の Gemini API キーを入力します。
        *   `SPREADSHEET_ID`: 要約結果を出力する Google スプレッドシートの ID (URL の `/d/` と `/edit` の間の部分) を入力します。
    *   「スクリプト プロパティを保存」をクリックします。

## デプロイ

Google Apps Script プロジェクトをデプロイするには、`clasp` (Command Line Apps Script Projects) を使用します。

1.  **clasp のインストール (初回のみ):**
    *   Node.js がインストールされていることを確認してください。
    *   ターミナルで以下のコマンドを実行して `clasp` をグローバルにインストールします:
        ```bash
        npm install -g @google/clasp
        ```

2.  **Google アカウントへのログイン (初回のみ):**
    *   ターミナルで以下のコマンドを実行し、ブラウザで表示される手順に従って Google アカウントにログインします:
        ```bash
        clasp login
        ```

3.  **プロジェクトのクローン (初回または別環境での作業開始時):**
    *   Google Apps Script エディタでプロジェクトを開き、「プロジェクトの設定」 (⚙️) > 「スクリプト ID」をコピーします。
    *   ターミナルで、プロジェクトを配置したいディレクトリに移動し、以下のコマンドを実行します (`YOUR_SCRIPT_ID` はコピーしたスクリプト ID に置き換えてください):
        ```bash
        clasp clone YOUR_SCRIPT_ID
        ```
    *   これにより、`appsscript.json` とコードファイル (`.js` または `.ts`) がローカルにダウンロードされます。

4.  **コードの変更とプッシュ:**
    *   ローカルでコードファイル (`Code.js` など) を編集します。
    *   編集後、ターミナルでプロジェクトディレクトリに移動し、以下のコマンドを実行して変更を Google Apps Script にアップロードします:
        ```bash
        clasp push
        ```

5.  **デプロイ:**
    *   変更を反映した新しいバージョンをデプロイするには、ターミナルで以下のコマンドを実行します:
        ```bash
        clasp deploy
        ```
    *   デプロイが成功すると、バージョン番号と **Web アプリの URL** が表示されます。
    *   この **Web アプリの URL** (`https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec` の形式) をコピーし、「Slack アプリの設定」の「Interactivity & Shortcuts」>「Request URL」に設定してください。
    *   *注意:* デプロイするたびに新しいバージョンが作成されます。必要に応じて、Apps Script エディタの「デプロイ」>「デプロイを管理」からバージョンを管理できます。

## 制約事項

- 要約、QA形式への変換はGeminiのAPIを利用します
- Apps Script内にAPIキーを埋め込む必要があります
- 出力先のスプレッドシートは、Slackアプリインストール時に指定します
