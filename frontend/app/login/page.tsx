"use client";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-slate-100 p-8 text-slate-900">
      <form
        method="post"
        onSubmit={(event) => event.preventDefault()}
        className="mx-auto mt-16 max-w-sm space-y-5 rounded-xl bg-white p-8 shadow"
      >
        <h1 className="text-2xl font-bold">勤怠管理 ログイン</h1>

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
          disabled
          className="w-full rounded bg-blue-600 p-3 font-bold text-white disabled:opacity-50"
        >
          ログイン
        </button>
      </form>
    </main>
  );
}