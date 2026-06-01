export default function SavingIndicator({ saving }: { saving: boolean }) {
  if (!saving) return null;

  return (
    <span className="ml-2 text-xs text-zinc-500 animate-pulse">Menyimpan...</span>
  );
}
