import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import GoogleSignInButton from "@/components/GoogleSignInButton";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const session = await getServerSession(authOptions);
  if (session) redirect("/meetings");

  const hasError = searchParams.error === "AccessDenied";

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#FAF8F5] px-4">
      <div className="w-full max-w-sm bg-white rounded-[12px] border border-[rgba(0,0,0,0.08)] p-10 flex flex-col items-center gap-6 shadow-sm">
        <div className="flex flex-col items-center gap-1 text-center">
          <span className="text-3xl font-bold text-gray-900 tracking-tight">
            Reffie
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#10BD91] mt-1">
            Sales Tools
          </span>
          <h1 className="text-xl font-bold text-gray-900 mt-2">
            Follow-Up Writer
          </h1>
        </div>

        <GoogleSignInButton />

        {hasError && (
          <p className="text-sm text-[#6B6B6B] text-center">
            Access restricted to Reffie team members.
          </p>
        )}
      </div>
    </main>
  );
}
