'use client';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ko">
      <body className="flex min-h-screen flex-col items-center justify-center bg-neutral-950 px-4">
        <div className="text-center">
          <div className="mb-6 text-6xl font-bold text-red-500">500</div>
          <h1 className="mb-2 text-2xl font-semibold text-white">
            문제가 발생했어요
          </h1>
          <p className="mb-8 text-neutral-400">
            예상치 못한 오류가 발생했습니다. 잠시 후 다시 시도해주세요.
          </p>
          <button
            onClick={() => reset()}
            className="inline-flex items-center rounded-lg bg-white px-6 py-3 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-200"
          >
            다시 시도
          </button>
        </div>
      </body>
    </html>
  );
}
