function CategoryArtwork({ category }) {
  switch (category) {
    case "한식":
      return (
        <>
          <ellipse cx="64" cy="59" rx="31" ry="15" className="art-plate" />
          <path d="M38 55h52c-3 18-12 26-26 26S41 73 38 55Z" className="art-bowl" />
          <path d="M45 52c7-16 32-16 39 0" className="art-rice" />
          <path d="m84 25 8 29M94 23l6 28" className="art-line" />
        </>
      );
    case "양식":
      return (
        <>
          <ellipse cx="64" cy="61" rx="38" ry="22" className="art-plate" />
          <path d="M42 59c9-18 34-18 44 0M43 65c13-14 29-14 42 0M49 70c11-8 21-8 31 0" className="art-pasta" />
          <circle cx="70" cy="49" r="5" className="art-accent" />
          <path d="m94 26-13 29M99 29 86 57" className="art-line" />
        </>
      );
    case "중식":
      return (
        <>
          <path d="M39 44h50l-6 38H45l-6-38Z" className="art-box" />
          <path d="m43 44 7-13h29l7 13M47 52h34" className="art-line" />
          <path d="M57 60c8-8 15-8 22 0M60 68c6-6 12-6 18 0" className="art-food" />
          <path d="m88 24 8 28M98 22l5 27" className="art-line" />
        </>
      );
    case "일식":
      return (
        <>
          <ellipse cx="64" cy="69" rx="39" ry="15" className="art-plate" />
          <rect x="35" y="49" width="26" height="17" rx="7" className="art-rice" />
          <path d="M36 52c7-10 18-12 25-3l-2 7H36Z" className="art-accent" />
          <rect x="68" y="46" width="25" height="20" rx="7" className="art-rice" />
          <path d="M69 50c8-9 18-10 24-2l-2 7H69Z" className="art-fish" />
          <path d="m91 25 8 31M101 23l5 30" className="art-line" />
        </>
      );
    case "카페":
      return (
        <>
          <path d="M40 42h45v30c0 9-7 15-16 15H56c-9 0-16-6-16-15V42Z" className="art-cup" />
          <path d="M85 50h7c12 0 12 19 0 19h-7" className="art-line" />
          <path d="M51 31c-7-8 7-10 1-18M66 31c-7-8 7-10 1-18M79 31c-7-8 7-10 1-18" className="art-steam" />
        </>
      );
    case "분식":
      return (
        <>
          <ellipse cx="64" cy="64" rx="35" ry="18" className="art-plate" />
          <path d="M35 60h58c-4 18-14 25-29 25S39 78 35 60Z" className="art-bowl" />
          <path d="M45 59c3-13 11-13 14 0M58 59c3-16 11-16 14 0M71 59c3-12 11-12 14 0" className="art-accent-line" />
          <circle cx="47" cy="52" r="4" className="art-accent" />
        </>
      );
    case "아시아":
      return (
        <>
          <path d="M34 55h60c-5 21-15 30-30 30S39 76 34 55Z" className="art-bowl" />
          <path d="M42 54c8-12 15-12 22 0 8-12 15-12 23 0" className="art-noodle" />
          <path d="M49 34c-7-7 7-10 0-18M66 34c-7-7 7-10 0-18M82 34c-7-7 7-10 0-18" className="art-steam" />
        </>
      );
    case "패스트푸드":
      return (
        <>
          <path d="M34 50c2-19 16-29 30-29s28 10 30 29H34Z" className="art-bun" />
          <path d="M31 54h66l-5 12H36l-5-12Z" className="art-lettuce" />
          <rect x="36" y="66" width="56" height="10" rx="5" className="art-patty" />
          <path d="M38 76h52c0 10-8 14-17 14H55c-9 0-17-4-17-14Z" className="art-bun" />
          <circle cx="54" cy="35" r="2" className="art-seed" />
          <circle cx="69" cy="31" r="2" className="art-seed" />
          <circle cx="79" cy="39" r="2" className="art-seed" />
        </>
      );
    case "주점":
      return (
        <>
          <path d="M36 31h33v48c0 8-6 13-14 13h-5c-8 0-14-5-14-13V31Z" className="art-glass" />
          <path d="M69 42h8c13 0 13 24 0 24h-8" className="art-line" />
          <path d="M39 45h27v32H39Z" className="art-drink" />
          <circle cx="47" cy="52" r="3" className="art-bubble" />
          <circle cx="58" cy="61" r="2" className="art-bubble" />
          <path d="M39 31c2-9 9-10 14-5 5-6 13-4 13 5" className="art-foam" />
        </>
      );
    default:
      return (
        <>
          <ellipse cx="64" cy="73" rx="40" ry="13" className="art-plate" />
          <path d="M35 68c2-26 14-39 29-39s27 13 29 39H35Z" className="art-cloche" />
          <circle cx="64" cy="24" r="6" className="art-handle" />
          <path d="M28 69h72" className="art-line" />
        </>
      );
  }
}

export default function FoodThumb({ category, color }) {
  const categoryClass = category || "기타";

  return (
    <div className={`food-thumb ${color || ""}`} aria-label={`${categoryClass} 음식 일러스트`}>
      <svg viewBox="0 0 128 104" role="img" aria-hidden="true">
        <CategoryArtwork category={categoryClass} />
      </svg>
      <span className="food-category-label">{categoryClass}</span>
    </div>
  );
}
