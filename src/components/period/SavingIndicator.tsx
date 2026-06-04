interface Props {
  saving: boolean;
  error?: string | null;
}

export default function SavingIndicator({ saving, error }: Props) {
  if (saving) {
    return (
      <span className="ml-2 text-xs text-zinc-500 animate-pulse">
        Menyimpan...
      </span>
    );
  }

  if (error) {
    return (
      <span className="ml-2 max-w-[200px] truncate text-xs text-red-400" title={error}>
        ⚠ Gagal menyimpan
      </span>
    );
  }

  return null;
}
