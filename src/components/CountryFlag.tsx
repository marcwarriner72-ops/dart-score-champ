import { countryFlagEmoji, guessCountry } from "@/lib/league";

/**
 * Flag emoji for the country hosting a competition.
 * Falls back to a best guess from the competition name when no country is stored.
 */
export function CountryFlag({
  code,
  tournament,
  className = "",
}: {
  code?: string | null;
  tournament?: string | null;
  className?: string;
}) {
  const resolved = code ?? guessCountry(tournament);
  const flag = countryFlagEmoji(resolved);
  if (!flag) return null;
  return (
    <span role="img" aria-label={`Hosted in ${resolved}`} className={`leading-none ${className}`}>
      {flag}
    </span>
  );
}
