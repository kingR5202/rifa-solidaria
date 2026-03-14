import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { createOrder, updateOrder, getOrderById, createGeneratedCodes, getCodesByOrderId } from "./db";
import { createPixCharge } from "./safefy";
import { notifyOwner } from "./_core/notification";
import { generateMultipleCodes } from "./codeGenerator";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  rifa: router({
    /**
     * Create a PIX payment for rifa titles
     */
    createPayment: publicProcedure
      .input(
        z.object({
          name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
          phone: z.string().min(14, "Telefone inválido"),
          quantity: z.number().int().min(1, "Quantidade deve ser pelo menos 1"),
          totalPrice: z.number().positive("Preço deve ser positivo"),
        })
      )
      .mutation(async ({ input }) => {
        try {
          // Create order in database
          const order = await createOrder({
            customerName: input.name,
            customerPhone: input.phone,
            quantity: input.quantity,
            totalPrice: input.totalPrice.toString(),
            paymentStatus: "pending",
          });

          // Get the inserted order ID
          const orderId = (order as any).insertId;

          // Generate PIX charge via SafefyPay
          const pixCharge = await createPixCharge({
            amount: Math.round(input.totalPrice * 100), // Convert to cents
            description: `Rifa Solidária ItalianCar - ${input.quantity} título(s)`,
            reference_id: `order-${orderId}`,
            customer_name: input.name,
            customer_phone: input.phone,
          });

          // Update order with PIX data
          await updateOrder(orderId, {
            transactionId: pixCharge.id,
            pixQrCode: pixCharge.qr_code,
            pixCopyPaste: pixCharge.copy_paste,
          });

          // Notify owner about new payment (non-blocking)
          notifyOwner({
            title: "🎗️ Nova Rifa Iniciada",
            content: `${input.name} (${input.phone}) iniciou uma compra de ${input.quantity} título(s) - R$ ${input.totalPrice.toFixed(2)}`,
          }).catch((err) => console.warn("[Notification] Failed:", err));

          return {
            success: true,
            orderId,
            pixQrCode: pixCharge.qr_code,
            pixCopyPaste: pixCharge.copy_paste,
            expiresAt: pixCharge.expires_at,
          };
        } catch (error) {
          console.error("Payment creation error:", error);
          throw new Error("Falha ao processar pagamento. Tente novamente.");
        }
      }),

    /**
     * Get payment status
     */
    getPaymentStatus: publicProcedure
      .input(z.object({ orderId: z.number() }))
      .query(async ({ input }) => {
        try {
          const order = await getOrderById(input.orderId);
          if (!order) {
            throw new Error("Pedido não encontrado");
          }

          return {
            orderId: order.id,
            status: order.paymentStatus,
            quantity: order.quantity,
            totalPrice: order.totalPrice,
            customerName: order.customerName,
            createdAt: order.createdAt,
          };
        } catch (error) {
          console.error("Get payment status error:", error);
          throw error;
        }
      }),

    /**
     * Generate codes for a completed payment
     */
    generateCodes: publicProcedure
      .input(z.object({ orderId: z.number() }))
      .mutation(async ({ input }) => {
        try {
          const order = await getOrderById(input.orderId);
          if (!order) {
            throw new Error("Pedido não encontrado");
          }

          // Generate codes for the quantity of titles
          const codes = generateMultipleCodes(order.quantity);

          // Save codes to database
          const codesToInsert = codes.map((code) => ({
            orderId: order.id,
            code,
          }));

          await createGeneratedCodes(codesToInsert);

          return {
            success: true,
            codes,
            quantity: order.quantity,
          };
        } catch (error) {
          console.error("Generate codes error:", error);
          throw error;
        }
      }),

    /**
     * Get generated codes for an order
     */
    getCodes: publicProcedure
      .input(z.object({ orderId: z.number() }))
      .query(async ({ input }) => {
        try {
          const codes = await getCodesByOrderId(input.orderId);
          return {
            codes: codes.map((c) => c.code),
            quantity: codes.length,
          };
        } catch (error) {
          console.error("Get codes error:", error);
          throw error;
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
