import { getDeliverySettings, listAllCategoryImages, listStoreCategories } from "../db";
import { publicProcedure, router } from "../_core/trpc";

export const brandRouter = router({
  categories: router({
    list: publicProcedure.query(() => listStoreCategories()),
  }),
  lookbook: publicProcedure.query(() => listAllCategoryImages()),
  delivery: publicProcedure.query(() => getDeliverySettings()),
});
