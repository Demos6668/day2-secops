import { Router } from "express";
import { requireAdmin } from "../../lib/auth.js";
import { recipeByToolId, RECIPES } from "../../integrations/recipes.js";

export const adminIntegrationsRouter = Router();
adminIntegrationsRouter.use(requireAdmin);

adminIntegrationsRouter.get("/", (_req, res) => {
  res.json({ recipes: RECIPES });
});

adminIntegrationsRouter.get("/:toolId", (req, res) => {
  const r = recipeByToolId(req.params.toolId);
  if (!r) {
    res.status(404).json({ error: "no_recipe" });
    return;
  }
  res.json({ recipe: r });
});
