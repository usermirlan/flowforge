import AuthForm from "@/components/AuthForm";
import { getDict } from "@/lib/locale";

export default async function RegisterPage() {
  const d = await getDict();
  return (
    <main className="mx-auto flex max-w-sm flex-col gap-6 px-5 py-16">
      <h1 className="text-2xl font-semibold">{d.auth.register}</h1>
      <AuthForm mode="register" />
    </main>
  );
}
