# 勤怠管理SaaS 実装引き継ぎ

確認日：2026年11月14日

会社・社員テーブルの作成と、パスワードのハッシュ作成・照合用の共通関数まで完了している。ログインAPI、ログイン状態の保持、画面からのAPI呼び出しはこれから。ユーザーが自分で手を動かして学ぶため、次の担当者も一段階ずつ説明しながら進める。

## プロジェクトと到達目標

- 実装する場所：`/Users/koiwaikunihiro/Projects/attendance-saas`。Mac本体内のフォルダを使う。
- 目的：会社ごとにデータと権限を分ける勤怠管理SaaSを、学習とポートフォリオとして作る。
- 最初の到達点：会社ID・本人ID・パスワードでログインし、認証後の空ページを表示する。未ログインでの直接アクセス制限とログアウトも含む。
- 最終的な勤怠機能：出退勤・休憩打刻、出勤簿、修正申請と承認・差し戻し、月間集計、部署ごとの締め・解除・再締めなど。
- 進め方とコードの規約：[コーディング規約](coding-conventions.md)を読む。

設計資料の旧保管先は `/Volumes/PS2000W/Projects/仕事/attendance-saas/docs`。要件書とExcelのテーブル定義書・画面設計書などがある。外付けストレージは切断しやすいため、実装・依存パッケージの展開先にはしない。

旧資料には、認証情報を独立したusers表へ置く案や、古い技術構成・未決表記が残る。ユーザーはその後、認証情報を社員マスタへまとめる方式を承認済み。現在はemployees表へ統合して実装している。旧案へ戻す前に、最新のユーザー決定と実装を照合する。

## ユーザーとの進め方

- ユーザーは業務システム等の開発経験があるが、TypeScript・Node.js・npmの用語や規約を知っている前提で説明しない。
- ユーザーがコマンド実行・ファイル編集を担当する。依頼された範囲の読み取り確認やテストは行ってよい。実装をまとめて自動編集しない。
- 「どのファイルを開くか」「どの範囲を置き換えるか」「何を書くか」を具体的に示す。1回の案内で一つのファイルや工程を進め、保存後に確認する。
- コマンドは、ツールの役割、引数の意味、実行する場所、読む設定ファイル、そのファイルを読む決まり、実行結果の順に説明する。
- 例：npm runはpackage.jsonのscriptsから指定名を探す、というnpmの規約自体を先に説明する。「package.jsonへ飛ぶ」だけで説明を終えない。
- 値・変数・宣言・型・引数・戻り値・関数呼び出し・同期と非同期・Promiseなどは、必要な場所で意味を説明する。構文を並べるだけにしない。
- 実装の識別子は英語、説明とコメントは日本語。参考資料も日本語を優先する。
- 接続確認だけの仮APIは作らず、実際のログイン機能をブラウザから操作して確認する方針。
- ログや資料へ、実際のパスワード、接続用の秘密情報、セッショントークン、実在利用者の個人データを書かない。

## 採用構成と現在の起動設定

| 担当 | 構成 | 現在の状態 |
| --- | --- | --- |
| 画面 | React・Next.js・TypeScript | frontendサービス。Macの127.0.0.1:3000で公開 |
| API | 別アプリのNext.js Route Handlers・TypeScript | backendサービス。今のComposeではcommandがbashで、APIの常時起動・ポート公開は未設定 |
| 実行環境 | Node.js 24系 | Docker内で使用 |
| DB | PostgreSQL 18 | dbサービス。Docker内ではdb:5432。Mac側へはポートを公開していない |
| DB操作 | Drizzle ORM・pg | 共通接続ファイル作成済み |
| DB変更管理 | Drizzle Kit | テーブル定義からSQLを生成し、確認後に適用 |
| パスワード | argon2のArgon2id | パッケージ導入・共通関数作成済み |
| 環境管理 | Docker Compose | 画面・API・DBを分けている |
| リバースプロキシ | Nginxを採用予定 | 未追加 |

FastAPIやPythonでAPIを作る構成ではない。画面用Next.jsとAPI用Next.jsを分けた現在の構成を維持する。

確認したバックエンドの主なバージョン：Next.js 16.4.6、Drizzle ORM 0.45.4、Drizzle Kit 0.31.11、pg 8.23.1、argon2 0.45.2。Node.jsのDocker内実行確認時はv24.22.3。

frontend/next.config.tsとbackend/next.config.tsの両方でcacheComponentsとpartialPrefetchingが有効。セッションを読む画面やAPIを作る前に、インストール済みNext.jsの認証・キャッシュ関連資料を確認する。

各アプリのAGENTS.mdには、コードを書く前に、そのアプリのnode_modules/next/dist/docsにある該当ガイドを読む指示がある。

## 主なファイル

| ファイル | 役割と状態 |
| --- | --- |
| [compose.yaml](../compose.yaml) | サービス・環境変数・フォルダ共有・ポートの設定 |
| [backendのDockerfile](../docker/backend.Dockerfile) | Node.js 24の環境と作業場所/appを指定 |
| [backend/package.json](../backend/package.json) | ライブラリ一覧とnpm runで呼ぶ命令 |
| [backend/drizzle.config.ts](../backend/drizzle.config.ts) | 定義ファイル・SQL出力先・DB接続先 |
| [backend/db/schema.ts](../backend/db/schema.ts) | 会社・社員テーブルと2種類の状態ENUM |
| [backend/db/index.ts](../backend/db/index.ts) | pg.Poolを用意し、Drizzleのdbを公開 |
| [backend/lib/password.ts](../backend/lib/password.ts) | hashPasswordとverifyPasswordの共通関数 |
| [frontend/app/login/page.tsx](../frontend/app/login/page.tsx) | 会社ID・本人ID・パスワードの入力画面。送信は無効、ボタンはdisabled |
| [frontend/app/page.tsx](../frontend/app/page.tsx) | 現在の簡単なトップ画面。認証後ページとしての保護は未実装 |
| [backend/app/route.ts](../backend/app/route.ts) | 生成時のAPIひな形 |
| [backend/app/[slug]/route.ts](../backend/app/%5Bslug%5D/route.ts) | 生成時の動的APIひな形 |
| [README](../README.md) | 環境構築・DB変更手順 |
| [作業ログ](work-log.md) | 作業と確認結果の記録 |

DB接続プールはmax=5、connectionTimeoutMillis=5000、ssl=false。ssl=falseは現在のローカルDocker用。ComposeからPGHOST・PGPORT・PGDATABASE・PGUSER・PGPASSWORDを渡す。開発時はglobalThisへ保存してプールを再利用し、新しいプールへ待機中接続のエラーハンドラーを付けている。

## DBの実装状況

現在、業務用テーブルはcompaniesとemployeesを作成済み。Drizzleの適用履歴テーブルもある。確認時の会社データは0件、社員データも0件。

### 会社テーブル

companiesは7項目：id、company_code_norm、name、status、next_login_sequence、created_at、updated_at。

- 状態はcompany_status型：setting、active、suspended。初期値はsetting。
- 会社コードは3〜32文字の小文字ASCII英数字・アンダースコア・ハイフン。重複不可。
- next_login_sequenceは、本人IDを自動発行するときの次の採番値として用意している。

### 社員テーブル

employeesは15項目：id、company_id、login_id_norm、full_name、email、password_hash、status、employee_code、joined_on、left_on、available_from、credential_version、row_version、created_at、updated_at。

- 認証情報は社員テーブルへ統合済み。会社の最初の設定管理者も社員として登録する。
- 状態はemployee_status型：invited、active、suspended、retired。初期値はinvited。
- 会社内部IDとログイン用本人IDの2列で複合UNIQUE。文字列を連結した識別列は作らない。
- ログイン用本人IDは最大32文字の文字列。先頭の0を保持する。正規化や許容文字の具体的な処理はまだAPIへ実装していない。
- 既存の社員IDを初回CSVから本人IDとして指定でき、空欄の新規行だけ自動採番するというユーザー決定がある。CSV処理自体は未実装。
- employee_codeは、本人IDとは別の補助的な社員番号。任意項目で、値がある場合は会社内で一意。
- 招待中はpassword_hashのNULLを許す。activeの場合は空でないハッシュ値を必須にするCHECKがある。
- joined_on・left_onは雇用上の日付。available_fromはシステム利用開始日として分ける。
- credential_versionは認証情報の版、row_versionは同時更新の検出用。初期値は1。APIでの更新・比較処理はまだない。
- UUIDは登録処理が発行する。DB側のUUID自動発行の初期値はない。
- created_at・updated_atは登録時の初期値を持つ。updated_atを更新時にも変更する処理はAPI側で必要。
- 部署との紐付けは後で所属履歴を使う方針。権限割当も別表の方針で、まだどちらも作っていない。

### マイグレーション

適用済みは次の2件。

1. [0000_init_companies.sql](../backend/drizzle/0000_init_companies.sql)
2. [0001_add_employees.sql](../backend/drizzle/0001_add_employees.sql)

過去にSQLを先に手で作って取り込む方式をやめ、開発DBを空にしてDrizzleから作り直した。現在はそのやり直しが完了している。今回の引き継ぎを理由に、再リセットする必要はない。

通常の変更はschema.tsを編集し、db:generateでSQLを生成して、内容確認後にdb:migrateで未適用分を実行する。適用済みSQLや、DBの適用履歴を手で書き換えない。

初回の会社SQLにはCOLLATE "C"と日本語DBコメントを補完済み。使用中のDrizzle定義だけからは再生成されない項目なので、今後の生成SQLも確認する。

## パスワード共通ファイル

保存済みのbackend/lib/password.tsには、次の2関数がある。

- hashPassword(password: string): Promise<string>：Argon2idのハッシュ文字列を作る。
- verifyPassword(storedHash: string, inputPassword: string): Promise<boolean>：一致ならtrue、不一致ならfalseを返す。

このファイル自体はDBへ登録しない。後で社員登録・パスワード設定・ログイン処理から関数を読み込んで使う。argon2の内部エラー等による失敗は呼び出し元で扱う必要がある。

直近は、ユーザーへconst・let・型・関数・async・Promise・await・import/exportなどを説明していた。共通ファイルは既に保存されているので、未作成と勘違いして最初から作り直さない。

## 実際に確認できたこと

- DBにemployees表、15項目、会社への外部キー、一意制約、CHECK制約が作成されたことを読み取り確認した。
- DBの適用履歴は2件。会社・社員データはどちらも0件。
- 保存済みコードを対象に、TypeScriptの型チェックが成功した。
- Docker内でargon2 0.45.2のハッシュ作成と照合が動くことを確認した。
- 保存済みpassword.tsをDocker内でメモリ上のJavaScriptへ変換して読み込み、一時的なランダム値でArgon2idのハッシュ作成、正しい入力の一致、誤った入力の不一致を確認した。テスト用パスワードとハッシュは表示・保存していない。
- 社員テーブルへの登録・更新の異常系テストや、ログインのブラウザ試験はまだ実施していない。

## 残作業と次の進め方

次の順番は引き継ぎ時点の進め方案。各段階の具体的な保存先とコードを、一つずつユーザーへ説明する。

1. ログイン状態をどう保持するかと、必要なDB定義を確認する。DBにセッションを保持し、ブラウザへHttpOnly Cookieを渡す方式が候補だが、今回の実装としては未作成・未確定。
2. ログインの動作確認に使う会社・社員データを用意する。現時点では両方0件で、入力して照合できる社員がいない。
3. 会社ID・本人ID・パスワードを受け取るログインAPIを作る。入力の検証、会社・社員の状態と利用開始日の確認、パスワード照合、失敗時の応答を設計・実装する。
4. セッションの作成・確認・破棄とログアウトを実装する。認証後のAPIでも会社・社員の対応と利用状態を検証する。
5. backendのAPIサーバーを起動する設定と、frontendから同じサイトのURLとしてAPIを呼ぶ経路を用意する。現在はAPI用ポートもプロキシ設定もない。
6. ログイン画面からAPIを呼び、認証後の空ページを表示する。未ログインの直接アクセス制限とログアウトも確認する。
7. 正常・不正パスワード・別会社の本人ID・停止状態などをブラウザと必要な自動テストで確認し、結果をログへ残す。
8. 内容をユーザーと確認してから、現在の一連の実装をコミットする。

会社のsetting状態で最初の管理者に何を許可するか、本人IDの正規化、セッションの有効期限などは、既存の要件・設計資料を照合して具体化する。単にパスワードが一致したら全社・全部署のデータへアクセス可能にしない。

## 依存パッケージとコマンド

これらはリポジトリのルートから実行する。以下は手順を参照するためのコマンドで、引き継ぎを読むだけで全部を再実行する必要はない。

```bash
# 保存済みのバージョンで、バックエンドの依存パッケージを一括復元する。
docker compose run --rm --no-deps backend npm ci

# DB変更用のSQLを生成する。nameは実際の変更内容に合わせる。
docker compose run --rm --no-deps backend npm run db:generate -- --name=変更内容の英語名

# 管理ファイルに記録された未適用SQLを、DBの履歴と照合して適用する。
docker compose run --rm backend npm run db:migrate

# バックエンドの型チェック。
docker compose run --rm --no-deps backend npx tsc --noEmit --incremental false
```

npm runはbackend/package.jsonのscriptsから指定名を探す。db:generateはdrizzle-kit generate、db:migrateはdrizzle-kit migrateを呼ぶ。生成SQLの場所はdrizzle.config.tsのoutに書いてある。

生成時はschema.tsと前回のスナップショットを比較する。API用のdb/index.ts経由でSQLを実行する工程ではない。適用時はDB内のDrizzle履歴と照合し、未適用分を順番に実行する。

npm installで部品を追加すると、package.json・package-lock.json・node_modulesが更新される。Gitで共有するのはJSONとロックファイルで、node_modulesは含めない。今のDockerfileはNode.js環境を用意するところまでなので、新しい環境ではREADMEに従ってnpm ciを実行する必要がある。

## Gitと別チャットの担当

確認時点では、Composeの変更とbackend・Dockerfile・文書などが未コミットで残っている。GitHubだけでは現在の実装全体を確認できない。ローカルのファイルを読む。既存のユーザー変更を上書き・破棄しない。

別チャットに依頼するときは担当範囲を明記する。例えば、主担当は実装手順の案内、別担当は読み取りでの設計・セキュリティレビューやテスト観点の整理とすると、同じファイルを同時に編集せずに協力しやすい。役割の割当や新しいチャットの作成は、ユーザーの依頼に合わせる。
