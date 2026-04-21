import { runPipeline } from "./pipeline.js";
import { pool } from "../db/pool.js";

// 10 Golden Providers for regression testing
const GOLDEN_SET = [
  { providerName: "Maria Rodriguez", businessName: "Maria's Home Daycare", state: "TX", address: "1234 Main St, Austin TX 78701", email: "maria@example.com", facilityType: "home-based", ageGroups: ["infant", "toddler", "preschool"], maxCapacity: 12 },
  { providerName: "John Smith", businessName: "Sunshine Kids", state: "CA", address: "456 Oak Ave, Los Angeles CA 90001", email: "john@example.com", facilityType: "home-based", ageGroups: ["toddler", "preschool"], maxCapacity: 8 },
  { providerName: "Sarah Johnson", businessName: "Little Stars Daycare", state: "NY", address: "789 Broadway, New York NY 10003", email: "sarah@example.com", facilityType: "home-based", ageGroups: ["infant", "toddler"], maxCapacity: 6 },
  { providerName: "Priya Patel", businessName: "Bright Beginnings", state: "FL", address: "321 Palm Dr, Miami FL 33101", email: "priya@example.com", facilityType: "center-based", ageGroups: ["infant", "toddler", "preschool", "school-age"], maxCapacity: 24 },
  { providerName: "Lisa Chen", businessName: "Happy Pandas Learning", state: "MI", address: "555 Lake Rd, Detroit MI 48201", email: "lisa@example.com", facilityType: "home-based", ageGroups: ["preschool", "school-age"], maxCapacity: 10 },
  { providerName: "James Williams", businessName: "Safe Haven Childcare", state: "NV", address: "888 Desert Blvd, Las Vegas NV 89101", email: "james@example.com", facilityType: "group-home", ageGroups: ["toddler", "preschool"], maxCapacity: 14 },
  { providerName: "Ana Martinez", businessName: "Casita Feliz", state: "IN", address: "222 Elm St, Indianapolis IN 46201", email: "ana@example.com", facilityType: "home-based", ageGroups: ["infant", "toddler"], maxCapacity: 6 },
  { providerName: "David Kim", businessName: "Discovery Kids Center", state: "OH", address: "777 Buckeye Ave, Columbus OH 43201", email: "david@example.com", facilityType: "center-based", ageGroups: ["toddler", "preschool", "school-age"], maxCapacity: 30 },
  { providerName: "Michelle Brown", businessName: "Peach Tree Daycare", state: "GA", address: "444 Peachtree St, Atlanta GA 30301", email: "michelle@example.com", facilityType: "home-based", ageGroups: ["infant", "toddler", "preschool"], maxCapacity: 8 },
  { providerName: "Robert Taylor", businessName: "Windy City Kids", state: "IL", address: "999 Michigan Ave, Chicago IL 60601", email: "robert@example.com", facilityType: "group-home", ageGroups: ["preschool", "school-age"], maxCapacity: 16 },
];

export async function runEvalSet(): Promise<{
  total: number;
  completed: number;
  reviewNeeded: number;
  errors: number;
  avgConfidence: number;
  avgTokens: number;
  avgCost: number;
  results: Array<{ provider: string; state: string; status: string; confidence: number | null; tokens: number; cost: number }>;
}> {
  const results: Array<{ provider: string; state: string; status: string; confidence: number | null; tokens: number; cost: number }> = [];

  for (const provider of GOLDEN_SET) {
    try {
      const onboardingId = await runPipeline(provider);
      // Wait for pipeline to complete
      await new Promise((resolve) => setTimeout(resolve, 35000));

      const res = await pool.query("SELECT * FROM onboardings WHERE id = $1", [onboardingId]);
      const ob = res.rows[0];
      results.push({
        provider: provider.providerName,
        state: provider.state,
        status: ob?.status || "unknown",
        confidence: ob?.confidence_score ? parseFloat(ob.confidence_score) : null,
        tokens: ob?.total_tokens || 0,
        cost: ob?.total_cost_usd ? parseFloat(ob.total_cost_usd) : 0,
      });
    } catch (err) {
      results.push({
        provider: provider.providerName,
        state: provider.state,
        status: "error",
        confidence: null,
        tokens: 0,
        cost: 0,
      });
    }
  }

  const completed = results.filter((r) => r.status === "completed").length;
  const reviewNeeded = results.filter((r) => r.status === "review_needed").length;
  const errors = results.filter((r) => r.status === "error").length;
  const withConfidence = results.filter((r) => r.confidence !== null);
  const avgConfidence = withConfidence.length > 0 ? withConfidence.reduce((a, b) => a + (b.confidence || 0), 0) / withConfidence.length : 0;
  const avgTokens = results.reduce((a, b) => a + b.tokens, 0) / results.length;
  const avgCost = results.reduce((a, b) => a + b.cost, 0) / results.length;

  return { total: results.length, completed, reviewNeeded, errors, avgConfidence, avgTokens, avgCost, results };
}

export { GOLDEN_SET };
