// Function to format the square count display
const formatSquareCount = (material: Material, quantity: number) => {
  if (!quantity || quantity <= 0) return "0";

  // Special handling for GAF Timberline HDZ SG
  if (material.id === "gaf-timberline-hdz-sg") {
    // Calculate squares from bundles (3 bundles = 1 square)
    const squares = Math.round((quantity / 3) * 10) / 10;
    return squares.toFixed(1);
  }

  // Return bundle count for other materials
  return quantity.toString();
};

{/* Display quantity and square count */}
<Cell>
  <Input
    type="number"
    min={1}
    value={quantities[material.id] || ""}
    onChange={(e) => handleQuantityChange(material.id, parseInt(e.target.value) || 0)}
    onBlur={(e) => handleQuantityBlur(material.id, parseInt(e.target.value) || 0)}
  />
  {material.type === "shingles" && (
    <SquareCount>
      {formatSquareCount(material, quantities[material.id])} {material.id === "gaf-timberline-hdz-sg" ? "squares" : "bundles"}
    </SquareCount>
  )}
</Cell> 