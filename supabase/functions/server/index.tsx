import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-3b443693/health", (c) => {
  return c.json({ status: "ok" });
});

// Get all orders
app.get("/make-server-3b443693/orders", async (c) => {
  try {
    // Clean up completed orders from previous days
    const allOrders = await kv.getByPrefix("order:");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let deletedCount = 0;
    for (const order of allOrders) {
      if (order.status === 'completed') {
        const orderDate = new Date(order.createdAt);
        orderDate.setHours(0, 0, 0, 0);
        
        // Delete if completed order is from before today
        if (orderDate < today) {
          await kv.del(order.id);
          deletedCount++;
          console.log(`Deleted completed order from previous day: ${order.id}`);
        }
      }
    }
    
    // Get remaining orders after cleanup
    const orders = await kv.getByPrefix("order:");
    const sortedOrders = orders.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return c.json({ orders: sortedOrders, deletedCount });
  } catch (error) {
    console.log(`Error fetching orders: ${error}`);
    return c.json({ error: "Failed to fetch orders", details: String(error) }, 500);
  }
});

// Create a new order
app.post("/make-server-3b443693/orders", async (c) => {
  try {
    const body = await c.req.json();
    const { product, quantity, notes } = body;

    if (!product || !quantity) {
      return c.json({ error: "Product and quantity are required" }, 400);
    }

    const orderId = `order:${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const order = {
      id: orderId,
      product,
      quantity: Number(quantity),
      notes: notes || "",
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    await kv.set(orderId, order);
    return c.json({ order });
  } catch (error) {
    console.log(`Error creating order: ${error}`);
    return c.json({ error: "Failed to create order", details: String(error) }, 500);
  }
});

// Update order status
app.put("/make-server-3b443693/orders/:id", async (c) => {
  try {
    const orderId = c.req.param("id");
    const body = await c.req.json();
    const { status } = body;

    const order = await kv.get(orderId);
    if (!order) {
      return c.json({ error: "Order not found" }, 404);
    }

    const updatedOrder = { ...order, status };
    await kv.set(orderId, updatedOrder);
    return c.json({ order: updatedOrder });
  } catch (error) {
    console.log(`Error updating order: ${error}`);
    return c.json({ error: "Failed to update order", details: String(error) }, 500);
  }
});

// Delete an order
app.delete("/make-server-3b443693/orders/:id", async (c) => {
  try {
    const orderId = c.req.param("id");
    await kv.del(orderId);
    return c.json({ success: true });
  } catch (error) {
    console.log(`Error deleting order: ${error}`);
    return c.json({ error: "Failed to delete order", details: String(error) }, 500);
  }
});

// Get all products
app.get("/make-server-3b443693/products", async (c) => {
  try {
    const products = await kv.getByPrefix("product:");
    const sortedProducts = products.sort((a, b) => a.name.localeCompare(b.name));
    return c.json({ products: sortedProducts });
  } catch (error) {
    console.log(`Error fetching products: ${error}`);
    return c.json({ error: "Failed to fetch products", details: String(error) }, 500);
  }
});

// Create a new product
app.post("/make-server-3b443693/products", async (c) => {
  try {
    const body = await c.req.json();
    const { name, price } = body;

    if (!name || price === undefined) {
      return c.json({ error: "Name and price are required" }, 400);
    }

    const productId = `product:${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const product = {
      id: productId,
      name,
      price: Number(price),
      createdAt: new Date().toISOString(),
    };

    await kv.set(productId, product);
    return c.json({ product });
  } catch (error) {
    console.log(`Error creating product: ${error}`);
    return c.json({ error: "Failed to create product", details: String(error) }, 500);
  }
});

// Update a product
app.put("/make-server-3b443693/products/:id", async (c) => {
  try {
    const productId = c.req.param("id");
    const body = await c.req.json();
    const { name, price } = body;

    const product = await kv.get(productId);
    if (!product) {
      return c.json({ error: "Product not found" }, 404);
    }

    const updatedProduct = { ...product, name, price: Number(price) };
    await kv.set(productId, updatedProduct);
    return c.json({ product: updatedProduct });
  } catch (error) {
    console.log(`Error updating product: ${error}`);
    return c.json({ error: "Failed to update product", details: String(error) }, 500);
  }
});

// Delete a product
app.delete("/make-server-3b443693/products/:id", async (c) => {
  try {
    const productId = c.req.param("id");
    await kv.del(productId);
    return c.json({ success: true });
  } catch (error) {
    console.log(`Error deleting product: ${error}`);
    return c.json({ error: "Failed to delete product", details: String(error) }, 500);
  }
});

Deno.serve(app.fetch);