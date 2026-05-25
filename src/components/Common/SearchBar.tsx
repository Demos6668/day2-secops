import { Search } from "lucide-react";
import { Input } from "@/components/ui/shared";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  autoFocus?: boolean;
  // When provided, search is committed only on Enter or when the search icon
  // is clicked — not on every keystroke.
  onSubmit?: (value: string) => void;
}

export function SearchBar({
  value,
  onChange,
  placeholder = "Search global threats, CVEs, news...",
  className,
  inputRef,
  autoFocus,
  onSubmit,
}: SearchBarProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit?.(value);
  };

  return (
    <form
      className={cn("relative group flex-1 max-w-xl", className)}
      role="search"
      onSubmit={handleSubmit}
    >
      {onSubmit ? (
        <button
          type="submit"
          aria-label="Submit search"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4 group-focus-within:text-accent transition-colors hover:text-accent"
        >
          <Search className="h-4 w-4" />
        </button>
      ) : (
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4 group-focus-within:text-accent transition-colors" />
      )}
      <Input
        ref={inputRef}
        placeholder={placeholder}
        aria-label="Search"
        autoFocus={autoFocus}
        className="pl-10 bg-secondary/50 border-white/10 focus-visible:ring-2 focus-visible:ring-accent focus-visible:border-accent rounded-full h-10 w-full"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </form>
  );
}
