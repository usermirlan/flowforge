import AuthForm from "@/components/AuthForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="mx-auto flex max-w-sm flex-col gap-6 px-5 py-16">
      <h1 className="text-2xl font-semibold">Кирүү</h1>
      <AuthForm mode="login" next={next} />
    </main>
  );
}
