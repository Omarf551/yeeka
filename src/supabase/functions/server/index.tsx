import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import { createClient } from "npm:@supabase/supabase-js@2";

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

// Helper function to get next ID
async function getNextId(entityType: string): Promise<number> {
  const counters = await kv.get('counters') || {};
  const nextId = (counters[entityType] || 0) + 1;
  counters[entityType] = nextId;
  await kv.set('counters', counters);
  return nextId;
}

// Health check endpoint
app.get("/make-server-402bd9dc/health", (c) => {
  return c.json({ status: "ok" });
});

// ===== USERS & AUTH =====

// Sign up new user (admin only in production, open for demo)
app.post("/make-server-402bd9dc/signup", async (c) => {
  try {
    const { nombre, usuario, password, rol } = await c.req.json();
    
    if (!nombre || !usuario || !password || !rol) {
      return c.json({ error: 'All fields are required' }, 400);
    }

    // Check if usuario already exists
    const existingUsers = await kv.getByPrefix('user:');
    const userExists = existingUsers.some((u: any) => u.usuario === usuario);
    
    if (userExists) {
      return c.json({ error: 'Username already exists' }, 400);
    }

    const id = await getNextId('user');
    const newUser = {
      id,
      nombre,
      usuario,
      password, // In production, hash this!
      rol
    };

    await kv.set(`user:${id}`, newUser);
    
    // Return user without password
    const { password: _, ...userWithoutPassword } = newUser;
    return c.json({ user: userWithoutPassword });
  } catch (error) {
    console.error('Signup error:', error);
    return c.json({ error: 'Failed to create user' }, 500);
  }
});

// Login
app.post("/make-server-402bd9dc/login", async (c) => {
  try {
    const { usuario, password } = await c.req.json();
    
    if (!usuario || !password) {
      return c.json({ error: 'Username and password required' }, 400);
    }

    const users = await kv.getByPrefix('user:');
    const user = users.find((u: any) => u.usuario === usuario && u.password === password);
    
    if (!user) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    return c.json({ user: userWithoutPassword });
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ error: 'Login failed' }, 500);
  }
});

// Get all users (admin only)
app.get("/make-server-402bd9dc/users", async (c) => {
  try {
    const users = await kv.getByPrefix('user:');
    // Remove passwords
    const usersWithoutPasswords = users.map((u: any) => {
      const { password, ...rest } = u;
      return rest;
    });
    return c.json({ users: usersWithoutPasswords });
  } catch (error) {
    console.error('Get users error:', error);
    return c.json({ error: 'Failed to get users' }, 500);
  }
});

// Delete user
app.delete("/make-server-402bd9dc/users/:id", async (c) => {
  try {
    const id = c.req.param('id');
    await kv.del(`user:${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    return c.json({ error: 'Failed to delete user' }, 500);
  }
});

// ===== CATEGORIES =====

// Get all categories
app.get("/make-server-402bd9dc/categorias", async (c) => {
  try {
    const categorias = await kv.getByPrefix('categoria:');
    return c.json({ categorias });
  } catch (error) {
    console.error('Get categorias error:', error);
    return c.json({ error: 'Failed to get categories' }, 500);
  }
});

// Create category
app.post("/make-server-402bd9dc/categorias", async (c) => {
  try {
    const { nombre } = await c.req.json();
    
    if (!nombre) {
      return c.json({ error: 'Name is required' }, 400);
    }

    const id = await getNextId('categoria');
    const newCategoria = { id, nombre };
    
    await kv.set(`categoria:${id}`, newCategoria);
    return c.json({ categoria: newCategoria });
  } catch (error) {
    console.error('Create categoria error:', error);
    return c.json({ error: 'Failed to create category' }, 500);
  }
});

// Delete category
app.delete("/make-server-402bd9dc/categorias/:id", async (c) => {
  try {
    const id = c.req.param('id');
    await kv.del(`categoria:${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.error('Delete categoria error:', error);
    return c.json({ error: 'Failed to delete category' }, 500);
  }
});

// ===== PRODUCTS =====

// Get all products
app.get("/make-server-402bd9dc/productos", async (c) => {
  try {
    const productos = await kv.getByPrefix('producto:');
    return c.json({ productos });
  } catch (error) {
    console.error('Get productos error:', error);
    return c.json({ error: 'Failed to get products' }, 500);
  }
});

// Create product
app.post("/make-server-402bd9dc/productos", async (c) => {
  try {
    const { nombre, precio, categoria_id } = await c.req.json();
    
    if (!nombre || !precio) {
      return c.json({ error: 'Name and price are required' }, 400);
    }

    const id = await getNextId('producto');
    const newProducto = { 
      id, 
      nombre, 
      precio: parseFloat(precio),
      categoria_id: categoria_id ? parseInt(categoria_id) : null
    };
    
    await kv.set(`producto:${id}`, newProducto);
    return c.json({ producto: newProducto });
  } catch (error) {
    console.error('Create producto error:', error);
    return c.json({ error: 'Failed to create product' }, 500);
  }
});

// Update product
app.put("/make-server-402bd9dc/productos/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const { nombre, precio, categoria_id } = await c.req.json();
    
    const producto = await kv.get(`producto:${id}`);
    if (!producto) {
      return c.json({ error: 'Product not found' }, 404);
    }

    const updatedProducto = {
      ...producto,
      nombre: nombre || producto.nombre,
      precio: precio ? parseFloat(precio) : producto.precio,
      categoria_id: categoria_id !== undefined ? (categoria_id ? parseInt(categoria_id) : null) : producto.categoria_id
    };
    
    await kv.set(`producto:${id}`, updatedProducto);
    return c.json({ producto: updatedProducto });
  } catch (error) {
    console.error('Update producto error:', error);
    return c.json({ error: 'Failed to update product' }, 500);
  }
});

// Delete product
app.delete("/make-server-402bd9dc/productos/:id", async (c) => {
  try {
    const id = c.req.param('id');
    await kv.del(`producto:${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.error('Delete producto error:', error);
    return c.json({ error: 'Failed to delete product' }, 500);
  }
});

// ===== ORDERS =====

// Get all orders
app.get("/make-server-402bd9dc/pedidos", async (c) => {
  try {
    const pedidos = await kv.getByPrefix('pedido:');
    // Sort by hora (most recent first)
    pedidos.sort((a: any, b: any) => new Date(b.hora).getTime() - new Date(a.hora).getTime());
    return c.json({ pedidos });
  } catch (error) {
    console.error('Get pedidos error:', error);
    return c.json({ error: 'Failed to get orders' }, 500);
  }
});

// Get single order with items
app.get("/make-server-402bd9dc/pedidos/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const pedido = await kv.get(`pedido:${id}`);
    
    if (!pedido) {
      return c.json({ error: 'Order not found' }, 404);
    }

    // Get order items
    const allItems = await kv.getByPrefix('pedido_item:');
    const items = allItems.filter((item: any) => item.pedido_id === parseInt(id));
    
    return c.json({ pedido: { ...pedido, items } });
  } catch (error) {
    console.error('Get pedido error:', error);
    return c.json({ error: 'Failed to get order' }, 500);
  }
});

// Create order with items
app.post("/make-server-402bd9dc/pedidos", async (c) => {
  try {
    const { mesa, mesero_id, items } = await c.req.json();
    
    if (!mesa || !items || items.length === 0) {
      return c.json({ error: 'Mesa and items are required' }, 400);
    }

    const pedidoId = await getNextId('pedido');
    const newPedido = {
      id: pedidoId,
      mesa,
      estado: 'pendiente',
      hora: new Date().toISOString(),
      mesero_id: mesero_id || null,
      cocinero_id: null
    };
    
    await kv.set(`pedido:${pedidoId}`, newPedido);

    // Create order items
    const createdItems = [];
    for (const item of items) {
      const itemId = await getNextId('pedido_item');
      const newItem = {
        id: itemId,
        pedido_id: pedidoId,
        producto_id: item.producto_id,
        cantidad: item.cantidad,
        estado: 'pendiente'
      };
      await kv.set(`pedido_item:${itemId}`, newItem);
      createdItems.push(newItem);
    }

    return c.json({ pedido: { ...newPedido, items: createdItems } });
  } catch (error) {
    console.error('Create pedido error:', error);
    return c.json({ error: 'Failed to create order' }, 500);
  }
});

// Update order status
app.put("/make-server-402bd9dc/pedidos/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const { estado, cocinero_id } = await c.req.json();
    
    const pedido = await kv.get(`pedido:${id}`);
    if (!pedido) {
      return c.json({ error: 'Order not found' }, 404);
    }

    const updatedPedido = {
      ...pedido,
      estado: estado || pedido.estado,
      cocinero_id: cocinero_id !== undefined ? cocinero_id : pedido.cocinero_id
    };
    
    await kv.set(`pedido:${id}`, updatedPedido);
    return c.json({ pedido: updatedPedido });
  } catch (error) {
    console.error('Update pedido error:', error);
    return c.json({ error: 'Failed to update order' }, 500);
  }
});

// Delete order
app.delete("/make-server-402bd9dc/pedidos/:id", async (c) => {
  try {
    const id = c.req.param('id');
    
    // Delete order items first
    const allItems = await kv.getByPrefix('pedido_item:');
    const itemsToDelete = allItems.filter((item: any) => item.pedido_id === parseInt(id));
    
    for (const item of itemsToDelete) {
      await kv.del(`pedido_item:${item.id}`);
    }
    
    // Delete order
    await kv.del(`pedido:${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.error('Delete pedido error:', error);
    return c.json({ error: 'Failed to delete order' }, 500);
  }
});

// ===== ORDER ITEMS =====

// Update order item status
app.put("/make-server-402bd9dc/pedido-items/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const { estado } = await c.req.json();
    
    const item = await kv.get(`pedido_item:${id}`);
    if (!item) {
      return c.json({ error: 'Order item not found' }, 404);
    }

    const updatedItem = {
      ...item,
      estado: estado || item.estado
    };
    
    await kv.set(`pedido_item:${id}`, updatedItem);
    return c.json({ item: updatedItem });
  } catch (error) {
    console.error('Update pedido item error:', error);
    return c.json({ error: 'Failed to update order item' }, 500);
  }
});

// Get all order items (for kitchen view)
app.get("/make-server-402bd9dc/pedido-items", async (c) => {
  try {
    const items = await kv.getByPrefix('pedido_item:');
    return c.json({ items });
  } catch (error) {
    console.error('Get pedido items error:', error);
    return c.json({ error: 'Failed to get order items' }, 500);
  }
});

Deno.serve(app.fetch);
