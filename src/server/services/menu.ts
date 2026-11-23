import "server-only";
import type { z } from "zod";
import { db } from "../db";
import { audit } from "../audit";
import { badRequest, notFound } from "../http";
import type { categorySchema, menuItemSchema } from "@/lib/schemas";

type Actor = { userId: string; ip?: string };
type ItemInput = z.infer<typeof menuItemSchema>;

async function assertCategory(restaurantId: string, categoryId: string) {
  const c = await db.menuCategory.findFirst({ where: { id: categoryId, restaurantId, deletedAt: null } });
  if (!c) throw badRequest("Category not found");
}

export async function createCategory(restaurantId: string, data: z.infer<typeof categorySchema>, actor: Actor) {
  const c = await db.menuCategory.create({ data: { restaurantId, ...data } });
  await audit({ restaurantId, actorType: "STAFF", actorUserId: actor.userId, action: "menu.category_created", entityType: "MenuCategory", entityId: c.id, after: data, ip: actor.ip });
  return c;
}

export async function updateCategory(restaurantId: string, id: string, data: Partial<z.infer<typeof categorySchema>>, actor: Actor) {
  const before = await db.menuCategory.findFirst({ where: { id, restaurantId, deletedAt: null } });
  if (!before) throw notFound("Category not found");
  const c = await db.menuCategory.update({ where: { id }, data });
  await audit({ restaurantId, actorType: "STAFF", actorUserId: actor.userId, action: "menu.category_updated", entityType: "MenuCategory", entityId: id, before, after: data, ip: actor.ip });
  return c;
}

export async function deleteCategory(restaurantId: string, id: string, actor: Actor) {
  const before = await db.menuCategory.findFirst({ where: { id, restaurantId, deletedAt: null } });
  if (!before) throw notFound("Category not found");
  const now = new Date();
  await db.$transaction([
    db.menuItem.updateMany({ where: { categoryId: id, restaurantId, deletedAt: null }, data: { deletedAt: now } }),
    db.menuCategory.update({ where: { id }, data: { deletedAt: now } }),
  ]);
  await audit({ restaurantId, actorType: "STAFF", actorUserId: actor.userId, action: "menu.category_deleted", entityType: "MenuCategory", entityId: id, before: { name: before.name }, ip: actor.ip });
}

/** Creates or fully updates an item including its variants and add-ons (diffed by id). */
export async function saveMenuItem(restaurantId: string, id: string | null, data: ItemInput, actor: Actor) {
  await assertCategory(restaurantId, data.categoryId);
  if (data.variants.filter((v) => v.isDefault).length > 1) throw badRequest("Only one variant can be the default");
  const { variants, addons, ...fields } = data;

  const before = id
    ? await db.menuItem.findFirst({ where: { id, restaurantId, deletedAt: null }, include: { variants: true, addons: true } })
    : null;
  if (id && !before) throw notFound("Menu item not found");

  const item = await db.$transaction(async (tx) => {
    const saved = id ? await tx.menuItem.update({ where: { id }, data: fields }) : await tx.menuItem.create({ data: { ...fields, restaurantId } });

    const keepV = variants.filter((v) => v.id && before?.variants.some((b) => b.id === v.id)).map((v) => v.id!);
    await tx.menuVariant.deleteMany({ where: { menuItemId: saved.id, id: { notIn: keepV } } });
    for (const [i, v] of variants.entries()) {
      const row = { name: v.name, nameI18n: v.nameI18n, price: v.price, isDefault: v.isDefault, isAvailable: v.isAvailable, sortOrder: i };
      if (v.id && keepV.includes(v.id)) await tx.menuVariant.update({ where: { id: v.id }, data: row });
      else await tx.menuVariant.create({ data: { ...row, menuItemId: saved.id } });
    }

    const keepA = addons.filter((a) => a.id && before?.addons.some((b) => b.id === a.id)).map((a) => a.id!);
    await tx.menuAddon.deleteMany({ where: { menuItemId: saved.id, id: { notIn: keepA } } });
    for (const [i, a] of addons.entries()) {
      const row = { name: a.name, nameI18n: a.nameI18n, price: a.price, isAvailable: a.isAvailable, sortOrder: i };
      if (a.id && keepA.includes(a.id)) await tx.menuAddon.update({ where: { id: a.id }, data: row });
      else await tx.menuAddon.create({ data: { ...row, menuItemId: saved.id } });
    }
    return saved;
  });

  await audit({
    restaurantId,
    actorType: "STAFF",
    actorUserId: actor.userId,
    action: id ? "menu.item_updated" : "menu.item_created",
    entityType: "MenuItem",
    entityId: item.id,
    before: before ? { name: before.name, price: before.price.toString(), isSoldOut: before.isSoldOut, isAvailable: before.isAvailable } : undefined,
    after: { name: data.name, price: data.price, isSoldOut: data.isSoldOut, isAvailable: data.isAvailable, variants: variants.length, addons: addons.length },
    ip: actor.ip,
  });
  return item;
}

export async function setAvailability(restaurantId: string, id: string, data: { isSoldOut?: boolean; isAvailable?: boolean }, actor: Actor) {
  const before = await db.menuItem.findFirst({ where: { id, restaurantId, deletedAt: null } });
  if (!before) throw notFound("Menu item not found");
  const item = await db.menuItem.update({ where: { id }, data });
  await audit({ restaurantId, actorType: "STAFF", actorUserId: actor.userId, action: "menu.availability_changed", entityType: "MenuItem", entityId: id, before: { isSoldOut: before.isSoldOut, isAvailable: before.isAvailable }, after: data, ip: actor.ip });
  return item;
}

export async function deleteMenuItem(restaurantId: string, id: string, actor: Actor) {
  const before = await db.menuItem.findFirst({ where: { id, restaurantId, deletedAt: null } });
  if (!before) throw notFound("Menu item not found");
  await db.menuItem.update({ where: { id }, data: { deletedAt: new Date() } });
  await audit({ restaurantId, actorType: "STAFF", actorUserId: actor.userId, action: "menu.item_deleted", entityType: "MenuItem", entityId: id, before: { name: before.name }, ip: actor.ip });
}
