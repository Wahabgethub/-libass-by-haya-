import { getDeliverySettings, listAllCategoryImages, listHomeSections, listMotionMedia, listStoreCategories, listSuitFilterMeta } from "../db";
import { publicProcedure, router } from "../_core/trpc";

export const brandRouter = router({
  categories: router({
    list: publicProcedure.query(() => listStoreCategories()),
  }),
  lookbook: publicProcedure.query(() => listAllCategoryImages()),
  motion: publicProcedure.query(() => listMotionMedia()),
  homeSections: publicProcedure.query(() => listHomeSections()),
  suitFilters: publicProcedure.query(() => listSuitFilterMeta()),
  delivery: publicProcedure.query(() => getDeliverySettings()),
});
