export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-indigo-600">올A+</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            AI 학습 비서로 올A+ 받자
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
