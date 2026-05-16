export default function FoodThumb({ color }) {
  return (
    <div className={`food-thumb ${color}`}>
      <div className="plate" />
      <div className="food-shine" />
    </div>
  );
}
