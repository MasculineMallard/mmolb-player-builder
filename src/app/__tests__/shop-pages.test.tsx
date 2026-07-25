import { describe, it, expect } from "vitest";
import type { ReactElement } from "react";
import ShopPage from "../shop/page";
import PitcherShopPage from "../pitcher-shop/page";

// Both shops are single-role tools ("Build your ideal batter/pitcher items").
// Without forcePlayerType, ShopView auto-detects from the imported player and
// silently switches roles -- the batter shop would hand a pitcher its pitcher
// archetypes with no mismatch warning, while the pitcher shop correctly warns.
describe("shop pages declare their player type", () => {
  it("batter shop forces batter", () => {
    const el = ShopPage() as ReactElement<{ forcePlayerType?: string }>;
    expect(el.props.forcePlayerType).toBe("batter");
  });

  it("pitcher shop forces pitcher", () => {
    const el = PitcherShopPage() as ReactElement<{ forcePlayerType?: string }>;
    expect(el.props.forcePlayerType).toBe("pitcher");
  });
});
