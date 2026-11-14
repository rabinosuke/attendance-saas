"use client";

// 送信中かどうかや、エラーメッセージを画面で管理する。
import { useState } from "react";

// フォーム送信時に受け取る情報の型。関数ではない。
import type { SubmitEvent } from "react";

// ログイン成功後、別の画面へ移動するために使う。
import { useRouter } from "next/navigation";

// 別ファイルに作成した、ログインAPIへの通信関数を読み込む。
import { sendLoginRequest } from "@/lib/api/auth";

export default function LoginPage() {
  // ログイン成功後、別の画面へ移動するためのオブジェクト。
  const router = useRouter();

  // 送信中かどうか。初期値falseは「送信していない」。
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 画面に表示するエラーメッセージ。初期値は空文字。
  const [errorMessage, setErrorMessage] = useState("");
  // ログインフォームが送信されたときに呼ぶ。
  async function handleSubmit(
    event: SubmitEvent<HTMLFormElement>,
  ): Promise<void> {
    // ブラウザ標準のフォーム送信を止め、下のfetchで送信する。
    event.preventDefault();

    // 送信中なら、追加の送信を受け付けない。
    if (isSubmitting) {
      return;
    }

    // フォームから、name属性で各入力値を取り出す。
    const formData = new FormData(event.currentTarget);
    const companyId = formData.get("companyId");
    const loginId = formData.get("loginId");
    const password = formData.get("password");

    // 3項目とも文字列であることを確認する。
    // 1つでも文字列でなければ、通信せずに処理を終える。
    if (
      typeof companyId !== "string" ||
      typeof loginId !== "string" ||
      typeof password !== "string"
    ) {
      setErrorMessage("入力内容を確認してください。");
      return;
    }

    // 確認できた文字列を、通信関数へ渡すオブジェクトにまとめる。
    const input = {
      companyId,
      loginId,
      password,
    };

    // ボタンを送信中の表示にし、前回のエラーを消す。
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      // 入力値を通信関数へ渡し、結果が返るまで待つ。
      const result = await sendLoginRequest(input);

      // ログイン失敗なら、返されたメッセージを設定して終える。
      if (!result.success) {
        setErrorMessage(result.message);
        return;
      }

      // 成功したらトップ画面へ移動する。
      // 現在のログイン画面の履歴を、移動先の履歴に置き換える。
      router.replace("/");

      // 新しいCookieを使って、サーバー側の画面データを再取得する。
      router.refresh();
    } catch {
      // 通信失敗や、応答をJSONとして読み取れなかった場合。
      setErrorMessage(
        "通信に失敗しました。時間をおいて再度お試しください。",
      );
    } finally {
      // 成功・失敗にかかわらず、送信中の状態を解除する。
      setIsSubmitting(false);
    }
  }
  return (
    <main className="min-h-screen bg-slate-100 p-8 text-slate-900">
      <form
        method="post"
        onSubmit={handleSubmit}
        className="mx-auto mt-16 max-w-sm space-y-5 rounded-xl bg-white p-8 shadow"
      >
        <h1 className="text-2xl font-bold">勤怠管理 ログイン</h1>
        {/* エラーメッセージがあるときだけ表示する。 */}
        {errorMessage !== "" && (
          <p role="alert" className="text-sm text-red-700">
            {errorMessage}
          </p>
        )}

        <label className="block">
          会社ID
          <input
            type="text"
            name="companyId"
            required
            className="mt-1 w-full rounded border border-slate-300 p-2"
          />
        </label>

        <label className="block">
          本人ID
          <input
            type="text"
            name="loginId"
            autoComplete="username"
            required
            className="mt-1 w-full rounded border border-slate-300 p-2"
          />
        </label>

        <label className="block">
          パスワード
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            required
            className="mt-1 w-full rounded border border-slate-300 p-2"
          />
        </label>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded bg-blue-600 p-3 font-bold text-white disabled:opacity-50"
        >
          {isSubmitting ? "ログイン中..." : "ログイン"}
        </button>
      </form>
    </main>
  );
}