import { getDeliverySettings, listAllCategoryImages, listMotionMedia, listStoreCategories, listSuitFilterMeta } from "../db";
import { publicProcedure, router } from "../_core/trpc";

export const brandRouter = router({
  categories: router({
    list: publicProcedure.query(() => listStoreCategories()),
  }),
  lookbook: publicProcedure.query(() => listAllCategoryImages()),
  motion: publicProcedure.query(() => listMotionMedia()),
  suitFilters: publicProcedure.query(() => listSuitFilterMeta()),
  delivery: publicProcedure.query(() => getDeliverySettings()),
});
