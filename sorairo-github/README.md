# そらいろ（sorairo）— そらのほしグループ 統合アプリ

React + TypeScript + Vite / バックエンド: Supabase（東京リージョン）

## GitHub で公開する手順（GitHub Pages・無料）
このフォルダは、そのまま GitHub に置くと、自動でビルドして公開される設定（`.github/workflows`）が入っています。

1. GitHub で「New repository」→ 名前を `sorairo` にして作成（**Public** を選ぶ。GitHub Pages の無料利用は、公開リポジトリが対象です）
2. 作成した画面の「uploading an existing file」→ このフォルダの**中身をすべて**ドラッグ → 「Commit changes」
   - `.github` フォルダは隠しフォルダです。Mac は Finder で `Command + Shift + .`、Windows はエクスプローラーの「表示 → 隠しファイル」をオンにすると見えます。**`.github` が入っていないと自動公開されません。**
3. リポジトリの「Settings → Pages」→ Source を **GitHub Actions** にする
4. 「Actions」タブ →「GitHub Pages に公開」→ **Run workflow**（1回目は手順3の前に動いて失敗することがあるため、手動で実行します）
5. 数分後、`https://（ユーザー名）.github.io/sorairo/` で公開されます。以後は、`main` に変更を保存するたびに自動で更新されます
6. 公開URLを、下の「Supabase 側の設定」に登録する（Site URL は `https://（ユーザー名）.github.io/sorairo/`、Redirect URLs は `https://（ユーザー名）.github.io/sorairo/reset`）

### 公開する前に知っておくこと
- 公開リポジトリには、ソースコードが誰でも見える状態で置かれます。個人情報や秘密鍵は含まれていません。
- `.env.production` に入っているのは、公開してよい値（Supabase の URL と公開用キー）だけです。データの保護は、データベース側の権限制御（RLS）で行っています。
- **`service_role` キーや、`sb_secret_` で始まるキーは、絶対にこのリポジトリに置かないでください。**
- ライセンスは付けていません（権利は作成者に残ります）。他者の利用を認める場合は、後から `LICENSE` を追加してください。
- 非公開リポジトリで公開したい場合は、GitHub Pages が有料プランになります。その場合は、下の Cloudflare Pages を使えます。

## フォルダ構成
- `src/repo/types.ts` … 画面が依存する型（バックエンドを替えるときの境界）
- `src/repo/supabase.ts` … Supabase との通信は、すべてここ
- `src/repo/mock.ts` … 動作確認専用の模擬バックエンド（本番ビルドには含まれません）
- `src/auth/` … ログイン状態の管理
- `src/pages/` … 各画面 / `src/components/` … 共通部品 / `src/styles.css` … デザイン（色・余白・角丸）
- `public/_redirects`, `public/_headers` … Cloudflare Pages 用の設定

## （別の方法）Cloudflare Pages に公開する手順（ビルド済みの `dist` をアップロード）
1. Cloudflare にログイン → 「Workers & Pages」→「作成」→「Pages」→「直接アップロード」
2. プロジェクト名（例: sorairo）を入力 → `sorairo-dist.zip` を解凍した中身（`index.html` と `assets` など）をアップロード → デプロイ
3. 表示された URL（例: `https://sorairo.pages.dev`）を、下の「Supabase 側の設定」に登録する

## Supabase 側の設定（管理画面で行う）
プロジェクト: sorairo（東京） / Authentication 画面で次を設定します。
1. **URL Configuration**: Site URL に公開URLを、Redirect URLs に `https://（公開URL）/reset` を追加
2. **Sign In / Providers → Email**: 「Allow new users to sign up」を**オフ**（招待・管理者発行のみにする）
3. **パスワードの最低文字数**: 8文字以上
4. **メール送信（重要）**: 標準のメール送信は回数・宛先に強い制限があります。生徒・保護者へ再設定メールを送るには、
   「Authentication → Emails → SMTP Settings」で独自の送信元（SMTP）を設定してください。

## 最初の管理者の作り方
1. Supabase の「Authentication → Users → Add user → Create new user」でメールアドレスとパスワードを登録（Auto Confirm User をオン）
2. そのメールアドレスを開発担当に伝え、管理者ロールの付与を依頼する

## 開発・確認コマンド
```
npm install
npm run typecheck   # 型チェック
npm run build       # 本番ビルド（dist/）
npm run build:mock  # 模擬バックエンドでのビルド（動作確認用。公開しないこと）
```
接続先は `.env.production`（公開してよい URL と公開用キーのみ）。**service_role キーは絶対に書かないでください。**
