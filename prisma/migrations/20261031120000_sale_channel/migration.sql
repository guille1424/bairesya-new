-- CreateEnum
CREATE TYPE "SaleChannel" AS ENUM ('WEB', 'IN_PERSON', 'WHATSAPP', 'INSTAGRAM', 'OTHER');

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "channel" "SaleChannel" NOT NULL DEFAULT 'IN_PERSON';

-- Pedidos anteriores: los web son del canal web; de los de caja no se sabe el canal real.
UPDATE "Sale" SET "channel" = CASE WHEN "source" = 'WEB' THEN 'WEB'::"SaleChannel" ELSE 'OTHER'::"SaleChannel" END;
