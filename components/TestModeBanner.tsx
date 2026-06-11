export default function TestModeBanner() {
  if (process.env.TEST_MODE !== "true") return null;
  return (
    <div className="bg-amber-400 text-amber-900 text-sm font-semibold text-center py-2 w-full">
      TEST MODE — No real API calls are being made
    </div>
  );
}
