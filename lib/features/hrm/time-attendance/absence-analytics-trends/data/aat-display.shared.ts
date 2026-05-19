import type { AatRiskTier } from "../schemas/aat.schema"

export function aatRiskTierMessageKey(
  tier: AatRiskTier
): `riskTier.${AatRiskTier}` {
  return `riskTier.${tier}`
}

export function aatRiskTierLabel(tier: AatRiskTier): string {
  switch (tier) {
    case "normal":
      return "Normal"
    case "watch":
      return "Watch"
    case "at_risk":
      return "At risk"
    case "high_risk":
      return "High risk"
    case "critical":
      return "Critical"
  }
}

export function aatRiskTierBadgeTone(
  tier: AatRiskTier
): "default" | "secondary" | "destructive" | "outline" {
  switch (tier) {
    case "critical":
    case "high_risk":
      return "destructive"
    case "at_risk":
      return "secondary"
    case "watch":
      return "outline"
    case "normal":
      return "default"
  }
}

export function aatTrendDirectionLabel(
  direction: "improving" | "stable" | "worsening"
): string {
  switch (direction) {
    case "improving":
      return "Improving"
    case "stable":
      return "Stable"
    case "worsening":
      return "Worsening"
  }
}

export function aatTrendStatTone(
  direction: "improving" | "stable" | "worsening"
): "default" | "positive" | "attention" {
  switch (direction) {
    case "improving":
      return "positive"
    case "worsening":
      return "attention"
    case "stable":
      return "default"
  }
}
