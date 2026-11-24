import AuthForm from "@/components/AuthForm";
import { getDict } from "@/lib/locale";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const [{ next }, d] = await Promise.all([searchParams, getDict()]);
  return (
    <main className="mx-auto flex max-w-sm flex-col gap-6 px-5 py-16">
      <h1 className="text-2xl font-semibold">{d.auth.login}</h1>
      <AuthForm mode="login" next={next} />
    </main>
  );
}
