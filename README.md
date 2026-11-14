# 勤怠管理SaaS

TypeScriptで学びながら作成する勤怠管理サービス。画面用Next.jsとAPI用Next.jsを分け、PostgreSQLをDrizzleで管理する。

## 開発ルール

画面とAPIの実装は、[コーディング規約](docs/coding-conventions.md)にそろえる。命名・書式・型の扱いと、自動チェックの設定状況をまとめている。

## 現在の実装範囲

- 画面：トップとログインフォーム。認証処理はこれから実装する。
- API：Next.jsのRoute Handlersのひな形、DB接続とパスワードの共通処理。
- DB：会社・社員テーブルを作成済み。2件のマイグレーションを適用済み。
- 詳しい現状・確認結果・残作業は、[実装引き継ぎ](docs/handoff.md)を参照する。

## 開発環境の初回構築

GitとDocker Composeを用意し、このリポジトリのルートで実行する。Node.jsとPostgreSQLはコンテナ内で使う。

1. `.env.example`を`.env`にコピーし、ローカル開発用のパスワードへ変更する。実際の`.env`はGitへ登録しない。
2. コンテナをビルドし、ロックファイルから依存パッケージをインストールする。

```bash
docker compose build
docker compose run --rm --no-deps frontend npm ci
docker compose run --rm --no-deps backend npm ci
```

3. DBと画面を起動し、保存済みのマイグレーションを適用する。

```bash
docker compose up -d db frontend
docker compose run --rm backend npm run db:migrate
```

ログインフォームは `http://localhost:3000/login`。API用サービスは現時点ではシェルでの作業用設定で、APIの常時起動・ポート公開は後続で設定する。

## DBを変更する通常の手順

1. `backend/db/schema.ts`を編集する。
2. 変更用SQLを生成する。

```bash
docker compose run --rm backend npm run db:generate -- --name=add_employees
```

3. 生成SQLを確認してから適用する。

```bash
docker compose run --rm backend npm run db:migrate
```

テーブル定義、生成SQL、`backend/drizzle/meta`の管理ファイルを一緒にGitで管理する。新しく環境を作る人は保存済みSQLを適用し、初回SQLの生成をやり直す必要はない。

会社IDの`COLLATE "C"`と日本語のDBコメントは初回SQLに含めている。これらは使用中のDrizzle Kitでは定義ファイルだけから再生成されないため、対象列を変更するときも生成SQLを確認する。適用済みSQLの書き換えではなく、新しいマイグレーションを追加する。

## 確認と記録

```bash
docker compose run --rm backend npx drizzle-kit check
docker compose run --rm backend npx tsc --noEmit --incremental false
```

作業の経緯と実際に行った検証は `docs/work-log.md` に記録する。
