import AuthForm from "@/components/AuthForm";

export default function RegisterPage() {
  return (
    <main className="mx-auto flex max-w-sm flex-col gap-6 px-5 py-16">
      <h1 className="text-2xl font-semibold">Катталуу</h1>
      <AuthForm mode="register" />
    </main>
  );
}
