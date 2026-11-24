import Link from "next/link";
import { getDict } from "@/lib/locale";

export default async function NotFound() {
  const d = await getDict();
  return (
    <main className="mx-auto flex max-w-md flex-col items-center gap-4 px-5 py-24 text-center">
      <p className="font-mono text-5xl text-accent">404</p>
      <p className="text-dim">{d.notFound.text}</p>
      <Link href="/" className="rounded-lg border border-line px-4 py-2 hover:bg-raised">{d.notFound.home}</Link>
    </main>
  );
}
